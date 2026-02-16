<!-- /data-sources page v0.3.0 — Live Kp data sources with fallback chain visualization -->
<script lang="ts">
	import SourceKpValue from '$lib/components/SourceKpValue.svelte';
	import KpLineChart from '$lib/components/KpLineChart.svelte';
	import ExtLink from '$lib/components/ExtLink.svelte';
	import type { KpSourcesResult } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let { data } = $props();

	// SSR data via $derived (reactive to prop) — client overlay via $state
	let ssrSources = $derived(data.sourcesResult ?? null);
	let clientSources = $state<KpSourcesResult | null | undefined>(undefined);
	let sourcesResult = $derived(clientSources !== undefined ? clientSources : ssrSources);

	let loading = $derived(sourcesResult === null);

	onMount(() => {
		refreshData();
		const interval = setInterval(refreshData, 180_000); // 3 minutes
		return () => clearInterval(interval);
	});

	async function refreshData() {
		const result = await fetchApi<KpSourcesResult>('/api/v1/kp/sources');
		if (result) clientSources = result;
	}

	// Fallback chain order for the visual
	const chainOrder = ['noaa_estimated', 'noaa_boulder', 'noaa_forecast', 'gfz', 'bom'];
	const chainLabels: Record<string, string> = {
		noaa_estimated: 'NOAA Estimated',
		noaa_boulder: 'Boulder K',
		noaa_forecast: 'NOAA Forecast',
		gfz: 'GFZ Hp30',
		bom: 'BoM Australia',
	};

	/** Status badge classes */
	function statusClass(status: string): string {
		if (status === 'ok') return 'badge-ok';
		if (status === 'error') return 'badge-error';
		return 'badge-stale';
	}
</script>

<svelte:head>
	<title>Kp Data Sources — SWFT</title>
	<meta name="description" content="Live status and readings from all 5 Kp index data sources used by SWFT's fallback chain." />
</svelte:head>

