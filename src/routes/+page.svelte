<!-- +page.svelte v0.4.0 — Dashboard home with estimated Kp line chart, GNSS explainer, compact historical chart -->
<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import HelpPopover from '$lib/components/HelpPopover.svelte';
	import KpDisplay from '$lib/components/KpDisplay.svelte';
	import KpChart from '$lib/components/KpChart.svelte';
	import KpLineChart from '$lib/components/KpLineChart.svelte';
	import KpGnssExplainer from '$lib/components/KpGnssExplainer.svelte';
	import type { KpSummary, KpEstimatedPoint, GnssRiskResult, AlertItem } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let { data } = $props();

	// Server-loaded initial data, updated via client-side refresh
	let kpSummary = $state<KpSummary | null>(null);
	let kpEstimated = $state<KpEstimatedPoint[]>([]);
	let gnssRisk = $state<GnssRiskResult | null>(null);
	let alerts = $state<AlertItem[]>([]);
	let loadingKp = $state(true);
	let loadingGnss = $state(true);
	let loadingAlerts = $state(true);

	// Hydrate from SSR data via derived reactivity
	let serverKp = $derived(data.kpSummary);
	let serverKpEstimated = $derived(data.kpEstimated);
	$effect(() => {
		if (serverKp && !kpSummary) {
			kpSummary = serverKp;
			loadingKp = false;
		}
	});
	$effect(() => {
		if (serverKpEstimated && serverKpEstimated.length > 0 && kpEstimated.length === 0) {
			kpEstimated = serverKpEstimated;
		}
	});

	// Current Kp from the latest estimated data point (for GNSS explainer highlighting)
	let currentEstimatedKp = $derived(
		kpEstimated.length > 0 ? kpEstimated[kpEstimated.length - 1].kp : undefined
	);

	onMount(() => {
		refreshData();
		const interval = setInterval(refreshData, 180_000);
		return () => clearInterval(interval);
	});

	async function refreshData() {
		const [kp, estimated, risk, alertData] = await Promise.all([
			fetchApi<KpSummary>('/api/v1/kp/summary'),
			fetchApi<KpEstimatedPoint[]>('/api/v1/kp/estimated'),
			fetchApi<GnssRiskResult>('/api/v1/gnss/risk'),
			fetchApi<AlertItem[]>('/api/v1/alerts/active'),
		]);

		if (kp) { kpSummary = kp; loadingKp = false; }
		if (estimated) { kpEstimated = estimated; }
		if (risk) { gnssRisk = risk; loadingGnss = false; }
		if (alertData) { alerts = alertData; loadingAlerts = false; }
	}

	// Severity badge colors for alert preview
	const severityColors: Record<string, string> = {
		minor: 'var(--severity-low)',
		moderate: 'var(--severity-moderate)',
		strong: 'var(--severity-high)',
		extreme: 'var(--severity-extreme)',
	};

	// Risk level color mapping for risk bar fill
	const riskLevelColors: Record<string, string> = {
		Low: 'var(--severity-low)',
		Moderate: 'var(--severity-moderate)',
		High: 'var(--severity-high)',
		Severe: 'var(--severity-severe)',
		Extreme: 'var(--severity-extreme)',
	};

	let riskBarColor = $derived(gnssRisk ? riskLevelColors[gnssRisk.level] ?? 'var(--text-muted)' : 'var(--text-muted)');

	function badgeText(alert: AlertItem): string {
		if (alert.scale_type && alert.scale_value) return `${alert.scale_type}${alert.scale_value}`;
		return alert.severity;
	}

	function badgeColor(alert: AlertItem): string {
		if (alert.scale_type && alert.scale_value) {
			return severityColors[alert.severity] ?? 'var(--bg-secondary)';
		}
		return severityColors[alert.severity] ?? 'var(--bg-secondary)';
	}

	function truncate(text: string, len: number): string {
		return text.length > len ? text.slice(0, len) + '...' : text;
	}
</script>

