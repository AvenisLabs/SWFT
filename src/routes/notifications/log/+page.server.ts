// +page.server.ts v0.1.0 — Load the last 200 delivery rows scoped to the
// authenticated user's channels. We snapshot channel_name at send time so the
// log remains readable even after a channel is deleted.

import type { PageServerLoad } from './$types';
import { getDb, queryAll } from '$lib/server/db';

interface DeliveryRow {
	id: number;
	channel_id: number;
	channel_name: string;
	kind: string;
	payload_summary: string | null;
	ok: number;
	http_status: number | null;
	error: string | null;
	sent_at: string;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.authUser) return { deliveries: [] };
	const db = getDb(platform);

	// Filter to the auth'd user's *current* channels (we can't filter by
	// historical owner — the audit log doesn't store owner_email — but most
	// users will only see deliveries they own anyway). Admins see everyone's
	// log for support purposes.
	if (locals.authUser.role === 'admin') {
		const deliveries = await queryAll<DeliveryRow>(
			db,
			`SELECT id, channel_id, channel_name, kind, payload_summary, ok, http_status, error, sent_at
			 FROM notif_deliveries
			 ORDER BY sent_at DESC
			 LIMIT 200`,
			[]
		);
		return { deliveries, isAdminView: true };
	}

	const deliveries = await queryAll<DeliveryRow>(
		db,
		`SELECT d.id, d.channel_id, d.channel_name, d.kind, d.payload_summary, d.ok, d.http_status, d.error, d.sent_at
		 FROM notif_deliveries d
		 WHERE d.channel_id IN (SELECT id FROM notif_channels WHERE owner_email = ?)
		 ORDER BY d.sent_at DESC
		 LIMIT 200`,
		[locals.authUser.email]
	);
	return { deliveries, isAdminView: false };
};
