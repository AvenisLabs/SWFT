// dashboard.ts v0.1.0 — Client-side reactive stores for dashboard data

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

/**
 * Fetch JSON from an API endpoint with error handling.
 * Returns the parsed data payload or null on failure.
 */
export async function fetchApi<T>(path: string): Promise<T | null> {
	try {
		const res = await fetch(path);
		if (!res.ok) return null;
		const json = await res.json();
		return json.data ?? json;
	} catch {
		return null;
	}
}
