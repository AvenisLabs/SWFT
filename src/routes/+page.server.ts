// +page.server.ts v0.5.0 — Dashboard SSR data, served via CF Cache API.
//
// The DB helpers are wrapped in `cachedServerCall` so the cache is hit
// directly from this loader without depending on SvelteKit's internal
// fetch routing through withCache (which empirically does not hit
// caches.default reliably under adapter-cloudflare). Each TTL window
// pays one cold D1 round-trip; everything else hits the edge cache in
// single-digit ms.

import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getKpSummary, getEstimatedKp } from '$lib/server/kp';
import { computeGnssRisk } from '$lib/server/gnss-risk';
import { getActiveAlerts } from '$lib/server/alerts';
import { cachedServerCall } from '$lib/server/server-cache';
import { CACHE_TTL } from '$lib/server/constants';
import type { KpSummary, KpEstimatedPoint, GnssRiskResult, AlertItem } from '$types/api';

const DASHBOARD_SSR_BUDGET_MS = 650;

type DashboardLoadData = {
	kpSummary: KpSummary | null;
	kpEstimated: KpEstimatedPoint[];
	gnssRisk: GnssRiskResult | null;
	alerts: AlertItem[];
};

const FALLBACK_DASHBOARD_DATA: DashboardLoadData = {
	kpSummary: null,
	kpEstimated: [],
	gnssRisk: null,
	alerts: [],
};

export const load: PageServerLoad = async ({ platform }) => {
	let timedOut = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const dataPromise = loadDashboardData(platform).catch((err) => {
		console.warn('[page.server] dashboard data load failed', err);
		return FALLBACK_DASHBOARD_DATA;
	});
	const timeoutPromise = new Promise<DashboardLoadData>((resolve) => {
		timer = setTimeout(() => {
			timedOut = true;
			resolve(FALLBACK_DASHBOARD_DATA);
		}, DASHBOARD_SSR_BUDGET_MS);
	});

	const data = await Promise.race([dataPromise, timeoutPromise]);
	if (timer) clearTimeout(timer);

	if (timedOut) {
		platform?.context?.waitUntil(dataPromise.then(() => undefined));
	}

	return data;
};

async function loadDashboardData(platform: Parameters<PageServerLoad>[0]['platform']): Promise<DashboardLoadData> {
	const db = getDb(platform);
	const [kpSummary, kpEstimated, gnssRisk, alerts] = await Promise.all([
		cachedServerCall('page-home:kp-summary', CACHE_TTL.KP_SUMMARY, () => getKpSummary(db), platform),
		cachedServerCall('page-home:kp-estimated-3h', CACHE_TTL.KP_ESTIMATED, () => getEstimatedKp(db, 3), platform),
		cachedServerCall('page-home:gnss-risk', CACHE_TTL.GNSS_RISK, () => computeGnssRisk(db), platform),
		cachedServerCall('page-home:alerts-active', CACHE_TTL.ALERTS, () => getActiveAlerts(db), platform),
	]);

	return { kpSummary, kpEstimated, gnssRisk, alerts };
}
