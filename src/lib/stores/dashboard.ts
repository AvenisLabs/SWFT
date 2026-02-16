// dashboard.ts v0.2.0 — Client-side reactive stores for dashboard data

import { writable } from 'svelte/store';
import type { KpSummary, GnssRiskResult, AlertItem, StatusResponse } from '$types/api';

/** Current Kp summary data */
export const kpSummary = writable<KpSummary | null>(null);

/** Current GNSS risk assessment */
export const gnssRisk = writable<GnssRiskResult | null>(null);

/** Active alerts list */
export const activeAlerts = writable<AlertItem[]>([]);

/** System status */
export const systemStatus = writable<StatusResponse | null>(null);

/** Loading state flags */
export const loading = writable({
	kp: true,
	gnss: true,
	alerts: true,
	status: true,
});

/** Last data fetch timestamp */
export const lastFetch = writable<string | null>(null);

/** Staleness threshold: 4 missed 15-min updates = 60 minutes */
export const STALE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Fetch JSON from an API endpoint with error handling.
 * Returns the parsed data payload or null on failure.
 */
export async function fetchApi<T>(path: string): Promise<T | null> {
	try {
		const res = await fetch(path);
		if (!res.ok) return null;
		const json: { data?: T } = await res.json();
		return json.data ?? (json as unknown as T);
	} catch {
		return null;
	}
}

/** Check if a timestamp is stale (older than STALE_THRESHOLD_MS) */
export function isDataStale(timestamp: string | undefined | null): boolean {
	if (!timestamp) return false; // no data = not stale, just missing
	const age = Date.now() - new Date(timestamp).getTime();
	return age > STALE_THRESHOLD_MS;
}
