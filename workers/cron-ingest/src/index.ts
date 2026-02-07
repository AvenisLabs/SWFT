// index.ts v0.2.0 — SWFT cron worker entry point, dispatches tasks by schedule

import { ingestKp } from './tasks/ingest-kp';
import { ingestSolarWind } from './tasks/ingest-solarwind';
import { ingestAlerts } from './tasks/ingest-alerts';
import { generateSummaries } from './tasks/generate-summaries';

interface Env {
	DB: D1Database;
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const cron = event.cron;

		// */3 — Kp + solar wind (most frequent, core data)
		if (cron === '*/3 * * * *') {
			ctx.waitUntil(
				Promise.allSettled([
					ingestKp(env.DB).then(r => console.log(`[ingest-kp] inserted ${r.inserted} rows`)),
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
	},

	// Provide a simple HTTP handler for health checks / manual triggers
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/health') {
			return new Response(JSON.stringify({ status: 'ok', worker: 'swft-cron-ingest' }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response('SWFT Cron Ingest Worker', { status: 200 });
	},
};
