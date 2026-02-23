# SWPC-Web Summary Log

## 2026-02-16 19:45 — Add BoM 5th source, GFZ Hp30 upgrade, admin source control, homepage UI

Major multi-part update adding 5th fallback source, upgrading GFZ resolution, and improving source visibility:

**1. Australian BoM as 5th fallback source:**
- Added `fetchBomKp(apiKey)` to cron worker noaa-client.ts — POST-based JSON API
- Added BoM to fallback chain: Boulder → NOAA Estimated → NOAA Forecast → GFZ Hp30 → BoM
- Added BoM card to data-sources page with metadata
- Requires free API key (user must register at `sws-data.sws.bom.gov.au/register`)
- Added `BOM_API_KEY` to app.d.ts Platform env and cron worker Env interface

**2. GFZ upgraded from 3-hour Kp to 30-min Hp30:**
- Changed `index=Kp` → `index=Hp30` in both cron worker and kp-sources.ts
- 6x more granular data from independent German source
- Updated all metadata and labels

**3. Admin source control page (`/admin/kp-source`):**
- New API endpoint GET/POST `/api/v1/admin/kp-source` using cron_state table
- Radio button UI to force specific source or leave on auto
- Cron worker checks override before fallback chain, falls back to auto if forced source fails

**4. Homepage UI changes:**
- Removed "powered by NOAA data" from subtitle
- Added blue source indicator line under KP chart title showing active data source
- `data_source_label` always set on KpSummary (via KP_SOURCE_LABELS map)

**5. Data accuracy hypothesis:**
- Sudden Kp drops likely caused by magnetometer station dropout during GIC events
- NOAA's 1-min estimated Kp nowcast algorithm collapses when upstream stations go offline

Files changed: 17 modified + 2 new. Build clean, 57 tests pass. Deployed to CF Pages + cron worker.

## 2026-02-16 17:15 — Research Australian BOM Space Weather K-index API

Researched the Australian Bureau of Meteorology Space Weather API at `sws-data.sws.bom.gov.au/api/v1/`. Key findings:
- POST-based JSON API requiring a free API key (obtained via email registration)
- `get-k-index` endpoint returns `{data: [{index, valid_time, analysis_time}]}` with K values 0-9
- "Australian region" is a composite K-index (Kaus) from ~10 Australian magnetometer stations (Darwin, Canberra, Hobart, etc.) — a regional equivalent to global Kp but reflecting Southern Hemisphere mid-latitude conditions
- Kaus estimated value updates every ~20 minutes; definitive K computed every 3 hours (8x daily)
- 17 location options including individual stations and Antarctic sites
- No documented rate limits; response capped at 10,000 elements
- Date format: `YYYY-MM-DD HH:MM:SS` (UTC), omit start/end for latest value only

## 2026-02-16 14:43 — Recalibrate GNSS risk model to align with Kp card

The GNSS risk card contradicted the Kp card during storms — Kp 5.3 showed "Geomagnetic Storm" on the Kp card but only "Moderate" on the GNSS risk card. Three changes fix the misalignment:

**1. Increased Kp raw scores** (gnss-risk.ts):
- Kp 5 (G1): 55 → 65, Kp 6 (G2): 70 → 75, Kp 4: 35 → 40, Kp 3: 15 → 20
- Added Kp 9 as separate tier (100) vs Kp 8 (95)

**2. Rebalanced weights** (constants.ts):
- Kp: 35% → 40% (primary ionospheric indicator)
- R-Scale: 20% → 15%
- Bz and Speed unchanged

**3. Added Kp-based floor mechanism** (constants.ts + gnss-risk.ts):
- G1 (Kp ≥5): minimum score 40 → High
- G2 (Kp ≥6): minimum score 50 → High
- G3 (Kp ≥7): minimum score 60 → Severe
- G4 (Kp ≥8): minimum score 80 → Extreme
- Active (Kp ≥4): minimum score 25 → Moderate

**Files modified**: gnss-risk.ts, constants.ts, gnss-risk.test.ts, +page.svelte (dashboard), /gnss/+page.svelte (methodology), KpGnssExplainer.svelte, CLAUDE.md

**Tests**: 57 passing (40 GNSS risk + 17 alert classifier), including new floor-guarantee tests.
**Deployed** to Cloudflare Pages.

