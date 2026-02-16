// GET/POST /api/v1/admin/kp-source — Admin control for primary Kp data source
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { queryFirst, execute } from '$lib/server/db';

const VALID_SOURCES = ['auto', 'noaa_boulder', 'noaa', 'noaa_forecast', 'gfz', 'bom'];

/** GET — returns current source override (or 'auto' if none) */
export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDb(platform);
		const row = await queryFirst<{ last_status: string }>(
			db,
			"SELECT last_status FROM cron_state WHERE task_name = 'kp-source-override'"
		);
		return jsonResponse({
			ok: true,
			data: { source: row?.last_status ?? 'auto' },
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return errorResponse(msg);
	}
};

/** POST — set or clear the source override */
export const POST: RequestHandler = async ({ platform, request }) => {
	try {
		const db = getDb(platform);
		const body = await request.json() as { source?: string };
		const source = body.source ?? 'auto';

		if (!VALID_SOURCES.includes(source)) {
			return errorResponse(`Invalid source: ${source}. Valid: ${VALID_SOURCES.join(', ')}`, 400);
		}

		// Store in cron_state as a config entry (not a real cron task)
		await execute(
			db,
			`INSERT INTO cron_state (task_name, last_run, last_status, rows_affected, error_message)
			 VALUES ('kp-source-override', datetime('now'), ?, 0, NULL)
			 ON CONFLICT(task_name) DO UPDATE SET
			   last_run = datetime('now'),
			   last_status = excluded.last_status`,
			[source]
		);

		return jsonResponse({ ok: true, data: { source } });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return errorResponse(msg);
	}
};
