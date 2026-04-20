<!-- MonitoringMode.svelte v0.1.0 — Small chip showing the cron worker's current
     monitoring intensity. Server-side data (from +layout.server.ts) so there's
     no client polling and no CLS. -->
<script lang="ts">
	import type { MonitoringModeData } from '$types/api';

	interface Props {
		state: MonitoringModeData;
	}
	let { state }: Props = $props();

	const labels: Record<MonitoringModeData['mode'], { text: string; cadence: string }> = {
		normal:   { text: 'Normal',   cadence: 'updates hourly' },
		elevated: { text: 'Elevated', cadence: 'updates every 15 min' },
		storm:    { text: 'Storm',    cadence: 'updates every 5 min' },
	};

	let label = $derived(labels[state.mode]);
	let expiry = $derived(state.mode === 'storm' ? state.storm_until : state.mode === 'elevated' ? state.elevated_until : null);
	let expiryLabel = $derived(expiry ? new Date(expiry).toISOString().slice(11, 16) + ' UTC' : null);
</script>

<span class="mode-chip" data-mode={state.mode} title={expiry ? `Active until ${expiry}` : 'Routine monitoring'}>
	<span class="mode-dot" aria-hidden="true"></span>
	<span class="mode-text">Monitoring: {label.text}</span>
	<span class="mode-cadence">· {label.cadence}</span>
	{#if expiryLabel}
		<span class="mode-expiry">· until {expiryLabel}</span>
	{/if}
</span>

<style>
	.mode-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px 10px;
		border-radius: 999px;
		font-size: 0.72rem;
		font-family: var(--font-mono);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-default);
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.mode-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		flex-shrink: 0;
	}

	.mode-chip[data-mode='normal'] {
		color: #4ade80;
		border-color: rgba(74, 222, 128, 0.25);
	}

	.mode-chip[data-mode='elevated'] {
		color: #facc15;
		border-color: rgba(250, 204, 21, 0.35);
		background: rgba(250, 204, 21, 0.05);
	}

	.mode-chip[data-mode='storm'] {
		color: #fb923c;
		border-color: rgba(251, 146, 60, 0.4);
		background: rgba(251, 146, 60, 0.08);
		animation: storm-pulse 2s ease-in-out infinite;
	}

	@keyframes storm-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.75; }
	}

	.mode-text {
		font-weight: 700;
	}

	.mode-cadence,
	.mode-expiry {
		opacity: 0.85;
	}

	@media (max-width: 640px) {
		.mode-cadence { display: none; }
	}
</style>
