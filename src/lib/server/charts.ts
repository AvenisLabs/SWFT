// charts.ts v0.5.0 — QuickChart.io client for server-rendered chart PNGs.
// Reads from kp_estimated (15-min buffer, 24h retention) since kp_obs was dropped
// in migration 0007. Default window reduced 48h -> 24h to match buffer retention.

import type { D1Database } from '@cloudflare/workers-types';
import { queryAll } from './db';

interface KpChartRow {
	ts: string;
	kp: number;
}

/** Build a QuickChart.io URL for a Kp bar chart.
 *  Pulls from kp_estimated (15-min buckets, up to 24h retention). */
export async function buildKpChartUrl(db: D1Database, hours = 24): Promise<string> {
	const cappedHours = Math.min(hours, 24);
	const lowerBound = new Date(Date.now() - cappedHours * 3600_000).toISOString();
	const upperBound = new Date().toISOString();
	const rows = await queryAll<KpChartRow>(
		db,
		`SELECT ts, kp_value as kp FROM kp_estimated
		 WHERE ts > ? AND ts <= ?
		 ORDER BY ts ASC`,
		[lowerBound, upperBound]
	);

	const labels = rows.map(r => {
		const d = new Date(r.ts);
		return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.getUTCHours().toString().padStart(2, '0')}`;
	});

	const values = rows.map(r => r.kp);

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
export async function fetchKpChartPng(db: D1Database, hours = 24): Promise<Response> {
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
