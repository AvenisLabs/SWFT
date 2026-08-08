// notif-channels.test.ts v0.1.0 - Regression tests for channel state bootstrap.

import { describe, expect, it } from 'vitest';
import { createChannel } from '../src/lib/server/notif-channels';

interface CapturedStatement {
	sql: string;
	params: unknown[];
}

function makeDb(maxEventId: number) {
	const ran: CapturedStatement[] = [];
	const batched: CapturedStatement[] = [];
	let channelRow: Record<string, unknown> | null = null;
	const newId = 42;

	function makeStatement(sql: string, params: unknown[] = []) {
		return {
			sql,
			params,
			bind(...boundParams: unknown[]) {
				return makeStatement(sql, boundParams);
			},
			async run() {
				ran.push({ sql, params });
				if (sql.includes('INSERT INTO notif_channels')) {
					channelRow = {
						id: newId,
						owner_email: params[0],
						name: params[1],
						kind: params[2],
						target: params[3],
						mention: params[4],
						enabled: 1,
						created_at: params[5],
					};
					return { meta: { last_row_id: newId, changes: 1 } };
				}
				return { meta: { last_row_id: 0, changes: 1 } };
			},
			async first<T>(): Promise<T | null> {
				ran.push({ sql, params });
				if (sql.includes('COALESCE(MAX(id), 0)')) {
					return { max_id: maxEventId } as T;
				}
				if (sql.includes('FROM notif_channels WHERE id')) {
					return channelRow as T;
				}
				return null;
			},
			async all<T>(): Promise<{ results: T[] }> {
				ran.push({ sql, params });
				return { results: [] };
			},
		};
	}

	return {
		ran,
		batched,
		db: {
			prepare(sql: string) {
				return makeStatement(sql);
			},
			async batch(statements: Array<{ sql: string; params: unknown[] }>) {
				batched.push(...statements.map(s => ({ sql: s.sql, params: s.params })));
				return statements.map(() => ({ meta: { changes: 1 } }));
			},
		},
	};
}

describe('createChannel', () => {
	it('seeds a new channel state at the current Kp event watermark', async () => {
		const { db, batched } = makeDb(119);

		const channel = await createChannel(db as never, {
			owner_email: 'u@example.com',
			name: 'SolarEvents',
			kind: 'discord',
			target: 'https://discord.com/api/webhooks/1/abc',
			mention: null,
		});

		const stateInsert = batched.find(s => s.sql.includes('INSERT INTO notif_state'));
		expect(channel.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(stateInsert?.params).toEqual([42, 119]);
	});

	it('keeps the initial watermark at zero when no Kp events exist yet', async () => {
		const { db, batched } = makeDb(0);

		await createChannel(db as never, {
			owner_email: 'u@example.com',
			name: 'SolarEvents',
			kind: 'discord',
			target: 'https://discord.com/api/webhooks/1/abc',
			mention: null,
		});

		const stateInsert = batched.find(s => s.sql.includes('INSERT INTO notif_state'));
		expect(stateInsert?.params).toEqual([42, 0]);
	});
});
