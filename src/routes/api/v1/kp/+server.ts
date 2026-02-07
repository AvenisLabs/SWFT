// GET /api/v1/kp — Kp index timeseries
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { getRecentKp } from '$lib/server/kp';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, url, request }) => {
	return withCache(request, 'kp-timeseries', CACHE_TTL.KP_SUMMARY, async () => {
		try {
			const db = getDb(platform);
			const hours = parseInt(url.searchParams.get('hours') ?? '48', 10);
			const clamped = Math.min(Math.max(hours, 1), 168); // max 7 days

			const data = await getRecentKp(db, clamped);
			const freshest = data.length > 0 ? data[0].ts : null;

			return jsonResponse({
				ok: true,
				data,
				data_freshness: freshest,
			});
		} catch (err) {
			console.error('[api/v1/kp]', err);
			return errorResponse('Failed to fetch Kp data');
		}
	});
};
