// +server.ts v0.1.0 — GET /api/v1/admin/links — List all discovered links
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getAllLinks } from '$lib/server/links';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDb(platform);
		const links = await getAllLinks(db);
		return jsonResponse({ ok: true, data: links });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return errorResponse(msg);
	}
};
