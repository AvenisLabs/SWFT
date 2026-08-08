// +server.ts v0.2.0 — POST /api/v1/notifications/channels/[id]/test
// Sends a test message to the channel's destination. Discord goes via the
// Discord webhook; SMS goes via TextBelt. Test sends bypass the 12h SMS cap
// because the user is intentionally testing.

import type { RequestHandler } from './$types';
import { getDb, queryFirst } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getChannel, recordDelivery } from '$lib/server/notif-channels';
import { sendDiscord, buildTestPayload } from '$lib/server/discord-send';
import { sendTextBelt, buildTextBeltTestMessage } from '$lib/server/textbelt-send';

/** Per-channel rate-limit window for the test-send endpoint. Prevents users
 *  from accidentally spamming the destination (and burning TextBelt quota)
 *  via repeated button presses. */
const TEST_SEND_COOLDOWN_MS = 60_000;

function requireUser(locals: App.Locals): string {
	if (!locals.authUser) throw new Error('auth_required');
	return locals.authUser.email;
}

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const email = requireUser(locals);
		const id = Number(params.id);
		if (!Number.isFinite(id) || id <= 0) return errorResponse('Invalid channel id.', 400);

		const db = getDb(platform);
		const channel = await getChannel(db, id, email);
		if (!channel) return errorResponse('Channel not found.', 404);
		if (!channel.enabled) return errorResponse('Channel is disabled.', 400);

		// Cooldown: refuse if a test was sent within the last minute.
		const lastTest = await queryFirst<{ sent_at: string }>(
			db,
			"SELECT sent_at FROM notif_deliveries WHERE channel_id = ? AND kind = 'test' ORDER BY sent_at DESC LIMIT 1",
			[channel.id]
		);
		if (lastTest) {
			const ageMs = Date.now() - new Date(lastTest.sent_at).getTime();
			if (ageMs < TEST_SEND_COOLDOWN_MS) {
				const remainingSec = Math.ceil((TEST_SEND_COOLDOWN_MS - ageMs) / 1000);
				return errorResponse(`Test-send cooldown active. Try again in ${remainingSec}s.`, 429);
			}
		}

		if (channel.kind === 'discord') {
			const result = await sendDiscord(channel.target, buildTestPayload(channel.name, channel.mention));
			await recordDelivery(db, {
				channel_id: channel.id,
				channel_name: channel.name,
				kind: 'test',
				payload_summary: `Test message to discord channel "${channel.name}"`,
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
			return jsonResponse({ ok: true, data: { status: result.status } });
		}

		// SMS branch.
		const apiKey = platform?.env?.TEXTBELT_API_KEY;
		if (!apiKey) {
			return errorResponse(
				'TEXTBELT_API_KEY is not configured. Add it as a Pages secret to enable SMS.',
				503
			);
		}
		const msg = buildTextBeltTestMessage(channel.name);
		const result = await sendTextBelt(channel.target, msg, apiKey);
		await recordDelivery(db, {
			channel_id: channel.id,
			channel_name: channel.name,
			kind: 'test',
			payload_summary: `Test SMS to "${channel.name}" (${channel.target})`,
			ok: result.ok,
			http_status: result.status,
			error: result.error,
		});
		if (!result.ok) {
			return errorResponse(`TextBelt error: ${result.error ?? 'unknown'}`, 502);
		}
		return jsonResponse({
			ok: true,
			data: { status: result.status, quotaRemaining: result.quotaRemaining ?? null },
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'auth_required') return errorResponse('Authentication required.', 401);
		return errorResponse(msg);
	}
};
