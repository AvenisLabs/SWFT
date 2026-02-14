<!-- KpGnssExplainer.svelte v0.3.0 — 3-column GNSS effects table organized by Kp range -->
<script lang="ts">
	interface Props {
		activeKp?: number;
	}
	let { activeKp }: Props = $props();

	// Match the active Kp to the nearest integer row
	let activeRow = $derived(activeKp != null ? Math.round(activeKp) : null);

	interface KpRow {
		kp: number;
		gScale: string;
		description: string;
	}

	const normalRows: KpRow[] = [
		{ kp: 1, gScale: '', description: 'Quiet — no GNSS impact' },
		{ kp: 2, gScale: '', description: 'Nominal accuracy' },
		{ kp: 3, gScale: '', description: 'Minor aurora, no GNSS impact' },
		{ kp: 4, gScale: 'G0', description: 'Monitor GNSS quality' },
	];

	const stormRows: KpRow[] = [
		{ kp: 5, gScale: 'G1', description: 'Minor fluctuations at high latitudes' },
		{ kp: 6, gScale: 'G2', description: 'RTK fix rates drop, PPP convergence extends' },
		{ kp: 7, gScale: 'G3', description: 'Significant errors, avoid precision work' },
	];

	const severeRows: KpRow[] = [
		{ kp: 8, gScale: 'G4', description: 'GNSS severely degraded, lock loss likely' },
		{ kp: 9, gScale: 'G5', description: 'GNSS unusable for precision work' },
	];
</script>

<div class="gnss-explainer">
	<div class="explainer-col normal">
		<h3 class="col-header normal-header">Kp 1–4 <span class="col-tag">Normal</span></h3>
		{#each normalRows as row}
			<div class="kp-row" class:active={activeRow === row.kp}>
				<span class="kp-badge normal-badge">Kp {row.kp}{row.gScale ? ` (${row.gScale})` : ''}</span>
				<span class="kp-desc">{row.description}</span>
			</div>
		{/each}
	</div>

	<div class="explainer-col storm">
		<h3 class="col-header storm-header">Kp 5–7 <span class="col-tag">Storm</span></h3>
		{#each stormRows as row}
			<div class="kp-row" class:active={activeRow === row.kp}>
				<span class="kp-badge storm-badge">Kp {row.kp} ({row.gScale})</span>
				<span class="kp-desc">{row.description}</span>
			</div>
		{/each}
	</div>

	<div class="explainer-col severe">
		<h3 class="col-header severe-header">Kp 8–9 <span class="col-tag">Severe</span></h3>
		{#each severeRows as row}
			<div class="kp-row" class:active={activeRow === row.kp}>
				<span class="kp-badge severe-badge">Kp {row.kp} ({row.gScale})</span>
				<span class="kp-desc">{row.description}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.gnss-explainer {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.explainer-col {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.col-header {
		font-size: 0.8rem;
		font-weight: 700;
		padding-bottom: var(--space-xs);
		border-bottom: 2px solid;
		margin-bottom: var(--space-xs);
	}

	.col-tag {
		font-weight: 400;
		font-size: 0.7rem;
	}

	.normal-header {
		color: var(--accent-green);
		border-color: var(--accent-green);
	}

	.storm-header {
		color: var(--accent-orange);
		border-color: var(--accent-orange);
	}

	.severe-header {
		color: var(--accent-red);
		border-color: var(--accent-red);
	}

	.kp-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-xs);
		border-radius: var(--border-radius-sm);
		transition: background 0.2s;
	}

	.kp-row.active {
		background: rgba(234, 179, 8, 0.15);
		border: 1px solid rgba(234, 179, 8, 0.4);
	}

	.kp-badge {
		font-size: 0.72rem;
		font-weight: 700;
		font-family: var(--font-mono);
	}

	.normal-badge { color: var(--accent-green); }
	.storm-badge { color: var(--accent-orange); }
	.severe-badge { color: var(--accent-red); }

	.kp-desc {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	/* Collapse to single column on mobile */
	@media (max-width: 768px) {
		.gnss-explainer {
			grid-template-columns: 1fr;
		}
	}
</style>
