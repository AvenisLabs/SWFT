<!-- +layout.svelte v0.1.0 — Admin section layout with sub-navigation -->
<script>
	import { page } from '$app/stores';
	let { children } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/links', label: 'Links' },
		{ href: '/admin/link-checks', label: 'Check History' },
	];
</script>

<div class="admin-shell">
	<header class="admin-header">
		<h1>SWFT Admin</h1>
		<nav class="admin-nav">
			{#each navItems as item}
				<a
					href={item.href}
					class="admin-nav-link"
					class:active={$page.url.pathname === item.href}
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</header>
	<div class="admin-content">
		{@render children()}
	</div>
</div>

<style>
	.admin-shell {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-xl);
	}

	.admin-header {
		display: flex;
		align-items: center;
		gap: var(--space-xl);
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--border-default);
		flex-wrap: wrap;
	}

	.admin-header h1 {
		font-size: var(--font-size-xl);
		white-space: nowrap;
	}

	.admin-nav {
		display: flex;
		gap: var(--space-sm);
	}

	.admin-nav-link {
		color: var(--text-secondary);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		transition: color 0.15s, background 0.15s;
	}

	.admin-nav-link:hover {
		color: var(--text-primary);
		background: var(--bg-card);
		text-decoration: none;
	}

	.admin-nav-link.active {
		color: var(--accent-blue);
		background: var(--bg-card);
	}

	.admin-content {
		min-height: 400px;
	}

	@media (max-width: 640px) {
		.admin-shell {
			padding: var(--space-md);
		}

		.admin-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-sm);
		}
	}
</style>
