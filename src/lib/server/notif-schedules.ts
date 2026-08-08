// notif-schedules.ts v0.1.0 — Server-side library for notif_schedules.
//
// Schedule semantics:
//   - Multiple schedules per channel — the channel is "in-schedule" if ANY
//     schedule window is currently active (union).
//   - If a channel has ZERO schedules, it is treated as always-in-schedule
//     (24/7) — the dispatcher uses this to avoid blocking new channels from
//     receiving alerts before the user configures windows.
//   - days_mask is a bitmask. Bit 0 (=1) is Sunday, matching JS Date.getDay().
//   - hour_start..hour_end is a left-inclusive, right-exclusive window in the
//     schedule's timezone. hour_end=24 means through end-of-day.
//   - date_range_start/end (YYYY-MM-DD inclusive) optionally bound the window
//     to a date range. Either may be null.

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst, execute } from './db';
import type { NotifSchedule } from './notif-channels';

const VALID_TIMEZONES_HINT = [
	'UTC',
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles',
	'America/Anchorage',
	'Pacific/Honolulu',
	'Europe/London',
	'Europe/Paris',
	'Australia/Sydney',
];

/** Validate the IANA timezone using Intl.DateTimeFormat. Returns true if accepted. */
export function isValidTimezone(tz: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

export function getCommonTimezones(): string[] {
	return VALID_TIMEZONES_HINT.slice();
}

export interface SchedulePatch {
	days_mask?: number;
	hour_start?: number;
	hour_end?: number;
	timezone?: string;
	date_range_start?: string | null;
	date_range_end?: string | null;
}

export function validateSchedule(patch: SchedulePatch): string | null {
	if (patch.days_mask !== undefined) {
		if (!Number.isInteger(patch.days_mask) || patch.days_mask < 1 || patch.days_mask > 127) {
			return 'days_mask must be an integer 1-127 (at least one day selected).';
		}
	}
	if (patch.hour_start !== undefined) {
		if (!Number.isInteger(patch.hour_start) || patch.hour_start < 0 || patch.hour_start > 23) {
			return 'hour_start must be an integer 0-23.';
		}
	}
	if (patch.hour_end !== undefined) {
		if (!Number.isInteger(patch.hour_end) || patch.hour_end < 1 || patch.hour_end > 24) {
			return 'hour_end must be an integer 1-24.';
		}
	}
	if (
		patch.hour_start !== undefined &&
		patch.hour_end !== undefined &&
		patch.hour_end <= patch.hour_start
	) {
		return 'hour_end must be greater than hour_start (overnight schedules require two rows).';
	}
	if (patch.timezone !== undefined && !isValidTimezone(patch.timezone)) {
		return `Invalid IANA timezone: ${patch.timezone}.`;
	}
	for (const k of ['date_range_start', 'date_range_end'] as const) {
		const v = patch[k];
		if (v !== undefined && v !== null) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
				return `${k} must be YYYY-MM-DD or null.`;
			}
		}
	}
	if (
		patch.date_range_start &&
		patch.date_range_end &&
		patch.date_range_start > patch.date_range_end
	) {
		return 'date_range_start must be ≤ date_range_end.';
	}
	return null;
}

export async function listSchedules(db: D1Database, channelId: number): Promise<NotifSchedule[]> {
	return queryAll<NotifSchedule>(
		db,
		'SELECT * FROM notif_schedules WHERE channel_id = ? ORDER BY created_at ASC',
		[channelId]
	);
}

