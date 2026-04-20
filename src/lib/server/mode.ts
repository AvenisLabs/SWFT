// mode.ts v0.1.0 — Read-side helpers for the monitoring mode state that the
// cron worker maintains in system_state. Applies expiry on read so consumers
// always see a self-consistent snapshot even if the cron hasn't updated yet.

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll } from './db';
import type { MonitoringModeData } from '$types/api';

const MODE_KEYS = ['active_mode', 'storm_until_iso', 'elevated_until_iso'] as const;

/** Fetch the current monitoring mode + expiry timestamps from system_state,
 *  applying auto-expiry so a stale 'storm' value with a past `storm_until_iso`
 *  doesn't lie to the UI. */
export async function getModeState(db: D1Database): Promise<MonitoringModeData> {
	const rows = await queryAll<{ key: string; value: string }>(
		db,
		'SELECT key, value FROM system_state WHERE key IN (?, ?, ?)',
		MODE_KEYS as unknown as string[]
	);

	const map = new Map(rows.map(r => [r.key, r.value]));
	const stormUntil = map.get('storm_until_iso') ?? '';
	const elevatedUntil = map.get('elevated_until_iso') ?? '';
	const nowIso = new Date().toISOString();

	// Effective mode — highest tier whose expiry is still in the future.
	const mode: MonitoringModeData['mode'] =
		stormUntil && stormUntil > nowIso ? 'storm' :
		elevatedUntil && elevatedUntil > nowIso ? 'elevated' :
		'normal';

	return {
		mode,
		storm_until: stormUntil && stormUntil > nowIso ? stormUntil : null,
		elevated_until: elevatedUntil && elevatedUntil > nowIso ? elevatedUntil : null,
	};
}
