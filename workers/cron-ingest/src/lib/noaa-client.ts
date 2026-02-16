// noaa-client.ts v0.6.0 — NOAA + GFZ + BoM fetch helpers with fallback sources for cron ingestion

const NOAA_BASE = 'https://services.swpc.noaa.gov';
const GFZ_BASE = 'https://kp.gfz.de';

/** Fetch JSON from a URL with timeout and error handling */
async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) {
			throw new Error(`${url} returned ${res.status}`);
		}
		return await res.json() as T;
	} finally {
		clearTimeout(timeout);
	}
}

/** Fetch JSON from a NOAA endpoint */
async function fetchNoaa<T>(path: string): Promise<T> {
	return fetchJson<T>(`${NOAA_BASE}${path}`);
}

// -- Kp Index --

export interface ParsedKpObs {
	ts: string;
	kp_value: number;
}

/** Fetch and parse Kp observations — skips header row */
export async function fetchKpIndex(): Promise<ParsedKpObs[]> {
	const raw = await fetchNoaa<string[][]>('/products/noaa-planetary-k-index.json');

	// First row is headers: ["time_tag","Kp","a_running","station_count"]
	return raw.slice(1).map(row => ({
		ts: row[0],
		kp_value: parseFloat(row[1]) || 0,
	})).filter(r => !isNaN(new Date(r.ts).getTime()));
}

// -- Kp Forecast --

export interface ParsedKpForecast {
	forecast_time: string;
	kp_value: number;
	observed: string;
	noaa_scale: string;
}

export async function fetchKpForecast(): Promise<ParsedKpForecast[]> {
	const raw = await fetchNoaa<string[][]>('/products/noaa-planetary-k-index-forecast.json');

	return raw.slice(1).map(row => ({
		forecast_time: row[0],
		kp_value: parseFloat(row[1]) || 0,
		observed: row[2],
		noaa_scale: row[3],
	})).filter(r => !isNaN(new Date(r.forecast_time).getTime()));
}

// -- Solar Wind Plasma --

export interface ParsedPlasma {
	ts: string;
	density: number | null;
	speed: number | null;
	temperature: number | null;
}

export async function fetchPlasma(): Promise<ParsedPlasma[]> {
	const raw = await fetchNoaa<string[][]>('/products/solar-wind/plasma-7-day.json');

	return raw.slice(1).map(row => ({
		ts: row[0],
		density: row[1] ? parseFloat(row[1]) : null,
		speed: row[2] ? parseFloat(row[2]) : null,
		temperature: row[3] ? parseFloat(row[3]) : null,
	})).filter(r => !isNaN(new Date(r.ts).getTime()));
}

// -- Solar Wind Mag --

export interface ParsedMag {
	ts: string;
	bz: number | null;
	bt: number | null;
}

export async function fetchMag(): Promise<ParsedMag[]> {
	const raw = await fetchNoaa<string[][]>('/products/solar-wind/mag-7-day.json');

	return raw.slice(1).map(row => ({
		ts: row[0],
		bz: row[3] ? parseFloat(row[3]) : null, // bz_gsm is index 3
		bt: row[6] ? parseFloat(row[6]) : null,  // bt is index 6
	})).filter(r => !isNaN(new Date(r.ts).getTime()));
}

// -- Alerts --

export interface ParsedAlert {
	product_id: string;
	issue_time: string;
	message: string;
}

export async function fetchAlerts(): Promise<ParsedAlert[]> {
	const raw = await fetchNoaa<Array<{ product_id: string; issue_datetime: string; message: string }>>(
		'/products/alerts.json'
	);

	return raw.map(a => ({
		product_id: a.product_id,
		issue_time: a.issue_datetime,
		message: a.message,
	}));
}

// -- Estimated Kp (1-minute) --

/** Raw shape from /json/planetary_k_index_1m.json */
interface NoaaEstimatedKp1m {
	time_tag: string;
	estimated_kp: number;
	kp: number;
}

/** 15-minute downsampled estimated Kp bucket */
export interface ParsedEstimatedKp {
	ts: string;       // ISO 8601 bucket start (UTC)
	kp_value: number; // averaged estimated_kp
	sample_count: number;
}

