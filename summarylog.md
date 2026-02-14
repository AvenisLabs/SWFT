# SWPC-Web Summary Log

## 2026-02-14 00:10 — Add DJI/Emlid/Base Stations article to Knowledge Hub

Created new Knowledge Hub article at `/gnss-reliability/dji-emlid-base-stations`:

1. **New Svelte page** (`+page.svelte` v0.1.0): 9 sections — overview, ionospheric dependency, DJI RTK accuracy loss, Emlid RS2/RS3 base station issues, NTRIP network limitations, rapid ionospheric changes, short baseline limitations, practical mapping impact, key takeaways.
2. **Link fixes**: 7 broken links replaced with verified alternatives — NOAA GPS impacts, ESA ionospheric weather, DJI D-RTK 2, Emlid Reach RS3, FAA GNSS resource guide, EarthScope (replacing UNAVCO), removed defunct IGS space-weather WG.
3. **All 9 analogies validated**: All accurate and consistent — no replacements needed.
4. **All claims verified** against NOAA/ESA/standard GNSS literature.
5. **Hub updated** (v0.6.0): "Why DJI, Emlid & Base Stations Struggle" added as live entry in For Drone Pilots section.
6. **CSS warning resolved**: Removed unused `.article-section h3` selector.

Deployed to Cloudflare Pages.

## 2026-02-13 23:40 — Add OPUS/PPP Failures article to Knowledge Hub

Created new Knowledge Hub article at `/gnss-reliability/opus-ppp-failures`:

1. **New Svelte page**: 9 sections — OPUS/PPP atmospheric dependency, failure symptoms, signal quality problems (scintillation, cycle slips, noise), verification steps, and 5 remediation strategies in card layout.
2. **Link fixes**: 4 broken/nonexistent links replaced with verified alternatives (NOAA GPS impacts, ESA ionospheric weather, Navipedia cycle-slip detection, EarthScope).
3. **All analogies validated**: 9 analogies all accurate, no replacements needed.
4. **Hub updated** (v0.5.0): "OPUS & PPP Failures Explained" in For Surveyors section now live.

Deployed to Cloudflare Pages.

## 2026-02-13 23:15 — Live Kp indicators in navbar

Added current Kp and 3-hour predicted Kp to the top navigation bar, right-aligned:

1. **Kp forecast query** (`kp.ts` v0.6.0): New `getNextKpForecast()` queries the `kp_forecast` table for the nearest future 3-hour window with the most recently issued prediction.
2. **KpSummary enhanced** (`api.ts` v0.4.0): Added optional `forecast_kp` and `forecast_time` fields — backward compatible, existing consumers unaffected.
3. **Navbar widget** (`+layout.svelte` v0.7.0): Client-side `onMount` fetches `/api/v1/kp/summary`, displays "Current Kp: X.X" and "3-Hour Predict: X.X" with color coding — green (0-4), yellow (5-6), red (7+). Auto-refreshes every 2 minutes. Fades in on load, no CLS.
4. **Mobile responsive**: On small screens, Kp indicators move above nav links.
5. **Wording fix**: Changed "during severe storms" → "during severe space weather events" in GNSS Risk Levels article to avoid confusion with terrestrial weather.

Deployed to Cloudflare Pages.

## 2026-02-13 22:45 — Add GNSS Risk Levels knowledge hub article

Created new Knowledge Hub article at `/gnss-reliability/gnss-risk-levels` from content brief:

1. **New Svelte page**: Full article with 8 sections — risk table, escalation breakdown, RTK vs Static sensitivity, scintillation, mission planning, mitigation strategies, key takeaways, and authoritative resources.
2. **Live space weather banner**: Compact clickable widget at top fetches current Kp + GNSS risk from API, links to `/gnss` page.
3. **Link verification**: Fixed 3 dead links — ESA `gnss-effects` (404) → `ionospheric-weather`, IGS `wg/space-weather` (404) → removed, UNAVCO (merged into EarthScope 2023) → `earthscope.org`.
4. **Analogy fix**: Replaced KP 5 "driving in gusty winds" (broke maritime theme) with "sailing in a building swell" to maintain nautical metaphor progression.
5. **Hub landing page**: Added article as live entry in GNSS & Space Weather Basics section (v0.3.0 → v0.4.0).
6. **All claims verified**: Risk table matches NOAA G-scale, sensitivity ranking correct, scintillation effects accurate.

Deployed to Cloudflare Pages.

## 2026-02-13 20:52 — Chart readability improvements and active Kp highlight

Three visual improvements to the homepage estimated Kp section:

1. **Chart x-axis**: Now shows every 15-minute tick (was 30-min) for <=3h spans, with mono font at 9px to fit. Makes the 15-min data intervals clearly visible.
2. **Chart y-axis**: Shows 0, 1, 2, 3, 4, 5, 7, 9 (was 0, 2, 4, 5, 7, 9). Every integer in the quiet range (0-4) is now labeled for easier reading.
3. **KpGnssExplainer active highlight**: Changed from subtle `rgba(255,255,255,0.06)` grey to `rgba(234,179,8,0.15)` yellow background with a `rgba(234,179,8,0.4)` yellow border. Much more visible.

