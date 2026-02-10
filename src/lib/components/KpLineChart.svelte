<!-- KpLineChart.svelte v0.2.0 — SVG line chart for 15-min estimated Kp with non-linear Y axis -->
<script lang="ts">
	import type { KpEstimatedPoint } from '$types/api';

	interface Props {
		data: KpEstimatedPoint[];
	}
	let { data }: Props = $props();

	// Chart dimensions
	const CHART_W = 600;
	const CHART_H = 200;
	const MARGIN = { top: 10, right: 15, bottom: 28, left: 36 };
	const PLOT_W = CHART_W - MARGIN.left - MARGIN.right;
	const PLOT_H = CHART_H - MARGIN.top - MARGIN.bottom;

	// Filter out future timestamps
	let chartData = $derived(
		data.filter(p => new Date(p.ts).getTime() <= Date.now())
	);

	/**
	 * Non-linear Y mapping: bottom 60% → Kp 0-4, middle 30% → Kp 4-7, top 10% → Kp 7-9.
	 * Gives more visual resolution to the common quiet range.
	 */
	function kpToY(kp: number): number {
		const c = Math.max(0, Math.min(9, kp));
		if (c <= 4) return PLOT_H * (1 - (c / 4) * 0.60);
		if (c <= 7) return PLOT_H * (0.40 - ((c - 4) / 3) * 0.30);
		return PLOT_H * (0.10 - ((c - 7) / 2) * 0.10);
	}

	// X-axis: map timestamps linearly across the plot width
	let timeRange = $derived.by(() => {
		if (chartData.length === 0) return { min: 0, max: 1 };
		const times = chartData.map(p => new Date(p.ts).getTime());
		return { min: Math.min(...times), max: Math.max(...times) };
	});

	function tsToX(ts: string): number {
		const t = new Date(ts).getTime();
		const range = timeRange.max - timeRange.min;
		if (range === 0) return PLOT_W / 2;
		return ((t - timeRange.min) / range) * PLOT_W;
	}

	// Build SVG path for the line
	let linePath = $derived.by(() => {
		if (chartData.length === 0) return '';
		return chartData.map((p, i) => {
			const x = tsToX(p.ts);
			const y = kpToY(p.kp);
			return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
		}).join(' ');
	});

	// Color for a Kp value (used for dots)
	function dotColor(kp: number): string {
		if (kp >= 8) return 'var(--severity-extreme)';
		if (kp >= 7) return 'var(--severity-severe)';
		if (kp >= 5) return 'var(--severity-high)';
		if (kp >= 4) return 'var(--severity-moderate)';
		return 'var(--severity-low)';
	}

	// Line stroke color: based on the max Kp in the dataset
	let lineColor = $derived.by(() => {
		if (chartData.length === 0) return 'var(--severity-low)';
		const maxKp = Math.max(...chartData.map(p => p.kp));
		return dotColor(maxKp);
	});

	// Y-axis labels: placed at specific Kp values
	const yLabels = [0, 2, 4, 5, 7, 9];

	// X-axis labels: every 30 minutes
	let xLabels = $derived.by(() => {
		if (chartData.length === 0) return [];
		const labels: Array<{ ts: string; x: number; label: string }> = [];
		const seen = new Set<string>();

		for (const p of chartData) {
			const d = new Date(p.ts);
			const min = d.getMinutes();
			// Show labels on the hour and half-hour
			if (min !== 0 && min !== 30) continue;
			const label = `${d.getHours().toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
			if (seen.has(label)) continue;
			seen.add(label);
			labels.push({ ts: p.ts, x: tsToX(p.ts), label });
		}
		return labels;
	});

	// Zone band boundaries (in plot Y coords)
	const zoneGreenTop = kpToY(4);   // bottom of green zone
	const zoneOrangeTop = kpToY(7);  // bottom of orange zone
	const zoneRedTop = kpToY(9);     // bottom of red zone (top of chart)

	// Threshold line Y positions
	const kp4Y = kpToY(4);
	const kp7Y = kpToY(7);
</script>

<div class="kp-line-chart">
	{#if chartData.length === 0}
		<p class="muted">No estimated Kp data available</p>
	{:else}
		<svg
			viewBox="0 0 {CHART_W} {CHART_H}"
			width="100%"
			preserveAspectRatio="xMidYMid meet"
			role="img"
			aria-label="Estimated Kp line chart, last 3 hours"
		>
			<g transform="translate({MARGIN.left},{MARGIN.top})">
				<!-- Zone background bands -->
				<rect x="0" y={zoneGreenTop} width={PLOT_W} height={PLOT_H - zoneGreenTop}
					fill="var(--accent-green)" opacity="0.06" />
				<rect x="0" y={zoneOrangeTop} width={PLOT_W} height={zoneGreenTop - zoneOrangeTop}
					fill="var(--accent-orange)" opacity="0.06" />
				<rect x="0" y={zoneRedTop} width={PLOT_W} height={zoneOrangeTop - zoneRedTop}
					fill="var(--accent-red)" opacity="0.06" />

				<!-- Dashed grid lines at Kp 4 and Kp 7 -->
				<line x1="0" y1={kp4Y} x2={PLOT_W} y2={kp4Y}
					stroke="var(--accent-yellow)" stroke-width="1" stroke-dasharray="4,4" opacity="0.5" />
				<line x1="0" y1={kp7Y} x2={PLOT_W} y2={kp7Y}
					stroke="var(--accent-red)" stroke-width="1" stroke-dasharray="4,4" opacity="0.5" />

				<!-- Y-axis labels -->
				{#each yLabels as kp}
					<text
						x="-8"
						y={kpToY(kp) + 4}
						text-anchor="end"
						fill="var(--text-secondary)"
						font-size="10"
						font-family="var(--font-mono)"
					>{kp}</text>
				{/each}

				<!-- X-axis labels -->
				{#each xLabels as tick}
					<text
						x={tick.x}
						y={PLOT_H + 18}
						text-anchor="middle"
						fill="var(--text-secondary)"
						font-size="10"
					>{tick.label}</text>
				{/each}

				<!-- Data line -->
				<path
					d={linePath}
					fill="none"
					stroke={lineColor}
					stroke-width="2"
					stroke-linejoin="round"
					stroke-linecap="round"
					opacity="0.9"
				/>

				<!-- Data point dots -->
				{#each chartData as point}
					<circle
						cx={tsToX(point.ts)}
						cy={kpToY(point.kp)}
						r="3"
						fill={dotColor(point.kp)}
						opacity="0.85"
					/>
				{/each}

				<!-- Y-axis baseline -->
				<line x1="0" y1="0" x2="0" y2={PLOT_H}
					stroke="var(--border-default)" stroke-width="1" />
				<!-- X-axis baseline -->
				<line x1="0" y1={PLOT_H} x2={PLOT_W} y2={PLOT_H}
					stroke="var(--border-default)" stroke-width="1" />
			</g>
		</svg>
		<p class="chart-legend">Local time — non-linear scale: Kp 0–4 (60%), 4–7 (30%), 7–9 (10%)</p>
	{/if}
</div>

<style>
	.kp-line-chart {
		padding: var(--space-sm) 0;
		/* Reserve exact aspect ratio to prevent CLS — matches viewBox 600x200 */
		aspect-ratio: 600 / 200;
	}

	svg {
		display: block;
	}

	.chart-legend {
		color: var(--text-secondary);
		font-size: 0.75rem;
		margin-top: 2px;
	}
</style>
