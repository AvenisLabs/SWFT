// noaa.ts v0.2.0 — Raw NOAA data shapes (all values are strings from the API)

/** planetary-k-index.json row: [time_tag, Kp, a_running, station_count] */
export type NoaaKpRow = [string, string, string, string];

/** noaa-planetary-k-index-forecast.json row: [time_tag, kp, observed, noaa_scale] */
export type NoaaKpForecastRow = [string, string, string, string];

/** alerts.json object */
export interface NoaaAlert {
	product_id: string;
	issue_datetime: string;
	message: string;
}

/** solar-wind/plasma-7-day.json row: [time_tag, density, speed, temperature] */
export type NoaaPlasmaRow = [string, string, string, string];

/** solar-wind/mag-7-day.json row: [time_tag, bx_gsm, by_gsm, bz_gsm, lon_gsm, lat_gsm, bt] */
export type NoaaMagRow = [string, string, string, string, string, string, string];

/** noaa-scales.json R/S/G sub-object */
export interface NoaaScaleEntry {
	Scale: string;
	Text: string;
}

/** noaa-scales.json top-level structure — keys "0"-"3" and "-1" */
export interface NoaaScalesResponse {
	[key: string]: {
		R: NoaaScaleEntry;
		S: NoaaScaleEntry;
		G: NoaaScaleEntry;
		DateStamp: string;
		TimeStamp: string;
	};
}

/** Animation manifest entry */
export interface NoaaAnimationFrame {
	url: string;
}

/** summary/solar-wind-speed.json */
export interface NoaaWindSpeedSummary {
	WindSpeed: string;
	TimeStamp: string;
}
