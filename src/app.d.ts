/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

// v0.3.0 — Platform bindings for Cloudflare Pages + D1

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				CRON_WORKER_URL: string;
				BOM_API_KEY?: string;
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
