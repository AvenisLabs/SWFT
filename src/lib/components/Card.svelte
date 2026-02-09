<!-- Card.svelte v0.2.0 — Reusable card container with optional header extras -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		variant?: 'default' | 'compact';
		href?: string;
		headerExtra?: Snippet;
		children: Snippet;
	}
	let { title, variant = 'default', href, headerExtra, children }: Props = $props();
</script>

{#if href}
	<a {href} class="card-link" class:compact={variant === 'compact'}>
		<div class="card-wrapper">
			{#if title}
				<div class="card-header">
					<h3 class="card-title">{title}</h3>
					{#if headerExtra}{@render headerExtra()}{/if}
				</div>
			{/if}
			<div class="card-body">
				{@render children()}
			</div>
		</div>
	</a>
{:else}
	<div class="card-wrapper" class:compact={variant === 'compact'}>
		{#if title}
			<div class="card-header">
				<h3 class="card-title">{title}</h3>
				{#if headerExtra}{@render headerExtra()}{/if}
			</div>
		{/if}
		<div class="card-body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.card-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.card-link .card-wrapper {
		transition: border-color 0.15s;
	}

	.card-link:hover .card-wrapper {
		border-color: var(--accent-blue);
	}

	.card-wrapper {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-lg);
	}

	.card-wrapper.compact {
		padding: var(--space-md);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.card-title {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.card-body {
		width: 100%;
	}
</style>
