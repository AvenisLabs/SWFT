<!-- +page.svelte v0.3.0 — GNSS Risk Levels for Drone & Survey Operations -->
<script lang="ts">
	import ExtLink from '$lib/components/ExtLink.svelte';
</script>

<svelte:head>
	<title>GNSS Risk Levels for Drone &amp; Survey Operations — SWFT</title>
	<meta name="description" content="Operational risk framework for drone RTK and survey GNSS performance based on the Kp index, scintillation risk, and geomagnetic conditions." />
</svelte:head>

<main class="dashboard">
	<article class="article">
		<header class="article-header">
			<nav class="breadcrumb">
				<a href="/gnss-reliability">GNSS Reliability Guide</a>
				<span class="separator">/</span>
				<span>Risk Levels</span>
			</nav>
			<h1>GNSS Risk Levels for Drone &amp; Survey Operations</h1>
			<p class="subtitle">A practical risk framework for mission planning based on the Kp index, scintillation, and geomagnetic conditions</p>
		</header>



		<!-- Overview -->
		<section class="article-section">
			<h2>Overview</h2>
			<p>
				GNSS performance depends heavily on space weather conditions, particularly geomagnetic activity and <a href="/gnss-reliability/ionospheric-delay">ionospheric stability</a>. While satellites themselves continue operating during solar events, the atmosphere signals travel through can become highly disturbed.
			</p>
			<p>
				This page provides a practical risk framework for drone and survey operations based primarily on the <strong>Kp Index</strong>, along with expected scintillation risk and operational impact.
			</p>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/products/planetary-k-index">NOAA Space Weather Prediction Center — Planetary K Index</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://swe.ssa.esa.int/ionospheric-weather">ESA Space Weather Service — Ionospheric Weather &amp; GNSS Effects</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Think of GNSS conditions like sea state for navigation. Calm seas allow precise positioning. Rough seas introduce uncertainty even if the vessel itself is functioning perfectly.</p>
			</aside>
		</section>

		<!-- GNSS Operational Risk Levels -->
		<section class="article-section">
			<h2>GNSS Operational Risk Levels</h2>
			<div class="table-wrapper">
				<table class="risk-table">
					<thead>
						<tr>
							<th>Risk Level</th>
							<th>Kp</th>
							<th>Scintillation</th>
							<th>Drone RTK Performance</th>
							<th>Survey Static Performance</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><span class="risk-dot green"></span> <strong>Minimal</strong></td>
							<td>0&ndash;1</td>
							<td>Very Low</td>
							<td>Ideal conditions; stable FIX</td>
							<td>Excellent accuracy</td>
						</tr>
						<tr>
							<td><span class="risk-dot green"></span> <strong>Low</strong></td>
							<td>2</td>
							<td>Low</td>
							<td>Normal operations</td>
							<td>Excellent reliability</td>
						</tr>
						<tr>
							<td><span class="risk-dot yellow"></span> <strong>Moderate</strong></td>
							<td>3&ndash;4</td>
							<td>Low&ndash;Moderate</td>
							<td>Occasional instability possible</td>
							<td>Minor noise increase</td>
						</tr>
						<tr>
							<td><span class="risk-dot orange"></span> <strong>Elevated</strong></td>
							<td>5</td>
							<td>Moderate</td>
							<td>FIX may drop intermittently</td>
							<td>Reduced precision possible</td>
						</tr>
						<tr>
							<td><span class="risk-dot red"></span> <strong>High</strong></td>
							<td>6</td>
							<td>High</td>
							<td>Frequent FLOAT conditions</td>
							<td>Noticeable degradation</td>
						</tr>
						<tr>
							<td><span class="risk-dot red"></span> <strong>Very High</strong></td>
							<td>7</td>
							<td>Very High</td>
							<td>RTK unreliable for precision mapping</td>
							<td>Significant noise and bias</td>
						</tr>
						<tr>
							<td><span class="risk-dot black"></span> <strong>Severe</strong></td>
							<td>8</td>
							<td>Extreme</td>
							<td>Precision operations not recommended</td>
							<td>Poor solution quality likely</td>
						</tr>
						<tr>
							<td><span class="risk-dot black"></span> <strong>Critical</strong></td>
							<td>9</td>
							<td>Extreme</td>
							<td>Major GNSS disruption possible</td>
							<td>Results may be unusable</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/noaa-scales-explanation">NOAA Space Weather Scales Explanation</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://www.spaceweather.gc.ca/forecast-prevision/short-court/desc-en.php">Natural Resources Canada — Geomagnetic Activity Levels</ExtLink>
			</p>
		</section>

		<!-- What Changes as Risk Increases -->
		<section class="article-section">
			<h2>What Changes as Risk Increases</h2>

			<h3>Minimal to Low (Kp 0&ndash;2)</h3>
			<ul class="effect-list">
				<li>Stable ionosphere</li>
				<li>Reliable satellite tracking</li>
				<li>Fast RTK initialization</li>
				<li>High repeatability</li>
			</ul>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like surveying on a calm day with no wind &mdash; conditions are predictable and measurements are consistent.</p>
			</aside>

			<h3>Moderate (Kp 3&ndash;4)</h3>
			<ul class="effect-list">
				<li>Minor ionospheric disturbances</li>
				<li>Slight RTK instability possible</li>
				<li>Small increases in noise</li>
			</ul>
			<p>High-latitude regions may experience stronger effects.</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Comparable to light chop on water &mdash; most operations proceed normally but precision tasks require attention.</p>
			</aside>

			<h3>Elevated (Kp 5)</h3>
			<ul class="effect-list">
				<li>Minor geomagnetic storm conditions (G1)</li>
				<li>Increased scintillation risk</li>
				<li>RTK reinitialization more likely</li>
				<li>Survey accuracy may degrade</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/phenomena/geomagnetic-storms">NOAA SWPC — Geomagnetic Storms</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like sailing in a building swell &mdash; still navigable, but the ride gets rougher and course corrections are constant.</p>
			</aside>

			<h3>High to Very High (Kp 6&ndash;7)</h3>
			<ul class="effect-list">
				<li>Strong ionospheric turbulence</li>
				<li>Frequent signal disruptions</li>
				<li>Cycle slips common</li>
				<li>Reduced satellite usability</li>
			</ul>
			<p>Drone mapping and high-precision surveys become risky.</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Similar to navigating rough seas &mdash; small vessels (high-precision systems) struggle first.</p>
			</aside>

			<h3>Severe to Critical (Kp 8&ndash;9)</h3>
			<ul class="effect-list">
				<li>Extreme geomagnetic storm conditions (G4&ndash;G5)</li>
				<li>Widespread signal degradation</li>
				<li>Possible loss of lock on multiple satellites</li>
				<li>Precision GNSS may be unusable</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://swe.ssa.esa.int">ESA Space Weather Portal</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Equivalent to navigating during a major storm &mdash; instruments still function, but reliable positioning becomes extremely difficult.</p>
			</aside>
		</section>

		<!-- Drone RTK vs Static Survey Sensitivity -->
		<section class="article-section">
			<h2>Drone RTK vs Static Survey Sensitivity</h2>
			<p>
				RTK workflows are typically affected first because they rely on continuous carrier-phase tracking. See <a href="/gnss-reliability/rtk-float-drops">why RTK drops to FLOAT</a> for details. Static surveys are more resilient due to long observation periods but can still produce degraded results during severe space weather events.
			</p>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Method</th>
							<th>Sensitivity to Space Weather</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>RTK / Network RTK</strong></td>
							<td>Very High</td>
						</tr>
						<tr>
							<td><strong>PPK</strong></td>
							<td>High</td>
						</tr>
						<tr>
							<td><strong>Static</strong></td>
							<td>Moderate</td>
						</tr>
						<tr>
							<td><strong>Long Static</strong></td>
							<td>Lower</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="reference">
				<ExtLink href="https://www.earthscope.org/data/gnss-realtime/">EarthScope Consortium — GNSS Real-Time Data</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>RTK is like a tightrope walker &mdash; extremely precise but sensitive. Static surveying is like a wide bridge &mdash; slower but more stable.</p>
			</aside>
		</section>

		<!-- Scintillation -->
		<section class="article-section">
			<h2>Scintillation: The Hidden Hazard</h2>
			<p>
				Ionospheric <a href="/gnss-reliability/glossary#scintillation">scintillation</a> causes rapid fluctuations in signal strength and phase, leading to tracking errors and loss of lock.
			</p>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/phenomena/ionospheric-scintillation">NOAA SWPC — Ionospheric Scintillation</ExtLink>
			</p>
			<h3>Effects include:</h3>
			<ul class="effect-list">
				<li>Receiver dropouts</li>
				<li>Increased measurement noise</li>
				<li>RTK solution instability</li>
			</ul>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like watching a distant light flicker through turbulent air &mdash; sometimes clear, sometimes distorted.</p>
			</aside>
		</section>

		<!-- Mission Planning -->
		<section class="article-section">
			<h2>How to Use This Page in Mission Planning</h2>
			<p>Before conducting precision GNSS work:</p>
			<ol class="mission-steps">
				<li>Check current Kp index using the live banner above or the <a href="/gnss">GNSS Risk Assessment</a> page</li>
				<li>Review forecasts for geomagnetic storms</li>
				<li>Consider project accuracy requirements against the risk table</li>
				<li>Plan mitigation strategies if risk is elevated</li>
			</ol>
		</section>

		<!-- Risk Mitigation -->
		<section class="article-section">
			<h2>Risk Mitigation Strategies</h2>
			<ul class="effect-list">
				<li>Schedule work during geomagnetically quiet periods</li>
				<li>Increase observation time for static surveys</li>
				<li>Use ground control points</li>
				<li>Perform repeat observations</li>
				<li>Monitor real-time conditions</li>
			</ul>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Just as pilots adjust routes based on weather forecasts, GNSS professionals should adjust plans based on space weather.</p>
			</aside>
		</section>

		<!-- Key Takeaways -->
		<section class="article-section">
			<h2>Key Takeaways</h2>
			<ul class="effect-list takeaways">
				<li>GNSS accuracy depends on atmospheric stability, not just equipment quality</li>
				<li>The Kp index provides a useful global indicator of risk</li>
				<li>RTK systems are most sensitive to disturbances</li>
				<li>Severe storms can compromise even high-end survey workflows</li>
			</ul>
			<p class="bottom-line">
				<strong>Bottom line:</strong> Space weather is an operational factor that should be monitored just like wind, precipitation, or visibility.
			</p>
		</section>

		<!-- Authoritative Resources -->
		<section class="article-section sources">
			<h2>Authoritative Resources</h2>
			<ul class="source-list">
				<li><ExtLink href="https://www.swpc.noaa.gov">NOAA Space Weather Prediction Center</ExtLink></li>
				<li><ExtLink href="https://www.swpc.noaa.gov/products/planetary-k-index">NOAA Planetary K Index</ExtLink></li>
				<li><ExtLink href="https://swe.ssa.esa.int">ESA Space Weather Portal</ExtLink></li>
				<li><ExtLink href="https://swe.ssa.esa.int/ionospheric-weather">ESA Ionospheric Weather Service</ExtLink></li>
				<li><ExtLink href="https://igs.org">International GNSS Service</ExtLink></li>
				<li><ExtLink href="https://www.earthscope.org">EarthScope Consortium</ExtLink></li>
				<li><ExtLink href="https://testbed.spaceweather.gov/exercises/2025-gnss-user-engagement">NOAA GNSS &amp; Space Weather User Engagement</ExtLink></li>
			</ul>
		</section>

		<!-- Navigation -->
		<footer class="article-footer">
			<p class="guide-note">This page is a permanent reference within the <a href="/gnss-reliability">GNSS Reliability &amp; Space Weather Guide</a>.</p>
			<nav class="article-nav">
				<a href="/gnss-reliability">&larr; Back to guide</a>
				<a href="/">Dashboard</a>
			</nav>
		</footer>
	</article>
