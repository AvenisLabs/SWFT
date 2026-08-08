<!-- +page.svelte v0.2.0 — Delivery audit log. Last 200 rows, owner-scoped (admin sees all). -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { formatUserTime } from '$lib/utils/timeFormat';

	let { data } = $props();
	const deliveries = $derived(data.deliveries);
	const isAdminView = $derived(data.isAdminView);

	let filterKind = $state<'all' | 'immediate' | 'summary' | 'off_hours_digest' | 'storm_end' | 'test' | 'kindex_push'>('all');
	let filterStatus = $state<'all' | 'ok' | 'failed'>('all');
	let userTimeZone = $state<string | null>(null);

	onMount(() => {
		userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
	});

	const filtered = $derived(
		deliveries.filter(d => {
			if (filterKind !== 'all' && d.kind !== filterKind) return false;
			if (filterStatus === 'ok' && d.ok !== 1) return false;
			if (filterStatus === 'failed' && d.ok === 1) return false;
			return true;
		})
	);

	function kindLabel(k: string): string {
		switch (k) {
			case 'immediate':
				return 'Immediate';
			case 'summary':
				return 'Summary';
			case 'off_hours_digest':
				return 'Off-hours digest';
			case 'storm_end':
				return 'Storm end';
			case 'test':
				return 'Test';
			case 'kindex_push':
				return 'K-index push';
			default:
				return k;
		}
	}

	function timeAgo(iso: string): string {
		const t = new Date(iso).getTime();
		if (Number.isNaN(t)) return iso;
		const diffMin = (Date.now() - t) / 60000;
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
		if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
		return `${Math.floor(diffMin / 1440)}d ago`;
	}
</script>

<section class="log-page">
	<header>
		<h2>Delivery log</h2>
		<p class="subtitle">
			Last 200 dispatch attempts. {#if isAdminView}<strong>Admin view</strong>: showing all channels.{:else}Filtered to your channels.{/if}
		</p>
	</header>

	<div class="filters">
		<label>
			<span>Kind</span>
			<select bind:value={filterKind}>
				<option value="all">All</option>
				<option value="immediate">Immediate</option>
				<option value="summary">Summary</option>
				<option value="off_hours_digest">Off-hours digest</option>
				<option value="storm_end">Storm end</option>
				<option value="test">Test</option>
				<option value="kindex_push">K-index push</option>
			</select>
		</label>
		<label>
			<span>Status</span>
			<select bind:value={filterStatus}>
				<option value="all">All</option>
				<option value="ok">OK only</option>
				<option value="failed">Failed only</option>
			</select>
		</label>
		<div class="count">Showing {filtered.length} of {deliveries.length}</div>
	</div>

	{#if filtered.length === 0}
		<div class="empty">No deliveries match the current filters.</div>
	{:else}
		<table class="log-table">
			<thead>
				<tr>
					<th>When</th>
					<th>Channel</th>
					<th>Kind</th>
					<th>Status</th>
					<th>Summary</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as d (d.id)}
					<tr class:row-error={!d.ok}>
						<td class="muted" title={formatUserTime(d.sent_at, userTimeZone)}>
							<div>{timeAgo(d.sent_at)}</div>
							<div class="time-abs">{formatUserTime(d.sent_at, userTimeZone)}</div>
						</td>
						<td class="channel-cell">
							<a href="/notifications/channels/{d.channel_id}" title={`Channel id ${d.channel_id}`}>{d.channel_name}</a>
						</td>
						<td>{kindLabel(d.kind)}</td>
						<td>
							{#if d.ok}
								<span class="status ok">{d.http_status ?? '—'}</span>
							{:else}
								<span class="status fail" title={d.error ?? ''}>{d.http_status ?? 'ERR'}</span>
							{/if}
						</td>
						<td class="payload">
							{d.payload_summary ?? ''}
							{#if !d.ok && d.error}<div class="err-detail">{d.error}</div>{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<style>
	.log-page { display: flex; flex-direction: column; gap: var(--space-md); }
	.subtitle { color: var(--text-secondary); font-size: var(--font-size-sm); margin: 0; }

	.filters {
		display: flex; gap: var(--space-md); align-items: flex-end; flex-wrap: wrap;
		padding: var(--space-md);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-md);
	}
	.filters label { display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; color: var(--text-muted); }
	.filters select {
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-base);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}
	.filters .count {
		margin-left: auto;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.empty {
		text-align: center;
		padding: var(--space-xl);
		color: var(--text-muted);
		background: var(--bg-card);
		border: 1px dashed var(--border-default);
		border-radius: var(--border-radius-md);
	}

	.log-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-md);
		overflow: hidden;
	}

	.log-table th, .log-table td {
		padding: var(--space-xs) var(--space-md);
		text-align: left;
		border-bottom: 1px solid var(--border-default);
		font-size: var(--font-size-sm);
		vertical-align: top;
	}

	.log-table th {
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		background: var(--bg-base);
	}

	.log-table tr:last-child td { border-bottom: none; }

	.log-table .muted { color: var(--text-muted); font-family: var(--font-mono); }
	.time-abs { margin-top: 2px; font-size: 0.68rem; white-space: nowrap; }
	.log-table .channel-cell a { color: var(--text-primary); font-weight: 500; }

	.status {
		display: inline-block;
		padding: 1px 6px;
		border-radius: var(--border-radius-sm);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
	}
	.status.ok {
		background: rgba(63, 185, 80, 0.12);
		color: var(--accent-green, #3fb950);
	}
	.status.fail {
		background: rgba(248, 81, 73, 0.12);
		color: var(--accent-red, #f85149);
	}

	.row-error td.payload { color: var(--text-secondary); }
	.err-detail {
		margin-top: 4px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--accent-red, #f85149);
		word-break: break-word;
	}

	.payload { max-width: 500px; }
</style>
