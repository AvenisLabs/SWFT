// index.ts v1.0.0 — SWFT cron worker entry with dynamic skip-gate.
//
// Cron configuration: ONE schedule declared (`*/5 * * * *`, the fastest rate
// we ever need) plus the weekly link check. Every `*/5` fire reads monitoring
// mode from system_state and decides whether to do real work:
//
//   storm    — act on every fire (every 5 min)
//   elevated — act when minute % 15 === 0 (every 15 min)
//   normal   — act when minute === 0       (every hour)
//
// Mode upgrades happen inside the full-run path: after ingests settle we
// re-evaluate mode from fresh Kp + active alerts and persist. Downgrades are
// passive — they happen via `*_until_iso` expiry timestamps, which gives a
// 12-hour minimum hold to prevent flapping on a brief Kp dip.

import { ingestKp } from './tasks/ingest-kp';
import { ingestKpEstimated } from './tasks/ingest-kp-estimated';
import { ingestSolarWind } from './tasks/ingest-solarwind';
import { ingestAlerts } from './tasks/ingest-alerts';
import { generateSummaries } from './tasks/generate-summaries';
import { checkExternalLinks } from './tasks/check-links';
import {
	computeEffectiveMode,
	evaluateMode,
	shouldActForMode,
	type ActiveMode,
	type ModeAlert,
	type ModeState,
} from './lib/evaluate-mode';
import { getSystemState, setSystemState } from './lib/db';

interface Env {
	DB: D1Database;
	SITE_URL: string;
	DISCORD_WEBHOOK_URL?: string;
	BOM_API_KEY?: string;
}

const WEEKLY_CRON = '0 12 * * 1';

async function readModeState(db: D1Database): Promise<ModeState> {
	const [rawMode, stormUntil, elevatedUntil] = await Promise.all([
		getSystemState(db, 'active_mode'),
		getSystemState(db, 'storm_until_iso'),
		getSystemState(db, 'elevated_until_iso'),
	]);
	const mode: ActiveMode = rawMode === 'storm' || rawMode === 'elevated' ? rawMode : 'normal';
	return { activeMode: mode, stormUntilIso: stormUntil, elevatedUntilIso: elevatedUntil };
}

async function writeModeState(db: D1Database, state: ModeState): Promise<void> {
	await Promise.all([
		setSystemState(db, 'active_mode', state.activeMode),
		setSystemState(db, 'storm_until_iso', state.stormUntilIso),
		setSystemState(db, 'elevated_until_iso', state.elevatedUntilIso),
	]);
}

async function readLatestKp(db: D1Database): Promise<number | null> {
	try {
		const row = await db.prepare(
			'SELECT kp_value FROM kp_estimated ORDER BY ts DESC LIMIT 1'
		).first<{ kp_value: number }>();
		return row?.kp_value ?? null;
	} catch {
		return null;
	}
}

async function readActiveAlertsForMode(db: D1Database, now: Date): Promise<ModeAlert[]> {
	try {
		const issueBound = new Date(now.getTime() - 24 * 3600_000).toISOString();
		const nowIso = now.toISOString();
		const rs = await db.prepare(
			`SELECT c.scale_type, c.scale_value, c.ends
			 FROM alerts_raw r
			 JOIN alerts_classified c ON c.raw_alert_id = r.id
			 WHERE r.issue_time > ?
			   AND (c.ends IS NULL OR c.ends > ?)`
		).bind(issueBound, nowIso).all<{ scale_type: string | null; scale_value: number | null; ends: string | null }>();
		return (rs.results ?? []).map(r => ({
			scaleType: r.scale_type,
			scaleValue: r.scale_value,
			ends: r.ends,
		}));
	} catch {
		return [];
	}
}

async function runFullBatch(env: Env, now: Date): Promise<void> {
	// Ingest in parallel — none of these depend on each other.
	const ingestResults = await Promise.allSettled([
		ingestKpEstimated(env.DB, env.BOM_API_KEY),
		ingestSolarWind(env.DB),
		ingestAlerts(env.DB),
		ingestKp(env.DB), // forecast only
	]);
	for (const r of ingestResults) {
		if (r.status === 'rejected') console.error('[cron:full] ingest task failed:', r.reason);
	}

	// Re-evaluate mode from fresh data and persist.
	const [kp, alerts, current] = await Promise.all([
		readLatestKp(env.DB),
		readActiveAlertsForMode(env.DB, now),
		readModeState(env.DB),
	]);
	const next = evaluateMode({ kp, activeAlerts: alerts, now, current });
	await writeModeState(env.DB, next);

	if (next.activeMode !== current.activeMode) {
		console.log(`[cron:mode] transition ${current.activeMode} -> ${next.activeMode} (kp=${kp ?? '?'}, stormUntil=${next.stormUntilIso || '—'}, elevatedUntil=${next.elevatedUntilIso || '—'})`);
	}

	// Retention cleanup + derived events (runs once per full batch).
	try {
		const summary = await generateSummaries(env.DB);
		console.log(`[cron:full] events_created=${summary.events_created}, rows_pruned=${summary.rows_pruned}`);
	} catch (err) {
		console.error('[cron:full] generate-summaries failed:', err);
	}
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		// Weekly link check runs on its own schedule, unrelated to the skip-gate.
		if (event.cron === WEEKLY_CRON) {
			ctx.waitUntil(
				checkExternalLinks(env.DB, env.SITE_URL, env.DISCORD_WEBHOOK_URL, 'scheduled')
					.then(r => console.log(`[cron:weekly] ${r.healthyCount} healthy, ${r.brokenCount} broken, discord=${r.discordSent}`))
					.catch(err => console.error('[cron:weekly] link check failed:', err))
			);
			return;
		}

		// All other fires are the `*/5` skip-gate path. Use the scheduled time
		// (not wall clock) for minute selection — more reliable than Date.now()
		// given CF cron drift.
		const scheduledAt = new Date(event.scheduledTime);
		const minute = scheduledAt.getUTCMinutes();

		ctx.waitUntil((async () => {
			const current = await readModeState(env.DB);
			const effectiveMode = computeEffectiveMode(current, scheduledAt);

			if (!shouldActForMode(effectiveMode, minute)) {
				// Cheap skip path — one D1 read, no NOAA fetches, no D1 writes.
				return;
			}

			await runFullBatch(env, scheduledAt);
		})());
	},

	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/health') {
			const state = await readModeState(env.DB);
			return new Response(JSON.stringify({
				status: 'ok',
				worker: 'swft-cron-ingest',
				mode: state.activeMode,
				storm_until: state.stormUntilIso || null,
				elevated_until: state.elevatedUntilIso || null,
			}), { headers: { 'Content-Type': 'application/json' } });
		}

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

		// Manual full-batch trigger for ad-hoc runs (also re-evaluates mode).
		if (url.pathname === '/ingest-kp' || url.pathname === '/run') {
			try {
				await runFullBatch(env, new Date());
				const state = await readModeState(env.DB);
				return new Response(JSON.stringify({ status: 'ok', mode: state.activeMode }), {
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
