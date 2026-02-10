<!-- +layout.svelte v0.6.0 — Root layout with navigation -->
<script>
	import '../app.css';
	import { formatBuildTime } from '$lib/utils/buildInfo';
	import ExtLink from '$lib/components/ExtLink.svelte';
	let { children, data } = $props();

	const buildTime = formatBuildTime();
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
	}
</style>
