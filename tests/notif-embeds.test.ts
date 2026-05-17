// notif-embeds.test.ts v0.1.0 — Embed-builder tests. Sanity-checks the shape
// of payloads sent to Discord. We don't deep-validate every Discord field —
// Discord's API surface is huge — just the fields SWFT actually populates.

import { describe, it, expect } from 'vitest';
import {
	buildImmediateEmbed,
	buildSummaryEmbed,
	buildOffHoursDigestEmbed,
	buildStormEndEmbed,
	buildImmediateSms,
} from '../workers/cron-ingest/src/lib/notif-embeds';
import type { KpEvent, BufferedEvent } from '../workers/cron-ingest/src/lib/notif-types';

const sampleEvent: KpEvent = {
	id: 42,
	ts: '2026-05-17T11:45:00.000Z',
	kp_value: 6.67,
	source: 'noaa',
	storm_class: 'G2',
	bz_nt: -8.5,
	speed_kms: 540,
	created_at: '2026-05-17T11:46:00.000Z',
};

describe('buildImmediateEmbed', () => {
	it('produces a payload with one embed and title containing Kp + class', () => {
		const p = buildImmediateEmbed('Test channel', null, sampleEvent);
		expect(p.embeds?.length).toBe(1);
		expect(p.embeds?.[0].title).toContain('6.67');
		expect(p.embeds?.[0].title).toContain('G2');
		expect(p.allowed_mentions?.parse).toEqual([]);
	});

	it('includes role mention in content when provided + sets allowed_mentions', () => {
		const p = buildImmediateEmbed('Test', '<@&12345>', sampleEvent);
		expect(p.content).toContain('<@&12345>');
		expect(p.allowed_mentions?.parse).toEqual(['roles', 'users']);
	});

	it('includes Bz and speed fields when present', () => {
		const p = buildImmediateEmbed('Test', null, sampleEvent);
		const fieldNames = p.embeds?.[0].fields?.map(f => f.name) ?? [];
		expect(fieldNames).toContain('Bz (nT)');
		expect(fieldNames).toContain('Wind speed (km/s)');
	});

	it('omits Bz/speed fields when null', () => {
		const p = buildImmediateEmbed('Test', null, { ...sampleEvent, bz_nt: null, speed_kms: null });
		const fieldNames = p.embeds?.[0].fields?.map(f => f.name) ?? [];
		expect(fieldNames).not.toContain('Bz (nT)');
		expect(fieldNames).not.toContain('Wind speed (km/s)');
	});
});

describe('buildSummaryEmbed', () => {
	it('shows event count in title and includes peak fields', () => {
		const events: KpEvent[] = [sampleEvent, { ...sampleEvent, id: 43, kp_value: 7.33, storm_class: 'G3' }];
		const p = buildSummaryEmbed('Test', null, events, 60);
		expect(p.embeds?.[0].title).toContain('2');
		const fieldNames = p.embeds?.[0].fields?.map(f => f.name) ?? [];
		expect(fieldNames).toContain('Peak Kp');
		expect(fieldNames).toContain('Peak class');
		const peakValue = p.embeds?.[0].fields?.find(f => f.name === 'Peak Kp')?.value;
		expect(peakValue).toContain('7.33');
	});

	it('caps embed description at 12 lines + "and N more"', () => {
		const events: KpEvent[] = Array.from({ length: 20 }, (_, i) => ({
			...sampleEvent,
			id: i + 1,
			kp_value: 4 + (i % 4) * 0.33,
			storm_class: 'active',
		}));
		const p = buildSummaryEmbed('Test', null, events, 60);
		expect(p.embeds?.[0].description).toContain('and 8');
	});
});

describe('buildOffHoursDigestEmbed', () => {
	it('shows buffered count and peak in fields', () => {
		const buf: BufferedEvent[] = [
			{ event_id: 1, ts: '2026-05-17T02:00:00.000Z', kp_value: 5.0, storm_class: 'G1' },
			{ event_id: 2, ts: '2026-05-17T03:00:00.000Z', kp_value: 5.67, storm_class: 'G1' },
		];
		const p = buildOffHoursDigestEmbed('Test', null, buf);
		expect(p.embeds?.[0].title).toContain('2');
		const peakValue = p.embeds?.[0].fields?.find(f => f.name === 'Peak Kp')?.value;
		expect(peakValue).toContain('5.67');
	});
});

describe('buildStormEndEmbed', () => {
	it('renders without optional fields', () => {
		const p = buildStormEndEmbed('Test', null, null, null, null);
		expect(p.embeds?.[0].title).toContain('Storm ended');
		expect(p.embeds?.[0].color).toBe(0x2ecc71);
	});
	it('renders with peak + duration when provided', () => {
		const p = buildStormEndEmbed('Test', null, 7.67, 'G3', 4.5);
		const fields = p.embeds?.[0].fields ?? [];
		expect(fields.find(f => f.name === 'Peak Kp')?.value).toContain('7.67');
		expect(fields.find(f => f.name === 'Peak class')?.value).toBe('G3');
		expect(fields.find(f => f.name === 'Duration')?.value).toContain('4.5');
	});
});

describe('buildImmediateSms', () => {
	it('is under 160 characters', () => {
		const msg = buildImmediateSms('A very long channel name that might overflow', sampleEvent);
		expect(msg.length).toBeLessThanOrEqual(160);
	});
	it('includes Kp and storm class', () => {
		const msg = buildImmediateSms('Test', sampleEvent);
		expect(msg).toContain('6.7');
		expect(msg).toContain('G2');
	});
});
