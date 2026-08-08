<!-- ScheduleEditor.svelte v0.1.0 — Edit notif_schedules for one channel. -->
<script lang="ts">
	import type { ApiResponse } from '$types/api';
	import type { NotifSchedule } from '$lib/server/notif-channels';

	interface Props {
		channelId: number;
		initialSchedules: NotifSchedule[];
	}

	let { channelId, initialSchedules }: Props = $props();

	let schedulesLocal = $state<NotifSchedule[] | undefined>(undefined);
	const schedules = $derived(schedulesLocal ?? initialSchedules);

	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// Common timezones — keep list short and useful; users can type any IANA name.
	const TZS = [
		'UTC',
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'America/Anchorage',
		'Pacific/Honolulu',
		'Europe/London',
		'Europe/Paris',
		'Australia/Sydney',
	];

	// Draft for "new schedule" form.
	let draftDays = $state<number>(0b0111110); // weekdays default
	let draftStart = $state(7);
	let draftEnd = $state(19);
	let draftTz = $state('UTC');
	let draftDateStart = $state('');
	let draftDateEnd = $state('');
	let creating = $state(false);

	function toggleDay(bit: number, current: number): number {
		return current ^ (1 << bit);
	}

	function describeDays(mask: number): string {
		if (mask === 127) return 'Every day';
		if (mask === 0b0111110) return 'Weekdays';
		if (mask === 0b1000001) return 'Weekends';
		return DAY_LABELS.filter((_, i) => (mask >> i) & 1).join(', ');
	}

	async function addSchedule(evt: SubmitEvent) {
		evt.preventDefault();
		errorMsg = null;
		successMsg = null;
		creating = true;
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channelId}/schedules`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					days_mask: draftDays,
					hour_start: draftStart,
					hour_end: draftEnd,
					timezone: draftTz,
					date_range_start: draftDateStart || null,
					date_range_end: draftDateEnd || null,
				}),
			});
			const body = (await res.json()) as ApiResponse<NotifSchedule>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				schedulesLocal = [...schedules, body.data];
				successMsg = 'Schedule added.';
				draftDateStart = '';
				draftDateEnd = '';
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
		creating = false;
	}

	async function updateOne(s: NotifSchedule, patch: Partial<NotifSchedule>) {
		errorMsg = null;
		successMsg = null;
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channelId}/schedules/${s.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(patch),
			});
			const body = (await res.json()) as ApiResponse<NotifSchedule>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				schedulesLocal = schedules.map(x => (x.id === s.id ? body.data : x));
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}

	async function removeOne(s: NotifSchedule) {
		if (!confirm('Delete this schedule window?')) return;
		errorMsg = null;
		successMsg = null;
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channelId}/schedules/${s.id}`, {
				method: 'DELETE',
			});
			const body = (await res.json()) as ApiResponse<{ id: number }>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				schedulesLocal = schedules.filter(x => x.id !== s.id);
				successMsg = 'Schedule removed.';
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
	}
</script>

