// +page.server.ts v0.3.0 — Dashboard server-side data loading (all 4 data sources)

import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getKpSummary, getEstimatedKp } from '$lib/server/kp';
import { computeGnssRisk } from '$lib/server/gnss-risk';
import { getActiveAlerts } from '$lib/server/alerts';
import type { KpSummary, KpEstimatedPoint, GnssRiskResult, AlertItem } from '$types/api';

export const load: PageServerLoad = async ({ platform }) => {
	let kpSummary: KpSummary | null = null;
	let kpEstimated: KpEstimatedPoint[] = [];
	let gnssRisk: GnssRiskResult | null = null;
	let alerts: AlertItem[] = [];

	try {
		const db = getDb(platform);
		[kpSummary, kpEstimated, gnssRisk, alerts] = await Promise.all([
			getKpSummary(db),
			getEstimatedKp(db, 3),
			computeGnssRisk(db),
			getActiveAlerts(db),
		]);
	} catch {
		// DB not available in local dev without D1 — graceful fallback
	}

	return { kpSummary, kpEstimated, gnssRisk, alerts };
};
