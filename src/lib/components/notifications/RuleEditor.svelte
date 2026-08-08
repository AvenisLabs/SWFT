<!-- RuleEditor.svelte v0.1.0 — Edit the notif_rules row for one channel. -->
<script lang="ts">
	import type { ApiResponse } from '$types/api';
	import type { NotifRule } from '$lib/server/notif-channels';

	interface Props {
		channelId: number;
		initialRule: NotifRule;
	}

	let { channelId, initialRule }: Props = $props();

	// SSR-overlay pattern.
	let ruleLocal = $state<NotifRule | undefined>(undefined);
	const rule = $derived(ruleLocal ?? initialRule);

	// Form-bindable copies. Initialized to constants and populated via $effect
	// from the $derived `rule`. Initializing $state() directly from a reactive
	// value would freeze the draft at first-render and trigger the
	// state_referenced_locally warning.
	let draftThreshold = $state(4.0);
	let draftImmediate = $state(6.0);
	let draftSummary = $state(60);
	let draftBurst = $state(8);
	let draftOffHoursTime = $state('');
	let draftDigestOnResume = $state(false);
	let draftStormEnd = $state(true);
	let draftQuiet = $state(false);

	// Sync drafts from the rule prop on mount AND whenever the rule changes
	// (e.g. after a successful save returns the updated row).
	$effect(() => {
		draftThreshold = rule.threshold_kp;
		draftImmediate = rule.immediate_threshold_kp;
		draftSummary = rule.summary_interval_min;
		draftBurst = rule.burst_window_max_hours;
		draftOffHoursTime = rule.off_hours_digest_time ?? '';
		draftDigestOnResume = !!rule.off_hours_digest_on_resume;
		draftStormEnd = !!rule.storm_end_notify;
		draftQuiet = !!rule.quiet_below_g1;
	});

	let saving = $state(false);
	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	async function save(evt: SubmitEvent) {
		evt.preventDefault();
		errorMsg = null;
		successMsg = null;
		saving = true;
		try {
			const res = await fetch(`/api/v1/notifications/channels/${channelId}/rule`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					threshold_kp: Number(draftThreshold),
					immediate_threshold_kp: Number(draftImmediate),
					summary_interval_min: Number(draftSummary),
					burst_window_max_hours: Number(draftBurst),
					off_hours_digest_time: draftOffHoursTime.trim() || null,
					off_hours_digest_on_resume: draftDigestOnResume ? 1 : 0,
					storm_end_notify: draftStormEnd ? 1 : 0,
					quiet_below_g1: draftQuiet ? 1 : 0,
				}),
			});
			const body = (await res.json()) as ApiResponse<NotifRule>;
			if (!res.ok || !body.ok) {
				errorMsg = body.error ?? `Failed (${res.status})`;
			} else {
				ruleLocal = body.data;
				successMsg = 'Rule saved.';
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Network error';
		}
		saving = false;
	}
</script>

<form class="rule-form" onsubmit={save}>
	{#if errorMsg}<div class="banner error">{errorMsg}</div>{/if}
	{#if successMsg}<div class="banner ok">{successMsg}</div>{/if}

	<div class="grid">
		<label>
			<span>Threshold Kp (buffer + summary)</span>
			<input type="number" step="0.33" min="0" max="9" bind:value={draftThreshold} disabled={saving} />
			<small>Events at or above this Kp will be tracked and summarized.</small>
		</label>

		<label>
			<span>Immediate-push Kp</span>
			<input type="number" step="0.33" min="0" max="9" bind:value={draftImmediate} disabled={saving} />
			<small>Events at or above this Kp send an immediate alert. Default 6.0 ≈ G2.</small>
		</label>

		<label>
			<span>Summary cadence (minutes)</span>
			<select bind:value={draftSummary} disabled={saving}>
				<option value={60}>Every 60 minutes</option>
				<option value={30}>Every 30 minutes</option>
				<option value={15}>Every 15 minutes (burst)</option>
			</select>
			<small>15-min cadence is only used inside an active burst window (see below).</small>
		</label>

		<label>
			<span>Burst-window max hours</span>
			<input type="number" min="1" max="24" step="1" bind:value={draftBurst} disabled={saving} />
			<small>After the first qualifying event during the schedule, the 15-min cadence is allowed for at most this many hours. Default 8.</small>
		</label>

		<label>
			<span>Off-hours digest time (HH:MM UTC)</span>
			<input type="text" placeholder="07:00 (or blank for none)" bind:value={draftOffHoursTime} disabled={saving} pattern="^([01]\\d|2[0-3]):[0-5]\\d$" />
			<small>If set and outside the schedule, buffered events are sent as a digest at this time daily. Leave blank for none.</small>
		</label>

		<label class="checkbox">
			<input type="checkbox" bind:checked={draftDigestOnResume} disabled={saving} />
			<span>Send off-hours digest when schedule resumes</span>
			<small>When a schedule window opens, flush any buffered events from the prior off-period.</small>
		</label>

		<label class="checkbox">
			<input type="checkbox" bind:checked={draftStormEnd} disabled={saving} />
			<span>Notify when storm ends</span>
			<small>Send a one-line summary when active_mode returns to "normal".</small>
		</label>

		<label class="checkbox">
			<input type="checkbox" bind:checked={draftQuiet} disabled={saving} />
			<span>Quiet below G1</span>
			<small>Suppress alerts while no storm class is set (i.e. Kp may be elevated but no NOAA storm tier).</small>
		</label>
	</div>

	<div class="actions">
		<button type="submit" class="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save rule'}</button>
	</div>
</form>

<style>
	.rule-form { display: flex; flex-direction: column; gap: var(--space-md); }
	.banner { padding: var(--space-sm) var(--space-md); border-radius: var(--border-radius-sm); border: 1px solid; }
	.banner.error { background: rgba(248,81,73,0.08); border-color: rgba(248,81,73,0.4); }
	.banner.ok { background: rgba(63,185,80,0.08); border-color: rgba(63,185,80,0.4); }
	.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-md); }
	@media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
	label { display: flex; flex-direction: column; gap: 4px; font-size: var(--font-size-sm); color: var(--text-secondary); }
	label.checkbox { flex-direction: row; align-items: flex-start; gap: var(--space-sm); }
	label.checkbox span { color: var(--text-primary); font-weight: 500; }
	label.checkbox small { display: block; margin-top: 2px; }
	input[type=number], input[type=text], select {
		padding: var(--space-sm);
		background: var(--bg-base);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}
	input[type=checkbox] { margin-top: 4px; }
	small { color: var(--text-muted); font-size: 0.75rem; }
	.actions { display: flex; justify-content: flex-end; }
	.btn-primary {
		padding: var(--space-sm) var(--space-md);
		background: var(--accent-blue); color: #fff;
		border: none; border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
	}
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
