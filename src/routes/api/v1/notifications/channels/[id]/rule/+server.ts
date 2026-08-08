// +server.ts v0.1.0 — PUT /api/v1/notifications/channels/[id]/rule
// Updates the rule row for one channel. Owner-scoped.

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getChannel } from '$lib/server/notif-channels';
import { updateRule, validateRulePatch } from '$lib/server/notif-rules';

function requireUser(locals: App.Locals): string {
	if (!locals.authUser) throw new Error('auth_required');
	return locals.authUser.email;
}

export const PUT: RequestHandler = async ({ params, locals, platform, request }) => {
	try {
		const email = requireUser(locals);
		const id = Number(params.id);
		if (!Number.isFinite(id) || id <= 0) return errorResponse('Invalid channel id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, id, email);
		if (!channel) return errorResponse('Channel not found.', 404);

		const body = (await request.json()) as Record<string, unknown>;
		// Coerce booleans (forms often submit them as 1/0 ints already, but
		// the API also accepts true/false from JSON).
		const patch: Record<string, unknown> = {};
		for (const k of [
			'threshold_kp',
			'immediate_threshold_kp',
			'summary_interval_min',
			'burst_window_max_hours',
			'off_hours_digest_time',
			'off_hours_digest_on_resume',
			'storm_end_notify',
			'quiet_below_g1',
		] as const) {
			if (k in body) patch[k] = body[k];
		}

		const validationError = validateRulePatch(patch);
		if (validationError) return errorResponse(validationError, 400);

		const updated = await updateRule(db, id, patch);
		if (!updated) return errorResponse('Rule update failed.', 500);
		return jsonResponse({ ok: true, data: updated });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
