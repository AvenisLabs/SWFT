<!-- /events/[id] page v0.3.0 — Event detail page with dual time display -->
<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import type { EventItem } from '$types/api';
	import { formatDual } from '$lib/utils/timeFormat';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let event = $state<EventItem | null>(null);
	let loading = $state(true);
	let notFound = $state(false);

	onMount(async () => {
		const id = $page.params.id;
		try {
			const res = await fetch(`/api/v1/events/${id}`);
			if (res.ok) {
				const json = await res.json();
				event = json.data;
			} else {
				notFound = true;
			}
		} catch {
			notFound = true;
		}
		loading = false;
	});

	const severityColors: Record<string, string> = {
		minor: 'var(--severity-low)',
		moderate: 'var(--severity-moderate)',
		strong: 'var(--severity-high)',
		extreme: 'var(--severity-extreme)',
	};
</script>

<svelte:head>
	<title>{event?.title ?? 'Event'} — SWFT</title>
</svelte:head>

<main class="dashboard">
	{#if loading}
		<div class="loading-state">
			<div class="skeleton-block" style="width: 60%; height: 2rem;"></div>
			<div class="skeleton-block" style="width: 100%; height: 200px; margin-top: 1rem;"></div>
		</div>
	{:else if notFound}
		<h1>Event Not Found</h1>
		<p class="muted">The requested event could not be found.</p>
	{:else if event}
		<header>
			<div class="event-meta">
				<span class="severity-badge" style:background={severityColors[event.severity] ?? 'var(--text-muted)'}>
					{event.severity}
				</span>
				<span class="event-type">{event.event_type.replace(/_/g, ' ')}</span>
			</div>
			<h1>{event.title}</h1>
		</header>

		<div class="event-detail-grid">
			<Card title="Details">
				<dl class="detail-list">
					<div class="detail-item">
						<dt>Began</dt>
						<dd>{formatDual(event.begins)}</dd>
					</div>
					{#if event.ends}
						<div class="detail-item">
							<dt>Ended</dt>
							<dd>{formatDual(event.ends)}</dd>
						</div>
					{/if}
					{#if event.peak_time}
						<div class="detail-item">
							<dt>Peak</dt>
							<dd>{formatDual(event.peak_time)}</dd>
						</div>
					{/if}
				</dl>
			</Card>

			{#if event.description}
				<Card title="Description">
					<p class="description">{event.description}</p>
				</Card>
			{/if}

			{#if event.gnss_impact_level}
				<Card title="GNSS Impact">
					<div class="gnss-impact">
						<span class="impact-level" data-level={event.gnss_impact_level}>
							{event.gnss_impact_level}
						</span>
						{#if event.gnss_advisory}
							<p class="advisory">{event.gnss_advisory}</p>
						{/if}
					</div>
				</Card>
			{/if}
		</div>
	{/if}

	<nav class="back-link">
		<a href="/events">&larr; Back to events</a>
	</nav>
</main>

<style>
	.event-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.severity-badge {
		padding: 3px 10px;
		border-radius: var(--border-radius-sm);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		color: #fff;
	}

	.event-type {
		text-transform: capitalize;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.event-detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
		margin-top: var(--space-xl);
	}

	.event-detail-grid > :global(:last-child:nth-child(odd)) {
		grid-column: 1 / -1;
	}

	.detail-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.detail-item {
		display: flex;
		gap: var(--space-sm);
	}

	dt {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		min-width: 60px;
	}

	dd {
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
	}

	.description {
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.gnss-impact {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.impact-level {
		display: inline-block;
		padding: 4px 12px;
		border-radius: var(--border-radius-sm);
		font-weight: 700;
		text-transform: uppercase;
		font-size: var(--font-size-sm);
		width: fit-content;
	}

	.impact-level[data-level="severe"],
	.impact-level[data-level="high"] { background: var(--severity-severe); color: #fff; }
	.impact-level[data-level="moderate"] { background: var(--severity-moderate); color: #000; }
	.impact-level[data-level="low"] { background: var(--severity-low); color: #000; }

	.advisory {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}

	.loading-state { padding: var(--space-xl) 0; }
	.skeleton-block {
		background: var(--bg-card);
		border-radius: var(--border-radius);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.back-link { margin-top: var(--space-xl); }

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	@media (max-width: 768px) {
		.event-detail-grid { grid-template-columns: 1fr; }
	}
</style>
