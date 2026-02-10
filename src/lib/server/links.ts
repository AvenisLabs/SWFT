// links.ts v0.1.0 — D1 query helpers for admin link management

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll, queryFirst, execute } from './db';
import type { SiteLink, LinkOverride, LinkCheckRun, LinkCheckResult } from '$types/api';

/** Get links with non-default overrides (for layout SSR) */
export async function getActiveOverrides(db: D1Database): Promise<LinkOverride[]> {
	return queryAll<LinkOverride>(
		db,
		`SELECT url, page_path, override_url, override_text, action
		 FROM site_links
		 WHERE action != 'default' OR override_url IS NOT NULL OR override_text IS NOT NULL`
	);
}

/** Get all discovered links with full details (for admin) */
export async function getAllLinks(db: D1Database): Promise<SiteLink[]> {
	return queryAll<SiteLink>(
		db,
		`SELECT id, url, link_text, page_path, first_seen, last_seen,
		        last_status, last_check, override_url, override_text, action
		 FROM site_links
		 ORDER BY last_seen DESC`
	);
}

/** Get a single link by ID */
export async function getLinkById(db: D1Database, id: number): Promise<SiteLink | null> {
	return queryFirst<SiteLink>(
		db,
		`SELECT id, url, link_text, page_path, first_seen, last_seen,
		        last_status, last_check, override_url, override_text, action
		 FROM site_links WHERE id = ?`,
		[id]
	);
}

/** Update override fields on a link */
export async function updateLinkOverride(
	db: D1Database,
	id: number,
	updates: { override_url?: string | null; override_text?: string | null; action?: string }
): Promise<number> {
	const sets: string[] = [];
	const params: unknown[] = [];

	if (updates.override_url !== undefined) {
		sets.push('override_url = ?');
		params.push(updates.override_url);
	}
	if (updates.override_text !== undefined) {
		sets.push('override_text = ?');
		params.push(updates.override_text);
	}
	if (updates.action !== undefined) {
		sets.push('action = ?');
		params.push(updates.action);
	}

	if (sets.length === 0) return 0;
	params.push(id);

	return execute(db, `UPDATE site_links SET ${sets.join(', ')} WHERE id = ?`, params);
}

/** Get latest check run */
export async function getLatestCheckRun(db: D1Database): Promise<LinkCheckRun | null> {
	return queryFirst<LinkCheckRun>(
		db,
		'SELECT * FROM link_check_runs ORDER BY id DESC LIMIT 1'
	);
}

/** Get all check runs (newest first) */
export async function getAllCheckRuns(db: D1Database): Promise<LinkCheckRun[]> {
	return queryAll<LinkCheckRun>(
		db,
		'SELECT * FROM link_check_runs ORDER BY id DESC LIMIT 50'
	);
}

/** Get a specific check run by ID */
export async function getCheckRunById(db: D1Database, id: number): Promise<LinkCheckRun | null> {
	return queryFirst<LinkCheckRun>(
		db,
		'SELECT * FROM link_check_runs WHERE id = ?',
		[id]
	);
}

/** Get results for a specific check run */
export async function getCheckRunResults(db: D1Database, runId: number): Promise<LinkCheckResult[]> {
	return queryAll<LinkCheckResult>(
		db,
		'SELECT * FROM link_check_results WHERE run_id = ? ORDER BY ok ASC, url ASC',
		[runId]
	);
}
