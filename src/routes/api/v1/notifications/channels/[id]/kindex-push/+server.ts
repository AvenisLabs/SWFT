// +server.ts v0.1.0 - POST one-time K-index source push for a notification channel.

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getChannel, recordDelivery } from '$lib/server/notif-channels';
import { sendDiscord } from '$lib/server/discord-send';
import {
	buildKIndexPushPayload,
	fetchKIndexPushSnapshot,
	summarizeKIndexPush,
} from '$lib/shared/kindex-push';
import { isValidTimeZone } from '$lib/utils/timeFormat';

function requireUser(locals: App.Locals): string {
	if (!locals.authUser) throw new Error('auth_required');
	return locals.authUser.email;
}

export const POST: RequestHandler = async ({ params, locals, platform, request }) => {
	try {
		const email = requireUser(locals);
		const id = Number(params.id);
		if (!Number.isFinite(id) || id <= 0) return errorResponse('Invalid channel id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, id, email);
		if (!channel) return errorResponse('Channel not found.', 404);
		if (!channel.enabled) return errorResponse('Channel is disabled.', 400);
		if (channel.kind !== 'discord') {
			return errorResponse('K-index pushes require a Discord webhook channel.', 400);
		}

		const body = (await request.json().catch(() => ({}))) as {
			timezone?: string | null;
			lookback_hours?: number;
		};
		const lookbackHours = Math.max(1, Math.min(12, Math.trunc(Number(body.lookback_hours ?? 6))));
		const timezone = isValidTimeZone(body.timezone) ? body.timezone : null;

		const snapshot = await fetchKIndexPushSnapshot(lookbackHours, timezone);
		const payload = buildKIndexPushPayload(channel.name, channel.mention, snapshot);
		const result = await sendDiscord(channel.target, payload);

		await recordDelivery(db, {
			channel_id: channel.id,
			channel_name: channel.name,
			kind: 'kindex_push',
			payload_summary: summarizeKIndexPush(snapshot),
			ok: result.ok,
			http_status: result.status,
			error: result.error,
		});

		if (!result.ok) {
			return errorResponse(
				`Webhook returned ${result.status}: ${result.error ?? 'unknown error'}`,
				502
			);
		}
		return jsonResponse({ ok: true, data: { status: result.status, snapshot } });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
