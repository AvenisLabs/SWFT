// +server.ts v0.1.0 — GET (list) / POST (create) schedules for a channel.

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getChannel } from '$lib/server/notif-channels';
import { listSchedules, createSchedule, validateSchedule, type SchedulePatch } from '$lib/server/notif-schedules';

function requireUser(locals: App.Locals): string {
	if (!locals.authUser) throw new Error('auth_required');
	return locals.authUser.email;
}

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const email = requireUser(locals);
		const id = Number(params.id);
		if (!Number.isFinite(id) || id <= 0) return errorResponse('Invalid channel id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, id, email);
		if (!channel) return errorResponse('Channel not found.', 404);

		const schedules = await listSchedules(db, id);
		return jsonResponse({ ok: true, data: schedules });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};

export const POST: RequestHandler = async ({ params, locals, platform, request }) => {
	try {
		const email = requireUser(locals);
		const id = Number(params.id);
		if (!Number.isFinite(id) || id <= 0) return errorResponse('Invalid channel id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, id, email);
		if (!channel) return errorResponse('Channel not found.', 404);

		const body = (await request.json()) as SchedulePatch;
		const err = validateSchedule(body);
		if (err) return errorResponse(err, 400);

		const schedule = await createSchedule(db, id, body);
		return jsonResponse({ ok: true, data: schedule });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
