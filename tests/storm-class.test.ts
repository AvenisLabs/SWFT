// storm-class.test.ts v0.1.0 — Boundary tests for the NOAA G-scale mapping.

import { describe, it, expect } from 'vitest';
import { classifyStormClass } from '../workers/cron-ingest/src/lib/storm-class';

describe('classifyStormClass', () => {
	it('maps Kp 4 to active', () => {
		expect(classifyStormClass(4)).toBe('active');
		expect(classifyStormClass(4.9)).toBe('active');
	});

	it('maps Kp 5 to G1', () => {
		expect(classifyStormClass(5)).toBe('G1');
		expect(classifyStormClass(5.7)).toBe('G1');
	});

	it('maps Kp 6 to G2', () => {
		expect(classifyStormClass(6)).toBe('G2');
		expect(classifyStormClass(6.3)).toBe('G2');
	});

	it('maps Kp 7 to G3', () => {
		expect(classifyStormClass(7)).toBe('G3');
	});

	it('maps Kp 8 to G4', () => {
		expect(classifyStormClass(8)).toBe('G4');
	});

	it('maps Kp 9+ to G5', () => {
		expect(classifyStormClass(9)).toBe('G5');
		expect(classifyStormClass(9.5)).toBe('G5');
	});

	it('returns active for Kp below persistence threshold (unreachable in normal use)', () => {
		// appendKpEvents filters out Kp<4 before calling this, so the fallback
		// should never be observed in production — but a pure function should be
		// safe under any input.
		expect(classifyStormClass(0)).toBe('active');
		expect(classifyStormClass(3.9)).toBe('active');
	});
});
