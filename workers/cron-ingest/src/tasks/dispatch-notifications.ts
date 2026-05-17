// dispatch-notifications.ts v0.1.0 — Cron-driven notification dispatcher.
//
// Runs every */5 minutes (orchestrated from src/index.ts). For each enabled
// notif_channels row, it:
//   1. Loads channel + rule + schedules + state from D1.
//   2. Loads new kp_events rows with id > state.last_event_id_sent AND
//      kp_value >= rule.threshold_kp.
//   3. Calls the pure `decide()` to produce a list of actions + next state.
//   4. Performs the side effects (Discord/SMS POSTs, audit log inserts).
//   5. Persists the new state row.
//
// Storm-end detection: the previous and current 'system_state.active_mode' are
// passed in so all channels see the same transition. We persist the last
// dispatched mode under key 'notif_last_dispatch_mode' so a brief flap on the
// 5-min cron doesn't drop a transition.

import type {
	NotifChannel,
	NotifRule,
	NotifSchedule,
	NotifState,
	KpEvent,
} from '../lib/notif-types';
import { decide, smsAllowed, type DispatchAction } from '../lib/notif-decide';
import {
	buildImmediateEmbed,
	buildSummaryEmbed,
	buildOffHoursDigestEmbed,
	buildStormEndEmbed,
	buildImmediateSms,
} from '../lib/notif-embeds';
import { sendDiscord, sendTextBelt } from '../lib/notif-send';
import { getSystemState } from '../lib/db';
import { isInSchedule } from '../lib/notif-schedule';

export interface DispatchEnv {
	DB: D1Database;
	TEXTBELT_API_KEY?: string;
}

interface DispatchSummary {
	channels_checked: number;
	actions_dispatched: number;
	failures: number;
}

interface StormEndInfo {
	peakKp: number | null;
	peakClass: string | null;
	durationHours: number | null;
}

