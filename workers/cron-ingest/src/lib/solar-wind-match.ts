// solar-wind-match.ts v0.1.0 — Pure nearest-neighbour lookup for solar wind
// enrichment of kp_events rows. Extracted from ingest-kp-estimated.ts so it's
// unit-testable without pulling in Workers globals.

export interface SolarWindRow {
	ts: string;              // ISO 8601
	bz: number | null;
	speed: number | null;
}

/** Nearest-neighbour lookup within a tolerance window. `readings` must be sorted
 *  by ts ASC. Returns {bz:null, speed:null} if no reading is within tolerance
 *  of `targetIso`, or if the array is empty. */
export function nearestSolarWind(
	readings: SolarWindRow[],
	targetIso: string,
	toleranceMs: number,
): { bz: number | null; speed: number | null } {
	if (readings.length === 0) return { bz: null, speed: null };
	const targetMs = new Date(targetIso).getTime();

	let best: SolarWindRow | null = null;
	let bestDist = Infinity;
	for (const r of readings) {
		const dist = Math.abs(new Date(r.ts).getTime() - targetMs);
		if (dist < bestDist) {
			bestDist = dist;
			best = r;
		} else if (dist > bestDist) {
			// Sorted ASC by ts → distance forms a V around the target. Once it
			// starts growing, we've passed the minimum.
			break;
		}
	}

	if (!best || bestDist > toleranceMs) return { bz: null, speed: null };
	return { bz: best.bz, speed: best.speed };
}
