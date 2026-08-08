// +server.ts v0.1.0 - List/create scheduled K-index pushes for one channel.

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getChannel } from '$lib/server/notif-channels';
import {
	createKIndexPushSchedule,
	listKIndexPushSchedules,
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

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const email = requireUser(locals);
		const channelId = parseId(params.id);
		if (!channelId) return errorResponse('Invalid channel id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, channelId, email);
		if (!channel) return errorResponse('Channel not found.', 404);

		const schedules = await listKIndexPushSchedules(db, channelId);
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
		const channelId = parseId(params.id);
		if (!channelId) return errorResponse('Invalid channel id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, channelId, email);
		if (!channel) return errorResponse('Channel not found.', 404);
		if (channel.kind !== 'discord') {
			return errorResponse('Scheduled K-index pushes require a Discord webhook channel.', 400);
		}

		const body = (await request.json()) as {
			push_time?: string;
			timezone?: string;
			lookback_hours?: number;
			enabled?: boolean;
		};
		const validationError = validateKIndexSchedule(body);
		if (validationError) return errorResponse(validationError, 400);
		if (!body.push_time || !body.timezone || body.lookback_hours === undefined) {
			return errorResponse('Push time, timezone, and lookback are required.', 400);
		}

		const schedule = await createKIndexPushSchedule(db, channelId, {
			push_time: body.push_time,
			timezone: body.timezone,
			lookback_hours: Number(body.lookback_hours),
			enabled: body.enabled ?? true,
		});
		return jsonResponse({ ok: true, data: schedule });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
