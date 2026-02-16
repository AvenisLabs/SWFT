<!-- /gnss page v0.6.0 — GNSS risk assessment with historical Kp chart + stale data indicators -->
<script lang="ts">
	import GnssRiskMeter from '$lib/components/GnssRiskMeter.svelte';
	import HelpPopover from '$lib/components/HelpPopover.svelte';
	import Card from '$lib/components/Card.svelte';
	import KpChart from '$lib/components/KpChart.svelte';
	import type { GnssRiskResult, KpSummary } from '$types/api';
	import { fetchApi, isDataStale } from '$lib/stores/dashboard';
	import { formatLocal } from '$lib/utils/timeFormat';
	import { onMount } from 'svelte';

	let risk = $state<GnssRiskResult | null>(null);
	let kpSummary = $state<KpSummary | null>(null);
	let loading = $state(true);
	let methodologyOpen = $state(false);

	// Stale data detection
	let staleTick = $state(0);
	let dataIsStale = $derived(staleTick >= 0 && kpSummary ? isDataStale(kpSummary.current_time) : false);

	onMount(() => {
		// Fetch data asynchronously (no return from async to satisfy onMount types)
		(async () => {
			const [riskData, kpData] = await Promise.all([
				fetchApi<GnssRiskResult>('/api/v1/gnss/risk'),
				fetchApi<KpSummary>('/api/v1/kp/summary'),
			]);
			if (riskData) risk = riskData;
			if (kpData) kpSummary = kpData;
			loading = false;
		})();

		const staleInterval = setInterval(() => { staleTick++; }, 30_000);
		return () => clearInterval(staleInterval);
	});

	const levelColors: Record<string, string> = {
		Low: 'var(--severity-low)',
		Moderate: 'var(--severity-moderate)',
		High: 'var(--severity-high)',
		Severe: 'var(--severity-severe)',
		Extreme: 'var(--severity-extreme)',
	};

	let riskColor = $derived(risk ? levelColors[risk.level] ?? 'var(--text-muted)' : 'var(--text-muted)');

	// Factor help text
	const factorHelp: Record<string, string> = {
		'Kp Index': 'The planetary K-index measures geomagnetic disturbance on a 0-9 scale. Higher values indicate stronger ionospheric irregularities that degrade GNSS signals.',
		'Bz Component': 'The north-south interplanetary magnetic field component. Strongly negative Bz drives geomagnetic storms and ionospheric scintillation.',
		'Solar Wind Speed': 'Fast solar wind compresses Earth\'s magnetosphere. Speeds above 600 km/s are concerning for GNSS accuracy.',
		'R-Scale': 'NOAA Radio Blackout scale (R1-R5) indicates X-ray flare impact on radio propagation and potential loss of GNSS lock.',
	};

	// Guidance levels with active highlighting
	const guidanceLevels = [
		{ level: 'Low', range: '0-19', text: 'Normal operations. Standard monitoring procedures apply.', dataLevel: 'low' },
		{ level: 'Moderate', range: '20-39', text: 'Minor degradation possible. Allow extra convergence time for PPP.', dataLevel: 'moderate' },
		{ level: 'High', range: '40-59', text: 'Noticeable degradation. Monitor solution quality. RTK fix rates may decrease.', dataLevel: 'high' },
		{ level: 'Severe', range: '60-79', text: 'Significant degradation. Consider postponing precision work. Avoid RTK.', dataLevel: 'severe' },
		{ level: 'Extreme', range: '80-100', text: 'Operations strongly discouraged. Expect loss of lock and major errors.', dataLevel: 'extreme' },
	];

	let activeLevel = $derived(risk?.level ?? null);
</script>

<svelte:head>
	<title>GNSS Risk Assessment — SWFT</title>
</svelte:head>