## 2026-02-16 14:57 — Fix forecast query, Kp colors, and add storm alert banner

Three dashboard fixes addressing user-reported issues during an active G2 geomagnetic storm:

**1. Fixed 3-hour forecast showing wrong value** (kp.ts v0.7.0):
- `getNextKpForecast` → `getCurrentKpForecast`: changed SQL to `WHERE datetime(forecast_time) > datetime('now', '-3 hours')` so the 3-hour window we're currently inside is included, not just the next upcoming one.

**2. Fixed Kp card color mapping** (KpDisplay.svelte v0.4.0 + layout):
- KpDisplay: `storm` status now maps to `var(--accent-orange)` (was red). Red reserved for `severe_storm` (Kp 7+).
- Navbar: added `kp-orange` class for Kp 5-6, `kp-yellow` now only for Kp 4.

**3. Built site-wide storm alert banner** (+layout.svelte v0.8.0):
- Three visual tiers: G2 (amber gradient), G3 (red + pulsing border), G4+ (deep red + glow + flashing badge).
- Tier determined by MAX of current Kp and highest active G-scale alert.
- Persistence: banner stays while Kp ≥ 4.5.
- Hysteresis: 30-minute dismiss delay (2 × 15-min data cycles) before auto-removal.
- User can manually dismiss for the session.
- Alert data fetched alongside Kp summary every 2 minutes via `/api/v1/alerts/active`.
- Mobile responsive: verbose message hidden on small screens.

**Files modified**: kp.ts, KpDisplay.svelte, +layout.svelte, summarylog.md
**Tests**: 57 passing, no warnings.
**Deployed** to Cloudflare Pages.

## 2026-02-16 15:21 — Add stale data detection and NOAA outage banner

Data hadn't updated for ~1 hour (4 missed 15-min cron cycles). Investigation confirmed NOAA endpoints are healthy — likely a cron worker timing issue. Added comprehensive stale data detection:

**1. Stale data utility** (dashboard.ts v0.2.0):
- `STALE_THRESHOLD_MS` = 60 minutes (4 × 15-min updates)
- `isDataStale(timestamp)` checks if a timestamp is older than threshold
- Fixed `fetchApi` TypeScript error (json typed as unknown)

**2. NOAA Data Outage banner** (+layout.svelte v0.9.0):
- Site-wide blue gradient banner appears when `kpData.current_time` > 1 hour old
- Shows "STALE" badge with pulsing animation, age in minutes, missed update count
- Links to swpc.noaa.gov for manual status check
- 30-second tick interval re-evaluates staleness so banner appears promptly
- Mobile responsive (verbose message hidden on small screens)

**3. Card-level stale indicators**:
- KpDisplay (v0.5.0): accepts `stale` prop, shows amber "Stale data — check swpc.noaa.gov" with pulse animation
- KpLineChart (v0.5.0): accepts `stale` prop, semi-transparent overlay with stale warning text
- GNSS Risk card (+page.svelte v0.10.0): inline stale indicator below advisory text
- GNSS page (/gnss v0.6.0): stale indicator below risk meter updated_at timestamp

**Files modified**: dashboard.ts, +layout.svelte, +page.svelte, KpDisplay.svelte, KpLineChart.svelte, /gnss/+page.svelte
**Tests**: 57 passing, no new type errors.
**Deployed** to Cloudflare Pages.

## 2026-02-16 15:40 — Confirmed genuine NOAA outage via D1 and endpoint investigation

User reported data still not updating despite stale detection working. Investigated cron worker and D1:
- `cron_state` table: all tasks running "ok", last run 20:21 UTC
- `kp_estimated` latest row: 19:15:00Z; `kp_obs` latest: 15:00:00.000
- Direct curl to NOAA `planetary_k_index_1m.json`: data stops at 19:27 UTC (current time 20:26 UTC)
- **Conclusion**: Genuine NOAA outage — their 1-minute estimated Kp feed stopped producing data. Cron worker functioning correctly, just no upstream data.

## 2026-02-16 16:15 — Implement Kp fallback chain with 4 sources and site indicators

Built a complete fallback chain so the site continues showing Kp data when NOAA's primary feed goes down. Four sources tried in priority order:

