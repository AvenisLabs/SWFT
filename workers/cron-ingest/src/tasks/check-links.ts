// check-links.ts v0.5.0 — External link health check with D1 persistence

import { crawlExternalLinks } from '../lib/link-crawler';
import type { LinkMap } from '../lib/link-crawler';
import { checkLinks } from '../lib/link-checker';
import { sendLinkCheckReport } from '../lib/discord';
import { updateCronState } from '../lib/db';

/** Fallback paths if the /api/v1/routes endpoint is unreachable */
const FALLBACK_PATHS = [
	'/',
	'/alerts',
	'/gnss',
	'/gnss-reliability',
	'/gnss-reliability/how-space-weather-affects-gps',
	'/gnss-reliability/rtk-float-drops',
	'/gnss-reliability/glossary',
	'/gnss-reliability/dji-emlid-base-stations',
	'/gnss-reliability/opus-ppp-failures',
	'/gnss-reliability/gnss-risk-levels',
	'/gnss-reliability/ionospheric-delay',
	'/gnss-reliability/solar-flares-vs-storms',
	'/gnss-reliability/space-weather-gnss-survey',
	'/gnss-reliability/drone-mission-cancel',
	'/events',
	'/panels',
];

/** Fetch page routes from the live site's /api/v1/routes endpoint */
async function fetchSiteRoutes(siteUrl: string): Promise<string[]> {
	const origin = new URL(siteUrl).origin;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10_000);

	try {
		const res = await fetch(`${origin}/api/v1/routes`, {
			signal: controller.signal,
			headers: { 'User-Agent': 'SWFT-LinkChecker/1.0 (site health monitor)' },
		});

		if (!res.ok) throw new Error(`HTTP ${res.status}`);

		const json = await res.json() as { ok: boolean; data: string[] };
		if (!json.ok || !Array.isArray(json.data) || json.data.length === 0) {
			throw new Error('Invalid or empty routes response');
		}

		return json.data;
	} finally {
		clearTimeout(timeout);
	}
}

export interface CheckLinksResult {
	totalLinks: number;
	brokenCount: number;
	healthyCount: number;
	discordSent: boolean;
	runId: number | null;
}

