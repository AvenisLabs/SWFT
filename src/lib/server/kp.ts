// kp.ts v0.12.0 — Kp queries + summary logic.
// kp_obs was dropped in migration 0007 — getRecentKp now reads from kp_estimated
// (the 15-min live buffer, 24h retention). kp_forecast keeps datetime() because
// NOAA stores its forecast_time in space-separated format, not ISO.

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst } from './db';
import type { KpDataPoint, KpSummary, KpEstimatedPoint } from '$types/api';
import { KP_THRESHOLDS, KP_SOURCE_LABELS } from './constants';

/** ISO 8601 bound for `now + offsetHours` (offsetHours is negative for "hours ago"). */
function isoHoursFromNow(offsetHours: number): string {
	return new Date(Date.now() + offsetHours * 3600_000).toISOString();
}

/** Fetch recent Kp readings from the kp_estimated buffer (default: last 24h).
 *  With 15-min resolution, 24h yields up to 96 rows. */
export async function getRecentKp(db: D1Database, hours = 24): Promise<KpDataPoint[]> {
	const cappedHours = Math.min(hours, 24);
	const lowerBound = isoHoursFromNow(-cappedHours);
	const upperBound = new Date().toISOString();
	return queryAll<KpDataPoint>(
		db,
		`SELECT ts, kp_value as kp, COALESCE(source, 'noaa') as source
		 FROM kp_estimated
		 WHERE ts > ? AND ts <= ?
		 ORDER BY ts DESC`,
		[lowerBound, upperBound]
	);
}

/** Fetch 15-min estimated Kp data for the given number of hours */
export async function getEstimatedKp(db: D1Database, hours = 3): Promise<KpEstimatedPoint[]> {
	const lowerBound = isoHoursFromNow(-hours);
	return queryAll<KpEstimatedPoint>(
		db,
		`SELECT ts, kp_value as kp, sample_count FROM kp_estimated
		 WHERE ts > ?
		 ORDER BY ts ASC`,
		[lowerBound]
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
 *  kp_forecast.forecast_time is stored in NOAA's space-separated format, not ISO,
 *  so datetime() is still required here. */
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
	const [latestEstimated, recentEstimated, recentObs, currentForecast] = await Promise.all([
		getLatestEstimatedKp(db),
		getEstimatedKp(db, 1),
		getRecentKp(db, 24),
		getCurrentKpForecast(db),
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
	const trend = determineTrendFromEstimated(recentEstimated);
	const status = classifyKp(kp);
	const statusLabel = getStatusLabel(status);
	const message = buildKpMessage(kp, trend, status);

	const sourceId = latestEstimated.source === 'noaa' ? 'noaa_estimated' : latestEstimated.source;
	const sourceLabel = KP_SOURCE_LABELS[latestEstimated.source] ?? KP_SOURCE_LABELS[sourceId] ?? latestEstimated.source;

	return {
		current_kp: kp,
		current_time: latestEstimated.ts,
		trend,
		status,
		status_label: statusLabel,
		message,
		recent: recentObs.slice(0, 8),
		...(currentForecast && { forecast_kp: currentForecast.kp, forecast_time: currentForecast.forecast_time }),
		...(latestEstimated.source !== 'noaa' && latestEstimated.source !== 'noaa_boulder' && { data_source: latestEstimated.source }),
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
