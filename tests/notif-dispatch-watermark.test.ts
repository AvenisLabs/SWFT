// notif-dispatch-watermark.test.ts v0.1.0 - Regression tests for backlog replay guard.

import { describe, expect, it } from 'vitest';
import {
	didClaimWatermark,
	maxSeenEventId,
	shouldBootstrapZeroWatermark,
} from '../workers/cron-ingest/src/tasks/dispatch-notifications';

describe('shouldBootstrapZeroWatermark', () => {
	it('bootstraps old SQLite channel timestamps created after the latest stored event', () => {
		expect(
			shouldBootstrapZeroWatermark('2026-05-17 17:15:47', '2026-05-17T00:10:55.351Z')
		).toBe(true);
	});

	it('bootstraps ISO channel timestamps created after the latest stored event', () => {
		expect(
			shouldBootstrapZeroWatermark('2026-05-17T17:15:47.000Z', '2026-05-16T22:30:00.000Z')
		).toBe(true);
	});

	it('does not bootstrap channels that existed before the latest event', () => {
		expect(
			shouldBootstrapZeroWatermark('2026-05-16T17:15:47.000Z', '2026-05-17T00:10:55.351Z')
		).toBe(false);
	});

	it('does not bootstrap when timestamps are missing or unparsable', () => {
		expect(shouldBootstrapZeroWatermark('not-a-date', '2026-05-17T00:10:55.351Z')).toBe(false);
		expect(shouldBootstrapZeroWatermark('2026-05-17T17:15:47.000Z', null)).toBe(false);
	});
});

describe('didClaimWatermark', () => {
	it('accepts a changed row as a successful claim', () => {
		expect(didClaimWatermark(10, 12, 1, null)).toBe(true);
	});

	it('accepts a no-op claim only when the watermark did not move', () => {
		expect(didClaimWatermark(12, 12, 0, 12)).toBe(true);
	});

	it('rejects a lost race even when another tick advanced to the same target watermark', () => {
		expect(didClaimWatermark(10, 12, 0, 12)).toBe(false);
	});

	it('rejects a no-op claim when the current watermark moved elsewhere', () => {
		expect(didClaimWatermark(12, 12, 0, 13)).toBe(false);
	});
});

describe('maxSeenEventId', () => {
	it('advances to the highest unseen event id', () => {
		expect(maxSeenEventId(10, [{ id: 11 }, { id: 13 }, { id: 12 }])).toBe(13);
	});

	it('keeps the existing watermark when no events were seen', () => {
		expect(maxSeenEventId(10, [])).toBe(10);
	});
});
