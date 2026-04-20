// alerts.ts v0.2.0 — Alert queries + classification helpers.
// Uses precomputed ISO 8601 bounds so SQLite can use the ts index on alerts_raw
// (see 2026-03-15 D1 postmortem — datetime(ts) forced full scans of a 90-day table).

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll } from './db';
import type { AlertItem } from '$types/api';

function isoHoursFromNow(offsetHours: number): string {
	return new Date(Date.now() + offsetHours * 3600_000).toISOString();
}

function isoDaysFromNow(offsetDays: number): string {
	return new Date(Date.now() + offsetDays * 86400_000).toISOString();
}

/** Get active alerts (issued in last 24h, not yet ended) */
export async function getActiveAlerts(db: D1Database): Promise<AlertItem[]> {
	const issueBound = isoHoursFromNow(-24);
	const now = new Date().toISOString();
	return queryAll<AlertItem>(
		db,
		`SELECT
			r.id, r.issue_time, r.product_id, r.message,
			c.event_type, c.severity, c.scale_type, c.scale_value,
			c.begins, c.ends, c.summary
		 FROM alerts_raw r
		 JOIN alerts_classified c ON c.raw_alert_id = r.id
		 WHERE r.issue_time > ?
		   AND (c.ends IS NULL OR c.ends > ?)
		 ORDER BY r.issue_time DESC`,
		[issueBound, now]
	);
}

/** Get recent alerts (last N days, paginated) */
export async function getRecentAlerts(db: D1Database, days = 7, limit = 50): Promise<AlertItem[]> {
	const bound = isoDaysFromNow(-days);
	return queryAll<AlertItem>(
		db,
		`SELECT
			r.id, r.issue_time, r.product_id, r.message,
			c.event_type, c.severity, c.scale_type, c.scale_value,
			c.begins, c.ends, c.summary
		 FROM alerts_raw r
		 JOIN alerts_classified c ON c.raw_alert_id = r.id
		 WHERE r.issue_time > ?
		 ORDER BY r.issue_time DESC
		 LIMIT ?`,
		[bound, limit]
	);
}
