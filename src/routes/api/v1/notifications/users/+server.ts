// +server.ts v0.1.0 — GET/POST /api/v1/notifications/users
// Lists allowlisted emails and adds new ones. Admin-only. POST also pushes the
// updated email list to the Cloudflare Access Group so the edge gate updates.

import type { RequestHandler } from './$types';
import type { D1Database } from '@cloudflare/workers-types';
import { getDb, queryAll, execute } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { configFromEnv, writeAllowlist, readAllowlist } from '$lib/server/cf-access';

interface UserRow {
	email: string;
	role: string;
	created_at: string;
	last_login_at: string | null;
}

function requireAdmin(locals: App.Locals) {
	if (locals.authUser?.role !== 'admin') {
		throw new Error('admin_required');
	}
}

async function loadUsersAndDrift(db: D1Database, env: Partial<App.Platform['env']>) {
	const users = await queryAll<UserRow>(
		db,
		'SELECT email, role, created_at, last_login_at FROM notif_users ORDER BY created_at ASC'
	);
	const cfg = configFromEnv(env);
	let drift: { onlyInDb: string[]; onlyInCf: string[] } | null = null;
	if (cfg) {
		try {
			const cfEmails = await readAllowlist(cfg);
			const dbSet = new Set(users.map(u => u.email.toLowerCase()));
			const cfSet = new Set(cfEmails.map(e => e.toLowerCase()));
			drift = {
				onlyInDb: [...dbSet].filter(e => !cfSet.has(e)),
				onlyInCf: [...cfSet].filter(e => !dbSet.has(e)),
			};
		} catch {
			// best-effort
		}
	}
	return { users, drift };
}

export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		requireAdmin(locals);
		const db = getDb(platform);
		const result = await loadUsersAndDrift(db, platform?.env ?? {});
		return jsonResponse({ ok: true, data: result });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'admin_required') return errorResponse('Admin role required.', 403);
		return errorResponse(msg);
	}
};

export const POST: RequestHandler = async ({ locals, platform, request }) => {
	try {
		requireAdmin(locals);
		const body = (await request.json()) as { email?: string; role?: string };
		const email = body.email?.trim().toLowerCase();
		const role = body.role === 'admin' ? 'admin' : 'user';
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return errorResponse('Invalid email.', 400);
		}

		const db = getDb(platform);
		await execute(db, 'INSERT OR IGNORE INTO notif_users (email, role) VALUES (?, ?)', [email, role]);
		// If row already existed, update the role (POST as upsert is friendlier than
		// requiring the admin to know whether to POST or PUT).
		await execute(db, 'UPDATE notif_users SET role = ? WHERE email = ?', [role, email]);

		// Sync to CF Access. If this fails we still return success on the D1 op
		// but surface drift in the response — the reconcile button can retry.
		const cfg = configFromEnv(platform?.env ?? {});
		if (cfg) {
			const allRows = await queryAll<{ email: string }>(db, 'SELECT email FROM notif_users');
			try {
				await writeAllowlist(cfg, allRows.map(r => r.email));
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'CF Access sync failed';
				console.error('[notif-users] CF Access sync failed:', msg);
			}
		}

		const result = await loadUsersAndDrift(db, platform?.env ?? {});
		return jsonResponse({ ok: true, data: result });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'admin_required') return errorResponse('Admin role required.', 403);
		return errorResponse(msg);
	}
};
