// ingest-kp-estimated.ts v0.11.0 — Ingest estimated Kp with fallback chain, and
// append Kp>=4 buckets to the persistent kp_events log. Retention of the
// kp_estimated buffer expanded from 12h -> 24h so it doubles as the dashboard
// source (kp_obs was dropped in migration 0007).
//
// Bz/speed enrichment: fetches a 3-hour window of solarwind_summary once per
// run, then matches each appended bucket to the nearest-neighbour reading
// in-memory (within 30 min). Accurate per-bucket values even during first-run
// catch-up with many old buckets.
//
// Fallback chain:
// 1. NOAA planetary_k_index_1m (global planetary Kp, primary)
// 2. NOAA boulder_k_index_1m (single station fallback)
// 3. GFZ Potsdam Hp30 (independent, 30-min resolution)
// 4. Australian BoM K-index (independent continent/infrastructure)
// 5. NOAA forecast "estimated" entry (3-hour granularity, last resort)

import {
	fetchEstimatedKp,
	fetchBoulderKp,
	fetchForecastEstimatedKp,
	fetchGfzKp,
	fetchBomKp,
	type ParsedEstimatedKp,
} from '../lib/noaa-client';
import { upsertKpEstimated, appendKpEvents, updateCronState } from '../lib/db';

const STALE_THRESHOLD_MS = 30 * 60 * 1000;
const BUFFER_RETENTION_HOURS = 24;

type KpSource = 'noaa' | 'noaa_boulder' | 'noaa_forecast' | 'gfz' | 'bom';

interface FallbackResult {
	source: KpSource;
	label: string;
	buckets: ParsedEstimatedKp[];
}

/** Fresh = latest bucket <30 min old AND not an anomalous zero
 *  (latest=0.0 while a prior reading was >=1.0 is treated as a data glitch). */
function isFresh(buckets: ParsedEstimatedKp[]): boolean {
	if (buckets.length === 0) return false;
	const latest = buckets[buckets.length - 1];
	const age = Date.now() - new Date(latest.ts).getTime();
	if (age >= STALE_THRESHOLD_MS) return false;

	if (latest.kp_value === 0 && buckets.length >= 2) {
		const prior = buckets.slice(-4, -1);
		const maxPrior = Math.max(...prior.map(b => b.kp_value));
		if (maxPrior >= 1.0) {
			console.log(`[kp-fallback] Anomalous zero detected: latest=0.0 but prior max=${maxPrior.toFixed(1)} — treating as invalid`);
			return false;
		}
	}
	return true;
}

async function fetchWithFallback(bomApiKey?: string): Promise<FallbackResult> {
	try {
		const buckets = await fetchEstimatedKp();
		if (isFresh(buckets)) return { source: 'noaa', label: 'NOAA Estimated Kp', buckets };
		console.log('[kp-fallback] NOAA primary data is stale/invalid, trying Boulder...');
	} catch (err) {
		console.error('[kp-fallback] NOAA primary failed:', err);
	}

	try {
		const buckets = await fetchBoulderKp();
		if (isFresh(buckets)) return { source: 'noaa_boulder', label: 'NOAA Boulder K-index', buckets };
		console.log('[kp-fallback] Boulder K data is stale/invalid, trying GFZ...');
	} catch (err) {
		console.error('[kp-fallback] Boulder K failed:', err);
	}

	try {
		const buckets = await fetchGfzKp();
		if (buckets.length > 0) return { source: 'gfz', label: 'GFZ Potsdam Hp30', buckets };
		console.log('[kp-fallback] GFZ Potsdam has no data, trying BoM...');
	} catch (err) {
		console.error('[kp-fallback] GFZ Potsdam failed:', err);
	}

	if (bomApiKey) {
		try {
			const buckets = await fetchBomKp(bomApiKey);
			if (buckets.length > 0) return { source: 'bom', label: 'Australian BoM K-index', buckets };
			console.log('[kp-fallback] BoM has no recent data, trying NOAA forecast...');
		} catch (err) {
			console.error('[kp-fallback] Australian BoM failed:', err);
		}
	}

	try {
		const buckets = await fetchForecastEstimatedKp();
		if (buckets.length > 0) return { source: 'noaa_forecast', label: 'NOAA Kp Forecast', buckets };
	} catch (err) {
		console.error('[kp-fallback] NOAA forecast failed:', err);
	}

	return { source: 'noaa', label: 'All sources failed', buckets: [] };
}

async function getSourceOverride(db: D1Database): Promise<string> {
	try {
		const row = await db.prepare(
			"SELECT last_status FROM cron_state WHERE task_name = 'kp-source-override'"
		).first<{ last_status: string }>();
		return row?.last_status ?? 'auto';
	} catch {
		return 'auto';
	}
}