/** Floor a Date to its 15-minute bucket start */
function floorTo15Min(date: Date): string {
	const d = new Date(date);
	d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 15) * 15, 0, 0);
	return d.toISOString().replace('.000Z', 'Z');
}

/** Fetch 1-minute estimated Kp and downsample to 15-min averages */
export async function fetchEstimatedKp(): Promise<ParsedEstimatedKp[]> {
	const raw = await fetchNoaa<NoaaEstimatedKp1m[]>('/json/planetary_k_index_1m.json');

	// Group by 15-min bucket
	const buckets = new Map<string, number[]>();

	for (const entry of raw) {
		const ts = new Date(entry.time_tag);
		if (isNaN(ts.getTime())) continue;

		const kp = typeof entry.estimated_kp === 'string'
			? parseFloat(entry.estimated_kp)
			: entry.estimated_kp;
		if (isNaN(kp)) continue;

		const bucket = floorTo15Min(ts);
		const arr = buckets.get(bucket);
		if (arr) arr.push(kp);
		else buckets.set(bucket, [kp]);
	}

	// Average each bucket
	const results: ParsedEstimatedKp[] = [];
	for (const [ts, values] of buckets) {
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		results.push({
			ts,
			kp_value: Math.round(avg * 100) / 100,
			sample_count: values.length,
		});
	}

	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

// -- Fallback: Boulder K-index (single-station, 1-minute) --

/** Raw shape from /json/boulder_k_index_1m.json */
interface NoaaBoulderK1m {
	time_tag: string;
	k_index: number; // float, sometimes in scientific notation
}

/** Fetch Boulder K-index 1-min data and downsample to 15-min averages.
 *  Boulder K is a local index (not planetary) but serves as a reasonable proxy. */
export async function fetchBoulderKp(): Promise<ParsedEstimatedKp[]> {
	const raw = await fetchNoaa<NoaaBoulderK1m[]>('/json/boulder_k_index_1m.json');

	const buckets = new Map<string, number[]>();

	for (const entry of raw) {
		const ts = new Date(entry.time_tag);
		if (isNaN(ts.getTime())) continue;

		const kp = typeof entry.k_index === 'string'
			? parseFloat(entry.k_index)
			: entry.k_index;
		if (isNaN(kp) || kp < 0) continue;

		const bucket = floorTo15Min(ts);
		const arr = buckets.get(bucket);
		if (arr) arr.push(kp);
		else buckets.set(bucket, [kp]);
	}

	const results: ParsedEstimatedKp[] = [];
	for (const [ts, values] of buckets) {
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		results.push({
			ts,
			kp_value: Math.round(avg * 100) / 100,
			sample_count: values.length,
		});
	}

	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

// -- Fallback: NOAA forecast "estimated" current 3-hour window --

/** Extract the "estimated" entry from the Kp forecast feed for the current 3-hour window.
 *  Returns at most a few 3-hour buckets as 15-min-compatible entries. */
export async function fetchForecastEstimatedKp(): Promise<ParsedEstimatedKp[]> {
	const raw = await fetchNoaa<string[][]>('/products/noaa-planetary-k-index-forecast.json');

	const results: ParsedEstimatedKp[] = [];
	// Skip header row
	for (const row of raw.slice(1)) {
		if (row[2] !== 'estimated') continue;
		const ts = row[0]; // e.g. "2026-02-16 18:00:00"
		const kp = parseFloat(row[1]);
		if (isNaN(kp)) continue;
		if (isNaN(new Date(ts).getTime())) continue;

		// Convert to ISO 8601 format for consistency
		const isoTs = new Date(ts + 'Z').toISOString().replace('.000Z', 'Z');
		results.push({ ts: isoTs, kp_value: kp, sample_count: 1 });
	}

	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

// -- Fallback: GFZ Potsdam Hp30 (independent, 30-min resolution) --

/** Hp30 response uses dynamic key name matching the index parameter */
interface GfzHp30Response {
	meta: { source: string };
	datetime: string[];
	Hp30: number[];
}

/** Strip milliseconds from ISO string — GFZ API returns 500 on millisecond precision */
function toGfzTimestamp(d: Date): string {
	return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Fetch recent Hp30 from GFZ Potsdam (independent 30-min data).
 *  Hp30 is a half-hourly planetary index — 6x more granular than Kp's 3-hour intervals.
 *  Values are on the same scale as Kp but NOT capped at 9 (open-ended during extreme storms).
 *  Queries the last 6 hours of data. */
export async function fetchGfzKp(): Promise<ParsedEstimatedKp[]> {
	const end = new Date();
	const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);

	const url = `${GFZ_BASE}/app/json/?start=${toGfzTimestamp(start)}&end=${toGfzTimestamp(end)}&index=Hp30`;
	const data = await fetchJson<GfzHp30Response>(url);

	const results: ParsedEstimatedKp[] = [];
	for (let i = 0; i < data.datetime.length; i++) {
		const ts = data.datetime[i];
		const kp = data.Hp30[i];
		if (isNaN(kp) || isNaN(new Date(ts).getTime())) continue;

		const isoTs = new Date(ts).toISOString().replace('.000Z', 'Z');
		results.push({ ts: isoTs, kp_value: Math.round(kp * 100) / 100, sample_count: 1 });
	}

	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

// -- Fallback: Australian BoM K-index (independent, Southern Hemisphere) --

/** BoM Space Weather API response for get-k-index */
interface BomKIndexResponse {
	data: Array<{ index: number; valid_time: string; analysis_time: string }> | Array<Array<{ index: number; valid_time: string; analysis_time: string }>>;
}

/** Fetch recent K-index from Australian Bureau of Meteorology.
 *  Requires BOM_API_KEY env var. Queries last 24 hours of Australian regional K-index.
 *  Returns 3-hour resolution data (integer 0-9). */
export async function fetchBomKp(apiKey: string): Promise<ParsedEstimatedKp[]> {
	const end = new Date();
	const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

	// BoM uses space-separated datetime format: "YYYY-MM-DD HH:MM:SS" (UTC)
	const fmt = (d: Date) => d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

	const res = await fetch('https://sws-data.sws.bom.gov.au/api/v1/get-k-index', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=UTF-8' },
		body: JSON.stringify({
			api_key: apiKey,
			options: {
				location: 'Australian region',
				start: fmt(start),
				end: fmt(end),
			},
		}),
	});

	if (!res.ok) throw new Error(`BoM API returned ${res.status}`);
	const body = await res.json() as BomKIndexResponse;

	// Handle potential [[{...}]] nesting
	let entries = body.data;
	if (entries.length > 0 && Array.isArray(entries[0])) {
		entries = (entries as Array<Array<{ index: number; valid_time: string; analysis_time: string }>>).flat();
	}

	const results: ParsedEstimatedKp[] = [];
	for (const entry of entries as Array<{ index: number; valid_time: string; analysis_time: string }>) {
		const kp = typeof entry.index === 'string' ? parseInt(entry.index, 10) : entry.index;
		if (isNaN(kp)) continue;
		// BoM timestamps are "YYYY-MM-DD HH:MM:SS" UTC — convert to ISO 8601
		const ts = new Date(entry.valid_time + 'Z');
		if (isNaN(ts.getTime())) continue;
		results.push({ ts: ts.toISOString().replace('.000Z', 'Z'), kp_value: kp, sample_count: 1 });
	}

	return results.sort((a, b) => a.ts.localeCompare(b.ts));
}

// -- NOAA Scales --

export interface ParsedScales {
	r: number; // R-scale current value (0–5)
	s: number; // S-scale current value
	g: number; // G-scale current value
}

export async function fetchNoaaScales(): Promise<ParsedScales> {
	const raw = await fetchNoaa<Record<string, { R: { Scale: string }; S: { Scale: string }; G: { Scale: string } }>>(
		'/products/noaa-scales.json'
	);

	// Key "0" is the current period
	const current = raw['0'];
	if (!current) return { r: 0, s: 0, g: 0 };

	return {
		r: parseInt(current.R?.Scale ?? '0', 10) || 0,
		s: parseInt(current.S?.Scale ?? '0', 10) || 0,
		g: parseInt(current.G?.Scale ?? '0', 10) || 0,
	};
}
