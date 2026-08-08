# Hourly-Only D1 Usage — Design Spec

**Date:** 2026-03-15
**Goal:** Reduce D1 row reads/writes by 90%+ by capping all updates to hourly frequency and removing client-side polling.

## Constraints

- No updates more frequent than 1 hour
- No client-side auto-refresh of any kind
- Must maintain all existing functionality (storm banners, GNSS risk, articles, admin)
- Target: reads <820K/month, writes <160K/month

## Changes

### 1. Cron Worker — Single Hourly Schedule

**File:** `workers/cron-ingest/src/index.ts`

Replace all cron schedules with a single `0 * * * *` (top of each hour):
- Runs all tasks in sequence: ingestKp → ingestKpEstimated → ingestSolarWind → ingestAlerts → generateSummaries

Current schedules removed:
- `*/3 * * * *` (Kp + estimated Kp + solar wind)
- `*/5 * * * *` (alerts)
- `*/15 * * * *` (summaries + cleanup)
- `0 12 * * 1` (weekly link check) — **keep as-is**

### 2. Cache TTLs — All to 3600s

**File:** `src/lib/server/constants.ts`

All `CACHE_TTL` values → 3600 (1 hour), except:
- `LINK_OVERRIDES` stays at 300 (tiny table, no concern)
- `FRAME_IMAGE` and `CHART_PNG` stay at 900 (external fetches, not D1)
- `ANIMATION_MANIFEST` stays at 120 (external fetch)
- `PANELS` stays at 120 (in-memory, no D1)

Memo-cache TTLs in `dashboard.ts` → 3600s to match.

### 3. Remove Client-Side Polling — Layout

**File:** `src/routes/+layout.svelte`

Remove:
- `onMount` with `refreshAll()` and `setInterval(refreshAll, 120_000)`
- `setInterval(() => { staleTick++ }, 30_000)` staleness ticker
- `refreshAll()` function
- `fetchApi` import
- Client-side `kpData` and `alertData` state variables

Add:
- SSR-provided Kp summary and alerts from `+layout.server.ts`
- Navbar reads from SSR `data` prop instead of client state

**File:** `src/routes/+layout.server.ts`

Add: Fetch Kp summary and active alert count alongside link overrides (all memo-cached 1 hour). Passes to layout for navbar and banners.

### 4. Remove Client-Side Polling — Homepage

**File:** `src/routes/+page.svelte`

Remove:
- `onMount` with `refreshData()` and `setInterval(refreshData, 180_000)`
- `setInterval(() => { staleTick++ }, 30_000)` staleness ticker
- `refreshData()` function
- All `clientKp`, `clientEstimated`, `clientRisk`, `clientAlerts` state overlays
- The SSR/client merge pattern (`$derived(clientX !== undefined ? clientX : ssrX)`)
- `fetchApi` and `DashboardData` imports

Simplify to:
- Read directly from `data` prop (SSR only)
- `kpSummary = $derived(data.kpSummary ?? null)` etc.

### 5. Staleness Detection — Adjust Threshold

**File:** `src/lib/stores/dashboard.ts`

Change `STALE_THRESHOLD_MS` from 60 minutes to 120 minutes (2 missed hourly updates).

Remove unused exports: `kpSummary`, `gnssRisk`, `activeAlerts`, `systemStatus`, `loading`, `lastFetch` writable stores (no longer needed without client polling). Keep `fetchApi` (used by data-sources page) and `isDataStale`.

### 6. Data-Sources Page — Remove Auto-Refresh

**File:** `src/routes/data-sources/+page.svelte` (if it has client polling)

Remove any `setInterval` polling. SSR-only.

### 7. Update CLAUDE.md

- Client-side refresh intervals section: remove or update to "no client-side polling"
- Cron schedules: update to single `0 * * * *`
- Stale data threshold: 2 hours

## Projected Monthly Usage

| Metric | Current | After | Reduction |
|--------|---------|-------|-----------|
| Cron runs/day | 864 | 24 | 97% |
| Writes/month | 1.6M | ~80K | 95% |
| Reads/month | 8.2M | ~400K | 95% |

## What Does NOT Change

- All API endpoints remain functional
- Storm banner logic (reads from SSR data instead of client state)
- GNSS risk model and scoring
- Knowledge Hub articles (static)
- Admin endpoints and UI
- ExtLink override system
- Fallback source banner
- Weekly link health check
