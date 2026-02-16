// kp.ts v0.10.0 — Kp queries + summary logic (current Kp from real-time estimated data, with source tracking)

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst } from './db';
import type { KpDataPoint, KpSummary, KpEstimatedPoint } from '$types/api';
import { KP_THRESHOLDS, KP_SOURCE_LABELS } from './constants';

/** Fetch recent Kp observations (default: last 48h) */
export async function getRecentKp(db: D1Database, hours = 48): Promise<KpDataPoint[]> {
	// datetime(ts) normalises ISO 8601 'T'/'Z' format so the comparison works correctly
	// Filter out future timestamps — NOAA data includes predictions we don't want here
	return queryAll<KpDataPoint>(
		db,
		`SELECT ts, kp_value as kp, source FROM kp_obs
		 WHERE datetime(ts) > datetime('now', ? || ' hours')
		   AND datetime(ts) <= datetime('now')
		 ORDER BY ts DESC`,
		[`-${hours}`]
	);
}

/** Fetch 15-min estimated Kp data for the given number of hours */
export async function getEstimatedKp(db: D1Database, hours = 3): Promise<KpEstimatedPoint[]> {
	// datetime(ts) normalises ISO 8601 'T'/'Z' format so the comparison works correctly
	return queryAll<KpEstimatedPoint>(
		db,
		`SELECT ts, kp_value as kp, sample_count FROM kp_estimated
		 WHERE datetime(ts) > datetime('now', ? || ' hours')
		 ORDER BY ts ASC`,
		[`-${hours}`]
	);
}

/** Get the most recent estimated Kp value (real-time 15-min data) with source */
export async function getLatestEstimatedKp(db: D1Database): Promise<{ kp: number; ts: string; source: string } | null> {
	return queryFirst<{ kp: number; ts: string; source: string }>(
		db,
		`SELECT kp_value as kp, ts, COALESCE(source, 'noaa') as source FROM kp_estimated
		 ORDER BY ts DESC LIMIT 1`
	);
}

/** Get the Kp forecast for the current 3-hour window (or nearest upcoming).
 *  Looks back 3 hours so the window we're inside is included, not just the next one. */
export async function getCurrentKpForecast(db: D1Database): Promise<{ kp: number; forecast_time: string } | null> {
	return queryFirst<{ kp: number; forecast_time: string }>(
		db,
		`SELECT kp_value AS kp, forecast_time
		 FROM kp_forecast
		 WHERE datetime(forecast_time) > datetime('now', '-3 hours')
		 ORDER BY datetime(forecast_time) ASC, datetime(issued_at) DESC
		 LIMIT 1`
	);
}

/** Build the Kp summary response — uses real-time estimated Kp for current value */
export async function getKpSummary(db: D1Database): Promise<KpSummary> {
	// Use real-time estimated Kp (15-min intervals) for the current value
	const [latestEstimated, recentEstimated, recentObs, currentForecast] = await Promise.all([
		getLatestEstimatedKp(db),
		getEstimatedKp(db, 1), // last hour of 15-min data for trend
		getRecentKp(db, 24),   // 3-hour obs for the recent history list
		getCurrentKpForecast(db), // forecast for current/next 3-hour window
	]);

	if (!latestEstimated) {
		return {
			current_kp: 0,
			current_time: new Date().toISOString(),
			trend: 'stable',
			status: 'quiet',
			status_label: 'No Data',
			message: 'No Kp data available. Data may still be loading.',
			recent: [],
		};
	}

	const kp = latestEstimated.kp;

	// Trend from recent estimated readings (15-min intervals)
	const trend = determineTrendFromEstimated(recentEstimated);
	const status = classifyKp(kp);
	const statusLabel = getStatusLabel(status);
	const message = buildKpMessage(kp, trend, status);

	// Map D1 source ID to display-friendly source ID
	const sourceId = latestEstimated.source === 'noaa' ? 'noaa_estimated' : latestEstimated.source;
	const sourceLabel = KP_SOURCE_LABELS[latestEstimated.source] ?? KP_SOURCE_LABELS[sourceId] ?? latestEstimated.source;

	return {
		current_kp: kp,
		current_time: latestEstimated.ts,
		trend,
		status,
		status_label: statusLabel,
		message,
		recent: recentObs.slice(0, 8), // 3-hour obs for history context
		...(currentForecast && { forecast_kp: currentForecast.kp, forecast_time: currentForecast.forecast_time }),
		// Only include data_source when not the primary sources (Boulder or NOAA estimated) — controls fallback banner
		...(latestEstimated.source !== 'noaa' && latestEstimated.source !== 'noaa_boulder' && { data_source: latestEstimated.source }),
		// Always include the human-readable label for the source indicator
		data_source_label: sourceLabel,
	};
}

/** Trend from 15-min estimated data (ASC order — newest is last) */
function determineTrendFromEstimated(points: KpEstimatedPoint[]): 'rising' | 'falling' | 'stable' {
	if (points.length < 2) return 'stable';

	const latest = points[points.length - 1].kp;
	const previous = points[points.length - 2].kp;
	const diff = latest - previous;

	if (diff > 0.5) return 'rising';
	if (diff < -0.5) return 'falling';
	return 'stable';
}

function classifyKp(kp: number): KpSummary['status'] {
	if (kp >= KP_THRESHOLDS.EXTREME) return 'severe_storm';
	if (kp >= KP_THRESHOLDS.SEVERE) return 'severe_storm';
	if (kp >= KP_THRESHOLDS.STORM) return 'storm';
	if (kp >= KP_THRESHOLDS.ACTIVE) return 'active';
	if (kp >= KP_THRESHOLDS.QUIET) return 'unsettled';
	return 'quiet';
}

function getStatusLabel(status: KpSummary['status']): string {
	switch (status) {
		case 'quiet': return 'Quiet';
		case 'unsettled': return 'Unsettled';
		case 'active': return 'Active';
		case 'storm': return 'Geomagnetic Storm';
		case 'severe_storm': return 'Severe Storm';
	}
}

function buildKpMessage(kp: number, trend: string, status: KpSummary['status']): string {
	const trendText = trend === 'rising' ? 'and rising' : trend === 'falling' ? 'and falling' : '';

	switch (status) {
		case 'quiet':
			return `Geomagnetic conditions are quiet (Kp ${kp.toFixed(1)}). No significant impacts expected.`;
		case 'unsettled':
			return `Conditions are unsettled (Kp ${kp.toFixed(1)} ${trendText}). Minor fluctuations possible.`;
		case 'active':
			return `Active geomagnetic conditions (Kp ${kp.toFixed(1)} ${trendText}). Possible minor GNSS degradation at high latitudes.`;
		case 'storm':
			return `Geomagnetic storm in progress (Kp ${kp.toFixed(1)} ${trendText}). GNSS users should monitor solution quality.`;
		case 'severe_storm':
			return `Severe geomagnetic storm (Kp ${kp.toFixed(1)} ${trendText}). Significant GNSS degradation expected. Consider postponing precision work.`;
	}
}
