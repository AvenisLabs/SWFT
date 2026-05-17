// +server.ts v0.1.0 — GET (list) / POST (create) /api/v1/notifications/channels
// Scoped to the authenticated user (locals.authUser). hooks.server.ts has
// already verified the user is allow-listed.

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import {
	listChannels,
	createChannel,
	validateTarget,
	normalizeTarget,
	type ChannelKind,
} from '$lib/server/notif-channels';

function requireUser(locals: App.Locals): string {
	if (!locals.authUser) throw new Error('auth_required');
	return locals.authUser.email;
}

export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		const email = requireUser(locals);
		const channels = await listChannels(getDb(platform), email);
		return jsonResponse({ ok: true, data: channels });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};

export const POST: RequestHandler = async ({ locals, platform, request }) => {
	try {
		const email = requireUser(locals);
		const body = (await request.json()) as {
			name?: string;
			kind?: string;
			target?: string;
			mention?: string | null;
		};

		const name = (body.name ?? '').trim();
		const kind = body.kind === 'sms' ? 'sms' : body.kind === 'discord' ? 'discord' : null;
		const target = (body.target ?? '').trim();
		const mention = body.mention?.trim() ? body.mention.trim() : null;

		if (!name) return errorResponse('Name is required.', 400);
		if (!kind) return errorResponse('Kind must be "discord" or "sms".', 400);
		const targetErr = validateTarget(kind as ChannelKind, target);
		if (targetErr) return errorResponse(targetErr, 400);

		const channel = await createChannel(getDb(platform), {
			owner_email: email,
			name,
			kind: kind as ChannelKind,
			target: normalizeTarget(kind as ChannelKind, target),
			mention,
		});
		return jsonResponse({ ok: true, data: channel });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
