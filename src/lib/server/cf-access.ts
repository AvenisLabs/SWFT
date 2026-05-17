// cf-access.ts v0.1.0 — Sync the notif_users email allowlist to a Cloudflare
// Access Group via the CF API.
//
// CF API surface used (api.cloudflare.com/client/v4):
//   GET    /accounts/{account_id}/access/groups/{group_id}    -> read current
//   PUT    /accounts/{account_id}/access/groups/{group_id}    -> replace include rules
//
// IMPORTANT: PUT replaces the *entire* group definition. Always read first,
// mutate `include`, then PUT. The `include` array is a list of rule objects;
// for email allowlists we use `{ email: { email: 'user@example.com' } }`.
//
// Setup steps (one-time, in the CF dashboard):
//   1. Zero Trust -> Access -> Access Groups -> Create a group named
//      'swft-notifications-users'. Add yourself as an email rule. Note the
//      group ID (visible in the URL).
//   2. Zero Trust -> Access controls -> Applications -> Create new application
//      -> Self-hosted and private -> Add public hostname. Configure the app
//      to cover BOTH page and API paths so the edge gate stops unauthenticated
//      requests in either spot. Two recommended ways:
//        (a) wildcard the hostname path: cover '/notifications*' AND add a
//            second public hostname under the same app for '/api/v1/notifications*',
//        (b) or use one entry per path and bind both to the same policy.
//      Identity providers: Google. Policy: Allow members of group
//      'swft-notifications-users'. Save.
//      Defense-in-depth: even without the API path covered, the SvelteKit
//      endpoints reject requests lacking a valid CF Access header (CF strips
//      spoofed headers globally), but routing both paths through Access
//      avoids ever invoking the endpoint for an unauthenticated request.
//   3. My Profile -> API Tokens -> Create Token -> "Edit Cloudflare Workers"
//      template OR custom: Account.Access: Apps and Policies = Edit. Scope to
//      your account. Save the token.
//   4. wrangler secret put CF_API_TOKEN, CF_ACCOUNT_ID, CF_ACCESS_GROUP_ID
//      against both the Pages project AND the cron worker (cron worker doesn't
//      need them now, but mirroring keeps env parity).

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CfAccessConfig {
	apiToken: string;
	accountId: string;
	groupId: string;
}

interface CfAccessGroupResponse {
	success: boolean;
	errors?: Array<{ code: number; message: string }>;
	result?: {
		id: string;
		name: string;
		include: Array<{ email?: { email: string } } | Record<string, unknown>>;
		exclude?: unknown[];
		require?: unknown[];
	};
}

/** Read the access group config. Returns the current list of allowed emails. */
export async function readAllowlist(cfg: CfAccessConfig): Promise<string[]> {
	const res = await fetch(`${CF_API_BASE}/accounts/${cfg.accountId}/access/groups/${cfg.groupId}`, {
		headers: { Authorization: `Bearer ${cfg.apiToken}` },
	});
	if (!res.ok) {
		throw new Error(`CF Access read failed: ${res.status} ${await res.text()}`);
	}
	const body = (await res.json()) as CfAccessGroupResponse;
	if (!body.success || !body.result) {
		throw new Error(`CF Access read returned error: ${JSON.stringify(body.errors)}`);
	}
	const emails: string[] = [];
	for (const rule of body.result.include ?? []) {
		const email = (rule as { email?: { email?: string } }).email?.email;
		if (email) emails.push(email.toLowerCase());
	}
	return emails;
}

/** Replace the access group's email allowlist with the given set. */
export async function writeAllowlist(cfg: CfAccessConfig, emails: string[]): Promise<void> {
	// First read the existing group so we preserve name + non-email rules.
	const current = await fetch(`${CF_API_BASE}/accounts/${cfg.accountId}/access/groups/${cfg.groupId}`, {
		headers: { Authorization: `Bearer ${cfg.apiToken}` },
	});
	if (!current.ok) {
		throw new Error(`CF Access read-before-write failed: ${current.status} ${await current.text()}`);
	}
	const currentBody = (await current.json()) as CfAccessGroupResponse;
	if (!currentBody.success || !currentBody.result) {
		throw new Error(`CF Access read-before-write error: ${JSON.stringify(currentBody.errors)}`);
	}

	// Preserve non-email include rules (e.g. service tokens, IP ranges) and
	// replace the email rules with the new set.
	const existingNonEmail = (currentBody.result.include ?? []).filter(
		rule => !(rule as { email?: unknown }).email
	);
	const newEmailRules = emails.map(e => ({ email: { email: e.toLowerCase() } }));

	const payload = {
		name: currentBody.result.name,
		include: [...existingNonEmail, ...newEmailRules],
		exclude: currentBody.result.exclude ?? [],
		require: currentBody.result.require ?? [],
	};

	const res = await fetch(`${CF_API_BASE}/accounts/${cfg.accountId}/access/groups/${cfg.groupId}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${cfg.apiToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		throw new Error(`CF Access write failed: ${res.status} ${await res.text()}`);
	}
	const body = (await res.json()) as CfAccessGroupResponse;
	if (!body.success) {
		throw new Error(`CF Access write error: ${JSON.stringify(body.errors)}`);
	}
}

/** Extract config from platform env. Returns null if any var is missing. */
export function configFromEnv(env: Partial<App.Platform['env']>): CfAccessConfig | null {
	if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_ACCESS_GROUP_ID) return null;
	return {
		apiToken: env.CF_API_TOKEN,
		accountId: env.CF_ACCOUNT_ID,
		groupId: env.CF_ACCESS_GROUP_ID,
	};
}
