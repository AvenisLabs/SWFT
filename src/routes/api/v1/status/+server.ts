// GET /api/v1/status — Health check with ingestion timestamps.
// v0.2.0 — Bounded COUNTs (last 7 days only) use the ts index instead of scanning
// the whole table. Pre-fix, three unbounded COUNT(*) calls at a 30s TTL accounted
// for ~54% of total D1 row reads (see 2026-03-15 postmortem).

import type { RequestHandler } from './$types';
import { getDb, queryFirst, queryAll } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { CACHE_TTL, APP_VERSION } from '$lib/server/constants';
import type { StatusResponse } from '$types/api';

export const GET: RequestHandler = async ({ platform, request }) => {
	return withCache(request, 'status', CACHE_TTL.STATUS, async () => {
		try {
			const db = getDb(platform);
			const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

			const [cronStates, kpCount, alertCount, swCount] = await Promise.all([
				queryAll<{ task_name: string; last_run: string; last_status: string }>(
					db, 'SELECT task_name, last_run, last_status FROM cron_state'
				),
				queryFirst<{ cnt: number }>(
					db, 'SELECT COUNT(*) as cnt FROM kp_obs WHERE ts > ?', [sevenDaysAgo]
				),
				queryFirst<{ cnt: number }>(
					db, 'SELECT COUNT(*) as cnt FROM alerts_raw WHERE issue_time > ?', [sevenDaysAgo]
				),
				queryFirst<{ cnt: number }>(
					db, 'SELECT COUNT(*) as cnt FROM solarwind_summary WHERE ts > ?', [sevenDaysAgo]
				),
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
