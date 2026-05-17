// textbelt-send.ts v0.1.0 — Single TextBelt POST primitive for the SvelteKit
// side. Mirrors workers/cron-ingest/src/lib/notif-send.ts (sendTextBelt) but
// kept independent so the SvelteKit bundle stays self-contained.

export interface TextBeltResult {
	ok: boolean;
	status: number;
	error: string | null;
	quotaRemaining?: number;
}

export async function sendTextBelt(
	phone: string,
	message: string,
	apiKey: string
): Promise<TextBeltResult> {
	try {
		const params = new URLSearchParams({ phone, message, key: apiKey });
		const res = await fetch('https://textbelt.com/text', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString(),
		});
		const body = (await res.json().catch(() => null)) as
			| { success: boolean; quotaRemaining?: number; error?: string; textId?: string }
			| null;
		if (!body) return { ok: false, status: res.status, error: 'TextBelt: non-JSON response' };
		if (body.success) {
			return { ok: true, status: res.status, error: null, quotaRemaining: body.quotaRemaining };
		}
		return { ok: false, status: res.status, error: body.error ?? 'TextBelt rejected the request' };
	} catch (err) {
		return { ok: false, status: 0, error: err instanceof Error ? err.message : 'fetch failed' };
	}
}

/** Build a short test-send message for SMS. */
export function buildTextBeltTestMessage(channelName: string): string {
	return `SWFT test: webhook for "${channelName}" is configured. Reply STOP to opt out.`.slice(0, 160);
}
