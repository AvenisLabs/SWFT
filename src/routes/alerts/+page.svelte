<!-- /alerts page v0.3.0 — Full alerts with filters, search, pagination -->
<script lang="ts">
	import AlertCard from '$lib/components/AlertCard.svelte';
	import type { AlertItem } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let alerts = $state<AlertItem[]>([]);
	let loading = $state(true);

	// Filter state
	let categoryFilter = $state('all');
	let severityFilter = $state('all');
	let searchQuery = $state('');
	let activeOnly = $state(false);
	let currentPage = $state(1);
	const PAGE_SIZE = 15;

	const categories = [
		{ value: 'all', label: 'All' },
		{ value: 'geomagnetic_storm', label: 'Geomagnetic Storm' },
		{ value: 'solar_radiation', label: 'Solar Radiation' },
		{ value: 'radio_blackout', label: 'Radio Blackout' },
		{ value: 'solar_flare', label: 'Solar Flare' },
		{ value: 'cme', label: 'CME' },
		{ value: 'other', label: 'Other' },
	];

	const severities = [
		{ value: 'all', label: 'All' },
		{ value: 'minor', label: 'Minor' },
		{ value: 'moderate', label: 'Moderate' },
		{ value: 'strong', label: 'Strong' },
		{ value: 'extreme', label: 'Extreme' },
	];

	onMount(async () => {
		const data = await fetchApi<AlertItem[]>('/api/v1/alerts/recent?days=7&limit=100');
		if (data) alerts = data;
		loading = false;
	});

	// Reset page when filters change
	$effect(() => {
		// Reference filter values to track them
		categoryFilter; severityFilter; searchQuery; activeOnly;
		currentPage = 1;
	});

	let filteredAlerts = $derived.by(() => {
		let result = alerts;

		// Category filter
		if (categoryFilter !== 'all') {
			result = result.filter(a => a.event_type === categoryFilter);
		}

		// Severity filter
		if (severityFilter !== 'all') {
			result = result.filter(a => a.severity === severityFilter);
		}

		// Active only filter — show alerts where ends is null or in the future
		if (activeOnly) {
			const now = new Date().toISOString();
			result = result.filter(a => !a.ends || a.ends > now);
		}

		// Text search on summary + message
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(a =>
				a.summary.toLowerCase().includes(q) ||
				a.message.toLowerCase().includes(q)
			);
		}

		return result;
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE)));

	let paginatedAlerts = $derived(
		filteredAlerts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
	);

	let rangeStart = $derived((currentPage - 1) * PAGE_SIZE + 1);
	let rangeEnd = $derived(Math.min(currentPage * PAGE_SIZE, filteredAlerts.length));
</script>

<svelte:head>
	<title>Alerts — SWFT</title>
</svelte:head>

<main class="dashboard">
	<header>
		<h1>Space Weather Alerts</h1>
		<p class="subtitle">Recent alerts from NOAA — last 7 days</p>
	</header>

	<!-- Filters toolbar -->
	<div class="filters-bar">
		<!-- Category chips -->
		<div class="filter-row">
			<span class="filter-label">Category</span>
			<div class="chip-group">
				{#each categories as cat}
					<button
						class="chip"
						class:active={categoryFilter === cat.value}
						onclick={() => categoryFilter = cat.value}
					>{cat.label}</button>
				{/each}
			</div>
		</div>

		<!-- Severity chips -->
		<div class="filter-row">
			<span class="filter-label">Severity</span>
			<div class="chip-group">
				{#each severities as sev}
					<button
						class="chip"
						class:active={severityFilter === sev.value}
						onclick={() => severityFilter = sev.value}
					>{sev.label}</button>
				{/each}
			</div>
		</div>

		<!-- Search + active toggle -->
		<div class="filter-row filter-row-controls">
			<input
				type="search"
				class="search-input"
				placeholder="Search alerts..."
				bind:value={searchQuery}
			/>
			<label class="toggle-label">
				<input type="checkbox" bind:checked={activeOnly} />
				<span>Active only</span>
			</label>
		</div>
	</div>

	<!-- Results -->
	<section class="alerts-container">
		{#if loading}
			{#each Array(3) as _}
				<div class="skeleton-card"></div>
			{/each}
		{:else if filteredAlerts.length === 0}
			<p class="empty-state">No alerts match your filters</p>
		{:else}
			<p class="results-count">
				Showing {rangeStart}–{rangeEnd} of {filteredAlerts.length} alerts
			</p>
			<div class="alerts-list">
				{#each paginatedAlerts as alert (alert.id)}
					<AlertCard {alert} />
				{/each}
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<nav class="pagination" aria-label="Alert pages">
					<button
						class="page-btn"
						disabled={currentPage <= 1}
						onclick={() => currentPage--}
					>&laquo; Prev</button>

					{#each Array(totalPages) as _, i}
						<button
							class="page-btn"
							class:active={currentPage === i + 1}
							onclick={() => currentPage = i + 1}
						>{i + 1}</button>
					{/each}

					<button
						class="page-btn"
						disabled={currentPage >= totalPages}
						onclick={() => currentPage++}
					>Next &raquo;</button>
				</nav>
			{/if}
		{/if}
	</section>

	<nav class="back-link">
		<a href="/">&larr; Back to dashboard</a>
	</nav>
</main>

<style>
	.filters-bar {
		margin-top: var(--space-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.filter-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		min-width: 70px;
		flex-shrink: 0;
	}

	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.chip {
		font-size: 0.75rem;
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid var(--border-default);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.chip:hover {
		border-color: var(--accent-blue);
		color: var(--text-primary);
	}

	.chip.active {
		background: var(--accent-blue);
		color: #fff;
		border-color: var(--accent-blue);
	}

	.filter-row-controls {
		gap: var(--space-md);
	}

	.search-input {
		flex: 1;
		min-width: 200px;
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-secondary);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}

	.search-input::placeholder {
		color: var(--text-muted);
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		cursor: pointer;
		white-space: nowrap;
	}

	.toggle-label input[type="checkbox"] {
		accent-color: var(--accent-blue);
	}

	.alerts-container {
		margin-top: var(--space-lg);
	}

	.results-count {
		color: var(--text-muted);
		font-size: 0.75rem;
		margin-bottom: var(--space-sm);
	}

	.alerts-list {
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

	.pagination {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		margin-top: var(--space-lg);
		flex-wrap: wrap;
	}

	.page-btn {
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.page-btn:hover:not(:disabled) {
		border-color: var(--accent-blue);
		color: var(--text-primary);
	}

	.page-btn.active {
		background: var(--accent-blue);
		color: #fff;
		border-color: var(--accent-blue);
	}

	.page-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.back-link {
		margin-top: var(--space-xl);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	@media (max-width: 640px) {
		.filter-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.filter-label {
			min-width: auto;
		}
	}
</style>
