// cache.ts v0.2.0 — Cloudflare Cache API wrapper for API responses

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
	// CF Cache API is only available in the Workers runtime
	const cache = caches?.default;
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

		// Store in cache (non-blocking)
		cache.put(cacheRequest, cachedResponse).catch(() => {
			// Silently ignore cache write failures
		});
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
