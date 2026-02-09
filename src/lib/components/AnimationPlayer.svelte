<!-- AnimationPlayer.svelte v0.2.0 — Client-side frame animation player -->
<script lang="ts">
	import type { AnimationManifest, AnimationFrame } from '$types/api';
	import { fetchApi } from '$lib/stores/dashboard';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		panelId: string;
		frameRate?: number; // ms between frames
	}
	let { panelId, frameRate = 200 }: Props = $props();

	let frames = $state<AnimationFrame[]>([]);
	let currentIndex = $state(0);
	let playing = $state(true);
	let loading = $state(true);
	let error = $state(false);
	let timer: ReturnType<typeof setInterval> | null = null;

	let currentFrame = $derived(frames[currentIndex]);
	let progress = $derived(frames.length > 0 ? ((currentIndex + 1) / frames.length) * 100 : 0);

	onMount(async () => {
		const manifest = await fetchApi<AnimationManifest>(`/api/v1/animations/${panelId}/manifest`);
		if (manifest && manifest.frames.length > 0) {
			frames = manifest.frames;
			loading = false;
			startPlayback();
		} else {
			loading = false;
			error = true;
		}
	});

	onDestroy(() => {
		stopPlayback();
	});

	function startPlayback() {
		stopPlayback();
		timer = setInterval(() => {
			if (frames.length > 0) {
				currentIndex = (currentIndex + 1) % frames.length;
			}
		}, frameRate);
		playing = true;
	}

	function stopPlayback() {
		if (timer) clearInterval(timer);
		timer = null;
		playing = false;
	}

	function togglePlayback() {
		if (playing) {
			stopPlayback();
		} else {
			startPlayback();
		}
	}

	function stepForward() {
		stopPlayback();
		currentIndex = (currentIndex + 1) % frames.length;
	}

	function stepBackward() {
		stopPlayback();
		currentIndex = (currentIndex - 1 + frames.length) % frames.length;
	}
</script>

<div class="animation-player">
	{#if loading}
		<div class="player-loading">
			<div class="loading-placeholder"></div>
		</div>
	{:else if error}
		<p class="muted">Failed to load animation</p>
	{:else if currentFrame}
		<div class="frame-container">
			<img src={currentFrame.url} alt="Frame {currentIndex + 1}" loading="lazy" />
		</div>

		<!-- Progress bar -->
		<div class="progress-bar">
			<div class="progress-fill" style:width="{progress}%"></div>
		</div>

		<!-- Controls -->
		<div class="controls">
			<button onclick={stepBackward} title="Previous frame" aria-label="Previous frame">&#9664;</button>
			<button onclick={togglePlayback} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}>
				{playing ? '⏸' : '▶'}
			</button>
			<button onclick={stepForward} title="Next frame" aria-label="Next frame">&#9654;</button>
			<span class="frame-info" aria-live="polite">
				{currentIndex + 1}/{frames.length}
			</span>
		</div>
	{/if}
</div>

<style>
	.animation-player {
		background: #000;
	}

	.frame-container {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
	}

	.frame-container img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.progress-bar {
		height: 3px;
		background: var(--bg-secondary);
	}

	.progress-fill {
		height: 100%;
		background: var(--accent-blue);
		transition: width 0.1s linear;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-card);
	}

	.controls button {
		background: none;
		border: 1px solid var(--border-default);
		color: var(--text-primary);
		padding: 4px 8px;
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-size: 0.75rem;
		line-height: 1;
	}

	.controls button:hover {
		background: var(--bg-secondary);
	}

	.frame-info {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.player-loading {
		padding: var(--space-lg);
	}

	.loading-placeholder {
		width: 100%;
		aspect-ratio: 1;
		background: var(--bg-secondary);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
