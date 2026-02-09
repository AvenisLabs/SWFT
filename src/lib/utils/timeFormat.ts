// timeFormat.ts v0.1.0 — Unified time formatting: local-first with optional dual display

/**
 * Format ISO timestamp in browser's local timezone.
 * Example: "Feb 9, 15:45 EST"
 */
export function formatLocal(iso: string): string {
	const d = new Date(iso);
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
		return formatUTC(iso);
	}
}

/**
 * Format ISO timestamp in UTC.
 * Example: "Feb 9, 20:45 UTC"
 */
export function formatUTC(iso: string): string {
	const d = new Date(iso);
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
	const d = new Date(iso);
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
	const d = new Date(iso);
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
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;

	const year = d.getFullYear();
	const month = (d.getMonth() + 1).toString().padStart(2, '0');
	const day = d.getDate().toString().padStart(2, '0');
	return `${year}-${month}-${day}`;
}
