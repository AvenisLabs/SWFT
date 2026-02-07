<!-- /gnss page v0.2.0 — GNSS guidance and risk explainer -->
<script lang="ts">
	import GnssRiskMeter from '$lib/components/GnssRiskMeter.svelte';
	import Card from '$lib/components/Card.svelte';
	import type { GnssRiskResult } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let risk = $state<GnssRiskResult | null>(null);
	let loading = $state(true);

	onMount(async () => {
		const data = await fetchApi<GnssRiskResult>('/api/v1/gnss/risk');
		if (data) risk = data;
		loading = false;
	});
</script>

<svelte:head>
	<title>GNSS Risk Assessment — SWFT</title>
</svelte:head>

<main class="dashboard">
	<header>
		<h1>GNSS Risk Assessment</h1>
		<p class="subtitle">Real-time impact assessment for GNSS/surveying operations</p>
	</header>

	<div class="gnss-layout">
		<section class="risk-section">
			<Card title="Current Risk">
				<GnssRiskMeter {risk} {loading} />
			</Card>
		</section>

		<section class="explainer-section">
			<Card title="How This Works">
				<div class="explainer">
					<p>The GNSS risk score combines four space weather factors that affect satellite navigation accuracy:</p>

					<div class="factor-explain">
						<h4>Kp Index (35%)</h4>
						<p>The planetary K-index measures geomagnetic disturbance. Higher Kp values correlate with ionospheric irregularities that degrade GNSS signals.</p>
					</div>

					<div class="factor-explain">
						<h4>Bz Component (25%)</h4>
						<p>The north-south component of the interplanetary magnetic field. When Bz turns strongly southward (negative), it drives geomagnetic activity and ionospheric storms.</p>
					</div>

					<div class="factor-explain">
						<h4>Solar Wind Speed (20%)</h4>
						<p>Fast solar wind streams compress the magnetosphere and can trigger geomagnetic activity. Speeds above 600 km/s are concerning for GNSS operations.</p>
					</div>

					<div class="factor-explain">
						<h4>R-Scale / Radio Blackout (20%)</h4>
						<p>NOAA's Radio Blackout scale (R1–R5) indicates X-ray flare activity that directly affects radio propagation and can cause loss of GNSS lock on the sunlit hemisphere.</p>
					</div>
				</div>
			</Card>

			<Card title="Operator Guidance">
				<div class="guidance">
					<div class="guidance-level" data-level="low">
						<span class="level-badge">Low (0–19)</span>
						<p>Normal operations. Standard monitoring procedures apply.</p>
					</div>
					<div class="guidance-level" data-level="moderate">
						<span class="level-badge">Moderate (20–39)</span>
						<p>Minor degradation possible. Allow extra convergence time for PPP.</p>
					</div>
					<div class="guidance-level" data-level="high">
						<span class="level-badge">High (40–59)</span>
						<p>Noticeable degradation. Monitor solution quality. RTK fix rates may decrease.</p>
					</div>
					<div class="guidance-level" data-level="severe">
						<span class="level-badge">Severe (60–79)</span>
						<p>Significant degradation. Consider postponing precision work. Avoid RTK.</p>
					</div>
					<div class="guidance-level" data-level="extreme">
						<span class="level-badge">Extreme (80–100)</span>
						<p>Operations strongly discouraged. Expect loss of lock and major errors.</p>
					</div>
				</div>
			</Card>
		</section>
	</div>

	<nav class="back-link">
		<a href="/">&larr; Back to dashboard</a>
	</nav>
</main>

<style>
	.gnss-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
		margin-top: var(--space-xl);
	}

	.explainer-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.explainer p {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
		margin-bottom: var(--space-md);
	}

	.factor-explain {
		margin-bottom: var(--space-md);
	}

	.factor-explain h4 {
		font-size: var(--font-size-sm);
		color: var(--accent-blue);
		margin-bottom: var(--space-xs);
	}

	.factor-explain p {
		margin-bottom: 0;
	}

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

	.back-link {
		margin-top: var(--space-xl);
	}

	@media (max-width: 768px) {
		.gnss-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
