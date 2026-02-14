<!-- +page.svelte v0.8.0 — Dashboard home with SSR-prefetched data, CLS-free layout -->
<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import HelpPopover from '$lib/components/HelpPopover.svelte';
	import KpDisplay from '$lib/components/KpDisplay.svelte';
	import KpLineChart from '$lib/components/KpLineChart.svelte';
	import KpGnssExplainer from '$lib/components/KpGnssExplainer.svelte';
	import type { KpSummary, KpEstimatedPoint, GnssRiskResult, AlertItem } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let { data } = $props();

	// SSR data via $derived (reactive to prop) — client overlay via $state.
	// $derived renders SSR content on first paint (no CLS), client state takes over after refresh.
	let ssrKp = $derived(data.kpSummary ?? null);
	let ssrEstimated = $derived(data.kpEstimated ?? []);
	let ssrRisk = $derived(data.gnssRisk ?? null);
	let ssrAlerts = $derived(data.alerts);

	// Client-side overlays — undefined means "use SSR data"
	let clientKp = $state<KpSummary | null | undefined>(undefined);
	let clientEstimated = $state<KpEstimatedPoint[] | undefined>(undefined);
	let clientRisk = $state<GnssRiskResult | null | undefined>(undefined);
	let clientAlerts = $state<AlertItem[] | undefined>(undefined);

	// Merged values: client data takes priority over SSR data
	let kpSummary = $derived(clientKp !== undefined ? clientKp : ssrKp);
	let kpEstimated = $derived(clientEstimated !== undefined ? clientEstimated : ssrEstimated);
	let gnssRisk = $derived(clientRisk !== undefined ? clientRisk : ssrRisk);
	let alerts = $derived(clientAlerts !== undefined ? clientAlerts : (ssrAlerts ?? []));

	// Loading = no SSR data AND no client data yet
	let loadingKp = $derived(kpSummary === null);
	let loadingGnss = $derived(gnssRisk === null);
	let loadingAlerts = $derived(ssrAlerts === undefined && clientAlerts === undefined);

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

		if (kp) clientKp = kp;
		if (estimated) clientEstimated = estimated;
		if (risk) clientRisk = risk;
		if (alertData !== undefined) clientAlerts = alertData ?? [];
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
			<div class="alerts-content">
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
			</div>
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

	</section>

	<!-- Knowledge Hub — GNSS education cards linking to /gnss-reliability -->
	<section class="knowledge-section">
		<h2>Understanding GNSS Reliability</h2>
		<div class="knowledge-grid">
			<a href="/gnss-reliability/how-space-weather-affects-gps" class="knowledge-card">
				<div class="knowledge-icon">
					<!-- Satellite icon -->
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="2" />
						<path d="M7 17l-2 2" />
						<path d="M17 7l2-2" />
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
						<path d="M8.46 15.54a5 5 0 0 1 0-7.07" />
						<path d="M18.36 5.64a9 9 0 0 1 0 12.73" />
						<path d="M5.64 18.36a9 9 0 0 1 0-12.73" />
					</svg>
				</div>
				<h3 class="knowledge-title">How Space Weather Affects GPS, RTK, and Survey Accuracy</h3>
				<p class="knowledge-summary">Overview of how solar activity impacts GNSS positioning and RTK performance.</p>
				<span class="knowledge-link">Read article &rarr;</span>
			</a>

			<a href="/gnss-reliability/drone-mission-cancel" class="knowledge-card">
				<div class="knowledge-icon">
					<!-- Drone/propeller icon -->
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M5 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
						<path d="M15 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
						<path d="M5 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
						<path d="M15 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
						<path d="M9 5h6" />
						<path d="M9 19h6" />
						<path d="M12 8v8" />
					</svg>
				</div>
				<h3 class="knowledge-title">When Should Drone Pilots Cancel Missions?</h3>
				<p class="knowledge-summary">Kp thresholds, risk indicators, and go/no-go decision criteria for precision drone operations.</p>
				<span class="knowledge-link">Read article &rarr;</span>
			</a>

			<a href="/gnss-reliability/rtk-float-drops" class="knowledge-card">
				<div class="knowledge-icon">
					<!-- Signal wave icon -->
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M2 12h2" />
						<path d="M6 8v8" />
						<path d="M10 4v16" />
						<path d="M14 6v12" />
						<path d="M18 9v6" />
						<path d="M22 11v2" />
					</svg>
				</div>
				<h3 class="knowledge-title">Why RTK Drones Drop from FIX to FLOAT</h3>
				<p class="knowledge-summary">Common causes of RTK instability and the role of ionospheric disturbances.</p>
				<span class="knowledge-link">Read article &rarr;</span>
			</a>
		</div>
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

	/* Reserve space for card content to prevent CLS during loading→loaded transitions */
	.placeholder-content {
		text-align: center;
		min-height: 140px;
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

	.alerts-content {
		min-height: 100px; /* Reserve space to prevent CLS during loading→loaded */
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
		color: #0d1117; /* Dark text on colored backgrounds for WCAG AA contrast */
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

	/* Knowledge Hub section */
	.knowledge-section {
		margin-top: var(--space-xl);
	}

	.knowledge-section h2 {
		font-size: var(--font-size-lg);
		color: var(--text-primary);
		margin-bottom: var(--space-lg);
	}

	.knowledge-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
	}

	.knowledge-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		transition: border-color 0.2s;
		text-decoration: none;
		color: inherit;
	}

	.knowledge-card:hover {
		border-color: var(--accent-blue);
		text-decoration: none;
	}

	.knowledge-icon {
		color: var(--accent-blue);
	}

	.knowledge-title {
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		font-weight: 600;
		line-height: 1.4;
	}

	.knowledge-summary {
		color: var(--text-secondary);
		font-size: 0.8rem;
		line-height: 1.5;
	}

	.knowledge-link {
		color: var(--accent-blue);
		font-size: 0.8rem;
		margin-top: auto;
	}

	@media (max-width: 768px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}

		.knowledge-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
