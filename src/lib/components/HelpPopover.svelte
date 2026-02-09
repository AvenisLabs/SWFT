<!-- HelpPopover.svelte v0.1.0 — Accessible help popover with ? button -->
<script lang="ts">
	interface Props {
		text: string;
		id: string;
	}
	let { text, id }: Props = $props();

	let open = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();
	let popoverEl: HTMLDivElement | undefined = $state();

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	// Close on click outside
	function handleDocClick(e: MouseEvent) {
		if (!open) return;
		const target = e.target as Node;
		if (triggerEl?.contains(target) || popoverEl?.contains(target)) return;
		close();
	}
</script>

<svelte:document onclick={handleDocClick} onkeydown={handleKeydown} />

<span class="help-popover-wrapper">
	<button
		class="help-btn"
		bind:this={triggerEl}
		onclick={toggle}
		aria-label="Help"
		aria-describedby={open ? id : undefined}
		aria-expanded={open}
		type="button"
	>?</button>

	{#if open}
		<div
			class="help-popover"
			bind:this={popoverEl}
			role="tooltip"
			{id}
		>
			<div class="help-arrow"></div>
			<p>{text}</p>
		</div>
	{/if}
</span>

<style>
	.help-popover-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.help-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 1px solid var(--border-default);
		background: var(--bg-secondary);
		color: var(--text-muted);
		font-size: 0.65rem;
		font-weight: 700;
		cursor: pointer;
		line-height: 1;
		padding: 0;
		transition: border-color 0.15s, color 0.15s;
	}

	.help-btn:hover,
	.help-btn:focus-visible {
		border-color: var(--accent-blue);
		color: var(--accent-blue);
	}

	.help-popover {
		position: absolute;
		bottom: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%);
		background: var(--bg-secondary);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-sm) var(--space-md);
		max-width: 300px;
		min-width: 200px;
		z-index: 200;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.help-popover p {
		color: var(--text-secondary);
		font-size: 0.8rem;
		line-height: 1.5;
		margin: 0;
	}

	.help-arrow {
		position: absolute;
		bottom: -6px;
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		width: 10px;
		height: 10px;
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-default);
		border-bottom: 1px solid var(--border-default);
	}
</style>