**Files changed:** `KpLineChart.svelte` v0.4.0, `KpGnssExplainer.svelte` v0.3.0

---

## 2026-02-13 20:43 — Switch Kp card and GNSS risk to real-time estimated Kp

**Problem:** The homepage Kp Index card and GNSS risk score were sourced from `kp_obs` (NOAA 3-hour planetary K-index), which includes predicted future values. Card was showing Kp 4 with a future timestamp while the real-time chart showed Kp 3.

**Fix:** Switched both to use `kp_estimated` table (real-time 15-min averaged magnetometer data):
- `kp.ts` v0.5.0 — `getKpSummary()` now reads current Kp from `kp_estimated` (most recent 15-min bucket). Trend derived from last hour of estimated data. Historical `recent[]` array still uses `kp_obs` for 3-hour context.
- `gnss-risk.ts` v0.3.0 — `getLatestConditions()` Kp query switched from `kp_obs` to `kp_estimated`.
- `charts.ts` v0.3.0 — `buildKpChartUrl()` still uses `kp_obs` but filtered to exclude future predictions.

**Result:** Kp card and GNSS risk now match the real-time chart. No more predicted/future values.

---

## 2026-02-10 21:46 — Fix Kp chart x-axis labels (ISO timestamp comparison bug)

**Root cause:** Timestamps in `kp_estimated` (and `solarwind_summary`) are stored in ISO 8601 format with `T`/`Z` (e.g., `2026-02-10T02:15:00Z`), but D1's `datetime('now')` returns `2026-02-10 02:15:00` (space separator). SQLite string comparison: `T` (ASCII 84) > space (ASCII 32), so `WHERE ts > datetime('now', '-3 hours')` matched **every row** — the 3-hour filter was returning all 12 hours of data, causing x-axis labels to overlap.

**Fix — SQL queries:** Wrapped `ts` with `datetime()` to normalize ISO format before comparison in all affected queries:
- `src/lib/server/kp.ts` (v0.2.0 → v0.3.0) — `getRecentKp` and `getEstimatedKp`
- `src/lib/server/solarwind.ts` (v0.1.0 → v0.2.0) — `getRecentSolarWind`
- `src/lib/server/charts.ts` (v0.1.0 → v0.2.0) — `buildKpChartUrl`
- `workers/cron-ingest/src/tasks/ingest-kp-estimated.ts` (v0.1.0 → v0.2.0) — purge query
- `workers/cron-ingest/src/tasks/generate-summaries.ts` (v0.2.0 → v0.3.0) — storm/wind detection queries

**Fix — Chart resilience:** Updated `KpLineChart.svelte` (v0.2.0 → v0.3.0) with adaptive x-axis label intervals based on time span: ≤3h → 30min, ≤6h → 1h, ≤12h → 2h, >12h → 3h. Prevents label overlap regardless of data volume.

Build: 0 new errors, 0 warnings. Deployed SvelteKit app + cron worker.

## 2026-02-10 02:15 — Only autoplay 304Å animation on imagery page

Changed `AnimationPlayer.svelte` (v0.2.0 → v0.3.0) to accept an `autoplay` prop (default `false`). Previously all animations started playing immediately on load. Now only the SUVI 304Å panel autoplays; the rest load paused on the first frame and require a click to play. Updated `PanelGrid.svelte` (v0.1.0 → v0.2.0) to pass `autoplay={panel.id === 'suvi-304'}`.

## 2026-02-10 00:54 — Add Knowledge Base nav tab

Added "Knowledge Base" link to the top navigation bar in `+layout.svelte` (v0.5.0 → v0.6.0), pointing to `/gnss-reliability`. Now visible site-wide alongside Home, GNSS, Alerts, Events, and Imagery tabs.

Build: zero warnings. Deployed to Cloudflare Pages.

## 2026-02-10 00:49 — GNSS Reliability hub page visual polish

Updated `src/routes/gnss-reliability/+page.svelte` (v0.2.0 → v0.3.0):
- "Coming soon" labels now bright yellow (`#f5c542`) with bold weight for visibility
- Live articles ("How Space Weather Affects GPS", "Why RTK Drops to FLOAT") now have a blue "Read now →" badge and a persistent blue border on their cards
- Uses `:has(.live)` selector for card border highlight

Build: zero warnings. Deployed to Cloudflare Pages.

## 2026-02-10 00:35 — Fix CRON_WORKER_URL + clarify dashboard link counts

**Bug fix:** `CRON_WORKER_URL` in `wrangler.toml` had wrong subdomain (`skypixels` instead of `maine-sky-pixels`), causing CF error 1016 (DNS resolution failure) when triggering manual link checks. Fixed to `https://swft-cron-ingest.maine-sky-pixels.workers.dev`.

