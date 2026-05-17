<!-- +page.svelte v0.2.0 — Channels list + create form. Detail/rule/schedule UI is under /notifications/channels/[id]. -->
<script lang="ts">
	import type { ApiResponse } from '$types/api';
	import type { NotifChannel } from '$lib/server/notif-channels';

	let { data } = $props();

	// SSR-overlay pattern: SSR-rendered list via $derived(data.channels), local
	// mutations via $state<...>(undefined) — local wins once set.
	let channelsLocal = $state<NotifChannel[] | undefined>(undefined);
	const channels = $derived(channelsLocal !== undefined ? channelsLocal : data.channels);

	let creating = $state(false);
	let testingId = $state<number | null>(null);
	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	let newName = $state('');
	let newKind = $state<'discord' | 'sms'>('discord');
	let newTarget = $state('');
	let newMention = $state('');

	function clearMessages() {
		errorMsg = null;
		successMsg = null;
	}

	async function createChannel(evt: SubmitEvent) {
		evt.preventDefault();
		clearMessages();
		creating = true;
		try {
			const res = await fetch('/api/v1/notifications/channels', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newName,
					kind: newKind,
					target: newTarget,
					mention: newMention || null,
				}),
			});
			const body = (await res.json()) as ApiResponse<NotifChannel>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				channelsLocal = [...channels, body.data];
				newName = '';
				newTarget = '';
				newMention = '';
				newKind = 'discord';
				successMsg = `Created "${body.data.name}". Configure rule + schedule on its detail page.`;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
		creating = false;
	}

	async function toggleEnabled(channel: NotifChannel) {
		clearMessages();
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channel.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: !channel.enabled }),
			});
			const body = (await res.json()) as ApiResponse<NotifChannel>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				channelsLocal = channels.map(c => (c.id === channel.id ? body.data : c));
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}

	async function sendTest(channel: NotifChannel) {
		clearMessages();
		testingId = channel.id;
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channel.id}/test`, {
				method: 'POST',
			});
			const body = (await res.json()) as ApiResponse<{ status: number }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Test failed (${res.status})`;
			} else {
				successMsg = `Test sent to "${channel.name}" (HTTP ${body.data.status}). Check the channel.`;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
		testingId = null;
	}

	async function deleteChannel(channel: NotifChannel) {
		if (!confirm(`Delete "${channel.name}"?\n\nThis removes the channel, its rule, all its schedules, and its state. Delivery log entries are preserved for audit.`)) return;
		clearMessages();
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channel.id}`, {
				method: 'DELETE',
			});
			const body = (await res.json()) as ApiResponse<{ id: number }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				channelsLocal = channels.filter(c => c.id !== channel.id);
				successMsg = `Deleted "${channel.name}".`;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}

	function maskTarget(channel: NotifChannel): string {
		if (channel.kind === 'discord') {
			// https://discord.com/api/webhooks/<id>/<token> — show id, mask token
			const m = channel.target.match(/webhooks\/(\d+)\/([\w-]+)/);
			if (m) return `…/webhooks/${m[1]}/${m[2].slice(0, 4)}…`;
		}
		if (channel.kind === 'sms') {
			return channel.target.replace(/(\+?\d{1,3})\d+(\d{4})/, '$1…$2');
		}
		return channel.target;
	}
</script>

<section class="channels">
	<header class="section-head">
		<h2>Channels</h2>
		<p class="subtitle">
			A channel is one destination (Discord webhook or SMS number). Each channel has its
			own threshold, schedule, and cadence — configure those on its detail page.
		</p>
	</header>

	{#if errorMsg}<div class="banner error">{errorMsg}</div>{/if}
	{#if successMsg}<div class="banner ok">{successMsg}</div>{/if}

	<form class="create-form" onsubmit={createChannel}>
		<h3>Add a channel</h3>
		<div class="form-row">
			<label>
				<span>Name</span>
				<input type="text" placeholder="e.g. #space-weather-alerts" bind:value={newName} required disabled={creating} />
			</label>
			<label>
				<span>Kind</span>
				<select bind:value={newKind} disabled={creating}>
					<option value="discord">Discord webhook</option>
					<option value="sms">SMS (TextBelt)</option>
				</select>
			</label>
		</div>
		<label>
			<span>{newKind === 'discord' ? 'Webhook URL' : 'Phone (E.164, e.g. +15551234567)'}</span>
			<input
				type="text"
				placeholder={newKind === 'discord' ? 'https://discord.com/api/webhooks/…' : '+15551234567'}
				bind:value={newTarget}
				required
				disabled={creating}
			/>
		</label>
		<label>
			<span>Mention (optional) — Discord role/user tag e.g. <code>&lt;@&amp;1234…&gt;</code></span>
			<input type="text" placeholder="<@&roleid> or <@userid> — leave blank for none" bind:value={newMention} disabled={creating} />
		</label>
		<div class="form-actions">
			<button type="submit" class="btn-primary" disabled={creating}>
				{creating ? 'Creating…' : 'Add channel'}
			</button>
		</div>
	</form>

	{#if channels.length === 0}
		<div class="empty">No channels yet. Add one above to get started.</div>
	{:else}
		<ul class="channel-list">
			{#each channels as channel (channel.id)}
				<li class="channel-card" class:disabled={!channel.enabled}>
					<div class="channel-main">
						<div class="channel-name">
							<a href="/notifications/channels/{channel.id}">{channel.name}</a>
							<span class="kind-pill">{channel.kind}</span>
							{#if !channel.enabled}<span class="disabled-pill">disabled</span>{/if}
						</div>
						<div class="channel-target">{maskTarget(channel)}</div>
						{#if channel.mention}<div class="channel-mention">mentions <code>{channel.mention}</code></div>{/if}
					</div>
					<div class="channel-actions">
						<button class="btn-secondary" onclick={() => sendTest(channel)} disabled={testingId === channel.id || !channel.enabled}>
							{testingId === channel.id ? 'Sending…' : 'Test'}
						</button>
						<button class="btn-secondary" onclick={() => toggleEnabled(channel)}>
							{channel.enabled ? 'Disable' : 'Enable'}
						</button>
						<a class="btn-secondary" href="/notifications/channels/{channel.id}">Configure</a>
						<button class="btn-danger" onclick={() => deleteChannel(channel)}>Delete</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.channels {
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
		max-width: 70ch;
	}

	.banner {
		padding: var(--space-md);
		border-radius: var(--border-radius-md);
		border: 1px solid;
	}

	.banner.error {
		background: rgba(248, 81, 73, 0.08);
		border-color: rgba(248, 81, 73, 0.4);
	}

	.banner.ok {
		background: rgba(63, 185, 80, 0.08);
		border-color: rgba(63, 185, 80, 0.4);
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-md);
	}

	.create-form h3 {
		margin: 0;
		font-size: var(--font-size-md);
	}

	.form-row {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-md);
	}

	.create-form label {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.create-form input,
	.create-form select {
		padding: var(--space-sm);
		background: var(--bg-base);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}

	.create-form code {
		font-family: var(--font-mono);
		font-size: 0.85em;
		background: var(--bg-base);
		padding: 1px 4px;
		border-radius: 3px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
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

	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-secondary {
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-base);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
	}

	.btn-secondary:hover { border-color: var(--accent-blue); }
	.btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

	.btn-danger {
		padding: var(--space-xs) var(--space-md);
		background: transparent;
		color: var(--accent-red, #f85149);
		border: 1px solid currentColor;
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		cursor: pointer;
	}

	.btn-danger:hover { background: rgba(248, 81, 73, 0.1); }

	.empty {
		text-align: center;
		padding: var(--space-xl);
		color: var(--text-muted);
		background: var(--bg-card);
		border: 1px dashed var(--border-default);
		border-radius: var(--border-radius-md);
	}

	.channel-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.channel-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-md);
		flex-wrap: wrap;
	}

	.channel-card.disabled {
		opacity: 0.6;
	}

	.channel-main {
		flex: 1;
		min-width: 240px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.channel-name {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-md);
	}

	.channel-name a {
		color: var(--text-primary);
		font-weight: 600;
	}

	.kind-pill, .disabled-pill {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 2px 6px;
		border-radius: var(--border-radius-sm);
	}

	.kind-pill {
		color: var(--accent-blue);
		background: rgba(56, 139, 253, 0.12);
	}

	.disabled-pill {
		color: var(--text-muted);
		background: var(--bg-base);
	}

	.channel-target {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.channel-mention {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.channel-mention code {
		font-family: var(--font-mono);
		background: var(--bg-base);
		padding: 1px 4px;
		border-radius: 3px;
	}

	.channel-actions {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}
</style>
