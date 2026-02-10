// discord.ts v0.1.0 — Discord webhook embed formatter for link check reports

import type { LinkCheckEntry } from './link-checker';

const COLOR_GREEN = 0x2ecc71;
const COLOR_RED = 0xe74c3c;
const MAX_FIELDS = 20; // Discord embed field limit

/** Send link check results to Discord via webhook. Always sends (heartbeat). */
export async function sendLinkCheckReport(
	webhookUrl: string,
	results: LinkCheckEntry[]
): Promise<void> {
	const broken = results.filter(r => !r.ok);
	const healthy = results.filter(r => r.ok);
	const total = results.length;

	const embed = broken.length > 0
		? buildBrokenEmbed(broken, healthy.length, total)
		: buildHealthyEmbed(total);

	const body = JSON.stringify({ embeds: [embed] });

	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Discord webhook failed: ${res.status} — ${text}`);
	}
}

/** Build green "all healthy" embed */
function buildHealthyEmbed(total: number) {
	return {
		title: '\u2705 SWFT Link Check \u2014 All Links Healthy',
		description: `All ${total} external links returned successful responses.`,
		color: COLOR_GREEN,
		timestamp: new Date().toISOString(),
		footer: { text: 'SWFT External Link Monitor' },
	};
}

/** Build red "broken links found" embed */
function buildBrokenEmbed(broken: LinkCheckEntry[], healthyCount: number, total: number) {
	const fields = broken.slice(0, MAX_FIELDS).map(entry => ({
		name: truncate(entry.url, 256),
		value: [
			`**Status:** ${entry.status ?? 'N/A'} ${entry.statusText} | **Method:** ${entry.method} | **Response:** ${entry.responseTimeMs}ms`,
			`**Found on:** ${entry.foundOnPages.join(', ')}`,
		].join('\n'),
		inline: false,
	}));

	const overflow = broken.length > MAX_FIELDS
		? `\n_...and ${broken.length - MAX_FIELDS} more broken links not shown._`
		: '';

	return {
		title: '\u26a0\ufe0f SWFT Link Check \u2014 Broken Links Found',
		description: `${broken.length} of ${total} external links are broken. ${healthyCount} links are healthy.${overflow}`,
		color: COLOR_RED,
		fields,
		timestamp: new Date().toISOString(),
		footer: { text: 'SWFT External Link Monitor' },
	};
}

/** Truncate string to maxLen, adding ellipsis if needed */
function truncate(str: string, maxLen: number): string {
	return str.length > maxLen ? str.slice(0, maxLen - 1) + '\u2026' : str;
}