<main class="dashboard">
	<header class="dashboard-header">
		<h1>Space Weather Forecast & Tracking</h1>
		<p class="subtitle">GNSS &amp; terrestrial impact guidance — powered by NOAA data</p>
	</header>

	<section class="dashboard-grid">
		<!-- Kp Index Card — links to /gnss -->
		<Card title="Kp Index" href="/gnss">
			{#snippet headerExtra()}
				<HelpPopover
					id="help-kp"
					text="The planetary K-index (Kp) measures geomagnetic disturbance on a 0-9 scale. Values >=4 indicate unsettled conditions; >=5 indicates a geomagnetic storm."
				/>
			{/snippet}
			<KpDisplay summary={kpSummary} loading={loadingKp} />
		</Card>

		<!-- GNSS Risk Card — links to /gnss -->
		<Card title="GNSS Risk" href="/gnss">
			{#snippet headerExtra()}
				<HelpPopover
					id="help-gnss"
					text="Composite risk score (0-100) based on Kp index (35%), Bz magnetic field (25%), solar wind speed (20%), and radio blackout scale (20%). Higher scores mean greater GNSS disruption risk."
				/>
			{/snippet}
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
				<!-- Risk bar -->
				<div class="risk-bar-container">
					<div class="risk-bar-track">
						<div class="risk-bar-fill" style:width="{gnssRisk.score}%" style:background={riskBarColor}></div>
						<div class="risk-bar-marker" style:left="{gnssRisk.score}%" style:background={riskBarColor}></div>
					</div>
					<div class="risk-bar-labels">
						<span>0</span>
						<span>100</span>
					</div>
				</div>
				<p class="advisory-text">{gnssRisk.advisory}</p>
			{:else}
				<p class="muted">Risk data unavailable</p>
			{/if}
		</Card>

		<!-- Active Alerts Card — links to /alerts -->
		<Card title="Active Alerts" href="/alerts">
			{#snippet headerExtra()}
				<HelpPopover
					id="help-alerts"
					text="Current space weather alerts issued by NOAA's Space Weather Prediction Center within the last 24 hours."
				/>
			{/snippet}
			{#if loadingAlerts}
				<p class="muted">Loading alerts&hellip;</p>
			{:else if alerts.length === 0}
				<p class="no-alerts">No active alerts</p>
			{:else}
				<ul class="alert-list">
					{#each alerts.slice(0, 3) as alert, i}
						{#if i > 0}
							<li class="alert-separator" aria-hidden="true"></li>
						{/if}
						<li class="alert-item" data-severity={alert.severity}>
							<span class="alert-badge" style:background={badgeColor(alert)}>{badgeText(alert)}</span>
							<span class="alert-type">{alert.event_type.replace(/_/g, ' ')}</span>
							<span class="alert-summary">{truncate(alert.summary, 60)}</span>
						</li>
					{/each}
				</ul>
				{#if alerts.length > 3}
					<span class="view-all">View all {alerts.length} alerts &rarr;</span>
				{/if}
			{/if}
		</Card>

		<!-- Estimated Kp Line Chart (spans full width) -->
		<Card title="Current Estimated Kp — 15-Minute Intervals (Last 3 Hours)">
			{#snippet headerExtra()}
				<HelpPopover
					id="help-kp-estimated"
					text="Near-real-time estimated Kp derived from 1-minute NOAA data, averaged into 15-minute buckets. Y-axis uses non-linear scaling to emphasize storm-level values."
				/>
			{/snippet}
			{#if kpEstimated.length > 0}
				<KpLineChart data={kpEstimated} />
			{:else}
				<p class="muted">Estimated Kp data loading&hellip;</p>
			{/if}

			<!-- GNSS Effects Explainer -->
			<KpGnssExplainer activeKp={currentEstimatedKp} />
		</Card>

		<!-- Historical Kp Bar Chart (spans full width, compact) -->
		<Card title="Historical Kp — 3-Hour Intervals">
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

	/* Make the chart cards (last two) span full width */
	.dashboard-grid > :global(:nth-child(n+4)) {
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

	/* GNSS Risk Bar */
	.risk-bar-container {
		margin-top: var(--space-md);
		padding: 0 var(--space-xs);
	}

	.risk-bar-track {
		position: relative;
		height: 8px;
		background: var(--bg-secondary);
		border-radius: 4px;
		overflow: visible;
	}

	.risk-bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.6s ease-out;
	}

	.risk-bar-marker {
		position: absolute;
		top: -3px;
		width: 8px;
		height: 14px;
		border-radius: 2px;
		transform: translateX(-4px);
		transition: left 0.6s ease-out;
		opacity: 0.9;
	}

	.risk-bar-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 2px;
		font-size: 0.65rem;
		color: var(--text-muted);
		font-family: var(--font-mono);
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
		gap: var(--space-xs);
	}

	.alert-separator {
		height: 1px;
		background: var(--border-default);
		margin: var(--space-xs) 0;
	}

	.alert-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-sm);
	}

	.alert-badge {
		font-size: 0.65rem;
		padding: 2px 6px;
		border-radius: var(--border-radius-sm);
		text-transform: uppercase;
		font-weight: 700;
		white-space: nowrap;
		color: #fff;
	}

	.alert-type {
		font-size: 0.75rem;
		text-transform: capitalize;
		color: var(--text-secondary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.alert-summary {
		color: var(--text-muted);
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.view-all {
		display: block;
		margin-top: var(--space-sm);
		font-size: var(--font-size-sm);
		color: var(--accent-blue);
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
