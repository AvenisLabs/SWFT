// ingest-kp.ts v0.3.0 — Kp forecast ingestion only.
// kp_obs was dropped in migration 0007 (the 3-hour observations were redundant
// with the 15-min kp_estimated feed). This task now ingests forecast data only.

import { fetchKpForecast } from '../lib/noaa-client';
import { updateCronState } from '../lib/db';

export async function ingestKp(db: D1Database): Promise<{ inserted: number }> {
	try {
		let inserted = 0;

		const forecast = await fetchKpForecast();
		if (forecast.length > 0) {
			const stmts = forecast.map(f =>
				db.prepare(
					`INSERT OR REPLACE INTO kp_forecast (forecast_time, kp_value, window, source, issued_at)
					 VALUES (?, ?, ?, 'noaa', datetime('now'))`
				).bind(f.forecast_time, f.kp_value, f.noaa_scale)
			);
			for (let i = 0; i < stmts.length; i += 50) {
				const results = await db.batch(stmts.slice(i, i + 50));
				inserted += results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
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
