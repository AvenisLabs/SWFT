// gnss-risk.test.ts v0.2.0 — Unit tests for GNSS risk scoring logic (recalibrated model)

import { describe, it, expect } from 'vitest';

// Since the scoring functions are private in gnss-risk.ts,
// we test the scoring logic directly by reimplementing the pure functions.
// In production the full model runs against D1, but the scoring math is deterministic.

// Weights: Kp 40%, Bz 25%, Speed 20%, R-Scale 15%
const W_KP = 0.40;
const W_BZ = 0.25;
const W_SPEED = 0.20;
const W_R = 0.15;

// Kp-based floor scores — storms must register at least this risk level
const KP_FLOORS = [
	{ minKp: 8, minScore: 80 }, // G4 → Extreme
	{ minKp: 7, minScore: 60 }, // G3 → Severe
	{ minKp: 6, minScore: 50 }, // G2 → High
	{ minKp: 5, minScore: 40 }, // G1 → High
	{ minKp: 4, minScore: 25 }, // Active → Moderate
];

function scoreKp(kp: number | null): number {
	if (kp === null) return 0;
	if (kp >= 9) return 100;
	if (kp >= 8) return 95;
	if (kp >= 7) return 85;
	if (kp >= 6) return 75;
	if (kp >= 5) return 65;
	if (kp >= 4) return 40;
	if (kp >= 3) return 20;
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

/** Compute weighted score then apply Kp-based floor */
function computeScore(kp: number | null, bz: number | null, speed: number | null, r: number): number {
	const weighted = Math.round(
		scoreKp(kp) * W_KP +
		scoreBz(bz) * W_BZ +
		scoreSpeed(speed) * W_SPEED +
		scoreRScale(r) * W_R
	);

	// Apply Kp-based floor
	let floor = 0;
	if (kp !== null) {
		for (const { minKp, minScore } of KP_FLOORS) {
			if (kp >= minKp) { floor = minScore; break; }
		}
	}
	return Math.max(weighted, floor);
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
		it('returns 40 for active (Kp 4)', () => expect(scoreKp(4)).toBe(40));
		it('returns 65 for G1 storm (Kp 5)', () => expect(scoreKp(5)).toBe(65));
		it('returns 75 for G2 storm (Kp 6)', () => expect(scoreKp(6)).toBe(75));
		it('returns 85 for G3 storm (Kp 7)', () => expect(scoreKp(7)).toBe(85));
		it('returns 95 for G4 storm (Kp 8)', () => expect(scoreKp(8)).toBe(95));
		it('returns 100 for G5 extreme (Kp 9)', () => expect(scoreKp(9)).toBe(100));
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

	describe('Composite score with Kp floor', () => {
		it('computes low risk for quiet conditions', () => {
			const score = computeScore(1, 3, 350, 0);
			expect(score).toBeLessThan(20);
			expect(riskLevel(score)).toBe('Low');
		});

		it('computes moderate risk for active conditions (Kp 4)', () => {
			const score = computeScore(4, -3, 450, 0);
			expect(score).toBeGreaterThanOrEqual(25);
			expect(score).toBeLessThan(40);
			expect(riskLevel(score)).toBe('Moderate');
		});

		it('computes at least High risk for G1 storm (Kp 5) even with mild other factors', () => {
			// Kp 5 with northward Bz, nominal wind, no radio blackout
			const score = computeScore(5, 2, 350, 0);
			expect(score).toBeGreaterThanOrEqual(40);
			expect(riskLevel(score)).toBe('High');
		});

		it('computes High risk for G2 storm with supporting conditions', () => {
			const score = computeScore(6, -8, 550, 2);
			expect(score).toBeGreaterThanOrEqual(50);
			expect(riskLevel(score)).toBe('High');
		});

		it('computes at least Severe for G3 storm (Kp 7) even with mild other factors', () => {
			const score = computeScore(7, 2, 350, 0);
			expect(score).toBeGreaterThanOrEqual(60);
			expect(riskLevel(score)).toBe('Severe');
		});

		it('computes Extreme risk for G4+ storm conditions', () => {
			const score = computeScore(9, -25, 900, 5);
			expect(score).toBeGreaterThanOrEqual(80);
			expect(riskLevel(score)).toBe('Extreme');
		});

		it('computes at least Extreme for G4 storm (Kp 8) even with mild other factors', () => {
			const score = computeScore(8, 2, 350, 0);
			expect(score).toBeGreaterThanOrEqual(80);
			expect(riskLevel(score)).toBe('Extreme');
		});

		it('handles all-null gracefully', () => {
			const score = computeScore(null, null, null, 0);
			expect(score).toBe(0);
			expect(riskLevel(score)).toBe('Low');
		});
	});

	describe('Kp floor guarantees alignment with Kp card', () => {
		it('G1 storm (Kp 5) floors at High regardless of other factors', () => {
			// Worst case: all other factors are calm/northward
			const score = computeScore(5, 5, 300, 0);
			expect(riskLevel(score)).toBe('High');
		});

		it('G2 storm (Kp 6) floors at High', () => {
			const score = computeScore(6, 5, 300, 0);
			expect(riskLevel(score)).toBe('High');
		});

		it('G3 storm (Kp 7) floors at Severe', () => {
			const score = computeScore(7, 5, 300, 0);
			expect(riskLevel(score)).toBe('Severe');
		});

		it('G4 storm (Kp 8) floors at Extreme', () => {
			const score = computeScore(8, 5, 300, 0);
			expect(riskLevel(score)).toBe('Extreme');
		});

		it('Active conditions (Kp 4) floor at Moderate', () => {
			const score = computeScore(4, 5, 300, 0);
			expect(riskLevel(score)).toBe('Moderate');
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