function chunk<T>(arr: T[], size: number): T[][] {
	if (size <= 0) return [arr];
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

/** When the system just transitioned to 'normal' from elevated/storm, find
 *  the peak kp_event in the last 24h to populate the storm-end notification.
 *  Returns all-nulls when no transition or no events. Best-effort: a missing
 *  history just means a less-decorated embed. */
async function computeStormEndInfo(
	db: D1Database,
	previousMode: 'normal' | 'elevated' | 'storm',
	currentMode: 'normal' | 'elevated' | 'storm',
	now: Date
): Promise<StormEndInfo> {
	const empty: StormEndInfo = { peakKp: null, peakClass: null, durationHours: null };
	if (previousMode === 'normal' || currentMode !== 'normal') return empty;

	const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
	try {
		const row = await db
			.prepare(
				`SELECT MAX(kp_value) AS peak_kp, MIN(ts) AS first_ts, MAX(ts) AS last_ts
				 FROM kp_events WHERE ts > ?`
			)
			.bind(since)
			.first<{ peak_kp: number | null; first_ts: string | null; last_ts: string | null }>();
		if (!row || row.peak_kp === null) return empty;

		// Look up the storm class for the peak Kp from any matching row.
		const peakRow = await db
			.prepare(
				`SELECT storm_class FROM kp_events WHERE ts > ? AND kp_value = ?
				 ORDER BY ts DESC LIMIT 1`
			)
			.bind(since, row.peak_kp)
			.first<{ storm_class: string }>();
		const peakClass = peakRow?.storm_class ?? null;

		let durationHours: number | null = null;
		if (row.first_ts && row.last_ts) {
			const dur = (new Date(row.last_ts).getTime() - new Date(row.first_ts).getTime()) / 3600_000;
			if (Number.isFinite(dur) && dur >= 0) durationHours = dur;
		}
		return { peakKp: row.peak_kp, peakClass, durationHours };
	} catch (err) {
		console.error('[notif] computeStormEndInfo failed:', err);
		return empty;
	}
}

export async function dispatchNotifications(env: DispatchEnv, now: Date): Promise<DispatchSummary> {
	const summary: DispatchSummary = { channels_checked: 0, actions_dispatched: 0, failures: 0 };

	// Read mode transition state. We CAS on `notif_last_dispatch_mode` BEFORE
	// processing any channels, so that two concurrent ticks observing the same
	// transition can't both emit storm_end. The winner gets to dispatch
	// storm_end this tick; the loser sees previous == current and decide()
	// won't emit. The CAS atomically claims the transition itself, not the
	// per-channel work — the channel watermark CAS still gates that.
	const [currentMode, previousModeRaw] = await Promise.all([
		getSystemState(env.DB, 'active_mode'),
		getSystemState(env.DB, 'notif_last_dispatch_mode'),
	]);
	const currentTyped = (currentMode === 'storm' || currentMode === 'elevated' ? currentMode : 'normal') as
		| 'normal'
		| 'elevated'
		| 'storm';
	let previousTyped: 'normal' | 'elevated' | 'storm' =
		previousModeRaw === 'storm' || previousModeRaw === 'elevated' || previousModeRaw === 'normal'
			? (previousModeRaw as 'normal' | 'elevated' | 'storm')
			: currentTyped;

	// Claim the mode transition atomically. CAS succeeds for exactly one tick.
	if (previousTyped !== currentTyped) {
		const claim = await env.DB.prepare(
			`UPDATE system_state SET value = ?, updated_at = ?
			 WHERE key = 'notif_last_dispatch_mode' AND value = ?`
		)
			.bind(currentTyped, new Date().toISOString(), previousModeRaw)
			.run();
		if ((claim.meta?.changes ?? 0) === 0) {
			// Lost race OR seed value 'normal' matches new currentTyped — disambiguate.
			const cur = await env.DB
				.prepare("SELECT value FROM system_state WHERE key = 'notif_last_dispatch_mode'")
				.first<{ value: string }>();
			if (cur?.value !== previousModeRaw) {
				// Another tick already advanced the mode. Treat as no transition.
				console.log(`[notif] mode-transition CAS lost — another tick handled it.`);
				previousTyped = currentTyped;
			}
		}
	}

	// Pull enabled channels with their rule + state.
	const channelsResult = await env.DB.prepare(
		`SELECT c.id, c.owner_email, c.name, c.kind, c.target, c.mention, c.enabled, c.created_at,
		        r.threshold_kp, r.immediate_threshold_kp, r.summary_interval_min,
		        r.burst_window_max_hours, r.off_hours_digest_time, r.off_hours_digest_on_resume,
		        r.storm_end_notify, r.quiet_below_g1,
		        s.last_event_id_sent, s.last_immediate_at, s.last_summary_at, s.burst_started_at,
		        s.sms_last_sent_at, s.off_hours_buffer
		 FROM notif_channels c
		 JOIN notif_rules r ON r.channel_id = c.id
		 JOIN notif_state s ON s.channel_id = c.id
		 WHERE c.enabled = 1`
	).all<NotifChannel & NotifRule & NotifState>();

	const rows = channelsResult.results ?? [];
	if (rows.length === 0) {
		// Mode watermark was already updated via CAS at the top of the function.
		return summary;
	}

	// Cheap fast-bail: ask only for MAX(id) first. If no channel has an
	// older watermark, skip the event fetch entirely. The vast majority of
	// `*/5` ticks fall through here — kp_events appends are rare in normal mode.
	const minWatermark = rows.reduce(
		(m, r) => Math.min(m, r.last_event_id_sent),
		Number.MAX_SAFE_INTEGER
	);
	const maxRow = await env.DB.prepare(
		'SELECT MAX(id) AS max_id FROM kp_events'
	).first<{ max_id: number | null }>();
	const maxEventId = maxRow?.max_id ?? 0;

	// We fetch the union of all events newer than the lowest watermark.
	// LIMIT_PER_TICK caps the fetch — channels deep behind will catch up
	// progressively on subsequent ticks (we re-query at the next fire).
	// Choosing 1000: at 4 kp_events/hour during a major storm, 1000 covers
	// ~10 days of arrears even for the deepest watermark.
	const LIMIT_PER_TICK = 1000;
	let newEventsAll: KpEvent[] = [];
	if (maxEventId > (minWatermark === Number.MAX_SAFE_INTEGER ? 0 : minWatermark)) {
		const eventsResult = await env.DB.prepare(
			`SELECT id, ts, kp_value, source, storm_class, bz_nt, speed_kms, created_at
			 FROM kp_events
			 WHERE id > ?
			 ORDER BY id ASC
			 LIMIT ?`
		)
			.bind(minWatermark === Number.MAX_SAFE_INTEGER ? 0 : minWatermark, LIMIT_PER_TICK)
			.all<KpEvent>();
		newEventsAll = eventsResult.results ?? [];
		if (newEventsAll.length === LIMIT_PER_TICK) {
			console.warn(
				`[notif] LIMIT_PER_TICK (${LIMIT_PER_TICK}) reached — some channels may catch up on subsequent ticks.`
			);
		}
	}

	// Pull schedules once for all channels (avoids N+1). Chunk the IN(?,...)
	// to stay well under D1's parameter limit (~100); 50 is comfortable.
	const allSchedules: NotifSchedule[] = [];
	const idsBatched = chunk(rows.map(r => r.id), 50);
	for (const ids of idsBatched) {
		const placeholders = ids.map(() => '?').join(',');
		const schedResult = await env.DB.prepare(
			`SELECT id, channel_id, days_mask, hour_start, hour_end, timezone,
			        date_range_start, date_range_end, created_at
			 FROM notif_schedules
			 WHERE channel_id IN (${placeholders})`
		)
			.bind(...ids)
			.all<NotifSchedule>();
		allSchedules.push(...(schedResult.results ?? []));
	}

	// Storm-end decoration data: when active mode just returned to 'normal',
	// look back over the last 24h of kp_events to find the peak storm class
	// and Kp. This is best-effort — fields stay null if no events found.
	const stormEndInfo = await computeStormEndInfo(env.DB, previousTyped, currentTyped, now);

	const schedulesByChannel = new Map<number, NotifSchedule[]>();
	for (const s of allSchedules) {
		const arr = schedulesByChannel.get(s.channel_id) ?? [];
		arr.push(s);
		schedulesByChannel.set(s.channel_id, arr);
	}

	for (const row of rows) {
		summary.channels_checked++;
		const channel: NotifChannel = {
			id: row.id,
			owner_email: row.owner_email,
			name: row.name,
			kind: row.kind,
			target: row.target,
			mention: row.mention,
			enabled: row.enabled,
			created_at: row.created_at,
		};
		const rule: NotifRule = {
			channel_id: row.id,
			threshold_kp: row.threshold_kp,
			immediate_threshold_kp: row.immediate_threshold_kp,
			summary_interval_min: row.summary_interval_min,
			burst_window_max_hours: row.burst_window_max_hours,
			off_hours_digest_time: row.off_hours_digest_time,
			off_hours_digest_on_resume: row.off_hours_digest_on_resume,
			storm_end_notify: row.storm_end_notify,
			quiet_below_g1: row.quiet_below_g1,
		};
		const state: NotifState = {
			channel_id: row.id,
			last_event_id_sent: row.last_event_id_sent,
			last_immediate_at: row.last_immediate_at,
			last_summary_at: row.last_summary_at,
			burst_started_at: row.burst_started_at,
			sms_last_sent_at: row.sms_last_sent_at,
			off_hours_buffer: row.off_hours_buffer,
		};

		// Per-channel event filter.
		const newEvents = newEventsAll.filter(
			e => e.id > state.last_event_id_sent && e.kp_value >= rule.threshold_kp
		);

		const schedules = schedulesByChannel.get(row.id) ?? [];
		const inSchedNow = isInSchedule(schedules, now);

		const decision = decide({
			channel,
			rule,
			schedules,
			state,
			newEvents,
			now,
			previousMode: previousTyped,
			currentMode: currentTyped,
		});

		// Fast-skip when there is literally nothing to do for this channel.
		// Without this, every no-op tick would still run a CAS UPDATE + a
		// disambiguation SELECT against notif_state per channel — ~1 extra
		// D1 read per enabled channel per 5 min. Most ticks fall through here.
		const isNoop =
			decision.actions.length === 0 &&
			decision.nextState.last_event_id_sent === state.last_event_id_sent &&
			decision.nextState.off_hours_buffer === state.off_hours_buffer &&
			decision.nextState.burst_started_at === state.burst_started_at &&
			decision.nextState.last_immediate_at === state.last_immediate_at &&
			decision.nextState.last_summary_at === state.last_summary_at &&
			decision.nextState.sms_last_sent_at === state.sms_last_sent_at;
		if (isNoop) continue;

		// Race-prevention claim: atomic CAS on the watermark. If we win, we
		// own the events between state.last_event_id_sent and
		// decision.nextState.last_event_id_sent for this tick. If another
		// concurrent dispatcher tick already advanced the watermark, we skip
		// all side effects and state writes — that tick will handle them.
		//
		// Residual race (documented limitation): if two ticks BOTH have the
		// same previousWatermark === newWatermark (no new events) AND the same
		// non-event-driven actions queued (on-resume digest specifically;
		// storm_end is separately serialized via the system_state mode CAS),
		// both could pass the disambiguation read and dispatch. Worst case is
		// one duplicate Discord message. Fully closing this needs a tick-id
		// column on notif_state and a migration; the tradeoff is the
		// extremely rare collision window (cron retries with same
		// scheduledTime are uncommon) vs. the complexity of a new column.
		const claimed = await tryClaim(
			env.DB,
			row.id,
			state.last_event_id_sent,
			decision.nextState.last_event_id_sent
		);
		if (!claimed) {
			if (decision.actions.length > 0) {
				console.log(
					`[notif] channel ${row.id}: lost CAS race, skipping ${decision.actions.length} action(s)`
				);
			}
			continue;
		}

		// Side effects. Pass `decision.nextState` (not the original `state`)
		// to performAction so e.g. SMS-cap checks see the freshest values
		// the dispatcher has computed this tick. This is defensive against
		// future changes to decide() that might emit more than one action of
		// the same kind per tick.
		for (const rawAction of decision.actions) {
			// Decorate storm_end with peak/duration data computed once above.
			const action: DispatchAction =
				rawAction.type === 'storm_end'
					? {
							type: 'storm_end',
							peakKp: stormEndInfo.peakKp,
							peakClass: stormEndInfo.peakClass,
							durationHours: stormEndInfo.durationHours,
						}
					: rawAction;
			const result = await performAction(env, channel, rule, decision.nextState, action, now);
			if (result.dispatched) summary.actions_dispatched++;
			if (!result.ok) summary.failures++;
			// Orchestrator owns the state-bumps that depend on whether dispatch
			// actually went out — decide() can't know that because of SMS caps
			// and webhook failures. We only bump on success+actually-sent.
			if (action.type === 'immediate' && result.dispatched && result.ok) {
				decision.nextState.last_immediate_at = now.toISOString();
				if (channel.kind === 'sms') {
					decision.nextState.sms_last_sent_at = now.toISOString();
				}
			}
		}

		// If we're now off-schedule, reset burst_started_at so the next
		// in-schedule entry starts a fresh window.
		if (!inSchedNow) {
			decision.nextState.burst_started_at = null;
		}

		// We own this row for this tick (CAS won above). Final persist of the
		// non-watermark state fields. No CAS needed — only this tick can be
		// at the post-claim point with these values.
		await persistRestOfState(env.DB, decision.nextState);
	}

	// `notif_last_dispatch_mode` was already updated via CAS at the top of the
	// function. Nothing further to write.

	return summary;
}

interface PerformResult {
	ok: boolean;
	dispatched: boolean; // true if we actually attempted a send (false if e.g. SMS cap blocked)
}

async function performAction(
	env: DispatchEnv,
	channel: NotifChannel,
	rule: NotifRule,
	state: NotifState,
	action: DispatchAction,
	now: Date
): Promise<PerformResult> {
	// SMS only supports immediate alerts at most once per 12h.
	if (channel.kind === 'sms') {
		if (action.type !== 'immediate') {
			return { ok: true, dispatched: false }; // silently drop non-immediate for SMS
		}
		if (!smsAllowed(state, now)) {
			return { ok: true, dispatched: false }; // 12h cap blocks it; not a failure
		}
		if (!env.TEXTBELT_API_KEY) {
			await logDelivery(env.DB, channel, 'immediate', summarizeAction(action), false, 0, 'TEXTBELT_API_KEY not set');
			return { ok: false, dispatched: true };
		}
		const message = buildImmediateSms(channel.name, action.event);
		const result = await sendTextBelt(channel.target, message, env.TEXTBELT_API_KEY);
		await logDelivery(env.DB, channel, 'immediate', summarizeAction(action), result.ok, result.status, result.error);
		return { ok: result.ok, dispatched: true };
	}

	// Discord branch.
	let payload;
	let kind: 'immediate' | 'summary' | 'off_hours_digest' | 'storm_end';
	switch (action.type) {
		case 'immediate':
			payload = buildImmediateEmbed(channel.name, channel.mention, action.event);
			kind = 'immediate';
			break;
		case 'summary':
			payload = buildSummaryEmbed(channel.name, channel.mention, action.events, action.windowMinutes);
			kind = 'summary';
			break;
		case 'off_hours_digest':
			payload = buildOffHoursDigestEmbed(channel.name, channel.mention, action.buffered);
			kind = 'off_hours_digest';
			break;
		case 'storm_end':
			payload = buildStormEndEmbed(
				channel.name,
				channel.mention,
				action.peakKp,
				action.peakClass,
				action.durationHours
			);
			kind = 'storm_end';
			break;
	}

	const result = await sendDiscord(channel.target, payload);
	await logDelivery(env.DB, channel, kind, summarizeAction(action), result.ok, result.status, result.error);
	return { ok: result.ok, dispatched: true };
}

function summarizeAction(action: DispatchAction): string {
	switch (action.type) {
		case 'immediate':
			return `Immediate alert: Kp ${action.event.kp_value.toFixed(2)} ${action.event.storm_class} @ ${action.event.ts}`;
		case 'summary':
			return `Summary: ${action.events.length} event(s), window ${action.windowMinutes}m`;
		case 'off_hours_digest':
			return `Off-hours digest: ${action.buffered.length} buffered event(s)`;
		case 'storm_end':
			return `Storm end (peak ${action.peakKp ?? '—'} ${action.peakClass ?? ''})`;
	}
}

/** Compare-and-swap on last_event_id_sent. Atomically advances the watermark
 *  from `previousWatermark` to `newWatermark`. Returns true if we won the CAS.
 *  Even when previousWatermark === newWatermark (no new events to claim), the
 *  UPDATE returns success only if no other tick has moved past us — i.e. this
 *  serves as the "lock" the rest of the tick relies on. */
async function tryClaim(
	db: D1Database,
	channelId: number,
	previousWatermark: number,
	newWatermark: number
): Promise<boolean> {
	const res = await db
		.prepare(
			`UPDATE notif_state SET last_event_id_sent = ?
			 WHERE channel_id = ? AND last_event_id_sent = ?`
		)
		.bind(newWatermark, channelId, previousWatermark)
		.run();
	// changes() == 0 means either CAS failed OR newWatermark equals stored
	// value (D1 considers no-op updates as 0 changes). Distinguish by reading.
	if ((res.meta?.changes ?? 0) > 0) return true;
	// No-op update OR lost race — disambiguate with one extra read.
	const cur = await db
		.prepare('SELECT last_event_id_sent AS w FROM notif_state WHERE channel_id = ?')
		.bind(channelId)
		.first<{ w: number }>();
	return (cur?.w ?? -1) === newWatermark;
}

/** Persist the remaining mutable state fields. Called after a successful
 *  tryClaim; no CAS needed because we already own the row for this tick. */
async function persistRestOfState(db: D1Database, state: NotifState): Promise<void> {
	await db
		.prepare(
			`UPDATE notif_state SET
			   last_immediate_at = ?,
			   last_summary_at = ?,
			   burst_started_at = ?,
			   sms_last_sent_at = ?,
			   off_hours_buffer = ?
			 WHERE channel_id = ?`
		)
		.bind(
			state.last_immediate_at,
			state.last_summary_at,
			state.burst_started_at,
			state.sms_last_sent_at,
			state.off_hours_buffer,
			state.channel_id
		)
		.run();
}

async function logDelivery(
	db: D1Database,
	channel: NotifChannel,
	kind: 'immediate' | 'summary' | 'off_hours_digest' | 'storm_end' | 'test',
	summary: string,
	ok: boolean,
	httpStatus: number,
	error: string | null
): Promise<void> {
	// Explicit ISO 8601 sent_at — see recordDelivery() on the SvelteKit side
	// for the rationale (CLAUDE.md NOAA-timestamp footgun).
	await db
		.prepare(
			`INSERT INTO notif_deliveries
				(channel_id, channel_name, kind, payload_summary, ok, http_status, error, sent_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			channel.id,
			channel.name,
			kind,
			summary,
			ok ? 1 : 0,
			httpStatus || null,
			error,
			new Date().toISOString()
		)
		.run();
}

