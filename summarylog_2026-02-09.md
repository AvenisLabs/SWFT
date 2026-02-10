# SWPC-Web Summary Log

## 2026-02-09 20:51 — Fact-check corrections to "How Space Weather Affects GPS" article

Applied 4 corrections to `src/routes/gnss-reliability/how-space-weather-affects-gps/+page.svelte` (v0.1.0 → v0.2.0) based on fact-check against authoritative sources (NOAA, NASA, ESA, IGS, peer-reviewed journals):

1. **Fixed "satellites unaffected" claim** — Reworded overview, analogy, and Key Takeaways to acknowledge that extreme space weather can directly affect satellite hardware (SEEs, radiation, charging), not just the ionosphere. Old claim was factually incorrect.
2. **Qualified Radio Blackout GNSS impact** — Changed from "usually degraded but still operational" to specify that R1–R3 events degrade GNSS, but R4–R5 events can cause significant outages (per NOAA scales).
3. **Specified OPUS-RS vulnerability** — Clarified that OPUS-RS (Rapid Static) is the most affected variant, not all OPUS modes equally (per NGS documentation).
4. **Fixed drone compass analogy** — Changed misleading "compass that points wrong" (magnetometer error) to "GPS position readout that drifts" (GNSS position error) to avoid conflating two distinct error mechanisms.

Build verified clean with no warnings.

## 2026-02-09 12:00 — Created CLAUDE.md

Created `CLAUDE.md` project-level instructions file for Claude Code. Analyzed the full codebase architecture including:
- SvelteKit Pages app + Cron Worker dual-deployment structure
- Build/dev/test commands
- API envelope pattern, caching, D1 helpers
- Svelte 5 runes conventions
- NOAA naming conventions and data quirks
- Key directory layout and path aliases

Rotated previous summarylog.md to `summarylog_2026-02-06.md`.

---

## 2026-02-09 15:45 — Created README.md

Created full project `README.md` covering:
- Feature overview: dashboard, GNSS risk model (4-factor weighted composite), alerts, panels
- All 5 frontend pages with route table
- All 13 API endpoints with descriptions and response envelope format
- Tech stack table (SvelteKit, Svelte 5, CF Pages, D1, Workers, Vitest)
- Architecture diagram showing Cron Worker → D1 → SvelteKit → clients data flow
- Data sources (NOAA SWPC endpoints)
- Database schema (9 tables) with purpose descriptions
- Development setup: prerequisites, install, local dev, testing, type checking, build, deploy
- Project directory structure
- Roadmap (Phase 1 complete, Phase 2–3 planned)
- NOAA data attribution

---

## 2026-02-09 16:01 — Committed & Pushed All Pending Changes

Committed and pushed `ecbd19b` to `origin/master` with 6 files: CLAUDE.md, README.md, summarylog.md, summarylog_2026-02-06.md, swft_gpt_update.md, website update.md.

---

## 2026-02-09 16:47 — UI/UX Overhaul (Phases 0–5)

Implemented full UI/UX overhaul across 6 phases:

**Phase 0 — Footer + Accessibility:**
- Created `src/lib/utils/buildInfo.ts` — Vite-injected `__BUILD_TIME__` with America/New_York formatting
- Updated `vite.config.ts` with `define: { __BUILD_TIME__ }`
- Merged footer: copyright + last updated + NOAA attribution + version on two lines
- Improved contrast: `--text-secondary` → `#9eaab6`, `--text-muted` → `#7d8590`
- Added `:focus-visible`, `::selection`, `.sr-only` global styles
- Added `aria-label` to AlertCard toggle button, `aria-live` to AnimationPlayer frame counter

