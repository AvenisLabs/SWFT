<!-- KpChart.svelte v0.1.0 — Kp bar chart using inline SVG -->
<script lang="ts">
	import type { KpDataPoint } from '$types/api';

	interface Props {
		data: KpDataPoint[];
	}
	let { data }: Props = $props();

	// Chart renders last N data points as a simple bar chart
	const MAX_BARS = 16;
	const BAR_HEIGHT = 120;
	const BAR_WIDTH = 28;
	const GAP = 4;

	// Reverse so oldest is on the left
	let chartData = $derived(data.slice(0, MAX_BARS).reverse());
	let chartWidth = $derived(chartData.length * (BAR_WIDTH + GAP));

	// Color based on Kp value
	function barColor(kp: number): string {
		if (kp >= 8) return 'var(--severity-extreme)';
		if (kp >= 7) return 'var(--severity-severe)';
		if (kp >= 5) return 'var(--severity-high)';
		if (kp >= 4) return 'var(--severity-moderate)';
		return 'var(--severity-low)';
	}

	function barHeight(kp: number): number {
		return (kp / 9) * BAR_HEIGHT;
	}

	function formatHour(ts: string): string {
		const d = new Date(ts);
		return `${d.getUTCHours().toString().padStart(2, '0')}`;
	}
</script>

<div class="kp-chart">
	{#if chartData.length === 0}
		<p class="muted">No chart data available</p>
	{:else}
		<svg
			viewBox="0 0 {chartWidth} {BAR_HEIGHT + 20}"
			width="100%"
			height={BAR_HEIGHT + 20}
			role="img"
			aria-label="Kp index bar chart"
		>
			<!-- Threshold lines -->
			<line x1="0" y1={BAR_HEIGHT - barHeight(4)} x2={chartWidth} y2={BAR_HEIGHT - barHeight(4)}
				stroke="var(--accent-yellow)" stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />
			<line x1="0" y1={BAR_HEIGHT - barHeight(5)} x2={chartWidth} y2={BAR_HEIGHT - barHeight(5)}
				stroke="var(--accent-red)" stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />

			{#each chartData as point, i}
				{@const h = barHeight(point.kp)}
				{@const x = i * (BAR_WIDTH + GAP)}
				<rect
					{x}
					y={BAR_HEIGHT - h}
					width={BAR_WIDTH}
					height={h}
					fill={barColor(point.kp)}
					rx="3"
				/>
				<!-- Kp value label on bar -->
				<text
					x={x + BAR_WIDTH / 2}
					y={BAR_HEIGHT - h - 4}
					text-anchor="middle"
					fill="var(--text-secondary)"
					font-size="10"
					font-family="var(--font-mono)"
				>{point.kp.toFixed(1)}</text>
				<!-- Hour label below -->
				<text
					x={x + BAR_WIDTH / 2}
					y={BAR_HEIGHT + 14}
					text-anchor="middle"
					fill="var(--text-muted)"
					font-size="9"
				>{formatHour(point.ts)}</text>
			{/each}
		</svg>
		<p class="chart-legend">UTC hours — dashed lines at Kp 4 (active) and Kp 5 (storm)</p>
	{/if}
</div>

<style>
	.kp-chart {
		overflow-x: auto;
		padding: var(--space-sm) 0;
	}

	svg {
		display: block;
	}

	.chart-legend {
		color: var(--text-muted);
		font-size: 0.7rem;
		margin-top: var(--space-xs);
	}
</style>
