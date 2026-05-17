<!-- +page.svelte v0.1.0 — Admin: notifications email allowlist (D1 + CF Access sync) -->
<script lang="ts">
	import type { ApiResponse } from '$types/api';

	let { data } = $props();

	// SSR-overlay pattern (see CLAUDE.md): SSR-rendered values via $derived(data.*),
	// local mutations via $state<...>(undefined) — local wins once set.
	type UserRow = (typeof data)['users'][number];
	type Drift = (typeof data)['drift'];
	let usersLocal = $state<UserRow[] | undefined>(undefined);
	let driftLocal = $state<Drift | undefined>(undefined);
	let users = $derived(usersLocal !== undefined ? usersLocal : data.users);
	let drift = $derived(driftLocal !== undefined ? driftLocal : data.drift);
	let cfConfigured = $derived(data.cfConfigured);
	let cfError = $derived(data.cfError);

	let newEmail = $state('');
	let newRole = $state<'user' | 'admin'>('user');
	let submitting = $state(false);
	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	function clearMessages() {
		errorMsg = null;
		successMsg = null;
	}

	async function addUser(evt: SubmitEvent) {
		evt.preventDefault();
		clearMessages();
		const email = newEmail.trim().toLowerCase();
		if (!email) return;
		submitting = true;
		try {
			const res = await fetch('/api/v1/notifications/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, role: newRole }),
			});
			const body = (await res.json()) as ApiResponse<{ users: typeof users; drift: typeof drift }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				usersLocal = body.data.users;
				driftLocal = body.data.drift;
				newEmail = '';
				newRole = 'user';
				successMsg = `Added ${email}`;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
		submitting = false;
	}

	async function removeUser(email: string) {
		if (!confirm(`Remove ${email}?\n\nThis also removes them from the Cloudflare Access Group, ending their session.`)) return;
		clearMessages();
		try {
			const res = await fetch(`/api/v1/notifications/users/${encodeURIComponent(email)}`, {
				method: 'DELETE',
			});
			const body = (await res.json()) as ApiResponse<{ users: typeof users; drift: typeof drift }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				usersLocal = body.data.users;
				driftLocal = body.data.drift;
				successMsg = `Removed ${email}`;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}

	async function changeRole(email: string, role: 'user' | 'admin') {
		clearMessages();
		try {
			const res = await fetch(`/api/v1/notifications/users/${encodeURIComponent(email)}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role }),
			});
			const body = (await res.json()) as ApiResponse<{ users: typeof users }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				usersLocal = body.data.users;
				successMsg = `${email} is now ${role}`;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}

	async function reconcile() {
		clearMessages();
		try {
			const res = await fetch('/api/v1/notifications/users/reconcile', { method: 'POST' });
			const body = (await res.json()) as ApiResponse<{ drift: typeof drift }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				driftLocal = body.data.drift;
				successMsg = 'Synced D1 → Cloudflare Access';
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}
</script>

<section class="users">
	<header class="section-head">
		<h2>Email allowlist</h2>
		<p class="subtitle">
			These emails can sign in to /notifications via Cloudflare Access (Google IdP).
			Changes here are mirrored to the CF Access Group.
		</p>
	</header>

	{#if !cfConfigured}
		<div class="banner warn">
			<strong>Cloudflare Access not configured.</strong>
			<code>CF_API_TOKEN</code>, <code>CF_ACCOUNT_ID</code>, and <code>CF_ACCESS_GROUP_ID</code>
			must be set as Pages secrets. D1 changes here will not propagate to the edge until
			these are set. See <code>src/lib/server/cf-access.ts</code> for setup instructions.
		</div>
	{:else if cfError}
		<div class="banner error">
			<strong>CF Access API error:</strong> {cfError}
		</div>
	{:else if drift && (drift.onlyInDb.length || drift.onlyInCf.length)}
		<div class="banner warn">
			<strong>Drift detected between D1 and Cloudflare Access:</strong>
			{#if drift.onlyInDb.length}
				<div>Only in D1: {drift.onlyInDb.join(', ')}</div>
			{/if}
			{#if drift.onlyInCf.length}
				<div>Only in CF Access: {drift.onlyInCf.join(', ')}</div>
			{/if}
			<button class="btn-secondary" onclick={reconcile}>Sync D1 → CF Access</button>
		</div>
	{/if}

	{#if errorMsg}<div class="banner error">{errorMsg}</div>{/if}
	{#if successMsg}<div class="banner ok">{successMsg}</div>{/if}

	<form class="add-form" onsubmit={addUser}>
		<input
			type="email"
			placeholder="email@example.com"
			bind:value={newEmail}
			required
			disabled={submitting}
		/>
		<select bind:value={newRole} disabled={submitting}>
			<option value="user">user</option>
			<option value="admin">admin</option>
		</select>
		<button type="submit" class="btn-primary" disabled={submitting}>
			{submitting ? 'Adding…' : 'Add'}
		</button>
	</form>

	<table class="users-table">
		<thead>
			<tr>
				<th>Email</th>
				<th>Role</th>
				<th>Created</th>
				<th>Last login</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each users as user (user.email)}
				<tr>
					<td class="email">{user.email}</td>
					<td>
						<select
							value={user.role}
							onchange={(e) => changeRole(user.email, (e.currentTarget as HTMLSelectElement).value as 'user' | 'admin')}
						>
							<option value="user">user</option>
							<option value="admin">admin</option>
						</select>
					</td>
					<td class="muted">{user.created_at.slice(0, 10)}</td>
					<td class="muted">{user.last_login_at ? user.last_login_at.slice(0, 10) : '—'}</td>
					<td><button class="btn-danger" onclick={() => removeUser(user.email)}>Remove</button></td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>

<style>
	.users {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.section-head h2 {
		font-size: var(--font-size-lg);
		margin: 0 0 var(--space-xs);
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.banner {
		padding: var(--space-md);
		border-radius: var(--border-radius-md);
		border: 1px solid;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.banner.warn {
		background: rgba(232, 159, 0, 0.08);
		border-color: rgba(232, 159, 0, 0.4);
		color: var(--text-primary);
	}

	.banner.error {
		background: rgba(248, 81, 73, 0.08);
		border-color: rgba(248, 81, 73, 0.4);
		color: var(--text-primary);
	}

	.banner.ok {
		background: rgba(63, 185, 80, 0.08);
		border-color: rgba(63, 185, 80, 0.4);
		color: var(--text-primary);
	}

	.banner code {
		font-family: var(--font-mono);
		background: var(--bg-card);
		padding: 1px 4px;
		border-radius: 3px;
		font-size: 0.85em;
	}

	.add-form {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
		padding: var(--space-md);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-md);
	}

	.add-form input[type='email'] {
		flex: 1;
		min-width: 240px;
		padding: var(--space-sm);
		background: var(--bg-base);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}

	.add-form select,
	.users-table select {
		padding: var(--space-sm);
		background: var(--bg-base);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}

	.btn-primary {
		padding: var(--space-sm) var(--space-md);
		background: var(--accent-blue);
		color: #fff;
		border: none;
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-base);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		cursor: pointer;
		align-self: flex-start;
		margin-top: var(--space-xs);
	}

	.btn-danger {
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		color: var(--accent-red, #f85149);
		border: 1px solid currentColor;
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		cursor: pointer;
	}

	.btn-danger:hover {
		background: rgba(248, 81, 73, 0.1);
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-md);
		overflow: hidden;
	}

	.users-table th,
	.users-table td {
		padding: var(--space-sm) var(--space-md);
		text-align: left;
		border-bottom: 1px solid var(--border-default);
		font-size: var(--font-size-sm);
	}

	.users-table tr:last-child td {
		border-bottom: none;
	}

	.users-table th {
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.users-table .email {
		font-family: var(--font-mono);
	}

	.users-table .muted {
		color: var(--text-muted);
	}
</style>
