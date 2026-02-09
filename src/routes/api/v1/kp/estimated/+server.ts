// GET /api/v1/kp/estimated — 15-min estimated Kp data points
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { getEstimatedKp } from '$lib/server/kp';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, request, url }) => {
	// Allow configurable lookback, clamped to 1-12 hours
	const hoursParam = parseInt(url.searchParams.get('hours') ?? '3', 10);
	const hours = Math.max(1, Math.min(12, isNaN(hoursParam) ? 3 : hoursParam));

	return withCache(request, `kp-estimated-${hours}h`, CACHE_TTL.KP_ESTIMATED, async () => {
		try {
			const db = getDb(platform);
			const data = await getEstimatedKp(db, hours);

			const freshness = data.length > 0 ? data[data.length - 1].ts : undefined;

			return jsonResponse({
				ok: true,
				data,
				data_freshness: freshness,
			});
		} catch (err) {
			console.error('[api/v1/kp/estimated]', err);
			return errorResponse('Failed to fetch estimated Kp data');
		}
	});
};
