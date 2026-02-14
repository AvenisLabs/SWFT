<!-- +page.svelte v0.1.0 — Why DJI Terra, Emlid, and Base Stations Struggle During Solar Storms -->
<script>
	import ExtLink from '$lib/components/ExtLink.svelte';
</script>

<svelte:head>
	<title>Why DJI, Emlid &amp; Base Stations Struggle During Solar Storms — SWFT</title>
	<meta name="description" content="Why DJI RTK drones, Emlid base stations, and NTRIP networks lose accuracy during solar storms — and what operators can do about it." />
</svelte:head>

<main class="dashboard">
	<article class="article">
		<header class="article-header">
			<nav class="breadcrumb">
				<a href="/gnss-reliability">GNSS Reliability Guide</a>
				<span class="separator">/</span>
				<span>DJI, Emlid &amp; Base Stations</span>
			</nav>
			<h1>Why DJI Terra, Emlid, and Base Stations Struggle During Solar Storms</h1>
			<p class="subtitle">When reliable GNSS workflows suddenly degrade &mdash; the problem is overhead, not on the ground</p>
		</header>

		<!-- Overview -->
		<section class="article-section">
			<h2>Overview</h2>
			<p>
				During solar storms, many operators notice that previously reliable GNSS workflows suddenly degrade. DJI RTK drones lose FIX, Emlid base stations struggle to maintain stable corrections, and NTRIP networks produce inconsistent results.
			</p>
			<p>
				Importantly, this is usually <strong>not a failure of the equipment or software</strong>. The underlying issue is that space weather disrupts the ionosphere &mdash; the medium through which all GNSS signals must travel.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Your GNSS gear isn't broken. It's like trying to use high-precision surveying equipment during heavy atmospheric shimmer &mdash; the environment itself becomes unstable.</p>
			</aside>
		</section>

		<!-- The Common Dependency -->
		<section class="article-section">
			<h2>The Common Dependency: GNSS Signals Through the Ionosphere</h2>
			<p>
				All RTK systems depend on receiving precise satellite signals. These signals must pass through the ionosphere, where solar storms create turbulence and irregularities.
			</p>
			<p>Effects include:</p>
			<ul class="effect-list">
				<li>Variable signal delay</li>
				<li>Rapid phase changes</li>
				<li>Signal fading (scintillation)</li>
				<li>Increased noise</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/impacts/space-weather-and-gps-systems">NOAA SWPC &mdash; Space Weather and GPS Systems</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://swe.ssa.esa.int/ionospheric-weather">ESA Space Weather Service &mdash; Ionospheric Weather &amp; GNSS Effects</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It's like measuring distance with a laser pointer through heat waves rising from pavement &mdash; the beam bends unpredictably even though the pointer works perfectly.</p>
			</aside>
		</section>

		<!-- DJI RTK Drones -->
		<section class="article-section">
			<h2>Why DJI RTK Drones Lose Accuracy</h2>
			<p>
				DJI RTK systems rely on real-time carrier-phase measurements from multiple satellites combined with correction data from a base station or network.
			</p>
			<p>During geomagnetic storms:</p>
			<ul class="effect-list">
				<li>FIX solutions drop to FLOAT</li>
				<li>Initialization takes longer</li>
				<li>Position accuracy fluctuates</li>
				<li>Satellite tracking degrades</li>
			</ul>
			<p>
				The drone's flight control remains stable, but geospatial accuracy suffers.
			</p>
			<p class="reference">
				<ExtLink href="https://www.dji.com/d-rtk-2">DJI D-RTK 2 &mdash; High Precision GNSS Station</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://www.faa.gov/about/office_org/headquarters_offices/avs/offices/afx/afs/afs400/afs410/GNSS">FAA &mdash; GNSS Interference Resource Guide</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It's like autopilot still flying smoothly while the navigation system loses precision &mdash; the aircraft stays in the air, but its exact position becomes uncertain.</p>
			</aside>
		</section>

		<!-- Emlid RS2 / RS3 Base Stations -->
		<section class="article-section">
			<h2>Why Emlid RS2 / RS3 Base Stations Struggle</h2>
			<p>
				Emlid receivers are high-quality multi-band GNSS units capable of centimeter-level accuracy under stable conditions. However, they cannot eliminate ionospheric disturbances.
			</p>
			<p>During solar storms:</p>
			<ul class="effect-list">
				<li>Base station measurements become noisier</li>
				<li>Ambiguity resolution becomes difficult</li>
				<li>Correction quality degrades</li>
				<li>Rover performance suffers</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://emlid.com/reachrs3/">Emlid Reach RS3 &mdash; RTK GNSS Receiver</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://igs.org">International GNSS Service</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>A base station during a solar storm is like a reference ruler made of rubber instead of steel &mdash; it still measures, but the reference itself is unstable.</p>
			</aside>
		</section>

		<!-- NTRIP Networks -->
		<section class="article-section">
			<h2>Why NTRIP Networks Are Not Immune</h2>
			<p>
				Many operators assume that using a professional correction network solves the problem. However, NTRIP networks depend on the same satellites and atmospheric conditions.
			</p>
			<p>
				Network RTK relies on modeling ionospheric behavior across a region. Solar storms create rapid, irregular changes that violate these models.
			</p>
			<p>Consequences:</p>
			<ul class="effect-list">
				<li>Inconsistent corrections</li>
				<li>Reduced network accuracy</li>
				<li>Difficulty maintaining FIX</li>
				<li>Regional variations in performance</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/phenomena/geomagnetic-storms">NOAA SWPC &mdash; Geomagnetic Storms</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://www.earthscope.org">EarthScope Consortium &mdash; GNSS Resources</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It's like using a traffic map that assumes normal driving conditions while a city-wide storm is causing unpredictable road closures everywhere.</p>
			</aside>
		</section>

		<!-- The Root Problem -->
		<section class="article-section">
			<h2>The Root Problem: Rapid Ionospheric Changes</h2>
			<p>
				RTK systems assume that atmospheric errors change smoothly over space and time. Solar storms introduce rapid fluctuations that correction algorithms cannot keep up with.
			</p>
			<p>This causes:</p>
			<ul class="effect-list">
				<li>Frequent cycle slips</li>
				<li>Loss of lock on satellites</li>
				<li>Reduced usable satellite count</li>
				<li>Increased positioning uncertainty</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://gssc.esa.int/navipedia/index.php/Ionospheric_Delay">ESA Navipedia &mdash; Ionospheric Delay</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Imagine trying to stabilize a camera while standing on shifting sand &mdash; adjustments never quite settle because the ground keeps moving.</p>
			</aside>
		</section>

		<!-- Short Baselines -->
		<section class="article-section">
			<h2>Why Short Baselines Don't Fully Solve It</h2>
			<p>
				Even when a base station is very close to the rover (drone), ionospheric disturbances can vary significantly over short distances during strong storms.
			</p>
			<p>
				Therefore, proximity alone cannot guarantee accuracy.
			</p>
			<p class="reference">
				<ExtLink href="https://igs.org">International GNSS Service &mdash; Ionospheric Effects</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Two nearby boats can still move independently in rough seas, even though they are only meters apart.</p>
			</aside>
		</section>

		<!-- Practical Impact -->
		<section class="article-section">
			<h2>Practical Impact on Mapping &amp; Survey Missions</h2>
			<p>
				During significant space weather activity, operators may experience:
			</p>
			<ul class="effect-list">
				<li>Inconsistent geotag accuracy</li>
				<li>Dataset distortions</li>
				<li>Increased need for Ground Control Points</li>
				<li>Longer processing times</li>
				<li>Reduced confidence in results</li>
			</ul>
			<p>
				Mission completion may still be possible, but precision requirements may not be met.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It's like building a structure with tools that occasionally shift calibration &mdash; progress continues, but quality assurance becomes harder.</p>
			</aside>
		</section>

		<!-- Key Takeaways -->
		<section class="article-section">
			<h2>Key Takeaways for Operators</h2>
			<ul class="effect-list takeaways">
				<li>DJI RTK drones, Emlid receivers, and NTRIP networks all depend on the same GNSS signals</li>
				<li>Solar storms degrade the atmosphere, not the equipment</li>
				<li>RTK workflows are especially sensitive to ionospheric instability</li>
				<li>Monitoring space weather is essential for mission planning</li>
			</ul>
			<p class="bottom-line">
				<strong>Bottom line:</strong> High-end gear cannot overcome severe space weather conditions. Check the <a href="/gnss-reliability/gnss-risk-levels">GNSS Risk Levels</a> page and the <a href="/gnss">GNSS Risk Assessment</a> before deploying.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Even the best GPS receiver is like a high-end camera &mdash; if visibility drops to near zero, image quality will still suffer.</p>
			</aside>
		</section>

		<!-- Authoritative Resources -->
		<section class="article-section sources">
			<h2>Authoritative Resources</h2>
			<ul class="source-list">
				<li><ExtLink href="https://www.swpc.noaa.gov">NOAA Space Weather Prediction Center</ExtLink></li>
				<li><ExtLink href="https://swe.ssa.esa.int">ESA Space Weather Portal</ExtLink></li>
				<li><ExtLink href="https://igs.org">International GNSS Service</ExtLink></li>
				<li><ExtLink href="https://www.earthscope.org">EarthScope Consortium</ExtLink></li>
				<li><ExtLink href="https://www.dji.com/d-rtk-2">DJI D-RTK 2 GNSS Station</ExtLink></li>
				<li><ExtLink href="https://emlid.com/reachrs3/">Emlid Reach RS3 RTK Receiver</ExtLink></li>
				<li><ExtLink href="https://www.faa.gov/about/office_org/headquarters_offices/avs/offices/afx/afs/afs400/afs410/GNSS">FAA GNSS Interference Resource Guide</ExtLink></li>
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

	.takeaways li {
		font-weight: 500;
		color: var(--text-primary);
	}

	/* Bottom line callout */
	.bottom-line {
		background: var(--bg-card);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--border-radius);
		border-left: 3px solid var(--accent-blue);
		color: var(--text-primary) !important;
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
	}
</style>
