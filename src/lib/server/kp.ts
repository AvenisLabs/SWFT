// kp.ts v0.1.0 — Kp queries + summary logic

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst } from './db';
import type { KpDataPoint, KpSummary } from '$types/api';
import { KP_THRESHOLDS } from './constants';

/** Fetch recent Kp observations (default: last 48h) */
export async function getRecentKp(db: D1Database, hours = 48): Promise<KpDataPoint[]> {
	return queryAll<KpDataPoint>(
		db,
		`SELECT ts, kp_value as kp, source FROM kp_obs
		 WHERE ts > datetime('now', ? || ' hours')
		 ORDER BY ts DESC`,
		[`-${hours}`]
	);
}

/** Build the Kp summary response */
export async function getKpSummary(db: D1Database): Promise<KpSummary> {
	const recent = await getRecentKp(db, 24);

	if (recent.length === 0) {
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

	const current = recent[0]; // most recent
	const kp = current.kp;

	// Determine trend from last 3 readings
	const trend = determineTrend(recent.slice(0, 4));
	const status = classifyKp(kp);
	const statusLabel = getStatusLabel(status);
	const message = buildKpMessage(kp, trend, status);

	return {
		current_kp: kp,
		current_time: current.ts,
		trend,
		status,
		status_label: statusLabel,
		message,
		recent: recent.slice(0, 8), // last 8 readings (~24h at 3h intervals)
	};
}

function determineTrend(recent: KpDataPoint[]): 'rising' | 'falling' | 'stable' {
	if (recent.length < 2) return 'stable';

	const latest = recent[0].kp;
	const previous = recent[1].kp;
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