<div class="sources-page">
	<header class="page-header">
		<h1>Kp Data Sources</h1>
		<p class="subtitle">
			SWFT monitors five independent Kp index sources in a prioritized fallback chain.
			If the primary source becomes unavailable, the system automatically switches to the next
			available source to maintain continuous coverage.
		</p>
	</header>

	<!-- Fallback chain visualization -->
	{#if sourcesResult}
		<div class="chain-section">
			<h2 class="chain-title">Fallback Chain</h2>
			<div class="chain-visual">
				{#each chainOrder as id, i}
					{@const source = sourcesResult.sources.find(s => s.id === id)}
					{@const isActive = sourcesResult.activeSourceId === id}
					<div class="chain-node" class:active={isActive} class:error={source?.status === 'error'} class:stale={source?.status === 'stale'}>
						<span class="chain-rank">{i === 0 ? 'Primary' : `Fallback ${i}`}</span>
						<span class="chain-name">{chainLabels[id]}</span>
						{#if isActive}
							<span class="chain-badge active-badge">ACTIVE</span>
						{:else if source?.status === 'error'}
							<span class="chain-badge error-badge">ERROR</span>
						{:else if source?.status === 'stale'}
							<span class="chain-badge stale-badge">STALE</span>
						{:else}
							<span class="chain-badge ok-badge">OK</span>
						{/if}
					</div>
					{#if i < chainOrder.length - 1}
						<div class="chain-arrow">&rarr;</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	<!-- Source cards grid -->
	<div class="sources-grid">
		{#if loading}
			{#each Array(5) as _}
				<div class="source-card skeleton-card">
					<div class="skeleton-line wide"></div>
					<div class="skeleton-line narrow"></div>
					<div class="skeleton-block"></div>
				</div>
			{/each}
		{:else if sourcesResult}
			{#each sourcesResult.sources as source}
				{@const isActive = sourcesResult.activeSourceId === source.id}
				<div class="source-card" class:active-card={isActive}>
					<div class="card-header">
						<div class="card-title-row">
							<h3 class="card-name">{source.name}</h3>
							<span class="status-badge {statusClass(source.status)}">{source.status.toUpperCase()}</span>
						</div>
						<div class="card-meta">
							<span class="agency-badge">{source.agency}</span>
							<span class="country-label">{source.country}</span>
							{#if isActive}
								<span class="active-indicator">ACTIVE</span>
							{/if}
						</div>
					</div>

					<SourceKpValue kp={source.latestKp} time={source.latestTime} status={source.status} />

					{#if source.points.length > 0}
						<div class="card-chart">
							<KpLineChart data={source.points} />
						</div>
					{:else if source.status === 'error'}
						<div class="card-chart-placeholder">
							<p class="error-msg">{source.error ?? 'Source unavailable'}</p>
						</div>
					{:else}
						<div class="card-chart-placeholder">
							<p class="muted">No data points</p>
						</div>
					{/if}

					<p class="card-description">{source.description}</p>

					<dl class="card-details">
						<div class="detail-item">
							<dt>Resolution</dt>
							<dd>{source.resolution}</dd>
						</div>
						<div class="detail-item">
							<dt>Data type</dt>
							<dd>{source.dataType}</dd>
						</div>
						<div class="detail-item">
							<dt>Data points</dt>
							<dd>{source.pointCount}</dd>
						</div>
					</dl>

					<div class="card-footer">
						<ExtLink href={source.url}>View source &rarr;</ExtLink>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Explanation section -->
	<section class="info-section">
		<h2>How the Fallback Chain Works</h2>
		<p>
			SWFT's cron worker attempts to fetch Kp data from each source in priority order every 3 minutes.
			When the primary <strong>NOAA Estimated Kp</strong> feed responds with valid data, it is stored
			in the database and used for all dashboard calculations including the GNSS risk model.
		</p>
		<p>
			If the primary source fails (timeout, HTTP error, or stale data), the cron worker automatically
			tries the next source in the chain. The <strong>NOAA Boulder K-index</strong> is the first fallback.
			The <strong>NOAA Kp Forecast</strong> provides coarser 3-hour data as a third fallback.
			<strong>GFZ Potsdam Hp30</strong> (30-minute resolution) serves as a completely independent source
			from a different continent. Finally, the <strong>Australian BoM K-index</strong> provides
			a last-resort independent regional index from the Southern Hemisphere.
		</p>
		<p>
			When a fallback source is active, a blue banner appears at the top of every page indicating
			the alternate source in use. All 15-minute Kp values stored in the database include a
			<code>source</code> column so the origin of each reading is always traceable.
		</p>
	</section>
</div>

<style>
	.sources-page {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-lg) var(--space-xl);
	}

	.page-header {
		margin-bottom: var(--space-xl);
	}

	.page-header h1 {
		font-size: var(--font-size-2xl);
		font-weight: 700;
		margin-bottom: var(--space-sm);
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
		max-width: 720px;
	}

	/* ── Fallback chain visual ───────────────────────────────────────── */
	.chain-section {
		margin-bottom: var(--space-xl);
	}

	.chain-title {
		font-size: var(--font-size-lg);
		font-weight: 600;
		margin-bottom: var(--space-md);
	}

	.chain-visual {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
		padding: var(--space-md);
		background: var(--bg-secondary);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
	}

	.chain-node {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--border-radius);
		min-width: 120px;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.chain-node.active {
		border-color: #60a5fa;
		box-shadow: 0 0 12px rgba(96, 165, 250, 0.25);
	}

	.chain-node.error {
		border-color: var(--accent-red);
		opacity: 0.7;
	}

	.chain-node.stale {
		border-color: var(--accent-yellow);
		opacity: 0.8;
	}

	.chain-rank {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.chain-name {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-primary);
		text-align: center;
	}

	.chain-badge {
		font-size: 0.6rem;
		font-weight: 800;
		font-family: var(--font-mono);
		padding: 2px 6px;
		border-radius: 3px;
		letter-spacing: 0.04em;
	}

	.active-badge {
		background: #60a5fa;
		color: #1e3a5f;
	}

	.ok-badge {
		background: var(--accent-green);
		color: #052e16;
	}

	.error-badge {
		background: var(--accent-red);
		color: #fff;
	}

	.stale-badge {
		background: var(--accent-yellow);
		color: #422006;
	}

	.chain-arrow {
		font-size: var(--font-size-lg);
		color: var(--text-muted);
		flex-shrink: 0;
	}

	/* ── Source cards grid ────────────────────────────────────────────── */
	.sources-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.source-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		transition: border-color 0.2s;
	}

	.source-card.active-card {
		border-color: #60a5fa;
		box-shadow: 0 0 8px rgba(96, 165, 250, 0.15);
	}

	.card-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.card-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.card-name {
		font-size: var(--font-size-lg);
		font-weight: 700;
		margin: 0;
	}

	.status-badge {
		font-size: 0.65rem;
		font-weight: 800;
		font-family: var(--font-mono);
		padding: 3px 8px;
		border-radius: 3px;
		letter-spacing: 0.04em;
		flex-shrink: 0;
	}

	.badge-ok {
		background: rgba(74, 222, 128, 0.15);
		color: var(--accent-green);
		border: 1px solid rgba(74, 222, 128, 0.3);
	}

	.badge-error {
		background: rgba(248, 113, 113, 0.15);
		color: var(--accent-red);
		border: 1px solid rgba(248, 113, 113, 0.3);
	}

	.badge-stale {
		background: rgba(250, 204, 21, 0.15);
		color: var(--accent-yellow);
		border: 1px solid rgba(250, 204, 21, 0.3);
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.agency-badge {
		font-size: 0.7rem;
		color: var(--text-secondary);
		background: var(--bg-secondary);
		padding: 2px 8px;
		border-radius: 3px;
		border: 1px solid var(--border-default);
	}

	.country-label {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.active-indicator {
		font-size: 0.6rem;
		font-weight: 800;
		font-family: var(--font-mono);
		color: #60a5fa;
		background: rgba(96, 165, 250, 0.1);
		padding: 2px 6px;
		border-radius: 3px;
		letter-spacing: 0.04em;
	}

	.card-chart {
		min-height: 100px;
	}

	.card-chart-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 80px;
		background: var(--bg-secondary);
		border-radius: var(--border-radius-sm);
	}

	.error-msg {
		color: var(--accent-red);
		font-size: var(--font-size-sm);
	}

	.muted {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.card-description {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.card-details {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
		margin: 0;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.detail-item dt {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.detail-item dd {
		font-size: 0.78rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.card-footer {
		margin-top: auto;
		padding-top: var(--space-sm);
		font-size: var(--font-size-sm);
	}

	/* ── Skeleton loading ────────────────────────────────────────────── */
	.skeleton-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.skeleton-line {
		height: 16px;
		background: var(--bg-secondary);
		border-radius: 4px;
		animation: sk-pulse 1.5s ease-in-out infinite;
	}

	.skeleton-line.wide { width: 70%; }
	.skeleton-line.narrow { width: 40%; }

	.skeleton-block {
		height: 120px;
		background: var(--bg-secondary);
		border-radius: var(--border-radius-sm);
		animation: sk-pulse 1.5s ease-in-out infinite;
	}

	@keyframes sk-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* ── Info section ────────────────────────────────────────────────── */
	.info-section {
		background: var(--bg-secondary);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-lg);
	}

	.info-section h2 {
		font-size: var(--font-size-lg);
		font-weight: 700;
		margin-bottom: var(--space-md);
	}

	.info-section p {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	.info-section p:last-child {
		margin-bottom: 0;
	}

	.info-section code {
		background: var(--bg-card);
		padding: 1px 5px;
		border-radius: 3px;
		font-size: 0.85em;
		font-family: var(--font-mono);
	}

	/* ── Responsive ──────────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.sources-page {
			padding: var(--space-md);
		}

		.sources-grid {
			grid-template-columns: 1fr;
		}

		.chain-visual {
			flex-direction: column;
		}

		.chain-arrow {
			transform: rotate(90deg);
		}

		.chain-node {
			width: 100%;
		}
	}
</style>
