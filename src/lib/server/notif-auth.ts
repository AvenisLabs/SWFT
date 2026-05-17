// notif-auth.ts v0.1.0 — Read CF Access identity header, resolve to notif_users row.
//
// Cloudflare Access verifies the user (Google IdP) at the edge and injects
// `Cf-Access-Authenticated-User-Email` into the upstream request. CF strips
// any spoofed copy of this header from the client, so reading it directly is
// safe *as long as* the route is fronted by an Access application. The route
// configuration for /notifications/* in the CF dashboard is what enforces that.
//
// Dev fallback: when DEV_AUTH_EMAIL is set in wrangler vars (local dev only,
// never in production), we use that email instead. Keeps `vite dev` usable
// without the CF edge in front.

import type { D1Database } from '@cloudflare/workers-types';
import { queryFirst } from './db';

const ACCESS_HEADER = 'Cf-Access-Authenticated-User-Email';

export interface NotifUser {
	email: string;
	role: 'user' | 'admin';
}

/** Extract authenticated email from the CF Access header (or dev fallback). */
export function getAuthEmail(request: Request, devEmail?: string): string | null {
	const headerEmail = request.headers.get(ACCESS_HEADER);
	if (headerEmail) return headerEmail.toLowerCase().trim();
	if (devEmail) return devEmail.toLowerCase().trim();
	return null;
}

/** Look up the email in notif_users. Returns null if not in the allowlist. */
export async function loadAuthUser(db: D1Database, email: string | null): Promise<NotifUser | null> {
	if (!email) return null;
	const row = await queryFirst<{ email: string; role: string }>(
		db,
		'SELECT email, role FROM notif_users WHERE email = ?',
		[email]
	);
	if (!row) return null;
	const role = row.role === 'admin' ? 'admin' : 'user';
	return { email: row.email, role };
}

/** Bump last_login_at for the user (fire-and-forget — best-effort). */
export async function touchLastLogin(db: D1Database, email: string): Promise<void> {
	try {
		await db
			.prepare("UPDATE notif_users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE email = ?")
			.bind(email)
			.run();
	} catch {
		// non-fatal — login still works
	}
}
