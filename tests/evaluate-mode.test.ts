// evaluate-mode.test.ts v0.1.0 — Pure-logic tests for the dynamic-rate state
// machine. No D1 or Worker globals involved.

import { describe, it, expect } from 'vitest';
import {
	computeEffectiveMode,
	evaluateMode,
	shouldActForMode,
	type ModeState,
	type ModeAlert,
} from '../workers/cron-ingest/src/lib/evaluate-mode';

const NOW = new Date('2026-04-20T14:00:00.000Z');
const IN_6H = new Date(NOW.getTime() + 6 * 3600_000).toISOString();
const IN_24H = new Date(NOW.getTime() + 24 * 3600_000).toISOString();
const IN_12H = new Date(NOW.getTime() + 12 * 3600_000).toISOString();
const PAST_1H = new Date(NOW.getTime() - 1 * 3600_000).toISOString();

const EMPTY_STATE: ModeState = { activeMode: 'normal', stormUntilIso: '', elevatedUntilIso: '' };

describe('shouldActForMode', () => {
	it('storm acts on every fire', () => {
		for (let m = 0; m < 60; m += 5) expect(shouldActForMode('storm', m)).toBe(true);
	});

	it('elevated acts every 15 minutes', () => {
		expect(shouldActForMode('elevated', 0)).toBe(true);
		expect(shouldActForMode('elevated', 15)).toBe(true);
		expect(shouldActForMode('elevated', 30)).toBe(true);
		expect(shouldActForMode('elevated', 45)).toBe(true);
		expect(shouldActForMode('elevated', 5)).toBe(false);
		expect(shouldActForMode('elevated', 10)).toBe(false);
	});

	it('normal acts only at the top of the hour', () => {
		expect(shouldActForMode('normal', 0)).toBe(true);
		for (let m = 5; m < 60; m += 5) expect(shouldActForMode('normal', m)).toBe(false);
	});
});

describe('computeEffectiveMode', () => {
	it('returns normal for empty state', () => {
		expect(computeEffectiveMode(EMPTY_STATE, NOW)).toBe('normal');
	});

	it('returns storm when stormUntil is in the future', () => {
		expect(computeEffectiveMode({ activeMode: 'storm', stormUntilIso: IN_6H, elevatedUntilIso: '' }, NOW)).toBe('storm');
	});

	it('returns elevated when only elevatedUntil is in the future', () => {
		expect(computeEffectiveMode({ activeMode: 'elevated', stormUntilIso: PAST_1H, elevatedUntilIso: IN_6H }, NOW)).toBe('elevated');
	});

	it('auto-expires past timestamps without persistence', () => {
		expect(computeEffectiveMode({ activeMode: 'storm', stormUntilIso: PAST_1H, elevatedUntilIso: PAST_1H }, NOW)).toBe('normal');
	});

	it('storm wins over elevated when both are in the future', () => {
		expect(computeEffectiveMode({ activeMode: 'storm', stormUntilIso: IN_6H, elevatedUntilIso: IN_24H }, NOW)).toBe('storm');
	});
});

