<!-- +page.svelte v0.1.0 — Admin link management: view, override, and control external links -->
<script lang="ts">
	import type { SiteLink, ApiResponse } from '$types/api';

	let links = $state<SiteLink[]>([]);
	let loading = $state(true);
	let editingId = $state<number | null>(null);
	let editForm = $state({ override_url: '', override_text: '', action: 'default' });
	let saveError = $state<string | null>(null);

	async function loadLinks() {
		loading = true;
		try {
			const res = await fetch('/api/v1/admin/links');
			if (res.ok) {
				const body = (await res.json()) as ApiResponse<SiteLink[]>;
				links = body.data ?? [];
			}
		} catch { /* silently handle */ }
		loading = false;
	}

	function startEdit(link: SiteLink) {
		editingId = link.id;
		editForm = {
			override_url: link.override_url ?? '',
			override_text: link.override_text ?? '',
			action: link.action,
		};
		saveError = null;
	}

	function cancelEdit() {
		editingId = null;
		saveError = null;
	}

	async function saveEdit(id: number) {
		saveError = null;
		try {
			const body: Record<string, unknown> = { action: editForm.action };
			// Send null to clear overrides when empty
			body.override_url = editForm.override_url.trim() || null;
			body.override_text = editForm.override_text.trim() || null;

			const res = await fetch(`/api/v1/admin/links/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (res.ok) {
				const updated = (await res.json()) as ApiResponse<SiteLink>;
				// Replace link in list
				links = links.map(l => l.id === id ? updated.data : l);
				editingId = null;
			} else {
				const errBody = (await res.json()) as ApiResponse<null>;
				saveError = errBody.error ?? 'Failed to save';
			}
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Network error';
		}
	}

	/** Render status badge */
	function statusClass(status: number | null): string {
		if (status === null) return 'status-unknown';
		if (status >= 200 && status < 400) return 'status-ok';
		return 'status-broken';
	}

	function statusLabel(status: number | null): string {
		if (status === null) return 'Unchecked';
		if (status >= 200 && status < 400) return String(status);
		return String(status);
	}

	$effect(() => {
		loadLinks();
	});
</script>

<svelte:head>
	<title>Link Management — SWFT Admin</title>
</svelte:head>

<div class="admin-links">
	<h2>External Links</h2>
	<p class="muted">{links.length} discovered links across site pages</p>

	{#if loading}
		<p class="loading">Loading links...</p>
	{:else if links.length === 0}
		<p class="muted">No links discovered yet. Run a link check from the dashboard.</p>
	{:else}
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th>URL</th>
						<th>Text</th>
						<th>Page</th>
						<th>Status</th>
						<th>Action</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each links as link (link.id)}
						{#if editingId === link.id}
							<!-- Edit mode row -->
							<tr class="edit-row">
								<td colspan="6">
									<div class="edit-form">
										<div class="edit-field">
											<label for="edit-url">Original URL</label>
											<span class="edit-original">{link.url}</span>
										</div>
										<div class="edit-field">
											<label for="edit-override-url">Override URL</label>
											<input
												id="edit-override-url"
												type="text"
												bind:value={editForm.override_url}
												placeholder="Leave empty to use original"
											/>
										</div>
										<div class="edit-field">
											<label for="edit-override-text">Override Text</label>
											<input
												id="edit-override-text"
												type="text"
												bind:value={editForm.override_text}
												placeholder="Leave empty to use original"
											/>
										</div>
										<div class="edit-field">
											<label for="edit-action">Action</label>
											<select id="edit-action" bind:value={editForm.action}>
												<option value="default">Default (render link)</option>
												<option value="unlink">Unlink (text only)</option>
												<option value="remove">Remove (hidden)</option>
											</select>
										</div>
										{#if saveError}
											<p class="error">{saveError}</p>
										{/if}
										<div class="edit-actions">
											<button class="btn-save" onclick={() => saveEdit(link.id)}>Save</button>
											<button class="btn-cancel" onclick={cancelEdit}>Cancel</button>
										</div>
									</div>
								</td>
							</tr>
						{:else}
							<!-- Display row -->
							<tr>
								<td class="url-cell" title={link.url}>
									{#if link.override_url}
										<span class="overridden">{link.override_url}</span>
										<span class="original-url">(was: {link.url})</span>
									{:else}
										{link.url}
									{/if}
								</td>
								<td>
									{#if link.override_text}
										<span class="overridden">{link.override_text}</span>
									{:else}
										{link.link_text || '—'}
									{/if}
								</td>
								<td class="page-cell">{link.page_path}</td>
								<td>
									<span class="status-badge {statusClass(link.last_status)}">
										{statusLabel(link.last_status)}
									</span>
								</td>
								<td>
									<span class="action-badge action-{link.action}">{link.action}</span>
								</td>
								<td>
									<button class="btn-edit" onclick={() => startEdit(link)}>Edit</button>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.admin-links h2 {
		font-size: var(--font-size-xl);
		margin-bottom: var(--space-xs);
	}

	.loading {
		color: var(--text-muted);
		padding: var(--space-xl);
		text-align: center;
	}

	.table-wrapper {
		overflow-x: auto;
		margin-top: var(--space-lg);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	thead {
		border-bottom: 2px solid var(--border-default);
	}

	th {
		text-align: left;
		padding: var(--space-sm) var(--space-md);
		color: var(--text-primary);
		font-weight: 600;
		white-space: nowrap;
	}

	td {
		padding: var(--space-sm) var(--space-md);
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-default);
		vertical-align: top;
	}

	.url-cell {
		max-width: 300px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}

	.page-cell {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.overridden {
		color: var(--accent-yellow);
	}

	.original-url {
		display: block;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	/* Status badges */
	.status-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--border-radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-ok { background: rgba(63, 185, 80, 0.15); color: var(--accent-green); }
	.status-broken { background: rgba(248, 81, 73, 0.15); color: var(--accent-red); }
	.status-unknown { background: rgba(158, 170, 182, 0.15); color: var(--text-muted); }

	/* Action badges */
	.action-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--border-radius-sm);
		font-size: 0.75rem;
	}

	.action-default { color: var(--text-muted); }
	.action-unlink { color: var(--accent-yellow); background: rgba(210, 153, 34, 0.15); }
	.action-remove { color: var(--accent-red); background: rgba(248, 81, 73, 0.15); }

	/* Edit mode */
	.edit-row td {
		padding: var(--space-md);
		background: var(--bg-secondary);
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		max-width: 500px;
	}

	.edit-field label {
		display: block;
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-bottom: var(--space-xs);
	}

	.edit-field input, .edit-field select {
		width: 100%;
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
	}

	.edit-original {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--text-secondary);
		word-break: break-all;
	}

	.edit-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.btn-save {
		background: var(--accent-blue);
		color: #fff;
		border: none;
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-size: var(--font-size-sm);
	}

	.btn-cancel {
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--border-default);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-size: var(--font-size-sm);
	}

	.btn-edit {
		background: transparent;
		color: var(--accent-blue);
		border: 1px solid var(--border-default);
		padding: 2px 10px;
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-size: 0.75rem;
	}

	.error {
		color: var(--accent-red);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 768px) {
		th, td {
			padding: var(--space-xs) var(--space-sm);
			font-size: 0.8rem;
		}
	}
</style>
