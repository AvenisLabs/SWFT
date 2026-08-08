// kindex-push.ts v0.1.0 - Shared K-index push snapshot + Discord embed builder.

import { describeTimeZone, formatUserTime, isValidTimeZone } from '../utils/timeFormat';

const NOAA_BASE = 'https://services.swpc.noaa.gov';
const GFZ_BASE = 'https://kp.gfz.de';
const SAMPLE_TOLERANCE_MS = 45 * 60_000;
const CURRENT_TOLERANCE_MS = 90 * 60_000;

export const KINDEX_PUSH_SOURCE_IDS = ['noaa_boulder', 'noaa_estimated', 'gfz'] as const;
export type KIndexPushSourceId = typeof KINDEX_PUSH_SOURCE_IDS[number];

interface DiscordEmbed {
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

export interface KIndexPoint {
	ts: string;
	value: number;
}

export interface KIndexSample {
	label: string;
	targetIso: string;
	observedIso: string | null;
	value: number | null;
}

export interface KIndexSourceSnapshot {
	id: KIndexPushSourceId;
	label: string;
	description: string;
	status: 'ok' | 'error';
	error: string | null;
	samples: KIndexSample[];
}

export interface KIndexPushSnapshot {
	generatedAt: string;
	lookbackHours: number;
	timeZone: string | null;
	timeZoneLabel: string;
	sources: KIndexSourceSnapshot[];
}

const SOURCE_LABELS: Record<KIndexPushSourceId, { label: string; description: string }> = {
	noaa_boulder: {
		label: 'NOAA Boulder K-index',
		description: 'Local K-index from the Boulder, Colorado magnetometer station.',
	},
	noaa_estimated: {
		label: 'NOAA Estimated Kp',
		description: 'Planetary estimated Kp from NOAA SWPC.',
	},
	gfz: {
		label: 'GFZ Potsdam Hp30',
		description: 'Independent half-hourly planetary Hp30 index from GFZ Potsdam.',
	},
};

function normalizeKIndex(value: unknown): number | null {
	const n = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
	if (!Number.isFinite(n) || n < 0) return null;
	return Math.round(n * 100) / 100;
}

async function fetchJson<T>(url: string, timeoutMs = 12_000): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) throw new Error(`${url} returned ${res.status}`);
		return await res.json() as T;
	} finally {
		clearTimeout(timeout);
	}
}

function floorTo15Min(date: Date): string {
	const d = new Date(date);
	d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 15) * 15, 0, 0);
	return d.toISOString().replace('.000Z', 'Z');
}

function aggregateTo15Min(rows: Array<{ ts: string; value: number }>): KIndexPoint[] {
	const buckets = new Map<string, number[]>();
	for (const row of rows) {
		const d = new Date(row.ts);
		if (Number.isNaN(d.getTime())) continue;
		const bucket = floorTo15Min(d);
		const values = buckets.get(bucket);
		if (values) values.push(row.value);
		else buckets.set(bucket, [row.value]);
	}

	return [...buckets.entries()]
		.map(([ts, values]) => ({
			ts,
			value: Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100,
		}))
		.sort((a, b) => a.ts.localeCompare(b.ts));
}

async function fetchNoaaBoulder(): Promise<KIndexPoint[]> {
	const raw = await fetchJson<Array<{ time_tag: string; k_index: number | string }>>(
		`${NOAA_BASE}/json/boulder_k_index_1m.json`
	);
	const rows = raw.flatMap(entry => {
		const value = normalizeKIndex(entry.k_index);
		return value === null ? [] : [{ ts: entry.time_tag, value }];
	});
	return aggregateTo15Min(rows);
}

async function fetchNoaaEstimated(): Promise<KIndexPoint[]> {
	const raw = await fetchJson<Array<{ time_tag: string; estimated_kp: number | string }>>(
		`${NOAA_BASE}/json/planetary_k_index_1m.json`
	);
	const rows = raw.flatMap(entry => {
		const value = normalizeKIndex(entry.estimated_kp);
		return value === null ? [] : [{ ts: entry.time_tag, value }];
	});
	return aggregateTo15Min(rows);
}

