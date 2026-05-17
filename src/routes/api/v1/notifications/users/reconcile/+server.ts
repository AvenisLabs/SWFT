// +server.ts v0.1.0 — POST /api/v1/notifications/users/reconcile
// Force-syncs the D1 notif_users table to the Cloudflare Access Group.
// Used to recover from drift (CF API failures during prior writes).

import type { RequestHandler } from './$types';
import { getDb, queryAll } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { configFromEnv, writeAllowlist, readAllowlist } from '$lib/server/cf-access';

export const POST: RequestHandler = async ({ locals, platform }) => {
	if (locals.authUser?.role !== 'admin') {
		return errorResponse('Admin role required.', 403);
	}
	const cfg = configFromEnv(platform?.env ?? {});
	if (!cfg) {
		return errorResponse('Cloudflare Access not configured (missing CF_API_TOKEN / CF_ACCOUNT_ID / CF_ACCESS_GROUP_ID).', 400);
	}

	try {
		const db = getDb(platform);
		const rows = await queryAll<{ email: string }>(db, 'SELECT email FROM notif_users');
		await writeAllowlist(cfg, rows.map(r => r.email));

		// Re-read drift after sync (should be empty).
		const cfEmails = await readAllowlist(cfg);
		const dbSet = new Set(rows.map(r => r.email.toLowerCase()));
		const cfSet = new Set(cfEmails.map(e => e.toLowerCase()));
		const drift = {
			onlyInDb: [...dbSet].filter(e => !cfSet.has(e)),
			onlyInCf: [...cfSet].filter(e => !dbSet.has(e)),
		};
		return jsonResponse({ ok: true, data: { drift } });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return errorResponse(`Reconcile failed: ${msg}`);
	}
};