/** Crawl site pages, check all external links, persist to D1, report to Discord */
export async function checkExternalLinks(
	db: D1Database,
	siteUrl: string,
	discordWebhookUrl?: string,
	triggerType: 'scheduled' | 'manual' = 'scheduled'
): Promise<CheckLinksResult> {
	// Create check run row upfront
	let runId: number | null = null;
	try {
		const runResult = await db.prepare(
			`INSERT INTO link_check_runs (trigger_type, status) VALUES (?, 'running')`
		).bind(triggerType).run();
		runId = runResult.meta?.last_row_id ?? null;
	} catch (err) {
		console.warn('[check-links] Could not create check run row:', err);
	}

	try {
		// 1. Discover pages — fetch from live site, fall back to hardcoded list
		let sitePaths: string[];
		try {
			sitePaths = await fetchSiteRoutes(siteUrl);
			console.log(`[check-links] Fetched ${sitePaths.length} routes from /api/v1/routes`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.warn(`[check-links] Route discovery failed (${msg}), using fallback list`);
			sitePaths = FALLBACK_PATHS;
		}

		// 2. Crawl all pages for external links
		console.log(`[check-links] Crawling ${sitePaths.length} pages on ${siteUrl}...`);
		const linkMap = await crawlExternalLinks(siteUrl, sitePaths);
		console.log(`[check-links] Found ${linkMap.size} unique external links`);

		// 3. Upsert discovered links to site_links table
		await upsertDiscoveredLinks(db, linkMap);

		// 4. Check each link
		const results = await checkLinks(linkMap);
		const broken = results.filter(r => !r.ok);
		const healthy = results.filter(r => r.ok);

		for (const b of broken) {
			console.warn(`[check-links] BROKEN: ${b.url} — ${b.status ?? 'N/A'} ${b.statusText}`);
		}
		console.log(`[check-links] Results: ${healthy.length} healthy, ${broken.length} broken`);

		// 5. Persist per-URL results
		if (runId) {
			await persistCheckResults(db, runId, results);
			// Update site_links with latest status
			await updateLinkStatuses(db, results);
			// Complete the run
			await db.prepare(
				`UPDATE link_check_runs SET completed_at = datetime('now'), status = 'completed',
				 total_links = ?, healthy_count = ?, broken_count = ?
				 WHERE id = ?`
			).bind(results.length, healthy.length, broken.length, runId).run();
		}

		// 6. Send Discord report (if webhook configured)
		let discordSent = false;
		if (discordWebhookUrl) {
			await sendLinkCheckReport(discordWebhookUrl, results);
			discordSent = true;
			console.log('[check-links] Discord report sent');
		} else {
			console.warn('[check-links] DISCORD_WEBHOOK_URL not set — skipping Discord report');
		}

		// 7. Update cron state
		await updateCronState(db, 'check-links', 'ok', results.length);

		return {
			totalLinks: results.length,
			brokenCount: broken.length,
			healthyCount: healthy.length,
			discordSent,
			runId,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		// Mark run as error
		if (runId) {
			await db.prepare(
				`UPDATE link_check_runs SET completed_at = datetime('now'), status = 'error' WHERE id = ?`
			).bind(runId).run().catch(() => {});
		}
		await updateCronState(db, 'check-links', 'error', 0, msg);
		throw err;
	}
}

/** Upsert discovered links into site_links, preserving existing overrides */
async function upsertDiscoveredLinks(db: D1Database, linkMap: LinkMap): Promise<void> {
	const entries: { url: string; page_path: string; link_text: string }[] = [];
	for (const [url, pageMap] of linkMap) {
		for (const [pagePath, linkText] of pageMap) {
			entries.push({ url, page_path: pagePath, link_text: linkText });
		}
	}

	// Batch in groups of 50 for D1 limits
	for (let i = 0; i < entries.length; i += 50) {
		const batch = entries.slice(i, i + 50);
		const stmts = batch.map(e =>
			db.prepare(
				`INSERT INTO site_links (url, link_text, page_path)
				 VALUES (?, ?, ?)
				 ON CONFLICT(url, page_path) DO UPDATE SET
				   link_text = excluded.link_text,
				   last_seen = datetime('now')`
			).bind(e.url, e.link_text, e.page_path)
		);
		await db.batch(stmts);
	}
	console.log(`[check-links] Upserted ${entries.length} link entries to site_links`);
}

/** Insert per-URL check results into link_check_results */
async function persistCheckResults(
	db: D1Database,
	runId: number,
	results: Array<{ url: string; ok: boolean; status: number | null; statusText: string; method: string; responseTimeMs: number; foundOnPages: string[] }>
): Promise<void> {
	for (let i = 0; i < results.length; i += 50) {
		const batch = results.slice(i, i + 50);
		const stmts = batch.map(r =>
			db.prepare(
				`INSERT INTO link_check_results (run_id, url, ok, status_code, status_text, method, response_time_ms, found_on_pages)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(runId, r.url, r.ok ? 1 : 0, r.status, r.statusText, r.method, r.responseTimeMs, JSON.stringify(r.foundOnPages))
		);
		await db.batch(stmts);
	}
}

/** Update site_links.last_status and last_check from check results */
async function updateLinkStatuses(
	db: D1Database,
	results: Array<{ url: string; status: number | null }>
): Promise<void> {
	for (let i = 0; i < results.length; i += 50) {
		const batch = results.slice(i, i + 50);
		const stmts = batch.map(r =>
			db.prepare(
				`UPDATE site_links SET last_status = ?, last_check = datetime('now') WHERE url = ?`
			).bind(r.status, r.url)
		);
		await db.batch(stmts);
	}
}
