// notif-send.ts v0.1.0 — Outbound HTTP for Discord webhooks + TextBelt SMS.
// Pure I/O — payload building lives in notif-embeds.ts.

import type { DiscordPayload } from './notif-embeds';

export interface SendResult {
	ok: boolean;
	status: number;
	error: string | null;
}

export async function sendDiscord(webhookUrl: string, payload: DiscordPayload): Promise<SendResult> {
	try {
		const url = webhookUrl.includes('?') ? `${webhookUrl}&wait=true` : `${webhookUrl}?wait=true`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (res.ok) return { ok: true, status: res.status, error: null };
		const body = await res.text().catch(() => '');
		return { ok: false, status: res.status, error: (body || res.statusText).slice(0, 500) };
	} catch (err) {
		return { ok: false, status: 0, error: err instanceof Error ? err.message : 'fetch failed' };
	}
}

/** Send via TextBelt. apiKey 'textbelt' is the free public 1/day key — for
 *  production usage pass a paid key. SWFT enforces its own 12h cap on top. */
export async function sendTextBelt(
	phone: string,
	message: string,
	apiKey: string
): Promise<SendResult> {
	try {
		const params = new URLSearchParams({ phone, message, key: apiKey });
		const res = await fetch('https://textbelt.com/text', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString(),
		});
		const body = (await res.json().catch(() => null)) as
			| { success: boolean; quotaRemaining?: number; error?: string }
			| null;
		if (!body) {
			return { ok: false, status: res.status, error: 'TextBelt: non-JSON response' };
		}
		if (body.success) return { ok: true, status: res.status, error: null };
		return { ok: false, status: res.status, error: body.error ?? 'TextBelt rejected the request' };
	} catch (err) {
		return { ok: false, status: 0, error: err instanceof Error ? err.message : 'fetch failed' };
	}
}
