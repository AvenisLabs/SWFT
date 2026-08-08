// notif-rules.ts v0.1.0 — Server-side library for the 1:1 notif_rules row.
// A rule encodes everything the dispatcher needs to decide when this channel
// alerts: thresholds, cadence, burst window, off-hours behavior.

import type { D1Database } from '@cloudflare/workers-types';
import { queryFirst, execute } from './db';
import type { NotifRule } from './notif-channels';

export const SUMMARY_INTERVALS = [15, 30, 60] as const;
export type SummaryInterval = (typeof SUMMARY_INTERVALS)[number];

/** Validate a rule patch. Returns the first error or null. */
export function validateRulePatch(patch: Partial<NotifRule>): string | null {
	if (patch.threshold_kp !== undefined) {
		if (!Number.isFinite(patch.threshold_kp) || patch.threshold_kp < 0 || patch.threshold_kp > 9) {
			return 'threshold_kp must be between 0 and 9.';
		}
	}
	if (patch.immediate_threshold_kp !== undefined) {
		if (
			!Number.isFinite(patch.immediate_threshold_kp) ||
			patch.immediate_threshold_kp < 0 ||
			patch.immediate_threshold_kp > 9
		) {
			return 'immediate_threshold_kp must be between 0 and 9.';
		}
	}
	if (
		patch.threshold_kp !== undefined &&
		patch.immediate_threshold_kp !== undefined &&
		patch.immediate_threshold_kp < patch.threshold_kp
	) {
		return 'immediate_threshold_kp must be ≥ threshold_kp.';
	}
	if (patch.summary_interval_min !== undefined) {
		if (!SUMMARY_INTERVALS.includes(patch.summary_interval_min as SummaryInterval)) {
			return 'summary_interval_min must be one of 15, 30, 60.';
		}
	}
	if (patch.burst_window_max_hours !== undefined) {
		if (
			!Number.isInteger(patch.burst_window_max_hours) ||
			patch.burst_window_max_hours < 1 ||
			patch.burst_window_max_hours > 24
		) {
			return 'burst_window_max_hours must be an integer 1-24.';
		}
	}
	if (patch.off_hours_digest_time !== undefined && patch.off_hours_digest_time !== null) {
		if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.off_hours_digest_time)) {
			return 'off_hours_digest_time must be HH:MM (24-hour UTC).';
		}
	}
	return null;
}

export async function getRule(db: D1Database, channelId: number): Promise<NotifRule | null> {
	return queryFirst<NotifRule>(db, 'SELECT * FROM notif_rules WHERE channel_id = ?', [channelId]);
}

export async function updateRule(
	db: D1Database,
	channelId: number,
	patch: Partial<NotifRule>
): Promise<NotifRule | null> {
	const fields: string[] = [];
	const params: unknown[] = [];
	const set = (col: keyof NotifRule, val: unknown) => {
		fields.push(`${col} = ?`);
		params.push(val);
	};

	if (patch.threshold_kp !== undefined) set('threshold_kp', patch.threshold_kp);
	if (patch.immediate_threshold_kp !== undefined)
		set('immediate_threshold_kp', patch.immediate_threshold_kp);
	if (patch.summary_interval_min !== undefined) set('summary_interval_min', patch.summary_interval_min);
	if (patch.burst_window_max_hours !== undefined)
		set('burst_window_max_hours', patch.burst_window_max_hours);
	if (patch.off_hours_digest_time !== undefined) set('off_hours_digest_time', patch.off_hours_digest_time);
	if (patch.off_hours_digest_on_resume !== undefined)
		set('off_hours_digest_on_resume', patch.off_hours_digest_on_resume ? 1 : 0);
	if (patch.storm_end_notify !== undefined) set('storm_end_notify', patch.storm_end_notify ? 1 : 0);
	if (patch.quiet_below_g1 !== undefined) set('quiet_below_g1', patch.quiet_below_g1 ? 1 : 0);

	if (fields.length === 0) return getRule(db, channelId);

	params.push(channelId);
	const changed = await execute(
		db,
		`UPDATE notif_rules SET ${fields.join(', ')} WHERE channel_id = ?`,
		params
	);
	if (changed === 0) return null;
	return getRule(db, channelId);
}
