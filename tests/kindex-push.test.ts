// kindex-push.test.ts v0.1.0 - K-index push payload and schedule helpers.

import { describe, expect, it } from 'vitest';
import { buildKIndexPushPayload, type KIndexPushSnapshot } from '../src/lib/shared/kindex-push';
import { isKIndexScheduleDue } from '../workers/cron-ingest/src/tasks/dispatch-kindex-pushes';

const SNAPSHOT: KIndexPushSnapshot = {
	generatedAt: '2026-05-17T17:15:00.000Z',
	lookbackHours: 6,
	timeZone: 'America/New_York',
	timeZoneLabel: 'America/New_York (EDT)',
	sources: [
		{
			id: 'noaa_boulder',
			label: 'NOAA Boulder K-index',
			description: 'Local K-index from the Boulder, Colorado magnetometer station.',
			status: 'ok',
			error: null,
			samples: [{ label: 'Current', targetIso: '2026-05-17T17:15:00.000Z', observedIso: '2026-05-17T17:15:00.000Z', value: 1.2 }],
		},
		{
			id: 'noaa_estimated',
			label: 'NOAA Estimated Kp',
			description: 'Planetary estimated Kp from NOAA SWPC.',
			status: 'ok',
			error: null,
			samples: [{ label: 'Current', targetIso: '2026-05-17T17:15:00.000Z', observedIso: '2026-05-17T17:15:00.000Z', value: 1.5 }],
		},
		{
			id: 'gfz',
			label: 'GFZ Potsdam Hp30',
			description: 'Independent half-hourly planetary Hp30 index from GFZ Potsdam.',
			status: 'ok',
			error: null,
			samples: [{ label: 'Current', targetIso: '2026-05-17T17:15:00.000Z', observedIso: '2026-05-17T17:00:00.000Z', value: 1.7 }],
		},
	],
};

describe('buildKIndexPushPayload', () => {
	it('uses clear labels for the three requested K-index sources', () => {
		const payload = buildKIndexPushPayload('SolarEvents', null, SNAPSHOT);
		const names = payload.embeds?.[0].fields?.map(f => f.name);
		expect(names).toEqual(['NOAA Boulder K-index', 'NOAA Estimated Kp', 'GFZ Potsdam Hp30']);
		expect(payload.embeds?.[0].description).toContain('current and previous 6 hour');
		expect(payload.embeds?.[0].description).toContain('America/New_York');
	});
});

describe('isKIndexScheduleDue', () => {
	it('fires within the 5-minute local schedule window once per local date', () => {
		const now = new Date('2026-05-17T12:02:00.000Z'); // 08:02 EDT
		expect(isKIndexScheduleDue(now, '08:00', 'America/New_York', null)).toEqual({
			due: true,
			localDate: '2026-05-17',
		});
		expect(isKIndexScheduleDue(now, '08:00', 'America/New_York', '2026-05-17').due).toBe(false);
	});

	it('does not fire outside the 5-minute local schedule window', () => {
		const now = new Date('2026-05-17T12:08:00.000Z'); // 08:08 EDT
		expect(isKIndexScheduleDue(now, '08:00', 'America/New_York', null).due).toBe(false);
	});
});
