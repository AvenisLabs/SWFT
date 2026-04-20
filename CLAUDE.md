# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SWFT (Space Weather Forecast & Tracking) — a space weather dashboard built with SvelteKit on Cloudflare Pages. Ingests NOAA data via a companion Cron Worker, stores in D1, serves via cached API endpoints.

## Commands

```bash
# SvelteKit app (run from repo root)
npm run dev              # Local dev server
npm run build            # Production build
npm run preview          # Preview production build
npm run check            # Svelte type-checking
npm run test             # Run all tests (vitest)
npm run test:watch       # Watch mode
npx vitest run tests/gnss-risk.test.ts   # Single test file

# Cron Worker (run from workers/cron-ingest/)
npm run dev              # wrangler dev (local worker)
npm run deploy           # wrangler deploy

# D1 migrations (from repo root)
npx wrangler d1 migrations apply swpc-web-db --local   # Local
npx wrangler d1 migrations apply swpc-web-db --remote  # Production

# Deploy (after successful build+test)
npx wrangler pages deploy .svelte-kit/cloudflare --project-name swft-web
cd workers/cron-ingest && npm run deploy   # Only if cron worker files changed
```

## Architecture

Two deployable units share one D1 database (`swpc-web-db`, binding `DB`):

1. **SvelteKit Pages app** (`/`) — SSR dashboard + REST API at `/api/v1/*`
2. **Cron Worker** (`workers/cron-ingest/`) — scheduled NOAA data ingestion

### Data flow
NOAA JSON endpoints → Cron Worker (fetch, parse, deduplicate) → D1 → SvelteKit API routes (query, cache, serve) → Svelte components

### Key directories
- `src/routes/api/v1/` — API endpoints, each with `+server.ts`
- `src/routes/gnss-reliability/` — Knowledge Hub articles (11 articles organized by audience)
- `src/routes/data-sources/` — Live Kp data source status page with per-source charts
- `src/routes/admin/` — Admin section (4 pages: dashboard, kp-source override, link management, link-check history)
- `src/lib/server/` — Server-side logic modules:
  - `db.ts` (D1 helpers), `cache.ts` (CF Cache wrapper + `jsonResponse`/`errorResponse`)
  - `constants.ts` (URLs, thresholds, TTLs), `gnss-risk.ts` (GNSS risk model)
  - `kp.ts` (`getKpSummary`, `getEstimatedKp`), `kp-sources.ts` (live multi-source Kp fetch for data-sources page)
  - `alerts.ts`, `events.ts`, `solarwind.ts`, `charts.ts`, `panels.ts`, `links.ts`
- `src/lib/types/` — `noaa.ts` (raw NOAA types, `Noaa*` prefix), `api.ts` (response contracts)
- `src/lib/components/` — Svelte 5 components
- `src/lib/stores/` — `dashboard.ts` (`fetchApi<T>()` helper, `isDataStale()`, `STALE_THRESHOLD_MS`)
- `src/lib/utils/` — `timeFormat.ts` (primary formatters), `buildInfo.ts`, `hash.ts` (SHA-256 dedup). Note: `formatters.ts` is partially deprecated — use `timeFormat.ts` instead.
- `workers/cron-ingest/src/tasks/` — Individual ingest tasks (kp, kp-estimated, solarwind, alerts, summaries, check-links)
- `workers/cron-ingest/src/lib/` — `noaa-client.ts` (NOAA fetch), `db.ts` (D1 helpers), `discord.ts` (webhook embeds), `link-crawler.ts`, `link-checker.ts`
- `migrations/` — D1 schema SQL (5 migration files, 13 tables)

### Platform bindings (`src/app.d.ts`)
`App.Platform` exposes `env.DB` (D1Database), `env.CRON_WORKER_URL` (string), `env.BOM_API_KEY` (optional string), `context` (ExecutionContext), `caches` (CF Cache). Access D1 via `getDb(platform)` from `$lib/server/db.ts`.

### Middleware (`src/hooks.server.ts`)
CORS handler automatically adds `Access-Control-Allow-Origin: *` to all `/api/*` responses and handles OPTIONS preflight with 204.

### Client-side refresh intervals
- Root layout (`+layout.svelte`): refreshes navbar Kp + alert count every **2 minutes** (`120_000ms`)
- Homepage (`+page.svelte`): refreshes dashboard data every **3 minutes** (`180_000ms`)
- Stale data ticker: re-evaluates every **30 seconds**; shows "NOAA Data Outage" banner if data >1 hour old

### Storm banners
The root layout shows storm severity banners (G2/G3/G4 tiers with different colors/animations). Banners persist for 30 minutes after storm conditions end (hysteresis to avoid flicker).

## Conventions