**1. D1 migration** (0005_kp_estimated_source.sql):
- Added `source TEXT NOT NULL DEFAULT 'noaa'` column to `kp_estimated` table
- Applied to remote D1

**2. Cron worker fallback fetch functions** (noaa-client.ts v0.4.0):
- Refactored `fetchNoaa` into generic `fetchJson` for non-NOAA URLs
- `fetchBoulderKp()` — Boulder K-index 1-min, buckets into 15-min averages
- `fetchForecastEstimatedKp()` — extracts "estimated" rows from NOAA forecast feed
- `fetchGfzKp()` — GFZ Potsdam independent Kp API with 12-hour lookback

**3. Fallback orchestration** (ingest-kp-estimated.ts v0.3.0):
- `fetchWithFallback()` tries: NOAA primary → Boulder K → NOAA forecast → GFZ Potsdam
- 30-minute staleness threshold determines if a source's data is fresh enough
- Stores `ok_fallback:{source}` in cron_state when using fallback
- `upsertKpEstimated` (db.ts v0.4.0) now writes source per row

**4. API + frontend source display**:
- `KpSummary.data_source` field (api.ts v0.5.0) conditionally included when not 'noaa'
- `kp.ts` v0.8.0: `getLatestEstimatedKp` returns source, `getKpSummary` includes it
- `KpDisplay.svelte` v0.6.0: blue badge with human-readable source labels
- `+layout.svelte` v0.10.0: amber "FALLBACK" banner (separate from blue "STALE" banner) showing which alternate source is active

**Fallback chain**: NOAA Estimated Kp → Boulder K-index (single station) → NOAA Kp Forecast (3-hour) → GFZ Potsdam (independent)

**Files modified**: 0005_kp_estimated_source.sql (new), noaa-client.ts, db.ts, ingest-kp-estimated.ts, index.ts (cron worker); api.ts, kp.ts, KpDisplay.svelte, +layout.svelte (SvelteKit app)
**Tests**: 57 passing, no new type errors.
**Deployed**: SvelteKit app + cron worker both deployed to Cloudflare.

## 2026-02-16 16:08 — Add Kp Data Sources page with live 4-source comparison

Built a dedicated `/data-sources` page showing all 4 Kp fallback chain sources live, with descriptions, charts, and status indicators. Also changed the fallback banner from amber to blue.

**1. New types and constants** (api.ts v0.6.0, constants.ts v0.5.0):
- `KpSourceData` interface: id, name, agency, country, description, resolution, dataType, url, status, points, etc.
- `KpSourcesResult` interface: aggregated sources array + activeSourceId
- `CACHE_TTL.KP_SOURCES = 180` seconds

**2. Server-side source fetcher** (kp-sources.ts v0.1.0):
- Adapts fetch/parse logic from cron worker's noaa-client.ts into SvelteKit server
- 4 individual fetchers: NOAA estimated, Boulder K, NOAA forecast, GFZ Potsdam
- `fetchAllKpSources()` via `Promise.allSettled()` — one slow source doesn't block others
- `SOURCE_METADATA` with agency, country, description for each source
- Staleness detection (>2 hours = stale)

**3. API endpoint** (/api/v1/kp/sources/+server.ts v0.1.0):
- Cached with 180s TTL via `withCache`
- Queries D1 for active source, then fetches all 4 sources live

**4. SourceKpValue.svelte** (v0.1.0):
- Compact Kp display for source cards — big number, timestamp, error/stale states

**5. Data Sources page** (/data-sources):
- SSR + client polling (3-min refresh)
- Fallback chain visualization with active/error/stale indicators
- 2×2 grid (1-col on mobile) of source cards with: name, agency, status badge, Kp value, KpLineChart, description, resolution/type/count details, source link
- Info section explaining how the fallback chain works

