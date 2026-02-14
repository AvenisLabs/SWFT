<!-- +page.svelte v0.1.0 — Why Your OPUS or PPP Solution Failed Today (Space Weather Edition) -->
<script>
	import ExtLink from '$lib/components/ExtLink.svelte';
</script>

<svelte:head>
	<title>Why Your OPUS or PPP Solution Failed Today — SWFT</title>
	<meta name="description" content="Troubleshooting guide for OPUS and PPP processing failures caused by space weather, ionospheric disturbances, and geomagnetic storms." />
</svelte:head>

<main class="dashboard">
	<article class="article">
		<header class="article-header">
			<nav class="breadcrumb">
				<a href="/gnss-reliability">GNSS Reliability Guide</a>
				<span class="separator">/</span>
				<span>OPUS &amp; PPP Failures</span>
			</nav>
			<h1>Why Your OPUS or PPP Solution Failed Today</h1>
			<p class="subtitle">Space weather edition &mdash; when processing fails despite good equipment and procedures</p>
		</header>

		<!-- Overview -->
		<section class="article-section">
			<h2>Overview</h2>
			<p>
				If a GNSS dataset that normally processes cleanly suddenly fails &mdash; or produces poor results &mdash; space weather may be the cause.
			</p>
			<p>
				Services such as OPUS and PPP rely on precise satellite measurements and stable atmospheric conditions. During geomagnetic disturbances, the ionosphere becomes irregular, introducing errors that processing algorithms cannot fully model.
			</p>
			<p>
				The data itself may be degraded before it even reaches the processing service.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It's like trying to calculate an exact distance using a measuring tape that stretched during use. The math still works &mdash; but the input data is compromised.</p>
			</aside>
		</section>

		<!-- How OPUS and PPP Depend on Atmospheric Stability -->
		<section class="article-section">
			<h2>How OPUS and PPP Depend on Atmospheric Stability</h2>
			<p>
				Both OPUS (Online Positioning User Service) and PPP (Precise Point Positioning) rely on modeling signal delays through the atmosphere, especially the ionosphere and troposphere.
			</p>
			<p>When solar activity disturbs the ionosphere:</p>
			<ul class="effect-list">
				<li>Signal delays become unpredictable</li>
				<li>Carrier-phase measurements become unstable</li>
				<li>Satellite tracking may degrade</li>
				<li>Error models break down</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/impacts/space-weather-and-gps-systems">NOAA SWPC &mdash; Space Weather and GPS Systems</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://swe.ssa.esa.int/ionospheric-weather">ESA Space Weather Service &mdash; Ionospheric Weather &amp; GNSS Effects</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Processing GNSS data during a space weather event is like trying to map terrain while looking through rippling water &mdash; the features are real, but distorted.</p>
			</aside>
		</section>

		<!-- Why OPUS Solutions May Fail -->
		<section class="article-section">
			<h2>Why OPUS Solutions May Fail or Be Rejected</h2>
			<p>
				OPUS processes static GNSS data against the NOAA CORS network. If data quality falls below thresholds, submissions may be rejected or produce unreliable coordinates.
			</p>
			<h3>Common storm-related symptoms:</h3>
			<ul class="effect-list">
				<li>Excessive residual errors</li>
				<li>Inconsistent baseline solutions</li>
				<li>Failure to resolve ambiguities</li>
				<li>Large coordinate shifts</li>
				<li>Quality warnings</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.ngs.noaa.gov/OPUS/">NOAA NGS &mdash; OPUS Service</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://geodesy.noaa.gov/CORS/">NOAA CORS Network</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Submitting storm-affected data to OPUS is like feeding blurred images into a measurement tool &mdash; the system cannot determine precise edges.</p>
			</aside>
		</section>

		<!-- Why PPP Solutions May Stall -->
		<section class="article-section">
			<h2>Why PPP Solutions May Stall or Never Converge</h2>
			<p>
				PPP relies on long observation periods and precise satellite orbit and clock products to achieve high accuracy.
			</p>
			<p>During disturbed conditions:</p>
			<ul class="effect-list">
				<li>Convergence time increases dramatically</li>
				<li>Accuracy may plateau at lower precision</li>
				<li>Solutions may oscillate or drift</li>
				<li>Ambiguity resolution may fail</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://webapp.csrs-scrs.nrcan-rncan.gc.ca/geod/tools-outils/ppp.php">Natural Resources Canada &mdash; PPP Service</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://igs.org/rts/">IGS Real-Time Service</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>PPP convergence is like letting a shaken snow globe settle. Space weather is someone repeatedly shaking it, preventing the particles from settling.</p>
			</aside>
		</section>

		<!-- Signal Quality Problems -->
		<section class="article-section">
			<h2>Signal Quality Problems During Solar Activity</h2>
			<p>
				Geomagnetic storms introduce phenomena that degrade raw GNSS observations:
			</p>

			<h3>Ionospheric Scintillation</h3>
			<p>Rapid fluctuations in signal amplitude and phase.</p>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/phenomena/ionospheric-scintillation">NOAA SWPC &mdash; Ionospheric Scintillation</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like watching a distant light flicker through turbulent air &mdash; sometimes clear, sometimes distorted.</p>
			</aside>

			<h3>Cycle Slips</h3>
			<p>Loss of continuous phase tracking that breaks ambiguity resolution.</p>
			<p class="reference">
				<ExtLink href="https://gssc.esa.int/navipedia/index.php/Carrier_Phase_Cycle-Slip_Detection">ESA Navipedia &mdash; Carrier Phase Cycle-Slip Detection</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like losing count while tracking steps &mdash; you must restart from the beginning.</p>
			</aside>

			<h3>Increased Measurement Noise</h3>
			<p>Reduced signal-to-noise ratio and degraded precision.</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Trying to hear a quiet conversation in a crowded room.</p>
			</aside>
		</section>

		<!-- Why Yesterday's Survey Worked -->
		<section class="article-section">
			<h2>Why Yesterday's Survey Worked but Today's Didn't</h2>
			<p>
				Space weather conditions can change dramatically within hours. A dataset collected during quiet geomagnetic conditions may process perfectly, while one collected during a space weather event may fail despite identical procedures.
			</p>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/phenomena/geomagnetic-storms">NOAA SWPC &mdash; Geomagnetic Storms</ExtLink>
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>It's like taking photos with the same camera on a clear day versus during heavy fog &mdash; the equipment didn't change, but visibility did.</p>
			</aside>
		</section>

		<!-- How to Verify Space Weather Was the Cause -->
		<section class="article-section">
			<h2>How to Verify Space Weather Was the Cause</h2>
			<p>Check historical space weather data for the survey time:</p>
			<ul class="effect-list">
				<li>Kp Index</li>
				<li>Solar X-ray flux</li>
				<li>Geomagnetic storm alerts</li>
				<li>Scintillation reports</li>
			</ul>
			<p class="reference">
				<ExtLink href="https://www.swpc.noaa.gov/products">NOAA SWPC Data Products</ExtLink>
			</p>
			<p class="reference">
				<ExtLink href="https://kp.gfz.de">GFZ Potsdam &mdash; Kp Data Archive</ExtLink>
			</p>
			<p>
				If elevated activity coincides with the observation period, atmospheric disturbance is a likely factor. Use the <a href="/gnss">GNSS Risk Assessment</a> page to check current and recent conditions.
			</p>
		</section>

		<!-- What You Can Do -->
		<section class="article-section">
			<h2>What You Can Do</h2>
			<div class="remedies">
				<div class="remedy">
					<h3>Reprocess Later</h3>
					<p>Final precise orbit and clock products (available days to weeks later) may improve solutions once full data becomes available.</p>
				</div>
				<div class="remedy">
					<h3>Extend Observation Time</h3>
					<p>Longer sessions help average out ionospheric disturbances and improve convergence.</p>
				</div>
				<div class="remedy">
					<h3>Repeat the Survey</h3>
					<p>Collecting data during quieter geomagnetic conditions often resolves the issue entirely.</p>
				</div>
				<div class="remedy">
					<h3>Use Redundant Control</h3>
					<p>Independent measurements help detect and isolate storm-related errors.</p>
				</div>
				<div class="remedy">
					<h3>Monitor Space Weather Before Surveying</h3>
					<p>Planning around geomagnetic conditions reduces the risk of wasted field time. Check the <a href="/gnss-reliability/gnss-risk-levels">GNSS Risk Levels</a> page before deploying.</p>
				</div>
			</div>
		</section>

		<!-- Key Takeaways -->
		<section class="article-section">
			<h2>Key Takeaways</h2>
			<ul class="effect-list takeaways">
				<li>OPUS and PPP failures are often data-quality issues, not software problems</li>
				<li>Solar activity degrades measurements before processing begins</li>
				<li>RTK, static, and PPP workflows all depend on atmospheric stability</li>
				<li>Re-observation during quiet conditions is often the best solution</li>
			</ul>
			<p class="bottom-line">
				<strong>Bottom line:</strong> If processing suddenly fails, the sky &mdash; not your equipment &mdash; may be responsible.
			</p>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Blaming OPUS or PPP for storm-degraded data is like blaming a calculator for wrong answers when the numbers entered were incorrect.</p>
			</aside>
		</section>

		<!-- Authoritative Resources -->
		<section class="article-section sources">
			<h2>Authoritative Resources</h2>
			<ul class="source-list">
				<li><ExtLink href="https://www.swpc.noaa.gov">NOAA Space Weather Prediction Center</ExtLink></li>
				<li><ExtLink href="https://www.ngs.noaa.gov/OPUS/">NOAA NGS OPUS Service</ExtLink></li>
				<li><ExtLink href="https://geodesy.noaa.gov/CORS/">NOAA CORS Network</ExtLink></li>
				<li><ExtLink href="https://webapp.csrs-scrs.nrcan-rncan.gc.ca/geod/tools-outils/ppp.php">Natural Resources Canada PPP Service</ExtLink></li>
				<li><ExtLink href="https://igs.org">International GNSS Service</ExtLink></li>
				<li><ExtLink href="https://www.earthscope.org">EarthScope Consortium</ExtLink></li>
				<li><ExtLink href="https://kp.gfz.de">GFZ Potsdam Kp Data Archive</ExtLink></li>
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

	.takeaways li {
		font-weight: 500;
		color: var(--text-primary);
	}

	/* Remedy cards */
	.remedies {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.remedy {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-md) var(--space-lg);
	}

	.remedy h3 {
		margin-top: 0;
		color: var(--text-primary);
	}

	.remedy p {
		margin-bottom: 0;
	}

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
