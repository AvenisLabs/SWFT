// gnss-risk.ts v0.1.0 — GNSS risk calculator (Kp + Bz + speed + R-scale)

import type { D1Database } from '@cloudflare/workers-types';
import { queryFirst } from './db';
import { GNSS_WEIGHTS } from './constants';
import type { GnssRiskResult, GnssRiskFactor } from '$types/api';

interface LatestConditions {
	kp: number | null;
	kp_time: string | null;
	bz: number | null;
	speed: number | null;
	sw_time: string | null;
	r_scale: number;
}

/** Fetch the latest space weather conditions from D1 */
async function getLatestConditions(db: D1Database): Promise<LatestConditions> {
	const [kpRow, swRow] = await Promise.all([
		queryFirst<{ kp_value: number; ts: string }>(
			db, 'SELECT kp_value, ts FROM kp_obs ORDER BY ts DESC LIMIT 1'
		),
		queryFirst<{ bz: number; speed: number; ts: string }>(
			db, 'SELECT bz, speed, ts FROM solarwind_summary ORDER BY ts DESC LIMIT 1'
		),
	]);

	// R-scale from most recent classified alert (radio blackout type)
	const rAlert = await queryFirst<{ scale_value: number }>(
		db,
		`SELECT scale_value FROM alerts_classified
		 WHERE scale_type = 'R' AND scale_value IS NOT NULL
		   AND begins > datetime('now', '-6 hours')
		 ORDER BY begins DESC LIMIT 1`
	);

	return {
		kp: kpRow?.kp_value ?? null,
		kp_time: kpRow?.ts ?? null,
		bz: swRow?.bz ?? null,
		speed: swRow?.speed ?? null,
		sw_time: swRow?.ts ?? null,
		r_scale: rAlert?.scale_value ?? 0,
	};
}

/** Score Kp contribution (0–100 raw, before weighting) */
function scoreKp(kp: number | null): { score: number; detail: string } {
	if (kp === null) return { score: 0, detail: 'No Kp data' };

	if (kp >= 8) return { score: 100, detail: `Kp ${kp} — Extreme geomagnetic activity` };
	if (kp >= 7) return { score: 85, detail: `Kp ${kp} — Severe geomagnetic storm` };
	if (kp >= 6) return { score: 70, detail: `Kp ${kp} — Strong storm conditions` };
	if (kp >= 5) return { score: 55, detail: `Kp ${kp} — Geomagnetic storm` };
	if (kp >= 4) return { score: 35, detail: `Kp ${kp} — Active/unsettled conditions` };
	if (kp >= 3) return { score: 15, detail: `Kp ${kp} — Slightly unsettled` };
	return { score: 5, detail: `Kp ${kp} — Quiet conditions` };
}

/** Score Bz contribution — southward (negative) Bz is bad for GNSS */
function scoreBz(bz: number | null): { score: number; detail: string } {
	if (bz === null) return { score: 0, detail: 'No Bz data' };

	if (bz <= -20) return { score: 100, detail: `Bz ${bz.toFixed(1)} nT — Extreme southward IMF` };
	if (bz <= -10) return { score: 80, detail: `Bz ${bz.toFixed(1)} nT — Strongly southward IMF` };
	if (bz <= -5) return { score: 55, detail: `Bz ${bz.toFixed(1)} nT — Moderately southward` };
	if (bz < 0) return { score: 30, detail: `Bz ${bz.toFixed(1)} nT — Slightly southward` };
	return { score: 5, detail: `Bz ${bz.toFixed(1)} nT — Northward (favorable)` };
}

/** Score solar wind speed contribution */
function scoreSpeed(speed: number | null): { score: number; detail: string } {
	if (speed === null) return { score: 0, detail: 'No wind speed data' };

	if (speed > 800) return { score: 100, detail: `${Math.round(speed)} km/s — Extreme solar wind` };
	if (speed > 600) return { score: 70, detail: `${Math.round(speed)} km/s — High-speed stream` };
	if (speed > 500) return { score: 45, detail: `${Math.round(speed)} km/s — Elevated speed` };
	if (speed > 400) return { score: 25, detail: `${Math.round(speed)} km/s — Slightly elevated` };
	return { score: 5, detail: `${Math.round(speed)} km/s — Nominal conditions` };
}

