// GET /api/v1/news — Site news items
// v0.2.0

import type { RequestHandler } from './$types';
import { getDb, queryAll } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { CACHE_TTL } from '$lib/server/constants';
import type { NewsItem } from '$types/api';

export const GET: RequestHandler = async ({ platform, request, url }) => {
	const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
	const clamped = Math.min(Math.max(limit, 1), 100);

	return withCache(request, `news-${clamped}`, CACHE_TTL.NEWS, async () => {
		try {
			const db = getDb(platform);
			const data = await queryAll<NewsItem>(
				db,
				`SELECT id, title, url, published_at, summary, image_url
				 FROM site_news_items
				 ORDER BY published_at DESC
				 LIMIT ?`,
				[clamped]
			);

			return jsonResponse({ ok: true, data });
		} catch (err) {
			console.error('[api/v1/news]', err);
			return errorResponse('Failed to fetch news');
		}
	});
};
