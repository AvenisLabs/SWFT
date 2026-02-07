<!-- AlertsList.svelte v0.1.0 — List of alert cards -->
<script lang="ts">
	import type { AlertItem } from '$types/api';
	import AlertCard from './AlertCard.svelte';

	interface Props {
		alerts: AlertItem[];
		loading?: boolean;
	}
	let { alerts, loading = false }: Props = $props();
</script>

<div class="alerts-list">
	{#if loading}
		<div class="loading-state">
			{#each Array(3) as _}
				<div class="skeleton-card"></div>
			{/each}
		</div>
	{:else if alerts.length === 0}
		<p class="empty-state">No alerts to display</p>
	{:else}
		{#each alerts as alert (alert.id)}
			<AlertCard {alert} />
		{/each}
	{/if}
</div>

<style>
	.alerts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.skeleton-card {
		height: 100px;
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.empty-state {
		text-align: center;
		color: var(--text-muted);
		padding: var(--space-xl);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
