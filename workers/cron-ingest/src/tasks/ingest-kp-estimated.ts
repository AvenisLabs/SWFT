// ingest-kp-estimated.ts v0.2.0 — Ingest 1-min estimated Kp, store as 15-min averages

import { fetchEstimatedKp } from '../lib/noaa-client';
import { upsertKpEstimated, updateCronState } from '../lib/db';

export async function ingestKpEstimated(db: D1Database): Promise<{ inserted: number }> {
	try {
		const buckets = await fetchEstimatedKp();
		const inserted = await upsertKpEstimated(db, buckets);

		// Purge rows older than 12 hours to keep the table lean
		// datetime(ts) normalises ISO 8601 'T'/'Z' format for correct comparison
		await db.prepare(
			"DELETE FROM kp_estimated WHERE datetime(ts) < datetime('now', '-12 hours')"
		).run();

		await updateCronState(db, 'ingest-kp-estimated', 'ok', inserted);
		return { inserted };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		await updateCronState(db, 'ingest-kp-estimated', 'error', 0, msg);
		throw err;
	}
}
