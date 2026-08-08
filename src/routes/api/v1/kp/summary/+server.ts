// GET /api/v1/kp/summary — Current Kp summary with trend and status
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { cachedServerCall } from '$lib/server/server-cache';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getKpSummary } from '$lib/server/kp';
import { CACHE_TTL } from '$lib/server/constants';
import type { KpSummary } from '$types/api';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDb(platform);
		const summary = await cachedServerCall<KpSummary>('page-home:kp-summary', CACHE_TTL.KP_SUMMARY, async () => {
			return getKpSummary(db);
		}, platform);

		return jsonResponse({
			ok: true,
			data: summary,
			data_freshness: summary.current_time,
		});
	} catch (err) {
		console.error('[api/v1/kp/summary]', err);
		return errorResponse('Failed to build Kp summary');
	}
};
