// GET /api/v1/alerts/active — Currently active alerts
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { cachedServerCall } from '$lib/server/server-cache';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getActiveAlerts } from '$lib/server/alerts';
import { CACHE_TTL } from '$lib/server/constants';
import type { AlertItem } from '$types/api';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDb(platform);
		const data = await cachedServerCall<AlertItem[]>('page-home:alerts-active', CACHE_TTL.ALERTS, async () => {
			return getActiveAlerts(db);
		}, platform);
		const freshest = data.length > 0 ? data[0].issue_time : null;

		return jsonResponse({
			ok: true,
			data,
			data_freshness: freshest,
		});
	} catch (err) {
		console.error('[api/v1/alerts/active]', err);
		return errorResponse('Failed to fetch active alerts');
	}
};
