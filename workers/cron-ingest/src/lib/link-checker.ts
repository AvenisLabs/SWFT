// link-checker.ts v0.2.0 — Checks external URL health with HEAD/GET fallback

import type { LinkMap } from './link-crawler';

export interface LinkCheckEntry {
	url: string;
	ok: boolean;
	status: number | null;
	statusText: string;
	method: string;
	responseTimeMs: number;
	foundOnPages: string[];
}

const CHECK_TIMEOUT_MS = 12_000;
const MAX_CONCURRENT = 5;

/** Check all URLs in the link map, returns results for every link */
export async function checkLinks(
	linkMap: LinkMap
): Promise<LinkCheckEntry[]> {
	const urls = Array.from(linkMap.keys());
	const results: LinkCheckEntry[] = [];

	// Process in batches of MAX_CONCURRENT
	for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
		const batch = urls.slice(i, i + MAX_CONCURRENT);
		const batchResults = await Promise.allSettled(
			batch.map(url => {
				const pageMap = linkMap.get(url)!;
				return checkSingleUrl(url, Array.from(pageMap.keys()));
			})
		);

		for (const result of batchResults) {
			if (result.status === 'fulfilled') {
				results.push(result.value);
			}
			// rejected shouldn't happen — checkSingleUrl catches internally
		}
	}

	return results;
}

/** Check a single URL: try HEAD first, fall back to GET on 405/403 */
async function checkSingleUrl(url: string, pages: string[]): Promise<LinkCheckEntry> {
	// Try HEAD first
	const headResult = await timedFetch(url, 'HEAD');
	if (headResult.status !== 405 && headResult.status !== 403) {
		return { url, foundOnPages: pages, ...headResult };
	}

	// HEAD was rejected — retry with GET
	const getResult = await timedFetch(url, 'GET');
	return { url, foundOnPages: pages, ...getResult };
}

/** Perform a timed fetch, returning structured result (never throws) */
async function timedFetch(
	url: string,
	method: string
): Promise<{ ok: boolean; status: number | null; statusText: string; method: string; responseTimeMs: number }> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
	const start = Date.now();

	try {
		const res = await fetch(url, {
			method,
			signal: controller.signal,
			headers: { 'User-Agent': 'SWFT-LinkChecker/1.0 (site health monitor)' },
			redirect: 'follow',
		});

		return {
			ok: res.ok,
			status: res.status,
			statusText: res.statusText || String(res.status),
			method,
			responseTimeMs: Date.now() - start,
		};
	} catch (err) {
		const isTimeout = err instanceof DOMException && err.name === 'AbortError';
		return {
			ok: false,
			status: null,
			statusText: isTimeout ? 'Timeout' : 'Network Error',
			method,
			responseTimeMs: Date.now() - start,
		};
	} finally {
		clearTimeout(timeout);
	}
}
