<!-- +page.svelte v0.2.0 — Channel detail: name/target editor + RuleEditor + ScheduleEditor + delivery snippet. -->
<script lang="ts">
	import type { ApiResponse } from '$types/api';
	import type { NotifChannel } from '$lib/server/notif-channels';
	import RuleEditor from '$lib/components/notifications/RuleEditor.svelte';
	import ScheduleEditor from '$lib/components/notifications/ScheduleEditor.svelte';

	let { data } = $props();

	// SSR-overlay pattern
	let channelLocal = $state<NotifChannel | undefined>(undefined);
	const channel = $derived(channelLocal ?? data.channel);
	const rule = $derived(data.rule);
	const schedules = $derived(data.schedules);

	let editingTop = $state(false);
	// Initialized to empty; $effect below populates from `channel` (a $derived)
	// so we never reference reactive state in $state initializers.
	let draftName = $state('');
	let draftMention = $state('');
	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);
	let saving = $state(false);

	$effect(() => {
		if (!editingTop) {
			draftName = channel.name;
			draftMention = channel.mention ?? '';
		}
	});

	async function saveTop(evt: SubmitEvent) {
		evt.preventDefault();
		errorMsg = null;
		successMsg = null;
		saving = true;
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channel.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: draftName, mention: draftMention || null }),
			});
			const body = (await res.json()) as ApiResponse<NotifChannel>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				channelLocal = body.data;
				editingTop = false;
				successMsg = 'Channel updated.';
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
		saving = false;
	}
</script>

<section class="detail">
	<header>
		<div class="breadcrumb"><a href="/notifications">← Channels</a></div>
		{#if !editingTop}
			<div class="header-row">
				<h2>{channel.name}</h2>
				<button class="btn-secondary" onclick={() => (editingTop = true)}>Edit name / mention</button>
			</div>
		{:else}
			<form class="header-edit" onsubmit={saveTop}>
				<label>
					<span>Name</span>
					<input type="text" bind:value={draftName} required disabled={saving} />
				</label>
				<label>
					<span>Mention (optional Discord role/user tag)</span>
					<input type="text" placeholder="<@&roleid> or <@userid>" bind:value={draftMention} disabled={saving} />
				</label>
				<div class="header-edit-actions">
					<button type="submit" class="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
					<button type="button" class="btn-secondary" onclick={() => (editingTop = false)}>Cancel</button>
				</div>
			</form>
		{/if}
		<div class="meta">
			<span class="pill">{channel.kind}</span>
			{#if !channel.enabled}<span class="pill warn">disabled</span>{/if}
			<span class="meta-line">created {channel.created_at.slice(0, 10)}</span>
		</div>
	</header>

	{#if errorMsg}<div class="banner error">{errorMsg}</div>{/if}
	{#if successMsg}<div class="banner ok">{successMsg}</div>{/if}

	{#if channel.kind === 'sms'}
		<div class="banner info">
			<strong>SMS channel:</strong> only immediate alerts (Kp ≥ immediate threshold) are sent over SMS,
			limited to <strong>one message per 12 hours per phone</strong> regardless of activity. Summary
			cadence, off-hours digests, and storm-end notifications are silently skipped for SMS — use a
			Discord channel for the full alert stream.
		</div>
	{/if}

	<div class="card">
		<h3>Rule</h3>
		<p class="muted">When alerts fire for this channel — thresholds, cadence, burst window, off-hours behavior.</p>
		{#if rule}
			<RuleEditor channelId={channel.id} initialRule={rule} />
		{:else}
			<p class="muted">No rule row found — recreate the channel to fix.</p>
		{/if}
	</div>

	<div class="card">
		<h3>Schedules</h3>
		<p class="muted">Add windows during which this channel is active. With no windows the channel runs 24/7. Multiple windows are unioned. Outside any window, alerts are suppressed (or buffered if "off-hours digest" is enabled on the rule).</p>
		<ScheduleEditor channelId={channel.id} initialSchedules={schedules} />
	</div>
</section>

<style>
	.detail { display: flex; flex-direction: column; gap: var(--space-lg); }

	.breadcrumb { font-size: var(--font-size-sm); margin-bottom: var(--space-xs); }
	.breadcrumb a { color: var(--text-muted); }

	.header-row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap; }
	.header-row h2 { margin: 0; font-size: var(--font-size-lg); }

	.header-edit {
		display: flex; flex-direction: column; gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--bg-card); border: 1px solid var(--border-default);
		border-radius: var(--border-radius-md);
	}
	.header-edit label { display: flex; flex-direction: column; gap: 4px; font-size: var(--font-size-sm); color: var(--text-secondary); }
	.header-edit input {
		padding: var(--space-sm);
		background: var(--bg-base);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}
	.header-edit-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; }

	.meta {
		display: flex; gap: var(--space-sm); align-items: center;
		margin-top: var(--space-xs); font-size: var(--font-size-sm);
	}

	.pill {
		font-size: 0.7rem; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.04em;
		padding: 2px 6px; border-radius: var(--border-radius-sm);
		color: var(--accent-blue); background: rgba(56, 139, 253, 0.12);
	}
	.pill.warn { color: var(--text-muted); background: var(--bg-base); }
	.meta-line { color: var(--text-muted); }

	.banner { padding: var(--space-sm) var(--space-md); border-radius: var(--border-radius-sm); border: 1px solid; }
	.banner.error { background: rgba(248,81,73,0.08); border-color: rgba(248,81,73,0.4); }
	.banner.ok { background: rgba(63,185,80,0.08); border-color: rgba(63,185,80,0.4); }
	.banner.info { background: rgba(56,139,253,0.08); border-color: rgba(56,139,253,0.4); }

	.card {
		padding: var(--space-lg);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-md);
	}
	.card h3 { margin: 0 0 var(--space-sm); font-size: var(--font-size-md); }
	.muted { color: var(--text-muted); font-size: var(--font-size-sm); margin: 0 0 var(--space-md); max-width: 70ch; }

	.btn-primary {
		padding: var(--space-sm) var(--space-md);
		background: var(--accent-blue); color: #fff;
		border: none; border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
	}
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-secondary {
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-base); color: var(--text-primary);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm); cursor: pointer;
	}
</style>
