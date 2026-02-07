/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

// v0.1.0 — Platform bindings for Cloudflare Pages + D1

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
