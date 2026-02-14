<!-- +page.svelte v0.11.0 — GNSS Reliability Knowledge Hub landing page -->

<svelte:head>
	<title>GNSS Reliability Guide — SWFT</title>
</svelte:head>

<main class="dashboard">
	<header>
		<h1>GNSS Reliability Guide</h1>
		<p class="subtitle">Understanding how space weather affects positioning, RTK, and survey operations</p>
	</header>

	<!-- Section 1: GNSS & Space Weather Basics -->
	<section class="hub-section">
		<h2 class="hub-heading">
			<!-- Satellite icon -->
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="2" />
				<path d="M7 17l-2 2" />
				<path d="M17 7l2-2" />
				<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
				<path d="M8.46 15.54a5 5 0 0 1 0-7.07" />
				<path d="M18.36 5.64a9 9 0 0 1 0 12.73" />
				<path d="M5.64 18.36a9 9 0 0 1 0-12.73" />
			</svg>
			GNSS &amp; Space Weather Basics
		</h2>
		<ul class="article-list">
			<li class="article-item">
				<a href="/gnss-reliability/how-space-weather-affects-gps" class="article-link live">
					<span class="article-title">How Space Weather Affects GPS <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">Solar activity disrupts the ionosphere, degrading satellite signal accuracy and availability.</span>
				</a>
			</li>
			<li class="article-item">
				<a href="/gnss-reliability/gnss-risk-levels" class="article-link live">
					<span class="article-title">GNSS Risk Levels for Operations <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">Operational risk framework for drone RTK and survey GNSS based on the Kp index and scintillation.</span>
				</a>
			</li>
			<li class="article-item">
				<a href="/gnss-reliability/solar-flares-vs-storms" class="article-link live">
					<span class="article-title">Solar Flares vs Geomagnetic Storms <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">Two distinct phenomena with different timelines, causes, and impacts on GNSS receivers.</span>
				</a>
			</li>
			<li class="article-item">
				<a href="/gnss-reliability/ionospheric-delay" class="article-link live">
					<span class="article-title">What Is Ionospheric Delay? <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">How charged particles in the ionosphere bend and slow satellite signals, introducing positioning errors.</span>
				</a>
			</li>
			<li class="article-item">
				<a href="/gnss-reliability/glossary" class="article-link live">
					<span class="article-title">GNSS Space Weather Glossary <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">Key terms explained: scintillation, ionospheric delay, cycle slips, TEC, and the Kp index.</span>
				</a>
			</li>
		</ul>
	</section>

	<!-- Section 2: For Drone Pilots -->
	<section class="hub-section">
		<h2 class="hub-heading">
			<!-- Drone icon -->
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M5 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
				<path d="M15 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
				<path d="M5 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
				<path d="M15 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
				<path d="M9 5h6" />
				<path d="M9 19h6" />
				<path d="M12 8v8" />
			</svg>
			For Drone Pilots
		</h2>
		<ul class="article-list">
			<li class="article-item">
				<a href="/gnss-reliability/drone-mission-cancel" class="article-link live">
					<span class="article-title">When Should Drone Pilots Cancel Missions? <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">Kp thresholds, risk indicators, and decision criteria for go/no-go flight planning.</span>
				</a>
			</li>
			<li class="article-item">
				<a href="/gnss-reliability/rtk-float-drops" class="article-link live">
					<span class="article-title">Why RTK Drops to FLOAT <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">Ionospheric scintillation and signal interference cause ambiguity resolution failures in real time.</span>
				</a>
			</li>
			<li class="article-item">
				<a href="/gnss-reliability/dji-emlid-base-stations" class="article-link live">
					<span class="article-title">Why DJI, Emlid &amp; Base Stations Struggle <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">DJI RTK drones, Emlid receivers, and NTRIP networks all depend on ionospheric stability &mdash; and solar storms take it away.</span>
				</a>
			</li>
		</ul>
	</section>

	<!-- Section 3: For Surveyors -->
	<section class="hub-section">
		<h2 class="hub-heading">
			<!-- Ruler/survey icon -->
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M3 5v14" />
				<path d="M3 12h5" />
				<path d="M3 8h3" />
				<path d="M3 16h3" />
				<path d="M21 5v14" />
				<path d="M21 12h-5" />
				<path d="M21 8h-3" />
				<path d="M21 16h-3" />
				<path d="M12 3v18" />
				<path d="M9 5h6" />
				<path d="M9 19h6" />
			</svg>
			For Surveyors
		</h2>
		<ul class="article-list">
			<li class="article-item">
				<a href="/gnss-reliability/space-weather-gnss-survey" class="article-link live">
					<span class="article-title">How Space Weather Ruins GNSS Surveys <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">When ionospheric conditions degrade beyond correction model limits, survey accuracy collapses.</span>
				</a>
			</li>
			<li class="article-item">
				<a href="/gnss-reliability/opus-ppp-failures" class="article-link live">
					<span class="article-title">OPUS &amp; PPP Failures Explained <span class="badge-live">Read now &rarr;</span></span>
					<span class="article-desc">Why OPUS and PPP processing fails during space weather events &mdash; and what to do about it.</span>
				</a>
			</li>
		</ul>
	</section>

	<nav class="back-link">
		<a href="/">&larr; Back to dashboard</a>
	</nav>
</main>

<style>
	header {
		margin-bottom: var(--space-xl);
	}

	.hub-section {
		margin-bottom: var(--space-xl);
	}

	.hub-heading {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-lg);
		color: var(--text-primary);
		margin-bottom: var(--space-md);
	}

	.hub-heading svg {
		color: var(--accent-blue);
		flex-shrink: 0;
	}

	.article-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.article-item {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--border-radius);
		transition: border-color 0.2s;
	}

	.article-item:hover {
		border-color: var(--accent-blue);
	}

	.article-link {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-md) var(--space-lg);
		text-decoration: none;
		color: inherit;
	}

	a.article-link:hover {
		text-decoration: none;
	}

	.article-title {
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.article-desc {
		color: var(--text-secondary);
		font-size: 0.8rem;
		line-height: 1.5;
	}

	/* Live article indicators */
	.article-item:has(.live) {
		border-color: var(--accent-blue);
	}

	.badge-live {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--accent-blue);
		margin-left: var(--space-xs);
		vertical-align: middle;
	}

	.back-link {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--border-default);
	}

	.back-link a {
		color: var(--accent-blue);
		font-size: var(--font-size-sm);
	}
</style>
