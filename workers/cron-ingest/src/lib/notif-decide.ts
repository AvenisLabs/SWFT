// notif-decide.ts v0.1.0 — Pure decision logic for the notification dispatcher.
//
// Given a channel + rule + state + schedules + new events + clock, this
// returns a list of "actions" (what to send) and the next state row (with
// updated watermarks/timestamps/buffer). The orchestrator then performs the
// side effects (HTTP, D1 writes). Keeping this pure makes the whole branchy
// rules-engine behavior unit-testable without spinning up D1 or webhooks.

import type {
	NotifChannel,
	NotifRule,
	NotifSchedule,
	NotifState,
	KpEvent,
	BufferedEvent,
} from './notif-types';
import { isInSchedule, isAtDigestTime } from './notif-schedule';

/** Maximum number of buffered events kept in notif_state.off_hours_buffer.
 *  Prevents the JSON column from growing unbounded during a long off-schedule
 *  period with no digest time configured. Older entries are dropped first. */
export const BUFFER_CAP = 100;

export type DispatchAction =
	| {
			type: 'immediate';
			event: KpEvent;
	  }
	| {
			type: 'summary';
			events: KpEvent[];
			windowMinutes: number;
	  }
	| {
			type: 'off_hours_digest';
			buffered: BufferedEvent[];
	  }
	| {
			type: 'storm_end';
			peakKp: number | null;
			peakClass: string | null;
			durationHours: number | null;
	  };

export interface DecideInput {
	channel: NotifChannel;
	rule: NotifRule;
	schedules: NotifSchedule[];
	state: NotifState;
	newEvents: KpEvent[]; // already filtered to kp_value >= rule.threshold_kp AND id > state.last_event_id_sent
	now: Date;
	/** Last seen system mode before this tick. Used for storm-end detection. */
	previousMode: 'normal' | 'elevated' | 'storm';
	/** Current system mode read this tick. */
	currentMode: 'normal' | 'elevated' | 'storm';
}

export interface DecideOutput {
	actions: DispatchAction[];
	nextState: NotifState;
}

/** Parse the JSON buffer; tolerate corrupt data by returning empty. */
export function parseBuffer(s: string): BufferedEvent[] {
	try {
		const parsed = JSON.parse(s);
		if (Array.isArray(parsed)) {
			return parsed.filter(
				(x): x is BufferedEvent =>
					x &&
					typeof x.event_id === 'number' &&
					typeof x.ts === 'string' &&
					typeof x.kp_value === 'number' &&
					typeof x.storm_class === 'string'
			);
		}
	} catch {
		// fall through
	}
	return [];
}

export function serializeBuffer(buf: BufferedEvent[]): string {
	return JSON.stringify(buf);
}

