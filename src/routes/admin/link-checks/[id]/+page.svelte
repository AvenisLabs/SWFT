<!-- +page.svelte v0.1.0 — Admin check run detail: summary + per-URL results -->
<script lang="ts">
	import { page } from '$app/stores';
	import type { LinkCheckRun, LinkCheckResult, ApiResponse } from '$types/api';

	let run = $state<LinkCheckRun | null>(null);
	let results = $state<LinkCheckResult[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const runId = $derived($page.params.id);

	async function loadRun(id: string) {
		loading = true;
		error = null;
		try {
			const res = await fetch(`/api/v1/admin/link-checks/${id}`);
			if (res.ok) {
				const body = (await res.json()) as ApiResponse<{ run: LinkCheckRun; results: LinkCheckResult[] }>;
				run = body.data?.run ?? null;
				results = body.data?.results ?? [];
			} else {
				error = 'Failed to load check run';
			}
		} catch {
			error = 'Network error loading check run';
		}
		loading = false;
	}

	// Parse JSON pages array safely
	function parsePages(pagesJson: string): string[] {
		try {
			return JSON.parse(pagesJson);
		} catch {
			return [pagesJson];
		}
	}

	$effect(() => {
		if (runId) loadRun(runId);
	});
</script>

<svelte:head>
	<title>Check Run #{runId} — SWFT Admin</title>
</svelte:head>

<div class="run-detail">
	{#if loading}
		<p class="loading">Loading check run...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if run}
		<!-- Run summary -->
		<div class="card run-summary">
			<h2>Check Run #{run.id}</h2>
			<div class="run-meta">
				<p><strong>Started:</strong> {new Date(run.started_at + 'Z').toLocaleString()}</p>
				{#if run.completed_at}
					<p><strong>Completed:</strong> {new Date(run.completed_at + 'Z').toLocaleString()}</p>
				{/if}
				<p><strong>Trigger:</strong> {run.trigger_type}</p>
				<p><strong>Status:</strong> <span class="status-{run.status}">{run.status}</span></p>
				<p><strong>Results:</strong> {run.healthy_count} healthy, {run.broken_count} broken of {run.total_links} total</p>
			</div>
		</div>

		<!-- Results table -->
		{#if results.length > 0}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>URL</th>
							<th>Status</th>
							<th>Method</th>
							<th>Response</th>
							<th>Pages</th>
						</tr>
					</thead>
					<tbody>
						{#each results as result (result.id)}
							<tr class={result.ok ? '' : 'broken-row'}>
								<td class="url-cell" title={result.url}>{result.url}</td>
								<td>
									<span class="status-badge" class:status-ok={result.ok} class:status-broken={!result.ok}>
										{result.status_code ?? '—'} {result.status_text ?? ''}
									</span>
								</td>
								<td>{result.method ?? '—'}</td>
								<td>{result.response_time_ms != null ? `${result.response_time_ms}ms` : '—'}</td>
								<td class="pages-cell">
									{#each parsePages(result.found_on_pages) as pagePath}
										<span class="page-tag">{pagePath}</span>
									{/each}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="muted">No individual results for this run.</p>
		{/if}

		<nav class="back-nav">
			<a href="/admin/link-checks">&larr; Back to check history</a>
		</nav>
	{:else}
		<p class="error">Check run not found.</p>
	{/if}
</div>

<style>
	.run-summary {
		margin-bottom: var(--space-xl);
	}

	.run-summary h2 {
		font-size: var(--font-size-xl);
		margin-bottom: var(--space-md);
	}

	.run-meta p {
		color: var(--text-secondary);
		margin-bottom: var(--space-xs);
	}

	.loading, .error {
		padding: var(--space-xl);
		text-align: center;
	}

	.error { color: var(--accent-red); }
	.loading { color: var(--text-muted); }

	.table-wrapper {
		overflow-x: auto;
		margin-bottom: var(--space-xl);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	thead {
		border-bottom: 2px solid var(--border-default);
	}

	th {
		text-align: left;
		padding: var(--space-sm) var(--space-md);
		color: var(--text-primary);
		font-weight: 600;
		white-space: nowrap;
	}

	td {
		padding: var(--space-sm) var(--space-md);
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-default);
		vertical-align: top;
	}

	.url-cell {
		max-width: 350px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}

	.broken-row {
		background: rgba(248, 81, 73, 0.05);
	}

	.broken-row td {
		color: var(--text-primary);
	}

	.status-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--border-radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-ok { color: var(--accent-green); background: rgba(63, 185, 80, 0.15); }
	.status-broken { color: var(--accent-red); background: rgba(248, 81, 73, 0.15); }
	.status-completed { color: var(--accent-green); }
	.status-running { color: var(--accent-blue); }
	.status-error { color: var(--accent-red); }

	.pages-cell {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.page-tag {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		background: var(--bg-secondary);
		padding: 1px 6px;
		border-radius: 3px;
		color: var(--text-muted);
	}

	.back-nav {
		padding-top: var(--space-md);
	}

	.back-nav a {
		color: var(--accent-blue);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 768px) {
		th, td {
			padding: var(--space-xs) var(--space-sm);
			font-size: 0.8rem;
		}
	}
</style>
