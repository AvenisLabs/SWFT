// notif-channels.ts v0.1.0 — Server-side library for channel CRUD.
//
// A channel is one destination (Discord webhook URL or SMS phone). Each
// channel owns exactly one rule row and zero-or-more schedule rows. Creating
// a channel auto-creates the rule row with defaults and an empty state row,
// so callers never have to remember the secondary inserts.

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst, execute } from './db';

export type ChannelKind = 'discord' | 'sms';

export interface NotifChannel {
	id: number;
	owner_email: string;
	name: string;
	kind: ChannelKind;
	target: string;
	mention: string | null;
	enabled: number; // 0 | 1 (D1 has no boolean)
	created_at: string;
}

export interface NotifRule {
	channel_id: number;
	threshold_kp: number;
	immediate_threshold_kp: number;
	summary_interval_min: number;
	burst_window_max_hours: number;
	off_hours_digest_time: string | null;
	off_hours_digest_on_resume: number;
	storm_end_notify: number;
	quiet_below_g1: number;
}

export interface NotifSchedule {
	id: number;
	channel_id: number;
	days_mask: number;
	hour_start: number;
	hour_end: number;
	timezone: string;
	date_range_start: string | null;
	date_range_end: string | null;
	created_at: string;
}

const DISCORD_WEBHOOK_RE =
	/^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i;

/** Validation: kind-specific target check. Returns null if OK, error string otherwise. */
export function validateTarget(kind: ChannelKind, target: string): string | null {
	const trimmed = target.trim();
	if (!trimmed) return 'Target is required.';
	if (kind === 'discord') {
		if (!DISCORD_WEBHOOK_RE.test(trimmed)) {
			return 'Not a valid Discord webhook URL (expected https://discord.com/api/webhooks/<id>/<token>).';
		}
	} else if (kind === 'sms') {
		// E.164: + then 8-15 digits. TextBelt is happy with plain digits too,
		// but normalize at insert time.
		if (!/^\+?[1-9]\d{7,14}$/.test(trimmed.replace(/[\s()-]/g, ''))) {
			return 'Not a valid phone number (expected E.164, e.g. +15551234567).';
		}
	}
	return null;
}

/** Normalize a target string for storage. */
export function normalizeTarget(kind: ChannelKind, target: string): string {
	if (kind === 'sms') return target.replace(/[\s()-]/g, '');
	return target.trim();
}

/** List channels owned by `email`, oldest first. */
export async function listChannels(db: D1Database, email: string): Promise<NotifChannel[]> {
	return queryAll<NotifChannel>(
		db,
		`SELECT id, owner_email, name, kind, target, mention, enabled, created_at
		 FROM notif_channels WHERE owner_email = ? ORDER BY created_at ASC`,
		[email]
	);
}

/** Get one channel, scoped to owner. Returns null if not found or not owned. */
export async function getChannel(
	db: D1Database,
	id: number,
	email: string
): Promise<NotifChannel | null> {
	return queryFirst<NotifChannel>(
		db,
		`SELECT id, owner_email, name, kind, target, mention, enabled, created_at
		 FROM notif_channels WHERE id = ? AND owner_email = ?`,
		[id, email]
	);
}

/** Create channel + default rule row + state row in a batch. */
export async function createChannel(
	db: D1Database,
	input: {
		owner_email: string;
		name: string;
		kind: ChannelKind;
		target: string;
		mention: string | null;
	}
): Promise<NotifChannel> {
	const insertChannel = await db
		.prepare(
			`INSERT INTO notif_channels (owner_email, name, kind, target, mention, enabled)
			 VALUES (?, ?, ?, ?, ?, 1)`
		)
		.bind(input.owner_email, input.name, input.kind, input.target, input.mention)
		.run();

	const id = Number(insertChannel.meta?.last_row_id);
	if (!id) throw new Error('Failed to retrieve new channel id.');

	// Seed rule + state in one batch (D1 batch limit is 50; we're at 2).
	await db.batch([
		db.prepare('INSERT INTO notif_rules (channel_id) VALUES (?)').bind(id),
		db.prepare('INSERT INTO notif_state (channel_id) VALUES (?)').bind(id),
	]);

	const row = await queryFirst<NotifChannel>(
		db,
		`SELECT id, owner_email, name, kind, target, mention, enabled, created_at
		 FROM notif_channels WHERE id = ?`,
		[id]
	);
	if (!row) throw new Error('Channel inserted but could not be re-read.');
	return row;
}

/** Update mutable channel fields. Scoped to owner. */
export async function updateChannel(
	db: D1Database,
	id: number,
	email: string,
	patch: Partial<Pick<NotifChannel, 'name' | 'target' | 'mention' | 'enabled'>>
): Promise<NotifChannel | null> {
	const sets: string[] = [];
	const params: unknown[] = [];
	if (patch.name !== undefined) {
		sets.push('name = ?');
		params.push(patch.name);
	}
	if (patch.target !== undefined) {
		sets.push('target = ?');
		params.push(patch.target);
	}
	if (patch.mention !== undefined) {
		sets.push('mention = ?');
		params.push(patch.mention);
	}
	if (patch.enabled !== undefined) {
		sets.push('enabled = ?');
		params.push(patch.enabled ? 1 : 0);
	}
	if (sets.length === 0) return getChannel(db, id, email);

	params.push(id, email);
	const changed = await execute(
		db,
		`UPDATE notif_channels SET ${sets.join(', ')} WHERE id = ? AND owner_email = ?`,
		params
	);
	if (changed === 0) return null;
	return getChannel(db, id, email);
}

/** Delete a channel (cascades rules/schedules/state via FK). */
export async function deleteChannel(
	db: D1Database,
	id: number,
	email: string
): Promise<boolean> {
	const changed = await execute(
		db,
		'DELETE FROM notif_channels WHERE id = ? AND owner_email = ?',
		[id, email]
	);
	return changed > 0;
}

/** Record a delivery attempt. Channel name is snapshotted in case the channel
 *  is later deleted. We bind an explicit ISO 8601 `sent_at` instead of relying
 *  on the schema's `datetime('now')` default — SQLite's `datetime()` returns
 *  a space-separated string (`'YYYY-MM-DD HH:MM:SS'`) which JS `new Date()`
 *  parses inconsistently (NaN in strict engines). Same footgun as the
 *  NOAA-timestamp issue called out in CLAUDE.md. */
export async function recordDelivery(
	db: D1Database,
	row: {
		channel_id: number;
		channel_name: string;
		kind: 'immediate' | 'summary' | 'off_hours_digest' | 'storm_end' | 'test';
		payload_summary: string;
		ok: boolean;
		http_status: number | null;
		error: string | null;
	}
): Promise<void> {
	await execute(
		db,
		`INSERT INTO notif_deliveries
			(channel_id, channel_name, kind, payload_summary, ok, http_status, error, sent_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			row.channel_id,
			row.channel_name,
			row.kind,
			row.payload_summary,
			row.ok ? 1 : 0,
			row.http_status,
			row.error,
			new Date().toISOString(),
		]
	);
}
