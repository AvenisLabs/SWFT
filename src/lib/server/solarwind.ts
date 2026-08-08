// solarwind.ts v0.3.0 — Solar wind queries

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst } from './db';

export interface SolarWindLatest {
	ts: string;
	speed: number | null;
	density: number | null;
	bt: number | null;
	bz: number | null;
	temperature: number | null;
}

/** Get the most recent solar wind observation */
export async function getLatestSolarWind(db: D1Database): Promise<SolarWindLatest | null> {
	return queryFirst<SolarWindLatest>(
		db,
		'SELECT ts, speed, density, bt, bz, temperature FROM solarwind_summary ORDER BY ts DESC LIMIT 1'
	);
}

/** Get recent solar wind data (for charts, default 24h) */
export async function getRecentSolarWind(db: D1Database, hours = 24): Promise<SolarWindLatest[]> {
	// Precomputed ISO 8601 bound — wrapping ts with datetime() prevents the index
	// on solarwind_summary(ts) from being used. ts is stored as toISOString() so
	// lexicographic comparison gives correct chronological ordering.
	const bound = new Date(Date.now() - hours * 3600_000).toISOString();
	return queryAll<SolarWindLatest>(
		db,
		`SELECT ts, speed, density, bt, bz, temperature FROM solarwind_summary
		 WHERE ts > ?
		 ORDER BY ts ASC`,
		[bound]
	);
}
