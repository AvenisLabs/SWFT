// GET /api/v1/alerts/recent — Recent alerts (last 7 days)
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { getRecentAlerts } from '$lib/server/alerts';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, request, url }) => {
	const days = parseInt(url.searchParams.get('days') ?? '7', 10);
	const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
	const clampedDays = Math.min(Math.max(days, 1), 30);
	const clampedLimit = Math.min(Math.max(limit, 1), 200);

	return withCache(request, `alerts-recent-${clampedDays}-${clampedLimit}`, CACHE_TTL.ALERTS, async () => {
		try {
			const db = getDb(platform);
			const data = await getRecentAlerts(db, clampedDays, clampedLimit);
			const freshest = data.length > 0 ? data[0].issue_time : null;

			return jsonResponse({
				ok: true,
				data,
				data_freshness: freshest,
			});
		} catch (err) {
			console.error('[api/v1/alerts/recent]', err);
			return errorResponse('Failed to fetch recent alerts');
		}
	});
};
