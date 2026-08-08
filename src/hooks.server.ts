// hooks.server.ts v0.3.2 — CORS for /api/*, lazy CF Access identity resolution
// (only on protected routes), /notifications gating, and a hard block on
// pages.dev for notification paths.

import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getAuthEmail, loadAuthUser, touchLastLogin } from '$lib/server/notif-auth';
import { getDb } from '$lib/server/db';

const ALLOWED_ORIGINS = ['*'];

/** Canonical public domain. Notifications pages only render on this hostname;
 *  the auto-assigned `*.pages.dev` URL is blocked to prevent CF Access bypass
 *  via the always-on Cloudflare-provided URL. (Localhost passes via the
 *  pages.dev-suffix check below — vite dev hostnames never end in pages.dev.) */
const CANONICAL_HOST = 'swft.skypixels.org';

export const handle: Handle = async ({ event, resolve }) => {
	// 1) CORS preflight for API routes (cheap fast path)
	if (event.request.method === 'OPTIONS' && event.url.pathname.startsWith('/api/')) {
		return new Response(null, {
			status: 204,
			headers: getCorsHeaders(event.request),
		});
	}

	// 1a) Block notification routes on the auto-assigned *.pages.dev hostname.
	// CF Pages always exposes the project URL alongside any custom domain and
	// you cannot disable it server-side. Without this check, a user who knows
	// the pages.dev URL could hit /notifications there and bypass whichever
	// hostname-scoped CF Access app is configured for the canonical domain.
	// Return 410 Gone with a hint pointing to the canonical domain.
	const host = event.url.hostname;
	if (host.endsWith('.pages.dev') && isNotificationRoute(event.url.pathname)) {
		return new Response(
			`This page is only available on the canonical domain.\nGo to https://${CANONICAL_HOST}${event.url.pathname}\n`,
			{ status: 410, headers: { 'Content-Type': 'text/plain' } }
		);
	}

	// 2) Identity is LAZY. Only protected routes need CF Access identity, so
	// public pages (the homepage, API endpoints, etc.) skip the JWT decode
	// and the D1 user lookup entirely. Earlier versions of this hook resolved
	// identity on every request, which added a serial D1 round-trip to every
	// SSR pageload for any user with an active CF Access session.
	event.locals.authEmail = null;
	event.locals.authUser = null;

	// 3) /notifications gate. CF Access is the primary gate at the edge; this
	// is the defense-in-depth check that ensures a request reaching SvelteKit
	// also exists in notif_users (the D1 mirror).
	if (isProtectedRoute(event.url.pathname)) {
		const devEmail = event.platform?.env?.DEV_AUTH_EMAIL;
		if (devEmail && !event.request.headers.get('Cf-Access-Authenticated-User-Email')) {
			// Loud warning if DEV_AUTH_EMAIL is set anywhere a real CF Access
			// header could have been expected — a misconfigured production
			// secret would hand impersonation to anyone.
			console.warn(`[hooks] DEV_AUTH_EMAIL is set (${devEmail}); MUST be unset in production.`);
		}
		const email = getAuthEmail(event.request, devEmail);
		if (!email) {
			throw error(401, 'Authentication required. This page is protected by Cloudflare Access.');
		}
		event.locals.authEmail = email;
		if (!event.platform?.env?.DB) {
			throw error(503, 'Database unavailable.');
		}
		const user = await loadAuthUser(getDb(event.platform), email);
		if (!user) {
			throw error(
				403,
				`Email ${email} is not authorized. Contact info@207systems.com for access.`
			);
		}
		event.locals.authUser = user;
		// Best-effort last-login bookkeeping. Non-blocking.
		event.platform?.context?.waitUntil(touchLastLogin(getDb(event.platform), email));
	}

	const response = await resolve(event);

	// 4) Attach CORS headers to /api/* responses
	if (event.url.pathname.startsWith('/api/')) {
		const corsHeaders = getCorsHeaders(event.request);
		for (const [key, value] of Object.entries(corsHeaders)) {
			response.headers.set(key, value);
		}
	}

	return response;
};

/** Routes that require allowlist membership (in addition to CF Access at the
 *  edge). Covers both the SvelteKit pages and the JSON API endpoints — the
 *  API endpoints are the same allowlist gate even though they're under a
 *  different path prefix. */
function isProtectedRoute(pathname: string): boolean {
	return isNotificationRoute(pathname);
}

/** True if the path is part of the notifications feature (page or API). */
function isNotificationRoute(pathname: string): boolean {
	return (
		pathname === '/notifications' ||
		pathname.startsWith('/notifications/') ||
		pathname.startsWith('/api/v1/notifications/')
	);
}

function getCorsHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get('Origin') ?? '*';
	const allowedOrigin = ALLOWED_ORIGINS.includes('*') ? '*' : origin;

	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};
}
