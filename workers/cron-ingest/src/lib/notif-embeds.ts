// notif-embeds.ts v0.1.0 — Discord embed builders for notification dispatch.
//
// Embed types:
//   immediate         — single high-severity event (Kp >= immediate_threshold_kp)
//   summary           — periodic digest while in-schedule, all events since last summary
//   off_hours_digest  — events buffered during off-schedule hours
//   storm_end         — system mode returned to 'normal'
//
// Colors map to NOAA G-scale tiers, matching the dashboard's storm banner palette.

import type { KpEvent, BufferedEvent } from './notif-types';

export interface DiscordEmbed {
	title?: string;
	description?: string;
	url?: string;
	color?: number;
	timestamp?: string;
	footer?: { text: string };
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export interface DiscordPayload {
	content?: string;
	username?: string;
	embeds?: DiscordEmbed[];
	allowed_mentions?: {
		parse?: Array<'roles' | 'users' | 'everyone'>;
		roles?: string[];
		users?: string[];
	};
}

const SITE_URL = 'https://swft.skypixels.org';

/** Map storm class to embed color (RGB int). Mirrors the dashboard banner palette. */
function colorFor(stormClass: string, kp: number): number {
	switch (stormClass) {
		case 'G5':
			return 0x7e1818; // deep red
		case 'G4':
			return 0xc0392b;
		case 'G3':
			return 0xe67e22;
		case 'G2':
			return 0xf1c40f;
		case 'G1':
			return 0xf39c12;
		default:
			return kp >= 5 ? 0xf39c12 : 0x3498db; // active or low-Kp blue
	}
}

function peakOf(events: { kp_value: number; storm_class?: string }[]): {
	kp: number;
	storm_class: string;
} {
	let kp = 0;
	let storm_class = 'active';
	for (const e of events) {
		if (e.kp_value > kp) {
			kp = e.kp_value;
			storm_class = (e.storm_class as string | undefined) ?? 'active';
		}
	}
	return { kp, storm_class };
}

function mentionPrefix(mention: string | null): string {
	return mention ? `${mention} ` : '';
}

function defaultAllowedMentions(mention: string | null): DiscordPayload['allowed_mentions'] {
	return { parse: mention ? ['roles', 'users'] : [] };
}

/** Immediate alert for one high-severity event. */
export function buildImmediateEmbed(
	channelName: string,
	mention: string | null,
	event: KpEvent
): DiscordPayload {
	const embed: DiscordEmbed = {
		title: `🌩️ Kp ${event.kp_value.toFixed(2)} — ${event.storm_class}`,
		description: `Channel **${channelName}**: an event at or above your immediate-push threshold has been detected.`,
		url: SITE_URL,
		color: colorFor(event.storm_class, event.kp_value),
		timestamp: event.ts,
		fields: [
			{ name: 'Kp', value: event.kp_value.toFixed(2), inline: true },
			{ name: 'Storm class', value: event.storm_class, inline: true },
			{ name: 'Source', value: event.source, inline: true },
		],
		footer: { text: 'SWFT Notifications' },
	};
	if (event.bz_nt !== null) {
		embed.fields!.push({ name: 'Bz (nT)', value: event.bz_nt.toFixed(1), inline: true });
	}
	if (event.speed_kms !== null) {
		embed.fields!.push({ name: 'Wind speed (km/s)', value: event.speed_kms.toFixed(0), inline: true });
	}
	return {
		username: 'SWFT Notifications',
		content: mention ? mentionPrefix(mention).trim() : undefined,
		embeds: [embed],
		allowed_mentions: defaultAllowedMentions(mention),
	};
}

/** Periodic summary while in-schedule. `events` is everything since last summary. */
export function buildSummaryEmbed(
	channelName: string,
	mention: string | null,
	events: KpEvent[],
	windowMinutes: number
): DiscordPayload {
	const peak = peakOf(events);
	const lines = events
		.slice(-12) // cap visible rows to fit comfortably in one embed
		.map(
			e =>
				`• \`${e.ts.replace('T', ' ').slice(0, 16)}\`  Kp **${e.kp_value.toFixed(2)}**  ${e.storm_class}`
		);
	const more = events.length > 12 ? `\n…and ${events.length - 12} earlier event(s).` : '';

	const embed: DiscordEmbed = {
		title: `Kp activity — last ${windowMinutes} min (${events.length} event${events.length === 1 ? '' : 's'})`,
		description: lines.join('\n') + more,
		url: SITE_URL,
		color: colorFor(peak.storm_class, peak.kp),
		timestamp: new Date().toISOString(),
		fields: [
			{ name: 'Peak Kp', value: peak.kp.toFixed(2), inline: true },
			{ name: 'Peak class', value: peak.storm_class, inline: true },
		],
		footer: { text: `SWFT Notifications · channel ${channelName}` },
	};

	return {
		username: 'SWFT Notifications',
		content: mention ? mentionPrefix(mention).trim() : undefined,
		embeds: [embed],
		allowed_mentions: defaultAllowedMentions(mention),
	};
}

/** Buffered off-hours events flushed as a single digest. */
export function buildOffHoursDigestEmbed(
	channelName: string,
	mention: string | null,
	buffered: BufferedEvent[]
): DiscordPayload {
	const peak = peakOf(buffered);
	const lines = buffered
		.slice(-15)
		.map(
			e =>
				`• \`${e.ts.replace('T', ' ').slice(0, 16)}\`  Kp **${e.kp_value.toFixed(2)}**  ${e.storm_class}`
		);
	const more = buffered.length > 15 ? `\n…and ${buffered.length - 15} earlier event(s).` : '';

	const embed: DiscordEmbed = {
		title: `Off-hours summary — ${buffered.length} event${buffered.length === 1 ? '' : 's'}`,
		description: `These were received while your schedule was inactive.\n\n${lines.join('\n')}${more}`,
		url: SITE_URL,
		color: colorFor(peak.storm_class, peak.kp),
		timestamp: new Date().toISOString(),
		fields: [
			{ name: 'Peak Kp', value: peak.kp.toFixed(2), inline: true },
			{ name: 'Peak class', value: peak.storm_class, inline: true },
		],
		footer: { text: `SWFT Notifications · channel ${channelName}` },
	};

	return {
		username: 'SWFT Notifications',
		content: mention ? mentionPrefix(mention).trim() : undefined,
		embeds: [embed],
		allowed_mentions: defaultAllowedMentions(mention),
	};
}

/** System mode returned to 'normal'. peakKp/peakClass are optional decoration. */
export function buildStormEndEmbed(
	channelName: string,
	mention: string | null,
	peakKp: number | null,
	peakClass: string | null,
	durationHours: number | null
): DiscordPayload {
	const embed: DiscordEmbed = {
		title: '✅ Storm ended — back to normal monitoring',
		description: `SWFT has returned its monitoring mode to **normal**.`,
		url: SITE_URL,
		color: 0x2ecc71,
		timestamp: new Date().toISOString(),
		fields: [],
		footer: { text: `SWFT Notifications · channel ${channelName}` },
	};
	if (peakKp !== null) {
		embed.fields!.push({ name: 'Peak Kp', value: peakKp.toFixed(2), inline: true });
	}
	if (peakClass !== null) {
		embed.fields!.push({ name: 'Peak class', value: peakClass, inline: true });
	}
	if (durationHours !== null) {
		embed.fields!.push({ name: 'Duration', value: `${durationHours.toFixed(1)} h`, inline: true });
	}
	return {
		username: 'SWFT Notifications',
		content: mention ? mentionPrefix(mention).trim() : undefined,
		embeds: [embed],
		allowed_mentions: defaultAllowedMentions(mention),
	};
}

/** Build a short SMS string. Discord has 6000-char embeds; SMS has 160. */
export function buildImmediateSms(channelName: string, event: KpEvent): string {
	const ts = event.ts.replace('T', ' ').slice(11, 16);
	return `SWFT: Kp ${event.kp_value.toFixed(1)} ${event.storm_class} at ${ts}Z. (${channelName})`.slice(0, 160);
}
