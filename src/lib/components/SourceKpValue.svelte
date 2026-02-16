<!-- SourceKpValue.svelte v0.1.0 — Compact Kp value display for data-source cards -->
<script lang="ts">
	import { formatLocal } from '$lib/utils/timeFormat';

	interface Props {
		kp: number | null;
		time: string | null;
		status: 'ok' | 'error' | 'stale';
	}
	let { kp, time, status }: Props = $props();

	/** Map Kp value to color */
	function kpColor(val: number): string {
		if (val >= 7) return 'var(--accent-red)';
		if (val >= 5) return 'var(--accent-orange)';
		if (val >= 4) return 'var(--accent-yellow)';
		return 'var(--accent-green)';
	}

	let color = $derived(kp != null ? kpColor(kp) : 'var(--text-muted)');
</script>

<div class="source-kp">
	{#if status === 'error'}
		<span class="kp-big" style="color: var(--text-muted)">--</span>
		<span class="kp-status error">Unavailable</span>
	{:else if kp == null}
		<span class="kp-big" style="color: var(--text-muted)">--</span>
		<span class="kp-status">No data</span>
	{:else}
		<span class="kp-big" style:color>{kp.toFixed(1)}</span>
		{#if time}
			<time class="kp-timestamp" datetime={time}>{formatLocal(time)}</time>
		{/if}
		{#if status === 'stale'}
			<span class="kp-status stale">Stale</span>
		{/if}
	{/if}
</div>

<style>
	.source-kp {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-sm) 0;
	}

	.kp-big {
		font-size: var(--font-size-2xl);
		font-weight: 700;
		font-family: var(--font-mono);
		line-height: 1;
	}

	.kp-timestamp {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.kp-status {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.kp-status.error {
		color: var(--accent-red);
	}

	.kp-status.stale {
		color: var(--accent-yellow);
	}
</style>
