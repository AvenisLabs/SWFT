// ingest-kp.ts v0.2.0 — Kp index + forecast ingestion task

import { fetchKpIndex, fetchKpForecast } from '../lib/noaa-client';
import { upsertKpObs, updateCronState } from '../lib/db';

export async function ingestKp(db: D1Database): Promise<{ inserted: number }> {
	try {
		const kpData = await fetchKpIndex();
		const inserted = await upsertKpObs(db, kpData);

		// Also ingest forecast data
		const forecast = await fetchKpForecast();
		if (forecast.length > 0) {
			const stmts = forecast.map(f =>
				db.prepare(
					`INSERT OR REPLACE INTO kp_forecast (forecast_time, kp_value, window, source, issued_at)
					 VALUES (?, ?, ?, 'noaa', datetime('now'))`
				).bind(f.forecast_time, f.kp_value, f.noaa_scale)
			);
			// Batch in groups of 50
			for (let i = 0; i < stmts.length; i += 50) {
				await db.batch(stmts.slice(i, i + 50));
			}
		}

		await updateCronState(db, 'ingest-kp', 'ok', inserted);
		return { inserted };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		await updateCronState(db, 'ingest-kp', 'error', 0, msg);
		throw err;
	}
}
