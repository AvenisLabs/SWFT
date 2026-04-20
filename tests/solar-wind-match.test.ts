// solar-wind-match.test.ts v0.1.0 — Tests for the nearest-neighbour lookup
// that enriches kp_events rows with Bz/speed.

import { describe, it, expect } from 'vitest';
import { nearestSolarWind, type SolarWindRow } from '../workers/cron-ingest/src/lib/solar-wind-match';

const TOLERANCE = 30 * 60_000;

function row(isoOffsetMinutes: number, bz: number | null, speed: number | null): SolarWindRow {
	const base = new Date('2026-04-20T14:00:00.000Z').getTime();
	return { ts: new Date(base + isoOffsetMinutes * 60_000).toISOString(), bz, speed };
}

describe('nearestSolarWind', () => {
	it('returns null when the readings array is empty', () => {
		const result = nearestSolarWind([], '2026-04-20T14:00:00.000Z', TOLERANCE);
		expect(result).toEqual({ bz: null, speed: null });
	});

	it('picks the reading closest to the target timestamp', () => {
		const readings = [row(-20, -5, 400), row(-5, -8, 500), row(10, -6, 450)];
		// Target is 14:00 exactly — nearest is the -5-min reading.
		const result = nearestSolarWind(readings, '2026-04-20T14:00:00.000Z', TOLERANCE);
		expect(result).toEqual({ bz: -8, speed: 500 });
	});

	it('returns null when the nearest reading is outside the tolerance window', () => {
		const readings = [row(-90, -10, 600), row(60, -3, 350)];
		// Both readings are > 30 min away from 14:00.
		const result = nearestSolarWind(readings, '2026-04-20T14:00:00.000Z', TOLERANCE);
		expect(result).toEqual({ bz: null, speed: null });
	});

	it('works when target is earlier than every reading (left edge)', () => {
		const readings = [row(15, -4, 420), row(30, -5, 430), row(45, -6, 440)];
		const result = nearestSolarWind(readings, '2026-04-20T14:00:00.000Z', TOLERANCE);
		// Closest is +15 min; within tolerance.
		expect(result).toEqual({ bz: -4, speed: 420 });
	});

	it('works when target is later than every reading (right edge)', () => {
		const readings = [row(-45, -4, 420), row(-30, -5, 430), row(-15, -6, 440)];
		const result = nearestSolarWind(readings, '2026-04-20T14:00:00.000Z', TOLERANCE);
		// Closest is -15 min; within tolerance.
		expect(result).toEqual({ bz: -6, speed: 440 });
	});

	it('preserves null bz/speed fields from the matched reading', () => {
		const readings = [row(-5, null, null)];
		const result = nearestSolarWind(readings, '2026-04-20T14:00:00.000Z', TOLERANCE);
		expect(result).toEqual({ bz: null, speed: null });
	});

	it('uses custom tolerance when provided', () => {
		const readings = [row(-20, -5, 450)];
		// 20-min reading, 10-min tolerance → out of range.
		expect(nearestSolarWind(readings, '2026-04-20T14:00:00.000Z', 10 * 60_000))
			.toEqual({ bz: null, speed: null });
		// Same reading, 60-min tolerance → match.
		expect(nearestSolarWind(readings, '2026-04-20T14:00:00.000Z', 60 * 60_000))
			.toEqual({ bz: -5, speed: 450 });
	});
});
