// generate-summaries.ts v0.5.0 — Derived summaries + retention cleanup.
// Storm detection now reads from kp_estimated (the 15-min live buffer, 24h retention)
// since kp_obs was dropped in migration 0007. Retention list updated accordingly.

import { updateCronState } from '../lib/db';

const RETENTION = {
	solarwind_summary_days: 7,
	alerts_days: 90,
	events_days: 90,
} as const;

function isoDaysAgo(days: number): string {
	return new Date(Date.now() - days * 86400_000).toISOString();
}

function isoHoursAgo(hours: number): string {
	return new Date(Date.now() - hours * 3600_000).toISOString();
}

export async function generateSummaries(db: D1Database): Promise<{ events_created: number; rows_pruned: number }> {
	try {
		let eventsCreated = 0;

		// --- Event detection: geomagnetic storm (Kp >= 5 in last 3 hours of 15-min data) ---
		const stormBound = isoHoursAgo(3);
		const stormKp = await db.prepare(
			`SELECT ts, kp_value FROM kp_estimated
			 WHERE ts > ? AND kp_value >= 5
			 ORDER BY ts DESC LIMIT 1`
		).bind(stormBound).first<{ ts: string; kp_value: number }>();

		if (stormKp) {
			const existingBound = isoHoursAgo(6);
			const existing = await db.prepare(
				`SELECT id FROM events
				 WHERE event_type = 'geomagnetic_storm' AND begins > ?
				 LIMIT 1`
			).bind(existingBound).first();

			if (!existing) {
				const severity = stormKp.kp_value >= 8 ? 'extreme'
					: stormKp.kp_value >= 7 ? 'strong'
					: stormKp.kp_value >= 6 ? 'moderate'
					: 'minor';

				const gnssImpact = stormKp.kp_value >= 7 ? 'severe'
					: stormKp.kp_value >= 6 ? 'high'
					: stormKp.kp_value >= 5 ? 'moderate'
					: 'low';

				await db.prepare(
					`INSERT INTO events (event_type, severity, begins, title, description, gnss_impact_level, gnss_advisory)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`
				).bind(
					'geomagnetic_storm',
					severity,
					stormKp.ts,
					`Geomagnetic Storm — Kp ${stormKp.kp_value}`,
					`Kp index reached ${stormKp.kp_value} at ${stormKp.ts}. ${severity} geomagnetic storm conditions detected.`,
					gnssImpact,
					getGnssAdvisory(gnssImpact)
				).run();

				eventsCreated++;
			}
		}

		// --- Event detection: fast solar wind (speed > 600 km/s in last hour) ---
		const windBound = isoHoursAgo(1);
		const fastWind = await db.prepare(
			`SELECT ts, speed, bz FROM solarwind_summary
			 WHERE ts > ? AND speed > 600
			 ORDER BY ts DESC LIMIT 1`
		).bind(windBound).first<{ ts: string; speed: number; bz: number }>();

		if (fastWind) {
			const existingBound = isoHoursAgo(6);
			const existing = await db.prepare(
				`SELECT id FROM events
				 WHERE event_type = 'fast_solar_wind' AND begins > ?
				 LIMIT 1`
			).bind(existingBound).first();

			if (!existing) {
				const severity = fastWind.speed > 800 ? 'strong' : 'moderate';
				await db.prepare(
					`INSERT INTO events (event_type, severity, begins, title, description, gnss_impact_level)
					 VALUES (?, ?, ?, ?, ?, ?)`
				).bind(
					'fast_solar_wind',
					severity,
					fastWind.ts,
					`Fast Solar Wind — ${Math.round(fastWind.speed)} km/s`,
					`Solar wind speed reached ${Math.round(fastWind.speed)} km/s at ${fastWind.ts}.`,
					severity === 'strong' ? 'high' : 'moderate'
				).run();

				eventsCreated++;
			}
		}

		// --- Retention cleanup ---
		const swCutoff = isoDaysAgo(RETENTION.solarwind_summary_days);
		const alertCutoff = isoDaysAgo(RETENTION.alerts_days);
		const eventCutoff = isoDaysAgo(RETENTION.events_days);

		const pruneResults = await db.batch([
			db.prepare('DELETE FROM solarwind_summary WHERE ts < ?').bind(swCutoff),
			db.prepare('DELETE FROM alerts_classified WHERE raw_alert_id IN (SELECT id FROM alerts_raw WHERE issue_time < ?)').bind(alertCutoff),
			db.prepare('DELETE FROM alerts_raw WHERE issue_time < ?').bind(alertCutoff),
			db.prepare('DELETE FROM events WHERE begins < ?').bind(eventCutoff),
		]);
		const rowsPruned = pruneResults.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);

		await updateCronState(db, 'generate-summaries', 'ok', eventsCreated);
		return { events_created: eventsCreated, rows_pruned: rowsPruned };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		await updateCronState(db, 'generate-summaries', 'error', 0, msg);
		throw err;
	}
}

function getGnssAdvisory(level: string): string {
	switch (level) {
		case 'severe':
			return 'GNSS operations strongly discouraged. Expect significant positioning errors, potential loss of lock on multiple satellites. Postpone precision survey work.';
		case 'high':
			return 'GNSS accuracy degraded. Increased position errors likely. Use caution with precision applications. Monitor solution quality continuously.';
		case 'moderate':
			return 'Minor GNSS degradation possible. RTK fix rates may decrease. Allow extra convergence time for PPP solutions.';
		case 'low':
			return 'Minimal GNSS impact expected. Normal operations may proceed with standard monitoring.';
		default:
			return 'No significant GNSS impact expected.';
	}
}
