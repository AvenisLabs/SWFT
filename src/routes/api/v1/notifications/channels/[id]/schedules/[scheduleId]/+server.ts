// +server.ts v0.1.0 — PUT / DELETE one schedule. Owner-scoped via channel.

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getChannel } from '$lib/server/notif-channels';
import { updateSchedule, deleteSchedule, validateSchedule, type SchedulePatch } from '$lib/server/notif-schedules';

function requireUser(locals: App.Locals): string {
	if (!locals.authUser) throw new Error('auth_required');
	return locals.authUser.email;
}

function parseIds(params: Record<string, string | undefined>): { channelId: number; scheduleId: number } | null {
	const channelId = Number(params.id);
	const scheduleId = Number(params.scheduleId);
	if (!Number.isFinite(channelId) || channelId <= 0) return null;
	if (!Number.isFinite(scheduleId) || scheduleId <= 0) return null;
	return { channelId, scheduleId };
}

export const PUT: RequestHandler = async ({ params, locals, platform, request }) => {
	try {
		const email = requireUser(locals);
		const ids = parseIds(params);
		if (!ids) return errorResponse('Invalid id parameters.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, ids.channelId, email);
		if (!channel) return errorResponse('Channel not found.', 404);

		const body = (await request.json()) as SchedulePatch;
		const err = validateSchedule(body);
		if (err) return errorResponse(err, 400);

		const updated = await updateSchedule(db, ids.scheduleId, ids.channelId, body);
		if (!updated) return errorResponse('Schedule not found.', 404);
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
		const ids = parseIds(params);
		if (!ids) return errorResponse('Invalid id parameters.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, ids.channelId, email);
		if (!channel) return errorResponse('Channel not found.', 404);

		const ok = await deleteSchedule(db, ids.scheduleId, ids.channelId);
		if (!ok) return errorResponse('Schedule not found.', 404);
		return jsonResponse({ ok: true, data: { id: ids.scheduleId } });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