**Phase 1 — Kp Chart + Time System:**
- Enlarged KpChart: BAR_HEIGHT 120→220, BAR_WIDTH 28→40, MAX_BARS 16→24, larger fonts
- Removed fixed SVG height — responsive via viewBox + width="100%"
- Created `src/lib/utils/timeFormat.ts` — `formatLocal()`, `formatUTC()`, `formatDual()`, `formatDateHeader()`, `dateKey()`
- Replaced all `formatTimestamp()` usage with new time functions across AlertCard, KpDisplay, events page, events detail page
- Events detail page uses `formatDual()` for UTC + local display
- Deprecated `formatTimestamp()` in formatters.ts

**Phase 2 — Card Linking + Help + Alert Preview:**
- Created `src/lib/components/HelpPopover.svelte` — accessible `?` popover with keyboard support, click-outside close
- Updated `Card.svelte` to support `href` prop (clickable card) and `headerExtra` snippet slot
- Homepage cards now link: Kp → /gnss, GNSS Risk → /gnss, Active Alerts → /alerts
- Added help popovers to all 3 homepage cards with descriptive text
- Improved alert preview: 3 items max, severity badge with scale type, event type label, truncated summary, separators

**Phase 3 — GNSS Risk Bar:**
- Added horizontal risk bar to homepage GNSS Risk card: colored fill, marker, 0-100 scale labels
- Animated transitions on fill width and marker position

**Phase 4 — Events + Alerts Improvements:**
- Events page: grouped by date using `formatDateHeader()` with styled date section headers
- Alerts page: complete overhaul with category filter chips (7 types), severity filter chips (4 levels), search input, active-only toggle, client-side pagination (15/page), results count display
- Alert classifier fix in cron worker: Electron/2MeV/integral flux/energetic → solar_radiation; magnetometer/sudden impulse/SSC → geomagnetic_storm; HSS → solar_wind

**Phase 5 — GNSS Page Rework:**
- Reorganized into 5 sections: Current Risk (with risk bar + timestamp), Risk Drivers (2-col grid with mini-cards + help popovers), Operational Impact (RTK/PPP/Static/Drone guidance), Operator Guidance (highlighted current level), Methodology (collapsible)

**Files modified:** 15 (3 new, 12 modified)
**Tests:** 46/46 passing | **Build:** successful, zero warnings

---

## 2026-02-09 17:16 — Cloudflare Deployment & Project Rename

- Deployed cron worker `swft-cron-ingest` to Cloudflare (alert classifier fix live)
- Deleted old `swpc-web` Pages project (custom domains removed first)
- Confirmed old `swpc-cron-ingest` worker already deleted
- Created new `swft-web` Pages project with `--production-branch master`
- Deployed Pages app to `https://swft-web.pages.dev`
- Updated `wrangler.toml` project name from `swpc-web` → `swft-web`
- Custom domains (`swft.skypixels.org`, `swf.skypixels.org`) need manual re-add in CF dashboard

---

## 2026-02-09 17:35 — Kp Chart & Font Refinements + Help Popover Fix

**Kp Chart tweaks:**
- Reduced BAR_HEIGHT from 220 → 160 (less tall)
- Switched from UTC to local time display (`getHours()`)
- Changed time labels to HH:MM format (e.g. "15:45")
- Added date range label above the legend line (e.g. "Feb 9, 2026" or "Feb 8, 2026 – Feb 9, 2026")

**Font brightness overhaul:**
- `--text-primary`: `#f0f6fc` (bright white)
- `--text-secondary`: `#c9d1d9` (light gray)
- `--text-muted`: `#9eaab6` (medium gray)

**Help popover fix:**
- Converted from click-based to pure CSS hover tooltip
- Eliminates conflict where clicking `?` icon triggered the parent card link
- Uses `<abbr>` element with CSS `:hover` — no JS event handlers needed
- Zero a11y build warnings

**Commits:** `481d90f`, `8afa318` | **Build:** zero warnings | **Deployed** to CF Pages

---

## 2026-02-09 17:56 — Estimated Kp Line Chart + GNSS Explainer + Compact Historical Chart

Implemented near-real-time estimated Kp visualization with GNSS impact reference:

**New D1 table + migration (`0003_kp_estimated.sql`):**
- `kp_estimated` table: 15-minute downsampled buckets from 1-min NOAA data
- Applied locally and remotely

