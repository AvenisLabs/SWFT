# SWPC-Web Summary Log

## 2026-03-15 03:46 — Switch to hourly-only updates, remove all client polling

Drastic D1 usage reduction — all updates capped at 1 hour, no client-side auto-refresh.

### Cron worker → single hourly schedule
- `workers/cron-ingest/src/index.ts` v0.8.0 → v0.9.0: Single `0 * * * *` trigger runs all tasks
- `workers/cron-ingest/wrangler.toml`: `*/3, */5, */15` → `0 * * * *` (weekly link check kept)
- Cron runs/day: 864 → 24 (97% reduction)

### Cache TTLs → 1 hour
- `constants.ts`: All D1-backed TTLs → 3600s (non-D1 endpoints like panels/images unchanged)
- `dashboard.ts` v0.2.0: Memo-cache TTLs → 3600s

### Client polling removed entirely
- `+layout.svelte` v0.12.1 → v0.13.0: Removed `onMount`, `setInterval`, `refreshAll()`, client state
  - Navbar Kp + alerts now from SSR `data` prop via `+layout.server.ts`
  - Storm banners computed from SSR data (no hysteresis timer — pure `$derived`)
- `+page.svelte` v0.12.0 → v0.13.0: Removed all client state overlays and polling
  - No more `clientKp/clientEstimated/clientRisk/clientAlerts` state variables
  - Reads directly from `data` prop (SSR only)
- `data-sources/+page.svelte` v0.3.0 → v0.4.0: Removed 3-minute polling
- `dashboard.ts` (store) v0.2.0 → v0.3.0: Removed unused writable stores, kept `fetchApi` + `isDataStale`

### Layout server provides navbar data
- `+layout.server.ts` v0.2.0 → v0.3.0: Now fetches kpSummary + alerts alongside link overrides

### Staleness threshold
- `STALE_THRESHOLD_MS`: 60 min → 120 min (2 missed hourly updates)

### Projected monthly usage
- Reads: ~8.2M → ~400K/month (95% reduction)
- Writes: ~1.6M → ~80K/month (95% reduction)

Both SvelteKit app and cron worker deployed. All 57 tests pass.

## 2026-03-15 03:26 — Fix 729M row reads: datetime() full scans, unbounded tables, COUNT(*)

Root cause analysis of 729.57M D1 row reads in 6 days identified three major issues:

### Problem 1: STATUS endpoint COUNT(*) with 30s TTL (~390M rows/6 days, 54%)
- 3 unbounded COUNT(*) queries (kp_obs, alerts_raw, solarwind_summary) every 30 seconds
- Fix: Replaced with bounded COUNT (last 7 days, uses index), increased TTL from 30s to 300s

### Problem 2: datetime() function preventing index use (~240M rows/6 days, 33%)
- `WHERE datetime(ts) > datetime('now', ...)` wraps the indexed column in a function
- SQLite cannot use B-tree index when column is wrapped — forces full table scan
- Affected: kp.ts, alerts.ts, events.ts, charts.ts, gnss-risk.ts, generate-summaries.ts, ingest-kp-estimated.ts
- Fix: Precompute ISO 8601 bounds in JavaScript, use plain `WHERE ts > ?` comparison

### Problem 3: Tables growing without bounds (~100M rows/6 days, 14%)
- kp_obs, solarwind_summary, alerts_raw/classified, events had no cleanup
- Every scan/COUNT got more expensive over time
- Fix: Added table cleanup to generate-summaries.ts (runs every 15 min):
  - kp_obs: 30-day retention
  - solarwind_summary: 7-day retention
  - alerts: 90-day retention
  - events: 90-day retention

