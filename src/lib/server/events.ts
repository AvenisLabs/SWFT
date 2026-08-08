// events.ts v0.2.0 — Event queries. ISO 8601 bound in JS keeps the ts index in play
// (see 2026-03-15 D1 postmortem).

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst } from './db';
import type { EventItem } from '$types/api';

/** Get recent events (last N days) */
export async function getRecentEvents(db: D1Database, days = 7, limit = 50): Promise<EventItem[]> {
	const bound = new Date(Date.now() - days * 86400_000).toISOString();
	return queryAll<EventItem>(
		db,
		`SELECT id, event_type, severity, title, description,
		        begins, ends, peak_time, gnss_impact_level, gnss_advisory
		 FROM events
		 WHERE begins > ?
		 ORDER BY begins DESC
		 LIMIT ?`,
		[bound, limit]
	);
}

/** Get a single event by ID */
export async function getEventById(db: D1Database, id: number): Promise<EventItem | null> {
	return queryFirst<EventItem>(
		db,
		`SELECT id, event_type, severity, title, description,
		        begins, ends, peak_time, gnss_impact_level, gnss_advisory
		 FROM events
		 WHERE id = ?`,
		[id]
	);
}
