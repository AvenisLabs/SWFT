// +server.ts v0.1.0 — PUT /api/v1/admin/links/[id] — Update link override
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getLinkById, updateLinkOverride } from '$lib/server/links';

export const PUT: RequestHandler = async ({ params, request, platform }) => {
	try {
		const db = getDb(platform);
		const id = parseInt(params.id, 10);
		if (isNaN(id)) return errorResponse('Invalid link ID', 400);

		const body = (await request.json()) as Record<string, unknown>;
		const updates: { override_url?: string | null; override_text?: string | null; action?: string } = {};

		// Only accept known fields
		if ('override_url' in body) updates.override_url = (body.override_url as string) ?? null;
		if ('override_text' in body) updates.override_text = (body.override_text as string) ?? null;
		if ('action' in body) {
			const action = body.action as string;
			if (!['default', 'unlink', 'remove'].includes(action)) {
				return errorResponse('Invalid action — must be default, unlink, or remove', 400);
			}
			updates.action = action;
		}

		const changed = await updateLinkOverride(db, id, updates);
		if (changed === 0) return errorResponse('Link not found', 404);

		const link = await getLinkById(db, id);
		return jsonResponse({ ok: true, data: link });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return errorResponse(msg);
	}
};
