// ingest-alerts.ts v0.2.0 — Alert ingestion with dedup + classification

import { fetchAlerts } from '../lib/noaa-client';
import { insertAlert, insertClassifiedAlert, updateCronState } from '../lib/db';

/** SHA-256 hex hash of a string */
async function sha256(text: string): Promise<string> {
	const data = new TextEncoder().encode(text);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Classify alert message into event type and severity */
function classifyAlert(message: string, productId: string): {
	event_type: string;
	severity: string;
	scale_type: string | null;
	scale_value: number | null;
	begins: string | null;
	ends: string | null;
	summary: string;
} {
	const msgUpper = message.toUpperCase();

	// Detect NOAA scale references (G1-G5, S1-S5, R1-R5)
	let scale_type: string | null = null;
	let scale_value: number | null = null;
	const scaleMatch = message.match(/([GSR])(\d)\s/);
	if (scaleMatch) {
		scale_type = scaleMatch[1];
		scale_value = parseInt(scaleMatch[2], 10);
	}

	// Classify event type based on message keywords
	let event_type = 'other';
	let severity = 'minor';

	if (msgUpper.includes('GEOMAGNETIC') || msgUpper.includes('K-INDEX') || scale_type === 'G') {
		event_type = 'geomagnetic_storm';
	} else if (msgUpper.includes('SOLAR RADIATION') || msgUpper.includes('PROTON') || scale_type === 'S') {
		event_type = 'solar_radiation';
	} else if (msgUpper.includes('RADIO BLACKOUT') || msgUpper.includes('X-RAY') || scale_type === 'R') {
		event_type = 'radio_blackout';
	} else if (msgUpper.includes('SOLAR FLARE') || msgUpper.includes('FLARE')) {
		event_type = 'solar_flare';
	} else if (msgUpper.includes('CME') || msgUpper.includes('CORONAL MASS')) {
		event_type = 'cme';
	} else if (msgUpper.includes('WATCH')) {
		event_type = 'watch';
	} else if (msgUpper.includes('WARNING')) {
		event_type = 'warning';
	}

	// Determine severity from scale value or keywords
	if (scale_value !== null) {
		if (scale_value <= 2) severity = 'minor';
		else if (scale_value === 3) severity = 'moderate';
		else if (scale_value === 4) severity = 'strong';
		else severity = 'extreme';
	} else if (msgUpper.includes('EXTREME')) {
		severity = 'extreme';
	} else if (msgUpper.includes('SEVERE')) {
		severity = 'strong';
	} else if (msgUpper.includes('STRONG')) {
		severity = 'moderate';
	}

	// Extract timestamps if present
	let begins: string | null = null;
	let ends: string | null = null;

	const beginMatch = message.match(/Begin:\s*(\d{4}\s\w+\s\d+\s\d{4})/);
	if (beginMatch) begins = beginMatch[1];

	const endMatch = message.match(/End:\s*(\d{4}\s\w+\s\d+\s\d{4})/);
	if (endMatch) ends = endMatch[1];

	// Build a short summary from first meaningful line
	const lines = message.split('\n').filter(l => l.trim().length > 0);
	const summary = lines.find(l =>
		!l.startsWith('Space Weather Message Code') &&
		!l.startsWith('Serial Number') &&
		!l.startsWith('Issue Time')
	)?.trim() ?? lines[0]?.trim() ?? 'Alert';

	return { event_type, severity, scale_type, scale_value, begins, ends, summary };
}

export async function ingestAlerts(db: D1Database): Promise<{ inserted: number }> {
	try {
		const alerts = await fetchAlerts();
		let inserted = 0;

		for (const alert of alerts) {
			const contentHash = await sha256(alert.message);
			const rawId = await insertAlert(db, {
				issue_time: alert.issue_time,
				message: alert.message,
				product_id: alert.product_id,
				raw_source: JSON.stringify(alert),
				content_hash: contentHash,
			});

			// If inserted (not duplicate), classify it
			if (rawId !== null) {
				const classified = classifyAlert(alert.message, alert.product_id);
				await insertClassifiedAlert(db, {
					raw_alert_id: rawId,
					...classified,
				});
				inserted++;
			}
		}

		await updateCronState(db, 'ingest-alerts', 'ok', inserted);
		return { inserted };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		await updateCronState(db, 'ingest-alerts', 'error', 0, msg);
		throw err;
	}
}