describe('evaluateMode — triggers', () => {
	it('stays in normal when nothing is active', () => {
		const r = evaluateMode({ kp: 2, activeAlerts: [], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('normal');
		expect(r.stormUntilIso).toBe('');
		expect(r.elevatedUntilIso).toBe('');
	});

	it('enters elevated when Kp reaches 5', () => {
		const r = evaluateMode({ kp: 5.1, activeAlerts: [], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('elevated');
		expect(r.elevatedUntilIso).toBe(IN_12H);
		expect(r.stormUntilIso).toBe('');
	});

	it('enters storm when Kp reaches 6', () => {
		const r = evaluateMode({ kp: 6.5, activeAlerts: [], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('storm');
		expect(r.stormUntilIso).toBe(IN_12H);
		// storm implies elevated floor — elevated hold is also set so we land in
		// elevated (not normal) when storm expires.
		expect(r.elevatedUntilIso).toBe(IN_12H);
	});

	it('enters elevated on a G1 alert with no end time', () => {
		const alert: ModeAlert = { scaleType: 'G', scaleValue: 1, ends: null };
		const r = evaluateMode({ kp: 3, activeAlerts: [alert], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('elevated');
		expect(r.elevatedUntilIso).toBe(IN_12H);
	});

	it('enters storm on a G2 alert', () => {
		const alert: ModeAlert = { scaleType: 'G', scaleValue: 2, ends: null };
		const r = evaluateMode({ kp: 3, activeAlerts: [alert], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('storm');
	});

	it('extends stormUntil to the alert end when it exceeds 12h', () => {
		const alert: ModeAlert = { scaleType: 'G', scaleValue: 3, ends: IN_24H };
		const r = evaluateMode({ kp: 3, activeAlerts: [alert], now: NOW, current: EMPTY_STATE });
		expect(r.stormUntilIso).toBe(IN_24H);
	});

	it('ignores non-G alerts for mode triggering', () => {
		const alert: ModeAlert = { scaleType: 'S', scaleValue: 3, ends: null }; // solar radiation, not geomagnetic
		const r = evaluateMode({ kp: 3, activeAlerts: [alert], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('normal');
	});

	it('ignores alerts whose end is in the past', () => {
		const alert: ModeAlert = { scaleType: 'G', scaleValue: 3, ends: PAST_1H };
		const r = evaluateMode({ kp: 3, activeAlerts: [alert], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('normal');
	});

	it('survives null Kp (data fetch failure) and falls back to alerts', () => {
		const alert: ModeAlert = { scaleType: 'G', scaleValue: 2, ends: null };
		const r = evaluateMode({ kp: null, activeAlerts: [alert], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('storm');
	});

	it('stays normal when Kp is null and no alerts fire', () => {
		const r = evaluateMode({ kp: null, activeAlerts: [], now: NOW, current: EMPTY_STATE });
		expect(r.activeMode).toBe('normal');
	});
});

describe('evaluateMode — hysteresis and downgrade', () => {
	it('keeps storm active during a brief Kp dip while storm_until is still in the future', () => {
		const r = evaluateMode({
			kp: 3.5,
			activeAlerts: [],
			now: NOW,
			current: { activeMode: 'storm', stormUntilIso: IN_6H, elevatedUntilIso: IN_6H },
		});
		expect(r.activeMode).toBe('storm');
		expect(r.stormUntilIso).toBe(IN_6H);
	});

	it('downgrades storm -> elevated when stormUntil has expired but elevatedUntil has not', () => {
		const r = evaluateMode({
			kp: 3,
			activeAlerts: [],
			now: NOW,
			current: { activeMode: 'storm', stormUntilIso: PAST_1H, elevatedUntilIso: IN_6H },
		});
		expect(r.activeMode).toBe('elevated');
		expect(r.stormUntilIso).toBe('');
		expect(r.elevatedUntilIso).toBe(IN_6H);
	});

	it('downgrades to normal when both expiries are past and no fresh trigger', () => {
		const r = evaluateMode({
			kp: 2,
			activeAlerts: [],
			now: NOW,
			current: { activeMode: 'storm', stormUntilIso: PAST_1H, elevatedUntilIso: PAST_1H },
		});
		expect(r.activeMode).toBe('normal');
		expect(r.stormUntilIso).toBe('');
		expect(r.elevatedUntilIso).toBe('');
	});

	it('does not shorten an existing stormUntil when the new trigger is closer in time', () => {
		const r = evaluateMode({
			kp: 6.1,
			activeAlerts: [],
			now: NOW,
			current: { activeMode: 'storm', stormUntilIso: IN_24H, elevatedUntilIso: IN_24H },
		});
		// Existing 24h hold preserved; not shortened by the fresh 12h trigger.
		expect(r.stormUntilIso).toBe(IN_24H);
	});

	it('promotes elevated -> storm when Kp crosses 6 while elevated hold is active', () => {
		const r = evaluateMode({
			kp: 6.8,
			activeAlerts: [],
			now: NOW,
			current: { activeMode: 'elevated', stormUntilIso: '', elevatedUntilIso: IN_6H },
		});
		expect(r.activeMode).toBe('storm');
		expect(r.stormUntilIso).toBe(IN_12H);
		// Elevated hold was shorter than 12h — gets extended to at least 12h.
		expect(r.elevatedUntilIso).toBe(IN_12H);
	});
});
