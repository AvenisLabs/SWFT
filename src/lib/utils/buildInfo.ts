// buildInfo.ts v0.1.0 — Build timestamp injected by Vite at build time

declare const __BUILD_TIME__: string;

/** ISO string of when the app was last built */
export const BUILD_TIME: string = typeof __BUILD_TIME__ !== 'undefined'
	? __BUILD_TIME__
	: new Date().toISOString();

/** Format build time as "YYYY-MM-DD HH:mm EST/EDT" in America/New_York */
export function formatBuildTime(): string {
	try {
		const d = new Date(BUILD_TIME);
		const fmt = new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/New_York',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});
		const parts = fmt.formatToParts(d);
		const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
		const dateStr = `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;

		// Get timezone abbreviation (EST or EDT)
		const tzFmt = new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/New_York',
			timeZoneName: 'short',
		});
		const tzPart = tzFmt.formatToParts(d).find(p => p.type === 'timeZoneName');
		const tz = tzPart?.value ?? 'EST';

		return `${dateStr} ${tz}`;
	} catch {
		return BUILD_TIME.slice(0, 16).replace('T', ' ') + ' UTC';
	}
}
