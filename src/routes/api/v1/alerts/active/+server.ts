// GET /api/v1/alerts/active — Currently active alerts
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { getActiveAlerts } from '$lib/server/alerts';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, request }) => {
	return withCache(request, 'alerts-active', CACHE_TTL.ALERTS, async () => {
		try {
			const db = getDb(platform);
			const data = await getActiveAlerts(db);
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
	});
};
