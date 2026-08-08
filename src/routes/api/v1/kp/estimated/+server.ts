// GET /api/v1/kp/estimated — 15-min estimated Kp data points
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { cachedServerCall } from '$lib/server/server-cache';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getEstimatedKp } from '$lib/server/kp';
import { CACHE_TTL } from '$lib/server/constants';
import type { KpEstimatedPoint } from '$types/api';

export const GET: RequestHandler = async ({ platform, url }) => {
	// Allow configurable lookback, clamped to 1-12 hours
	const hoursParam = parseInt(url.searchParams.get('hours') ?? '3', 10);
	const hours = Math.max(1, Math.min(12, isNaN(hoursParam) ? 3 : hoursParam));

	const cacheKey = `page-home:kp-estimated-${hours}h`;
	try {
		const db = getDb(platform);
		const data = await cachedServerCall<KpEstimatedPoint[]>(cacheKey, CACHE_TTL.KP_ESTIMATED, async () => {
			return getEstimatedKp(db, hours);
		}, platform);

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
};
