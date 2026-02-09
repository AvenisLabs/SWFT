// formatters.ts v0.2.0 — Date/number formatting utilities

/** @deprecated Use formatLocal/formatUTC/formatDual from timeFormat.ts instead */
export function formatTimestamp(iso: string): string {
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;

	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const month = months[d.getUTCMonth()];
	const day = d.getUTCDate();
	const hours = d.getUTCHours().toString().padStart(2, '0');
	const mins = d.getUTCMinutes().toString().padStart(2, '0');

	return `${month} ${day}, ${hours}:${mins} UTC`;
}

/** Format Kp value with one decimal place */
export function formatKp(kp: number): string {
	return kp.toFixed(2);
}

/** Relative time label: "5m ago", "2h ago", "3d ago" */
export function timeAgo(iso: string): string {
	const now = Date.now();
	const then = new Date(iso).getTime();
	if (isNaN(then)) return '';

	const diffMs = now - then;
	const mins = Math.floor(diffMs / 60_000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;

	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;

	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

/** Clamp a number within bounds */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** Format wind speed with units */
export function formatSpeed(speed: number): string {
	return `${Math.round(speed)} km/s`;
}

/** Format Bz with sign and units */
export function formatBz(bz: number): string {
	const sign = bz >= 0 ? '+' : '';
	return `${sign}${bz.toFixed(1)} nT`;
}
