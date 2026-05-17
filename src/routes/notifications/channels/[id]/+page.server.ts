// +page.server.ts v0.1.0 — Load one channel + its rule + its schedules for the detail page.

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, queryFirst, queryAll } from '$lib/server/db';
import { getChannel, type NotifRule, type NotifSchedule } from '$lib/server/notif-channels';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (!locals.authUser) throw error(401, 'Authentication required.');
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'Invalid channel id.');

	const db = getDb(platform);
	const channel = await getChannel(db, id, locals.authUser.email);
	if (!channel) throw error(404, 'Channel not found.');

	const rule = await queryFirst<NotifRule>(
		db,
		'SELECT * FROM notif_rules WHERE channel_id = ?',
		[id]
	);
	const schedules = await queryAll<NotifSchedule>(
		db,
		'SELECT * FROM notif_schedules WHERE channel_id = ? ORDER BY created_at ASC',
		[id]
	);

	return { channel, rule, schedules };
};
