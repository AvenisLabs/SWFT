<!-- +page.svelte v0.1.0 — When Should Drone Pilots Cancel Missions? -->
<script lang="ts">
	import ExtLink from '$lib/components/ExtLink.svelte';
</script>

<svelte:head>
	<title>When Should Drone Pilots Cancel Missions? — SWFT</title>
	<meta name="description" content="Practical Kp thresholds, RTK warning signs, and a go/mitigate/no-go decision framework for commercial drone pilots and mapping crews facing space weather." />
</svelte:head>

<main class="dashboard">
	<article class="article">
		<header class="article-header">
			<nav class="breadcrumb">
				<a href="/gnss-reliability">GNSS Reliability Guide</a>
				<span class="separator">/</span>
				<span>Cancel Missions</span>
			</nav>
			<h1>When Should Drone Pilots Cancel Missions?</h1>
			<p class="subtitle">Kp thresholds, risk indicators, and go/no-go decision criteria for precision drone operations</p>
		</header>

		<!-- Overview -->
		<section class="article-section">
			<h2>Overview</h2>
			<p>
				Most drone pilots carefully check wind, precipitation, airspace, and battery status before flight &mdash; but space weather can be just as critical for missions that rely on GPS or RTK positioning.
			</p>
			<p>
				Solar activity can degrade GNSS accuracy, disrupt RTK corrections, and compromise mapping results. In severe cases, missions may need to be postponed to avoid costly rework or unusable data.
			</p>
			<p>
				This guide provides practical thresholds and indicators for determining when to proceed and when to cancel.
			</p>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/impacts/gps-systems">NOAA Space Weather Prediction Center &mdash; GPS Systems Impacts</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://www.faa.gov/about/office_org/headquarters_offices/avs/offices/afx/afs/afs400/afs410/GNSS">FAA &mdash; GNSS Interference Resource Guide</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Ignoring space weather is like flying in strong winds that aren&rsquo;t visible &mdash; the drone may stay airborne, but precision tasks can fail.</p>
			</aside>
		</section>

		<!-- Key Indicators -->
		<section class="article-section">
			<h2>Key Indicators to Check Before Flight</h2>

			<h3>Kp Index (Geomagnetic Activity)</h3>
			<p>
				The <a href="/gnss-reliability/gnss-risk-levels">Kp index</a> is the fastest way to gauge global GNSS risk. It measures geomagnetic disturbance on a 0&ndash;9 scale, with NOAA&rsquo;s storm classifications (G1&ndash;G5) beginning at Kp 5.
			</p>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/products/planetary-k-index">NOAA &mdash; Planetary K Index</ExtLink>
			</p>

			<h3>Solar Radiation Storms (S-scale)</h3>
			<p>
				Proton events ionize the polar atmosphere, indirectly degrading GNSS signal quality through the <a href="/gnss-reliability/ionospheric-delay">ionosphere</a>. Satellite hardware in orbit can also be affected, reducing constellation availability.
			</p>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/noaa-scales-explanation">NOAA Space Weather Scales</ExtLink>
			</p>

			<h3>Ionospheric Disturbance / Scintillation</h3>
			<p>
				Rapid signal fluctuations from <a href="/gnss-reliability/glossary#scintillation">ionospheric scintillation</a> can cause RTK instability and loss of satellite lock. Scintillation is most severe at equatorial and high (auroral) latitudes, but extreme storms can push effects into mid-latitudes.
			</p>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/phenomena/ionospheric-scintillation">NOAA &mdash; Ionospheric Scintillation</ExtLink>
			</p>

			<h3>RTK Performance Indicators</h3>
			<p>Real-time field observations matter just as much as forecasts:</p>
			<ul class="effect-list">
				<li>Frequent <a href="/gnss-reliability/rtk-float-drops">FIX &rarr; FLOAT transitions</a></li>
				<li>Long initialization times</li>
				<li>Large accuracy fluctuations</li>
				<li>Satellite count instability</li>
			</ul>
		</section>

		<!-- Kp Thresholds Table -->
		<section class="article-section">
			<h2>Kp Thresholds for Drone Operations</h2>
			<div class="table-wrapper">
				<table class="risk-table">
					<thead>
						<tr>
							<th>Kp</th>
							<th>Activity</th>
							<th>NOAA Scale</th>
							<th>Operational Guidance</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><span class="risk-dot green"></span> 0&ndash;2</td>
							<td>Quiet</td>
							<td>Below G-scale</td>
							<td>Generally safe for precision missions</td>
						</tr>
						<tr>
							<td><span class="risk-dot green"></span> 3</td>
							<td>Unsettled</td>
							<td>Below G-scale</td>
							<td>Monitor conditions; usually reliable</td>
						</tr>
						<tr>
							<td><span class="risk-dot yellow"></span> 4</td>
							<td>Active</td>
							<td>Below G-scale</td>
							<td>Caution &mdash; RTK issues possible, especially at high latitudes</td>
						</tr>
						<tr>
							<td><span class="risk-dot orange"></span> 5</td>
							<td>Minor storm</td>
							<td>G1</td>
							<td>Postpone survey-grade work; use GCPs if flying</td>
						</tr>
						<tr>
							<td><span class="risk-dot red"></span> 6+</td>
							<td>Moderate&ndash;Extreme</td>
							<td>G2&ndash;G5</td>
							<td>Cancel or postpone all precision missions</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/phenomena/geomagnetic-storms">NOAA Geomagnetic Storm Scale</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>The Kp index is like a wind forecast for the invisible environment your navigation system depends on.</p>
			</aside>
		</section>

		<!-- When to Cancel -->
		<section class="article-section">
			<h2>When You Should Cancel a Mission</h2>

			<div class="decision-card no-go">
				<h3>Kp &ge; 6 (Moderate Storm or Higher)</h3>
				<ul class="effect-list">
					<li>RTK likely unstable</li>
					<li>Position accuracy unreliable</li>
					<li>Mapping outputs may be unusable</li>
				</ul>
			</div>

			<div class="decision-card no-go">
				<h3>Persistent RTK FLOAT Conditions</h3>
				<p>If FIX cannot be maintained consistently, precision georeferencing is compromised regardless of what the Kp index says.</p>
			</div>

			<div class="decision-card no-go">
				<h3>Severe Scintillation Reports</h3>
				<p>Particularly at equatorial and auroral latitudes, signal tracking may fail repeatedly. Amplitude scintillation dominates near the equator; phase scintillation dominates at high latitudes.</p>
			</div>

			<div class="decision-card no-go">
				<h3>Mission Requires Survey-Grade Accuracy</h3>
				<p>Engineering surveys, corridor mapping, construction measurement, and legal boundary work &mdash; even moderate degradation may be unacceptable for these applications.</p>
			</div>
		</section>

		<!-- When to Consider Postponement -->
		<section class="article-section">
			<h2>When to Consider Postponement</h2>

			<div class="decision-card mitigate">
				<h3>Kp = 4&ndash;5</h3>
				<p>Operations may still be possible with precautions:</p>
				<ul class="effect-list">
					<li>Use ground control points (GCPs)</li>
					<li>Expect RTK reinitializations</li>
					<li>Plan additional validation</li>
					<li>Postpone survey-grade work at Kp 5</li>
				</ul>
			</div>

			<div class="decision-card mitigate">
				<h3>Long RTK Initialization Times</h3>
				<p>If achieving FIX takes significantly longer than normal, conditions may be unstable even if the Kp index appears moderate.</p>
			</div>

			<div class="decision-card mitigate">
				<h3>High Solar Activity Alerts</h3>
				<p>Even before geomagnetic storms arrive, conditions can begin to degrade. CMEs take 1&ndash;3 days to reach Earth after a <a href="/gnss-reliability/solar-flares-vs-storms">solar flare or coronal mass ejection</a>.</p>
			</div>
		</section>

		<!-- When It Is Generally Safe -->
		<section class="article-section">
			<h2>When It Is Generally Safe to Fly</h2>

			<div class="decision-card go">
				<h3>Kp &le; 3</h3>
				<ul class="effect-list">
					<li>Generally stable ionosphere</li>
					<li>Reliable RTK performance in most conditions</li>
					<li>Normal accuracy expectations</li>
				</ul>
				<p class="caveat">
					<strong>Note:</strong> Equatorial scintillation, traveling ionospheric disturbances, and solar radio bursts can occasionally degrade GNSS performance independently of Kp. Always verify RTK status in the field.
				</p>
			</div>

			<div class="decision-card go">
				<h3>Non-Precision Missions</h3>
				<p>Visual inspections, search and rescue, media capture, and situational awareness flights rely less on centimeter-level positioning and are generally unaffected by moderate space weather.</p>
			</div>
		</section>

		<!-- Special Considerations for Mapping -->
		<section class="article-section">
			<h2>Special Considerations for Mapping Missions</h2>
			<p>
				Mapping projects amplify small positioning errors across entire datasets. A single centimeter of drift becomes significant when multiplied across hundreds of overlapping images.
			</p>
			<h3>Potential consequences:</h3>
			<ul class="effect-list">
				<li>Misaligned orthomosaics</li>
				<li>Elevation errors in digital surface models</li>
				<li>GCP mismatches</li>
				<li>Reprocessing requirements and project delays</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.earthscope.org">EarthScope Consortium &mdash; GNSS Resources</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>A small navigation error repeated across hundreds of images becomes a large mapping error &mdash; like a slightly off-center wheel that wobbles more the further it rolls.</p>
			</aside>
		</section>

		<!-- Decision Framework -->
		<section class="article-section">
			<h2>Decision Framework: Go / Mitigate / No-Go</h2>
			<div class="framework-grid">
				<div class="framework-card go-card">
					<h3>GO</h3>
					<ul class="effect-list">
						<li>Kp &le; 3</li>
						<li>Stable RTK performance</li>
						<li>No major solar alerts</li>
					</ul>
				</div>
				<div class="framework-card mitigate-card">
					<h3>GO WITH MITIGATION</h3>
					<ul class="effect-list">
						<li>Kp 4&ndash;5</li>
						<li>Intermittent instability</li>
						<li>Increase GCP density</li>
						<li>Plan redundant flights</li>
						<li>Validate results carefully</li>
						<li>At Kp 5, postpone survey-grade work</li>
					</ul>
				</div>
				<div class="framework-card nogo-card">
					<h3>NO-GO</h3>
					<ul class="effect-list">
						<li>Kp &ge; 6</li>
						<li>Severe scintillation</li>
						<li>Persistent FLOAT conditions</li>
						<li>Mission requires survey-grade accuracy</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- Why Waiting Often Works -->
		<section class="article-section">
			<h2>Why Waiting Often Works</h2>
			<p>
				Geomagnetic storms are temporary. The main phase typically lasts 2&ndash;8 hours, with full recovery within hours to a few days depending on storm intensity. Rescheduling may save:
			</p>
			<ul class="effect-list">
				<li>Field time and battery cycles</li>
				<li>Processing effort</li>
				<li>Data quality issues</li>
				<li>Project delays from rework</li>
			</ul>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Postponing for better conditions is like waiting for clouds to clear before aerial photography &mdash; the result is dramatically better.</p>
			</aside>
		</section>

		<!-- Key Takeaways -->
		<section class="article-section">
			<h2>Key Takeaways</h2>
			<ul class="effect-list takeaways">
				<li>Space weather can silently compromise mission accuracy</li>
				<li>The Kp index is a practical first check &mdash; problems start at Kp 4, cancel at Kp 6+</li>
				<li>RTK instability in the field is a critical warning sign regardless of forecasts</li>
				<li>Precision mapping projects are most sensitive to degradation</li>
				<li>Canceling early prevents costly rework and unusable deliverables</li>
			</ul>
			<p class="bottom-line">
				<strong>Bottom line:</strong> If your mission depends on precise positioning, space weather should be part of your go/no-go checklist &mdash; just like wind, precipitation, and visibility.
			</p>
		</section>

		<!-- Authoritative Resources -->
		<section class="article-section sources">
			<h2>Authoritative Resources</h2>
			<ul class="source-list">
				<li><ExtLink href="https://www.swpc.noaa.gov">NOAA Space Weather Prediction Center</ExtLink></li>
				<li><ExtLink href="https://www.swpc.noaa.gov/products/planetary-k-index">NOAA Planetary K Index</ExtLink></li>
				<li><ExtLink href="https://www.swpc.noaa.gov/noaa-scales-explanation">NOAA Space Weather Scales</ExtLink></li>
				<li><ExtLink href="https://www.faa.gov/about/office_org/headquarters_offices/avs/offices/afx/afs/afs400/afs410/GNSS">FAA GNSS Interference Resource Guide</ExtLink></li>
				<li><ExtLink href="https://swe.ssa.esa.int">ESA Space Weather Portal</ExtLink></li>
				<li><ExtLink href="https://igs.org">International GNSS Service</ExtLink></li>
				<li><ExtLink href="https://science.nasa.gov/heliophysics/space-weather">NASA Space Weather Overview</ExtLink></li>
				<li><ExtLink href="https://www.earthscope.org">EarthScope Consortium</ExtLink></li>
			</ul>
		</section>

		<!-- Navigation -->
		<footer class="article-footer">
			<p class="guide-note">This page is a permanent reference within the <a href="/gnss-reliability">GNSS Reliability &amp; Space Weather Guide</a>.</p>
			<nav class="article-nav">
				<a href="/gnss-reliability">&larr; Back to guide</a>
				<a href="/gnss">GNSS Risk Assessment</a>
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

	.subtitle {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		line-height: 1.5;
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

	.article-section a {
		color: var(--accent-blue);
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

	.effect-list li a {
		color: var(--accent-blue);
	}

	.takeaways li {
		font-weight: 500;
		color: var(--text-primary);
	}

	.bottom-line {
		background: var(--bg-card);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--border-radius);
		border-left: 3px solid var(--accent-blue);
		color: var(--text-primary) !important;
	}

	/* Decision cards */
	.decision-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-md) var(--space-lg);
		margin-bottom: var(--space-md);
	}

	.decision-card h3 {
		margin-top: 0;
		color: var(--text-primary);
	}

	.decision-card p {
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}

	.decision-card p:last-child {
		margin-bottom: 0;
	}

	.decision-card.no-go {
		border-left: 3px solid var(--severity-red, #f87171);
	}

	.decision-card.mitigate {
		border-left: 3px solid var(--severity-yellow, #facc15);
	}

	.decision-card.go {
		border-left: 3px solid var(--severity-green, #4ade80);
	}

	.caveat {
		font-size: 0.85rem;
		color: var(--text-muted) !important;
		background: rgba(255, 255, 255, 0.03);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--border-radius-sm);
		margin-top: var(--space-sm);
		margin-bottom: 0 !important;
	}

	/* Decision framework grid */
	.framework-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.framework-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-md);
	}

	.framework-card h3 {
		margin-top: 0;
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-sm);
	}

	.framework-card .effect-list li {
		font-size: 0.85rem;
		padding: 2px 0 2px var(--space-md);
	}

	.framework-card .effect-list li::before {
		width: 5px;
		height: 5px;
		top: 0.6em;
	}

	.go-card {
		border-top: 3px solid var(--severity-green, #4ade80);
	}

	.go-card h3 {
		color: var(--severity-green, #4ade80);
	}

	.mitigate-card {
		border-top: 3px solid var(--severity-yellow, #facc15);
	}

	.mitigate-card h3 {
		color: var(--severity-yellow, #facc15);
	}

	.nogo-card {
		border-top: 3px solid var(--severity-red, #f87171);
	}

	.nogo-card h3 {
		color: var(--severity-red, #f87171);
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

		.framework-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