/** Score R-scale (radio blackout) contribution */
function scoreRScale(r: number): { score: number; detail: string } {
	if (r >= 5) return { score: 100, detail: `R${r} — Extreme radio blackout` };
	if (r >= 4) return { score: 80, detail: `R${r} — Severe radio blackout` };
	if (r >= 3) return { score: 60, detail: `R${r} — Strong radio blackout` };
	if (r >= 2) return { score: 35, detail: `R${r} — Moderate radio blackout` };
	if (r >= 1) return { score: 15, detail: `R${r} — Minor radio blackout` };
	return { score: 0, detail: 'R0 — No radio blackout' };
}

/** Map composite score to risk level */
function riskLevel(score: number): GnssRiskResult['level'] {
	if (score >= 80) return 'Extreme';
	if (score >= 60) return 'Severe';
	if (score >= 40) return 'High';
	if (score >= 20) return 'Moderate';
	return 'Low';
}

/** Generate operator advisory text based on risk level */
function getAdvisory(level: GnssRiskResult['level'], factors: GnssRiskFactor[]): string {
	switch (level) {
		case 'Extreme':
			return 'GNSS operations strongly discouraged. Expect significant positioning errors and potential loss of lock on multiple satellites. Postpone all precision survey and drone operations. Static GNSS users should expect degraded solutions.';
		case 'Severe':
			return 'GNSS accuracy severely degraded. Increased multipath-like errors and cycle slips expected. Avoid RTK operations. PPP convergence times significantly extended. Consider postponing precision work.';
		case 'High':
			return 'GNSS performance degraded. RTK fix rates will decrease, especially at higher latitudes. Allow extra convergence time for PPP. Monitor solution quality continuously. Consider shorter observation sessions.';
		case 'Moderate':
			return 'Minor GNSS degradation possible. RTK users may experience occasional fix drops. PPP solutions may need extended convergence. Standard survey operations can proceed with monitoring.';
		case 'Low':
			return 'Nominal GNSS conditions. Normal precision operations may proceed. Standard monitoring recommended.';
	}
}

/** Compute the full GNSS risk assessment */
export async function computeGnssRisk(db: D1Database): Promise<GnssRiskResult> {
	const conditions = await getLatestConditions(db);

	const kpResult = scoreKp(conditions.kp);
	const bzResult = scoreBz(conditions.bz);
	const speedResult = scoreSpeed(conditions.speed);
	const rResult = scoreRScale(conditions.r_scale);

	const factors: GnssRiskFactor[] = [
		{
			name: 'Kp Index',
			value: conditions.kp ?? 'N/A',
			weight: GNSS_WEIGHTS.KP,
			contribution: Math.round(kpResult.score * GNSS_WEIGHTS.KP),
			detail: kpResult.detail,
		},
		{
			name: 'Bz Component',
			value: conditions.bz !== null ? `${conditions.bz.toFixed(1)} nT` : 'N/A',
			weight: GNSS_WEIGHTS.BZ,
			contribution: Math.round(bzResult.score * GNSS_WEIGHTS.BZ),
			detail: bzResult.detail,
		},
		{
			name: 'Solar Wind Speed',
			value: conditions.speed !== null ? `${Math.round(conditions.speed)} km/s` : 'N/A',
			weight: GNSS_WEIGHTS.SPEED,
			contribution: Math.round(speedResult.score * GNSS_WEIGHTS.SPEED),
			detail: speedResult.detail,
		},
		{
			name: 'R-Scale',
			value: `R${conditions.r_scale}`,
			weight: GNSS_WEIGHTS.R_SCALE,
			contribution: Math.round(rResult.score * GNSS_WEIGHTS.R_SCALE),
			detail: rResult.detail,
		},
	];

	// Weighted composite score
	const score = Math.round(
		kpResult.score * GNSS_WEIGHTS.KP +
		bzResult.score * GNSS_WEIGHTS.BZ +
		speedResult.score * GNSS_WEIGHTS.SPEED +
		rResult.score * GNSS_WEIGHTS.R_SCALE
	);

	const level = riskLevel(score);
	const advisory = getAdvisory(level, factors);

	// Use the freshest data timestamp
	const timestamps = [conditions.kp_time, conditions.sw_time].filter(Boolean) as string[];
	const updated_at = timestamps.length > 0
		? timestamps.sort().pop()!
		: new Date().toISOString();

	return { score, level, factors, advisory, updated_at };
}
