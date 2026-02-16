<!-- +page.svelte v0.2.0 — Admin: Kp data source control -->
<script lang="ts">
	import type { ApiResponse } from '$types/api';

	const sources = [
		{ id: 'auto', label: 'Auto (Fallback Chain)', description: 'Automatically selects the best available source using the priority chain.' },
		{ id: 'noaa', label: 'NOAA Estimated Kp', description: 'Planetary Kp from global magnetometer network. Current default primary.' },
		{ id: 'noaa_boulder', label: 'NOAA Boulder K-index', description: 'Single-station K-index from Boulder, CO. First fallback.' },
		{ id: 'noaa_forecast', label: 'NOAA Kp Forecast', description: '3-hour forecast "estimated" entries. Lower temporal resolution.' },
		{ id: 'gfz', label: 'GFZ Potsdam Hp30', description: 'Independent 30-min index from Germany. ~30-50 min latency.' },
		{ id: 'bom', label: 'Australian BoM K-index', description: 'Regional K-index from Australian magnetometers. Requires BOM_API_KEY.' },
	];

	let currentSource = $state('auto');
	let loading = $state(true);
	let saving = $state(false);
	let message = $state<string | null>(null);

	async function loadCurrent() {
		loading = true;
		try {
			const res = await fetch('/api/v1/admin/kp-source');
			if (res.ok) {
				const body = await res.json() as ApiResponse<{ source: string }>;
				currentSource = body.data?.source ?? 'auto';
			}
		} catch { /* silent */ }
		loading = false;
	}

	async function setSource(sourceId: string) {
		saving = true;
		message = null;
		try {
			const res = await fetch('/api/v1/admin/kp-source', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ source: sourceId }),
			});
			const body = await res.json() as ApiResponse<{ source: string }>;
			if (res.ok) {
				currentSource = body.data?.source ?? sourceId;
				message = `Source set to: ${sources.find(s => s.id === sourceId)?.label ?? sourceId}`;
			} else {
				message = `Error: ${body.error ?? 'Unknown error'}`;
			}
		} catch (err) {
			message = `Network error: ${err instanceof Error ? err.message : 'Unknown'}`;
		}
		saving = false;
	}

	$effect(() => { loadCurrent(); });
</script>

<svelte:head>
	<title>Kp Source Control — SWFT Admin</title>
</svelte:head>

<div class="kp-source-page">
	<h2>Kp Data Source Control</h2>
	<p class="description">
		Override the automatic fallback chain to force a specific data source. The cron worker
		will use the selected source exclusively. If the forced source fails, it falls back to
		the automatic chain.
	</p>

	{#if loading}
		<p class="muted">Loading current setting...</p>
	{:else}
		<div class="source-list">
			{#each sources as source}
				{@const isActive = currentSource === source.id}
				<button
					class="source-option"
					class:active={isActive}
					disabled={saving}
					onclick={() => setSource(source.id)}
				>
					<div class="source-radio">
						<span class="radio-dot" class:checked={isActive}></span>
					</div>
					<div class="source-info">
						<span class="source-name">{source.label}</span>
						<span class="source-desc">{source.description}</span>
					</div>
					{#if isActive}
						<span class="active-badge">ACTIVE</span>
					{/if}
				</button>
			{/each}
		</div>

		{#if message}
			<p class="message">{message}</p>
		{/if}

		<div class="note">
			<strong>Note:</strong> Changes take effect on the next cron cycle (within 3 minutes).
			The override is stored in the D1 database and persists across deployments.
		</div>
	{/if}
</div>

<style>
	.kp-source-page h2 {
		font-size: var(--font-size-lg);
		margin-bottom: var(--space-sm);
	}

	.description {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-xl);
		max-width: 640px;
		line-height: 1.6;
	}

	.source-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		max-width: 640px;
	}

	.source-option {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--border-radius);
		cursor: pointer;
		text-align: left;
		transition: border-color 0.2s, box-shadow 0.2s;
		color: inherit;
		font-family: inherit;
		font-size: inherit;
	}

	.source-option:hover:not(:disabled) {
		border-color: var(--text-muted);
	}

	.source-option.active {
		border-color: #60a5fa;
		box-shadow: 0 0 8px rgba(96, 165, 250, 0.2);
	}

	.source-option:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.source-radio {
		flex-shrink: 0;
	}

	.radio-dot {
		display: block;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid var(--text-muted);
		position: relative;
	}

	.radio-dot.checked {
		border-color: #60a5fa;
	}

	.radio-dot.checked::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #60a5fa;
	}

	.source-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.source-name {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}

	.source-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		line-height: 1.4;
	}

	.active-badge {
		flex-shrink: 0;
		font-size: 0.6rem;
		font-weight: 800;
		font-family: var(--font-mono);
		color: #60a5fa;
		background: rgba(96, 165, 250, 0.1);
		padding: 3px 8px;
		border-radius: 3px;
		letter-spacing: 0.04em;
	}

	.message {
		margin-top: var(--space-md);
		font-size: var(--font-size-sm);
		color: var(--accent-green);
	}

	.note {
		margin-top: var(--space-xl);
		font-size: 0.78rem;
		color: var(--text-muted);
		background: var(--bg-secondary);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		padding: var(--space-md);
		max-width: 640px;
	}

	.muted {
		color: var(--text-muted);
	}
</style>
