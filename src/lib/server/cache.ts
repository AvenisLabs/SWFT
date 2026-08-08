// cache.ts v0.4.0 — Cloudflare Cache API wrapper for API responses.
//
// IMPORTANT: cache.put() MUST be awaited (or passed to ctx.waitUntil()).
// A bare fire-and-forget Promise gets cancelled when the response is sent,
// so the put silently never completes and every request misses the cache.
// We discovered this on 2026-05-17 when API latency hit 5–11s per request:
// the cache was effectively disabled and every hit was going to D1 cold.

/** Cache key prefix to namespace our entries */
const CACHE_PREFIX = 'https://swft-web.internal/cache/';

/**
 * Attempts to serve from CF Cache API, falling back to the factory function.
 * Returns the Response directly (with cache headers set).
 */
export async function withCache(
	request: Request,
	cacheKey: string,
	ttlSeconds: number,
	factory: () => Promise<Response>
): Promise<Response> {
	// CF Cache API is only available in the Workers runtime. The standard
	// CacheStorage type has no `default` property — that's a Workers augmentation —
	// so we assert through unknown to access it without pulling in a global types
	// reference that would affect the whole project.
	const cfCaches = caches as unknown as { default?: Cache };
	const cache = cfCaches.default;
	if (!cache) {
		return factory();
	}

	const cacheUrl = new URL(`${CACHE_PREFIX}${cacheKey}`);
	const cacheRequest = new Request(cacheUrl.toString());

	// Check cache
	const cached = await cache.match(cacheRequest);
	if (cached) {
		const response = new Response(cached.body, cached);
		response.headers.set('X-Cache', 'HIT');
		return response;
	}

	// Cache miss — generate fresh response
	const fresh = await factory();

	// Only cache successful responses
	if (fresh.ok) {
		const cloned = fresh.clone();
		const cachedResponse = new Response(cloned.body, {
			status: cloned.status,
			headers: cloned.headers,
		});
		cachedResponse.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
		cachedResponse.headers.set('X-Cache', 'MISS');

		// Must be awaited — bare promises get cancelled when the response is
		// sent in Workers. Adds ~5–10ms to the miss path, but turns the cache
		// from "never works" into "absorbs 99% of traffic."
		try {
			await cache.put(cacheRequest, cachedResponse);
		} catch (err) {
			console.warn('[cache] put failed for', cacheKey, err);
		}
	}

	fresh.headers.set('X-Cache', 'MISS');
	return fresh;
}

/** Builds a JSON response with standard headers */
export function jsonResponse<T>(data: T, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}

/** Builds an error JSON response */
export function errorResponse(message: string, status = 500): Response {
	return jsonResponse({ ok: false, error: message, data: null }, status);
}
