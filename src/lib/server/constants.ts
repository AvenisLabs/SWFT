// constants.ts v0.2.0 — NOAA data source URLs, panel definitions, thresholds

/** Base URL for all NOAA JSON product endpoints */
export const NOAA_BASE = 'https://services.swpc.noaa.gov';

/** NOAA product endpoint paths */
export const NOAA_ENDPOINTS = {
	KP_INDEX: '/products/noaa-planetary-k-index.json',
	KP_FORECAST: '/products/noaa-planetary-k-index-forecast.json',
	ALERTS: '/products/alerts.json',
	PLASMA_7DAY: '/products/solar-wind/plasma-7-day.json',
	MAG_7DAY: '/products/solar-wind/mag-7-day.json',
	NOAA_SCALES: '/products/noaa-scales.json',
	WIND_SPEED_SUMMARY: '/products/summary/solar-wind-speed.json',
} as const;

/** Full URLs for convenience */
export const NOAA_URLS = Object.fromEntries(
	Object.entries(NOAA_ENDPOINTS).map(([k, v]) => [k, `${NOAA_BASE}${v}`])
) as Record<keyof typeof NOAA_ENDPOINTS, string>;

/** Animation/panel product definitions for SUVI, LASCO, etc. */
export const PANEL_DEFINITIONS = [
	{
		id: 'suvi-304',
		label: 'SUVI 304Å',
		category: 'solar',
		source_url: `${NOAA_BASE}/products/animations/suvi-primary-304.json`,
		is_animation: true,
		update_interval_sec: 420, // ~7 min
	},
	{
		id: 'suvi-195',
		label: 'SUVI 195Å',
		category: 'solar',
		source_url: `${NOAA_BASE}/products/animations/suvi-primary-195.json`,
		is_animation: true,
		update_interval_sec: 420,
	},
	{
		id: 'suvi-171',
		label: 'SUVI 171Å',
		category: 'solar',
		source_url: `${NOAA_BASE}/products/animations/suvi-primary-171.json`,
		is_animation: true,
		update_interval_sec: 420,
	},
	{
		id: 'lasco-c3',
		label: 'LASCO C3',
		category: 'coronagraph',
		source_url: `${NOAA_BASE}/products/animations/lasco-c3.json`,
		is_animation: true,
		update_interval_sec: 720,
	},
	{
		id: 'ovation-north',
		label: 'Aurora (North)',
		category: 'aurora',
		source_url: `${NOAA_BASE}/products/animations/ovation-north.json`,
		is_animation: true,
		update_interval_sec: 600,
	},
] as const;

/** Kp thresholds for status classification */
export const KP_THRESHOLDS = {
	QUIET: 3,       // Kp 0–3: quiet
	ACTIVE: 4,      // Kp 4: unsettled/active
	STORM: 5,       // Kp 5–6: storm
	SEVERE: 7,      // Kp 7+: severe storm
	EXTREME: 8,     // Kp 8–9: extreme
} as const;

/** GNSS risk model weights */
export const GNSS_WEIGHTS = {
	KP: 0.35,
	BZ: 0.25,
	SPEED: 0.20,
	R_SCALE: 0.20,
} as const;

/** Cache TTLs in seconds */
export const CACHE_TTL = {
	KP_SUMMARY: 120,
	ALERTS: 180,
	SOLARWIND: 120,
	GNSS_RISK: 120,
	PANELS: 120,
	ANIMATION_MANIFEST: 120,
	FRAME_IMAGE: 900,
	CHART_PNG: 900,
	STATUS: 30,
	NEWS: 300,
	EVENTS: 180,
} as const;

/** App metadata */
export const APP_VERSION = '0.1.0';
