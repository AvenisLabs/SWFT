// db.ts v0.4.0 — D1 insert helpers for cron worker

/** Upsert Kp observation (ignore duplicate ts+source) */
export async function upsertKpObs(
	db: D1Database,
	rows: Array<{ ts: string; kp_value: number }>
): Promise<number> {
	if (rows.length === 0) return 0;

	let inserted = 0;
	// Batch in groups of 50 to stay under D1 limits
	for (let i = 0; i < rows.length; i += 50) {
		const batch = rows.slice(i, i + 50);
		const stmts = batch.map(r =>
			db.prepare(
				'INSERT OR IGNORE INTO kp_obs (ts, kp_value, source) VALUES (?, ?, ?)'
			).bind(r.ts, r.kp_value, 'noaa')
		);
		const results = await db.batch(stmts);
		inserted += results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
	}
	return inserted;
}

/** Upsert solar wind summary (5-min downsampled) */
export async function upsertSolarWind(
	db: D1Database,
	rows: Array<{ ts: string; speed: number | null; density: number | null; bt: number | null; bz: number | null; temperature: number | null }>
): Promise<number> {
	if (rows.length === 0) return 0;

	let inserted = 0;
	for (let i = 0; i < rows.length; i += 50) {
		const batch = rows.slice(i, i + 50);
		const stmts = batch.map(r =>
			db.prepare(
				'INSERT OR IGNORE INTO solarwind_summary (ts, speed, density, bt, bz, temperature) VALUES (?, ?, ?, ?, ?, ?)'
			).bind(r.ts, r.speed, r.density, r.bt, r.bz, r.temperature)
		);
		const results = await db.batch(stmts);
		inserted += results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
	}
	return inserted;
}

/** Upsert 15-min estimated Kp buckets (replaces on re-fetch to update averages) */
export async function upsertKpEstimated(
	db: D1Database,
	rows: Array<{ ts: string; kp_value: number; sample_count: number }>,
	source: string = 'noaa'
): Promise<number> {
	if (rows.length === 0) return 0;

	let inserted = 0;
	for (let i = 0; i < rows.length; i += 50) {
		const batch = rows.slice(i, i + 50);
		const stmts = batch.map(r =>
			db.prepare(
				'INSERT OR REPLACE INTO kp_estimated (ts, kp_value, sample_count, source) VALUES (?, ?, ?, ?)'
			).bind(r.ts, r.kp_value, r.sample_count, source)
		);
		const results = await db.batch(stmts);
		inserted += results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
	}
	return inserted;
}

/** Insert raw alert if content_hash is new, returns the new row id or null */
export async function insertAlert(
	db: D1Database,
	alert: { issue_time: string; message: string; product_id: string; raw_source: string; content_hash: string }
): Promise<number | null> {
	const result = await db.prepare(
		'INSERT OR IGNORE INTO alerts_raw (issue_time, message, product_id, raw_source, content_hash) VALUES (?, ?, ?, ?, ?)'
	).bind(alert.issue_time, alert.message, alert.product_id, alert.raw_source, alert.content_hash).run();

	if ((result.meta?.changes ?? 0) === 0) return null; // duplicate
	return result.meta?.last_row_id ?? null;
}

/** Insert classified alert record */
export async function insertClassifiedAlert(
	db: D1Database,
	alert: {
		raw_alert_id: number;
		event_type: string;
		severity: string;
		scale_type: string | null;
		scale_value: number | null;
		begins: string | null;
		ends: string | null;
		summary: string;
	}
): Promise<void> {
	await db.prepare(
		`INSERT INTO alerts_classified
		 (raw_alert_id, event_type, severity, scale_type, scale_value, begins, ends, summary)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(
		alert.raw_alert_id,
		alert.event_type,
		alert.severity,
		alert.scale_type,
		alert.scale_value,
		alert.begins,
		alert.ends,
		alert.summary
	).run();
}

/** Update cron_state tracking table */
export async function updateCronState(
	db: D1Database,
	taskName: string,
	status: string,
	rowsAffected: number,
	errorMessage: string | null = null
): Promise<void> {
	await db.prepare(
		`INSERT INTO cron_state (task_name, last_run, last_status, rows_affected, error_message)
		 VALUES (?, datetime('now'), ?, ?, ?)
		 ON CONFLICT(task_name) DO UPDATE SET
		   last_run = datetime('now'),
		   last_status = excluded.last_status,
		   rows_affected = excluded.rows_affected,
		   error_message = excluded.error_message`
	).bind(taskName, status, rowsAffected, errorMessage).run();
}
