// solarwind.ts v0.1.0 — Solar wind queries

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
	return queryAll<SolarWindLatest>(
		db,
		`SELECT ts, speed, density, bt, bz, temperature FROM solarwind_summary
		 WHERE ts > datetime('now', ? || ' hours')
		 ORDER BY ts ASC`,
		[`-${hours}`]
	);
}
