<!-- +layout.svelte v0.7.0 — Root layout with navigation and live Kp indicators -->
<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { formatBuildTime } from '$lib/utils/buildInfo';
	import { fetchApi } from '$lib/stores/dashboard';
	import ExtLink from '$lib/components/ExtLink.svelte';
	import type { KpSummary } from '$types/api';
	let { children, data } = $props();

	const buildTime = formatBuildTime();

	// Live Kp data for navbar (client-only, no CLS impact — indicators fade in)
	let kpData = $state<KpSummary | null>(null);

	/** Map Kp value to color class: green 0-4, yellow 5-6, red 7+ */
	function kpColor(kp: number): string {
		if (kp >= 7) return 'kp-red';
		if (kp >= 5) return 'kp-yellow';
		return 'kp-green';
	}

	onMount(() => {
		// Initial fetch
		fetchApi<KpSummary>('/api/v1/kp/summary').then(d => { if (d) kpData = d; });
		// Refresh every 2 minutes
		const interval = setInterval(() => {
			fetchApi<KpSummary>('/api/v1/kp/summary').then(d => { if (d) kpData = d; });
		}, 120_000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>SWFT — Space Weather Forecast & Tracking</title>
</svelte:head>

<div class="app-shell">
	<nav class="top-nav">
		<a href="/" class="nav-brand">SWFT</a>
		<div class="nav-links">
			<a href="/">Home</a>
			<a href="/gnss">GNSS</a>
			<a href="/alerts">Alerts</a>
			<a href="/events">Events</a>
			<a href="/panels">Imagery</a>
			<a href="/gnss-reliability">Knowledge Base</a>
		</div>
		{#if kpData}
			<div class="nav-kp">
				<span class="kp-indicator">
					<span class="kp-label">Current Kp:</span>
					<span class="kp-value {kpColor(kpData.current_kp)}">{kpData.current_kp.toFixed(1)}</span>
				</span>
				{#if kpData.forecast_kp != null}
					<span class="kp-indicator">
						<span class="kp-label">3-Hour Predict:</span>
						<span class="kp-value {kpColor(kpData.forecast_kp)}">{kpData.forecast_kp.toFixed(1)}</span>
					</span>
				{/if}
			</div>
		{/if}
	</nav>

	<div class="app-content">
		{@render children()}
	</div>

	<footer class="app-footer">
		<p>&copy; 2026 SWFT SkyPixels &mdash; Last updated: {buildTime}</p>
		<p class="footer-links"><a href="/gnss-reliability">GNSS Reliability Guide</a></p>
		<p class="attribution">Data sourced from <ExtLink href="https://www.swpc.noaa.gov">NOAA Space Weather Prediction Center</ExtLink> &middot; v0.2.0</p>
	</footer>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.top-nav {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		padding: var(--space-sm) var(--space-xl);
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-default);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-brand {
		font-weight: 700;
		font-size: var(--font-size-lg);
		color: var(--text-primary);
		text-decoration: none;
		white-space: nowrap;
	}

	.nav-links {
		display: flex;
		gap: var(--space-md);
	}

	.nav-links a {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--border-radius-sm);
		transition: color 0.15s, background 0.15s;
	}

	.nav-links a:hover {
		color: var(--text-primary);
		background: var(--bg-card);
		text-decoration: none;
	}

	/* Kp indicators — right-aligned in navbar */
	.nav-kp {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: var(--space-md);
		animation: kp-fade-in 0.3s ease-out;
	}

	@keyframes kp-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.kp-indicator {
		display: flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
	}

	.kp-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.kp-value {
		font-size: var(--font-size-sm);
		font-weight: 700;
		font-family: var(--font-mono);
	}

	.kp-green { color: #4ade80; }
	.kp-yellow { color: #facc15; }
	.kp-red { color: #f87171; }

	.app-content {
		flex: 1;
	}

	.app-footer {
		padding: var(--space-lg) var(--space-xl);
		border-top: 1px solid var(--border-default);
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.app-footer a {
		color: var(--text-secondary);
	}

	.footer-links {
		margin-top: var(--space-xs);
		font-size: 0.75rem;
	}

	.footer-links a {
		color: var(--text-secondary);
	}

	.attribution {
		margin-top: var(--space-xs);
	}

	@media (max-width: 640px) {
		.top-nav {
			flex-wrap: wrap;
			padding: var(--space-sm) var(--space-md);
		}

		.nav-links {
			width: 100%;
			overflow-x: auto;
			gap: var(--space-sm);
		}

		.nav-kp {
			width: 100%;
			justify-content: flex-end;
			order: -1;
		}
	}
</style>
