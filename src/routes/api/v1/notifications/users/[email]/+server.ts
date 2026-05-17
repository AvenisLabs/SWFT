// +server.ts v0.1.0 — PUT/DELETE /api/v1/notifications/users/[email]
// Per-user role update and removal. Admin-only. Both ops re-sync the full
// allowlist to the Cloudflare Access Group.

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
	if (locals.authUser?.role !== 'admin') throw new Error('admin_required');
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

async function syncCfAccess(db: D1Database, env: Partial<App.Platform['env']>) {
	const cfg = configFromEnv(env);
	if (!cfg) return;
	const allRows = await queryAll<{ email: string }>(db, 'SELECT email FROM notif_users');
	try {
		await writeAllowlist(cfg, allRows.map(r => r.email));
	} catch (err) {
		console.error('[notif-users] CF Access sync failed:', err);
	}
}

export const PUT: RequestHandler = async ({ params, locals, platform, request }) => {
	try {
		requireAdmin(locals);
		const email = decodeURIComponent(params.email ?? '').trim().toLowerCase();
		const body = (await request.json()) as { role?: string };
		const role = body.role === 'admin' ? 'admin' : 'user';

		// Guard rail: refuse to demote the last remaining admin.
		const db = getDb(platform);
		if (role === 'user') {
			const admins = await queryAll<{ email: string }>(
				db,
				'SELECT email FROM notif_users WHERE role = ?',
				['admin']
			);
			if (admins.length === 1 && admins[0].email === email) {
				return errorResponse('Cannot demote the last remaining admin.', 400);
			}
		}

		const changed = await execute(db, 'UPDATE notif_users SET role = ? WHERE email = ?', [role, email]);
		if (changed === 0) return errorResponse('User not found.', 404);

		const result = await loadUsersAndDrift(db, platform?.env ?? {});
		return jsonResponse({ ok: true, data: result });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'admin_required') return errorResponse('Admin role required.', 403);
		return errorResponse(msg);
	}
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		requireAdmin(locals);
		const email = decodeURIComponent(params.email ?? '').trim().toLowerCase();
		const db = getDb(platform);

		// Guard rail 1: refuse to delete yourself.
		if (locals.authEmail && locals.authEmail.toLowerCase() === email) {
			return errorResponse('You cannot remove your own account.', 400);
		}
		// Guard rail 2: refuse to delete the last remaining admin.
		const admins = await queryAll<{ email: string }>(
			db,
			'SELECT email FROM notif_users WHERE role = ?',
			['admin']
		);
		if (admins.length === 1 && admins[0].email === email) {
			return errorResponse('Cannot remove the last remaining admin.', 400);
		}

		const changed = await execute(db, 'DELETE FROM notif_users WHERE email = ?', [email]);
		if (changed === 0) return errorResponse('User not found.', 404);

		await syncCfAccess(db, platform?.env ?? {});
		const result = await loadUsersAndDrift(db, platform?.env ?? {});
		return jsonResponse({ ok: true, data: result });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		if (msg === 'admin_required') return errorResponse('Admin role required.', 403);
		return errorResponse(msg);
	}
};
