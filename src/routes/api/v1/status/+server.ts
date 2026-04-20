// GET /api/v1/status — Health check with ingestion timestamps + monitoring mode.
// v0.4.0 — includes the cron worker's current monitoring mode (normal/elevated/
// storm) and expiry timestamps. Mode state is read from system_state via
// getModeState(), which applies expiry so stale values never reach the UI.

import type { RequestHandler } from './$types';
import { getDb, queryFirst, queryAll } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { getModeState } from '$lib/server/mode';
import { CACHE_TTL, APP_VERSION } from '$lib/server/constants';
import type { StatusResponse } from '$types/api';

export const GET: RequestHandler = async ({ platform, request }) => {
	return withCache(request, 'status', CACHE_TTL.STATUS, async () => {
		try {
			const db = getDb(platform);
			const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

			const [cronStates, kpEventCount, alertCount, swCount, modeState] = await Promise.all([
				queryAll<{ task_name: string; last_run: string; last_status: string }>(
					db, 'SELECT task_name, last_run, last_status FROM cron_state'
				),
				// Unbounded COUNT on kp_events is deliberate: the append-only log only
				// admits Kp>=4 buckets, so an upper-bound estimate is a few thousand
				// rows per active solar year. A "since launch" count is more useful
				// than a rolling window here, and the table is far too small for this
				// COUNT to matter (the March 15 postmortem rule targeted large tables).
				queryFirst<{ cnt: number }>(
					db, 'SELECT COUNT(*) as cnt FROM kp_events'
				),
				queryFirst<{ cnt: number }>(
					db, 'SELECT COUNT(*) as cnt FROM alerts_raw WHERE issue_time > ?', [sevenDaysAgo]
				),
				queryFirst<{ cnt: number }>(
					db, 'SELECT COUNT(*) as cnt FROM solarwind_summary WHERE ts > ?', [sevenDaysAgo]
				),
				getModeState(db),
			]);

			const cronMap = new Map(cronStates.map(c => [c.task_name, c]));
			const hasErrors = cronStates.some(c => c.last_status === 'error');

			const data: StatusResponse = {
				status: hasErrors ? 'degraded' : 'ok',
				last_kp_ingest: cronMap.get('ingest-kp-estimated')?.last_run ?? cronMap.get('ingest-kp')?.last_run,
				last_alert_ingest: cronMap.get('ingest-alerts')?.last_run,
				last_solarwind_ingest: cronMap.get('ingest-solarwind')?.last_run,
				kp_events_row_count: kpEventCount?.cnt ?? 0,
				alert_row_count: alertCount?.cnt ?? 0,
				solarwind_row_count: swCount?.cnt ?? 0,
				mode: modeState.mode,
				storm_until: modeState.storm_until,
				elevated_until: modeState.elevated_until,
				version: APP_VERSION,
			};

			return jsonResponse({ ok: true, data });
		} catch (err) {
			console.error('[api/v1/status]', err);
			return errorResponse('Status check failed');
		}
	});
};
