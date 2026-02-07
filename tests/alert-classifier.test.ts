// alert-classifier.test.ts v0.1.0 — Unit tests for alert message classification

import { describe, it, expect } from 'vitest';

// Replicate the classification logic from the cron worker for isolated testing
function classifyAlert(message: string, productId: string) {
	const msgUpper = message.toUpperCase();

	let scale_type: string | null = null;
	let scale_value: number | null = null;
	const scaleMatch = message.match(/([GSR])(\d)\s/);
	if (scaleMatch) {
		scale_type = scaleMatch[1];
		scale_value = parseInt(scaleMatch[2], 10);
	}

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

	return { event_type, severity, scale_type, scale_value };
}

describe('Alert Classifier', () => {
	describe('Event type detection', () => {
		it('classifies geomagnetic storm alerts', () => {
			const result = classifyAlert('Geomagnetic Storm Warning G2 in effect', 'WATA20');
			expect(result.event_type).toBe('geomagnetic_storm');
			expect(result.scale_type).toBe('G');
			expect(result.scale_value).toBe(2);
		});

		it('classifies radio blackout alerts', () => {
			const result = classifyAlert('Radio Blackout R3 observed', 'ALTTP2');
			expect(result.event_type).toBe('radio_blackout');
			expect(result.scale_type).toBe('R');
			expect(result.scale_value).toBe(3);
		});

		it('classifies solar radiation alerts', () => {
			const result = classifyAlert('Solar Radiation Storm S1 warning issued', 'WATAS');
			expect(result.event_type).toBe('solar_radiation');
			expect(result.scale_type).toBe('S');
			expect(result.scale_value).toBe(1);
		});

		it('classifies CME alerts', () => {
			const result = classifyAlert('CME detected with Earth-directed component', 'CME');
			expect(result.event_type).toBe('cme');
		});

		it('classifies solar flare alerts', () => {
			const result = classifyAlert('Solar flare of class X2.1 observed', 'FLARE');
			expect(result.event_type).toBe('solar_flare');
		});

		it('defaults to "other" for unrecognized messages', () => {
			const result = classifyAlert('Summary of conditions today', 'SUM');
			expect(result.event_type).toBe('other');
		});
	});

	describe('Severity from NOAA scale', () => {
		it('R1 = minor', () => {
			const r = classifyAlert('Radio Blackout R1 minor', '');
			expect(r.severity).toBe('minor');
		});

		it('R2 = minor', () => {
			const r = classifyAlert('Radio Blackout R2 moderate event', '');
			expect(r.severity).toBe('minor');
		});

		it('G3 = moderate', () => {
			const r = classifyAlert('Geomagnetic Storm G3 strong', '');
			expect(r.severity).toBe('moderate');
		});

		it('S4 = strong', () => {
			const r = classifyAlert('Solar Radiation Storm S4 severe', '');
			expect(r.severity).toBe('strong');
		});

		it('G5 = extreme', () => {
			const r = classifyAlert('Geomagnetic Storm G5 extreme', '');
			expect(r.severity).toBe('extreme');
		});
	});

	describe('Severity from keywords (no scale)', () => {
		it('detects extreme from keyword', () => {
			const r = classifyAlert('Extreme conditions observed in the ionosphere', '');
			expect(r.severity).toBe('extreme');
		});

		it('detects severe/strong from keyword', () => {
			const r = classifyAlert('Severe geomagnetic conditions expected', '');
			expect(r.severity).toBe('strong');
		});

		it('defaults to minor', () => {
			const r = classifyAlert('Quiet conditions expected', '');
			expect(r.severity).toBe('minor');
		});
	});

	describe('Scale extraction', () => {
		it('extracts G-scale', () => {
			const r = classifyAlert('G3 warning issued', '');
			expect(r.scale_type).toBe('G');
			expect(r.scale_value).toBe(3);
		});

		it('extracts R-scale', () => {
			const r = classifyAlert('R5 extreme radio blackout', '');
			expect(r.scale_type).toBe('R');
			expect(r.scale_value).toBe(5);
		});

		it('returns null for no scale', () => {
			const r = classifyAlert('No scale reference here', '');
			expect(r.scale_type).toBeNull();
			expect(r.scale_value).toBeNull();
		});
	});
});