function toGfzTimestamp(d: Date): string {
	return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function fetchGfz(now: Date, lookbackHours: number): Promise<KIndexPoint[]> {
	const start = new Date(now.getTime() - (lookbackHours + 2) * 3600_000);
	const url = `${GFZ_BASE}/app/json/?start=${toGfzTimestamp(start)}&end=${toGfzTimestamp(now)}&index=Hp30`;
	const data = await fetchJson<{ datetime: string[]; Hp30: number[] }>(url);

	const points: KIndexPoint[] = [];
	for (let i = 0; i < data.datetime.length; i++) {
		const value = normalizeKIndex(data.Hp30[i]);
		const ts = new Date(data.datetime[i]);
		if (value === null || Number.isNaN(ts.getTime())) continue;
		points.push({ ts: ts.toISOString().replace('.000Z', 'Z'), value });
	}
	return points.sort((a, b) => a.ts.localeCompare(b.ts));
}

function buildSlots(now: Date, lookbackHours: number): Array<{ label: string; target: Date; toleranceMs: number }> {
	const slots = [{ label: 'Current', target: now, toleranceMs: CURRENT_TOLERANCE_MS }];
	const hourAnchor = new Date(now);
	hourAnchor.setUTCMinutes(0, 0, 0);
	for (let h = 1; h <= lookbackHours; h++) {
		slots.push({
			label: `${h}h ago`,
			target: new Date(hourAnchor.getTime() - h * 3600_000),
			toleranceMs: SAMPLE_TOLERANCE_MS,
		});
	}
	return slots;
}

function sampleNearest(points: KIndexPoint[], target: Date, toleranceMs: number): KIndexPoint | null {
	let best: { point: KIndexPoint; diff: number } | null = null;
	const targetMs = target.getTime();
	for (const point of points) {
		const diff = Math.abs(new Date(point.ts).getTime() - targetMs);
		if (diff > toleranceMs) continue;
		if (!best || diff < best.diff) best = { point, diff };
	}
	return best?.point ?? null;
}

function buildSamples(points: KIndexPoint[], now: Date, lookbackHours: number): KIndexSample[] {
	return buildSlots(now, lookbackHours).map(slot => {
		const sample = sampleNearest(points, slot.target, slot.toleranceMs);
		return {
			label: slot.label,
			targetIso: slot.target.toISOString(),
			observedIso: sample?.ts ?? null,
			value: sample?.value ?? null,
		};
	});
}

async function buildSource(
	id: KIndexPushSourceId,
	pointsPromise: Promise<KIndexPoint[]>,
	now: Date,
	lookbackHours: number
): Promise<KIndexSourceSnapshot> {
	const meta = SOURCE_LABELS[id];
	try {
		const points = await pointsPromise;
		return {
			id,
			label: meta.label,
			description: meta.description,
			status: 'ok',
			error: null,
			samples: buildSamples(points, now, lookbackHours),
		};
	} catch (err) {
		return {
			id,
			label: meta.label,
			description: meta.description,
			status: 'error',
			error: err instanceof Error ? err.message : 'Fetch failed',
			samples: buildSamples([], now, lookbackHours),
		};
	}
}

export async function fetchKIndexPushSnapshot(
	lookbackHours: number,
	timeZone: string | null | undefined,
	now: Date = new Date()
): Promise<KIndexPushSnapshot> {
	const clampedLookback = Math.max(1, Math.min(12, Math.trunc(lookbackHours)));
	const normalizedTimeZone = isValidTimeZone(timeZone) ? timeZone : null;
	const sources = await Promise.all([
		buildSource('noaa_boulder', fetchNoaaBoulder(), now, clampedLookback),
		buildSource('noaa_estimated', fetchNoaaEstimated(), now, clampedLookback),
		buildSource('gfz', fetchGfz(now, clampedLookback), now, clampedLookback),
	]);

	return {
		generatedAt: now.toISOString(),
		lookbackHours: clampedLookback,
		timeZone: normalizedTimeZone,
		timeZoneLabel: describeTimeZone(normalizedTimeZone, now.toISOString()),
		sources,
	};
}

function mentionPrefix(mention: string | null): string {
	return mention ? `${mention} ` : '';
}

function allowedMentions(mention: string | null): DiscordPayload['allowed_mentions'] {
	return { parse: mention ? ['roles', 'users'] : [] };
}

function valueText(sample: KIndexSample): string {
	return sample.value === null ? '--' : sample.value.toFixed(2);
}

function sampleLine(sample: KIndexSample, timeZone: string | null): string {
	const observed = sample.observedIso ?? sample.targetIso;
	return `${sample.label} - ${formatUserTime(observed, timeZone)}: **${valueText(sample)}**`;
}

export function buildKIndexPushPayload(
	channelName: string,
	mention: string | null,
	snapshot: KIndexPushSnapshot,
	title = 'One-Time K-index Push'
): DiscordPayload {
	const fields = snapshot.sources.map(source => ({
		name: source.label,
		value: source.status === 'error'
			? `${source.description}\nStatus: source unavailable (${source.error ?? 'unknown error'})`
			: `${source.description}\n${source.samples.map(s => sampleLine(s, snapshot.timeZone)).join('\n')}`,
		inline: false,
	}));

	return {
		username: 'SWFT Notifications',
		content: mention ? mentionPrefix(mention).trim() : undefined,
		embeds: [
			{
				title,
				description:
					`Channel **${channelName}**: current and previous ${snapshot.lookbackHours} hour(s) ` +
					'at 1-hour intervals. ' +
					`Times shown in **${snapshot.timeZoneLabel}**.`,
				url: 'https://swft.skypixels.org/data-sources',
				color: 0x60a5fa,
				timestamp: snapshot.generatedAt,
				fields,
				footer: { text: 'SWFT K-index sources: NOAA Boulder, NOAA Estimated, GFZ Potsdam Hp30' },
			},
		],
		allowed_mentions: allowedMentions(mention),
	};
}

export function summarizeKIndexPush(snapshot: KIndexPushSnapshot): string {
	return `K-index push: ${snapshot.sources.length} source(s), current + ${snapshot.lookbackHours}h, timezone ${snapshot.timeZoneLabel}`;
}
