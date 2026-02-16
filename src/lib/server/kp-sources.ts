// kp-sources.ts v0.3.0 — Live Kp data from all 5 fallback sources for the data-sources page

import type { KpEstimatedPoint, KpSourceData, KpSourcesResult } from '$types/api';

const NOAA_BASE = 'https://services.swpc.noaa.gov';
const GFZ_BASE = 'https://kp.gfz.de';

// ── Source metadata ─────────────────────────────────────────────────
export const SOURCE_METADATA: Omit<KpSourceData, 'status' | 'error' | 'latestKp' | 'latestTime' | 'points' | 'pointCount'>[] = [
	{
		id: 'noaa_boulder',
		name: 'NOAA Boulder K-index',
		agency: 'NOAA Space Weather Prediction Center',
		country: 'United States',
		description:
			'Primary source. Local K-index measured at the Boulder, Colorado magnetometer station. ' +
			'A single-station index rather than the planetary average, so values may differ slightly. ' +
			'Promoted to primary due to superior reliability — the NOAA planetary feed occasionally ' +
			'reports anomalous 0.0 values during active conditions.',
		resolution: '15-min (from 1-min samples)',
		dataType: 'Local K-index (Boulder, CO)',
		url: 'https://www.swpc.noaa.gov/products/boulder-k-index',
	},
	{
		id: 'noaa_estimated',
		name: 'NOAA Estimated Kp',
		agency: 'NOAA Space Weather Prediction Center',
		country: 'United States',
		description:
			'First fallback. Planetary Kp derived from a network of ground-based magnetometers worldwide. ' +
			'Published as 1-minute estimates and downsampled to 15-minute averages. This is the same feed ' +
			'used by NOAA\'s official space weather dashboards. Demoted from primary due to recurring ' +
			'data anomalies where the feed reports 0.0 during active geomagnetic conditions.',
		resolution: '15-min (from 1-min samples)',
		dataType: 'Planetary Kp (estimated)',
		url: 'https://www.swpc.noaa.gov/products/planetary-k-index',
	},
	{
		id: 'noaa_forecast',
		name: 'NOAA Kp Forecast',
		agency: 'NOAA Space Weather Prediction Center',
		country: 'United States',
		description:
			'Second fallback. The NOAA Kp forecast feed includes "estimated" entries for the current ' +
			'3-hour window alongside future predictions. Lower temporal resolution (3-hour blocks) but ' +
			'available even when real-time feeds are down.',
		resolution: '3-hour',
		dataType: 'Planetary Kp (forecast/estimated)',
		url: 'https://www.swpc.noaa.gov/products/3-day-forecast',
	},
	{
		id: 'gfz',
		name: 'GFZ Potsdam Hp30',
		agency: 'GFZ German Research Centre for Geosciences',
		country: 'Germany',
		description:
			'Independent fallback. The Kp index was invented at GFZ Potsdam in 1932 by Julius Bartels. ' +
			'Uses the Hp30 index — a half-hourly planetary index (30-min resolution) derived from 13 ' +
			'geomagnetic observatories. Same scale as Kp but NOT capped at 9 during extreme storms. ' +
			'Completely independent infrastructure from NOAA. ~30-50 min data latency.',
		resolution: '30-min (Hp30)',
		dataType: 'Planetary Hp30 (half-hourly)',
		url: 'https://kp.gfz-potsdam.de/',
	},
	{
		id: 'bom',
		name: 'Australian BoM K-index',
		agency: 'Australian Bureau of Meteorology',
		country: 'Australia',
		description:
			'Last-resort fallback. Regional K-index (Kaus) from ~10 Australian magnetometer stations ' +
			'(Darwin, Canberra, Hobart, etc.). Reflects Southern Hemisphere mid-latitude conditions. ' +
			'Completely independent continent, infrastructure, and magnetometer network from NOAA and GFZ.',
		resolution: '3-hour',
		dataType: 'Regional K-index (Australian)',
		url: 'https://www.sws.bom.gov.au/Geophysical/1/3/1',
	},
];

// ── Generic JSON fetcher ────────────────────────────────────────────
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

// ── 15-minute bucket helper ─────────────────────────────────────────
function floorTo15Min(date: Date): string {
	const d = new Date(date);
	d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 15) * 15, 0, 0);
	return d.toISOString().replace('.000Z', 'Z');
}

// ── Individual source fetchers ──────────────────────────────────────

/** NOAA estimated Kp (1-min → 15-min average) */
interface NoaaEstimatedKp1m {
	time_tag: string;
	estimated_kp: number;
	kp: number;
}

