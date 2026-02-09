<!-- HelpPopover.svelte v0.3.0 — Pure CSS hover/focus tooltip with ? icon -->
<script lang="ts">
	interface Props {
		text: string;
		id: string;
	}
	let { text, id }: Props = $props();
</script>

<!-- Pure CSS tooltip — no JS events, no click conflicts with parent card links -->
<span class="help-popover-wrapper">
	<abbr class="help-btn" title="" aria-describedby={id}>?</abbr>
	<span class="help-popover" role="tooltip" {id}>
		<span class="help-arrow"></span>
		<span class="help-text">{text}</span>
	</span>
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
		cursor: help;
		line-height: 1;
		padding: 0;
		transition: border-color 0.15s, color 0.15s;
		user-select: none;
		text-decoration: none;
	}

	.help-popover-wrapper:hover .help-btn {
		border-color: var(--accent-blue);
		color: var(--accent-blue);
	}

	/* Tooltip hidden by default, shown on hover/focus-within */
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
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.15s, visibility 0.15s;
		pointer-events: none;
	}

	.help-popover-wrapper:hover .help-popover {
		opacity: 1;
		visibility: visible;
	}

	.help-text {
		color: var(--text-secondary);
		font-size: 0.8rem;
		line-height: 1.5;
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