async function fetchSpecificSource(sourceId: string, bomApiKey?: string): Promise<FallbackResult | null> {
	const sourceMap: Record<string, { fn: () => Promise<ParsedEstimatedKp[]>; source: KpSource; label: string }> = {
		noaa_boulder: { fn: fetchBoulderKp, source: 'noaa_boulder', label: 'NOAA Boulder K-index (forced)' },
		noaa: { fn: fetchEstimatedKp, source: 'noaa', label: 'NOAA Estimated Kp (forced)' },
		noaa_forecast: { fn: fetchForecastEstimatedKp, source: 'noaa_forecast', label: 'NOAA Kp Forecast (forced)' },
		gfz: { fn: fetchGfzKp, source: 'gfz', label: 'GFZ Potsdam Hp30 (forced)' },
	};

	if (sourceId === 'bom' && bomApiKey) {
		try {
			const buckets = await fetchBomKp(bomApiKey);
			if (buckets.length > 0) return { source: 'bom', label: 'Australian BoM K-index (forced)', buckets };
		} catch (err) {
			console.error(`[kp-forced] BoM failed:`, err);
		}
		return null;
	}

	const entry = sourceMap[sourceId];
	if (!entry) return null;

	try {
		const buckets = await entry.fn();
		if (buckets.length > 0) return { source: entry.source, label: entry.label, buckets };
	} catch (err) {
		console.error(`[kp-forced] ${sourceId} failed:`, err);
	}
	return null;
}

interface SolarWindRow {
	ts: string;
	bz: number | null;
	speed: number | null;
}

/** Nearest-neighbour lookup within a tolerance window. `readings` must be
 *  sorted by ts ASC. Returns {bz:null, speed:null} if no reading is within
 *  tolerance of `targetIso`. */
function nearestSolarWind(readings: SolarWindRow[], targetIso: string, toleranceMs: number): { bz: number | null; speed: number | null } {
	if (readings.length === 0) return { bz: null, speed: null };
	const targetMs = new Date(targetIso).getTime();
	let best: SolarWindRow | null = null;
	let bestDist = Infinity;
	for (const r of readings) {
		const dist = Math.abs(new Date(r.ts).getTime() - targetMs);
		if (dist < bestDist) {
			bestDist = dist;
			best = r;
		} else if (dist > bestDist) {
			// Since readings are sorted, distance only grows after the minimum.
			break;
		}
	}
	if (!best || bestDist > toleranceMs) return { bz: null, speed: null };
	return { bz: best.bz, speed: best.speed };
}

/** Fetch a 3-hour window of solar wind readings for per-bucket enrichment.
 *  Returning [] on failure means kp_events rows just get null Bz/speed — the
 *  columns are nullable and advisory. */
async function fetchSolarWindWindow(db: D1Database): Promise<SolarWindRow[]> {
	try {
		const lowerBound = new Date(Date.now() - 3 * 3600_000).toISOString();
		const rs = await db.prepare(
			`SELECT ts, bz, speed FROM solarwind_summary
			 WHERE ts > ?
			 ORDER BY ts ASC`
		).bind(lowerBound).all<SolarWindRow>();
		return rs.results ?? [];
	} catch {
		return [];
	}
}

export async function ingestKpEstimated(db: D1Database, bomApiKey?: string): Promise<{ inserted: number; source: string; events_appended: number }> {
	try {
		const override = await getSourceOverride(db);
		let result: FallbackResult;

		if (override !== 'auto') {
			const forced = await fetchSpecificSource(override, bomApiKey);
			if (forced) {
				console.log(`[ingest-kp-estimated] Admin override active: ${override}`);
				result = forced;
			} else {
				console.warn(`[ingest-kp-estimated] Admin override '${override}' failed, falling back to auto`);
				result = await fetchWithFallback(bomApiKey);
			}
		} else {
			result = await fetchWithFallback(bomApiKey);
		}

		const { source, label, buckets } = result;

		const inserted = await upsertKpEstimated(db, buckets, source);

		// Append Kp>=4 buckets to the persistent event log, enriched per-bucket
		// with the nearest-neighbour solar wind reading (30-min tolerance).
		const swWindow = await fetchSolarWindWindow(db);
		const { inserted: eventsAppended } = await appendKpEvents(
			db,
			buckets.map(b => {
				const sw = nearestSolarWind(swWindow, b.ts, 30 * 60_000);
				return { ts: b.ts, kp_value: b.kp_value, bz_nt: sw.bz, speed_kms: sw.speed };
			}),
			source
		);

		// Buffer purge — 24h retention. Precomputed ISO bound keeps the ts index in play.
		const purgeBound = new Date(Date.now() - BUFFER_RETENTION_HOURS * 3600_000).toISOString();
		await db.prepare(
			"DELETE FROM kp_estimated WHERE ts < ?"
		).bind(purgeBound).run();

		const statusMsg = source === 'noaa' ? 'ok' : `ok_fallback:${source}`;
		await updateCronState(db, 'ingest-kp-estimated', statusMsg, inserted);
		console.log(`[ingest-kp-estimated] source=${label}, inserted=${inserted}, events_appended=${eventsAppended}`);
		return { inserted, source, events_appended: eventsAppended };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		await updateCronState(db, 'ingest-kp-estimated', 'error', 0, msg);
		throw err;
	}
}
