<!-- PanelGrid.svelte v0.2.0 — Grid display of solar imagery panels -->
<script lang="ts">
	import type { PanelDefinition } from '$types/api';
	import AnimationPlayer from './AnimationPlayer.svelte';

	interface Props {
		panels: PanelDefinition[];
		loading?: boolean;
	}
	let { panels, loading = false }: Props = $props();
</script>

<div class="panel-grid">
	{#if loading}
		{#each Array(4) as _}
			<div class="panel-skeleton"></div>
		{/each}
	{:else if panels.length === 0}
		<p class="muted">No panels available</p>
	{:else}
		{#each panels as panel (panel.id)}
			<div class="panel-item">
				<h4 class="panel-label">{panel.label}</h4>
				{#if panel.is_animation}
					<AnimationPlayer panelId={panel.id} autoplay={panel.id === 'suvi-304'} />
				{:else}
					<div class="panel-image">
						<img src="/api/v1/panels/{panel.id}/latest" alt={panel.label} loading="lazy" />
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.panel-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.panel-item {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		overflow: hidden;
	}

	.panel-label {
		padding: var(--space-sm) var(--space-md);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-default);
	}

	.panel-image img {
		width: 100%;
		height: auto;
		display: block;
	}

	.panel-skeleton {
		height: 250px;
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
