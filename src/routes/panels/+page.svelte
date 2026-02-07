<!-- /panels page v0.2.0 — Solar imagery panels -->
<script lang="ts">
	import PanelGrid from '$lib/components/PanelGrid.svelte';
	import type { PanelDefinition } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let panels = $state<PanelDefinition[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const data = await fetchApi<PanelDefinition[]>('/api/v1/panels');
		if (data) panels = data;
		loading = false;
	});
</script>

<svelte:head>
	<title>Solar Imagery — SWFT</title>
</svelte:head>

<main class="dashboard">
	<header>
		<h1>Solar Imagery Panels</h1>
		<p class="subtitle">Live solar imagery and animations from NOAA</p>
	</header>

	<section class="panels-container">
		<PanelGrid {panels} {loading} />
	</section>

	<nav class="back-link">
		<a href="/">&larr; Back to dashboard</a>
	</nav>
</main>

<style>
	.panels-container {
		margin-top: var(--space-xl);
	}

	.back-link {
		margin-top: var(--space-xl);
	}
</style>
