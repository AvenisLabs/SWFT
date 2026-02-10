<!-- ExtLink.svelte v0.1.0 — External link wrapper with override support via layout data -->
<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import type { LinkOverride } from '$types/api';

	interface Props {
		href: string;
		children: Snippet;
		class?: string;
		[key: string]: unknown;
	}

	let { href, children, class: className = '', ...rest }: Props = $props();

	// Resolve override from layout data, matching url + current page path
	const override = $derived.by(() => {
		const overrides: LinkOverride[] = $page.data.linkOverrides ?? [];
		const currentPath = $page.url.pathname;
		// Prefer page-specific match, fall back to any-page match
		return overrides.find(o => o.url === href && o.page_path === currentPath)
			?? overrides.find(o => o.url === href);
	});

	const action = $derived(override?.action ?? 'default');
	const resolvedHref = $derived(override?.override_url ?? href);
	const hasTextOverride = $derived(!!override?.override_text);
</script>

{#if action === 'remove'}
	<!-- Link removed by admin override — render nothing -->
{:else if action === 'unlink'}
	<span class={className} {...rest}>
		{#if hasTextOverride}
			{override?.override_text}
		{:else}
			{@render children()}
		{/if}
	</span>
{:else}
	<a href={resolvedHref} target="_blank" rel="noopener" class={className} {...rest}>
		{#if hasTextOverride}
			{override?.override_text}
		{:else}
			{@render children()}
		{/if}
	</a>
{/if}
