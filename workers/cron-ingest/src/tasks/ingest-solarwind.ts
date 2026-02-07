// ingest-solarwind.ts v0.2.0 — Solar wind plasma + mag ingestion with 5-min downsampling

import { fetchPlasma, fetchMag } from '../lib/noaa-client';
import type { ParsedPlasma, ParsedMag } from '../lib/noaa-client';
import { upsertSolarWind, updateCronState } from '../lib/db';

/** Round timestamp down to nearest 5-minute boundary */
function roundTo5Min(ts: string): string {
	const d = new Date(ts);
	d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 5) * 5, 0, 0);
	return d.toISOString().replace('.000Z', 'Z');
}

interface BucketAccum {
	speeds: number[];
	densities: number[];
	bts: number[];
	bzs: number[];
	temps: number[];
}

/** Average an array of numbers, ignoring nulls */
function avg(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Merge plasma and mag data into 5-minute downsampled buckets.
 * Takes the average of all readings within each 5-min window.
 */
function downsample(
	plasma: ParsedPlasma[],
	mag: ParsedMag[]
): Array<{ ts: string; speed: number | null; density: number | null; bt: number | null; bz: number | null; temperature: number | null }> {
	const buckets = new Map<string, BucketAccum>();

	// Helper to ensure bucket exists
	const getBucket = (ts: string): BucketAccum => {
		const key = roundTo5Min(ts);
		if (!buckets.has(key)) {
			buckets.set(key, { speeds: [], densities: [], bts: [], bzs: [], temps: [] });
		}
		return buckets.get(key)!;
	};

	// Accumulate plasma readings
	for (const p of plasma) {
		const b = getBucket(p.ts);
		if (p.speed !== null) b.speeds.push(p.speed);
		if (p.density !== null) b.densities.push(p.density);
		if (p.temperature !== null) b.temps.push(p.temperature);
	}

	// Accumulate mag readings
	for (const m of mag) {
		const b = getBucket(m.ts);
		if (m.bt !== null) b.bts.push(m.bt);
		if (m.bz !== null) b.bzs.push(m.bz);
	}

	// Convert buckets to output rows
	return Array.from(buckets.entries())
		.map(([ts, b]) => ({
			ts,
			speed: avg(b.speeds),
			density: avg(b.densities),
			bt: avg(b.bts),
			bz: avg(b.bzs),
			temperature: avg(b.temps),
		}))
		.sort((a, b) => a.ts.localeCompare(b.ts));
}

export async function ingestSolarWind(db: D1Database): Promise<{ inserted: number }> {
	try {
		const [plasma, mag] = await Promise.all([fetchPlasma(), fetchMag()]);

		// Only process last 24h to limit batch size
		const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const recentPlasma = plasma.filter(p => p.ts > cutoff);
		const recentMag = mag.filter(m => m.ts > cutoff);

		const downsampled = downsample(recentPlasma, recentMag);
		const inserted = await upsertSolarWind(db, downsampled);

		await updateCronState(db, 'ingest-solarwind', 'ok', inserted);
		return { inserted };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		await updateCronState(db, 'ingest-solarwind', 'error', 0, msg);
		throw err;
	}
}
