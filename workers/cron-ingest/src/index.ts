// index.ts v0.5.0 — SWFT cron worker entry point, dispatches tasks by schedule

import { ingestKp } from './tasks/ingest-kp';
import { ingestKpEstimated } from './tasks/ingest-kp-estimated';
import { ingestSolarWind } from './tasks/ingest-solarwind';
import { ingestAlerts } from './tasks/ingest-alerts';
import { generateSummaries } from './tasks/generate-summaries';
import { checkExternalLinks } from './tasks/check-links';

interface Env {
	DB: D1Database;
	SITE_URL: string;
	DISCORD_WEBHOOK_URL?: string;
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const cron = event.cron;

		// */3 — Kp + solar wind (most frequent, core data)
		if (cron === '*/3 * * * *') {
			ctx.waitUntil(
				Promise.allSettled([
					ingestKp(env.DB).then(r => console.log(`[ingest-kp] inserted ${r.inserted} rows`)),
					ingestKpEstimated(env.DB).then(r => console.log(`[ingest-kp-estimated] inserted ${r.inserted} rows`)),
					ingestSolarWind(env.DB).then(r => console.log(`[ingest-solarwind] inserted ${r.inserted} rows`)),
				]).then(results => {
					for (const r of results) {
						if (r.status === 'rejected') console.error('[cron:3m] task failed:', r.reason);
					}
				})
			);
		}

		// */5 — Alerts + scales
		if (cron === '*/5 * * * *') {
			ctx.waitUntil(
				ingestAlerts(env.DB)
					.then(r => console.log(`[ingest-alerts] inserted ${r.inserted} new alerts`))
					.catch(err => console.error('[cron:5m] alerts failed:', err))
			);
		}

		// */15 — Generate summaries + detect events
		if (cron === '*/15 * * * *') {
			ctx.waitUntil(
				generateSummaries(env.DB)
					.then(r => console.log(`[generate-summaries] created ${r.events_created} events`))
					.catch(err => console.error('[cron:15m] summaries failed:', err))
			);
		}

		// Weekly Monday noon UTC — external link health check + Discord report
		if (cron === '0 12 * * 1') {
			ctx.waitUntil(
				checkExternalLinks(env.DB, env.SITE_URL, env.DISCORD_WEBHOOK_URL, 'scheduled')
					.then(r => console.log(`[check-links] ${r.healthyCount} healthy, ${r.brokenCount} broken, discord=${r.discordSent}`))
					.catch(err => console.error('[cron:weekly] link check failed:', err))
			);
		}
	},

	// HTTP handler for health checks + manual triggers
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/health') {
			return new Response(JSON.stringify({ status: 'ok', worker: 'swft-cron-ingest' }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Manual trigger for link check (accepts GET or POST)
		if (url.pathname === '/check-links') {
			try {
				const result = await checkExternalLinks(env.DB, env.SITE_URL, env.DISCORD_WEBHOOK_URL, 'manual');
				return new Response(JSON.stringify({ status: 'ok', ...result }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Unknown error';
				return new Response(JSON.stringify({ status: 'error', error: msg }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		return new Response('SWFT Cron Ingest Worker', { status: 200 });
	},
};
