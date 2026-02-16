// constants.ts v0.6.0 — NOAA data source URLs, panel definitions, thresholds

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
	KP_ESTIMATED_1M: '/json/planetary_k_index_1m.json',
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

/** GNSS risk model weights — Kp is the primary ionospheric disruption indicator */
export const GNSS_WEIGHTS = {
	KP: 0.40,
	BZ: 0.25,
	SPEED: 0.20,
	R_SCALE: 0.15,
} as const;

/** Kp-based floor scores — storms must register at least this risk level.
 *  Prevents the GNSS card from contradicting the Kp card during storms. */
export const GNSS_KP_FLOORS: readonly { minKp: number; minScore: number }[] = [
	{ minKp: 8, minScore: 80 }, // G4 → Extreme
	{ minKp: 7, minScore: 60 }, // G3 → Severe
	{ minKp: 6, minScore: 50 }, // G2 → High
	{ minKp: 5, minScore: 40 }, // G1 → High
	{ minKp: 4, minScore: 25 }, // Active → Moderate
] as const;

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
	KP_ESTIMATED: 120,
	STATUS: 30,
	NEWS: 300,
	EVENTS: 180,
	KP_SOURCES: 180,
} as const;

/** Human-readable labels for all Kp data sources */
export const KP_SOURCE_LABELS: Record<string, string> = {
	noaa: 'NOAA Estimated Kp',
	noaa_boulder: 'NOAA Boulder K-index',
	noaa_estimated: 'NOAA Estimated Kp',
	noaa_forecast: 'NOAA Kp Forecast (3-hour)',
	gfz: 'GFZ Potsdam Hp30',
	bom: 'Australian BoM K-index',
} as const;

/** Australian Bureau of Meteorology Space Weather API */
export const BOM_API_BASE = 'https://sws-data.sws.bom.gov.au/api/v1';

/** App metadata */
export const APP_VERSION = '0.1.0';
