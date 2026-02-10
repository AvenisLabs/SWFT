// +server.ts v0.1.0 — GET /api/v1/admin/link-checks/[id] — Get specific run with results
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getCheckRunById, getCheckRunResults } from '$lib/server/links';

export const GET: RequestHandler = async ({ params, platform }) => {
	try {
		const db = getDb(platform);
		const id = parseInt(params.id, 10);
		if (isNaN(id)) return errorResponse('Invalid run ID', 400);

		const run = await getCheckRunById(db, id);
		if (!run) return errorResponse('Check run not found', 404);

		const results = await getCheckRunResults(db, id);
		return jsonResponse({ ok: true, data: { run, results } });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return errorResponse(msg);
	}
};
