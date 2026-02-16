// GET /api/v1/kp/sources — All 5 Kp data sources with live readings
// v0.3.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { getLatestEstimatedKp } from '$lib/server/kp';
import { fetchAllKpSources } from '$lib/server/kp-sources';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, request }) => {
	return withCache(request, 'kp-sources-all', CACHE_TTL.KP_SOURCES, async () => {
		try {
			// Determine which source is actively driving the dashboard
			let activeSourceId = 'noaa_boulder';
			try {
				const db = getDb(platform);
				const latest = await getLatestEstimatedKp(db);
				if (latest?.source) {
					// D1 stores 'noaa' for NOAA estimated; map to our source ID scheme
					activeSourceId = latest.source === 'noaa' ? 'noaa_estimated' : latest.source;
				}
			} catch {
				// D1 unavailable — default to noaa_boulder
			}

			const bomApiKey = platform?.env?.BOM_API_KEY;
			const result = await fetchAllKpSources(activeSourceId, bomApiKey);

			return jsonResponse({
				ok: true,
				data: result,
				data_freshness: result.fetchedAt,
			});
		} catch (err) {
			console.error('[api/v1/kp/sources]', err);
			return errorResponse('Failed to fetch Kp sources');
		}
	});
};
