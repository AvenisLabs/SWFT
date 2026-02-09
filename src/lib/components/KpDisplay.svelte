<!-- KpDisplay.svelte v0.3.0 — Big Kp number + trend + status -->
<script lang="ts">
	import type { KpSummary } from '$types/api';
	import { formatLocal } from '$lib/utils/timeFormat';

	interface Props {
		summary: KpSummary | null;
		loading?: boolean;
	}
	let { summary, loading = false }: Props = $props();

	// Map status to CSS color variable
	const statusColors: Record<string, string> = {
		quiet: 'var(--accent-green)',
		unsettled: 'var(--accent-yellow)',
		active: 'var(--accent-orange)',
		storm: 'var(--accent-red)',
		severe_storm: 'var(--severity-extreme)',
	};

	const trendArrows: Record<string, string> = {
		rising: '↑',
		falling: '↓',
		stable: '→',
	};

	let color = $derived(summary ? statusColors[summary.status] ?? 'var(--text-primary)' : 'var(--text-muted)');
	let arrow = $derived(summary ? trendArrows[summary.trend] ?? '' : '');
</script>

<div class="kp-display">
	{#if loading}
		<div class="kp-loading">
			<div class="kp-number skeleton">--</div>
			<div class="kp-label skeleton">Loading&hellip;</div>
		</div>
	{:else if summary}
		<div class="kp-value-row">
			<span class="kp-number" style:color>{summary.current_kp.toFixed(1)}</span>
			<span class="kp-trend" style:color>{arrow}</span>
		</div>
		<div class="kp-status" style:color>{summary.status_label}</div>
		<p class="kp-message">{summary.message}</p>
		{#if summary.current_time}
			<time class="kp-time" datetime={summary.current_time}>
				{formatLocal(summary.current_time)}
			</time>
		{/if}
	{:else}
		<div class="kp-number" style="color: var(--text-muted)">--</div>
		<div class="kp-label">No data available</div>
	{/if}
</div>

<style>
	.kp-display {
		text-align: center;
		min-height: 140px; /* Reserve space to prevent CLS during loading→loaded */
	}

	.kp-value-row {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: var(--space-sm);
	}

	.kp-number {
		font-size: var(--font-size-3xl);
		font-weight: 700;
		font-family: var(--font-mono);
		line-height: 1;
	}

	.kp-trend {
		font-size: var(--font-size-xl);
		font-weight: 600;
	}

	.kp-status {
		font-size: var(--font-size-lg);
		font-weight: 600;
		margin-top: var(--space-xs);
	}

	.kp-message {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		margin-top: var(--space-sm);
		line-height: 1.5;
	}

	.kp-time {
		display: block;
		color: var(--text-muted);
		font-size: 0.75rem;
		margin-top: var(--space-sm);
	}

	.skeleton {
		color: var(--text-muted);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
