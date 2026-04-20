// +layout.server.ts v0.2.0 — Root layout server load: link overrides + monitoring
// mode. Both are small, cached, and fail-safe (defaults applied if D1 errors).

import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getActiveOverrides } from '$lib/server/links';
import { getModeState } from '$lib/server/mode';
import type { MonitoringModeData } from '$types/api';

const NORMAL_MODE: MonitoringModeData = {
	mode: 'normal',
	storm_until: null,
	elevated_until: null,
};

export const load: LayoutServerLoad = async ({ platform }) => {
	try {
		const db = getDb(platform);
		const [linkOverrides, modeState] = await Promise.all([
			getActiveOverrides(db).catch(() => []),
			getModeState(db).catch(() => NORMAL_MODE),
		]);
		return { linkOverrides, modeState };
	} catch {
		return { linkOverrides: [], modeState: NORMAL_MODE };
	}
};