### Files changed
- `src/lib/server/kp.ts` v0.10.0 → v0.11.0 (hoursAgo helper, index-friendly WHERE)
- `src/lib/server/gnss-risk.ts` v0.5.0 → v0.6.0 (ISO bound for R-scale query)
- `src/lib/server/alerts.ts` v0.1.0 → v0.2.0 (precomputed bounds)
- `src/lib/server/events.ts` v0.1.0 → v0.2.0 (precomputed bounds)
- `src/lib/server/charts.ts` v0.3.0 → v0.4.0 (precomputed bounds)
- `src/lib/server/constants.ts` STATUS TTL: 30 → 300
- `src/routes/api/v1/status/+server.ts` v0.1.0 → v0.2.0 (bounded COUNT, no full scan)
- `workers/cron-ingest/src/tasks/generate-summaries.ts` v0.3.0 → v0.4.0 (index-friendly + table cleanup)
- `workers/cron-ingest/src/tasks/ingest-kp-estimated.ts` DELETE now uses precomputed bound
- `migrations/0006_add_missing_indexes.sql` — NEW (FK index on alerts_classified.raw_alert_id)
- All 57 tests pass, SvelteKit + cron worker builds clean

### Projected impact
- Estimated row reads: ~120M/day → ~2-5M/day (95%+ reduction)
- STATUS endpoint alone: ~65M/day → ~0.5M/day
- Table sizes will shrink over next cycle as cleanup purges old rows

## 2026-03-15 03:17 — Reduce D1 query volume to prevent quota overages

Implemented 5 optimizations to dramatically reduce D1 database queries:

### 1. In-memory TTL cache (`src/lib/server/memo-cache.ts` — NEW)
- Per-isolate `Map`-based cache with TTL expiry
- `memoize()` helper with inflight deduplication (concurrent calls share a single promise)
- `memoEvict()` and `memoClear()` for cache invalidation

### 2. Combined dashboard endpoint (`/api/v1/dashboard` — NEW)
- `src/lib/server/dashboard.ts` — consolidated fetch with memo-cache
- `src/routes/api/v1/dashboard/+server.ts` — cached endpoint (120s TTL)
- Returns kpSummary + kpEstimated + gnssRisk + alerts in one response
- Passes pre-fetched Kp to `computeGnssRiskWithKp()` to eliminate duplicate query

### 3. Homepage SSR uses internal fetch (`+page.server.ts` v0.3.0 → v0.4.0)
- Replaced 4 direct D1 function calls with single `fetch('/api/v1/dashboard')`
- SvelteKit short-circuits internal fetch (no HTTP roundtrip), but now benefits from `withCache`
- Homepage SSR: 10 D1 queries → 0 (on cache hit)

### 4. Cached link overrides (`+layout.server.ts` v0.1.0 → v0.2.0)
- Wrapped `getActiveOverrides()` in `memoize()` with 5-minute TTL
- Previously queried D1 on every page navigation with zero caching

### 5. Client polling consolidated (`+page.svelte` v0.11.0 → v0.12.0)
- Homepage `refreshData()` now calls `/api/v1/dashboard` instead of 4 separate endpoints
- Client polling: 4 requests/3min → 1 request/3min

### Other changes
- `gnss-risk.ts` v0.4.0 → v0.5.0 → v0.6.0: Added `computeGnssRiskWithKp()` + index-friendly bounds
- `constants.ts` v0.6.0 → v0.7.0: Added `CACHE_TTL.DASHBOARD` (120s), `CACHE_TTL.LINK_OVERRIDES` (300s)
- `api.ts` v0.7.0 → v0.8.0: Added `DashboardData` interface
- All 57 tests pass, build clean

## 2026-03-15 02:55 — Update footer branding to Avenislabs

Updated the site-wide footer in `src/routes/+layout.svelte` (v0.12.0 → v0.12.1):
- Replaced "SWFT SkyPixels" copyright with "©2026 Avenislabs"
- Added contact email: info@avenislabs.com via `mailto:` link
- Retained GNSS Reliability Guide link and NOAA attribution
- Build verified clean with no errors or warnings
