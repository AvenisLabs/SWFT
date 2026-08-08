// +server.ts v0.1.0 — GET / PUT / DELETE /api/v1/notifications/channels/[id]
// All operations scoped to locals.authUser.email so a user can only touch
// their own channels.

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import {
	getChannel,
	updateChannel,
	deleteChannel,
	validateTarget,
	normalizeTarget,
} from '$lib/server/notif-channels';

function requireUser(locals: App.Locals): string {
	if (!locals.authUser) throw new Error('auth_required');
	return locals.authUser.email;
}

function parseId(raw: string | undefined): number | null {
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : null;
}

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const email = requireUser(locals);
		const id = parseId(params.id);
		if (!id) return errorResponse('Invalid channel id.', 400);
		const channel = await getChannel(getDb(platform), id, email);
		if (!channel) return errorResponse('Channel not found.', 404);
		return jsonResponse({ ok: true, data: channel });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};

export const PUT: RequestHandler = async ({ params, locals, platform, request }) => {
	try {
		const email = requireUser(locals);
		const id = parseId(params.id);
		if (!id) return errorResponse('Invalid channel id.', 400);

		const db = getDb(platform);
		const existing = await getChannel(db, id, email);
		if (!existing) return errorResponse('Channel not found.', 404);

		const body = (await request.json()) as {
			name?: string;
			target?: string;
			mention?: string | null;
			enabled?: boolean;
		};

		const patch: Parameters<typeof updateChannel>[3] = {};
		if (body.name !== undefined) {
			const n = body.name.trim();
			if (!n) return errorResponse('Name cannot be empty.', 400);
			patch.name = n;
		}
		if (body.target !== undefined) {
			const t = body.target.trim();
			const err = validateTarget(existing.kind, t);
			if (err) return errorResponse(err, 400);
			patch.target = normalizeTarget(existing.kind, t);
		}
		if (body.mention !== undefined) {
			patch.mention = body.mention?.trim() ? body.mention.trim() : null;
		}
		if (body.enabled !== undefined) {
			patch.enabled = body.enabled ? 1 : 0;
		}

		const updated = await updateChannel(db, id, email, patch);
		if (!updated) return errorResponse('Channel not found.', 404);
		return jsonResponse({ ok: true, data: updated });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const email = requireUser(locals);
		const id = parseId(params.id);
		if (!id) return errorResponse('Invalid channel id.', 400);
		const ok = await deleteChannel(getDb(platform), id, email);
		if (!ok) return errorResponse('Channel not found.', 404);
		return jsonResponse({ ok: true, data: { id } });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
