// notif-types.ts v0.1.0 — Row shapes for notif_* tables. Duplicated from
// src/lib/server/notif-* on the SvelteKit side because the worker has a
// separate package.json + tsconfig and we don't share via a workspace yet.
// If a third copy emerges, promote these to packages/shared.

export type ChannelKind = 'discord' | 'sms';

export interface NotifChannel {
	id: number;
	owner_email: string;
	name: string;
	kind: ChannelKind;
	target: string;
	mention: string | null;
	enabled: number;
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

export interface NotifState {
	channel_id: number;
	last_event_id_sent: number;
	last_immediate_at: string | null;
	last_summary_at: string | null;
	burst_started_at: string | null;
	sms_last_sent_at: string | null;
	off_hours_buffer: string; // JSON
}

export interface KpEvent {
	id: number;
	ts: string;
	kp_value: number;
	source: string;
	storm_class: string;
	bz_nt: number | null;
	speed_kms: number | null;
	created_at: string;
}

/** Items kept in notif_state.off_hours_buffer (JSON-encoded array). */
export interface BufferedEvent {
	event_id: number;
	ts: string;
	kp_value: number;
	storm_class: string;
}