**6. Layout updates** (+layout.svelte v0.11.0):
- Added "Sources" nav link after "Knowledge Base"
- Fallback banner changed from amber (#422006/#d97706) to blue (#1e3a5f/#60a5fa)
- Fallback banner link changed from swpc.noaa.gov to `/data-sources`

**New files**: kp-sources.ts, /data-sources/+page.server.ts, /data-sources/+page.svelte, /api/v1/kp/sources/+server.ts, SourceKpValue.svelte
**Modified files**: api.ts, constants.ts, +layout.svelte
**Tests**: 57 passing, build clean.
**Deployed** to Cloudflare Pages.

## 2026-02-16 16:52 — Research GFZ Potsdam Hp30/Hp60 higher-frequency Kp alternatives

Researched GFZ Potsdam (kp.gfz.de) for higher-frequency alternatives to the 3-hour Kp index. Key findings documented below — see detailed research results in conversation.

**Primary discovery: Hp30 and Hp60 indices available via the same JSON API we already use.**
- Endpoint: `https://kp.gfz.de/app/json/?start=...&end=...&index=Hp30` (or `Hp60`)
- Hp30 = 30-minute resolution, Hp60 = 60-minute resolution
- Same API, same JSON structure, just different `index=` parameter
- Values are numeric (not strings), open-ended (not capped at 9 like Kp)
- Also available: `ap30` and `ap60` (linear equivalents)
- Data latency: ~30-50 minutes after interval start (21:00Z was latest at 21:51Z UTC)
- No `status` field for Hp30/Hp60 (only available for Kp/ap/Ap/Cp/C9/SN indices)
- License: CC BY 4.0, source: GFZ Potsdam

**Also discovered: GFZ Hp30/Hp60 forecast endpoint (72 hours ahead):**
- JSON: `https://spaceweather.gfz.de/fileadmin/SW-Monitor/hp30_product_file_FORECAST_HP30_SWIFT_DRIVEN_LAST.json`
- Includes ensemble quantiles (min, 0.25, median, 0.75, max) + storm probabilities
- Hp60 forecast also available at similar URL pattern

**Full API parameter reference (from Python client source):**
- Base: `https://kp.gfz-potsdam.de/app/json/`
- Required: `start`, `end` (ISO 8601, no milliseconds), `index`
- Optional: `status` (`all`|`def`, only for Kp/ap/Ap/Cp/C9/SN)
- Available indices: Kp, ap, Ap, Cp, C9, Hp30, Hp60, ap30, ap60, SN, Fobs, Fadj

## 2026-02-16 17:30 — Promote Boulder K-index to primary, fix GFZ Potsdam API

User reported NOAA Estimated Kp returning anomalous 0.0 values during an active storm (contradicting alerts and Boulder readings at 0.31). Also GFZ Potsdam was returning HTTP 500 errors.

**1. Reordered fallback chain** — Boulder K-index promoted to primary:
- Cron worker (ingest-kp-estimated.ts v0.5.0): Boulder tried first, NOAA estimated second
- Data sources page chain visualization updated to match
- API endpoint + page server defaults changed to `'noaa_boulder'`
- kp.ts v0.9.0: Boulder no longer triggers fallback banner (treated as primary alongside NOAA)

**2. Anomalous zero detection** (ingest-kp-estimated.ts):
- `isFresh()` now detects when latest bucket is 0.0 but prior 3 buckets had max ≥1.0
- Treats as invalid data, triggering fallback to next source
- Catches sudden drops from elevated Kp (e.g., 6.0 → 0.0 in one minute)

**3. Fixed GFZ Potsdam API** (noaa-client.ts v0.5.0, kp-sources.ts v0.2.0):
- Root cause: `toISOString()` produces millisecond-precision timestamps (`2026-02-16T21:12:30.374Z`) which GFZ's Python/gunicorn backend can't parse → HTTP 500
- Fix: `toGfzTimestamp()` strips milliseconds with `.replace(/\.\d{3}Z$/, 'Z')`
- Applied in both cron worker and SvelteKit server fetcher

**4. Manual ingest endpoint** (cron worker index.ts v0.7.0):
- Added `GET /ingest-kp` for triggering immediate Kp ingest without waiting for cron cycle

**Verified**: Boulder ingested 96 rows, Kp showing 0.31 (vs NOAA's 0.0), GFZ returning 3 data points (Kp 5.67).
**Files modified**: ingest-kp-estimated.ts, noaa-client.ts, index.ts (cron worker); kp-sources.ts, kp.ts, +page.server.ts, +server.ts, +page.svelte (data-sources)
**Deployed**: Both SvelteKit app and cron worker to Cloudflare.
