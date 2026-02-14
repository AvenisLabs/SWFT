// charts.ts v0.3.0 — QuickChart.io client for server-rendered chart PNGs

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll } from './db';

interface KpChartRow {
	ts: string;
	kp: number;
}

/** Build a QuickChart.io URL for a Kp bar chart */
export async function buildKpChartUrl(db: D1Database, hours = 48): Promise<string> {
	// datetime(ts) normalises ISO 8601 'T'/'Z' format so the comparison works correctly
	// Filter out future timestamps — NOAA data includes predictions
	const rows = await queryAll<KpChartRow>(
		db,
		`SELECT ts, kp_value as kp FROM kp_obs
		 WHERE datetime(ts) > datetime('now', ? || ' hours')
		   AND datetime(ts) <= datetime('now')
		 ORDER BY ts ASC`,
		[`-${hours}`]
	);

	// Format labels as short timestamps
	const labels = rows.map(r => {
		const d = new Date(r.ts);
		return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.getUTCHours().toString().padStart(2, '0')}`;
	});

	const values = rows.map(r => r.kp);

	// Color each bar based on Kp severity
	const colors = values.map(kp => {
		if (kp >= 8) return '#ff4466';
		if (kp >= 7) return '#f85149';
		if (kp >= 5) return '#db6d28';
		if (kp >= 4) return '#d29922';
		return '#3fb950';
	});

	const chartConfig = {
		type: 'bar',
		data: {
			labels,
			datasets: [{
				label: 'Kp Index',
				data: values,
				backgroundColor: colors,
				borderWidth: 0,
			}],
		},
		options: {
			scales: {
				yAxes: [{
					ticks: { min: 0, max: 9, stepSize: 1 },
					gridLines: { color: 'rgba(255,255,255,0.1)' },
				}],
				xAxes: [{
					ticks: { maxRotation: 45, fontSize: 9 },
					gridLines: { display: false },
				}],
			},
			legend: { display: false },
			plugins: {
				annotation: {
					annotations: [
						{ type: 'line', mode: 'horizontal', scaleID: 'y-axis-0', value: 4, borderColor: '#d29922', borderWidth: 1, borderDash: [5, 5], label: { content: 'Active', enabled: true, fontSize: 9 } },
						{ type: 'line', mode: 'horizontal', scaleID: 'y-axis-0', value: 5, borderColor: '#f85149', borderWidth: 1, borderDash: [5, 5], label: { content: 'Storm', enabled: true, fontSize: 9 } },
					],
				},
			},
		},
	};

	const configStr = encodeURIComponent(JSON.stringify(chartConfig));
	return `https://quickchart.io/chart?c=${configStr}&w=600&h=300&bkg=%230d1117&f=sans-serif`;
}

/** Fetch chart PNG from QuickChart.io */
export async function fetchKpChartPng(db: D1Database, hours = 48): Promise<Response> {
	const url = await buildKpChartUrl(db, hours);
	const res = await fetch(url);

	if (!res.ok) {
		throw new Error(`QuickChart returned ${res.status}`);
	}

	return new Response(res.body, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=900',
		},
	});
}
