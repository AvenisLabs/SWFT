<!-- +page.svelte v0.4.0 — How Space Weather Can Ruin a GNSS Survey -->
<script lang="ts">
	import ExtLink from '$lib/components/ExtLink.svelte';
</script>

<svelte:head>
	<title>How Space Weather Can Ruin a GNSS Survey — SWFT</title>
	<meta name="description" content="Space weather degrades GNSS survey accuracy through ionospheric disturbances. Learn how RTK, static, PPP, and OPUS are affected — and how to protect your work." />
</svelte:head>

<main class="dashboard">
	<article class="article">
		<header class="article-header">
			<nav class="breadcrumb">
				<a href="/gnss-reliability">GNSS Reliability Guide</a>
				<span class="separator">/</span>
				<span>Space Weather &amp; Surveys</span>
			</nav>
			<h1>How Space Weather Can Ruin a GNSS Survey</h1>
			<p class="subtitle">Why ionospheric disturbances affect RTK, static, PPP, and OPUS &mdash; and how to reduce your risk</p>
		</header>



		<!-- Overview -->
		<section class="article-section">
			<h2>Overview</h2>
			<p>
				High-precision GNSS surveys depend on stable signal propagation through the ionosphere. During periods of solar activity and geomagnetic disturbance, this stability can degrade &mdash; sometimes severely.
			</p>
			<p>
				The result may be inaccurate solutions, extended processing times, inconsistent baselines, or outright failures in services like OPUS or PPP.
			</p>
			<p>
				Importantly, equipment quality helps but cannot eliminate this risk. During severe ionospheric disturbances, the atmosphere becomes the dominant limiting factor &mdash; even for the best receivers.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Conducting a GNSS survey during a geomagnetic storm is like trying to measure distances with a tape measure while someone keeps pulling and twisting it &mdash; the tool works, but the medium is unstable.</p>
			</aside>
		</section>

		<!-- Why Space Weather Affects Survey Accuracy -->
		<section class="article-section">
			<h2>Why Space Weather Affects Survey Accuracy</h2>
			<p>
				GNSS positioning relies on extremely precise timing of satellite signals. The ionosphere introduces <a href="/gnss-reliability/ionospheric-delay">delays</a> that receivers and processing software attempt to model and correct.
			</p>
			<p>During geomagnetic storms, the ionosphere becomes highly irregular, causing:</p>
			<ul class="effect-list">
				<li>Rapid delay fluctuations</li>
				<li>Signal phase instability</li>
				<li>Increased noise</li>
				<li><a href="/gnss-reliability/glossary#cycle-slip">Cycle slips</a></li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/impacts/ionospheric-impacts-space-weather">NOAA SWPC &mdash; Space Weather Impacts</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://swe.ssa.esa.int/ionospheric-weather">ESA Space Weather Service &mdash; Ionospheric Weather &amp; GNSS Effects</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It&rsquo;s like surveying through turbulent water &mdash; the objects haven&rsquo;t moved, but their apparent positions constantly shift.</p>
			</aside>
		</section>

		<!-- RTK Surveys -->
		<section class="article-section">
			<h2>RTK Surveys: Most Vulnerable</h2>
			<p>
				Real-Time Kinematic surveys require continuous carrier-phase tracking. Even brief disturbances can force reinitialization or degrade accuracy.
			</p>
			<p>During solar storms, RTK surveys may experience:</p>
			<ul class="effect-list">
				<li>Frequent <a href="/gnss-reliability/rtk-float-drops">FIX &rarr; FLOAT transitions</a></li>
				<li>Increased horizontal and vertical error</li>
				<li>Loss of consistency between points</li>
				<li>Reduced repeatability</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://igs.org/rts/">International GNSS Service &mdash; Real-Time Service</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>RTK surveying is like balancing a pencil upright. It works perfectly in calm conditions but collapses quickly when disturbed.</p>
			</aside>
		</section>

		<!-- Static Surveys -->
		<section class="article-section">
			<h2>Static Surveys: More Robust but Not Immune</h2>
			<p>
				Static GNSS surveys collect observations over extended periods, allowing processing software to leverage changing satellite geometry for more robust ambiguity resolution. This makes them more resilient than RTK, though severe ionospheric disturbances still introduce errors.
			</p>
			<p>Possible impacts:</p>
			<ul class="effect-list">
				<li>Increased baseline noise</li>
				<li>Reduced solution confidence</li>
				<li>Biases in final coordinates</li>
				<li>Need for longer occupation times</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.earthscope.org">EarthScope Consortium &mdash; GNSS Resources</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Static surveying is like taking multiple measurements and averaging them. If the measuring stick itself keeps changing length, the average becomes less reliable.</p>
			</aside>
		</section>

		<!-- PPP Convergence -->
		<section class="article-section">
			<h2>PPP Convergence Delays</h2>
			<p>
				Precise Point Positioning (PPP) relies on precise satellite orbit and clock data combined with long observation periods to resolve ambiguities.
			</p>
			<p>During disturbed ionospheric conditions:</p>
			<ul class="effect-list">
				<li>Convergence takes significantly longer</li>
				<li>Accuracy may plateau at lower precision</li>
				<li>Solutions may remain unstable</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://natural-resources.canada.ca/science-data/science-research/geomatics/geodetic-reference-systems/canadian-spatial-reference-system-csrs">Natural Resources Canada &mdash; CSRS-PPP</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://igs.org/rts/">IGS Real-Time Service Documentation</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>PPP convergence is like focusing a camera lens slowly until the image becomes sharp. Space weather is like someone nudging the lens repeatedly, preventing a crisp focus.</p>
			</aside>
		</section>

		<!-- OPUS Failures -->
		<section class="article-section">
			<h2>OPUS Failures and Inconsistent Results</h2>
			<p>
				The Online Positioning User Service (OPUS) processes static GNSS data against Continuously Operating Reference Stations (CORS).
			</p>
			<p>During geomagnetic disturbances, users may encounter:</p>
			<ul class="effect-list">
				<li>Rejected submissions</li>
				<li>Poor-quality solutions</li>
				<li>Large coordinate discrepancies</li>
				<li>Excessive residuals</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.ngs.noaa.gov/OPUS/">NOAA NGS &mdash; OPUS</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://geodesy.noaa.gov/CORS/">NOAA CORS Network</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Submitting OPUS data during severe space weather is like sending blurred photos for measurement &mdash; the reference system cannot extract precise information.</p>
			</aside>
		</section>

		<!-- Why Long Occupation Helps -->
		<section class="article-section">
			<h2>Why Long Occupation Helps</h2>
			<p>
				Extending observation time provides more satellite geometry diversity and strengthens ambiguity resolution, helping mitigate short-term disturbances.
			</p>
			<p>Benefits of longer occupations:</p>
			<ul class="effect-list">
				<li>Reduced impact of transient ionospheric fluctuations</li>
				<li>Improved ambiguity resolution</li>
				<li>Higher solution reliability</li>
			</ul>
			<p>However, during major storms, even long sessions may not fully compensate.</p>
			<p class="reference">
				<ExtLink href="https://www.earthscope.org">EarthScope Consortium &mdash; GNSS Data &amp; Resources</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It&rsquo;s like collecting many samples to find the true value. The more you gather, the better the estimate &mdash; unless the disturbance remains extreme.</p>
			</aside>
		</section>

		<!-- Risk Comparison Table -->
		<section class="article-section">
			<h2>Static vs RTK Risk Comparison</h2>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Method</th>
							<th>Sensitivity to Space Weather</th>
							<th>Typical Impact</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>RTK</strong></td>
							<td>Very high</td>
							<td>Immediate degradation</td>
						</tr>
						<tr>
							<td><strong>Network RTK</strong></td>
							<td>High</td>
							<td>Regional inconsistencies</td>
						</tr>
						<tr>
							<td><strong>Static</strong></td>
							<td>Moderate</td>
							<td>Increased noise</td>
						</tr>
						<tr>
							<td><strong>PPP</strong></td>
							<td>Moderate&ndash;High</td>
							<td>Slow convergence</td>
						</tr>
						<tr>
							<td><strong>Long Static</strong></td>
							<td>Lower</td>
							<td>Best resilience</td>
						</tr>
					</tbody>
				</table>
			</div>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>RTK is a sprint that demands perfect footing. Static surveying is a marathon &mdash; slower but more tolerant of rough terrain.</p>
			</aside>
		</section>

		<!-- How to Reduce Risk -->
		<section class="article-section">
			<h2>How to Reduce Risk</h2>
			<div class="mitigation-grid">
				<div class="mitigation-card">
					<h3>Check Space Weather Forecasts</h3>
					<p>Monitoring geomagnetic activity allows scheduling surveys during quiet periods.</p>
					<p class="reference">
						<ExtLink href="https://www.swpc.noaa.gov/communities/space-weather-enthusiasts-dashboard">NOAA SWPC &mdash; Space Weather Enthusiasts Dashboard</ExtLink>
					</p>
				</div>
				<div class="mitigation-card">
					<h3>Increase Observation Time</h3>
					<p>Longer sessions improve geometric diversity and strengthen ambiguity resolution.</p>
				</div>
				<div class="mitigation-card">
					<h3>Use Multiple Sessions</h3>
					<p>Repeating observations on different days reduces the chance of storm-related bias.</p>
				</div>
				<div class="mitigation-card">
					<h3>Maintain Redundant Control</h3>
					<p>Ground control points or independent checks help detect anomalies.</p>
				</div>
				<div class="mitigation-card">
					<h3>Avoid Critical Work During Storms</h3>
					<p>If Kp &ge; 5 (NOAA G1 storm threshold) or significant ionospheric disturbance is forecast, consider postponement &mdash; particularly for RTK work. Check <a href="/gnss-reliability/gnss-risk-levels">GNSS risk levels</a> before heading to the field.</p>
					<p class="reference">
						<ExtLink href="https://www.swpc.noaa.gov/noaa-scales-explanation">NOAA Space Weather Scales</ExtLink>
					</p>
				</div>
			</div>
		</section>

		<!-- Key Takeaways -->
		<section class="article-section">
			<h2>Key Takeaways for Survey Professionals</h2>
			<ul class="effect-list takeaways">
				<li>Space weather can degrade or invalidate high-precision GNSS surveys</li>
				<li>RTK methods are most vulnerable</li>
				<li>Static and PPP methods are more resilient but still affected</li>
				<li>Long occupations improve reliability but are not a complete solution</li>
				<li>Monitoring conditions is part of best practice</li>
			</ul>
			<p class="bottom-line">
				<strong>Bottom line:</strong> Ignoring space weather can lead to costly rework or unreliable survey results.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Planning a survey without checking space weather is like pouring concrete without checking the temperature forecast &mdash; conditions may undermine the entire job.</p>
			</aside>
		</section>

		<!-- Authoritative Sources -->
		<section class="article-section sources">
			<h2>Authoritative Resources</h2>
			<ul class="source-list">
				<li><ExtLink href="https://www.swpc.noaa.gov">NOAA Space Weather Prediction Center</ExtLink></li>
				<li><ExtLink href="https://www.ngs.noaa.gov/OPUS/">NOAA NGS OPUS Service</ExtLink></li>
				<li><ExtLink href="https://www.earthscope.org">EarthScope Consortium</ExtLink></li>
				<li><ExtLink href="https://igs.org">International GNSS Service</ExtLink></li>
				<li><ExtLink href="https://natural-resources.canada.ca/science-data/science-research/geomatics/geodetic-reference-systems/canadian-spatial-reference-system-csrs">Natural Resources Canada CSRS-PPP</ExtLink></li>
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

	/* Mitigation cards */
	.mitigation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.mitigation-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-md) var(--space-lg);
	}

	.mitigation-card h3 {
		color: var(--text-primary);
		margin-top: 0;
		margin-bottom: var(--space-sm);
	}

	.mitigation-card p {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}

	.mitigation-card p:last-child {
		margin-bottom: 0;
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



		.mitigation-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
