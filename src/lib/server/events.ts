// events.ts v0.1.0 — Event queries

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst } from './db';
import type { EventItem } from '$types/api';

/** Get recent events (last N days) */
export async function getRecentEvents(db: D1Database, days = 7, limit = 50): Promise<EventItem[]> {
	return queryAll<EventItem>(
		db,
		`SELECT id, event_type, severity, title, description,
		        begins, ends, peak_time, gnss_impact_level, gnss_advisory
		 FROM events
		 WHERE begins > datetime('now', ? || ' days')
		 ORDER BY begins DESC
		 LIMIT ?`,
		[`-${days}`, limit]
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
