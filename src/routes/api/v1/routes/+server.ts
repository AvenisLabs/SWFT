// GET /api/v1/routes — Auto-discovered page routes (via import.meta.glob)
// v0.1.0

import type { RequestHandler } from './$types';
import { withCache, jsonResponse } from '$lib/server/cache';

// Vite resolves this at build time — keys are all +page.svelte file paths
const pageModules = import.meta.glob('/src/routes/**/+page.svelte');

/** Convert glob keys to URL paths, filtering out admin and dynamic routes */
function discoverRoutes(): string[] {
	return Object.keys(pageModules)
		.map(filePath => filePath.replace('/src/routes', '').replace('/+page.svelte', '') || '/')
		.filter(path => {
			if (path.includes('[')) return false; // dynamic params
			if (path.startsWith('/admin')) return false; // admin pages
			return true;
		})
		.sort();
}

export const GET: RequestHandler = async ({ request }) => {
	// Routes only change on deploy, so cache aggressively (24h)
	return withCache(request, 'site-routes', 86_400, async () => {
		const routes = discoverRoutes();
		return jsonResponse({ ok: true, data: routes });
	});
};
