<!-- +page.svelte v0.1.0 — Admin check history: list past link check runs -->
<script lang="ts">
	import type { LinkCheckRun, ApiResponse } from '$types/api';

	let runs = $state<LinkCheckRun[]>([]);
	let loading = $state(true);

	async function loadRuns() {
		loading = true;
		try {
			const res = await fetch('/api/v1/admin/link-checks');
			if (res.ok) {
				const body = (await res.json()) as ApiResponse<LinkCheckRun[]>;
				runs = body.data ?? [];
			}
		} catch { /* silently handle */ }
		loading = false;
	}

	function statusClass(run: LinkCheckRun): string {
		if (run.status === 'error') return 'run-error';
		if (run.broken_count > 0) return 'run-broken';
		return 'run-healthy';
	}

	$effect(() => {
		loadRuns();
	});
</script>

<svelte:head>
	<title>Check History — SWFT Admin</title>
</svelte:head>

<div class="admin-checks">
	<h2>Link Check History</h2>
	<p class="muted">Past link check runs with summary results</p>

	{#if loading}
		<p class="loading">Loading check history...</p>
	{:else if runs.length === 0}
		<p class="muted">No check runs recorded yet. Run a link check from the dashboard.</p>
	{:else}
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Trigger</th>
						<th>Status</th>
						<th>Total</th>
						<th>Healthy</th>
						<th>Broken</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each runs as run (run.id)}
						<tr class={statusClass(run)}>
							<td>{new Date(run.started_at + 'Z').toLocaleString()}</td>
							<td>{run.trigger_type}</td>
							<td>
								<span class="status-badge status-{run.status}">{run.status}</span>
							</td>
							<td>{run.total_links}</td>
							<td class="count-healthy">{run.healthy_count}</td>
							<td class="count-broken">{run.broken_count}</td>
							<td>
								<a href="/admin/link-checks/{run.id}" class="view-link">View</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.admin-checks h2 {
		font-size: var(--font-size-xl);
		margin-bottom: var(--space-xs);
	}

	.loading {
		color: var(--text-muted);
		padding: var(--space-xl);
		text-align: center;
	}

	.table-wrapper {
		overflow-x: auto;
		margin-top: var(--space-lg);
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
	}

	.count-healthy { color: var(--accent-green); }
	.count-broken { color: var(--accent-red); }

	.status-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--border-radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-completed { color: var(--accent-green); background: rgba(63, 185, 80, 0.15); }
	.status-running { color: var(--accent-blue); background: rgba(88, 166, 255, 0.15); }
	.status-error { color: var(--accent-red); background: rgba(248, 81, 73, 0.15); }

	.view-link {
		color: var(--accent-blue);
		font-size: 0.8rem;
	}

	@media (max-width: 768px) {
		th, td {
			padding: var(--space-xs) var(--space-sm);
			font-size: 0.8rem;
		}
	}
</style>
