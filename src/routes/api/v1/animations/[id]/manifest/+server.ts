// GET /api/v1/animations/[id]/manifest — Normalized animation manifest
// v0.1.0

import type { RequestHandler } from './$types';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { fetchAnimationManifest, getPanelById } from '$lib/server/panels';
import { CACHE_TTL } from '$lib/server/constants';

export const GET: RequestHandler = async ({ params, request }) => {
	const panelId = params.id;
	const panel = getPanelById(panelId);

	if (!panel) {
		return errorResponse(`Animation '${panelId}' not found`, 404);
	}

	if (!panel.is_animation) {
		return errorResponse(`Panel '${panelId}' is not an animation`, 400);
	}

	return withCache(request, `animation-manifest-${panelId}`, CACHE_TTL.ANIMATION_MANIFEST, async () => {
		try {
			const manifest = await fetchAnimationManifest(panelId);
			if (!manifest) {
				return errorResponse('Failed to load animation manifest', 502);
			}

			return jsonResponse({
				ok: true,
				data: manifest,
				data_freshness: manifest.latest_time,
			});
		} catch (err) {
			console.error(`[api/v1/animations/${panelId}/manifest]`, err);
			return errorResponse('Failed to fetch animation manifest');
		}
	});
};
