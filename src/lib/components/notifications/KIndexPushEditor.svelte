<!-- KIndexPushEditor.svelte v0.1.0 - One-time and scheduled K-index source pushes. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { ApiResponse } from '$types/api';
	import type { NotifKIndexPushSchedule } from '$lib/server/notif-kindex-schedules';
	import { formatUserTime } from '$lib/utils/timeFormat';

	interface Props {
		channelId: number;
		channelKind: 'discord' | 'sms';
		initialSchedules: NotifKIndexPushSchedule[];
	}

	let { channelId, channelKind, initialSchedules }: Props = $props();

	let schedulesLocal = $state<NotifKIndexPushSchedule[] | undefined>(undefined);
	const schedules = $derived(schedulesLocal ?? initialSchedules);

	let userTimeZone = $state<string | null>(null);
	let oneTimeSending = $state(false);
	let creating = $state(false);
	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	let draftPushTime = $state('08:00');
	let draftTimezone = $state('America/New_York');
	let draftLookback = $state(6);

	const TZS = [
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'America/Anchorage',
		'Pacific/Honolulu',
		'UTC',
		'Europe/London',
		'Europe/Paris',
		'Australia/Sydney',
	];

	onMount(() => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (tz) {
			userTimeZone = tz;
			draftTimezone = tz;
		}
	});

	function clearMessages() {
		errorMsg = null;
		successMsg = null;
	}

	async function sendOneTime() {
		clearMessages();
		oneTimeSending = true;
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channelId}/kindex-push`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ timezone: userTimeZone, lookback_hours: 6 }),
			});
			const body = (await res.json()) as ApiResponse<{ status: number }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `One-time push failed (${res.status})`;
			} else {
				successMsg = `One-time push sent (HTTP ${body.data.status}).`;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
		oneTimeSending = false;
	}

	async function addSchedule(evt: SubmitEvent) {
		evt.preventDefault();
		clearMessages();
		creating = true;
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channelId}/kindex-schedules`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					push_time: draftPushTime,
					timezone: draftTimezone,
					lookback_hours: Number(draftLookback),
					enabled: true,
				}),
			});
			const body = (await res.json()) as ApiResponse<NotifKIndexPushSchedule>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				schedulesLocal = [...schedules, body.data];
				successMsg = 'Scheduled push added.';
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
		creating = false;
	}

	async function updateSchedule(s: NotifKIndexPushSchedule, patch: Partial<NotifKIndexPushSchedule>) {
		clearMessages();
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channelId}/kindex-schedules/${s.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(patch),
			});
			const body = (await res.json()) as ApiResponse<NotifKIndexPushSchedule>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				schedulesLocal = schedules.map(x => (x.id === s.id ? body.data : x));
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}

	async function removeSchedule(s: NotifKIndexPushSchedule) {
		if (!confirm('Delete this scheduled K-index push?')) return;
		clearMessages();
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channelId}/kindex-schedules/${s.id}`, {
				method: 'DELETE',
			});
			const body = (await res.json()) as ApiResponse<{ id: number }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				schedulesLocal = schedules.filter(x => x.id !== s.id);
				successMsg = 'Scheduled push removed.';
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}
</script>

<div class="kindex-editor">
	{#if errorMsg}<div class="banner error">{errorMsg}</div>{/if}
	{#if successMsg}<div class="banner ok">{successMsg}</div>{/if}

	{#if channelKind !== 'discord'}
		<div class="banner info">K-index source pushes require a Discord webhook channel.</div>
	{:else}
		<div class="one-time-row">
			<div>
				<h4>One-Time Push</h4>
				<p class="muted">NOAA Boulder K-index, NOAA Estimated Kp, and GFZ Potsdam Hp30; current + previous 6 hours.</p>
			</div>
			<button class="btn-primary" onclick={sendOneTime} disabled={oneTimeSending}>
				{oneTimeSending ? 'Sending...' : 'One-Time Push'}
			</button>
		</div>

		{#if schedules.length > 0}
			<ul class="push-list">
				{#each schedules as s (s.id)}
					<li class="push-row" class:disabled={!s.enabled}>
						<div class="push-main">
							<strong>{s.push_time}</strong>
							<span class="muted">{s.timezone}</span>
							<span class="muted">current + previous {s.lookback_hours}h</span>
							{#if s.last_sent_at}
								<span class="muted">last sent {formatUserTime(s.last_sent_at, userTimeZone)}</span>
							{/if}
						</div>
						<div class="push-actions">
							<button class="btn-secondary" onclick={() => updateSchedule(s, { enabled: s.enabled ? 0 : 1 })}>
								{s.enabled ? 'Disable' : 'Enable'}
							</button>
							<button class="btn-danger" onclick={() => removeSchedule(s)}>Remove</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<form class="add-push" onsubmit={addSchedule}>
			<h4>Add scheduled push</h4>
			<div class="add-row">
				<label>
					<span>Push time</span>
					<input type="time" bind:value={draftPushTime} required disabled={creating} />
				</label>
				<label>
					<span>Timezone</span>
					<select bind:value={draftTimezone} disabled={creating}>
						{#each TZS as tz}
							<option value={tz}>{tz}</option>
						{/each}
					</select>
				</label>
				<label>
					<span>Lookback</span>
					<select bind:value={draftLookback} disabled={creating}>
						{#each Array.from({ length: 12 }, (_, i) => i + 1) as hours}
							<option value={hours}>Current + previous {hours}h</option>
						{/each}
					</select>
				</label>
			</div>
			<div class="actions">
				<button type="submit" class="btn-primary" disabled={creating}>
					{creating ? 'Adding...' : 'Add scheduled push'}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.kindex-editor { display: flex; flex-direction: column; gap: var(--space-md); }
	.banner { padding: var(--space-sm) var(--space-md); border-radius: var(--border-radius-sm); border: 1px solid; }
	.banner.error { background: rgba(248,81,73,0.08); border-color: rgba(248,81,73,0.4); }
	.banner.ok { background: rgba(63,185,80,0.08); border-color: rgba(63,185,80,0.4); }
	.banner.info { background: rgba(56,139,253,0.08); border-color: rgba(56,139,253,0.4); }

	.one-time-row, .push-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--bg-base);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		flex-wrap: wrap;
	}
	.one-time-row h4, .add-push h4 { margin: 0 0 4px; font-size: var(--font-size-sm); }
	.muted { color: var(--text-muted); font-size: var(--font-size-sm); margin: 0; }

	.push-list { list-style: none; display: flex; flex-direction: column; gap: var(--space-xs); padding: 0; margin: 0; }
	.push-row.disabled { opacity: 0.6; }
	.push-main { display: flex; gap: var(--space-sm); align-items: baseline; flex-wrap: wrap; }
	.push-actions { display: flex; gap: var(--space-xs); }

	.add-push {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--bg-base);
		border: 1px dashed var(--border-default);
		border-radius: var(--border-radius-sm);
	}
	.add-row { display: flex; gap: var(--space-sm); flex-wrap: wrap; align-items: flex-end; }
	label { display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; color: var(--text-muted); flex: 1; min-width: 160px; }
	input, select {
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}
	.actions { display: flex; justify-content: flex-end; }

	.btn-primary, .btn-secondary, .btn-danger {
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
	}
	.btn-primary { background: var(--accent-blue); color: #fff; border: none; }
	.btn-secondary { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-default); }
	.btn-danger { background: transparent; color: var(--accent-red, #f85149); border: 1px solid currentColor; }
	button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
