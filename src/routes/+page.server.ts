// +page.server.ts v0.1.0 — Dashboard server-side data loading

import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getKpSummary } from '$lib/server/kp';
import type { KpSummary } from '$types/api';

export const load: PageServerLoad = async ({ platform }) => {
	let kpSummary: KpSummary | null = null;

	try {
		const db = getDb(platform);
		kpSummary = await getKpSummary(db);
	} catch {
		// DB not available in local dev without D1 — graceful fallback
	}

	return { kpSummary };
};
