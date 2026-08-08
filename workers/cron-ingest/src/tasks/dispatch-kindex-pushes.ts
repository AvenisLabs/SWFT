// dispatch-kindex-pushes.ts v0.2.0 - Scheduled K-index source snapshots.

import { sendDiscord } from '../lib/notif-send';
import {
	buildKIndexPushPayload,
	fetchKIndexPushSnapshot,
	summarizeKIndexPush,
} from '../../../../src/lib/shared/kindex-push';
import { isValidTimeZone } from '../../../../src/lib/utils/timeFormat';

interface DispatchEnv {
	DB: D1Database;
}

interface KIndexPushRow {
	id: number;
	channel_id: number;
	channel_name: string;
	kind: 'discord' | 'sms';
	target: string;
	mention: string | null;
	push_time: string;
	timezone: string;
	lookback_hours: number;
	last_sent_local_date: string | null;
}

export interface KIndexPushDispatchSummary {
	schedules_checked: number;
	pushes_dispatched: number;
	failures: number;
}

function localParts(now: Date, timeZone: string): { date: string; minutes: number } | null {
	if (!isValidTimeZone(timeZone)) return null;
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(now);
	const get = (type: string) => parts.find(p => p.type === type)?.value;
	const year = get('year');
	const month = get('month');
	const day = get('day');
	const hour = Number(get('hour'));
	const minute = Number(get('minute'));
	if (!year || !month || !day || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
	return { date: `${year}-${month}-${day}`, minutes: hour * 60 + minute };
}

export function isKIndexScheduleDue(
	now: Date,
	pushTime: string,
	timeZone: string,
	lastSentLocalDate: string | null
): { due: boolean; localDate: string | null } {
	const parts = localParts(now, timeZone);
	if (!parts) return { due: false, localDate: null };
	const [hh, mm] = pushTime.split(':').map(Number);
	const target = hh * 60 + mm;
	const inWindow = parts.minutes >= target && parts.minutes < target + 5;
	return { due: inWindow && lastSentLocalDate !== parts.date, localDate: parts.date };
}

export async function dispatchKIndexPushes(env: DispatchEnv, now: Date): Promise<KIndexPushDispatchSummary> {
	const summary: KIndexPushDispatchSummary = { schedules_checked: 0, pushes_dispatched: 0, failures: 0 };
	const rowsResult = await env.DB.prepare(
		`SELECT s.id, s.channel_id, c.name AS channel_name, c.kind, c.target, c.mention,
		        s.push_time, s.timezone, s.lookback_hours, s.last_sent_local_date
		 FROM notif_kindex_push_schedules s
		 JOIN notif_channels c ON c.id = s.channel_id
		 WHERE s.enabled = 1 AND c.enabled = 1`
	).all<KIndexPushRow>();
	const rows = rowsResult.results ?? [];
	if (rows.length === 0) return summary;

	for (const row of rows) {
		summary.schedules_checked++;
		if (row.kind !== 'discord') continue;

		const due = isKIndexScheduleDue(now, row.push_time, row.timezone, row.last_sent_local_date);
		if (!due.due || !due.localDate) continue;

		const claim = await env.DB.prepare(
			`UPDATE notif_kindex_push_schedules
			 SET last_sent_local_date = ?, last_sent_at = ?, updated_at = ?
			 WHERE id = ? AND (last_sent_local_date IS NULL OR last_sent_local_date != ?)`
		).bind(due.localDate, now.toISOString(), now.toISOString(), row.id, due.localDate).run();
		if ((claim.meta?.changes ?? 0) === 0) continue;

		try {
			const snapshot = await fetchKIndexPushSnapshot(row.lookback_hours, row.timezone, now);
			// Scheduled K-index pushes are a daily-style report, not a time-
			// sensitive alert — never tag, regardless of the channel's mention.
			const payload = buildKIndexPushPayload(
				row.channel_name,
				null,
				snapshot,
				'Scheduled K-index Push'
			);
			const result = await sendDiscord(row.target, payload);
			await logDelivery(
				env.DB,
				row.channel_id,
				row.channel_name,
				summarizeKIndexPush(snapshot),
				result.ok,
				result.status,
				result.error
			);
			summary.pushes_dispatched++;
			if (!result.ok) summary.failures++;
		} catch (err) {
			summary.failures++;
			await logDelivery(
				env.DB,
				row.channel_id,
				row.channel_name,
				`Scheduled K-index push failed at ${row.push_time} ${row.timezone}`,
				false,
				0,
				err instanceof Error ? err.message : 'Unknown error'
			);
		}
	}

	return summary;
}

async function logDelivery(
	db: D1Database,
	channelId: number,
	channelName: string,
	summary: string,
	ok: boolean,
	httpStatus: number,
	error: string | null
): Promise<void> {
	await db.prepare(
		`INSERT INTO notif_deliveries
			(channel_id, channel_name, kind, payload_summary, ok, http_status, error, sent_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	)
		.bind(channelId, channelName, 'kindex_push', summary, ok ? 1 : 0, httpStatus || null, error, new Date().toISOString())
		.run();
}
