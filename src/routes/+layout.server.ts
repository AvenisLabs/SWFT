// +layout.server.ts v0.3.0 — Root layout SSR data, served via CF Cache API.
//
// Runs on every page request, so D1 calls here are paid by every pageload
// across the site. Both queries are now wrapped in `cachedServerCall` so
// the layout pays one cold D1 round-trip per TTL window, not per request.

import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getActiveOverrides } from '$lib/server/links';
import { getModeState } from '$lib/server/mode';
import { cachedServerCall } from '$lib/server/server-cache';
import { CACHE_TTL } from '$lib/server/constants';
import type { MonitoringModeData } from '$types/api';
import type { LinkOverride } from '$types/api';

const NORMAL_MODE: MonitoringModeData = {
	mode: 'normal',
	storm_until: null,
	elevated_until: null,
};

// 5 min — link overrides change very infrequently (admin action), so a
// longer TTL is fine. There's no constant for this so it lives inline.
const LINK_OVERRIDES_TTL = 300;
const LAYOUT_SSR_BUDGET_MS = 350;

type RootLayoutData = {
	linkOverrides: LinkOverride[];
	modeState: MonitoringModeData;
};

const FALLBACK_LAYOUT_DATA: RootLayoutData = {
	linkOverrides: [],
	modeState: NORMAL_MODE,
};

export const load: LayoutServerLoad = async ({ platform }) => {
	let timedOut = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const dataPromise = loadLayoutData(platform).catch((err) => {
		console.warn('[layout.server] root layout data load failed', err);
		return FALLBACK_LAYOUT_DATA;
	});
	const timeoutPromise = new Promise<RootLayoutData>((resolve) => {
		timer = setTimeout(() => {
			timedOut = true;
			resolve(FALLBACK_LAYOUT_DATA);
		}, LAYOUT_SSR_BUDGET_MS);
	});

	const data = await Promise.race([dataPromise, timeoutPromise]);
	if (timer) clearTimeout(timer);

	if (timedOut) {
		platform?.context?.waitUntil(dataPromise.then(() => undefined));
	}

	return data;
};

async function loadLayoutData(platform: Parameters<LayoutServerLoad>[0]['platform']): Promise<RootLayoutData> {
	const db = getDb(platform);
	const [linkOverrides, modeState] = await Promise.all([
		cachedServerCall('layout:link-overrides', LINK_OVERRIDES_TTL, () =>
			getActiveOverrides(db).catch(() => []),
			platform,
		),
		cachedServerCall('layout:mode-state', CACHE_TTL.MODE_STATE, () =>
			getModeState(db).catch(() => NORMAL_MODE),
			platform,
		),
	]);

	return { linkOverrides, modeState };
}
