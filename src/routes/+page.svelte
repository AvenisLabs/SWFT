<!-- +page.svelte v0.2.0 — Dashboard home page -->
<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import KpDisplay from '$lib/components/KpDisplay.svelte';
	import KpChart from '$lib/components/KpChart.svelte';
	import type { KpSummary, GnssRiskResult, AlertItem } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let { data } = $props();

	// Server-loaded initial data, updated via client-side refresh
	let kpSummary = $state<KpSummary | null>(null);
	let gnssRisk = $state<GnssRiskResult | null>(null);
	let alerts = $state<AlertItem[]>([]);
	let loadingKp = $state(true);
	let loadingGnss = $state(true);
	let loadingAlerts = $state(true);

	// Hydrate from SSR data via derived reactivity
	let serverKp = $derived(data.kpSummary);
	$effect(() => {
		if (serverKp && !kpSummary) {
			kpSummary = serverKp;
			loadingKp = false;
		}
	});

	onMount(() => {
		// Client-side fetch to hydrate remaining data
		refreshData();
		// Auto-refresh every 3 minutes
		const interval = setInterval(refreshData, 180_000);
		return () => clearInterval(interval);
	});

	async function refreshData() {
		const [kp, risk, alertData] = await Promise.all([
			fetchApi<KpSummary>('/api/v1/kp/summary'),
			fetchApi<GnssRiskResult>('/api/v1/gnss/risk'),
			fetchApi<AlertItem[]>('/api/v1/alerts/active'),
		]);

		if (kp) { kpSummary = kp; loadingKp = false; }
		if (risk) { gnssRisk = risk; loadingGnss = false; }
		if (alertData) { alerts = alertData; loadingAlerts = false; }
	}
</script>

<main class="dashboard">
	<header class="dashboard-header">
		<h1>Space Weather Forecast & Tracking</h1>
		<p class="subtitle">GNSS &amp; terrestrial impact guidance — powered by NOAA data</p>
	</header>

	<section class="dashboard-grid">
		<!-- Kp Index Card -->
		<Card title="Kp Index">
			<KpDisplay summary={kpSummary} loading={loadingKp} />
		</Card>

		<!-- GNSS Risk Card -->
		<Card title="GNSS Risk">
			{#if loadingGnss}
				<div class="placeholder-content">
					<span class="big-number skeleton">--</span>
					<p class="muted">Calculating&hellip;</p>
				</div>
			{:else if gnssRisk}
				<div class="risk-display" data-level={gnssRisk.level.toLowerCase()}>
					<span class="big-number">{gnssRisk.score}</span>
					<span class="risk-label">{gnssRisk.level}</span>
				</div>
				<p class="advisory-text">{gnssRisk.advisory}</p>
			{:else}
				<p class="muted">Risk data unavailable</p>
			{/if}
		</Card>

		<!-- Active Alerts Card -->
		<Card title="Active Alerts">
			{#if loadingAlerts}
				<p class="muted">Loading alerts&hellip;</p>
			{:else if alerts.length === 0}
				<p class="no-alerts">No active alerts</p>
			{:else}
				<ul class="alert-list">
					{#each alerts.slice(0, 5) as alert}
						<li class="alert-item" data-severity={alert.severity}>
							<span class="alert-badge">{alert.severity}</span>
							<span class="alert-summary">{alert.summary}</span>
						</li>
					{/each}
				</ul>
				{#if alerts.length > 5}
					<a href="/alerts" class="view-all">View all {alerts.length} alerts</a>
				{/if}
			{/if}
		</Card>

		<!-- Kp Chart Card (spans full width) -->
		<Card title="Kp Index — Last 24 Hours">
			{#if kpSummary?.recent}
				<KpChart data={kpSummary.recent} />
			{:else}
				<p class="muted">Chart data loading&hellip;</p>
			{/if}
		</Card>
	</section>
</main>

<style>
	.dashboard-header {
		margin-bottom: var(--space-xl);
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
	}

	/* Make chart card span full width */
	.dashboard-grid > :global(:last-child) {
		grid-column: 1 / -1;
	}

	.placeholder-content {
		text-align: center;
	}

	.big-number {
		font-size: var(--font-size-3xl);
		font-weight: 700;
		font-family: var(--font-mono);
		display: block;
		line-height: 1;
	}

	.risk-display {
		text-align: center;
	}

	.risk-display[data-level="low"] .big-number { color: var(--severity-low); }
	.risk-display[data-level="moderate"] .big-number { color: var(--severity-moderate); }
	.risk-display[data-level="high"] .big-number { color: var(--severity-high); }
	.risk-display[data-level="severe"] .big-number { color: var(--severity-severe); }
	.risk-display[data-level="extreme"] .big-number { color: var(--severity-extreme); }

	.risk-label {
		display: block;
		font-size: var(--font-size-lg);
		font-weight: 600;
		margin-top: var(--space-xs);
	}

	.advisory-text {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		margin-top: var(--space-sm);
	}

	.no-alerts {
		color: var(--accent-green);
		font-weight: 500;
	}

	.alert-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.alert-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-sm);
	}

	.alert-badge {
		font-size: 0.7rem;
		padding: 2px 6px;
		border-radius: var(--border-radius-sm);
		text-transform: uppercase;
		font-weight: 600;
		background: var(--bg-secondary);
		white-space: nowrap;
	}

	.alert-item[data-severity="extreme"] .alert-badge { background: var(--severity-extreme); color: #fff; }
	.alert-item[data-severity="strong"] .alert-badge { background: var(--severity-severe); color: #fff; }
	.alert-item[data-severity="moderate"] .alert-badge { background: var(--severity-high); color: #fff; }
	.alert-item[data-severity="minor"] .alert-badge { background: var(--severity-moderate); color: #000; }

	.alert-summary {
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.view-all {
		display: block;
		margin-top: var(--space-sm);
		font-size: var(--font-size-sm);
	}

	.skeleton {
		color: var(--text-muted);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	@media (max-width: 768px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
