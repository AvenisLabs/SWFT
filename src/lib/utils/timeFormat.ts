// timeFormat.ts v0.2.0 — Unified time formatting: local-first with UTC/Eastern fallback

export const EASTERN_TIME_ZONE = 'America/New_York';

function normalizeIso(iso: string): string {
	return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
		? `${iso.replace(' ', 'T')}Z`
		: iso;
}

export function isValidTimeZone(timeZone: string | null | undefined): timeZone is string {
	if (!timeZone) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
		return true;
	} catch {
		return false;
	}
}

function timeZoneAbbr(date: Date, timeZone: string): string {
	const part = new Intl.DateTimeFormat('en-US', {
		timeZone,
		timeZoneName: 'short',
	}).formatToParts(date).find(p => p.type === 'timeZoneName');
	return part?.value ?? timeZone;
}

function formatInTimeZone(iso: string, timeZone: string, includeYear = false): string {
	const d = new Date(normalizeIso(iso));
	if (isNaN(d.getTime())) return iso;
	const formatted = new Intl.DateTimeFormat('en-US', {
		timeZone,
		month: 'short',
		day: 'numeric',
		...(includeYear ? { year: 'numeric' as const } : {}),
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	}).format(d);
	return `${formatted} ${timeZoneAbbr(d, timeZone)}`;
}

export function formatUtcAndEastern(iso: string): string {
	const d = new Date(normalizeIso(iso));
	if (isNaN(d.getTime())) return iso;
	return `${formatUTC(iso)} / ${formatInTimeZone(iso, EASTERN_TIME_ZONE)}`;
}

export function formatUserTime(iso: string, timeZone: string | null | undefined): string {
	if (isValidTimeZone(timeZone)) return formatInTimeZone(iso, timeZone);
	return formatUtcAndEastern(iso);
}

export function describeTimeZone(timeZone: string | null | undefined, atIso?: string): string {
	if (!isValidTimeZone(timeZone)) return 'UTC / Eastern';
	const d = atIso ? new Date(normalizeIso(atIso)) : new Date();
	const suffix = isNaN(d.getTime()) ? timeZone : timeZoneAbbr(d, timeZone);
	return `${timeZone} (${suffix})`;
}

/**
 * Format ISO timestamp in browser's local timezone.
 * Example: "Feb 9, 15:45 EST"
 */
export function formatLocal(iso: string): string {
	const d = new Date(normalizeIso(iso));
	if (isNaN(d.getTime())) return iso;

	try {
		const datePart = new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		}).format(d);

		// Get timezone abbreviation
		const tzPart = new Intl.DateTimeFormat('en-US', {
			timeZoneName: 'short',
		}).formatToParts(d).find(p => p.type === 'timeZoneName');
		const tz = tzPart?.value ?? '';

		return `${datePart} ${tz}`.trim();
	} catch {
		return formatUtcAndEastern(iso);
	}
}

/**
 * Format ISO timestamp in UTC.
 * Example: "Feb 9, 20:45 UTC"
 */
export function formatUTC(iso: string): string {
	const d = new Date(normalizeIso(iso));
	if (isNaN(d.getTime())) return iso;

	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const month = months[d.getUTCMonth()];
	const day = d.getUTCDate();
	const hours = d.getUTCHours().toString().padStart(2, '0');
	const mins = d.getUTCMinutes().toString().padStart(2, '0');

	return `${month} ${day}, ${hours}:${mins} UTC`;
}

/**
 * Format ISO timestamp with both UTC and local time (for detail views).
 * Example: "Feb 9, 20:45 UTC (15:45 EST)"
 */
export function formatDual(iso: string): string {
	const d = new Date(normalizeIso(iso));
	if (isNaN(d.getTime())) return iso;

	const utc = formatUTC(iso);

	try {
		const localTime = new Intl.DateTimeFormat('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		}).format(d);

		const tzPart = new Intl.DateTimeFormat('en-US', {
			timeZoneName: 'short',
		}).formatToParts(d).find(p => p.type === 'timeZoneName');
		const tz = tzPart?.value ?? '';

		return `${utc} (${localTime} ${tz})`.trim();
	} catch {
		return utc;
	}
}

/**
 * Format ISO timestamp as a full date header for grouping.
 * Example: "Sunday, February 9, 2026"
 */
export function formatDateHeader(iso: string): string {
	const d = new Date(normalizeIso(iso));
	if (isNaN(d.getTime())) return iso;

	try {
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		}).format(d);
	} catch {
		return d.toDateString();
	}
}

/**
 * Get a date-only key for grouping (YYYY-MM-DD in local timezone).
 */
export function dateKey(iso: string): string {
	const d = new Date(normalizeIso(iso));
	if (isNaN(d.getTime())) return iso;

	const year = d.getFullYear();
	const month = (d.getMonth() + 1).toString().padStart(2, '0');
	const day = d.getDate().toString().padStart(2, '0');
	return `${year}-${month}-${day}`;
}