**Cron worker changes:**
- `noaa-client.ts`: Added `fetchEstimatedKp()` — fetches `/json/planetary_k_index_1m.json`, groups by 15-min floor, averages
- `db.ts`: Added `upsertKpEstimated()` with INSERT OR REPLACE (re-fetches update averages)
- New `ingest-kp-estimated.ts` task — fetch, upsert, cleanup rows >12h old
- Wired into `*/3` schedule alongside existing Kp + solar wind ingestion

**SvelteKit API + types:**
- `KpEstimatedPoint` type added to `api.ts`
- `getEstimatedKp()` server helper in `kp.ts`
- New `/api/v1/kp/estimated` endpoint with `?hours=` param (1–12, default 3)
- `CACHE_TTL.KP_ESTIMATED: 120` and `NOAA_ENDPOINTS.KP_ESTIMATED_1M` constants
- SSR loading in `+page.server.ts` via parallel `Promise.all`

**New components:**
- `KpLineChart.svelte`: SVG line chart with non-linear Y axis (60% for Kp 0–4, 30% for 4–7, 10% for 7–9), color-coded zone bands, dashed threshold lines, 30-min x-axis ticks, data point dots
- `KpGnssExplainer.svelte`: 3-column CSS grid (Normal/Storm/Severe) with per-Kp-level GNSS impact descriptions, active row highlighting based on current estimated Kp, mobile-responsive collapse

**Existing component changes:**
- `KpChart.svelte` shrunk 50%: BAR_HEIGHT 160→80, BAR_WIDTH 40→20, GAP 4→2, font sizes reduced, min-height 200→100px, updated legend text

**Homepage layout (`+page.svelte`):**
1. Estimated Kp line chart with help popover
2. GNSS effects explainer (inside same card)
3. Compact historical bar chart
- Client-side `/api/v1/kp/estimated` fetch in refreshData() cycle

**Files created:** 5 | **Files modified:** 9
**Tests:** 46/46 passing | **Build:** zero warnings
**Deployed:** Cron worker + Pages app to Cloudflare

---

## 2026-02-09 18:10 — Fix CLS Layout Shift (PageSpeed Insights Performance)

Eliminated Cumulative Layout Shift (CLS) sources identified via PageSpeed Insights:

**SSR-prefetch all dashboard data (`+page.server.ts`):**
- Added `computeGnssRisk(db)` and `getActiveAlerts(db)` to SSR `Promise.all`
- Previously GNSS risk + alerts were client-only fetches causing HIGH-severity CLS
- All 4 data sources (Kp summary, estimated Kp, GNSS risk, alerts) now SSR-hydrated

**SSR hydration in `+page.svelte`:**
- Added `$effect()` blocks for `serverGnssRisk` and `serverAlerts` hydration
- Handles empty alerts array edge case (no active alerts = loading false, not stuck)

**Min-height reservations to prevent loading→loaded height jumps:**
- `KpDisplay.svelte`: `.kp-display` → `min-height: 140px`
- `KpLineChart.svelte`: `.kp-line-chart` → `min-height: 80px`
- `+page.svelte`: `.placeholder-content` → `min-height: 140px`, `.alerts-content` → `min-height: 100px`

**Commit:** `0fbb2b8` | **Tests:** 46/46 | **Build:** zero warnings | **Deployed** to CF Pages

---

## 2026-02-09 18:53 — Eliminate Hydration CLS (PageSpeed 0.433 → 0)

Root cause: `$state` initialized to empty defaults, then `$effect` restored SSR data asynchronously. During hydration there was a frame where `kpEstimated = []` showed loading text, then the `$effect` fired and replaced it with the full SVG chart — causing a 0.433 CLS score.