<div class="schedule-editor">
	{#if errorMsg}<div class="banner error">{errorMsg}</div>{/if}
	{#if successMsg}<div class="banner ok">{successMsg}</div>{/if}

	{#if schedules.length === 0}
		<p class="empty-hint">No schedules — channel will fire 24/7. Add a window to restrict timing.</p>
	{:else}
		<ul class="schedule-list">
			{#each schedules as s (s.id)}
				<li class="schedule-row">
					<div class="schedule-main">
						<div class="schedule-summary">
							<strong>{describeDays(s.days_mask)}</strong>
							{String(s.hour_start).padStart(2, '0')}:00 –
							{String(s.hour_end).padStart(2, '0')}:00
							<span class="muted">({s.timezone})</span>
						</div>
						{#if s.date_range_start || s.date_range_end}
							<div class="schedule-range muted">
								{s.date_range_start ?? '∞'} → {s.date_range_end ?? '∞'}
							</div>
						{/if}
					</div>
					<div class="day-toggle">
						{#each DAY_LABELS as d, i}
							<button
								type="button"
								class="day-btn"
								class:on={(s.days_mask >> i) & 1}
								onclick={() => updateOne(s, { days_mask: toggleDay(i, s.days_mask) })}
								title="Toggle {d}"
							>
								{d[0]}
							</button>
						{/each}
					</div>
					<button class="btn-danger" onclick={() => removeOne(s)}>Remove</button>
				</li>
			{/each}
		</ul>
	{/if}

	<form class="add-schedule" onsubmit={addSchedule}>
		<h4>Add a schedule window</h4>
		<div class="add-row">
			<div class="day-toggle big">
				{#each DAY_LABELS as d, i}
					<button
						type="button"
						class="day-btn"
						class:on={(draftDays >> i) & 1}
						onclick={() => (draftDays = toggleDay(i, draftDays))}
					>
						{d[0]}
					</button>
				{/each}
			</div>
			<div class="presets">
				<button type="button" onclick={() => (draftDays = 127)}>All</button>
				<button type="button" onclick={() => (draftDays = 0b0111110)}>Weekdays</button>
				<button type="button" onclick={() => (draftDays = 0b1000001)}>Weekends</button>
			</div>
		</div>
		<div class="add-row times">
			<label>
				<span>Start (hour)</span>
				<input type="number" min="0" max="23" bind:value={draftStart} required disabled={creating} />
			</label>
			<label>
				<span>End (hour, exclusive)</span>
				<input type="number" min="1" max="24" bind:value={draftEnd} required disabled={creating} />
			</label>
			<label>
				<span>Timezone</span>
				<select bind:value={draftTz} disabled={creating}>
					{#each TZS as tz}
						<option value={tz}>{tz}</option>
					{/each}
				</select>
			</label>
		</div>
		<div class="add-row dates">
			<label>
				<span>Date range start (optional)</span>
				<input type="date" bind:value={draftDateStart} disabled={creating} />
			</label>
			<label>
				<span>Date range end (optional)</span>
				<input type="date" bind:value={draftDateEnd} disabled={creating} />
			</label>
		</div>
		<div class="actions">
			<button type="submit" class="btn-primary" disabled={creating || draftDays === 0}>
				{creating ? 'Adding…' : 'Add window'}
			</button>
		</div>
	</form>
</div>

<style>
	.schedule-editor { display: flex; flex-direction: column; gap: var(--space-md); }
	.banner { padding: var(--space-sm) var(--space-md); border-radius: var(--border-radius-sm); border: 1px solid; }
	.banner.error { background: rgba(248,81,73,0.08); border-color: rgba(248,81,73,0.4); }
	.banner.ok { background: rgba(63,185,80,0.08); border-color: rgba(63,185,80,0.4); }

	.empty-hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		font-style: italic;
		margin: 0;
	}

	.schedule-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
	.schedule-row {
		display: flex; align-items: center; gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-base);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		flex-wrap: wrap;
	}
	.schedule-main { flex: 1; min-width: 220px; }
	.schedule-summary { font-size: var(--font-size-sm); }
	.schedule-range { font-size: 0.75rem; margin-top: 2px; }
	.muted { color: var(--text-muted); }

	.day-toggle { display: flex; gap: 2px; }
	.day-toggle.big { gap: 4px; }
	.day-btn {
		width: 26px; height: 26px;
		background: transparent;
		color: var(--text-muted);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.day-btn.on {
		background: var(--accent-blue);
		color: #fff;
		border-color: var(--accent-blue);
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

	.add-schedule {
		display: flex; flex-direction: column; gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--bg-base);
		border: 1px dashed var(--border-default);
		border-radius: var(--border-radius-sm);
	}
	.add-schedule h4 { margin: 0; font-size: var(--font-size-sm); color: var(--text-secondary); }
	.add-row { display: flex; gap: var(--space-sm); flex-wrap: wrap; align-items: flex-end; }
	.add-row.times label, .add-row.dates label {
		display: flex; flex-direction: column; gap: 4px;
		font-size: 0.75rem; color: var(--text-muted);
		flex: 1; min-width: 120px;
	}
	.add-row input, .add-row select {
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}
	.presets { display: flex; gap: 4px; }
	.presets button {
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		color: var(--text-muted);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-size: 0.75rem;
	}
	.presets button:hover { color: var(--text-primary); border-color: var(--accent-blue); }

	.actions { display: flex; justify-content: flex-end; }
	.btn-primary {
		padding: var(--space-xs) var(--space-md);
		background: var(--accent-blue); color: #fff;
		border: none; border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
	}
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
