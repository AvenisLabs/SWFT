<!-- AlertCard.svelte v0.1.0 — Individual alert display card -->
<script lang="ts">
	import type { AlertItem } from '$types/api';
	import { formatTimestamp } from '$lib/utils/formatters';

	interface Props {
		alert: AlertItem;
		expanded?: boolean;
	}
	let { alert, expanded = false }: Props = $props();

	let showFull = $state(false);
	// Sync initial expanded prop
	$effect(() => { showFull = expanded; });

	const severityColors: Record<string, string> = {
		minor: 'var(--severity-low)',
		moderate: 'var(--severity-moderate)',
		strong: 'var(--severity-high)',
		extreme: 'var(--severity-extreme)',
	};

	let badgeColor = $derived(severityColors[alert.severity] ?? 'var(--text-muted)');
</script>

<article class="alert-card" data-severity={alert.severity}>
	<div class="alert-header">
		<span class="severity-badge" style:background={badgeColor}>
			{alert.scale_type && alert.scale_value
				? `${alert.scale_type}${alert.scale_value}`
				: alert.severity}
		</span>
		<span class="event-type">{alert.event_type.replace(/_/g, ' ')}</span>
		<time class="alert-time">{formatTimestamp(alert.issue_time)}</time>
	</div>

	<p class="alert-summary">{alert.summary}</p>

	{#if showFull}
		<pre class="alert-message">{alert.message}</pre>
	{/if}

	<button class="toggle-btn" onclick={() => showFull = !showFull}>
		{showFull ? 'Show less' : 'Show full message'}
	</button>
</article>

<style>
	.alert-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-md);
	}

	.alert-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
		margin-bottom: var(--space-sm);
	}

	.severity-badge {
		font-size: 0.75rem;
		padding: 2px 8px;
		border-radius: var(--border-radius-sm);
		font-weight: 700;
		text-transform: uppercase;
		color: #fff;
	}

	.event-type {
		font-weight: 500;
		text-transform: capitalize;
		font-size: var(--font-size-sm);
	}

	.alert-time {
		color: var(--text-muted);
		font-size: 0.75rem;
		margin-left: auto;
	}

	.alert-summary {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}

	.alert-message {
		margin-top: var(--space-sm);
		padding: var(--space-md);
		background: var(--bg-secondary);
		border-radius: var(--border-radius-sm);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-secondary);
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.toggle-btn {
		margin-top: var(--space-sm);
		background: none;
		border: none;
		color: var(--accent-blue);
		font-size: var(--font-size-sm);
		cursor: pointer;
		padding: 0;
	}

	.toggle-btn:hover {
		text-decoration: underline;
	}
</style>
