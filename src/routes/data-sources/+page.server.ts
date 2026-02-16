// +page.server.ts v0.3.0 — SSR loader for data-sources page (live fetch from all 5 Kp sources)

import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getLatestEstimatedKp } from '$lib/server/kp';
import { fetchAllKpSources } from '$lib/server/kp-sources';
import type { KpSourcesResult } from '$types/api';

export const load: PageServerLoad = async ({ platform }) => {
	let sourcesResult: KpSourcesResult | null = null;

	try {
		// Determine active source from D1
		let activeSourceId = 'noaa_boulder';
		try {
			const db = getDb(platform);
			const latest = await getLatestEstimatedKp(db);
			if (latest?.source) {
				activeSourceId = latest.source === 'noaa' ? 'noaa_estimated' : latest.source;
			}
		} catch {
			// D1 unavailable in local dev — default
		}

		const bomApiKey = platform?.env?.BOM_API_KEY;
		sourcesResult = await fetchAllKpSources(activeSourceId, bomApiKey);
	} catch {
		// External fetch failures — page will show loading/error state
	}

	return { sourcesResult };
};
