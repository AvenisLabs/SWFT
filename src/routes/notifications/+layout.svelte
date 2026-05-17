<!-- +layout.svelte v0.1.0 — Notifications section shell + sub-nav -->
<script lang="ts">
	import { page } from '$app/stores';
	let { data, children } = $props();

	const isAdmin = $derived(data.authUser?.role === 'admin');

	const navItems = $derived([
		{ href: '/notifications', label: 'Channels', show: true },
		{ href: '/notifications/log', label: 'Delivery Log', show: true },
		{ href: '/notifications/admin/users', label: 'Users', show: isAdmin },
	].filter(i => i.show));
</script>

<div class="notif-shell">
	<header class="notif-header">
		<div class="notif-title-row">
			<h1>SWFT Notifications</h1>
			{#if data.authEmail}
				<div class="signed-in" title={data.authEmail}>
					Signed in as <strong>{data.authEmail}</strong>
					{#if isAdmin}<span class="role-badge">admin</span>{/if}
				</div>
			{/if}
		</div>
		<nav class="notif-nav">
			{#each navItems as item}
				<a
					href={item.href}
					class="notif-nav-link"
					class:active={$page.url.pathname === item.href ||
						($page.url.pathname.startsWith(item.href + '/') && item.href !== '/notifications')}
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</header>
	<div class="notif-content">
		{@render children()}
	</div>
</div>

<style>
	.notif-shell {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-xl);
	}

	.notif-header {
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--border-default);
	}

	.notif-title-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.notif-title-row h1 {
		font-size: var(--font-size-xl);
		margin: 0;
	}

	.signed-in {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.signed-in strong {
		color: var(--text-primary);
		font-weight: 600;
	}

	.role-badge {
		display: inline-block;
		margin-left: var(--space-xs);
		padding: 2px 6px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-blue);
		background: rgba(56, 139, 253, 0.12);
		border-radius: var(--border-radius-sm);
	}

	.notif-nav {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.notif-nav-link {
		color: var(--text-secondary);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-sm);
		transition: color 0.15s, background 0.15s;
	}

	.notif-nav-link:hover {
		color: var(--text-primary);
		background: var(--bg-card);
		text-decoration: none;
	}

	.notif-nav-link.active {
		color: var(--accent-blue);
		background: var(--bg-card);
	}

	.notif-content {
		min-height: 400px;
	}

	@media (max-width: 640px) {
		.notif-shell {
			padding: var(--space-md);
		}
	}
</style>
