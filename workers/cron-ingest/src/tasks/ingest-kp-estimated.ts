// ingest-kp-estimated.ts v0.7.0 — Ingest estimated Kp with fallback chain:
// 1. NOAA planetary_k_index_1m (global planetary Kp, primary source)
// 2. NOAA boulder_k_index_1m (single station fallback)
// 3. NOAA forecast "estimated" entry (3-hour granularity)
// 4. GFZ Potsdam Hp30 (independent, 30-min resolution)
// 5. Australian BoM K-index (independent continent/infrastructure)

import {
	fetchEstimatedKp,
	fetchBoulderKp,
	fetchForecastEstimatedKp,
	fetchGfzKp,
	fetchBomKp,
	type ParsedEstimatedKp,
} from '../lib/noaa-client';
import { upsertKpEstimated, updateCronState } from '../lib/db';

/** Staleness threshold: data older than 30 minutes is considered stale */
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

/** Source labels for logging and D1 tracking */
type KpSource = 'noaa' | 'noaa_boulder' | 'noaa_forecast' | 'gfz' | 'bom';

interface FallbackResult {
	source: KpSource;
	label: string;
	buckets: ParsedEstimatedKp[];
}

/** Check if the latest bucket timestamp is fresh enough and contains plausible data.
 *  Rejects sources where the latest value is 0.0 but a prior bucket was >=1.0 —
 *  a sudden drop to exactly 0.0 from an elevated reading indicates a data glitch,
 *  not a legitimate geomagnetic quiet period. */
function isFresh(buckets: ParsedEstimatedKp[]): boolean {
	if (buckets.length === 0) return false;
	const latest = buckets[buckets.length - 1]; // sorted ASC
	const age = Date.now() - new Date(latest.ts).getTime();
	if (age >= STALE_THRESHOLD_MS) return false;

	// Detect anomalous zero: latest bucket is 0.0 but a recent prior bucket was elevated
	if (latest.kp_value === 0 && buckets.length >= 2) {
		// Check the 3 buckets before the latest (up to 45 min of prior data)
		const prior = buckets.slice(-4, -1);
		const maxPrior = Math.max(...prior.map(b => b.kp_value));
		if (maxPrior >= 1.0) {
			console.log(`[kp-fallback] Anomalous zero detected: latest=0.0 but prior max=${maxPrior.toFixed(1)} — treating as invalid`);
			return false;
		}
	}
	return true;
}

/** Try each source in order, return the first with fresh data */
async function fetchWithFallback(bomApiKey?: string): Promise<FallbackResult> {
	// 1. Primary: NOAA planetary estimated Kp (global, 1-min → 15-min)
	try {
		const buckets = await fetchEstimatedKp();
		if (isFresh(buckets)) {
			return { source: 'noaa', label: 'NOAA Estimated Kp', buckets };
		}
		console.log('[kp-fallback] NOAA primary data is stale/invalid, trying Boulder...');
	} catch (err) {
		console.error('[kp-fallback] NOAA primary failed:', err);
	}

	// 2. Fallback: Boulder K-index (single-station, 1-min → 15-min)
	try {
		const buckets = await fetchBoulderKp();
		if (isFresh(buckets)) {
			return { source: 'noaa_boulder', label: 'NOAA Boulder K-index', buckets };
		}
		console.log('[kp-fallback] Boulder K data is stale/invalid, trying forecast...');
	} catch (err) {
		console.error('[kp-fallback] Boulder K failed:', err);
	}

	// 3. Fallback: NOAA forecast "estimated" (3-hour granularity)
	try {
		const buckets = await fetchForecastEstimatedKp();
		if (buckets.length > 0) {
			return { source: 'noaa_forecast', label: 'NOAA Kp Forecast', buckets };
		}
		console.log('[kp-fallback] NOAA forecast has no estimated entries, trying GFZ...');
	} catch (err) {
		console.error('[kp-fallback] NOAA forecast failed:', err);
	}

	// 4. Fallback: GFZ Potsdam Hp30 (independent, 30-min)
	try {
		const buckets = await fetchGfzKp();
		if (buckets.length > 0) {
			return { source: 'gfz', label: 'GFZ Potsdam Hp30', buckets };
		}
	} catch (err) {
		console.error('[kp-fallback] GFZ Potsdam failed:', err);
	}

	// 5. Fallback: Australian BoM K-index (independent continent)
	if (bomApiKey) {
		try {
			const buckets = await fetchBomKp(bomApiKey);
			if (buckets.length > 0) {
				return { source: 'bom', label: 'Australian BoM K-index', buckets };
			}
			console.log('[kp-fallback] BoM has no recent data');
		} catch (err) {
			console.error('[kp-fallback] Australian BoM failed:', err);
		}
	}

	// All sources exhausted — return empty result with primary source tag
	return { source: 'noaa', label: 'All sources failed', buckets: [] };
}

/** Read admin source override from cron_state (returns 'auto' if not set) */
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

/** Fetch from a specific source by ID (for admin override) */
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

export async function ingestKpEstimated(db: D1Database, bomApiKey?: string): Promise<{ inserted: number; source: string }> {
	try {
		// Check for admin source override
		const override = await getSourceOverride(db);
		let result: FallbackResult;

		if (override !== 'auto') {
			// Admin has forced a specific source — try it, fall back to auto if it fails
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

		// Purge rows older than 12 hours to keep the table lean
		// datetime(ts) normalises ISO 8601 'T'/'Z' format for correct comparison
		await db.prepare(
			"DELETE FROM kp_estimated WHERE datetime(ts) < datetime('now', '-12 hours')"
		).run();

		const statusMsg = source === 'noaa' ? 'ok' : `ok_fallback:${source}`;
		await updateCronState(db, 'ingest-kp-estimated', statusMsg, inserted);
		console.log(`[ingest-kp-estimated] source=${label}, inserted=${inserted}`);
		return { inserted, source };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		await updateCronState(db, 'ingest-kp-estimated', 'error', 0, msg);
		throw err;
	}
}
