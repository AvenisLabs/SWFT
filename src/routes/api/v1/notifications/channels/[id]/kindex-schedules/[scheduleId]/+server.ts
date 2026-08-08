// +server.ts v0.1.0 - Update/delete one scheduled K-index push.

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getChannel } from '$lib/server/notif-channels';
import {
	deleteKIndexPushSchedule,
	updateKIndexPushSchedule,
	validateKIndexSchedule,
} from '$lib/server/notif-kindex-schedules';

function requireUser(locals: App.Locals): string {
	if (!locals.authUser) throw new Error('auth_required');
	return locals.authUser.email;
}

function parseId(raw: string | undefined): number | null {
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : null;
}

export const PUT: RequestHandler = async ({ params, locals, platform, request }) => {
	try {
		const email = requireUser(locals);
		const channelId = parseId(params.id);
		const scheduleId = parseId(params.scheduleId);
		if (!channelId || !scheduleId) return errorResponse('Invalid id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, channelId, email);
		if (!channel) return errorResponse('Channel not found.', 404);
		if (channel.kind !== 'discord') {
			return errorResponse('Scheduled K-index pushes require a Discord webhook channel.', 400);
		}

		const body = (await request.json()) as Record<string, unknown>;
		const validationError = validateKIndexSchedule(body);
		if (validationError) return errorResponse(validationError, 400);

		const patch: Parameters<typeof updateKIndexPushSchedule>[3] = {};
		if ('push_time' in body) patch.push_time = body.push_time as string;
		if ('timezone' in body) patch.timezone = body.timezone as string;
		if ('lookback_hours' in body) patch.lookback_hours = Number(body.lookback_hours);
		if ('enabled' in body) patch.enabled = body.enabled ? 1 : 0;

		const updated = await updateKIndexPushSchedule(db, channelId, scheduleId, patch);
		if (!updated) return errorResponse('K-index push schedule not found.', 404);
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
		const channelId = parseId(params.id);
		const scheduleId = parseId(params.scheduleId);
		if (!channelId || !scheduleId) return errorResponse('Invalid id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, channelId, email);
		if (!channel) return errorResponse('Channel not found.', 404);

		const ok = await deleteKIndexPushSchedule(db, channelId, scheduleId);
		if (!ok) return errorResponse('K-index push schedule not found.', 404);
		return jsonResponse({ ok: true, data: { id: scheduleId } });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
