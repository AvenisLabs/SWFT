// GET /api/v1/panels/[id]/latest — Latest frame for a panel (proxy from NOAA)
// v0.2.0

import type { RequestHandler } from './$types';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { fetchLatestFrame, getPanelById } from '$lib/server/panels';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ params, request }) => {
	const panelId = params.id;
	const panel = getPanelById(panelId);

	if (!panel) {
		return errorResponse(`Panel '${panelId}' not found`, 404);
	}

	return withCache(request, `panel-latest-${panelId}`, CACHE_TTL.PANELS, async () => {
		try {
			const frame = await fetchLatestFrame(panelId);
			if (!frame) {
				return errorResponse('No frames available', 404);
			}

			return jsonResponse({
				ok: true,
				data: {
					panel_id: panelId,
					label: panel.label,
					url: frame.url,
					time: frame.time,
				},
			});
		} catch (err) {
			console.error(`[api/v1/panels/${panelId}/latest]`, err);
			return errorResponse('Failed to fetch latest frame');
		}
	});
};
