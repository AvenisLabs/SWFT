// notif-schedule.ts v0.1.0 — Pure schedule-evaluation logic.
// Mirrors src/lib/server/notif-schedules.ts (isInSchedule). Kept pure so the
// dispatch tests can exercise it without D1 or Workers globals.

import type { NotifSchedule } from './notif-types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** True if `nowUtc` falls within at least one schedule's active window.
 *  Empty schedule list is treated as 24/7 (matches the SvelteKit-side
 *  behavior). */
export function isInSchedule(schedules: NotifSchedule[], nowUtc: Date): boolean {
	if (schedules.length === 0) return true;
	for (const s of schedules) {
		if (isOneScheduleActive(s, nowUtc)) return true;
	}
	return false;
}

/** Extract local Y/M/D/H/dayOfWeek for a given timezone using ICU. */
export function localParts(nowUtc: Date, timezone: string): {
	year: number;
	month: number;
	day: number;
	hour: number;
	dayIdx: number; // 0=Sun..6=Sat
	dateIso: string; // YYYY-MM-DD
} | null {
	let fmt: Intl.DateTimeFormat;
	try {
		fmt = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			hour12: false,
			weekday: 'short',
		});
	} catch {
		// Invalid IANA timezone — caller treats null as "schedule never matches"
		return null;
	}
	const parts: Record<string, string> = {};
	for (const p of fmt.formatToParts(nowUtc)) parts[p.type] = p.value;
	const year = Number(parts.year);
	const month = Number(parts.month);
	const day = Number(parts.day);
	const hour = Number(parts.hour === '24' ? '0' : parts.hour);
	const weekday = parts.weekday;
	const dayIdx = DAY_LABELS.indexOf(weekday as (typeof DAY_LABELS)[number]);
	if (dayIdx < 0 || !Number.isFinite(year + month + day + hour)) return null;
	const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	return { year, month, day, hour, dayIdx, dateIso };
}

function isOneScheduleActive(s: NotifSchedule, nowUtc: Date): boolean {
	const p = localParts(nowUtc, s.timezone);
	if (!p) return false;
	if (!((s.days_mask >> p.dayIdx) & 1)) return false;
	if (p.hour < s.hour_start || p.hour >= s.hour_end) return false;
	if (s.date_range_start && p.dateIso < s.date_range_start) return false;
	if (s.date_range_end && p.dateIso > s.date_range_end) return false;
	return true;
}

/** Returns true if the current minute of the day in any schedule's timezone
 *  matches the channel's off-hours-digest time, within `toleranceMin` minutes.
 *  Used by the dispatcher to fire daily digests at HH:MM (UTC, per the rule
 *  field semantics — off_hours_digest_time is interpreted in UTC).
 *
 *  Tolerance handles the fact that the cron fires every 5 min on the
 *  five-minute boundary, so a 07:00 digest could be served by either the
 *  07:00 or (close enough) 06:55 tick. Default tolerance 5 min, matching
 *  cron cadence. */
export function isAtDigestTime(nowUtc: Date, hhmm: string, toleranceMin = 5): boolean {
	const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
	if (!match) return false;
	const wantH = Number(match[1]);
	const wantM = Number(match[2]);
	const nowMinOfDay = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes();
	const wantMinOfDay = wantH * 60 + wantM;
	const diff = nowMinOfDay - wantMinOfDay;
	// Fire on the tick at-or-just-after the target time.
	return diff >= 0 && diff < toleranceMin;
}
