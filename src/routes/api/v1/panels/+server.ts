// GET /api/v1/panels — Panel definitions
// v0.1.0

import type { RequestHandler } from './$types';
import { withCache, jsonResponse } from '$lib/server/cache';
import { getAllPanels } from '$lib/server/panels';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ request }) => {
	return withCache(request, 'panels-list', CACHE_TTL.PANELS, async () => {
		const data = getAllPanels();
		return jsonResponse({ ok: true, data });
	});
};