<main class="dashboard">
	<header>
		<h1>GNSS Risk Assessment</h1>
		<p class="subtitle">Real-time impact assessment for GNSS/surveying operations</p>
	</header>

	<!-- Section 1: Current GNSS Risk (full width) -->
	<section class="section-current">
		<Card title="Current GNSS Risk">
			{#snippet headerExtra()}
				<HelpPopover
					id="help-gnss-main"
					text="Composite risk score (0-100) combining Kp index, Bz magnetic field, solar wind speed, and radio blackout scale. Higher scores indicate greater GNSS disruption risk."
				/>
			{/snippet}
			<GnssRiskMeter {risk} {loading} />
			{#if risk}
				<!-- Risk bar below gauge -->
				<div class="risk-bar-container">
					<div class="risk-bar-track">
						<div class="risk-bar-fill" style:width="{risk.score}%" style:background={riskColor}></div>
						<div class="risk-bar-marker" style:left="{risk.score}%" style:background={riskColor}></div>
					</div>
					<div class="risk-bar-labels">
						<span>0</span>
						<span>100</span>
					</div>
				</div>
				{#if risk.updated_at}
					<p class="updated-time">Updated: {formatLocal(risk.updated_at)}</p>
				{/if}
				{#if dataIsStale}
					<div class="stale-indicator" role="alert">Stale data — check <a href="https://www.swpc.noaa.gov" target="_blank" rel="noopener noreferrer">swpc.noaa.gov</a></div>
				{/if}
			{/if}
		</Card>
	</section>

	<!-- Section 2: Risk Drivers (2-col grid) -->
	{#if risk && risk.factors.length > 0}
		<section class="section-drivers">
			<h2 class="section-title">Risk Drivers</h2>
			<div class="drivers-grid">
				{#each risk.factors as factor}
					<div class="driver-card">
						<div class="driver-header">
							<h4 class="driver-name">{factor.name}</h4>
							<HelpPopover
								id="help-factor-{factor.name.toLowerCase().replace(/\s+/g, '-')}"
								text={factorHelp[factor.name] ?? factor.detail}
							/>
						</div>
						<div class="driver-value">{factor.value}</div>
						<div class="driver-detail">{factor.detail}</div>
						<div class="driver-bar-row">
							<span class="driver-weight">{factor.weight}% weight</span>
							<div class="driver-bar">
								<div class="driver-bar-fill" style:width="{factor.contribution}%"></div>
							</div>
							<span class="driver-contribution">{Math.round(factor.contribution)}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Section 3: Operational Impact -->
	{#if risk}
		<section class="section-impact">
			<Card title="Operational Impact">
				<div class="impact-content">
					<p class="impact-summary">{risk.advisory}</p>
					<ul class="impact-list">
						<li><strong>RTK Surveying:</strong> {risk.level === 'Low' || risk.level === 'Moderate' ? 'Normal operation expected. Monitor fix status.' : risk.level === 'High' ? 'Reduced fix rates possible. Allow extra initialization time.' : 'Significant degradation. Consider postponing precision work.'}</li>
						<li><strong>PPP Solutions:</strong> {risk.level === 'Low' ? 'Standard convergence times.' : risk.level === 'Moderate' ? 'Slightly extended convergence. Results still reliable.' : 'Extended convergence or failed solutions possible.'}</li>
						<li><strong>Static GNSS:</strong> {risk.level === 'Low' || risk.level === 'Moderate' ? 'Reliable. Post-processing will resolve minor effects.' : 'Extend observation windows. Check for cycle slips in post-processing.'}</li>
						<li><strong>Drone/UAV Ops:</strong> {risk.level === 'Low' || risk.level === 'Moderate' ? 'Normal operation.' : risk.level === 'High' ? 'Monitor position accuracy. Reduced precision possible.' : 'Flight operations with GNSS reliance discouraged.'}</li>
					</ul>
				</div>
			</Card>
		</section>
	{/if}

	<!-- Section 4: Operator Guidance -->
	<section class="section-guidance">
		<Card title="Operator Guidance">
			<div class="guidance">
				{#each guidanceLevels as g}
					<div
						class="guidance-level"
						data-level={g.dataLevel}
						class:active-level={activeLevel === g.level}
					>
						<span class="level-badge">{g.level} ({g.range})</span>
						<p>{g.text}</p>
						{#if activeLevel === g.level}
							<span class="current-indicator">CURRENT</span>
						{/if}
					</div>
				{/each}
			</div>
		</Card>
	</section>

	<!-- Section 5: Historical Kp Bar Chart -->
	<section class="section-historical">
		<Card title="Historical Kp — 3-Hour Intervals">
			{#if kpSummary?.recent}
				<KpChart data={kpSummary.recent} />
			{:else}
				<p class="muted">Chart data loading&hellip;</p>
			{/if}
		</Card>
	</section>

	<!-- Section 6: Methodology (collapsible) -->
	<section class="section-methodology">
		<button class="methodology-toggle" onclick={() => methodologyOpen = !methodologyOpen} aria-expanded={methodologyOpen}>
			<span>Methodology</span>
			<span class="toggle-arrow" class:open={methodologyOpen}>&#9660;</span>
		</button>
		{#if methodologyOpen}
			<div class="methodology-content">
				<div class="methodology-section">
					<h4>Factor Weights</h4>
					<div class="weight-table">
						<div class="weight-row"><span>Kp Index</span><span>40%</span></div>
						<div class="weight-row"><span>Bz Component</span><span>25%</span></div>
						<div class="weight-row"><span>Solar Wind Speed</span><span>20%</span></div>
						<div class="weight-row"><span>R-Scale (Radio Blackout)</span><span>15%</span></div>
					</div>
				</div>

				<div class="methodology-section">
					<h4>Score Ranges</h4>
					<div class="weight-table">
						<div class="weight-row"><span>0 – 19</span><span class="badge-low">Low</span></div>
						<div class="weight-row"><span>20 – 39</span><span class="badge-moderate">Moderate</span></div>
						<div class="weight-row"><span>40 – 59</span><span class="badge-high">High</span></div>
						<div class="weight-row"><span>60 – 79</span><span class="badge-severe">Severe</span></div>
						<div class="weight-row"><span>80 – 100</span><span class="badge-extreme">Extreme</span></div>
					</div>
				</div>

				<div class="methodology-section">
					<h4>Storm Floor</h4>
					<p>During geomagnetic storms, a Kp-based minimum score ensures the risk level always aligns with the storm severity: G1 (Kp 5+) floors at High, G3 (Kp 7+) at Severe, G4 (Kp 8+) at Extreme.</p>
				</div>

				<div class="methodology-section">
					<h4>Data Sources</h4>
					<p>All data sourced from NOAA Space Weather Prediction Center (SWPC) real-time feeds. Kp values from the Wing Kp model. Solar wind and Bz from the DSCOVR satellite at L1. Radio blackout scale derived from GOES X-ray flux.</p>
				</div>
			</div>
		{/if}
	</section>

	<nav class="back-link">
		<a href="/">&larr; Back to dashboard</a>
	</nav>
</main>

<style>
	/* Section layout */
	.section-current {
		margin-top: var(--space-xl);
	}

	.section-title {
		font-size: var(--font-size-lg);
		margin-bottom: var(--space-md);
		margin-top: var(--space-xl);
	}

	.section-drivers,
	.section-impact,
	.section-guidance,
	.section-historical,
	.section-methodology {
		margin-top: var(--space-xl);
	}

	/* Risk bar (same as homepage) */
	.risk-bar-container {
		margin-top: var(--space-md);
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
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

	.updated-time {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.75rem;
		margin-top: var(--space-sm);
	}

	.stale-indicator {
		text-align: center;
		margin-top: var(--space-sm);
		font-size: 0.75rem;
		font-weight: 600;
		color: #f59e0b;
		animation: stale-pulse 2s ease-in-out infinite;
	}

	.stale-indicator a {
		color: #93c5fd;
	}

	@keyframes stale-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Risk Drivers grid */
	.drivers-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}

	.driver-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-md);
	}

	.driver-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
	}

	.driver-name {
		font-size: var(--font-size-sm);
		color: var(--accent-blue);
	}

	.driver-value {
		font-size: var(--font-size-xl);
		font-weight: 700;
		font-family: var(--font-mono);
		line-height: 1.2;
	}

	.driver-detail {
		color: var(--text-secondary);
		font-size: 0.75rem;
		margin-top: var(--space-xs);
		line-height: 1.4;
	}

	.driver-bar-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-sm);
		font-size: 0.7rem;
	}

	.driver-weight {
		color: var(--text-muted);
		white-space: nowrap;
	}

	.driver-bar {
		flex: 1;
		height: 6px;
		background: var(--bg-secondary);
		border-radius: 3px;
		overflow: hidden;
	}

	.driver-bar-fill {
		height: 100%;
		background: var(--accent-blue);
		border-radius: 3px;
		transition: width 0.5s ease-out;
	}

	.driver-contribution {
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-weight: 600;
		min-width: 20px;
		text-align: right;
	}

	/* Operational Impact */
	.impact-content {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
	}

	.impact-summary {
		margin-bottom: var(--space-md);
	}

	.impact-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.impact-list li {
		padding-left: var(--space-md);
		position: relative;
	}

	.impact-list li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--accent-blue);
	}

	.impact-list strong {
		color: var(--text-primary);
	}

	/* Operator Guidance */
	.guidance {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.guidance-level {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		font-size: var(--font-size-sm);
		padding: var(--space-sm);
		border-radius: var(--border-radius-sm);
		transition: background 0.15s;
	}

	.guidance-level.active-level {
		background: var(--bg-secondary);
		border: 1px solid var(--border-default);
	}

	.level-badge {
		flex-shrink: 0;
		font-size: 0.7rem;
		padding: 2px 6px;
		border-radius: var(--border-radius-sm);
		font-weight: 600;
		white-space: nowrap;
	}

	.guidance-level[data-level="low"] .level-badge { background: var(--severity-low); color: #000; }
	.guidance-level[data-level="moderate"] .level-badge { background: var(--severity-moderate); color: #000; }
	.guidance-level[data-level="high"] .level-badge { background: var(--severity-high); color: #fff; }
	.guidance-level[data-level="severe"] .level-badge { background: var(--severity-severe); color: #fff; }
	.guidance-level[data-level="extreme"] .level-badge { background: var(--severity-extreme); color: #fff; }

	.guidance-level p {
		color: var(--text-secondary);
		margin: 0;
	}

	.current-indicator {
		margin-left: auto;
		font-size: 0.6rem;
		padding: 1px 6px;
		border-radius: var(--border-radius-sm);
		font-weight: 700;
		background: var(--accent-blue);
		color: #fff;
		align-self: center;
		white-space: nowrap;
	}

	/* Methodology collapsible */
	.methodology-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.methodology-toggle:hover {
		border-color: var(--accent-blue);
	}

	.toggle-arrow {
		font-size: 0.7rem;
		transition: transform 0.2s;
	}

	.toggle-arrow.open {
		transform: rotate(180deg);
	}

	.methodology-content {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-top: none;
		border-radius: 0 0 var(--border-radius) var(--border-radius);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.methodology-section h4 {
		font-size: var(--font-size-sm);
		color: var(--accent-blue);
		margin-bottom: var(--space-sm);
	}

	.methodology-section p {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
	}

	.weight-table {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.weight-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		background: var(--bg-secondary);
		border-radius: var(--border-radius-sm);
	}

	.badge-low { color: var(--severity-low); font-weight: 600; }
	.badge-moderate { color: var(--severity-moderate); font-weight: 600; }
	.badge-high { color: var(--severity-high); font-weight: 600; }
	.badge-severe { color: var(--severity-severe); font-weight: 600; }
	.badge-extreme { color: var(--severity-extreme); font-weight: 600; }

	.back-link {
		margin-top: var(--space-xl);
	}

	@media (max-width: 768px) {
		.drivers-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
