// server-cache.ts v0.1.0 — CF Cache API wrapper for SSR data loaders.
//
// Why this exists alongside withCache (which wraps API endpoints):
//   * `withCache` operates on Response objects, suitable for /api/v1/* handlers
//   * `cachedServerCall` operates on arbitrary JSON-serialisable values, suitable
//     for use inside +page.server.ts / +layout.server.ts loaders
//
// Both use the same Cloudflare Cache API (`caches.default`), but the cache key
// namespaces are distinct so the two layers can't accidentally collide.
//
// The `cache.put` MUST be awaited — fire-and-forget promises get cancelled
// when the worker response completes, leaving the cache permanently empty.
// We hit this exact bug in `withCache` on 2026-05-17 and traced 5–11s
// per-request latency to it.

const SERVER_CACHE_PREFIX = 'https://swft-web.internal/srv/';

interface CacheContext {
	waitUntil?: (promise: Promise<unknown>) => void;
}

interface CachedPayload<T> {
	cachedAt: string;
	value: T;
}

function toCacheContext(platform?: { context?: CacheContext } | undefined): CacheContext | undefined {
	return platform?.context;
}

/** Return the cache object when running under the Workers runtime. */
function getCache() {
	if (typeof caches === 'undefined') return undefined;
	const cfCaches = caches as unknown as { default?: Cache };
	return cfCaches.default;
}

function isFresh(cachedAt: string, ttlSeconds: number): boolean {
	const cachedTime = Date.parse(cachedAt);
	if (!Number.isFinite(cachedTime)) return false;
	return Date.now() - cachedTime <= ttlSeconds * 1000;
}

/** Serialize a cached payload for storage in Cache API. */
async function putPayload<T>(cache: Cache, req: Request, ttlSeconds: number, value: T): Promise<void> {
	const envelope: CachedPayload<T> = {
		cachedAt: new Date().toISOString(),
		value,
	};
	const res = new Response(JSON.stringify(envelope), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, max-age=${ttlSeconds}`,
		},
	});
	await cache.put(req, res);
}

/** Read and parse a cached payload. */
async function readPayload<T>(cache: Cache, req: Request): Promise<CachedPayload<T> | null> {
	try {
		const cached = await cache.match(req);
		if (!cached) return null;
		if (cached.headers.get('Cache-Control')?.includes('no-store')) {
			return null;
		}
		return (await cached.json()) as CachedPayload<T>;
	} catch (err) {
		console.warn('[server-cache] read failed', err);
		return null;
	}
}

/** Run `factory()` and cache the result for `ttlSeconds`, keyed by `key`.
 *  Subsequent calls within the TTL return the cached value without invoking
 *  the factory. Falls back to direct call if CF Cache API is unavailable
 *  (local dev without a wrangler runtime). */
export async function cachedServerCall<T>(
	key: string,
	ttlSeconds: number,
	factory: () => Promise<T>,
	platform?: { context?: CacheContext }
): Promise<T> {
	const cache = getCache();
	if (!cache) return factory();

	const url = `${SERVER_CACHE_PREFIX}${encodeURIComponent(key)}`;
	const req = new Request(url);

	const stalePayload = await readPayload<T>(cache, req);
	if (stalePayload) {
		if (isFresh(stalePayload.cachedAt, ttlSeconds)) {
			return stalePayload.value;
		}

		const refresh = async () => {
			try {
				const value = await factory();
				await putPayload(cache, req, ttlSeconds, value);
				return value;
			} catch (err) {
				console.warn('[server-cache] refresh failed for', key, err);
				return stalePayload.value;
			}
		};

		if (stalePayload.value !== undefined) {
			const context = toCacheContext(platform);
			if (context?.waitUntil) {
				context.waitUntil(refresh());
			} else {
				// Best-effort background refresh when waitUntil is unavailable.
				void refresh();
			}
			return stalePayload.value;
		}
	}

	const value = await factory();
	try {
		await putPayload(cache, req, ttlSeconds, value);
	} catch (err) {
		console.warn('[server-cache] put failed for', key, err);
	}
	return value;
}

/** Same as `cachedServerCall`, but with explicit stale-while-revalidate diagnostics.
 * This helper always returns the cached value when available and schedules a
 * background refresh once the value becomes stale. */
export async function cachedServerCallSWR<T>(
	key: string,
	ttlSeconds: number,
	factory: () => Promise<T>,
	platform?: { context?: CacheContext }
): Promise<T> {
	const cache = getCache();
	if (!cache) return factory();

	const url = `${SERVER_CACHE_PREFIX}${encodeURIComponent(key)}:swr`;
	const req = new Request(url);

	const stalePayload = await readPayload<T>(cache, req);
	if (stalePayload) {
		const context = toCacheContext(platform);
		const fresh = isFresh(stalePayload.cachedAt, ttlSeconds);
		if (!fresh) {
			const refresh = async () => {
				try {
					const value = await factory();
					await putPayload(cache, req, ttlSeconds, value);
					return value;
				} catch (err) {
					console.warn('[server-cache] refresh failed for', key, err);
					return stalePayload.value;
				}
			};

			if (context?.waitUntil) {
				context.waitUntil(refresh());
			} else {
				void refresh();
			}
		}

		return stalePayload.value;
	}

	const value = await factory();
	try {
		await putPayload(cache, req, ttlSeconds, value);
	} catch (err) {
		console.warn('[server-cache] put failed for', key, err);
	}
	return value;
}
