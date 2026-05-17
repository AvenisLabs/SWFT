// +page.server.ts v0.1.0 — Admin-only: load notif_users + CF Access drift detection.

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, queryAll } from '$lib/server/db';
import { configFromEnv, readAllowlist } from '$lib/server/cf-access';

interface UserRow {
	email: string;
	role: string;
	created_at: string;
	last_login_at: string | null;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.authUser?.role !== 'admin') {
		throw error(403, 'Admin role required.');
	}
	const db = getDb(platform);
	const users = await queryAll<UserRow>(
		db,
		'SELECT email, role, created_at, last_login_at FROM notif_users ORDER BY created_at ASC'
	);

	// Best-effort drift detection. If CF API isn't configured (or fails),
	// the page still renders — drift just shows as 'unknown'.
	let cfEmails: string[] | null = null;
	let cfError: string | null = null;
	const cfg = configFromEnv(platform?.env ?? {});
	if (cfg) {
		try {
			cfEmails = await readAllowlist(cfg);
		} catch (err) {
			cfError = err instanceof Error ? err.message : 'CF Access read failed';
		}
	}

	const dbSet = new Set(users.map(u => u.email.toLowerCase()));
	const cfSet = cfEmails ? new Set(cfEmails.map(e => e.toLowerCase())) : null;

	const drift = cfSet
		? {
				onlyInDb: [...dbSet].filter(e => !cfSet.has(e)),
				onlyInCf: [...cfSet].filter(e => !dbSet.has(e)),
			}
		: null;

	return {
		users,
		cfConfigured: cfg !== null,
		cfError,
		drift,
	};
};
