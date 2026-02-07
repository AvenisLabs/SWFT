// panels.ts v0.2.0 — Panel/animation manifest logic

import { PANEL_DEFINITIONS, NOAA_BASE } from './constants';
import type { PanelDefinition, AnimationManifest, AnimationFrame } from '$types/api';

/** Get all panel definitions */
export function getAllPanels(): PanelDefinition[] {
	return PANEL_DEFINITIONS.map(p => ({
		id: p.id,
		label: p.label,
		category: p.category,
		source_url: p.source_url,
		is_animation: p.is_animation,
		update_interval_sec: p.update_interval_sec,
	}));
}

/** Get a single panel definition by id */
export function getPanelById(id: string): PanelDefinition | null {
	const panel = PANEL_DEFINITIONS.find(p => p.id === id);
	if (!panel) return null;
	return {
		id: panel.id,
		label: panel.label,
		category: panel.category,
		source_url: panel.source_url,
		is_animation: panel.is_animation,
		update_interval_sec: panel.update_interval_sec,
	};
}

/** Parse NOAA animation manifest into normalized frames with timestamps */
function parseTimestampFromUrl(url: string): string {
	// NOAA frame URLs contain timestamps in filenames like:
	// suvi-primary-304_2025_01_15_12_00.png
	const match = url.match(/(\d{4})_(\d{2})_(\d{2})_(\d{2})(\d{2})/);
	if (match) {
		return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00Z`;
	}
	return new Date().toISOString();
}

/** Fetch + normalize an animation manifest from NOAA */
export async function fetchAnimationManifest(panelId: string): Promise<AnimationManifest | null> {
	const panel = PANEL_DEFINITIONS.find(p => p.id === panelId);
	if (!panel || !panel.is_animation) return null;

	const res = await fetch(panel.source_url);
	if (!res.ok) return null;

	const raw = await res.json() as Array<{ url: string }>;
	if (!Array.isArray(raw) || raw.length === 0) return null;

	const frames: AnimationFrame[] = raw.map(entry => {
		// Ensure URL is absolute
		const url = entry.url.startsWith('http') ? entry.url : `${NOAA_BASE}${entry.url}`;
		return {
			url,
			time: parseTimestampFromUrl(entry.url),
		};
	});

	// Sort chronologically
	frames.sort((a, b) => a.time.localeCompare(b.time));

	return {
		id: panelId,
		frames,
		frame_count: frames.length,
		latest_time: frames[frames.length - 1]?.time ?? '',
	};
}

/** Fetch the latest frame URL for a panel (most recent image) */
export async function fetchLatestFrame(panelId: string): Promise<{ url: string; time: string } | null> {
	const manifest = await fetchAnimationManifest(panelId);
	if (!manifest || manifest.frames.length === 0) return null;

	return manifest.frames[manifest.frames.length - 1];
}
