// storm-class.ts v0.1.0 — NOAA G-scale classification. Pure function, no D1 ref,
// so the unit test can import it directly without pulling in Workers globals.

export type StormClass = 'active' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5';

/** Map a Kp value to its NOAA G-scale storm class. Anything below Kp 4 returns
 *  'active' by convention — this function is only called for buckets that have
 *  already passed the Kp>=4 persistence threshold. */
export function classifyStormClass(kp: number): StormClass {
	if (kp >= 9) return 'G5';
	if (kp >= 8) return 'G4';
	if (kp >= 7) return 'G3';
	if (kp >= 6) return 'G2';
	if (kp >= 5) return 'G1';
	return 'active';
}
