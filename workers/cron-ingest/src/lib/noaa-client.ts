// noaa-client.ts v0.3.0 — NOAA fetch + parse helpers for cron ingestion

const NOAA_BASE = 'https://services.swpc.noaa.gov';

/** Fetch JSON from a NOAA endpoint with timeout and error handling */
async function fetchNoaa<T>(path: string): Promise<T> {
	const url = `${NOAA_BASE}${path}`;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15_000);

	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) {
			throw new Error(`NOAA ${path} returned ${res.status}`);
		}
		return await res.json() as T;
	} finally {
		clearTimeout(timeout);
	}
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