**Fix — SSR-derived overlay pattern:**
- `$derived` reads SSR data from `data` prop (renders on first paint, no empty frame)
- `$state` overlays start as `undefined` (meaning "use SSR data")
- Final values merged: `$derived(clientX !== undefined ? clientX : ssrX)`
- `refreshData()` writes to client overlays, seamlessly replacing SSR data
- Zero `$effect` blocks for hydration, zero `state_referenced_locally` warnings

**Additional:** `KpLineChart` container gets `aspect-ratio: 600 / 200` instead of `min-height`, matching the SVG viewBox exactly.

**Commit:** `494efb9` | **Tests:** 46/46 | **Build:** zero warnings | **Deployed** to CF Pages

---

## 2026-02-09 19:04 — Fix Accessibility Issues (PageSpeed Insights)

Addressed heading hierarchy and color contrast failures flagged by PageSpeed Insights:

**Heading hierarchy fix:**
- `Card.svelte` v0.3.0: Changed card titles from `<h3>` → `<h2>` (page has `<h1>`, was skipping to `<h3>`)
- `KpGnssExplainer.svelte` v0.2.0: Changed column headers from `<h4>` → `<h3>` for proper hierarchy

**Color contrast fixes (WCAG AA):**
- `+page.svelte`: Alert badge text `#fff` → `#0d1117` (dark text on colored severity backgrounds for ~7:1 contrast)
- `KpGnssExplainer.svelte`: Removed `opacity: 0.8` from `.col-tag` that was reducing effective contrast
- `KpLineChart.svelte` v0.2.0: SVG axis labels `--text-muted` → `--text-secondary` for better small-text contrast; legend font 0.7→0.75rem
- `KpChart.svelte` v0.7.0: SVG time labels `--text-muted` → `--text-secondary`; chart-date and chart-legend colors `--text-muted` → `--text-secondary`, font 0.7→0.75rem

**Files modified:** 5 | **Tests:** 46/46 | **Build:** zero warnings | **Deployed** to CF Pages

---

## 2026-02-09 19:17 — Move Historical Kp Chart to GNSS Page

Moved the "Historical Kp — 3-Hour Intervals" bar chart from the homepage to the GNSS risk assessment page:

- `+page.svelte` v0.7.0: Removed KpChart import and historical chart Card
- `gnss/+page.svelte` v0.4.0: Added KpChart import, KpSummary client-side fetch (parallel with risk), new "Historical Kp" section between Operator Guidance and Methodology

**Files modified:** 2 | **Tests:** 46/46 | **Build:** zero warnings | **Deployed** to CF Pages

---

## 2026-02-09 19:32 — GNSS Knowledge Hub Structural Upgrade

Added lightweight GNSS education hub to the site:

**Homepage — Knowledge section (`+page.svelte` v0.8.0):**
- New "Understanding GNSS Reliability" section below the dashboard grid
- 3 article cards in a CSS grid (3-col, collapses to 1-col on mobile)
- Each card: inline SVG icon (satellite, drone, signal wave), title, summary, "Learn more" link
- All cards link to `/gnss-reliability`
- Pure HTML/CSS — no new JS imports or component dependencies

**New route — `/gnss-reliability` (`gnss-reliability/+page.svelte` v0.1.0):**
- Knowledge hub landing page with 3 topic sections: GNSS & Space Weather Basics, For Drone Pilots, For Surveyors
- 7 article placeholders as styled card rows with "Coming soon" labels (no `href="#"` — uses `<div>` to avoid Svelte a11y warnings)
- Inline SVG icons per section header, back-to-dashboard nav
- Static page, no server data loading

**Footer link (`+layout.svelte` v0.4.0):**
- Added "GNSS Reliability Guide" link between copyright and NOAA attribution
- Styled subtle with `--text-secondary` color

**Files created:** 1 | **Files modified:** 2 | **Tests:** 46/46 | **Build:** zero warnings, zero a11y warnings

---

## 2026-02-09 19:46 — Pillar Article: How Space Weather Affects GPS

Converted the finished evergreen article from `Library/pillar 1 how space weather affects gps.md` into a live site page:

