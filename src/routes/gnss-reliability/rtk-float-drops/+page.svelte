<!-- +page.svelte v0.3.0 — Pillar article: Why Your RTK Drone Suddenly Drops to FLOAT -->
<script>
	import ExtLink from '$lib/components/ExtLink.svelte';
</script>

<svelte:head>
	<title>Why Your RTK Drone Suddenly Drops to FLOAT — SWFT</title>
	<meta name="description" content="RTK drones can suddenly lose FIX and fall back to FLOAT during space weather activity. Learn why ionospheric disturbances cause ambiguity resolution failures." />
</svelte:head>

<main class="dashboard">
	<article class="article">
		<header class="article-header">
			<nav class="breadcrumb">
				<a href="/gnss-reliability">GNSS Reliability Guide</a>
				<span class="separator">/</span>
				<span>RTK Float Drops</span>
			</nav>
			<h1>Why Your RTK Drone Suddenly Drops to FLOAT</h1>
			<p class="subtitle">Space weather explained for drone pilots, surveyors, and GNSS professionals</p>
		</header>

		<!-- Overview -->
		<section class="article-section">
			<h2>Overview</h2>
			<p>
				RTK drones rely on extremely precise satellite signal tracking to maintain a FIX solution. When conditions are ideal, centimeter-level accuracy is possible. But during periods of space weather activity, RTK systems can suddenly lose FIX and fall back to FLOAT.
			</p>
			<p>
				While common causes include obstructions, multipath, and radio link issues, this transition can also be caused by disturbances in the ionosphere affecting GNSS signals &mdash; especially during geomagnetic storms.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Think of RTK FIX like having a crystal-clear phone call. FLOAT is like when the connection gets noisy &mdash; you can still talk, but clarity drops.</p>
			</aside>
		</section>

		<!-- What "FIX" Actually Means -->
		<section class="article-section">
			<h2>What &ldquo;FIX&rdquo; Actually Means</h2>
			<p>
				A FIX solution means the receiver has resolved the integer ambiguities in the carrier-phase measurements from satellites. This allows precise positioning.
			</p>
			<p>
				To maintain FIX, the receiver must continuously track the phase of signals from multiple satellites without interruption.
			</p>
			<p class="reference">
				<ExtLink href="https://gssc.esa.int/navipedia/index.php/RTK_Fundamentals">ESA Navipedia &mdash; RTK Fundamentals</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>FIX is like solving a complex lock combination. Once solved, everything works smoothly. But if someone jiggles the lock, you have to start over.</p>
			</aside>
		</section>

		<!-- The Ionosphere's Role -->
		<section class="article-section">
			<h2>The Ionosphere&rsquo;s Role</h2>
			<p>
				GNSS signals pass through the ionosphere, a region filled with charged particles. During solar activity, this layer becomes unstable.
			</p>
			<h3>The disturbances cause:</h3>
			<ul class="effect-list">
				<li>Rapid changes in signal delay</li>
				<li>Signal fading (scintillation)</li>
				<li>Phase shifts that confuse the receiver</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/phenomena/ionospheric-scintillation">NOAA SWPC &mdash; Ionospheric Scintillation</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It&rsquo;s like trying to see a road clearly through a windshield while driving through heat shimmer &mdash; the road is still there, but it wobbles and blurs.</p>
			</aside>
		</section>

		<!-- Why RTK Is So Sensitive -->
		<section class="article-section">
			<h2>Why RTK Is So Sensitive</h2>
			<p>
				RTK relies on measuring the <em>phase</em> of signals, not just the code. Phase tracking requires very stable conditions.
			</p>
			<p>
				When ionospheric irregularities cause rapid phase changes, the receiver can no longer maintain integer ambiguity resolution. This forces a drop from FIX &rarr; FLOAT.
			</p>
			<p class="reference">
				<ExtLink href="https://gssc.esa.int/navipedia/index.php/Ionospheric_Delay">ESA Navipedia &mdash; Ionospheric Delay</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>RTK is like balancing a tightrope walker. A small breeze is manageable. Strong gusts (space weather) make balance impossible.</p>
			</aside>
		</section>

		<!-- What Happens During a Drop to FLOAT -->
		<section class="article-section">
			<h2>What Happens During a Drop to FLOAT</h2>
			<p>When FIX is lost:</p>
			<ul class="effect-list">
				<li>Position accuracy degrades from centimeters to decimeters or worse</li>
				<li>Survey-grade consistency is lost</li>
				<li>Mapping datasets may contain distortions</li>
				<li>RTK reinitialization is required</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.unavco.org/data/gps-gnss/gps-gnss.html">EarthScope/UNAVCO &mdash; GNSS Data &amp; Resources</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>FLOAT is like using cruise control that can&rsquo;t hold an exact speed. You&rsquo;re still moving forward, but precise control is gone until FIX is re-acquired.</p>
			</aside>
		</section>

		<!-- Why It Happens Even with a Nearby Base -->
		<section class="article-section">
			<h2>Why It Happens Even with a Nearby Base</h2>
			<p>
				Many operators assume short baseline distance prevents problems. However, ionospheric disturbances can vary rapidly even over short distances, and RTK correction models assume smooth ionospheric behavior.
			</p>
			<p>
				During geomagnetic storms, this assumption fails.
			</p>
			<p class="reference">
				<ExtLink href="https://igs.org/wg/ionosphere/">International GNSS Service (IGS) &mdash; Ionosphere Working Group</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It&rsquo;s like two boats anchored close together in rough waves. They still move unpredictably, even though they&rsquo;re near each other.</p>
			</aside>
		</section>

		<!-- Solar Activity Triggers -->
		<section class="article-section">
			<h2>Solar Activity Triggers</h2>
			<p>RTK drops are more likely during:</p>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Event</th>
							<th>Effect</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>Solar Flares</strong></td>
							<td>Sudden ionization increase</td>
						</tr>
						<tr>
							<td><strong>Geomagnetic Storms</strong></td>
							<td>Large-scale ionospheric instability</td>
						</tr>
						<tr>
							<td><strong>High Kp Index</strong></td>
							<td>Increased positioning risk</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/noaa-scales-explanation">NOAA SWPC Space Weather Scales</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>These events are like sudden weather fronts moving through the atmosphere &mdash; but invisible and affecting radio waves instead of airplanes.</p>
			</aside>
		</section>

		<!-- Practical Impact for Drone Pilots -->
		<section class="article-section">
			<h2>Practical Impact for Drone Pilots</h2>
			<p>When RTK drops to FLOAT during a mission:</p>
			<ul class="effect-list">
				<li>Flight control generally remains stable, though some autopilot platforms may experience position jumps during RTK transitions</li>
				<li>Position tagging accuracy decreases</li>
				<li>Post-processing corrections increase</li>
				<li>GCPs may be required</li>
			</ul>
			<p>
				Monitoring space weather helps anticipate these events.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It&rsquo;s like shooting photos with a camera that occasionally loses focus. The pictures are usable, but extra work is needed to fix them.</p>
			</aside>
		</section>

		<!-- Key Takeaways -->
		<section class="article-section">
			<h2>Key Takeaways</h2>
			<ul class="effect-list takeaways">
				<li>FIX loss can be atmospheric &mdash; during geomagnetic storms it becomes the dominant cause, but obstructions, multipath, and radio link issues are equally common in routine operations</li>
				<li>RTK is extremely sensitive to ionospheric instability</li>
				<li>Solar storms increase the likelihood of FLOAT conditions</li>
				<li>Monitoring GNSS space weather reduces mission risk</li>
			</ul>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>You wouldn&rsquo;t ignore wind forecasts before flying. Space weather is the &ldquo;wind forecast&rdquo; for GNSS signals.</p>
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
