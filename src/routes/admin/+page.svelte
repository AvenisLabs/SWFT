<!-- +page.svelte v0.2.0 — Admin dashboard: link health summary + manual check trigger -->
<script lang="ts">
	import type { LinkCheckRun, SiteLink, ApiResponse } from '$types/api';

	// Typed JSON response helper
	interface CheckTriggerResponse { data?: { healthyCount?: number; brokenCount?: number }; error?: string }

	let links = $state<SiteLink[]>([]);
	let latestRun = $state<LinkCheckRun | null>(null);
	let loading = $state(true);
	let checking = $state(false);
	let checkResult = $state<string | null>(null);

	// Derived health counts from discovered links (site_links rows = url+page pairs)
	const totalPlacements = $derived(links.length);
	const uniqueUrls = $derived(new Set(links.map(l => l.url)).size);
	const healthyPlacements = $derived(links.filter(l => l.last_status !== null && l.last_status >= 200 && l.last_status < 400).length);
	const brokenPlacements = $derived(links.filter(l => l.last_status !== null && (l.last_status >= 400 || l.last_status === 0)).length);
	const uncheckedPlacements = $derived(links.filter(l => l.last_status === null).length);
	const overriddenLinks = $derived(links.filter(l => l.action !== 'default' || l.override_url || l.override_text).length);

	async function loadData() {
		loading = true;
		try {
			const [linksRes, checksRes] = await Promise.all([
				fetch('/api/v1/admin/links'),
				fetch('/api/v1/admin/link-checks'),
			]);
			if (linksRes.ok) {
				const linksBody = (await linksRes.json()) as ApiResponse<SiteLink[]>;
				links = linksBody.data ?? [];
			}
			if (checksRes.ok) {
				const checksBody = (await checksRes.json()) as ApiResponse<LinkCheckRun[]>;
				const runs = checksBody.data ?? [];
				latestRun = runs.length > 0 ? runs[0] : null;
			}
		} catch {
			// Silently handle — data just won't show
		}
		loading = false;
	}

	async function triggerCheck() {
		checking = true;
		checkResult = null;
		try {
			const res = await fetch('/api/v1/admin/link-check', { method: 'POST' });
			const body = (await res.json()) as CheckTriggerResponse;
			if (res.ok) {
				checkResult = `Check completed: ${body.data?.healthyCount ?? 0} healthy, ${body.data?.brokenCount ?? 0} broken (unique URLs)`;
				await loadData(); // Refresh data
			} else {
				checkResult = `Error: ${body.error ?? 'Unknown error'}`;
			}
		} catch (err) {
			checkResult = `Network error: ${err instanceof Error ? err.message : 'Unknown'}`;
		}
		checking = false;
	}

	$effect(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>Admin Dashboard — SWFT</title>
</svelte:head>

<div class="admin-dashboard">
	{#if loading}
		<p class="loading">Loading dashboard data...</p>
	{:else}
		<!-- Health summary cards -->
		<div class="summary-grid">
			<div class="summary-card">
				<span class="summary-value">{uniqueUrls}</span>
				<span class="summary-label">Unique URLs</span>
			</div>
			<div class="summary-card">
				<span class="summary-value">{totalPlacements}</span>
				<span class="summary-label">Link Placements</span>
			</div>
			<div class="summary-card healthy">
				<span class="summary-value">{healthyPlacements}</span>
				<span class="summary-label">Healthy</span>
			</div>
			<div class="summary-card broken">
				<span class="summary-value">{brokenPlacements}</span>
				<span class="summary-label">Broken</span>
			</div>
			<div class="summary-card">
				<span class="summary-value">{uncheckedPlacements}</span>
				<span class="summary-label">Unchecked</span>
			</div>
			<div class="summary-card">
				<span class="summary-value">{overriddenLinks}</span>
				<span class="summary-label">Overridden</span>
			</div>
		</div>

		<!-- Last check run info -->
		<div class="card last-run">
			<h2>Last Check Run</h2>
			{#if latestRun}
				<div class="run-details">
					<p><strong>Date:</strong> {new Date(latestRun.started_at + 'Z').toLocaleString()}</p>
					<p><strong>Trigger:</strong> {latestRun.trigger_type}</p>
					<p><strong>Status:</strong> {latestRun.status}</p>
					<p><strong>Results:</strong> {latestRun.healthy_count} healthy, {latestRun.broken_count} broken of {latestRun.total_links} unique URLs checked</p>
				</div>
			{:else}
				<p class="muted">No check runs recorded yet.</p>
			{/if}
		</div>

		<!-- Manual check trigger -->
		<div class="card action-card">
			<h2>Manual Link Check</h2>
			<p class="muted">Crawl all site pages, discover external links, and check health status.</p>
			<button class="btn-primary" onclick={triggerCheck} disabled={checking}>
				{checking ? 'Checking...' : 'Run Link Check Now'}
			</button>
			{#if checkResult}
				<p class="check-result">{checkResult}</p>
			{/if}
		</div>

		<!-- Quick links -->
		<div class="card quick-links">
			<h2>Quick Links</h2>
			<div class="link-grid">
				<a href="/admin/links">Manage Links</a>
				<a href="/admin/link-checks">Check History</a>
				<a href="/" target="_blank">View Site</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.loading {
		color: var(--text-muted);
		padding: var(--space-xl);
		text-align: center;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.summary-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-lg);
		text-align: center;
	}

	.summary-card.healthy { border-color: var(--accent-green); }
	.summary-card.broken { border-color: var(--accent-red); }

	.summary-value {
		display: block;
		font-size: var(--font-size-2xl);
		font-weight: 700;
		color: var(--text-primary);
	}

	.summary-card.healthy .summary-value { color: var(--accent-green); }
	.summary-card.broken .summary-value { color: var(--accent-red); }

	.summary-label {
		display: block;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin-top: var(--space-xs);
	}

	.last-run, .action-card, .quick-links {
		margin-bottom: var(--space-lg);
	}

	.last-run h2, .action-card h2, .quick-links h2 {
		font-size: var(--font-size-lg);
		margin-bottom: var(--space-md);
	}

	.run-details p {
		color: var(--text-secondary);
		margin-bottom: var(--space-xs);
	}

	.btn-primary {
		background: var(--accent-blue);
		color: #fff;
		border: none;
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		cursor: pointer;
		margin-top: var(--space-sm);
		transition: opacity 0.15s;
	}

	.btn-primary:hover:not(:disabled) { opacity: 0.9; }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.check-result {
		margin-top: var(--space-md);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.link-grid {
		display: flex;
		gap: var(--space-lg);
	}

	.link-grid a {
		color: var(--accent-blue);
		font-size: var(--font-size-sm);
	}
</style>
