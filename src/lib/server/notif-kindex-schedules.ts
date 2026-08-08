// notif-kindex-schedules.ts v0.1.0 - CRUD for scheduled K-index source pushes.

import type { D1Database } from '@cloudflare/workers-types';
import { isValidTimeZone } from '$lib/utils/timeFormat';
import { execute, queryAll, queryFirst } from './db';

export interface NotifKIndexPushSchedule {
	id: number;
	channel_id: number;
	enabled: number;
	push_time: string;
	timezone: string;
	lookback_hours: number;
	last_sent_local_date: string | null;
	last_sent_at: string | null;
	created_at: string;
	updated_at: string;
}

export function validateKIndexSchedule(input: {
	push_time?: unknown;
	timezone?: unknown;
	lookback_hours?: unknown;
	enabled?: unknown;
}): string | null {
	if (input.push_time !== undefined) {
		if (typeof input.push_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.push_time)) {
			return 'Push time must be HH:MM in the selected timezone.';
		}
	}

	if (input.timezone !== undefined) {
		if (typeof input.timezone !== 'string' || !isValidTimeZone(input.timezone)) {
			return 'Timezone must be a valid IANA timezone, for example America/New_York.';
		}
	}

	if (input.lookback_hours !== undefined) {
		const n = Number(input.lookback_hours);
		if (!Number.isInteger(n) || n < 1 || n > 12) {
			return 'Lookback must be a whole number from 1 to 12 hours.';
		}
	}

	if (input.enabled !== undefined && typeof input.enabled !== 'boolean' && input.enabled !== 0 && input.enabled !== 1) {
		return 'Enabled must be true or false.';
	}

	return null;
}

export async function listKIndexPushSchedules(
	db: D1Database,
	channelId: number
): Promise<NotifKIndexPushSchedule[]> {
	return queryAll<NotifKIndexPushSchedule>(
		db,
		`SELECT id, channel_id, enabled, push_time, timezone, lookback_hours,
		        last_sent_local_date, last_sent_at, created_at, updated_at
		 FROM notif_kindex_push_schedules
		 WHERE channel_id = ?
		 ORDER BY push_time ASC, id ASC`,
		[channelId]
	);
}

export async function createKIndexPushSchedule(
	db: D1Database,
	channelId: number,
	input: { push_time: string; timezone: string; lookback_hours: number; enabled?: boolean }
): Promise<NotifKIndexPushSchedule> {
	const now = new Date().toISOString();
	const result = await db
		.prepare(
			`INSERT INTO notif_kindex_push_schedules
			   (channel_id, enabled, push_time, timezone, lookback_hours, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(channelId, input.enabled === false ? 0 : 1, input.push_time, input.timezone, input.lookback_hours, now, now)
		.run();
	const id = Number(result.meta?.last_row_id);
	if (!id) throw new Error('Failed to retrieve new K-index push schedule id.');

	const row = await queryFirst<NotifKIndexPushSchedule>(
		db,
		`SELECT id, channel_id, enabled, push_time, timezone, lookback_hours,
		        last_sent_local_date, last_sent_at, created_at, updated_at
		 FROM notif_kindex_push_schedules WHERE id = ?`,
		[id]
	);
	if (!row) throw new Error('K-index push schedule inserted but could not be re-read.');
	return row;
}

export async function updateKIndexPushSchedule(
	db: D1Database,
	channelId: number,
	id: number,
	patch: Partial<Pick<NotifKIndexPushSchedule, 'push_time' | 'timezone' | 'lookback_hours' | 'enabled'>>
): Promise<NotifKIndexPushSchedule | null> {
	const sets: string[] = [];
	const params: unknown[] = [];
	let resetLastSentDate = false;

	if (patch.push_time !== undefined) {
		sets.push('push_time = ?');
		params.push(patch.push_time);
		resetLastSentDate = true;
	}
	if (patch.timezone !== undefined) {
		sets.push('timezone = ?');
		params.push(patch.timezone);
		resetLastSentDate = true;
	}
	if (patch.lookback_hours !== undefined) {
		sets.push('lookback_hours = ?');
		params.push(patch.lookback_hours);
	}
	if (patch.enabled !== undefined) {
		sets.push('enabled = ?');
		params.push(patch.enabled ? 1 : 0);
	}
	if (resetLastSentDate) sets.push('last_sent_local_date = NULL');
	if (sets.length === 0) {
		return queryFirst<NotifKIndexPushSchedule>(
			db,
			'SELECT * FROM notif_kindex_push_schedules WHERE id = ? AND channel_id = ?',
			[id, channelId]
		);
	}

	sets.push('updated_at = ?');
	params.push(new Date().toISOString(), id, channelId);

	const changed = await execute(
		db,
		`UPDATE notif_kindex_push_schedules SET ${sets.join(', ')}
		 WHERE id = ? AND channel_id = ?`,
		params
	);
	if (changed === 0) return null;

	return queryFirst<NotifKIndexPushSchedule>(
		db,
		`SELECT id, channel_id, enabled, push_time, timezone, lookback_hours,
		        last_sent_local_date, last_sent_at, created_at, updated_at
		 FROM notif_kindex_push_schedules WHERE id = ? AND channel_id = ?`,
		[id, channelId]
	);
}

export async function deleteKIndexPushSchedule(
	db: D1Database,
	channelId: number,
	id: number
): Promise<boolean> {
	const changed = await execute(
		db,
		'DELETE FROM notif_kindex_push_schedules WHERE id = ? AND channel_id = ?',
		[id, channelId]
	);
	return changed > 0;
}