### Branding & naming
- Site brand: **SWFT**, not SWPC. NOAA credit preserved in footer.
- NOAA-related vars/constants: `NOAA_BASE`, `NOAA_ENDPOINTS`, `NOAA_URLS` (never `SWPC_*`)
- Type prefix: `Noaa*` for raw data types
- D1 source column values: `'noaa'` for `kp_estimated`, `'swpc'` for legacy `kp_obs`/`kp_forecast`
- CF worker name: `swft-cron-ingest`
- D1 database name remains `swpc-web-db` (CF resource can't be renamed)

### Svelte 5 runes
This project uses Svelte 5 exclusively. Key patterns:
- `$props()` for component props with TypeScript `interface Props`
- `$derived()` for any value computed from props (avoids `state_referenced_locally` warnings — never initialize `$state()` directly from props)
- `$state()` for local mutable state only
- `$effect()` for side effects
- `Snippet` type for render delegation (e.g., `children`, `headerExtra` on Card)

### SSR hydration (CLS-free pattern)
Pages load data via `+page.server.ts` and render it on the server. Client-side polling overlays fresher data without a blank frame:
```svelte
let ssrKp = $derived(data.kpSummary ?? null);          // reactive to SSR prop
let clientKp = $state<KpSummary | null | undefined>(undefined);  // undefined = not fetched yet
let kpSummary = $derived(clientKp !== undefined ? clientKp : ssrKp);  // client wins
```
**Anti-patterns to avoid:**
- Never initialize `$state()` from props → causes `state_referenced_locally` warnings
- Never use `$effect()` to copy props into state → causes a blank frame (CLS)
- Always use `$derived()` from `data` prop for SSR values

### API response envelope
All `/api/v1/*` endpoints return:
```typescript
{ ok: boolean; data: T; data_freshness?: string; cached?: boolean; error?: string }
```
Use `jsonResponse()`, `errorResponse()` from `$lib/server/cache.ts`.

### API endpoints
Public: `kp`, `kp/summary`, `kp/estimated`, `kp/sources`, `alerts/active`, `alerts/recent`, `gnss/risk`, `panels`, `panels/[id]/latest`, `animations/[id]/manifest`, `charts/kp`, `events/recent`, `events/[id]`, `news`, `status`, `routes`
Admin: `admin/kp-source` (GET/POST), `admin/links`, `admin/links/[id]`, `admin/link-checks`, `admin/link-checks/[id]`, `admin/link-check` (trigger)

### Caching
`withCache(request, cacheKey, ttlSeconds, factory)` wraps the CF Cache API. TTL constants in `CACHE_TTL` (`$lib/server/constants.ts`). Adds `X-Cache: HIT|MISS` header.

### D1 helpers (`$lib/server/db.ts`)
- `queryAll<T>(db, sql, params)` — SELECT returning T[]
- `queryFirst<T>(db, sql, params)` — SELECT returning T | null
- `execute(db, sql, params)` — INSERT/UPDATE/DELETE returning affected count
- `batchExecute(db, statements)` — batch multiple statements (keep batches ≤50 for D1 limits)

### D1 timestamp queries — index-friendly pattern
**Never wrap indexed timestamp columns with `datetime()` in WHERE clauses.** Doing so prevents SQLite from using the B-tree index on the column, forcing a full table scan. The 2026-03-15 postmortem identified this pattern as responsible for ~240M unnecessary row reads in 6 days (~33% of the disaster).

**Correct pattern** — precompute an ISO 8601 bound in JavaScript and compare as a plain string:
```typescript
// In JS/TS:
const bound = new Date(Date.now() - 24 * 3600_000).toISOString();
// In SQL (the ts index is used):
WHERE ts > ?   // bind `bound`
```

**Why this works**: all timestamps stored via `toISOString()` are ISO 8601 (`2026-02-10T02:15:00.000Z`). Lexicographic string comparison gives correct chronological ordering for that format, so we don't need `datetime()` normalization.

**Exception**: `kp_forecast.forecast_time` and `kp_forecast.issued_at` come from NOAA in space-separated format (`2026-02-10 02:15:00`). Those queries still need `datetime()` — the table is small so full scans are fine.

**Related**: never use unbounded `COUNT(*)` on large tables. Status-endpoint counts must include a `WHERE ts > ?` bound so the index is used (~390M row reads in 6 days came from unbounded COUNTs at a 30s TTL — the status cache TTL is now 300s).

### NOAA data quirk
All NOAA JSON numeric values arrive as **strings** — always parse before use.

### File headers
Use version comment in all files. Increment version on modification.
- `.ts` files: `// filename.ts v0.1.0 — Brief description`
- `.svelte` files: `<!-- ComponentName.svelte v0.1.0 — Brief description -->`
- `.sql` files: `-- 0001_filename.sql — Brief description`

### Path alias
`$types` → `./src/lib/types` (configured in `svelte.config.js`)

### Build-time injection
`__BUILD_TIME__` is defined in `vite.config.ts` and used in the footer via `$lib/utils/buildInfo.ts`.

### Cron schedules
- `*/3` — Kp index + solar wind + estimated Kp
- `*/5` — alerts
- `*/15` — event summaries
- `0 12 * * 1` — weekly external link health check (Monday noon UTC)

The cron worker also exposes HTTP endpoints for manual triggers: `GET /health`, `GET /check-links`, `GET /ingest-kp`.

### Kp source fallback chain (`workers/cron-ingest/src/tasks/ingest-kp-estimated.ts`)
Each `*/3` run tries 5 sources in priority order, storing the first with fresh data:
1. **`noaa`** — NOAA Estimated Kp (primary in ingest code, global planetary index, 1-min → 15-min buckets)
2. **`noaa_boulder`** — NOAA Boulder K-index (single-station fallback)
3. **`gfz`** — GFZ Potsdam Hp30 (independent, 30-min resolution)
4. **`bom`** — Australian BoM K-index (independent continent; requires `BOM_API_KEY` env var)
5. **`noaa_forecast`** — NOAA Kp Forecast (last resort; 3-hour granularity, no storm detection lag)

**Freshness check**: a source is valid if its latest bucket is <30 min old and not an anomalous zero (latest=0.0 while a prior reading was ≥1.0 is treated as a data glitch). When a fallback is active, a blue banner appears on every page. The `source` column in `kp_estimated` tracks the origin of every reading.

**Display vs. ingest priority note**: The `/data-sources` page (`kp-sources.ts`) labels Boulder as "Primary" and NOAA Estimated as "First fallback" — this reflects operational reliability ranking, while the ingest code (`ingest-kp-estimated.ts`) still tries NOAA Estimated first in code order. Both are correct in their context.

**Admin source override**: stored in `cron_state` with `task_name = 'kp-source-override'`. If set to anything other than `'auto'`, the cron worker forces that source (falls back to auto if the forced source fails). Managed via `/api/v1/admin/kp-source` (GET/POST) and the `/admin/kp-source` UI. Public source status visible at `/data-sources`.

### ExtLink system
External links use the `ExtLink` component with admin-controllable overrides. The root layout server (`+layout.server.ts`) loads `linkOverrides` from the `site_links` D1 table and provides them to all pages via `$page.data.linkOverrides`.
- **Override actions**: `'default'` (use override URL/text), `'unlink'` (render as plain text), `'remove'` (render nothing)
- **Matching priority**: page-specific override first, then any-page fallback
- **Admin CRUD**: `/api/v1/admin/links/*` and `/api/v1/admin/link-checks/*`

### Link health check (`workers/cron-ingest/src/tasks/check-links.ts`)
Weekly cron (`0 12 * * 1`) discovers all external links across site pages (via `link-crawler.ts` calling `/api/v1/routes`), then checks each URL (`link-checker.ts`). Results stored in `link_check_runs` and `link_check_results` tables. Sends Discord summary via `discord.ts` if `DISCORD_WEBHOOK_URL` env var is set. Also triggerable via `GET /check-links` on the cron worker.

### Knowledge Hub (`/gnss-reliability/`)
Static article pages organized by audience (Basics, Drone Pilots, Surveyors). Articles use consistent structure: breadcrumbs, header, sections with `.article-section` class, cross-links to other articles, and `ExtLink` for all external URLs. Hub landing page at `/gnss-reliability/` groups articles with role-based sections and badges.

### GNSS risk model (`$lib/server/gnss-risk.ts`)
Weighted composite score: Kp (40%) + Bz (25%) + Speed (20%) + R-Scale (15%). Uses **15-minute estimated Kp** from the `kp_estimated` table (not the 3-hour `kp_obs`). Levels: Low (0-19), Moderate (20-39), High (40-59), Severe (60-79), Extreme (80-100). **Kp-based floor** ensures storms always register at the correct risk level (G1/Kp5+ → High, G3/Kp7+ → Severe, G4/Kp8+ → Extreme) even when other factors are calm.

### D1 schema (migrations/)
5 migration files defining 13 tables:
- `0001`: `kp_obs`, `kp_forecast`, `alerts_raw`, `alerts_classified`, `solarwind_summary`, `events`, `site_news_items`, `content_articles`, `cron_state`
- `0002`: Indexes on timestamp columns
- `0003`: `kp_estimated` (15-min estimated Kp with `sample_count`)
- `0004`: `site_links` (discovered external links + overrides), `link_check_runs` (run metadata), `link_check_results` (per-URL results with FK to runs)
- `0005`: Adds `source` column to `kp_estimated` (tracks fallback chain origin, default `'noaa'`)

### CSS custom properties
Dark theme using CSS variables throughout. Key prefixes:
- Colors: `--bg-*`, `--border-*`, `--accent-*` (blue/green/yellow/orange/red), `--severity-*`, `--text-primary/secondary/muted`
- Spacing: `--space-xs` through `--space-2xl`
- Typography: `--font-size-sm` through `--font-size-3xl`, `--font-mono`

## Testing

Tests in `tests/` using Vitest (`test: { include: ['tests/**/*.test.ts'] }` in `vite.config.ts`). Focus on deterministic business logic (scoring, classification, risk models). Scoring functions in `gnss-risk.ts` are private — tests reimplement them to verify logic.
