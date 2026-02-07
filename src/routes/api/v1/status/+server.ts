// GET /api/v1/status — Health check with ingestion timestamps
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb, queryFirst, queryAll } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { CACHE_TTL, APP_VERSION } from '$lib/server/constants';
import type { StatusResponse } from '$types/api';

export const GET: RequestHandler = async ({ platform, request }) => {
	return withCache(request, 'status', CACHE_TTL.STATUS, async () => {
		try {
			const db = getDb(platform);

			// Fetch cron state and row counts in parallel
			const [cronStates, kpCount, alertCount, swCount] = await Promise.all([
				queryAll<{ task_name: string; last_run: string; last_status: string }>(
					db, 'SELECT task_name, last_run, last_status FROM cron_state'
				),
				queryFirst<{ cnt: number }>(db, 'SELECT COUNT(*) as cnt FROM kp_obs'),
				queryFirst<{ cnt: number }>(db, 'SELECT COUNT(*) as cnt FROM alerts_raw'),
				queryFirst<{ cnt: number }>(db, 'SELECT COUNT(*) as cnt FROM solarwind_summary'),
			]);

			const cronMap = new Map(cronStates.map(c => [c.task_name, c]));
			const hasErrors = cronStates.some(c => c.last_status === 'error');

			const data: StatusResponse = {
				status: hasErrors ? 'degraded' : 'ok',
				last_kp_ingest: cronMap.get('ingest-kp')?.last_run,
				last_alert_ingest: cronMap.get('ingest-alerts')?.last_run,
				last_solarwind_ingest: cronMap.get('ingest-solarwind')?.last_run,
				kp_row_count: kpCount?.cnt ?? 0,
				alert_row_count: alertCount?.cnt ?? 0,
				solarwind_row_count: swCount?.cnt ?? 0,
				version: APP_VERSION,
			};

			return jsonResponse({ ok: true, data });
		} catch (err) {
			console.error('[api/v1/status]', err);
			return errorResponse('Status check failed');
		}
	});
};
