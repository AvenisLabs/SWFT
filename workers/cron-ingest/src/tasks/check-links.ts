// check-links.ts v0.3.0 — External link health check with D1 persistence

import { crawlExternalLinks } from '../lib/link-crawler';
import type { LinkMap } from '../lib/link-crawler';
import { checkLinks } from '../lib/link-checker';
import { sendLinkCheckReport } from '../lib/discord';
import { updateCronState } from '../lib/db';

/** All site pages to crawl for external links */
const SITE_PATHS = [
	'/',
	'/alerts',
	'/gnss',
	'/gnss-reliability',
	'/gnss-reliability/how-space-weather-affects-gps',
	'/gnss-reliability/rtk-float-drops',
	'/events',
	'/panels',
];

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
		// 1. Crawl all pages for external links
		console.log(`[check-links] Crawling ${SITE_PATHS.length} pages on ${siteUrl}...`);
		const linkMap = await crawlExternalLinks(siteUrl, SITE_PATHS);
		console.log(`[check-links] Found ${linkMap.size} unique external links`);

		// 2. Upsert discovered links to site_links table
		await upsertDiscoveredLinks(db, linkMap);

		// 3. Check each link
		const results = await checkLinks(linkMap);
		const broken = results.filter(r => !r.ok);
		const healthy = results.filter(r => r.ok);

		for (const b of broken) {
			console.warn(`[check-links] BROKEN: ${b.url} — ${b.status ?? 'N/A'} ${b.statusText}`);
		}
		console.log(`[check-links] Results: ${healthy.length} healthy, ${broken.length} broken`);

		// 4. Persist per-URL results
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

		// 5. Send Discord report (if webhook configured)
		let discordSent = false;
		if (discordWebhookUrl) {
			await sendLinkCheckReport(discordWebhookUrl, results);
			discordSent = true;
			console.log('[check-links] Discord report sent');
		} else {
			console.warn('[check-links] DISCORD_WEBHOOK_URL not set — skipping Discord report');
		}

		// 6. Update cron state
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
