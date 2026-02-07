// db.ts v0.1.0 — D1 query helpers for SvelteKit server routes

import type { D1Database } from '@cloudflare/workers-types';

/** Extracts the D1 binding from the SvelteKit platform object */
export function getDb(platform: App.Platform | undefined): D1Database {
	if (!platform?.env?.DB) {
		throw new Error('D1 database binding not available — check wrangler.toml');
	}
	return platform.env.DB;
}

/** Run a SELECT query and return typed rows */
export async function queryAll<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
	const stmt = db.prepare(sql).bind(...params);
	const result = await stmt.all<T>();
	return result.results ?? [];
}

/** Run a SELECT query and return the first row or null */
export async function queryFirst<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T | null> {
	const stmt = db.prepare(sql).bind(...params);
	const result = await stmt.first<T>();
	return result ?? null;
}

/** Run an INSERT/UPDATE/DELETE and return rows-affected count */
export async function execute(db: D1Database, sql: string, params: unknown[] = []): Promise<number> {
	const stmt = db.prepare(sql).bind(...params);
	const result = await stmt.run();
	return result.meta?.changes ?? 0;
}

/** Run multiple statements in a batch (D1 batch API) */
export async function batchExecute(db: D1Database, statements: { sql: string; params: unknown[] }[]): Promise<void> {
	const prepared = statements.map(s => db.prepare(s.sql).bind(...s.params));
	await db.batch(prepared);
}
