// generate-summaries.ts v0.2.0 — Compute derived summaries from ingested data

import { updateCronState } from '../lib/db';

// Detects notable space weather events from recent data and inserts into the events table.
// Runs on the every-15-minutes schedule to produce aggregated event records.
export async function generateSummaries(db: D1Database): Promise<{ events_created: number }> {
	try {
		let eventsCreated = 0;

		// Check for geomagnetic storm conditions (Kp >= 5 in last 3 hours)
		const stormKp = await db.prepare(`
			SELECT ts, kp_value FROM kp_obs
			WHERE ts > datetime('now', '-3 hours')
			  AND kp_value >= 5
			ORDER BY ts DESC
			LIMIT 1
		`).first<{ ts: string; kp_value: number }>();

		if (stormKp) {
			// Only create event if none exists in last 6 hours for same type
			const existing = await db.prepare(`
				SELECT id FROM events
				WHERE event_type = 'geomagnetic_storm'
				  AND begins > datetime('now', '-6 hours')
				LIMIT 1
			`).first();

			if (!existing) {
				const severity = stormKp.kp_value >= 8 ? 'extreme'
					: stormKp.kp_value >= 7 ? 'strong'
					: stormKp.kp_value >= 6 ? 'moderate'
					: 'minor';

				const gnssImpact = stormKp.kp_value >= 7 ? 'severe'
					: stormKp.kp_value >= 6 ? 'high'
					: stormKp.kp_value >= 5 ? 'moderate'
					: 'low';

				await db.prepare(`
					INSERT INTO events (event_type, severity, begins, title, description, gnss_impact_level, gnss_advisory)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`).bind(
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

		// Check for elevated solar wind (speed > 600 km/s)
		const fastWind = await db.prepare(`
			SELECT ts, speed, bz FROM solarwind_summary
			WHERE ts > datetime('now', '-1 hour')
			  AND speed > 600
			ORDER BY ts DESC
			LIMIT 1
		`).first<{ ts: string; speed: number; bz: number }>();

		if (fastWind) {
			const existing = await db.prepare(`
				SELECT id FROM events
				WHERE event_type = 'fast_solar_wind'
				  AND begins > datetime('now', '-6 hours')
				LIMIT 1
			`).first();

			if (!existing) {
				const severity = fastWind.speed > 800 ? 'strong' : 'moderate';
				await db.prepare(`
					INSERT INTO events (event_type, severity, begins, title, description, gnss_impact_level)
					VALUES (?, ?, ?, ?, ?, ?)
				`).bind(
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

		await updateCronState(db, 'generate-summaries', 'ok', eventsCreated);
		return { events_created: eventsCreated };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		await updateCronState(db, 'generate-summaries', 'error', 0, msg);
		throw err;
	}
}

/** Return GNSS operator advisory text based on impact level */
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
