<!-- +page.svelte v0.2.0 — GNSS Space Weather Glossary -->
<script lang="ts">
	import ExtLink from '$lib/components/ExtLink.svelte';
</script>

<svelte:head>
	<title>GNSS Space Weather Glossary — SWFT</title>
	<meta name="description" content="Clear definitions of space weather terms that affect GPS and GNSS: scintillation, ionospheric delay, cycle slips, TEC, and the Kp index." />
</svelte:head>

<main class="dashboard">
	<article class="article">
		<header class="article-header">
			<nav class="breadcrumb">
				<a href="/gnss-reliability">GNSS Reliability Guide</a>
				<span class="separator">/</span>
				<span>Glossary</span>
			</nav>
			<h1>GNSS Space Weather Glossary</h1>
			<p class="subtitle">Key terms explained in clear, practical language for pilots, surveyors, and engineers</p>
		</header>

		<!-- Overview -->
		<section class="article-section">
			<h2>Overview</h2>
			<p>
				Space weather introduces specialized terminology that can be confusing even for experienced GNSS users. This glossary explains key concepts in clear, practical language while preserving technical accuracy.
			</p>
			<p>
				These terms describe the primary ways solar activity affects GPS, RTK, and survey operations.
			</p>
			<!-- Quick nav -->
			<nav class="term-nav">
				<a href="#scintillation">Scintillation</a>
				<a href="#ionospheric-delay">Ionospheric Delay</a>
				<a href="#cycle-slip">Cycle Slip</a>
				<a href="#tec">TEC</a>
				<a href="#kp-index">Kp Index</a>
			</nav>
		</section>

		<!-- Scintillation -->
		<section class="article-section glossary-entry" id="scintillation">
			<h2>Scintillation</h2>
			<div class="def-block">
				<h3>Technical Definition</h3>
				<p>
					Ionospheric scintillation is the rapid fluctuation of radio signal amplitude and phase caused by small-scale irregularities in the ionosphere.
				</p>
				<p class="reference">
					<ExtLink href="https://www.swpc.noaa.gov/phenomena/ionospheric-scintillation">NOAA SWPC &mdash; Ionospheric Scintillation</ExtLink>
				</p>
			</div>
			<div class="def-block">
				<h3>What It Means in Practice</h3>
				<p>
					The signal strength from satellites rapidly rises and falls, and phase tracking becomes unstable. Receivers may lose lock or produce noisy measurements.
				</p>
			</div>
			<div class="def-block">
				<h3>Why It Matters</h3>
				<p>
					Scintillation is one of the main causes of RTK instability and sudden <a href="/gnss-reliability/rtk-float-drops">drops from FIX to FLOAT</a>.
				</p>
			</div>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like watching a distant light flicker through heat waves or turbulent air &mdash; sometimes bright and clear, sometimes dim or distorted.</p>
			</aside>
		</section>

		<!-- Ionospheric Delay -->
		<section class="article-section glossary-entry" id="ionospheric-delay">
			<h2>Ionospheric Delay</h2>
			<div class="def-block">
				<h3>Technical Definition</h3>
				<p>
					A delay in GNSS signal propagation caused by interaction with charged particles in the ionosphere. The amount of delay depends on electron density and signal frequency.
				</p>
				<p class="reference">
					<ExtLink href="https://gssc.esa.int/navipedia/index.php/Ionospheric_Delay">ESA Navipedia &mdash; Ionospheric Delay</ExtLink>
				</p>
			</div>
			<div class="def-block">
				<h3>What It Means in Practice</h3>
				<p>
					Signals take slightly longer to reach the receiver, making satellites appear farther away than they really are. This introduces positioning error.
				</p>
				<p>
					Dual-frequency GNSS systems can correct most of this delay, but disturbances during solar activity can exceed correction capabilities.
				</p>
			</div>
			<div class="def-block">
				<h3>Why It Matters</h3>
				<p>
					Even small timing errors translate into significant position errors at the centimeter or meter scale. See <a href="/gnss-reliability/ionospheric-delay">What Is Ionospheric Delay?</a> for a deep dive.
				</p>
			</div>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like sound traveling slower through dense fog than through clear air &mdash; the signal still arrives, just later than expected.</p>
			</aside>
		</section>

		<!-- Cycle Slip -->
		<section class="article-section glossary-entry" id="cycle-slip">
			<h2>Cycle Slip</h2>
			<div class="def-block">
				<h3>Technical Definition</h3>
				<p>
					A discontinuity in carrier-phase measurements caused by temporary loss of signal lock, resulting in an unknown integer number of cycles being added or lost.
				</p>
				<p class="reference">
					<ExtLink href="https://gssc.esa.int/navipedia/index.php/Carrier_Phase_Cycle-Slip_Detection">ESA Navipedia &mdash; Carrier Phase Cycle-Slip Detection</ExtLink>
				</p>
			</div>
			<div class="def-block">
				<h3>What It Means in Practice</h3>
				<p>
					The receiver loses track of the exact phase of the satellite signal and must reinitialize to regain high-precision accuracy.
				</p>
			</div>
			<div class="def-block">
				<h3>Why It Matters</h3>
				<p>
					Cycle slips break RTK FIX solutions and increase survey processing errors.
				</p>
			</div>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like losing count while counting steps in the dark &mdash; once you lose track, you must start over.</p>
			</aside>
		</section>

		<!-- TEC -->
		<section class="article-section glossary-entry" id="tec">
			<h2>TEC (Total Electron Content)</h2>
			<div class="def-block">
				<h3>Technical Definition</h3>
				<p>
					Total Electron Content measures the number of free electrons along the path between a satellite and receiver, typically expressed in TEC Units (TECU).
				</p>
				<p class="reference">
					<ExtLink href="https://www.swpc.noaa.gov/phenomena/total-electron-content">NOAA SWPC &mdash; Total Electron Content</ExtLink>
				</p>
			</div>
			<div class="def-block">
				<h3>What It Means in Practice</h3>
				<p>
					Higher TEC indicates more charged particles in the ionosphere, which generally means greater signal delay and increased likelihood of disturbances.
				</p>
				<p>
					Rapid TEC changes are especially problematic for GNSS accuracy.
				</p>
			</div>
			<div class="def-block">
				<h3>Why It Matters</h3>
				<p>
					TEC is a key indicator of ionospheric conditions affecting positioning performance.
				</p>
			</div>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Think of TEC as the &ldquo;thickness&rdquo; of the charged particle layer the signal must travel through &mdash; like driving through fog of varying density.</p>
			</aside>
		</section>

		<!-- Kp Index -->
		<section class="article-section glossary-entry" id="kp-index">
			<h2>Kp Index (Planetary K Index)</h2>
			<div class="def-block">
				<h3>Technical Definition</h3>
				<p>
					A global index measuring geomagnetic activity on a scale from 0 to 9, derived from magnetometer observations worldwide.
				</p>
				<p class="reference">
					<ExtLink href="https://www.swpc.noaa.gov/products/planetary-k-index">NOAA SWPC &mdash; Planetary K Index</ExtLink>
				</p>
			</div>
			<div class="def-block">
				<h3>What It Means in Practice</h3>
				<p>
					Higher Kp values indicate stronger geomagnetic disturbances, which typically correlate with increased ionospheric instability.
				</p>
				<p>
					Kp &ge; 5 indicates geomagnetic storm conditions (NOAA G1 threshold).
				</p>
			</div>
			<div class="def-block">
				<h3>Why It Matters</h3>
				<p>
					The Kp index provides a quick, widely used indicator of <a href="/gnss-reliability/gnss-risk-levels">GNSS reliability risk</a>.
				</p>
			</div>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>Like a weather severity scale for the invisible magnetic environment around Earth &mdash; calm at low values, stormy at high values.</p>
			</aside>
		</section>

		<!-- How These Terms Connect -->
		<section class="article-section">
			<h2>How These Terms Connect</h2>
			<p>
				These concepts describe different aspects of the same underlying problem: disturbances in the ionosphere affecting GNSS signal propagation.
			</p>
			<ul class="connection-list">
				<li><strong>TEC</strong> describes how much charged material is present</li>
				<li><strong>Ionospheric delay</strong> describes the timing error caused</li>
				<li><strong>Scintillation</strong> describes rapid fluctuations</li>
				<li><strong>Cycle slips</strong> describe receiver tracking failures</li>
				<li><strong>Kp</strong> indicates overall geomagnetic activity driving these effects</li>
			</ul>
			<aside class="analogy">
				<span class="analogy-label">Analogy</span>
				<p>If GNSS signals were cars traveling on a highway:</p>
				<ul class="analogy-list">
					<li><strong>TEC</strong> is traffic density</li>
					<li><strong>Ionospheric delay</strong> is slower travel time</li>
					<li><strong>Scintillation</strong> is erratic stop-and-go movement</li>
					<li><strong>Cycle slips</strong> are cars that exit and re-enter with a scrambled odometer</li>
					<li><strong>Kp</strong> is the overall traffic severity warning</li>
				</ul>
			</aside>
		</section>

		<!-- Authoritative Sources -->
		<section class="article-section sources">
			<h2>Authoritative Sources</h2>
			<ul class="source-list">
				<li><ExtLink href="https://www.swpc.noaa.gov">NOAA Space Weather Prediction Center</ExtLink></li>
				<li><ExtLink href="https://swe.ssa.esa.int">ESA Space Weather Portal</ExtLink></li>
				<li><ExtLink href="https://igs.org">International GNSS Service</ExtLink></li>
				<li><ExtLink href="https://www.earthscope.org">EarthScope Consortium</ExtLink></li>
			</ul>
		</section>

		<!-- Navigation -->
		<footer class="article-footer">
			<p class="guide-note">This glossary is a permanent reference within the <a href="/gnss-reliability">GNSS Reliability &amp; Space Weather Guide</a>.</p>
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

	/* Quick nav links */
	.term-nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.term-nav a {
		display: inline-block;
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius-sm);
		color: var(--accent-blue);
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: none;
		transition: border-color 0.2s;
	}

	.term-nav a:hover {
		border-color: var(--accent-blue);
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

	/* Glossary entry styling — each term gets a card-like container */
	.glossary-entry {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		padding: var(--space-lg) var(--space-xl);
		scroll-margin-top: var(--space-xl);
	}

	.glossary-entry h2 {
		border-bottom: none;
		padding-bottom: 0;
		margin-bottom: var(--space-sm);
	}

	/* Definition blocks within an entry */
	.def-block {
		margin-bottom: var(--space-sm);
	}

	.def-block h3 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--accent-blue);
		margin-top: var(--space-md);
		margin-bottom: var(--space-xs);
	}

	.def-block p {
		margin-bottom: var(--space-sm);
	}

	/* Connection list */
	.connection-list {
		list-style: none;
		margin-bottom: var(--space-md);
	}

	.connection-list li {
		color: var(--text-secondary);
		padding: var(--space-xs) 0;
		padding-left: var(--space-lg);
		position: relative;
		line-height: 1.6;
	}

	.connection-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.7em;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent-blue);
	}

	/* Analogy callouts */
	.analogy {
		border-left: 3px solid var(--accent-blue);
		border-radius: 0 var(--border-radius) var(--border-radius) 0;
		padding: var(--space-md) var(--space-lg);
		margin: var(--space-md) 0;
	}

	/* Inside glossary cards, analogy has no extra background since card already has bg */
	.glossary-entry .analogy {
		background: transparent;
	}

	/* Outside glossary cards, analogy needs background */
	.article-section:not(.glossary-entry) .analogy {
		background: var(--bg-card);
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

	.analogy-list {
		list-style: none;
		margin-top: var(--space-sm);
	}

	.analogy-list li {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		font-style: italic;
		padding: 2px 0;
		line-height: 1.6;
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

		.glossary-entry {
			padding: var(--space-md) var(--space-lg);
		}

		.term-nav {
			gap: var(--space-xs);
		}

		.term-nav a {
			font-size: 0.8rem;
			padding: var(--space-xs) var(--space-sm);
		}
	}
</style>