**Dashboard clarity:** The dashboard showed "13 healthy" in the check result toast but "26 healthy" in the summary cards — both correct but measuring different things:
- 13 = unique URLs checked (what the link checker deduplicates to)
- 26 = link placements in `site_links` (same URL on different pages = separate rows, e.g. NOAA footer on all 8 pages = 8 rows)

Updated `admin/+page.svelte` v0.2.0:
- Added "Unique URLs" card alongside "Link Placements" card
- Check run section now says "unique URLs checked"
- Toast message clarified with "(unique URLs)" suffix

**Verification:** Confirmed all 21 ExtLink placements in source match live site output exactly. Zero hardcoded external `<a>` tags remain. D1 `site_links` table has 26 rows (13 unique URLs across 8 crawled pages) — all healthy (HTTP 200).

## 2026-02-10 00:10 — Admin section: link management, ExtLink component, check history

Implemented full admin dashboard for external link health monitoring and override management.

**Phase 1 — D1 Migration** (`migrations/0004_admin_links.sql`):
- `site_links` table: discovered external links with override fields (url, text, action)
- `link_check_runs` table: run metadata (timestamps, counts, trigger type)
- `link_check_results` table: per-URL results per run
- Applied locally and remotely

**Phase 2 — Server helpers** (`src/lib/server/links.ts` + `src/lib/types/api.ts`):
- Query functions: getActiveOverrides, getAllLinks, getLinkById, updateLinkOverride, check run queries
- New types: SiteLink, LinkOverride, LinkCheckRun, LinkCheckResult

**Phase 3 — ExtLink component** (`src/lib/components/ExtLink.svelte` + `src/routes/+layout.server.ts`):
- Component reads overrides from `$page.data.linkOverrides` (loaded by layout server)
- Three render modes: default (link), unlink (text only), remove (hidden)
- Layout server loads active overrides from D1 with graceful fallback

**Phase 4 — Link migration**:
- Replaced all 21 external `<a>` tags with `<ExtLink>` across 3 files
- `+layout.svelte` (1), `how-space-weather-affects-gps/+page.svelte` (10), `rtk-float-drops/+page.svelte` (10)

**Phase 5 — Admin API endpoints** (5 new files under `src/routes/api/v1/admin/`):
- GET links, PUT links/[id], POST link-check (proxy to cron worker), GET link-checks, GET link-checks/[id]
- Added CRON_WORKER_URL to wrangler.toml and app.d.ts

**Phase 6 — Admin UI** (5 new files under `src/routes/admin/`):
- Dashboard: health summary cards, last check run, manual trigger button
- Link management: table with inline editing (override URL, text, action)
- Check history: list of past runs + detail view with per-URL results

**Phase 7 — Cron worker updates**:
- `link-crawler.ts` v0.2.0: extracts link text via HTMLRewriter (returns `Map<url, Map<page, text>>`)
- `link-checker.ts` v0.2.0: accepts new map structure
- `check-links.ts` v0.3.0: creates check run, upserts site_links, persists results, accepts triggerType
- `index.ts` v0.5.0: passes 'scheduled'/'manual' trigger type
- Added `/panels` to SITE_PATHS

**Files created (11):** migration, server helpers, ExtLink, layout.server, 5 admin pages, 5 API endpoints
**Files modified (8):** layout.svelte, 2 article pages, api.ts, app.d.ts, wrangler.toml, 4 cron worker files

Build: 0 new errors, 0 new warnings, 46 tests pass. Deployed SvelteKit app + cron worker to production.

## 2026-02-10 00:04 — Fact-check corrections to "RTK Float Drops" article

Applied 5 corrections to `src/routes/gnss-reliability/rtk-float-drops/+page.svelte` (v0.2.0 → v0.3.0) based on fact-check against authoritative sources (SwiftNav, Trimble, ESA Navipedia, PX4 issues, peer-reviewed journals):

1. **Reworded "often caused by ionosphere"** (line 30) — Changed to acknowledge obstructions, multipath, and radio link as common causes, with ionospheric disturbance dominant specifically during geomagnetic storms. Per SwiftNav/Trimble troubleshooting guides.
2. **Reworded Key Takeaway "often atmospheric"** (line 192) — Same qualification: atmospheric causes dominate during storms but other causes are equally common in routine operations.
3. **Added safety qualifier to flight control claim** (line 174) — Now notes that some autopilot platforms may experience position jumps during RTK transitions. Per PX4 issues #21555 and #21471.
4. **Fixed FLOAT analogy** (line 110) — Changed "occasionally drifts" to "can't hold exact speed" to convey persistent degradation rather than intermittent.
5. **Replaced CORS link with ESA Navipedia RTK Fundamentals** (line 48) — Old link pointed to CORS network homepage, not RTK fundamentals. New link: `gssc.esa.int/navipedia/index.php/RTK_Fundamentals`.

Also fixed 4 unused CSS selector warnings across both article pages (`.reference a` and `.source-list a` → `.reference :global(a)` and `.source-list :global(a)`) caused by ExtLink component boundary.

Build verified clean with zero warnings.
