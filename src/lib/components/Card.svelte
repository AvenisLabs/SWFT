<!-- Card.svelte v0.1.0 — Reusable card container component -->
<script lang="ts">
	interface Props {
		title?: string;
		variant?: 'default' | 'compact';
		children: import('svelte').Snippet;
	}
	let { title, variant = 'default', children }: Props = $props();
</script>

<div class="card-wrapper" class:compact={variant === 'compact'}>
	{#if title}
		<h3 class="card-title">{title}</h3>
	{/if}
	<div class="card-body">
		{@render children()}
	</div>
</div>

<style>
	.card-wrapper {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-lg);
	}

	.card-wrapper.compact {
		padding: var(--space-md);
	}

	.card-title {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-sm);
	}

	.card-body {
		width: 100%;
	}
</style>
