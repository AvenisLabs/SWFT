<!-- GnssRiskMeter.svelte v0.1.0 — Visual GNSS risk gauge -->
<script lang="ts">
	import type { GnssRiskResult } from '$types/api';

	interface Props {
		risk: GnssRiskResult | null;
		loading?: boolean;
	}
	let { risk, loading = false }: Props = $props();

	const levelColors: Record<string, string> = {
		Low: 'var(--severity-low)',
		Moderate: 'var(--severity-moderate)',
		High: 'var(--severity-high)',
		Severe: 'var(--severity-severe)',
		Extreme: 'var(--severity-extreme)',
	};

	let color = $derived(risk ? levelColors[risk.level] ?? 'var(--text-muted)' : 'var(--text-muted)');

	// Arc gauge parameters — 180-degree semicircle
	const RADIUS = 70;
	const STROKE = 12;
	const CX = 80;
	const CY = 80;
	const CIRCUMFERENCE = Math.PI * RADIUS; // half-circle

	let dashOffset = $derived(
		risk ? CIRCUMFERENCE - (risk.score / 100) * CIRCUMFERENCE : CIRCUMFERENCE
	);
</script>

<div class="gnss-meter">
	{#if loading}
		<div class="meter-loading">
			<div class="skeleton-gauge"></div>
			<p class="muted">Calculating risk&hellip;</p>
		</div>
	{:else if risk}
		<!-- SVG Gauge -->
		<svg viewBox="0 0 160 100" class="gauge-svg" role="img" aria-label="GNSS risk score {risk.score}">
			<!-- Background arc -->
			<path
				d="M {CX - RADIUS} {CY} A {RADIUS} {RADIUS} 0 0 1 {CX + RADIUS} {CY}"
				fill="none"
				stroke="var(--border-default)"
				stroke-width={STROKE}
				stroke-linecap="round"
			/>
			<!-- Score arc -->
			<path
				d="M {CX - RADIUS} {CY} A {RADIUS} {RADIUS} 0 0 1 {CX + RADIUS} {CY}"
				fill="none"
				stroke={color}
				stroke-width={STROKE}
				stroke-linecap="round"
				stroke-dasharray={CIRCUMFERENCE}
				stroke-dashoffset={dashOffset}
				class="score-arc"
			/>
			<!-- Score text -->
			<text x={CX} y={CY - 10} text-anchor="middle" fill={color} font-size="28" font-weight="700" font-family="var(--font-mono)">
				{risk.score}
			</text>
			<text x={CX} y={CY + 8} text-anchor="middle" fill="var(--text-secondary)" font-size="10">
				{risk.level}
			</text>
		</svg>

		<!-- Factor breakdown -->
		<div class="factors">
			{#each risk.factors as factor}
				<div class="factor-row">
					<span class="factor-name">{factor.name}</span>
					<span class="factor-value">{factor.value}</span>
					<div class="factor-bar">
						<div class="factor-fill" style:width="{factor.contribution}%"></div>
					</div>
				</div>
			{/each}
		</div>

		<p class="advisory">{risk.advisory}</p>
	{:else}
		<p class="muted">Risk data unavailable</p>
	{/if}
</div>

<style>
	.gnss-meter {
		text-align: center;
	}

	.gauge-svg {
		width: 100%;
		max-width: 200px;
		margin: 0 auto;
		display: block;
	}

	.score-arc {
		transition: stroke-dashoffset 0.8s ease-out;
	}

	.factors {
		margin-top: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.factor-row {
		display: grid;
		grid-template-columns: 1fr auto 60px;
		gap: var(--space-sm);
		align-items: center;
		font-size: 0.75rem;
	}

	.factor-name {
		color: var(--text-secondary);
		text-align: left;
	}

	.factor-value {
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.factor-bar {
		height: 6px;
		background: var(--bg-secondary);
		border-radius: 3px;
		overflow: hidden;
	}

	.factor-fill {
		height: 100%;
		background: var(--accent-blue);
		border-radius: 3px;
		transition: width 0.5s ease-out;
	}

	.advisory {
		margin-top: var(--space-md);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		text-align: left;
		line-height: 1.5;
	}

	.meter-loading {
		padding: var(--space-lg);
	}

	.skeleton-gauge {
		width: 160px;
		height: 80px;
		background: var(--bg-secondary);
		border-radius: 80px 80px 0 0;
		margin: 0 auto;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
