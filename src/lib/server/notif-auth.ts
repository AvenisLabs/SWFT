// notif-auth.ts v0.2.0 — Read CF Access identity, resolve to notif_users row.
//
// Cloudflare Access verifies the user (Google IdP) at the edge and forwards
// two artifacts to the origin: the signed JWT (`Cf-Access-Jwt-Assertion`,
// always present on authenticated requests) and a convenience email header
// (`Cf-Access-Authenticated-User-Email`, sometimes absent depending on
// Application config). We prefer the header for cheapness but fall back to
// decoding the JWT payload — that's the canonical identity assertion.
//
// Trust model: we do NOT re-verify the JWT signature, because (1) CF Access
// already verified it at the edge before forwarding, and (2) CF globally
// strips any client-provided `cf-*` headers, so the JWT on this request can
// only have been injected by CF infrastructure. For full belt-and-suspenders
// verification, fetch JWKs from `<team>.cloudflareaccess.com/cdn-cgi/access/certs`.
//
// Dev fallback: when DEV_AUTH_EMAIL is set in wrangler vars (local dev only,
// never in production), we use that email instead. Keeps `vite dev` usable
// without the CF edge in front.

import type { D1Database } from '@cloudflare/workers-types';
import { queryFirst } from './db';

const ACCESS_HEADER = 'Cf-Access-Authenticated-User-Email';
const JWT_HEADER = 'Cf-Access-Jwt-Assertion';

export interface NotifUser {
	email: string;
	role: 'user' | 'admin';
}

/** Extract authenticated email from the CF Access identity (header → JWT → dev). */
export function getAuthEmail(request: Request, devEmail?: string): string | null {
	const headerEmail = request.headers.get(ACCESS_HEADER);
	if (headerEmail) return headerEmail.toLowerCase().trim();
	// JWT fallback — the canonical identity assertion. Always set on
	// authenticated CF Access requests even when the convenience email
	// header is omitted by Application config.
	const jwt = request.headers.get(JWT_HEADER);
	if (jwt) {
		const email = extractEmailFromJwt(jwt);
		if (email) return email.toLowerCase().trim();
	}
	if (devEmail) return devEmail.toLowerCase().trim();
	return null;
}

/** Decode the base64url-encoded payload segment of a JWT and return the
 *  `email` claim. Returns null on malformed token. */
function extractEmailFromJwt(jwt: string): string | null {
	const parts = jwt.split('.');
	if (parts.length !== 3) return null;
	try {
		// base64url → base64: swap chars and pad to multiple of 4
		const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
		const json = atob(padded);
		const claims = JSON.parse(json) as Record<string, unknown>;
		const email = claims.email;
		return typeof email === 'string' ? email : null;
	} catch {
		return null;
	}
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
