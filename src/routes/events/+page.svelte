<!-- /events page v0.2.0 — Recent space weather events -->
<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import type { EventItem } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { formatTimestamp } from '$lib/utils/formatters';
	import { onMount } from 'svelte';

	let events = $state<EventItem[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const data = await fetchApi<EventItem[]>('/api/v1/events/recent?days=14&limit=50');
		if (data) events = data;
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
	<title>Events — SWFT</title>
</svelte:head>

<main class="dashboard">
	<header>
		<h1>Space Weather Events</h1>
		<p class="subtitle">Detected events from the last 14 days</p>
	</header>

	<section class="events-list">
		{#if loading}
			{#each Array(3) as _}
				<div class="skeleton-event"></div>
			{/each}
		{:else if events.length === 0}
			<p class="empty-state">No recent events detected</p>
		{:else}
			{#each events as event (event.id)}
				<a href="/events/{event.id}" class="event-link">
					<article class="event-card">
						<div class="event-header">
							<span class="severity-dot" style:background={severityColors[event.severity] ?? 'var(--text-muted)'}></span>
							<span class="event-type">{event.event_type.replace(/_/g, ' ')}</span>
							<span class="event-severity">{event.severity}</span>
							<time class="event-time">{formatTimestamp(event.begins)}</time>
						</div>
						<h3 class="event-title">{event.title}</h3>
						{#if event.description}
							<p class="event-desc">{event.description}</p>
						{/if}
						{#if event.gnss_impact_level}
							<span class="gnss-badge" data-level={event.gnss_impact_level}>
								GNSS: {event.gnss_impact_level}
							</span>
						{/if}
					</article>
				</a>
			{/each}
		{/if}
	</section>

	<nav class="back-link">
		<a href="/">&larr; Back to dashboard</a>
	</nav>
</main>

<style>
	.events-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin-top: var(--space-xl);
	}

	.event-link {
		text-decoration: none;
		color: inherit;
	}

	.event-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-md);
		transition: border-color 0.15s;
	}

	.event-card:hover {
		border-color: var(--accent-blue);
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
		font-size: var(--font-size-sm);
	}

	.severity-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.event-type {
		text-transform: capitalize;
		color: var(--text-secondary);
	}

	.event-severity {
		text-transform: capitalize;
		font-weight: 600;
	}

	.event-time {
		color: var(--text-muted);
		margin-left: auto;
		font-size: 0.75rem;
	}

	.event-title {
		font-size: var(--font-size-base);
		margin-bottom: var(--space-xs);
	}

	.event-desc {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}

	.gnss-badge {
		display: inline-block;
		margin-top: var(--space-sm);
		font-size: 0.7rem;
		padding: 2px 6px;
		border-radius: var(--border-radius-sm);
		font-weight: 600;
		text-transform: uppercase;
		background: var(--bg-secondary);
	}

	.gnss-badge[data-level="severe"],
	.gnss-badge[data-level="high"] { background: var(--severity-severe); color: #fff; }
	.gnss-badge[data-level="moderate"] { background: var(--severity-moderate); color: #000; }

	.skeleton-event {
		height: 120px;
		background: var(--bg-card);
		border-radius: var(--border-radius);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.empty-state {
		text-align: center;
		color: var(--text-muted);
		padding: var(--space-2xl);
	}

	.back-link {
		margin-top: var(--space-xl);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
