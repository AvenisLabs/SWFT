// notif-schedule.test.ts v0.1.0 — Tests for the pure schedule-evaluation
// helper used by both the SvelteKit-side admin UI and the cron-worker dispatcher.

import { describe, it, expect } from 'vitest';
import {
	isInSchedule,
	isAtDigestTime,
	localParts,
} from '../workers/cron-ingest/src/lib/notif-schedule';
import type { NotifSchedule } from '../workers/cron-ingest/src/lib/notif-types';

function sched(overrides: Partial<NotifSchedule> = {}): NotifSchedule {
	return {
		id: 1,
		channel_id: 1,
		days_mask: 127, // every day
		hour_start: 0,
		hour_end: 24,
		timezone: 'UTC',
		date_range_start: null,
		date_range_end: null,
		created_at: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('isInSchedule', () => {
	it('empty schedule array means always-in-schedule (24/7)', () => {
		const now = new Date('2026-05-17T03:00:00.000Z');
		expect(isInSchedule([], now)).toBe(true);
	});

	it('always-on UTC schedule matches every hour', () => {
		const s = sched();
		for (const h of [0, 6, 12, 18, 23]) {
			expect(isInSchedule([s], new Date(`2026-05-17T${String(h).padStart(2, '0')}:00:00.000Z`))).toBe(true);
		}
	});

	it('7-19 UTC window matches mid-day, rejects pre-dawn', () => {
		const s = sched({ hour_start: 7, hour_end: 19 });
		expect(isInSchedule([s], new Date('2026-05-17T06:00:00.000Z'))).toBe(false);
		expect(isInSchedule([s], new Date('2026-05-17T07:00:00.000Z'))).toBe(true);
		expect(isInSchedule([s], new Date('2026-05-17T18:59:00.000Z'))).toBe(true);
		expect(isInSchedule([s], new Date('2026-05-17T19:00:00.000Z'))).toBe(false); // end is exclusive
		expect(isInSchedule([s], new Date('2026-05-17T22:00:00.000Z'))).toBe(false);
	});

	it('day-of-week mask: Mon-Fri only rejects Saturday', () => {
		const weekdays = 0b0111110; // bits 1-5 (Mon..Fri)
		const s = sched({ days_mask: weekdays });
		// 2026-05-15 is a Friday (verify: ISO weekday); 2026-05-16 is Saturday
		expect(isInSchedule([s], new Date('2026-05-15T12:00:00.000Z'))).toBe(true);  // Fri
		expect(isInSchedule([s], new Date('2026-05-16T12:00:00.000Z'))).toBe(false); // Sat
		expect(isInSchedule([s], new Date('2026-05-17T12:00:00.000Z'))).toBe(false); // Sun
		expect(isInSchedule([s], new Date('2026-05-18T12:00:00.000Z'))).toBe(true);  // Mon
	});

	it('union of two windows: weekdays 7-19 + weekends 9-21', () => {
		const weekday = sched({ days_mask: 0b0111110, hour_start: 7, hour_end: 19 });
		const weekend = sched({ id: 2, days_mask: 0b1000001, hour_start: 9, hour_end: 21 });
		// Sat 10:00 — weekend window
		expect(isInSchedule([weekday, weekend], new Date('2026-05-16T10:00:00.000Z'))).toBe(true);
		// Sat 8:00 — neither
		expect(isInSchedule([weekday, weekend], new Date('2026-05-16T08:00:00.000Z'))).toBe(false);
		// Mon 8:00 — weekday window
		expect(isInSchedule([weekday, weekend], new Date('2026-05-18T08:00:00.000Z'))).toBe(true);
	});

	it('timezone shift: 7-19 America/Denver is +1 day worth of UTC shift', () => {
		// Denver is UTC-6 (MDT) in May. 07:00 local = 13:00 UTC.
		const s = sched({ hour_start: 7, hour_end: 19, timezone: 'America/Denver' });
		// 2026-05-17 12:59:00 UTC -> 06:59 MDT -> NOT in window
		expect(isInSchedule([s], new Date('2026-05-17T12:59:00.000Z'))).toBe(false);
		// 2026-05-17 13:00:00 UTC -> 07:00 MDT -> in window
		expect(isInSchedule([s], new Date('2026-05-17T13:00:00.000Z'))).toBe(true);
		// 2026-05-18 00:59 UTC -> 18:59 MDT prior day -> in window
		expect(isInSchedule([s], new Date('2026-05-18T00:59:00.000Z'))).toBe(true);
		// 2026-05-18 01:00 UTC -> 19:00 MDT -> out (exclusive)
		expect(isInSchedule([s], new Date('2026-05-18T01:00:00.000Z'))).toBe(false);
	});

	it('date range bounds the window', () => {
		const s = sched({ date_range_start: '2026-05-17', date_range_end: '2026-05-19' });
		expect(isInSchedule([s], new Date('2026-05-16T12:00:00.000Z'))).toBe(false);
		expect(isInSchedule([s], new Date('2026-05-17T12:00:00.000Z'))).toBe(true);
		expect(isInSchedule([s], new Date('2026-05-19T23:00:00.000Z'))).toBe(true);
		expect(isInSchedule([s], new Date('2026-05-20T00:00:00.000Z'))).toBe(false);
	});
});

describe('isAtDigestTime', () => {
	it('matches the exact target minute', () => {
		expect(isAtDigestTime(new Date('2026-05-17T07:00:00.000Z'), '07:00')).toBe(true);
	});
	it('matches up to (default) 5 minutes after target', () => {
		expect(isAtDigestTime(new Date('2026-05-17T07:04:00.000Z'), '07:00')).toBe(true);
		expect(isAtDigestTime(new Date('2026-05-17T07:05:00.000Z'), '07:00')).toBe(false);
	});
	it('never matches before the target', () => {
		expect(isAtDigestTime(new Date('2026-05-17T06:59:00.000Z'), '07:00')).toBe(false);
	});
	it('rejects malformed HH:MM', () => {
		expect(isAtDigestTime(new Date('2026-05-17T07:00:00.000Z'), 'not-a-time')).toBe(false);
		expect(isAtDigestTime(new Date('2026-05-17T07:00:00.000Z'), '7:0')).toBe(false);
	});
});

describe('localParts', () => {
	it('returns null for invalid timezone', () => {
		expect(localParts(new Date('2026-05-17T12:00:00.000Z'), 'Not/AReal_Tz')).toBeNull();
	});
	it('extracts correct dayIdx (0=Sun)', () => {
		const p = localParts(new Date('2026-05-17T12:00:00.000Z'), 'UTC');
		expect(p?.dayIdx).toBe(0); // Sunday
	});
});
