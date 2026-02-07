<!-- /alerts page v0.2.0 — Full alerts listing -->
<script lang="ts">
	import AlertsList from '$lib/components/AlertsList.svelte';
	import type { AlertItem } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let alerts = $state<AlertItem[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const data = await fetchApi<AlertItem[]>('/api/v1/alerts/recent?days=7&limit=100');
		if (data) alerts = data;
		loading = false;
	});
</script>

<svelte:head>
	<title>Alerts — SWFT</title>
</svelte:head>

<main class="dashboard">
	<header>
		<h1>Space Weather Alerts</h1>
		<p class="subtitle">Recent alerts from NOAA — last 7 days</p>
	</header>

	<section class="alerts-container">
		<AlertsList {alerts} {loading} />
	</section>

	<nav class="back-link">
		<a href="/">&larr; Back to dashboard</a>
	</nav>
</main>

<style>
	.alerts-container {
		margin-top: var(--space-xl);
	}

	.back-link {
		margin-top: var(--space-xl);
	}
</style>