**New route — `/gnss-reliability/how-space-weather-affects-gps` (v0.1.0):**
- Full article with 8 sections: Overview, The Ionosphere, GPS/GNSS Signal Impacts, Why RTK Breaks First, Drone Operations, Surveying & Static GNSS, Solar Flares vs Geomagnetic Storms, Key Takeaways
- Styled analogy callout boxes (blue left border, italic text, "Analogy" label)
- Two data tables (GNSS effects, solar event types) with responsive overflow
- Custom bullet lists with blue dot markers
- Source list cards for external references (NOAA, ESA, IGS, UNAVCO, FAA, NASA)
- Breadcrumb navigation, article footer with back-to-guide and dashboard links
- Meta description for SEO
- All content preserved verbatim per article instructions

**Updated links:**
- Homepage first knowledge card now links directly to the article ("Read article" instead of "Learn more")
- Knowledge hub "How Space Weather Affects GPS" item converted from placeholder div to active `<a>` link

**Files created:** 1 | **Files modified:** 2 | **Tests:** 46/46 | **Build:** zero warnings | **Deployed** to CF Pages

---

## 2026-02-09 20:02 — Fix Broken External Links on GPS Article

Audited all 10 external links on `/gnss-reliability/how-space-weather-affects-gps`. Found 4 broken (404):

| Old URL | Replacement | Reason |
|---------|-------------|--------|
| `swe.ssa.esa.int/gnss-effects` | `swe.ssa.esa.int/ionospheric-weather` | Page moved (fixed earlier) |
| `igs.org/wg/space-weather/` | `igs.org/wg/ionosphere/` | WG renamed; ionosphere WG covers GNSS space weather |
| `faa.gov/.../GNSS_Interference.pdf` | `faa.gov/.../GNSS` | PDF removed; landing page has current resource guide |
| `unavco.org/.../gnss-and-space-weather` | `unavco.org/data/gps-gnss/gps-gnss.html` | UNAVCO merged into EarthScope; old paths dead |

Verified remaining 6 links all return 200: NOAA ionospheric impacts, NOAA scales, NOAA home, ESA SWE portal, IGS home, NASA heliophysics.

**Files modified:** 1 | **Build:** zero warnings | **Deployed** to CF Pages

---

## 2026-02-09 20:13 — Weekly External Link Checker with Discord Reporting

Added automated weekly link health monitoring to the `swft-cron-ingest` worker:

**New files (4):**
- `workers/cron-ingest/src/lib/link-crawler.ts` v0.1.0 — Uses CF `HTMLRewriter` to stream-parse site pages and extract external `<a href>` links, returns deduplicated `Map<url, Set<pagePath>>`
- `workers/cron-ingest/src/lib/link-checker.ts` v0.1.0 — Checks each URL with HEAD-then-GET fallback (handles gov sites that block HEAD), 12s timeout, max 5 concurrent checks
- `workers/cron-ingest/src/lib/discord.ts` v0.1.0 — Formats results as Discord embeds (green=healthy heartbeat, red=broken links with status/method/response time/source pages), posts to webhook
- `workers/cron-ingest/src/tasks/check-links.ts` v0.1.0 — Orchestrates crawl → check → report → cron_state update, crawls 6 site pages

**Modified files (2):**
- `workers/cron-ingest/src/index.ts` v0.3.0 → v0.4.0 — Added `SITE_URL` + `DISCORD_WEBHOOK_URL` to Env, `0 12 * * 1` cron branch, `/check-links` manual HTTP trigger endpoint
- `workers/cron-ingest/wrangler.toml` — Added weekly cron schedule, `[vars]` section with `SITE_URL`

**Schedule:** Every Monday at noon UTC | **Manual trigger:** `GET /check-links`
**Post-deploy:** Set Discord webhook secret via `wrangler secret put DISCORD_WEBHOOK_URL`
**Build:** zero warnings | **Deployed:** Cron worker + Pages app to Cloudflare

---

## 2026-02-09 20:32 — Pillar Article: Why Your RTK Drone Drops to FLOAT