async function fetchNoaaEstimated(): Promise<KpEstimatedPoint[]> {
	const raw = await fetchJson<NoaaEstimatedKp1m[]>(`${NOAA_BASE}/json/planetary_k_index_1m.json`);
	const buckets = new Map<string, number[]>();

	for (const entry of raw) {
		const ts = new Date(entry.time_tag);
		if (isNaN(ts.getTime())) continue;
		const kp = typeof entry.estimated_kp === 'string' ? parseFloat(entry.estimated_kp) : entry.estimated_kp;
		if (isNaN(kp)) continue;

		const bucket = floorTo15Min(ts);
		const arr = buckets.get(bucket);
		if (arr) arr.push(kp);
		else buckets.set(bucket, [kp]);
	}

	const results: KpEstimatedPoint[] = [];
	for (const [ts, values] of buckets) {
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		results.push({ ts, kp: Math.round(avg * 100) / 100, sample_count: values.length });
	}
	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

/** Boulder K-index (1-min → 15-min average) */
interface NoaaBoulderK1m {
	time_tag: string;
	k_index: number;
}

async function fetchBoulder(): Promise<KpEstimatedPoint[]> {
	const raw = await fetchJson<NoaaBoulderK1m[]>(`${NOAA_BASE}/json/boulder_k_index_1m.json`);
	const buckets = new Map<string, number[]>();

	for (const entry of raw) {
		const ts = new Date(entry.time_tag);
		if (isNaN(ts.getTime())) continue;
		const kp = typeof entry.k_index === 'string' ? parseFloat(entry.k_index) : entry.k_index;
		if (isNaN(kp) || kp < 0) continue;

		const bucket = floorTo15Min(ts);
		const arr = buckets.get(bucket);
		if (arr) arr.push(kp);
		else buckets.set(bucket, [kp]);
	}

	const results: KpEstimatedPoint[] = [];
	for (const [ts, values] of buckets) {
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		results.push({ ts, kp: Math.round(avg * 100) / 100, sample_count: values.length });
	}
	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

/** NOAA forecast "estimated" entries for current 3-hour window */
async function fetchForecast(): Promise<KpEstimatedPoint[]> {
	const raw = await fetchJson<string[][]>(`${NOAA_BASE}/products/noaa-planetary-k-index-forecast.json`);
	const results: KpEstimatedPoint[] = [];

	for (const row of raw.slice(1)) {
		if (row[2] !== 'estimated') continue;
		const kp = parseFloat(row[1]);
		if (isNaN(kp)) continue;
		const ts = new Date(row[0] + 'Z');
		if (isNaN(ts.getTime())) continue;
		results.push({ ts: ts.toISOString().replace('.000Z', 'Z'), kp, sample_count: 1 });
	}
	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

/** Strip milliseconds from ISO string — GFZ API returns 500 on millisecond precision */
function toGfzTimestamp(d: Date): string {
	return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** GFZ Potsdam Hp30 (independent 30-min data, last 6 hours) */
interface GfzHp30Response {
	datetime: string[];
	Hp30: number[];
}

async function fetchGfz(): Promise<KpEstimatedPoint[]> {
	const end = new Date();
	const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
	const url = `${GFZ_BASE}/app/json/?start=${toGfzTimestamp(start)}&end=${toGfzTimestamp(end)}&index=Hp30`;
	const data = await fetchJson<GfzHp30Response>(url);

	const results: KpEstimatedPoint[] = [];
	for (let i = 0; i < data.datetime.length; i++) {
		const kp = data.Hp30[i];
		const ts = new Date(data.datetime[i]);
		if (isNaN(kp) || isNaN(ts.getTime())) continue;
		results.push({ ts: ts.toISOString().replace('.000Z', 'Z'), kp: Math.round(kp * 100) / 100, sample_count: 1 });
	}
	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

/** Australian BoM K-index (regional, 3-hour resolution, requires API key) */
async function fetchBom(apiKey?: string): Promise<KpEstimatedPoint[]> {
	if (!apiKey) return []; // no API key configured — skip silently
	const end = new Date();
	const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
	const fmt = (d: Date) => d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

	const res = await fetch('https://sws-data.sws.bom.gov.au/api/v1/get-k-index', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=UTF-8' },
		body: JSON.stringify({
			api_key: apiKey,
			options: { location: 'Australian region', start: fmt(start), end: fmt(end) },
		}),
	});
	if (!res.ok) throw new Error(`BoM API returned ${res.status}`);
	const body = await res.json() as { data: unknown };

	// Handle potential [[{...}]] nesting
	let entries = body.data as Array<{ index: number; valid_time: string }>;
	if (entries.length > 0 && Array.isArray(entries[0])) {
		entries = (entries as unknown as Array<Array<{ index: number; valid_time: string }>>).flat();
	}

	const results: KpEstimatedPoint[] = [];
	for (const entry of entries) {
		const kp = typeof entry.index === 'string' ? parseInt(entry.index, 10) : entry.index;
		if (isNaN(kp)) continue;
		const ts = new Date(entry.valid_time + 'Z');
		if (isNaN(ts.getTime())) continue;
		results.push({ ts: ts.toISOString().replace('.000Z', 'Z'), kp, sample_count: 1 });
	}
	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

// ── Staleness check: data older than 2 hours is considered stale ────
const STALE_MS = 2 * 60 * 60 * 1000;

function determineStatus(points: KpEstimatedPoint[]): 'ok' | 'stale' {
	if (points.length === 0) return 'stale';
	const latest = new Date(points[points.length - 1].ts).getTime();
	return (Date.now() - latest > STALE_MS) ? 'stale' : 'ok';
}

// ── Main aggregator ─────────────────────────────────────────────────

/** Fetch all 5 sources in parallel via Promise.allSettled, return unified result */
export async function fetchAllKpSources(activeSourceId?: string, bomApiKey?: string): Promise<KpSourcesResult> {
	const fetchers = [fetchBoulder, fetchNoaaEstimated, fetchForecast, fetchGfz, () => fetchBom(bomApiKey)];

	const settled = await Promise.allSettled(fetchers.map(fn => fn()));

	const sources: KpSourceData[] = SOURCE_METADATA.map((meta, i) => {
		const result = settled[i];

		if (result.status === 'rejected') {
			return {
				...meta,
				status: 'error' as const,
				error: result.reason?.message ?? 'Fetch failed',
				latestKp: null,
				latestTime: null,
				points: [],
				pointCount: 0,
			};
		}

		const points = result.value;
		const status = determineStatus(points);
		const latest = points.length > 0 ? points[points.length - 1] : null;

		return {
			...meta,
			status,
			latestKp: latest?.kp ?? null,
			latestTime: latest?.ts ?? null,
			points,
			pointCount: points.length,
		};
	});

	return {
		sources,
		activeSourceId: activeSourceId ?? 'noaa_boulder',
		fetchedAt: new Date().toISOString(),
	};
}
