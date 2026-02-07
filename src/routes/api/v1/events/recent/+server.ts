// GET /api/v1/events/recent — Recent space weather events
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { getRecentEvents } from '$lib/server/events';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, request, url }) => {
	const days = parseInt(url.searchParams.get('days') ?? '7', 10);
	const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);

	return withCache(request, `events-recent-${days}`, CACHE_TTL.EVENTS, async () => {
		try {
			const db = getDb(platform);
			const data = await getRecentEvents(db, Math.min(days, 30), Math.min(limit, 200));
			const freshest = data.length > 0 ? data[0].begins : null;

			return jsonResponse({
				ok: true,
				data,
				data_freshness: freshest,
			});
		} catch (err) {
			console.error('[api/v1/events/recent]', err);
			return errorResponse('Failed to fetch recent events');
		}
	});
};
