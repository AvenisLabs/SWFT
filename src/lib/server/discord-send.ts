// discord-send.ts v0.1.0 — Send a payload to a Discord webhook URL.
// This is the dispatch primitive shared by the test-send button (basic content)
// and the cron dispatcher (full embeds, built in task #9). The function is
// intentionally dumb: it takes a fully-formed payload and POSTs it.

export interface DiscordPayload {
	content?: string;
	username?: string;
	avatar_url?: string;
	embeds?: DiscordEmbed[];
	allowed_mentions?: {
		parse?: Array<'roles' | 'users' | 'everyone'>;
		roles?: string[];
		users?: string[];
	};
}

export interface DiscordEmbed {
	title?: string;
	description?: string;
	url?: string;
	color?: number; // 0xRRGGBB
	timestamp?: string; // ISO 8601
	footer?: { text: string; icon_url?: string };
	author?: { name: string; url?: string; icon_url?: string };
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export interface DiscordSendResult {
	ok: boolean;
	status: number;
	error: string | null;
}

/**
 * POST `payload` to `webhookUrl`. Returns a result with HTTP status and any
 * error message. Never throws — failures are returned in the result. Adds
 * `?wait=true` so Discord returns 200 (instead of 204) when the message is
 * successfully created, giving us a more reliable health signal.
 */
export async function sendDiscord(
	webhookUrl: string,
	payload: DiscordPayload
): Promise<DiscordSendResult> {
	try {
		const url = webhookUrl.includes('?') ? `${webhookUrl}&wait=true` : `${webhookUrl}?wait=true`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (res.ok) {
			return { ok: true, status: res.status, error: null };
		}
		const body = await res.text().catch(() => '');
		return { ok: false, status: res.status, error: body.slice(0, 500) || res.statusText };
	} catch (err) {
		return {
			ok: false,
			status: 0,
			error: err instanceof Error ? err.message : 'Network error',
		};
	}
}

/** Build a minimal test-send payload so the user can confirm a webhook is alive. */
export function buildTestPayload(channelName: string, mention: string | null): DiscordPayload {
	const mentionPrefix = mention ? `${mention} ` : '';
	return {
		username: 'SWFT Notifications',
		content: `${mentionPrefix}Test message from SWFT for channel **${channelName}**. If you can read this, the webhook is wired up correctly.`,
		allowed_mentions: { parse: mention ? ['roles', 'users'] : [] },
	};
}
