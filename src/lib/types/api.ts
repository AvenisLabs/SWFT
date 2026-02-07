// api.ts v0.1.0 — API response contracts for /api/v1/* endpoints

/** Standard envelope wrapping all API responses */
export interface ApiResponse<T> {
	ok: boolean;
	data: T;
	data_freshness?: string; // ISO 8601 timestamp of freshest data
	cached?: boolean;
	error?: string;
}

/** GET /api/v1/kp */
export interface KpDataPoint {
	ts: string;
	kp: number;
	source: string;
}

/** GET /api/v1/kp/summary */
export interface KpSummary {
	current_kp: number;
	current_time: string;
	trend: 'rising' | 'falling' | 'stable';
	status: 'quiet' | 'unsettled' | 'active' | 'storm' | 'severe_storm';
	status_label: string;
	message: string;
	recent: KpDataPoint[];
}

/** GET /api/v1/alerts/active and /api/v1/alerts/recent */
export interface AlertItem {
	id: number;
	issue_time: string;
	product_id: string;
	event_type: string;
	severity: string;
	scale_type?: string;
	scale_value?: number;
	begins?: string;
	ends?: string;
	summary: string;
	message: string;
}

/** GET /api/v1/gnss/risk */
export interface GnssRiskResult {
	score: number;          // 0–100
	level: 'Low' | 'Moderate' | 'High' | 'Severe' | 'Extreme';
	factors: GnssRiskFactor[];
	advisory: string;       // operator guidance text
	updated_at: string;
}

export interface GnssRiskFactor {
	name: string;
	value: number | string;
	weight: number;
	contribution: number;   // weighted score 0–100
	detail: string;
}

/** GET /api/v1/panels */
export interface PanelDefinition {
	id: string;
	label: string;
	category: string;
	source_url: string;
	is_animation: boolean;
	update_interval_sec: number;
}

/** GET /api/v1/animations/[id]/manifest */
export interface AnimationManifest {
	id: string;
	frames: AnimationFrame[];
	frame_count: number;
	latest_time: string;
}

export interface AnimationFrame {
	url: string;
	time: string;
}

/** GET /api/v1/charts/kp */
export interface ChartResponse {
	url: string;
	content_type: string;
	cached: boolean;
}

/** GET /api/v1/events/recent */
export interface EventItem {
	id: number;
	event_type: string;
	severity: string;
	title: string;
	description?: string;
	begins: string;
	ends?: string;
	peak_time?: string;
	gnss_impact_level?: string;
	gnss_advisory?: string;
}

/** GET /api/v1/news */
export interface NewsItem {
	id: number;
	title: string;
	url: string;
	published_at?: string;
	summary?: string;
	image_url?: string;
}

/** GET /api/v1/status */
export interface StatusResponse {
	status: 'ok' | 'degraded' | 'error';
	last_kp_ingest?: string;
	last_alert_ingest?: string;
	last_solarwind_ingest?: string;
	kp_row_count: number;
	alert_row_count: number;
	solarwind_row_count: number;
	version: string;
}
