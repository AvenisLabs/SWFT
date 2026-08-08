// evaluate-mode.ts v0.2.0 — Pure state-transition logic for the dynamic-rate
// cron worker. No D1 references so it can be unit-tested in isolation.
//
// Three tiers drive how often the worker actually executes:
//   storm     — run every 5 min   (triggered by Kp>=6 OR active G2+ alert)
//   elevated  — run every 15 min  (triggered by Kp>=5 OR active G1 alert)
//   normal    — run every 30 min  (top + half hour, everything else)
//
// Upgrades happen on-the-fly. Downgrades never happen directly — instead, each
// tier has a `*_until_iso` expiry timestamp. When a trigger fires, the expiry
// is extended to max(existing, alert-end, now+12h). Mode is then selected as
// the highest tier whose expiry is still in the future. This hysteresis keeps
// a brief Kp dip from bouncing us out of storm tracking prematurely.

export type ActiveMode = 'normal' | 'elevated' | 'storm';

export interface ModeState {
	activeMode: ActiveMode;
	stormUntilIso: string;     // '' when no storm expiry pending
	elevatedUntilIso: string;  // '' when no elevated expiry pending
}

export interface ModeAlert {
	scaleType: string | null;   // 'G' for geomagnetic, 'S' for solar radiation, 'R' for radio blackout
	scaleValue: number | null;  // 1..5
	ends: string | null;        // ISO 8601 or null (null = open-ended)
}

export interface ModeInputs {
	kp: number | null;          // most recent Kp reading, null if data fetch failed
	activeAlerts: ModeAlert[];
	now: Date;
	current: ModeState;
}

const HOLD_HOURS = 12;
const STORM_KP_THRESHOLD = 6;
const ELEVATED_KP_THRESHOLD = 5;

/** Read-only projection of state onto current time — auto-expires any timestamps
 *  that have passed. Used by the skip-gate to decide whether this cron tick
 *  should do real work without needing to persist anything. */
export function computeEffectiveMode(state: ModeState, now: Date): ActiveMode {
	const nowIso = now.toISOString();
	if (state.stormUntilIso && state.stormUntilIso > nowIso) return 'storm';
	if (state.elevatedUntilIso && state.elevatedUntilIso > nowIso) return 'elevated';
	return 'normal';
}

/** Compute the next mode state from fresh data. Call this after a full ingest
 *  run, not on skip ticks. The return value is meant to be written back to
 *  system_state. */
export function evaluateMode({ kp, activeAlerts, now, current }: ModeInputs): ModeState {
	const nowIso = now.toISOString();
	const holdIso = new Date(now.getTime() + HOLD_HOURS * 3600_000).toISOString();

	// Step 1 — auto-expire past timestamps. Empty string is treated as past.
	let stormUntil = current.stormUntilIso && current.stormUntilIso > nowIso ? current.stormUntilIso : '';
	let elevatedUntil = current.elevatedUntilIso && current.elevatedUntilIso > nowIso ? current.elevatedUntilIso : '';

	// Step 2 — classify active alerts by G-scale severity. Alerts with ends in
	// the past are dropped defensively (the caller should already filter, but a
	// pure function should not trust its inputs).
	const gAlerts = activeAlerts.filter(a =>
		a.scaleType === 'G' &&
		typeof a.scaleValue === 'number' &&
		(a.ends === null || a.ends > nowIso)
	);
	const stormAlerts = gAlerts.filter(a => (a.scaleValue as number) >= 2);
	const elevatedOnlyAlerts = gAlerts.filter(a => (a.scaleValue as number) === 1);

	// Step 3 — trigger detection. Storm implies an elevated floor so the
	// intermediary tier is in play when storm expires.
	const stormTrigger = (kp !== null && kp >= STORM_KP_THRESHOLD) || stormAlerts.length > 0;
	const elevatedTrigger =
		(kp !== null && kp >= ELEVATED_KP_THRESHOLD) ||
		stormAlerts.length > 0 ||
		elevatedOnlyAlerts.length > 0;

	// Step 4 — extend expiries. The end timestamp is the max of existing
	// expiry, all driving alert ends, and now + 12h.
	if (stormTrigger) {
		stormUntil = maxIso([stormUntil, ...stormAlerts.map(a => a.ends ?? ''), holdIso]);
	}
	if (elevatedTrigger) {
		elevatedUntil = maxIso([
			elevatedUntil,
			...elevatedOnlyAlerts.map(a => a.ends ?? ''),
			...stormAlerts.map(a => a.ends ?? ''),
			holdIso,
		]);
	}

	// Step 5 — select the active mode. Storm dominates elevated.
	const activeMode: ActiveMode =
		stormUntil && stormUntil > nowIso ? 'storm' :
		elevatedUntil && elevatedUntil > nowIso ? 'elevated' :
		'normal';

	return { activeMode, stormUntilIso: stormUntil, elevatedUntilIso: elevatedUntil };
}

// Skip-gate decision. The five-minute cron fires 12 times per hour; in the
// lower tiers we only do real work on a subset of those fires.
export function shouldActForMode(mode: ActiveMode, minuteOfHour: number): boolean {
	if (mode === 'storm') return true;
	if (mode === 'elevated') return minuteOfHour % 15 === 0;
	return minuteOfHour % 30 === 0; // normal — :00 and :30
}

/** Lex-compare ISO strings to find the max. Empty strings are treated as the
 *  smallest possible value. */
function maxIso(values: string[]): string {
	let best = '';
	for (const v of values) {
		if (v && v > best) best = v;
	}
	return best;
}
