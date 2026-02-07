// GET /api/v1/kp/summary — Current Kp summary with trend and status
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { getKpSummary } from '$lib/server/kp';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, request }) => {
	return withCache(request, 'kp-summary', CACHE_TTL.KP_SUMMARY, async () => {
		try {
			const db = getDb(platform);
			const summary = await getKpSummary(db);

			return jsonResponse({
				ok: true,
				data: summary,
				data_freshness: summary.current_time,
			});
		} catch (err) {
			console.error('[api/v1/kp/summary]', err);
			return errorResponse('Failed to build Kp summary');
		}
	});
};
