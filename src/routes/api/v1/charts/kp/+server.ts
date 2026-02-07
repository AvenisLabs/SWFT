// GET /api/v1/charts/kp — Kp index chart PNG via QuickChart.io
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { withCache, errorResponse } from '$lib/server/cache';
import { fetchKpChartPng } from '$lib/server/charts';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ platform, request, url }) => {
	const hours = parseInt(url.searchParams.get('hours') ?? '48', 10);
	const clamped = Math.min(Math.max(hours, 6), 168);

	return withCache(request, `chart-kp-${clamped}`, CACHE_TTL.CHART_PNG, async () => {
		try {
			const db = getDb(platform);
			return await fetchKpChartPng(db, clamped);
		} catch (err) {
			console.error('[api/v1/charts/kp]', err);
			return errorResponse('Failed to generate Kp chart');
		}
	});
};
