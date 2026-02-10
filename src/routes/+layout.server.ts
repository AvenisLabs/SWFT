// +layout.server.ts v0.1.0 — Root layout server load: provides link overrides to all pages

import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getActiveOverrides } from '$lib/server/links';

export const load: LayoutServerLoad = async ({ platform }) => {
	try {
		const db = getDb(platform);
		const linkOverrides = await getActiveOverrides(db);
		return { linkOverrides };
	} catch {
		// Graceful fallback — overrides are optional enhancement
		return { linkOverrides: [] };
	}
};
