// api.ts v0.4.0 — API response contracts for /api/v1/* endpoints

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
	forecast_kp?: number;       // next 3-hour window predicted Kp
	forecast_time?: string;     // start of that forecast window (ISO 8601)
}

/** GET /api/v1/kp/estimated */
export interface KpEstimatedPoint {
	ts: string;
	kp: number;
	sample_count: number;
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

/** Discovered external link with override fields */
export interface SiteLink {
	id: number;
	url: string;
	link_text: string;
	page_path: string;
	first_seen: string;
	last_seen: string;
	last_status: number | null;
	last_check: string | null;
	override_url: string | null;
	override_text: string | null;
	action: 'default' | 'unlink' | 'remove';
}

/** Active override returned to layout for ExtLink resolution */
export interface LinkOverride {
	url: string;
	page_path: string;
	override_url: string | null;
	override_text: string | null;
	action: 'default' | 'unlink' | 'remove';
}

/** Check run metadata */
export interface LinkCheckRun {
	id: number;
	started_at: string;
	completed_at: string | null;
	trigger_type: 'scheduled' | 'manual';
	total_links: number;
	healthy_count: number;
	broken_count: number;
	status: 'running' | 'completed' | 'error';
}

/** Per-URL result within a check run */
export interface LinkCheckResult {
	id: number;
	run_id: number;
	url: string;
	ok: boolean;
	status_code: number | null;
	status_text: string | null;
	method: string | null;
	response_time_ms: number | null;
	found_on_pages: string;
	checked_at: string;
}
