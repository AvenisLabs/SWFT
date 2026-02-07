// GET /api/v1/gnss/risk — Current GNSS risk assessment
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { computeGnssRisk } from '$lib/server/gnss-risk';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, request }) => {
	return withCache(request, 'gnss-risk', CACHE_TTL.GNSS_RISK, async () => {
		try {
			const db = getDb(platform);
			const risk = await computeGnssRisk(db);

			return jsonResponse({
				ok: true,
				data: risk,
				data_freshness: risk.updated_at,
			});
		} catch (err) {
			console.error('[api/v1/gnss/risk]', err);
			return errorResponse('Failed to compute GNSS risk');
		}
	});
};
