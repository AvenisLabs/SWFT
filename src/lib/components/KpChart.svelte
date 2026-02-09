<!-- KpChart.svelte v0.4.0 — Kp bar chart with local HH:MM time labels -->
<script lang="ts">
	import type { KpDataPoint } from '$types/api';

	interface Props {
		data: KpDataPoint[];
	}
	let { data }: Props = $props();

	// Chart renders last N data points as a simple bar chart
	const MAX_BARS = 24;
	const BAR_HEIGHT = 160;
	const BAR_WIDTH = 40;
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

	// Format as HH:MM in local time
	function formatHour(ts: string): string {
		const d = new Date(ts);
		const h = d.getHours().toString().padStart(2, '0');
		const m = d.getMinutes().toString().padStart(2, '0');
		return `${h}:${m}`;
	}

	// Date range string for chart header
	let dateLabel = $derived.by(() => {
		if (chartData.length === 0) return '';
		const first = new Date(chartData[0].ts);
		const last = new Date(chartData[chartData.length - 1].ts);
		const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		const firstStr = fmt.format(first);
		const lastStr = fmt.format(last);
		return firstStr === lastStr ? firstStr : `${firstStr} – ${lastStr}`;
	});
</script>

<div class="kp-chart">
	{#if chartData.length === 0}
		<p class="muted">No chart data available</p>
	{:else}
		<svg
			viewBox="0 0 {chartWidth} {BAR_HEIGHT + 24}"
			width="100%"
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
					font-size="12"
					font-family="var(--font-mono)"
				>{point.kp.toFixed(1)}</text>
				<!-- Hour:minute label below -->
				<text
					x={x + BAR_WIDTH / 2}
					y={BAR_HEIGHT + 16}
					text-anchor="middle"
					fill="var(--text-muted)"
					font-size="11"
				>{formatHour(point.ts)}</text>
			{/each}
		</svg>
		<p class="chart-date">{dateLabel}</p>
		<p class="chart-legend">Local hours — dashed lines at Kp 4 (active) and Kp 5 (storm)</p>
	{/if}
</div>

<style>
	.kp-chart {
		overflow-x: auto;
		padding: var(--space-sm) 0;
		min-height: 200px;
	}

	svg {
		display: block;
	}

	.chart-date {
		color: var(--text-muted);
		font-size: 11px;
		margin-top: var(--space-xs);
	}

	.chart-legend {
		color: var(--text-muted);
		font-size: 0.7rem;
		margin-top: 2px;
	}
</style>