</main>

<style>
	.article {
		max-width: 780px;
		margin: 0 auto;
	}

	.article-header {
		margin-bottom: var(--space-xl);
	}

	.breadcrumb {
		font-size: 0.8rem;
		margin-bottom: var(--space-md);
	}

	.breadcrumb a {
		color: var(--accent-blue);
	}

	.breadcrumb .separator {
		color: var(--text-muted);
		margin: 0 var(--space-xs);
	}

	.breadcrumb span:last-child {
		color: var(--text-secondary);
	}

	.article-header h1 {
		font-size: var(--font-size-2xl);
		line-height: 1.2;
		margin-bottom: var(--space-sm);
	}

	/* Article sections */
	.article-section {
		margin-bottom: var(--space-2xl);
	}

	.article-section h2 {
		font-size: var(--font-size-xl);
		color: var(--text-primary);
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--border-default);
	}

	.article-section h3 {
		font-size: var(--font-size-base);
		color: var(--text-secondary);
		font-weight: 600;
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
	}

	.article-section p {
		color: var(--text-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	/* Effect / bullet lists */
	.effect-list {
		list-style: none;
		margin-bottom: var(--space-md);
	}

	.effect-list li {
		color: var(--text-secondary);
		padding: var(--space-xs) 0;
		padding-left: var(--space-lg);
		position: relative;
		line-height: 1.6;
	}

	.effect-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.7em;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent-blue);
	}

	.takeaways li {
		font-weight: 500;
		color: var(--text-primary);
	}

	/* Mission planning ordered list */
	.mission-steps {
		margin-bottom: var(--space-md);
		padding-left: var(--space-xl);
	}

	.mission-steps li {
		color: var(--text-secondary);
		padding: var(--space-xs) 0;
		line-height: 1.6;
	}

	.mission-steps a {
		color: var(--accent-blue);
	}

	.bottom-line {
		background: var(--bg-card);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--border-radius);
		border-left: 3px solid var(--accent-blue);
		color: var(--text-primary) !important;
	}

	/* Tables */
	.table-wrapper {
		overflow-x: auto;
		margin-bottom: var(--space-md);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	thead {
		border-bottom: 2px solid var(--border-default);
	}

	th {
		text-align: left;
		padding: var(--space-sm) var(--space-md);
		color: var(--text-primary);
		font-weight: 600;
		white-space: nowrap;
	}

	td {
		padding: var(--space-sm) var(--space-md);
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-default);
	}

	td strong {
		color: var(--text-primary);
	}

	/* Risk dot indicators in table */
	.risk-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-right: var(--space-xs);
		vertical-align: middle;
	}

	.risk-dot.green { background: var(--severity-green, #4ade80); }
	.risk-dot.yellow { background: var(--severity-yellow, #facc15); }
	.risk-dot.orange { background: var(--severity-orange, #fb923c); }
	.risk-dot.red { background: var(--severity-red, #f87171); }
	.risk-dot.black { background: #6b7280; }

	/* Analogy callouts */
	.analogy {
		background: var(--bg-card);
		border-left: 3px solid var(--accent-blue);
		border-radius: 0 var(--border-radius) var(--border-radius) 0;
		padding: var(--space-md) var(--space-lg);
		margin: var(--space-md) 0;
	}

	.analogy-label {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-blue);
		margin-bottom: var(--space-xs);
	}

	.analogy p {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
		margin-bottom: 0;
		font-style: italic;
	}

	/* References */
	.reference {
		font-size: 0.8rem;
	}

	.reference :global(a) {
		color: var(--accent-blue);
	}

	/* Source list */
	.source-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.source-list li {
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
	}

	.source-list :global(a) {
		color: var(--accent-blue);
		font-size: var(--font-size-sm);
	}

	/* Article footer */
	.article-footer {
		border-top: 1px solid var(--border-default);
		padding-top: var(--space-lg);
		margin-top: var(--space-xl);
	}

	.guide-note {
		color: var(--text-muted);
		font-size: 0.8rem;
		margin-bottom: var(--space-md);
	}

	.guide-note a {
		color: var(--accent-blue);
	}

	.article-nav {
		display: flex;
		gap: var(--space-lg);
	}

	.article-nav a {
		color: var(--accent-blue);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 640px) {
		.article-header h1 {
			font-size: var(--font-size-xl);
		}

		th, td {
			padding: var(--space-xs) var(--space-sm);
			font-size: 0.8rem;
		}

	}
</style>
