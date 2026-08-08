// +page.server.ts v0.1.0 — Load channels owned by the auth'd user for the
// /notifications dashboard. Auth was already verified in hooks.server.ts.

import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { listChannels } from '$lib/server/notif-channels';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.authUser) return { channels: [] };
	const channels = await listChannels(getDb(platform), locals.authUser.email);
	return { channels };
};
