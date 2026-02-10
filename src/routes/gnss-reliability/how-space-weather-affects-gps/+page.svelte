<!-- +page.svelte v0.3.0 — Pillar article: How Space Weather Affects GPS, RTK, and Survey Accuracy -->
<script>
	import ExtLink from '$lib/components/ExtLink.svelte';
</script>

<svelte:head>
	<title>How Space Weather Affects GPS, RTK, and Survey Accuracy — SWFT</title>
	<meta name="description" content="Comprehensive guide on how solar flares, geomagnetic storms, and ionospheric disturbances affect GPS accuracy, RTK performance, and GNSS survey operations." />
</svelte:head>

<main class="dashboard">
	<article class="article">
		<header class="article-header">
			<nav class="breadcrumb">
				<a href="/gnss-reliability">GNSS Reliability Guide</a>
				<span class="separator">/</span>
				<span>Space Weather &amp; GPS</span>
			</nav>
			<h1>How Space Weather Affects GPS, RTK, and Survey Accuracy</h1>
			<p class="subtitle">Understanding why solar activity degrades GNSS positioning — and what it means for drone pilots and surveyors</p>
		</header>

		<!-- Overview -->
		<section class="article-section">
			<h2>Overview</h2>
			<p>
				Space weather — including solar flares, geomagnetic storms, and ionospheric disturbances — directly affects the accuracy and reliability of GPS and other GNSS systems. The most common impact is on the signals themselves: they must travel through Earth's ionosphere, which becomes unstable during solar activity. In extreme events, high-energy particles can also directly affect satellite electronics through radiation damage and single-event upsets.
			</p>
			<p>
				For drone pilots and surveyors, this can mean degraded RTK performance, increased positioning error, loss of FIX solutions, or longer convergence times for PPP and static surveys.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Think of GNSS signals like laser pointers aimed at your receiver. Most of the time, space weather doesn't break the laser — it makes the air between you and the laser shimmer and distort, like heat waves rising off asphalt. In rare extreme events, however, the laser itself can be affected.</p>
			</aside>
		</section>

		<!-- The Key Problem: The Ionosphere -->
		<section class="article-section">
			<h2>The Key Problem: The Ionosphere</h2>
			<p>
				The ionosphere is a region of the upper atmosphere filled with charged particles created by solar radiation. GNSS signals must pass through it before reaching Earth's surface.
			</p>
			<p>
				When solar activity increases, the ionosphere becomes turbulent and irregular. This introduces errors that GNSS correction systems cannot always fully compensate for.
			</p>
			<h3>Primary effects include:</h3>
			<ul class="effect-list">
				<li>Increased signal delay</li>
				<li>Rapid signal fluctuations (scintillation)</li>
				<li>Loss of signal lock (cycle slips)</li>
				<li>Reduced satellite availability</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/impacts/ionospheric-impacts-space-weather">NOAA Space Weather Prediction Center — Ionospheric Impacts</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Imagine trying to look at the bottom of a swimming pool. When the water is calm, you see clearly. When wind and swimmers create waves, the image bends and wiggles. The ionosphere during a solar storm is like choppy pool water for satellite signals.</p>
			</aside>
		</section>

		<!-- How This Impacts GPS & GNSS Signals -->
		<section class="article-section">
			<h2>How This Impacts GPS &amp; GNSS Signals</h2>
			<p>
				GNSS positioning depends on extremely precise timing. Even tiny delays in signal travel time translate into measurable position errors.
			</p>
			<p>During geomagnetic storms:</p>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Effect</th>
							<th>What Happens</th>
							<th>Operational Impact</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>Ionospheric Delay</strong></td>
							<td>Signal slows unevenly</td>
							<td>Increased position error</td>
						</tr>
						<tr>
							<td><strong>Scintillation</strong></td>
							<td>Rapid signal fading</td>
							<td>Receiver loses lock</td>
						</tr>
						<tr>
							<td><strong>Cycle Slips</strong></td>
							<td>Phase tracking breaks</td>
							<td>RTK solution resets</td>
						</tr>
						<tr>
							<td><strong>Satellite Geometry Changes</strong></td>
							<td>Some signals unusable</td>
							<td>Reduced accuracy</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="reference">
				<ExtLink href="https://swe.ssa.esa.int/ionospheric-weather">ESA Space Weather Service — Ionospheric Weather</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>GNSS timing is like a relay race where batons are passed perfectly on time. Space weather is like suddenly adding wind gusts and slippery ground — runners (signals) arrive slightly late or drop the baton, and the whole race timing gets messy.</p>
			</aside>
		</section>

		<!-- Why RTK Breaks First -->
		<section class="article-section">
			<h2>Why RTK Breaks First</h2>
			<p>
				RTK systems depend on extremely stable carrier-phase tracking. Ionospheric disturbances cause rapid phase changes that the receiver cannot model correctly.
			</p>
			<h3>This leads to:</h3>
			<ul class="effect-list">
				<li>FIX &rarr; FLOAT transitions</li>
				<li>Longer initialization times</li>
				<li>Loss of integer ambiguity resolution</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://igs.org/wg/ionosphere/">International GNSS Service (IGS) — Ionosphere Working Group</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>RTK is like balancing a pencil perfectly upright on your finger. It works when conditions are steady. Space weather is like someone bumping your arm repeatedly — you can recover, but you keep losing balance.</p>
			</aside>
		</section>

		<!-- Effects on Drone Operations -->
		<section class="article-section">
			<h2>Effects on Drone Operations</h2>
			<p>
				Drone mapping missions depend on consistent RTK performance for accurate georeferencing.
			</p>
			<p>During high space weather activity, operators may experience:</p>
			<ul class="effect-list">
				<li>Mapping datasets with variable accuracy</li>
				<li>GCP mismatches</li>
				<li>Repeated RTK resets</li>
				<li>Increased post-processing corrections</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.faa.gov/about/office_org/headquarters_offices/avs/offices/afx/afs/afs400/afs410/GNSS">FAA GNSS Interference Resource Guide</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It's like flying a drone whose GPS position readout occasionally drifts a few centimeters, then snaps back. The aircraft flies fine, but the map you create can have subtle spatial distortions.</p>
			</aside>
		</section>

		<!-- Effects on Surveying & Static GNSS -->
		<section class="article-section">
			<h2>Effects on Surveying &amp; Static GNSS</h2>
			<p>
				Long-duration static surveys are more stable than RTK but still affected:
			</p>
			<ul class="effect-list">
				<li>PPP convergence times increase</li>
				<li>OPUS solutions — especially OPUS-RS (Rapid Static) — may fail or take longer</li>
				<li>Baseline repeatability decreases</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.unavco.org/data/gps-gnss/gps-gnss.html">EarthScope/UNAVCO GNSS Data &amp; Products</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Static GNSS is like averaging the position of a buoy in ocean waves. Over time you get a good average, but during a storm the buoy moves more wildly, so it takes longer to find the true center.</p>
			</aside>
		</section>

		<!-- Solar Flares vs Geomagnetic Storms -->
		<section class="article-section">
			<h2>Solar Flares vs Geomagnetic Storms</h2>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Event Type</th>
							<th>What It Does</th>
							<th>GNSS Impact</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>Solar Flare</strong></td>
							<td>X-ray burst increases ionization instantly</td>
							<td>Short-term signal degradation</td>
						</tr>
						<tr>
							<td><strong>Geomagnetic Storm</strong></td>
							<td>CME interacts with Earth's magnetic field</td>
							<td>Widespread ionospheric disruption</td>
						</tr>
						<tr>
							<td><strong>Radio Blackout</strong></td>
							<td>HF comms disrupted</td>
							<td>GNSS degraded at moderate levels (R1–R3); R4–R5 events can cause significant outages</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/noaa-scales-explanation">NOAA SWPC Space Weather Scales</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>A solar flare is like flipping a light switch on and off quickly — sudden but brief. A geomagnetic storm is like a prolonged thunderstorm — slower to arrive but disruptive over a wide area.</p>
			</aside>
		</section>

		<!-- Key Takeaways -->
		<section class="article-section">
			<h2>Key Takeaways for GNSS Professionals</h2>
			<ul class="effect-list takeaways">
				<li>Space weather primarily distorts the medium signals travel through — though extreme events can also affect satellite hardware directly</li>
				<li>RTK systems are most vulnerable</li>
				<li>Static GNSS is more resilient but slower to stabilize</li>
				<li>Monitoring space weather is part of mission planning</li>
			</ul>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>You wouldn't plan a construction survey during a lightning storm without considering safety. Space weather is the "invisible storm" GNSS users must monitor.</p>
			</aside>
		</section>

		<!-- Additional Sources -->
		<section class="article-section sources">
			<h2>Additional Authoritative Sources</h2>
			<ul class="source-list">
				<li><ExtLink href="https://www.swpc.noaa.gov">NOAA Space Weather Prediction Center</ExtLink></li>
				<li><ExtLink href="https://swe.ssa.esa.int">ESA Space Weather Portal</ExtLink></li>
				<li><ExtLink href="https://igs.org">International GNSS Service</ExtLink></li>
				<li><ExtLink href="https://science.nasa.gov/heliophysics/space-weather">NASA Space Weather Overview</ExtLink></li>
			</ul>
		</section>

		<!-- Navigation -->
		<footer class="article-footer">
			<p class="guide-note">This page is part of the <a href="/gnss-reliability">GNSS Reliability &amp; Space Weather Guide</a>.</p>
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
		margin-top: var(--space-md);
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
