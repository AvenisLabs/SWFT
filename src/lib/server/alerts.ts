// alerts.ts v0.1.0 — Alert queries + classification helpers

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll } from './db';
import type { AlertItem } from '$types/api';

/** Get active alerts (issued in last 24h, not yet ended) */
export async function getActiveAlerts(db: D1Database): Promise<AlertItem[]> {
	return queryAll<AlertItem>(
		db,
		`SELECT
			r.id, r.issue_time, r.product_id, r.message,
			c.event_type, c.severity, c.scale_type, c.scale_value,
			c.begins, c.ends, c.summary
		 FROM alerts_raw r
		 JOIN alerts_classified c ON c.raw_alert_id = r.id
		 WHERE r.issue_time > datetime('now', '-24 hours')
		   AND (c.ends IS NULL OR c.ends > datetime('now'))
		 ORDER BY r.issue_time DESC`
	);
}

/** Get recent alerts (last N days, paginated) */
export async function getRecentAlerts(db: D1Database, days = 7, limit = 50): Promise<AlertItem[]> {
	return queryAll<AlertItem>(
		db,
		`SELECT
			r.id, r.issue_time, r.product_id, r.message,
			c.event_type, c.severity, c.scale_type, c.scale_value,
			c.begins, c.ends, c.summary
		 FROM alerts_raw r
		 JOIN alerts_classified c ON c.raw_alert_id = r.id
		 WHERE r.issue_time > datetime('now', ? || ' days')
		 ORDER BY r.issue_time DESC
		 LIMIT ?`,
		[`-${days}`, limit]
	);
}