/** Pure: given inputs, decide what to send and what the next state row is. */
export function decide(input: DecideInput): DecideOutput {
	const { channel, rule, schedules, state, newEvents, now, previousMode, currentMode } = input;
	const actions: DispatchAction[] = [];
	const next: NotifState = { ...state };

	// Sort defensively even though caller filtered; ensures id watermark + storm-end logic is monotone.
	const sortedEvents = [...newEvents].sort((a, b) => a.id - b.id);

	const inSchedule = isInSchedule(schedules, now);

	// 1) Storm-end transition. Off-schedule channels skip the ping — would be
	//    rude to wake someone at 3am for a "storm ended" notification. The
	//    independent storm_end_notify rule field gates whether to fire at all.
	if (
		rule.storm_end_notify &&
		previousMode !== 'normal' &&
		currentMode === 'normal' &&
		inSchedule
	) {
		actions.push({
			type: 'storm_end',
			peakKp: null, // orchestrator decorates these post-decide
			peakClass: null,
			durationHours: null,
		});
	}

	// 2) Buffer accounting. The state column is named `off_hours_buffer` but
	//    semantically it's a "pending events to summarize" buffer — events
	//    accumulate here regardless of schedule and are drained when a summary
	//    or digest fires. Without this, events between summary cadence ticks
	//    were silently dropped (the watermark advanced but no summary fired).
	const buffer = parseBuffer(state.off_hours_buffer);

	// Filter events for "quiet below G1" if set.
	const qualifyingEvents = sortedEvents.filter(e => {
		if (rule.quiet_below_g1 && (e.storm_class === 'active' || !e.storm_class)) return false;
		return true;
	});

	// Always buffer new qualifying events (in-schedule and off). The buffer
	// is the source of truth for summary/digest content.
	for (const e of qualifyingEvents) {
		buffer.push({
			event_id: e.id,
			ts: e.ts,
			kp_value: e.kp_value,
			storm_class: e.storm_class,
		});
	}
	if (buffer.length > BUFFER_CAP) buffer.splice(0, buffer.length - BUFFER_CAP);

	if (!inSchedule) {
		// Off-schedule: dedupe is achieved by clearing the buffer on flush; a
		// follow-up tick within the digest tolerance sees buffer.length === 0
		// and skips.
		if (
			rule.off_hours_digest_time &&
			buffer.length > 0 &&
			isAtDigestTime(now, rule.off_hours_digest_time)
		) {
			actions.push({ type: 'off_hours_digest', buffered: buffer.slice() });
			buffer.length = 0;
		}

		next.off_hours_buffer = serializeBuffer(buffer);
		const maxId = sortedEvents.reduce((m, e) => Math.max(m, e.id), state.last_event_id_sent);
		next.last_event_id_sent = maxId;
		// Reset burst arming when off-schedule. Orchestrator also enforces this.
		next.burst_started_at = null;
		return { actions, nextState: next };
	}

	// IN SCHEDULE.

	// 3) If buffered from a prior off-period AND rule wants on-resume digest, flush as digest now.
	//    We test against the persisted `off_hours_buffer` rather than `buffer` to capture only
	//    events that were buffered before this tick (any events just added above are in `buffer`
	//    but not yet in the persisted column).
	const persistedBuffer = parseBuffer(state.off_hours_buffer);
	if (rule.off_hours_digest_on_resume && persistedBuffer.length > 0) {
		actions.push({ type: 'off_hours_digest', buffered: persistedBuffer.slice() });
		// Drain the persisted portion from `buffer`; keep just-added events for the next summary.
		const persistedIds = new Set(persistedBuffer.map(b => b.event_id));
		for (let i = buffer.length - 1; i >= 0; i--) {
			if (persistedIds.has(buffer[i].event_id)) buffer.splice(i, 1);
		}
	}

	// 4) Immediate alerts: highest qualifying event >= immediate_threshold_kp.
	//    The orchestrator owns last_immediate_at — see issue review note —
	//    because the SMS 12h cap can suppress sends, and we shouldn't bump
	//    the field for a non-send.
	const immediateCandidates = qualifyingEvents.filter(
		e => e.kp_value >= rule.immediate_threshold_kp
	);
	if (immediateCandidates.length > 0) {
		// Sort: highest Kp first, then most recent ts, then highest id (deterministic).
		immediateCandidates.sort(
			(a, b) => b.kp_value - a.kp_value || (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : b.id - a.id)
		);
		actions.push({ type: 'immediate', event: immediateCandidates[0] });
	}

	// 5) Summary cadence. Fires every effectiveInterval minutes whenever there
	//    are buffered events. Content comes from the buffer (which already
	//    includes events from prior ticks within the cadence window).
	if (buffer.length > 0) {
		// Burst-window arming: first event during this schedule entry sets burst_started_at.
		if (!next.burst_started_at) {
			next.burst_started_at = now.toISOString();
		}

		const burstAge = next.burst_started_at
			? (now.getTime() - new Date(next.burst_started_at).getTime()) / 3600_000
			: Infinity;
		const burstActive = burstAge <= rule.burst_window_max_hours;

		// 15-min cadence only allowed inside the burst window. Otherwise floor to 30.
		const effectiveInterval =
			rule.summary_interval_min === 15 && !burstActive ? 30 : rule.summary_interval_min;

		const lastSummaryMs = next.last_summary_at
			? new Date(next.last_summary_at).getTime()
			: 0;
		const ageMin = (now.getTime() - lastSummaryMs) / 60_000;
		if (ageMin >= effectiveInterval) {
			// Build summary events from the buffer (KpEvent shape) — buffered
			// entries have event_id/ts/kp_value/storm_class, we synthesize the
			// minimal fields the embed builder needs.
			const summaryEvents = buffer.map(b => ({
				id: b.event_id,
				ts: b.ts,
				kp_value: b.kp_value,
				source: 'buffered',
				storm_class: b.storm_class,
				bz_nt: null,
				speed_kms: null,
				created_at: b.ts,
			}));
			actions.push({
				type: 'summary',
				events: summaryEvents,
				windowMinutes: effectiveInterval,
			});
			next.last_summary_at = now.toISOString();
			buffer.length = 0; // drained
		}
	}

	// 6) Watermark advances for every event we've seen (buffered, summarized, or filtered).
	const maxId = sortedEvents.reduce((m, e) => Math.max(m, e.id), state.last_event_id_sent);
	next.last_event_id_sent = maxId;
	next.off_hours_buffer = serializeBuffer(buffer);

	return { actions, nextState: next };
}

/** Returns true if SMS is currently allowed for this channel (rolling 12h cap). */
export function smsAllowed(state: NotifState, now: Date): boolean {
	if (!state.sms_last_sent_at) return true;
	const ageMs = now.getTime() - new Date(state.sms_last_sent_at).getTime();
	return ageMs >= 12 * 3600_000;
}
