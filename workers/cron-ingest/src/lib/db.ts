// db.ts v0.5.0 — D1 insert helpers for cron worker.
// kp_obs was dropped in migration 0007. Writes now go to kp_estimated (15-min
// live buffer, 24h retention) and kp_events (Kp>=4 persistent log).

/** Classify a Kp value into NOAA G-scale storm class. */
export function classifyStormClass(kp: number): 'active' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' {
	if (kp >= 9) return 'G5';
	if (kp >= 8) return 'G4';
	if (kp >= 7) return 'G3';
	if (kp >= 6) return 'G2';
	if (kp >= 5) return 'G1';
	return 'active'; // Kp 4 — below G1 but above the persistence threshold
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

/** Append kp_events rows for any bucket where Kp >= 4 and ts is newer than the
 *  last-seen watermark in system_state. Returns the number of rows inserted and
 *  the new watermark (or the existing one if nothing was appended). */
export async function appendKpEvents(
	db: D1Database,
	rows: Array<{ ts: string; kp_value: number; bz_nt?: number | null; speed_kms?: number | null }>,
	source: string
): Promise<{ inserted: number; newWatermark: string }> {
	const watermarkRow = await db.prepare(
		"SELECT value FROM system_state WHERE key = 'last_kp_events_ts_seen'"
	).first<{ value: string }>();
	const watermark = watermarkRow?.value ?? '';

	const candidates = rows
		.filter(r => r.kp_value >= 4 && (watermark === '' || r.ts > watermark))
		.sort((a, b) => a.ts.localeCompare(b.ts));

	if (candidates.length === 0) {
		return { inserted: 0, newWatermark: watermark };
	}

	const createdAt = new Date().toISOString();
	const stmts = candidates.map(r =>
		db.prepare(
			`INSERT INTO kp_events (ts, kp_value, source, storm_class, bz_nt, speed_kms, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		).bind(
			r.ts,
			r.kp_value,
			source,
			classifyStormClass(r.kp_value),
			r.bz_nt ?? null,
			r.speed_kms ?? null,
			createdAt
		)
	);

	let inserted = 0;
	for (let i = 0; i < stmts.length; i += 50) {
		const results = await db.batch(stmts.slice(i, i + 50));
		inserted += results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
	}

	const newWatermark = candidates[candidates.length - 1].ts;
	await setSystemState(db, 'last_kp_events_ts_seen', newWatermark);
	return { inserted, newWatermark };
}

/** Read a single system_state value (returns '' if key is missing). */
export async function getSystemState(db: D1Database, key: string): Promise<string> {
	const row = await db.prepare(
		'SELECT value FROM system_state WHERE key = ?'
	).bind(key).first<{ value: string }>();
	return row?.value ?? '';
}

/** Upsert a system_state value with the current timestamp. */
export async function setSystemState(db: D1Database, key: string, value: string): Promise<void> {
	await db.prepare(
		`INSERT INTO system_state (key, value, updated_at) VALUES (?, ?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
	).bind(key, value, new Date().toISOString()).run();
}

/** Insert raw alert if content_hash is new, returns the new row id or null */
export async function insertAlert(
	db: D1Database,
	alert: { issue_time: string; message: string; product_id: string; raw_source: string; content_hash: string }
): Promise<number | null> {
	const result = await db.prepare(
		'INSERT OR IGNORE INTO alerts_raw (issue_time, message, product_id, raw_source, content_hash) VALUES (?, ?, ?, ?, ?)'
	).bind(alert.issue_time, alert.message, alert.product_id, alert.raw_source, alert.content_hash).run();

	if ((result.meta?.changes ?? 0) === 0) return null;
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
