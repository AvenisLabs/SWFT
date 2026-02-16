<!-- +layout.svelte v0.12.0 — Root layout with navigation, live Kp, storm + outage banners, source tracking -->
<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { formatBuildTime } from '$lib/utils/buildInfo';
	import { fetchApi, STALE_THRESHOLD_MS, isDataStale } from '$lib/stores/dashboard';
	import ExtLink from '$lib/components/ExtLink.svelte';
	import type { KpSummary, AlertItem } from '$types/api';
	let { children, data } = $props();

	const buildTime = formatBuildTime();

	// Live Kp data for navbar (client-only, no CLS impact — indicators fade in)
	let kpData = $state<KpSummary | null>(null);
	let alertData = $state<AlertItem[]>([]);

	// ── Fallback source labels ────────────────────────────────────────
	const sourceLabels: Record<string, string> = {
		noaa_boulder: 'NOAA Boulder K-index (single station)',
		noaa_forecast: 'NOAA Kp Forecast (3-hour)',
		gfz: 'GFZ Potsdam Hp30 (independent)',
		bom: 'Australian BoM K-index (independent)',
	};
	let activeSource = $derived(kpData?.data_source ?? null);
	let activeSourceLabel = $derived(activeSource ? sourceLabels[activeSource] ?? activeSource : null);

	// ── Stale data detection ──────────────────────────────────────────
	// Data is stale if latest Kp timestamp is >1 hour old (4 missed 15-min updates)
	// Recalculate staleness every 30 seconds so the banner appears promptly
	let staleTick = $state(0);
	// staleTick is read to force re-evaluation of $derived when the timer fires
	let dataStale = $derived(staleTick >= 0 && kpData ? isDataStale(kpData.current_time) : false);
	let staleAgeMinutes = $derived.by(() => {
		void staleTick; // dependency to re-evaluate on tick
		if (!kpData?.current_time) return 0;
		return Math.round((Date.now() - new Date(kpData.current_time).getTime()) / 60_000);
	});

	/** Map Kp value to color class: green 0-3, yellow 4, orange 5-6, red 7+ */
	function kpColor(kp: number): string {
		if (kp >= 7) return 'kp-red';
		if (kp >= 5) return 'kp-orange';
		if (kp >= 4) return 'kp-yellow';
		return 'kp-green';
	}

	// ── Storm banner state ─────────────────────────────────────────────
	// Banner tiers: g2 (Kp6+), g3 (Kp7+), g4 (Kp8+)
	type BannerTier = 'g2' | 'g3' | 'g4';
	let bannerActive = $state(false);
	let bannerTier = $state<BannerTier | null>(null);
	// Timestamp when Kp first dropped below 4.5 (for 30-min hysteresis)
	let dismissStartMs = $state<number | null>(null);
	// 30 minutes = 2 x 15-minute data cycles
	const DISMISS_DELAY_MS = 30 * 60 * 1000;

	/** Extract the highest active G-scale value from alerts */
	function maxGScale(alerts: AlertItem[]): number {
		let max = 0;
		for (const a of alerts) {
			if (a.scale_type === 'G' && a.scale_value != null && a.scale_value > max) {
				max = a.scale_value;
			}
		}
		return max;
	}

	/** Determine storm tier from Kp and G-scale — returns null if below threshold */
	function stormTier(kp: number, gScale: number): BannerTier | null {
		// G-scale maps to Kp: G2=6, G3=7, G4=8, G5=9
		const effectiveKp = Math.max(kp, gScale >= 2 ? gScale + 4 : 0);
		if (effectiveKp >= 8) return 'g4';
		if (effectiveKp >= 7) return 'g3';
		if (effectiveKp >= 6) return 'g2';
		return null;
	}

	/** Update banner state — called after each data refresh */
	function updateBanner() {
		const currentKp = kpData?.current_kp ?? 0;
		const gScale = maxGScale(alertData);
		const tier = stormTier(currentKp, gScale);

		if (tier) {
			// Storm conditions: activate/upgrade banner
			bannerActive = true;
			bannerTier = tier;
			dismissStartMs = null; // reset dismiss timer
		} else if (bannerActive) {
			// No storm tier, but banner still showing — check persistence
			if (currentKp >= 4.5) {
				// Kp still elevated: keep banner, reset dismiss timer
				dismissStartMs = null;
			} else {
				// Kp dropped below threshold: start or continue dismiss timer
				if (!dismissStartMs) {
					dismissStartMs = Date.now();
				} else if (Date.now() - dismissStartMs >= DISMISS_DELAY_MS) {
					// 30 minutes of sub-4.5 readings: dismiss banner
					bannerActive = false;
					bannerTier = null;
					dismissStartMs = null;
				}
			}
		}
	}

	// Banner display text and G-scale label
	const bannerConfig: Record<BannerTier, { gLabel: string; title: string; message: string }> = {
		g2: {
			gLabel: 'G2',
			title: 'Geomagnetic Storm Warning',
			message: 'GNSS degradation expected. RTK fix rates may drop. Monitor solution quality and allow extra convergence time.',
		},
		g3: {
			gLabel: 'G3',
			title: 'Strong Geomagnetic Storm',
			message: 'Significant GNSS disruption. Postpone precision survey and drone work. Expect frequent loss-of-lock events.',
		},
		g4: {
			gLabel: 'G4+',
			title: 'Severe Geomagnetic Storm',
			message: 'Extreme GNSS degradation. All precision GNSS operations should be suspended. Widespread positioning errors and satellite lock loss.',
		},
	};

	let config = $derived(bannerTier ? bannerConfig[bannerTier] : null);

	// Allow user to dismiss the banner for this session
	let userDismissed = $state(false);
	let showBanner = $derived(bannerActive && !userDismissed);

	// ── Data fetching ──────────────────────────────────────────────────
	async function refreshAll() {
		const [kp, alerts] = await Promise.all([
			fetchApi<KpSummary>('/api/v1/kp/summary'),
			fetchApi<AlertItem[]>('/api/v1/alerts/active'),
		]);
		if (kp) kpData = kp;
		if (alerts) alertData = alerts;
		updateBanner();
	}

	onMount(() => {
		refreshAll();
		const dataInterval = setInterval(refreshAll, 120_000);
		// Tick every 30s to re-evaluate staleness promptly
		const staleInterval = setInterval(() => { staleTick++; }, 30_000);
		return () => { clearInterval(dataInterval); clearInterval(staleInterval); };
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
			<a href="/data-sources">Sources</a>
		</div>
		{#if kpData}
			<div class="nav-kp">
				<span class="kp-indicator">
					<span class="kp-label">Current Kp:</span>
					<span class="kp-value {kpColor(kpData.current_kp)}">{kpData.current_kp.toFixed(1)}</span>
				</span>
				{#if kpData.forecast_kp != null}
					<span class="kp-indicator">
						<span class="kp-label">3-Hour Forecast:</span>
						<span class="kp-value {kpColor(kpData.forecast_kp)}">{kpData.forecast_kp.toFixed(1)}</span>
					</span>
				{/if}
			</div>
		{/if}
	</nav>

	<!-- Storm alert banner — shows site-wide during G2+ geomagnetic storms -->
	{#if showBanner && config && bannerTier}
		<div class="storm-banner" data-tier={bannerTier} role="alert">
			<div class="storm-banner-inner">
				<span class="storm-badge">{config.gLabel}</span>
				<div class="storm-text">
					<strong class="storm-title">{config.title}</strong>
					<span class="storm-message">{config.message}</span>
				</div>
				<a href="/gnss" class="storm-link">View GNSS risk &rarr;</a>
				<button class="storm-dismiss" onclick={() => userDismissed = true} aria-label="Dismiss storm alert">&times;</button>
			</div>
		</div>
	{/if}

	<!-- NOAA data outage / fallback source banner -->
	{#if dataStale}
		<div class="outage-banner" role="alert">
			<div class="outage-banner-inner">
				<span class="outage-badge">STALE</span>
				<div class="outage-text">
					<strong class="outage-title">NOAA Data Outage — Data is {staleAgeMinutes} minutes old</strong>
					<span class="outage-message">Live data has not updated for over 1 hour ({Math.floor(staleAgeMinutes / 15)} missed updates). NOAA SWPC may be experiencing an outage. All displayed values may be outdated.</span>
				</div>
				<a href="https://www.swpc.noaa.gov" target="_blank" rel="noopener noreferrer" class="outage-link">Check SWPC status &rarr;</a>
			</div>
		</div>
	{:else if activeSourceLabel}
		<div class="fallback-banner" role="status">
			<div class="outage-banner-inner">
				<span class="fallback-badge">FALLBACK</span>
				<div class="outage-text">
					<strong class="outage-title">Using alternate data source: {activeSourceLabel}</strong>
					<span class="outage-message">NOAA's primary estimated Kp feed is unavailable. Data is being sourced from a backup feed. Values may differ slightly from the primary source.</span>
				</div>
				<a href="/data-sources" class="outage-link">View data sources &rarr;</a>
			</div>
		</div>
	{/if}

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
	.kp-orange { color: #fb923c; }
	.kp-red { color: #f87171; }

	/* ── Storm alert banner ───────────────────────────────────────────── */
	.storm-banner {
		padding: var(--space-sm) var(--space-xl);
		animation: banner-slide-in 0.3s ease-out;
	}

	@keyframes banner-slide-in {
		from { transform: translateY(-100%); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.storm-banner-inner {
		max-width: var(--max-width);
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.storm-badge {
		flex-shrink: 0;
		font-size: 0.75rem;
		font-weight: 800;
		font-family: var(--font-mono);
		padding: 4px 10px;
		border-radius: var(--border-radius-sm);
		letter-spacing: 0.05em;
	}

	.storm-text {
		flex: 1;
		min-width: 0;
	}

	.storm-title {
		display: block;
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.storm-message {
		display: block;
		font-size: 0.78rem;
		opacity: 0.9;
		line-height: 1.4;
	}

	.storm-link {
		flex-shrink: 0;
		font-size: 0.78rem;
		font-weight: 600;
		white-space: nowrap;
		text-decoration: none;
		padding: 4px 10px;
		border-radius: var(--border-radius-sm);
	}

	.storm-link:hover {
		text-decoration: underline;
	}

	.storm-dismiss {
		flex-shrink: 0;
		background: none;
		border: none;
		font-size: 1.3rem;
		cursor: pointer;
		line-height: 1;
		padding: 2px 6px;
		border-radius: var(--border-radius-sm);
		transition: opacity 0.15s;
	}

	.storm-dismiss:hover {
		opacity: 0.7;
	}

	/* ── G2 tier — amber/orange warning ───────────────────────────────── */
	.storm-banner[data-tier="g2"] {
		background: linear-gradient(90deg, #78350f, #92400e);
		border-bottom: 2px solid #f59e0b;
		color: #fef3c7;
	}
	.storm-banner[data-tier="g2"] .storm-badge {
		background: #f59e0b;
		color: #451a03;
	}
	.storm-banner[data-tier="g2"] .storm-link {
		color: #fbbf24;
	}
	.storm-banner[data-tier="g2"] .storm-dismiss {
		color: #fcd34d;
	}

	/* ── G3 tier — red with pulsing border ────────────────────────────── */
	.storm-banner[data-tier="g3"] {
		background: linear-gradient(90deg, #7f1d1d, #991b1b);
		border-bottom: 2px solid #ef4444;
		color: #fecaca;
		animation: banner-slide-in 0.3s ease-out, g3-pulse-border 2s ease-in-out infinite;
	}
	.storm-banner[data-tier="g3"] .storm-badge {
		background: #ef4444;
		color: #fff;
	}
	.storm-banner[data-tier="g3"] .storm-link {
		color: #fca5a5;
	}
	.storm-banner[data-tier="g3"] .storm-dismiss {
		color: #fca5a5;
	}

	@keyframes g3-pulse-border {
		0%, 100% { border-bottom-color: #ef4444; }
		50% { border-bottom-color: #fca5a5; }
	}

	/* ── G4+ tier — deep red with pulsing glow + flashing border ──────── */
	.storm-banner[data-tier="g4"] {
		background: linear-gradient(90deg, #450a0a, #7f1d1d);
		border-bottom: 3px solid #ff4466;
		color: #ffe4e6;
		animation: banner-slide-in 0.3s ease-out, g4-glow 1.5s ease-in-out infinite;
	}
	.storm-banner[data-tier="g4"] .storm-badge {
		background: #ff4466;
		color: #fff;
		animation: g4-badge-flash 1s ease-in-out infinite;
	}
	.storm-banner[data-tier="g4"] .storm-link {
		color: #fda4af;
	}
	.storm-banner[data-tier="g4"] .storm-dismiss {
		color: #fda4af;
	}

	@keyframes g4-glow {
		0%, 100% {
			box-shadow: inset 0 0 20px rgba(255, 68, 102, 0.15);
			border-bottom-color: #ff4466;
		}
		50% {
			box-shadow: inset 0 0 30px rgba(255, 68, 102, 0.3);
			border-bottom-color: #fff;
		}
	}

	@keyframes g4-badge-flash {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	/* ── NOAA data outage banner ─────────────────────────────────────── */
	.outage-banner {
		padding: var(--space-sm) var(--space-xl);
		background: linear-gradient(90deg, #1e3a5f, #1e40af);
		border-bottom: 2px solid #60a5fa;
		color: #dbeafe;
		animation: banner-slide-in 0.3s ease-out;
	}

	.outage-banner-inner {
		max-width: var(--max-width);
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.outage-badge {
		flex-shrink: 0;
		font-size: 0.75rem;
		font-weight: 800;
		font-family: var(--font-mono);
		padding: 4px 10px;
		border-radius: var(--border-radius-sm);
		letter-spacing: 0.05em;
		background: #f59e0b;
		color: #451a03;
		animation: outage-badge-pulse 2s ease-in-out infinite;
	}

	@keyframes outage-badge-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.outage-text {
		flex: 1;
		min-width: 0;
	}

	.outage-title {
		display: block;
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.outage-message {
		display: block;
		font-size: 0.78rem;
		opacity: 0.9;
		line-height: 1.4;
	}

	.outage-link {
		flex-shrink: 0;
		font-size: 0.78rem;
		font-weight: 600;
		white-space: nowrap;
		text-decoration: none;
		padding: 4px 10px;
		border-radius: var(--border-radius-sm);
		color: #93c5fd;
	}

	.outage-link:hover {
		text-decoration: underline;
	}

	/* ── Fallback source banner — blue when using non-primary source ── */
	.fallback-banner {
		padding: var(--space-sm) var(--space-xl);
		background: linear-gradient(90deg, #1e3a5f, #1e40af);
		border-bottom: 2px solid #60a5fa;
		color: #dbeafe;
		animation: banner-slide-in 0.3s ease-out;
	}

	.fallback-badge {
		flex-shrink: 0;
		font-size: 0.75rem;
		font-weight: 800;
		font-family: var(--font-mono);
		padding: 4px 10px;
		border-radius: var(--border-radius-sm);
		letter-spacing: 0.05em;
		background: #60a5fa;
		color: #1e3a5f;
	}

	/* ── App content & footer ─────────────────────────────────────────── */
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

		.storm-banner {
			padding: var(--space-sm) var(--space-md);
		}

		.storm-banner-inner {
			flex-wrap: wrap;
			gap: var(--space-sm);
		}

		.storm-link {
			margin-left: auto;
		}

		.storm-message {
			display: none; /* Hide verbose message on mobile, title is enough */
		}

		.outage-banner {
			padding: var(--space-sm) var(--space-md);
		}

		.outage-banner-inner {
			flex-wrap: wrap;
			gap: var(--space-sm);
		}

		.outage-message {
			display: none; /* Title has the key info on mobile */
		}

		.outage-link {
			margin-left: auto;
		}

		.fallback-banner {
			padding: var(--space-sm) var(--space-md);
		}
	}
</style>
