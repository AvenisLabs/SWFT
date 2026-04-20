# SWPC-Web Summary Log

## 2026-03-19 23:15 — Rewrite kp.ts to fetch live from NOAA (no D1)

Rewrote `src/lib/server/kp.ts` (v0.11.0 -> v1.0.0) to fetch Kp data directly from live NOAA APIs via `noaa-fetch.ts` instead of querying D1.

### Changes to kp.ts
- Removed `D1Database` parameter from all 5 exported functions: `getRecentKp`, `getEstimatedKp`, `getLatestEstimatedKp`, `getCurrentKpForecast`, `getKpSummary`
- Removed all D1/db imports (`D1Database`, `queryAll`, `queryFirst`)
- Now imports `fetchEstimatedKpWithFallback`, `fetchKpIndex`, `fetchKpForecast` from `./noaa-fetch`
- `getRecentKp(hours)` — fetches live Kp index, filters by time window, maps `kp_value` to `kp`, adds `source: 'noaa'`
- `getEstimatedKp(hours, bomApiKey?)` — uses fallback chain, filters by time window, maps to `KpEstimatedPoint[]`
- `getLatestEstimatedKp(bomApiKey?)` — uses fallback chain, returns latest bucket with source
- `getCurrentKpForecast()` — fetches live forecast, finds current/next 3-hour window
- `getKpSummary(bomApiKey?)` — reuses fallback result for both latest + trend (avoids duplicate fetch)
- All 4 helper functions preserved unchanged: `determineTrendFromEstimated`, `classifyKp`, `getStatusLabel`, `buildKpMessage`

### Caller updates (7 files)
- `+layout.server.ts` (v0.3.0 -> v0.4.0) — removed `db` arg from `getKpSummary()`
- `dashboard.ts` (externally updated to v1.0.0) — removed `db` arg and D1 import
- `data-sources/+page.server.ts` (v0.3.0 -> v0.4.0) — removed `db` arg and `getDb` import
- `api/v1/kp/+server.ts` (v0.1.0 -> v0.2.0) — removed `db` arg and `getDb` import
- `api/v1/kp/summary/+server.ts` (v0.1.0 -> v0.2.0) — removed `db` arg and `getDb` import
- `api/v1/kp/estimated/+server.ts` (v0.1.0 -> v0.2.0) — removed `db` arg and `getDb` import
- `api/v1/kp/sources/+server.ts` (v0.3.0 -> v0.4.0) — removed `db` arg and `getDb` import
- `api/v1/dashboard/+server.ts` (v0.1.0 -> v0.2.0) — removed `db` arg from `getDashboardData()`
- `api/v1/gnss/risk/+server.ts` (v0.1.0 -> v0.2.0) — removed `db` arg from `computeGnssRisk()`

## 2026-03-19 23:10 — Rewrite alerts.ts to fetch live from NOAA

Rewrote `src/lib/server/alerts.ts` (v0.2.0 -> v1.0.0) to fetch alerts directly from NOAA instead of querying D1.

### Changes
- Removed `D1Database` parameter and all D1/db imports
- Now imports `fetchAlerts` and `ParsedAlert` from `./noaa-fetch`
- Ported `classifyAlert()` inline from `workers/cron-ingest/src/tasks/ingest-alerts.ts` — detects NOAA scale references (G/S/R), classifies event types from keywords, extracts Begin/End timestamps, builds summary
- `getActiveAlerts()` — fetches live, classifies in-memory, filters to issued <24h and not yet ended
- `getRecentAlerts(days, limit)` — fetches live, classifies, filters by days, slices to limit
- Sequential IDs generated from array index (no D1 auto-increment)
- Updated 4 callers to remove `db` argument: `+layout.server.ts`, `dashboard.ts`, `alerts/active/+server.ts`, `alerts/recent/+server.ts`
- Removed unused `getDb` import from both alert API endpoints

## 2026-03-19 23:05 — Rewrite charts.ts to fetch live from NOAA

Rewrote `src/lib/server/charts.ts` (v0.4.0 -> v1.0.0) to fetch Kp chart data directly from NOAA instead of querying D1.

### Changes
- Removed `D1Database` parameter from `buildKpChartUrl()` and `fetchKpChartPng()`
- Replaced D1 `queryAll` import with `fetchKpIndex` from `./noaa-fetch`
- Data source now uses live NOAA Kp observations (`ParsedKpObs[]`) filtered by time bound
- Preserved exact chart configuration: colors, thresholds, axes, annotations, dark background
- Updated caller `src/routes/api/v1/charts/kp/+server.ts` (v0.1.0 -> v0.2.0) to remove `db` argument and `getDb` import

## 2026-03-19 22:49 — Rewrite solarwind.ts to fetch live from NOAA

Rewrote `src/lib/server/solarwind.ts` (v0.2.0 -> v1.0.0) to fetch solar wind data directly from NOAA instead of querying D1.

### Changes
- Removed `D1Database` parameter and all D1/db imports
- Now imports `fetchPlasma` and `fetchMag` from `./noaa-fetch`
- Added `mergePlasmaAndMag()` helper that merges plasma (speed, density, temperature) with mag (bz, bt) by matching timestamps at minute resolution, with a 5-minute nearest-neighbor fallback
- `getLatestSolarWind()` — fetches both feeds, merges, returns the most recent combined entry
- `getRecentSolarWind(hours)` — fetches both feeds, merges, filters to requested time window, returns sorted ASC
- Preserved existing `SolarWindLatest` interface unchanged
