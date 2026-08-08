// GET /api/v1/events/kp — searchable history over the kp_events persistent log.
// v0.1.0 — Phase 5 revamp deliverable.
//
// Query params (all optional):
//   from=<ISO>         default 30 days ago
//   to=<ISO>           default now
//   min_kp=<num>       default 4 (table floor)
//   storm_class=<str>  'active' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5'
//   limit=<n>          default 100, capped 1..500
//
// Uses the indexed columns (ts, kp_value, storm_class) and always binds
// precomputed ISO bounds so the plan uses the index (per 2026-03-15 postmortem).

import type { RequestHandler } from './$types';
import { getDb, queryAll } from '$lib/server/db';
import { withCache, jsonResponse, errorResponse } from '$lib/server/cache';
import { CACHE_TTL } from '$lib/server/constants';
import type { KpEventRow, KpEventsSearchResult } from '$types/api';

const VALID_STORM_CLASSES = new Set(['active', 'G1', 'G2', 'G3', 'G4', 'G5']);

function parseIso(value: string | null, fallback: string): string {
	if (!value) return fallback;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

function parseNumber(value: string | null, fallback: number, min: number, max: number): number {
	if (value === null) return fallback;
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.min(Math.max(n, min), max);
}

export const GET: RequestHandler = async ({ platform, url, request }) => {
	try {
		const now = Date.now();
		const fromDefault = new Date(now - 30 * 86400_000).toISOString();
		const toDefault = new Date(now).toISOString();

		const from = parseIso(url.searchParams.get('from'), fromDefault);
		const to = parseIso(url.searchParams.get('to'), toDefault);
		const minKp = parseNumber(url.searchParams.get('min_kp'), 4, 4, 9);
		const limit = Math.round(parseNumber(url.searchParams.get('limit'), 100, 1, 500));

		const stormClassRaw = url.searchParams.get('storm_class');
		const stormClass: KpEventRow['storm_class'] | null =
			stormClassRaw && VALID_STORM_CLASSES.has(stormClassRaw)
				? (stormClassRaw as KpEventRow['storm_class'])
				: null;

		const cacheKey = `kp-events:${from}:${to}:${minKp}:${stormClass ?? '-'}:${limit}`;

		return withCache(request, cacheKey, CACHE_TTL.KP_EVENTS, async () => {
			const db = getDb(platform);

			const whereParts: string[] = ['ts > ?', 'ts <= ?', 'kp_value >= ?'];
			const params: (string | number)[] = [from, to, minKp];
			if (stormClass) {
				whereParts.push('storm_class = ?');
				params.push(stormClass);
			}

			const sql = `SELECT id, ts, kp_value, source, storm_class, bz_nt, speed_kms, created_at
			             FROM kp_events
			             WHERE ${whereParts.join(' AND ')}
			             ORDER BY ts DESC
			             LIMIT ?`;
			params.push(limit);

			const events = await queryAll<KpEventRow>(db, sql, params);

			const payload: KpEventsSearchResult = {
				events,
				count: events.length,
				query: { from, to, min_kp: minKp, storm_class: stormClass, limit },
			};

			const freshest = events.length > 0 ? events[0].ts : null;
			return jsonResponse({ ok: true, data: payload, data_freshness: freshest });
		});
	} catch (err) {
		console.error('[api/v1/events/kp]', err);
		return errorResponse('Failed to search Kp events');
	}
};
