// +server.ts v0.1.0 — POST /api/v1/admin/link-check — Proxy manual check trigger to cron worker
import type { RequestHandler } from './$types';
import { jsonResponse, errorResponse } from '$lib/server/cache';

export const POST: RequestHandler = async ({ platform }) => {
	try {
		const cronUrl = platform?.env?.CRON_WORKER_URL;
		if (!cronUrl) return errorResponse('CRON_WORKER_URL not configured', 500);

		const res = await fetch(`${cronUrl}/check-links`, { method: 'POST' });
		const data = (await res.json()) as Record<string, unknown>;

		if (!res.ok) {
			return errorResponse((data.error as string) ?? 'Cron worker returned error', res.status);
		}

		return jsonResponse({ ok: true, data });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return errorResponse(`Failed to trigger link check: ${msg}`);
	}
};
