/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

// v0.4.0 — Platform bindings for Cloudflare Pages + D1 + Locals (CF Access user)

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				CRON_WORKER_URL: string;
				BOM_API_KEY?: string;
				// Cloudflare API token (Access: Apps and Policies — Edit) used to
				// sync the email allowlist to a CF Access Group.
				CF_API_TOKEN?: string;
				CF_ACCOUNT_ID?: string;
				CF_ACCESS_GROUP_ID?: string;
				// TextBelt API key for SMS test-sends from the admin UI.
				// 'textbelt' uses the free public 1/day key; a paid key is required
				// for production. The cron worker uses the same key from its own env.
				TEXTBELT_API_KEY?: string;
				// Dev-only: lets you impersonate a user when no CF Access header
				// exists (e.g. wrangler dev / vite). MUST be unset in production.
				DEV_AUTH_EMAIL?: string;
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
		interface Locals {
			/** Email from CF Access header, or null if the request is unauthenticated. */
			authEmail: string | null;
			/** Row from notif_users for the auth'd email, or null if not in the allowlist. */
			authUser: { email: string; role: 'user' | 'admin' } | null;
		}
	}
}

export {};
