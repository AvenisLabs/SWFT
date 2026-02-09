// +page.server.ts v0.2.0 — Dashboard server-side data loading

import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getKpSummary, getEstimatedKp } from '$lib/server/kp';
import type { KpSummary, KpEstimatedPoint } from '$types/api';

export const load: PageServerLoad = async ({ platform }) => {
	let kpSummary: KpSummary | null = null;
	let kpEstimated: KpEstimatedPoint[] = [];

	try {
		const db = getDb(platform);
		[kpSummary, kpEstimated] = await Promise.all([
			getKpSummary(db),
			getEstimatedKp(db, 3),
		]);
	} catch {
		// DB not available in local dev without D1 — graceful fallback
	}

	return { kpSummary, kpEstimated };
};
