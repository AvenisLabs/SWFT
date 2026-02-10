// +server.ts v0.1.0 — GET /api/v1/admin/link-checks — List past check runs
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getAllCheckRuns } from '$lib/server/links';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDb(platform);
		const runs = await getAllCheckRuns(db);
		return jsonResponse({ ok: true, data: runs });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return errorResponse(msg);
	}
};
