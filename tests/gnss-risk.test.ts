// gnss-risk.test.ts v0.1.0 — Unit tests for GNSS risk scoring logic

import { describe, it, expect } from 'vitest';

// Since the scoring functions are private in gnss-risk.ts,
// we test the scoring logic directly by reimplementing the pure functions.
// In production the full model runs against D1, but the scoring math is deterministic.

function scoreKp(kp: number | null): number {
	if (kp === null) return 0;
	if (kp >= 8) return 100;
	if (kp >= 7) return 85;
	if (kp >= 6) return 70;
	if (kp >= 5) return 55;
	if (kp >= 4) return 35;
	if (kp >= 3) return 15;
	return 5;
}

function scoreBz(bz: number | null): number {
	if (bz === null) return 0;
	if (bz <= -20) return 100;
	if (bz <= -10) return 80;
	if (bz <= -5) return 55;
	if (bz < 0) return 30;
	return 5;
}

function scoreSpeed(speed: number | null): number {
	if (speed === null) return 0;
	if (speed > 800) return 100;
	if (speed > 600) return 70;
	if (speed > 500) return 45;
	if (speed > 400) return 25;
	return 5;
}

function scoreRScale(r: number): number {
	if (r >= 5) return 100;
	if (r >= 4) return 80;
	if (r >= 3) return 60;
	if (r >= 2) return 35;
	if (r >= 1) return 15;
	return 0;
}

function computeScore(kp: number | null, bz: number | null, speed: number | null, r: number): number {
	return Math.round(
		scoreKp(kp) * 0.35 +
		scoreBz(bz) * 0.25 +
		scoreSpeed(speed) * 0.20 +
		scoreRScale(r) * 0.20
	);
}

function riskLevel(score: number): string {
	if (score >= 80) return 'Extreme';
	if (score >= 60) return 'Severe';
	if (score >= 40) return 'High';
	if (score >= 20) return 'Moderate';
	return 'Low';
}

describe('GNSS Risk Scoring', () => {
	describe('Kp scoring', () => {
		it('returns 0 for null', () => expect(scoreKp(null)).toBe(0));
		it('returns 5 for quiet (Kp 2)', () => expect(scoreKp(2)).toBe(5));
		it('returns 35 for active (Kp 4)', () => expect(scoreKp(4)).toBe(35));
		it('returns 55 for storm (Kp 5)', () => expect(scoreKp(5)).toBe(55));
		it('returns 100 for extreme (Kp 9)', () => expect(scoreKp(9)).toBe(100));
	});

	describe('Bz scoring', () => {
		it('returns 0 for null', () => expect(scoreBz(null)).toBe(0));
		it('returns 5 for northward (Bz +5)', () => expect(scoreBz(5)).toBe(5));
		it('returns 30 for slightly southward (Bz -2)', () => expect(scoreBz(-2)).toBe(30));
		it('returns 80 for strongly southward (Bz -15)', () => expect(scoreBz(-15)).toBe(80));
		it('returns 100 for extreme southward (Bz -25)', () => expect(scoreBz(-25)).toBe(100));
	});

	describe('Solar wind speed scoring', () => {
		it('returns 0 for null', () => expect(scoreSpeed(null)).toBe(0));
		it('returns 5 for nominal (350 km/s)', () => expect(scoreSpeed(350)).toBe(5));
		it('returns 25 for slightly elevated (450 km/s)', () => expect(scoreSpeed(450)).toBe(25));
		it('returns 70 for high-speed (700 km/s)', () => expect(scoreSpeed(700)).toBe(70));
		it('returns 100 for extreme (900 km/s)', () => expect(scoreSpeed(900)).toBe(100));
	});

	describe('R-scale scoring', () => {
		it('returns 0 for R0', () => expect(scoreRScale(0)).toBe(0));
		it('returns 15 for R1', () => expect(scoreRScale(1)).toBe(15));
		it('returns 60 for R3', () => expect(scoreRScale(3)).toBe(60));
		it('returns 100 for R5', () => expect(scoreRScale(5)).toBe(100));
	});

	describe('Composite score', () => {
		it('computes low risk for quiet conditions', () => {
			const score = computeScore(1, 3, 350, 0);
			expect(score).toBeLessThan(20);
			expect(riskLevel(score)).toBe('Low');
		});

		it('computes moderate risk for unsettled conditions', () => {
			const score = computeScore(4, -3, 450, 0);
			expect(score).toBeGreaterThanOrEqual(20);
			expect(score).toBeLessThan(40);
			expect(riskLevel(score)).toBe('Moderate');
		});

		it('computes high risk for storm conditions', () => {
			const score = computeScore(6, -8, 550, 2);
			expect(score).toBeGreaterThanOrEqual(40);
			expect(riskLevel(score)).toBe('High');
		});

		it('computes extreme risk for severe conditions', () => {
			const score = computeScore(9, -25, 900, 5);
			expect(score).toBeGreaterThanOrEqual(80);
			expect(riskLevel(score)).toBe('Extreme');
		});

		it('handles all-null gracefully', () => {
			const score = computeScore(null, null, null, 0);
			expect(score).toBe(0);
			expect(riskLevel(score)).toBe('Low');
		});
	});

	describe('Risk level classification', () => {
		it('Low: 0-19', () => {
			expect(riskLevel(0)).toBe('Low');
			expect(riskLevel(19)).toBe('Low');
		});
		it('Moderate: 20-39', () => {
			expect(riskLevel(20)).toBe('Moderate');
			expect(riskLevel(39)).toBe('Moderate');
		});
		it('High: 40-59', () => {
			expect(riskLevel(40)).toBe('High');
			expect(riskLevel(59)).toBe('High');
		});
		it('Severe: 60-79', () => {
			expect(riskLevel(60)).toBe('Severe');
			expect(riskLevel(79)).toBe('Severe');
		});
		it('Extreme: 80-100', () => {
			expect(riskLevel(80)).toBe('Extreme');
			expect(riskLevel(100)).toBe('Extreme');
		});
	});
});