export async function createSchedule(
	db: D1Database,
	channelId: number,
	input: SchedulePatch
): Promise<NotifSchedule> {
	const days_mask = input.days_mask ?? 127;
	const hour_start = input.hour_start ?? 0;
	const hour_end = input.hour_end ?? 24;
	const timezone = input.timezone ?? 'UTC';
	const date_range_start = input.date_range_start ?? null;
	const date_range_end = input.date_range_end ?? null;

	const result = await db
		.prepare(
			`INSERT INTO notif_schedules
				(channel_id, days_mask, hour_start, hour_end, timezone, date_range_start, date_range_end)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(channelId, days_mask, hour_start, hour_end, timezone, date_range_start, date_range_end)
		.run();

	const id = Number(result.meta?.last_row_id);
	const row = await queryFirst<NotifSchedule>(db, 'SELECT * FROM notif_schedules WHERE id = ?', [id]);
	if (!row) throw new Error('Schedule inserted but could not be re-read.');
	return row;
}

export async function updateSchedule(
	db: D1Database,
	id: number,
	channelId: number,
	patch: SchedulePatch
): Promise<NotifSchedule | null> {
	const fields: string[] = [];
	const params: unknown[] = [];
	if (patch.days_mask !== undefined) { fields.push('days_mask = ?'); params.push(patch.days_mask); }
	if (patch.hour_start !== undefined) { fields.push('hour_start = ?'); params.push(patch.hour_start); }
	if (patch.hour_end !== undefined) { fields.push('hour_end = ?'); params.push(patch.hour_end); }
	if (patch.timezone !== undefined) { fields.push('timezone = ?'); params.push(patch.timezone); }
	if (patch.date_range_start !== undefined) { fields.push('date_range_start = ?'); params.push(patch.date_range_start); }
	if (patch.date_range_end !== undefined) { fields.push('date_range_end = ?'); params.push(patch.date_range_end); }
	if (fields.length === 0) return queryFirst<NotifSchedule>(db, 'SELECT * FROM notif_schedules WHERE id = ? AND channel_id = ?', [id, channelId]);

	params.push(id, channelId);
	const changed = await execute(
		db,
		`UPDATE notif_schedules SET ${fields.join(', ')} WHERE id = ? AND channel_id = ?`,
		params
	);
	if (changed === 0) return null;
	return queryFirst<NotifSchedule>(db, 'SELECT * FROM notif_schedules WHERE id = ? AND channel_id = ?', [id, channelId]);
}

export async function deleteSchedule(
	db: D1Database,
	id: number,
	channelId: number
): Promise<boolean> {
	const changed = await execute(
		db,
		'DELETE FROM notif_schedules WHERE id = ? AND channel_id = ?',
		[id, channelId]
	);
	return changed > 0;
}

/**
 * Pure: is `nowUtc` inside any of `schedules`? Returns true if any schedule's
 * window is currently active (or if schedules is empty, treating that as 24/7).
 * Exported for the dispatcher AND for unit testing.
 */
export function isInSchedule(schedules: NotifSchedule[], nowUtc: Date): boolean {
	if (schedules.length === 0) return true;
	for (const s of schedules) {
		if (isOneScheduleActive(s, nowUtc)) return true;
	}
	return false;
}

function isOneScheduleActive(s: NotifSchedule, nowUtc: Date): boolean {
	// Render `nowUtc` in the schedule's timezone to extract local
	// year/month/day/hour/dayOfWeek. We use Intl.DateTimeFormat for the
	// timezone math because the Workers runtime has full ICU.
	const fmt = new Intl.DateTimeFormat('en-US', {
		timeZone: s.timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		hour12: false,
		weekday: 'short',
	});
	const parts: Record<string, string> = {};
	for (const p of fmt.formatToParts(nowUtc)) parts[p.type] = p.value;

	const year = Number(parts.year);
	const month = Number(parts.month);
	const day = Number(parts.day);
	const hour = Number(parts.hour === '24' ? '0' : parts.hour); // some locales render midnight as 24
	const weekday = parts.weekday; // 'Sun','Mon',...
	const dayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
	if (dayIdx < 0) return false;

	// Day-of-week mask check (bit 0 = Sunday)
	if (!((s.days_mask >> dayIdx) & 1)) return false;

	// Hour window: [hour_start, hour_end). hour_end=24 means through end-of-day.
	if (hour < s.hour_start || hour >= s.hour_end) return false;

	// Date range check (inclusive, YYYY-MM-DD lexicographic).
	const localDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	if (s.date_range_start && localDate < s.date_range_start) return false;
	if (s.date_range_end && localDate > s.date_range_end) return false;

	return true;
}