Published second evergreen article from `Library/` source to the GNSS Reliability knowledge hub:

**New route — `/gnss-reliability/rtk-float-drops` (v0.1.0):**
- Full article with 9 sections: Overview, What FIX Means, Ionosphere's Role, Why RTK Is Sensitive, Drop to FLOAT, Nearby Base, Solar Triggers, Drone Pilot Impact, Key Takeaways
- Analogy callout boxes matching pillar 1 style (blue left border, italic, "Analogy" label)
- Solar activity triggers table (Flares / Storms / Kp)
- Source list cards for external references
- Breadcrumb navigation, article footer with back-to-guide and dashboard links
- Meta description for SEO
- All content preserved verbatim per article instructions; emojis replaced with clean headings (matching pillar 1 pattern)

**Link audit — 2 broken URLs fixed:**
| Old URL | Replacement | Reason |
|---------|-------------|--------|
| `igs.org/wg/space-weather/` | `igs.org/wg/ionosphere/` | WG renamed (same fix as pillar 1) |
| `unavco.org/instrumentation/geodetic-gnss` | `unavco.org/data/gps-gnss/gps-gnss.html` | UNAVCO merged into EarthScope; old path dead |

**Hub activation:**
- `gnss-reliability/+page.svelte` v0.1.0 → v0.2.0: "Why RTK Drops to FLOAT" placeholder converted to active `<a>` link

**Cron worker update:**
- `check-links.ts` v0.1.0 → v0.2.0: Added `/gnss-reliability/rtk-float-drops` to SITE_PATHS (now 7 pages)

**Files created:** 1 | **Files modified:** 2 | **Build:** zero warnings | **Deployed:** Pages app + Cron worker to Cloudflare

---

## 2026-02-09 22:30 — Fact-Check: "Why Your RTK Drone Drops to FLOAT" Article (12 Claims)

Performed comprehensive fact-check of 12 specific claims from the "Why Your RTK Drone Suddenly Drops to FLOAT" article against authoritative sources (NOAA, NovAtel, ESA Navipedia, Stanford, Penn State, Springer, Wiley Space Weather journal, PX4/ArduPilot). Results:

- **9 TRUE** (claims 1, 3, 4, 5, 6, 7, 8, 9, 10)
- **3 PARTIALLY TRUE** (claims 2, 11, 12)
- **0 FALSE**

Key findings:
- GNSS fundamentals (integer ambiguity, phase tracking, code vs phase, FIX/FLOAT accuracy levels) are all technically accurate
- Kp index is a valid GNSS risk predictor per Follestad et al. 2021 and May 2024 storm studies (AR success drops 94% to 31%)
- Claims 2 and 12 overstate ionospheric causes; obstructions, multipath, and radio link are equally or more common in typical drone ops
- Claim 11 needs qualification: FIX-to-FLOAT generally safe, but PX4 documents position jumps and altitude loss during transitions
- All three ionospheric effects (delay changes, scintillation, phase shifts) verified by NovAtel, Stanford, Septentrio

---

## 2026-02-09 21:15 — Fact-Check: GNSS & Space Weather Article Claims

Performed comprehensive fact-check of 14 claims from the "How Space Weather Affects GPS/GNSS" article against authoritative sources (NOAA SWPC, NASA, ESA, peer-reviewed journals, NGS). Results:
- **10 TRUE** (claims 2, 3, 4, 5, 6, 7, 9, 11, 12, 13)
- **3 PARTIALLY TRUE** (claims 1, 8, 10)
- **1 FALSE** (claim 14 — satellites CAN be directly affected by radiation)

Key finding: Article's claim that satellites are unaffected is the most significant inaccuracy. GNSS satellites in MEO orbit are vulnerable to single event effects (SEEs), surface/internal charging, and radiation damage. NOAA, NASA, and multiple peer-reviewed papers document satellite anomalies during solar radiation storms. Article should add a caveat acknowledging direct satellite risks alongside ionospheric signal degradation.
