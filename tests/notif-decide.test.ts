// notif-decide.test.ts v0.1.0 — Tests for the pure decide() function that
// drives the notification dispatcher. Every branchy rule lives here.

import { describe, it, expect } from 'vitest';
import { decide, smsAllowed, parseBuffer, serializeBuffer } from '../workers/cron-ingest/src/lib/notif-decide';
import type {
	NotifChannel,
	NotifRule,
	NotifSchedule,
	NotifState,
	KpEvent,
	BufferedEvent,
} from '../workers/cron-ingest/src/lib/notif-types';

const NOW = new Date('2026-05-17T12:00:00.000Z');

function ch(overrides: Partial<NotifChannel> = {}): NotifChannel {
	return {
		id: 1,
		owner_email: 'u@example.com',
		name: 'Test',
		kind: 'discord',
		target: 'https://discord.com/api/webhooks/1/abc',
		mention: null,
		enabled: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

function rule(overrides: Partial<NotifRule> = {}): NotifRule {
	return {
		channel_id: 1,
		threshold_kp: 4.0,
		immediate_threshold_kp: 6.0,
		summary_interval_min: 60,
		burst_window_max_hours: 8,
		off_hours_digest_time: null,
		off_hours_digest_on_resume: 0,
		storm_end_notify: 1,
		quiet_below_g1: 0,
		...overrides,
	};
}

function state(overrides: Partial<NotifState> = {}): NotifState {
	return {
		channel_id: 1,
		last_event_id_sent: 0,
		last_immediate_at: null,
		last_summary_at: null,
		burst_started_at: null,
		sms_last_sent_at: null,
		off_hours_buffer: '[]',
		...overrides,
	};
}

function ev(id: number, kp: number, opts: Partial<KpEvent> = {}): KpEvent {
	return {
		id,
		ts: opts.ts ?? '2026-05-17T11:45:00.000Z',
		kp_value: kp,
		source: 'noaa',
		storm_class:
			kp >= 9 ? 'G5' : kp >= 8 ? 'G4' : kp >= 7 ? 'G3' : kp >= 6 ? 'G2' : kp >= 5 ? 'G1' : 'active',
		bz_nt: null,
		speed_kms: null,
		created_at: '2026-05-17T11:45:00.000Z',
		...opts,
	};
}

const NO_SCHEDULES: NotifSchedule[] = []; // 24/7

describe('decide — basics', () => {
	it('returns no actions when there are no new events', () => {
		const out = decide({
			channel: ch(),
			rule: rule(),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions).toEqual([]);
		expect(out.nextState.last_event_id_sent).toBe(0);
	});

	it('advances watermark even when no actions fire (quiet_below_g1 filters out)', () => {
		const out = decide({
			channel: ch(),
			rule: rule({ quiet_below_g1: 1 }),
			schedules: NO_SCHEDULES,
			state: state(),
			// Kp 4 is "active" storm_class, which quiet_below_g1 suppresses.
			newEvents: [ev(7, 4.0)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions).toEqual([]);
		expect(out.nextState.last_event_id_sent).toBe(7);
	});
});

describe('decide — immediate alerts', () => {
	it('fires immediate for Kp >= immediate_threshold_kp', () => {
		const out = decide({
			channel: ch(),
			rule: rule({ immediate_threshold_kp: 6.0 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [ev(10, 6.33)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		const immediate = out.actions.filter(a => a.type === 'immediate');
		expect(immediate.length).toBe(1);
		expect(immediate[0].type === 'immediate' && immediate[0].event.id).toBe(10);
	});

	it('does not fire immediate when no event reaches the threshold', () => {
		const out = decide({
			channel: ch(),
			rule: rule({ immediate_threshold_kp: 6.0 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [ev(10, 5.0), ev(11, 5.67)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'immediate')).toBeUndefined();
	});

	it('picks the highest-Kp event when multiple qualify (no spam)', () => {
		const out = decide({
			channel: ch(),
			rule: rule({ immediate_threshold_kp: 6.0 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [ev(10, 6.33), ev(11, 7.67), ev(12, 6.67)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		const immediate = out.actions.filter(a => a.type === 'immediate');
		expect(immediate.length).toBe(1);
		expect(immediate[0].type === 'immediate' && immediate[0].event.id).toBe(11);
	});
});

describe('decide — summary cadence and burst window', () => {
	it('fires a summary on first run when events exist (no last_summary_at)', () => {
		const out = decide({
			channel: ch(),
			rule: rule({ threshold_kp: 4, summary_interval_min: 60 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [ev(1, 4.33), ev(2, 4.67)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		const summary = out.actions.find(a => a.type === 'summary');
		expect(summary).toBeDefined();
		expect(out.nextState.last_summary_at).toBe(NOW.toISOString());
		// burst_started_at should be armed
		expect(out.nextState.burst_started_at).toBe(NOW.toISOString());
	});

	it('does NOT fire summary when within cadence interval', () => {
		// last_summary_at 30 min ago, interval 60 min -> no summary yet
		const lastSummary = new Date(NOW.getTime() - 30 * 60_000).toISOString();
		const out = decide({
			channel: ch(),
			rule: rule({ summary_interval_min: 60 }),
			schedules: NO_SCHEDULES,
			state: state({ last_summary_at: lastSummary, burst_started_at: lastSummary }),
			newEvents: [ev(1, 4.33)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'summary')).toBeUndefined();
		// Watermark still advances.
		expect(out.nextState.last_event_id_sent).toBe(1);
	});

	it('downgrades 15-min cadence to 30-min when burst window expired', () => {
		// burst started 10h ago, cap is 8h -> burst inactive -> 15 floors to 30
		const tenHoursAgo = new Date(NOW.getTime() - 10 * 3600_000).toISOString();
		const lastSummary = new Date(NOW.getTime() - 20 * 60_000).toISOString(); // 20 min ago
		const out = decide({
			channel: ch(),
			rule: rule({ summary_interval_min: 15, burst_window_max_hours: 8 }),
			schedules: NO_SCHEDULES,
			state: state({ last_summary_at: lastSummary, burst_started_at: tenHoursAgo }),
			newEvents: [ev(1, 4.33)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		// 20 min since last summary, effective interval = 30 (downgraded). Should NOT fire.
		expect(out.actions.find(a => a.type === 'summary')).toBeUndefined();
	});

	it('allows 15-min cadence inside burst window', () => {
		// burst started 2h ago, cap 8h -> burst active -> 15 stays 15
		const twoHoursAgo = new Date(NOW.getTime() - 2 * 3600_000).toISOString();
		const lastSummary = new Date(NOW.getTime() - 16 * 60_000).toISOString(); // 16 min ago
		const out = decide({
			channel: ch(),
			rule: rule({ summary_interval_min: 15, burst_window_max_hours: 8 }),
			schedules: NO_SCHEDULES,
			state: state({ last_summary_at: lastSummary, burst_started_at: twoHoursAgo }),
			newEvents: [ev(1, 4.33)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'summary')).toBeDefined();
	});
});

describe('decide — off-schedule buffering', () => {
	const offSchedule: NotifSchedule[] = [
		{
			id: 1, channel_id: 1,
			days_mask: 0b0111110, // weekdays
			hour_start: 7, hour_end: 19, timezone: 'UTC',
			date_range_start: null, date_range_end: null,
			created_at: '2026-01-01T00:00:00.000Z',
		},
	];

	it('buffers off-schedule events without sending', () => {
		// 2026-05-17 is a Sunday → off-schedule for weekdays-only window
		const out = decide({
			channel: ch(),
			rule: rule(),
			schedules: offSchedule,
			state: state(),
			newEvents: [ev(5, 5.0)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions.filter(a => a.type === 'immediate' || a.type === 'summary')).toEqual([]);
		const buf = parseBuffer(out.nextState.off_hours_buffer);
		expect(buf.length).toBe(1);
		expect(buf[0].event_id).toBe(5);
		expect(out.nextState.last_event_id_sent).toBe(5);
	});

	it('flushes the buffer when schedule resumes if rule.off_hours_digest_on_resume is set', () => {
		// In-schedule (24/7) channel with pre-existing buffer + on-resume rule
		const buffered: BufferedEvent[] = [
			{ event_id: 10, ts: '2026-05-17T06:00:00.000Z', kp_value: 4.67, storm_class: 'active' },
		];
		const out = decide({
			channel: ch(),
			rule: rule({ off_hours_digest_on_resume: 1 }),
			schedules: NO_SCHEDULES,
			state: state({ off_hours_buffer: serializeBuffer(buffered) }),
			newEvents: [],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		const digest = out.actions.find(a => a.type === 'off_hours_digest');
		expect(digest).toBeDefined();
		expect(parseBuffer(out.nextState.off_hours_buffer).length).toBe(0);
	});

	it('fires daily digest at configured HH:MM during off-schedule', () => {
		// off-schedule + buffered events + digest time matches NOW
		const buffered: BufferedEvent[] = [
			{ event_id: 10, ts: '2026-05-17T02:00:00.000Z', kp_value: 4.67, storm_class: 'active' },
		];
		const noonUtc = new Date('2026-05-17T12:00:00.000Z');
		const out = decide({
			channel: ch(),
			rule: rule({ off_hours_digest_time: '12:00' }),
			schedules: offSchedule, // weekdays only — 2026-05-17 is Sunday, off-schedule
			state: state({ off_hours_buffer: serializeBuffer(buffered) }),
			newEvents: [],
			now: noonUtc,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		const digest = out.actions.find(a => a.type === 'off_hours_digest');
		expect(digest).toBeDefined();
		// Buffer should be cleared.
		expect(parseBuffer(out.nextState.off_hours_buffer).length).toBe(0);
	});

	it('does NOT re-fire the digest within the tolerance window (buffer cleared)', () => {
		// Realistic dedupe path: a previous tick at 12:00 already flushed the
		// buffer. A follow-up tick at 12:03 (still within the 5-min tolerance)
		// sees buffer.length === 0 and skips. The old test asserted a
		// last_summary_at guard which was buggy — see notif-decide.ts comments.
		const justAfterNoon = new Date('2026-05-17T12:03:00.000Z');
		const out = decide({
			channel: ch(),
			rule: rule({ off_hours_digest_time: '12:00' }),
			schedules: offSchedule,
			state: state({ off_hours_buffer: '[]' }), // buffer already cleared by prior fire
			newEvents: [],
			now: justAfterNoon,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'off_hours_digest')).toBeUndefined();
	});

	it('caps buffer growth at BUFFER_CAP (oldest dropped)', async () => {
		const { BUFFER_CAP } = await import('../workers/cron-ingest/src/lib/notif-decide');
		// Pre-fill with BUFFER_CAP entries, then push 5 more via off-schedule events.
		const buffered: BufferedEvent[] = Array.from({ length: BUFFER_CAP }, (_, i) => ({
			event_id: i + 1,
			ts: `2026-05-17T00:${String(i % 60).padStart(2, '0')}:00.000Z`,
			kp_value: 4.0,
			storm_class: 'active',
		}));
		const newOnes: KpEvent[] = Array.from({ length: 5 }, (_, i) =>
			ev(BUFFER_CAP + i + 1, 4.0, { ts: `2026-05-17T05:0${i}:00.000Z` })
		);
		const out = decide({
			channel: ch(),
			rule: rule(),
			schedules: offSchedule,
			state: state({ off_hours_buffer: serializeBuffer(buffered) }),
			newEvents: newOnes,
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		const buf = parseBuffer(out.nextState.off_hours_buffer);
		expect(buf.length).toBe(BUFFER_CAP);
		// First 5 entries should have been dropped.
		expect(buf[0].event_id).toBe(6); // dropped 1..5
		expect(buf[buf.length - 1].event_id).toBe(BUFFER_CAP + 5);
	});
});

describe('decide — storm end', () => {
	it('emits storm_end when previousMode != normal and currentMode == normal', () => {
		const out = decide({
			channel: ch(),
			rule: rule({ storm_end_notify: 1 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [],
			now: NOW,
			previousMode: 'storm',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'storm_end')).toBeDefined();
	});

	it('does NOT emit storm_end when storm_end_notify is off', () => {
		const out = decide({
			channel: ch(),
			rule: rule({ storm_end_notify: 0 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [],
			now: NOW,
			previousMode: 'storm',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'storm_end')).toBeUndefined();
	});

	it('does NOT emit storm_end when mode is unchanged', () => {
		const out = decide({
			channel: ch(),
			rule: rule({ storm_end_notify: 1 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'storm_end')).toBeUndefined();
	});

	it('does NOT emit storm_end while channel is off-schedule (avoids 3am pings)', () => {
		// Sunday 2026-05-17, weekdays-only schedule => off-schedule
		const weekdays = [
			{
				id: 1, channel_id: 1,
				days_mask: 0b0111110, hour_start: 7, hour_end: 19, timezone: 'UTC',
				date_range_start: null, date_range_end: null,
				created_at: '2026-01-01T00:00:00.000Z',
			},
		];
		const out = decide({
			channel: ch(),
			rule: rule({ storm_end_notify: 1 }),
			schedules: weekdays,
			state: state(),
			newEvents: [],
			now: NOW, // Sunday
			previousMode: 'storm',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'storm_end')).toBeUndefined();
	});
});

describe('decide — multi-tick buffering (regression for "events between cadence ticks dropped")', () => {
	it('buffers in-schedule events that did not trigger a summary, and includes them in the eventual summary', () => {
		// Tick 1 at 10:00: event arrives, summary fires (first run, lastSummaryAt=null), buffer drained.
		const tick1 = decide({
			channel: ch(),
			rule: rule({ summary_interval_min: 60 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [ev(1, 4.33, { ts: '2026-05-17T10:00:00.000Z' })],
			now: new Date('2026-05-17T10:00:00.000Z'),
			previousMode: 'normal',
			currentMode: 'normal',
		});
		const tick1Summary = tick1.actions.find(a => a.type === 'summary');
		expect(tick1Summary).toBeDefined();
		if (tick1Summary?.type === 'summary') {
			expect(tick1Summary.events.map(e => e.id)).toEqual([1]);
		}
		// Buffer drained after summary
		expect(parseBuffer(tick1.nextState.off_hours_buffer)).toEqual([]);

		// Tick 2 at 10:30: event arrives, NO summary (cadence not reached). Event must stay buffered.
		const tick2 = decide({
			channel: ch(),
			rule: rule({ summary_interval_min: 60 }),
			schedules: NO_SCHEDULES,
			state: tick1.nextState,
			newEvents: [ev(2, 4.33, { ts: '2026-05-17T10:30:00.000Z' })],
			now: new Date('2026-05-17T10:30:00.000Z'),
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(tick2.actions.find(a => a.type === 'summary')).toBeUndefined();
		// Event 2 is now in the buffer.
		const tick2Buf = parseBuffer(tick2.nextState.off_hours_buffer);
		expect(tick2Buf.map(b => b.event_id)).toEqual([2]);
		// Watermark advanced even though no summary fired.
		expect(tick2.nextState.last_event_id_sent).toBe(2);

		// Tick 3 at 11:00: another event arrives, cadence reached. Summary must include events 2 AND 3.
		const tick3 = decide({
			channel: ch(),
			rule: rule({ summary_interval_min: 60 }),
			schedules: NO_SCHEDULES,
			state: tick2.nextState,
			newEvents: [ev(3, 4.33, { ts: '2026-05-17T11:00:00.000Z' })],
			now: new Date('2026-05-17T11:00:00.000Z'),
			previousMode: 'normal',
			currentMode: 'normal',
		});
		const tick3Summary = tick3.actions.find(a => a.type === 'summary');
		expect(tick3Summary).toBeDefined();
		if (tick3Summary?.type === 'summary') {
			// Summary should cover events 2 and 3 — event 2 came from buffer.
			expect(tick3Summary.events.map(e => e.id).sort()).toEqual([2, 3]);
		}
		expect(parseBuffer(tick3.nextState.off_hours_buffer)).toEqual([]);
	});

	it('does NOT bump last_immediate_at in nextState (orchestrator owns that field now)', () => {
		// Before the refactor, decide() set last_immediate_at when emitting an
		// immediate action — but the orchestrator might suppress the actual
		// send (SMS 12h cap, webhook failure), leaving the field falsely set.
		// Now the orchestrator owns it.
		const out = decide({
			channel: ch(),
			rule: rule({ immediate_threshold_kp: 6.0 }),
			schedules: NO_SCHEDULES,
			state: state(),
			newEvents: [ev(1, 6.67)],
			now: NOW,
			previousMode: 'normal',
			currentMode: 'normal',
		});
		expect(out.actions.find(a => a.type === 'immediate')).toBeDefined();
		expect(out.nextState.last_immediate_at).toBeNull(); // not bumped
	});
});

describe('smsAllowed (12h cap)', () => {
	it('allowed when last_sent is null', () => {
		expect(smsAllowed(state(), NOW)).toBe(true);
	});

	it('blocked exactly at the 11:59 mark', () => {
		const elevenH59 = new Date(NOW.getTime() - (12 * 3600_000 - 60_000)).toISOString();
		expect(smsAllowed(state({ sms_last_sent_at: elevenH59 }), NOW)).toBe(false);
	});

	it('allowed exactly at the 12h mark', () => {
		const twelveH = new Date(NOW.getTime() - 12 * 3600_000).toISOString();
		expect(smsAllowed(state({ sms_last_sent_at: twelveH }), NOW)).toBe(true);
	});
});

describe('parseBuffer / serializeBuffer', () => {
	it('parses valid JSON', () => {
		const buf: BufferedEvent[] = [{ event_id: 1, ts: 't', kp_value: 5, storm_class: 'G1' }];
		expect(parseBuffer(serializeBuffer(buf))).toEqual(buf);
	});
	it('returns empty array for malformed JSON', () => {
		expect(parseBuffer('not json')).toEqual([]);
		expect(parseBuffer('null')).toEqual([]);
		expect(parseBuffer('{}')).toEqual([]);
	});
	it('filters out malformed entries', () => {
		const corrupt = JSON.stringify([{ event_id: 1, ts: 't', kp_value: 5, storm_class: 'G1' }, { bogus: true }]);
		expect(parseBuffer(corrupt).length).toBe(1);
	});
});
