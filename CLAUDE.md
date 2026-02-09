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
```

## Architecture

Two deployable units share one D1 database (`swpc-web-db`, binding `DB`):

1. **SvelteKit Pages app** (`/`) — SSR dashboard + REST API at `/api/v1/*`
2. **Cron Worker** (`workers/cron-ingest/`) — scheduled NOAA data ingestion

### Data flow
NOAA JSON endpoints → Cron Worker (fetch, parse, deduplicate) → D1 → SvelteKit API routes (query, cache, serve) → Svelte components

### Key directories
- `src/routes/api/v1/` — API endpoints, each with `+server.ts`
- `src/lib/server/` — `db.ts` (D1 helpers), `cache.ts` (CF Cache wrapper), `constants.ts` (URLs, thresholds, TTLs), `gnss-risk.ts` (risk model)
- `src/lib/types/` — `noaa.ts` (raw NOAA types, `Noaa*` prefix), `api.ts` (response contracts)
- `src/lib/components/` — Svelte 5 components
- `src/lib/stores/` — Client-side reactive stores
- `src/lib/utils/` — Formatters, helpers
- `workers/cron-ingest/src/tasks/` — Individual ingest tasks (kp, solarwind, alerts, summaries)
- `migrations/` — D1 schema SQL files

### Platform bindings (`src/app.d.ts`)
`App.Platform` exposes `env.DB` (D1Database), `context` (ExecutionContext), `caches` (CF Cache). Access D1 via `getDb(platform)` from `$lib/server/db.ts`.

## Conventions

### Branding & naming
- Site brand: **SWFT**, not SWPC. NOAA credit preserved in footer.
- NOAA-related vars/constants: `NOAA_BASE`, `NOAA_ENDPOINTS`, `NOAA_URLS` (never `SWPC_*`)
- Type prefix: `Noaa*` for raw data types
- D1 source column values: `'noaa'`
- CF worker name: `swft-cron-ingest`
- D1 database name remains `swpc-web-db` (CF resource can't be renamed)

### Svelte 5 runes
This project uses Svelte 5 exclusively. Key patterns:
- `$props()` for component props with TypeScript `interface Props`
- `$derived()` for any value computed from props (avoids `state_referenced_locally` warnings — never initialize `$state()` directly from props)
- `$state()` for local mutable state only
- `$effect()` for side effects
- `Snippet` type for render delegation

### API response envelope
All `/api/v1/*` endpoints return:
```typescript
{ ok: boolean; data: T; data_freshness?: string; cached?: boolean; error?: string }
```
Use `jsonResponse()`, `errorResponse()` from `$lib/server/cache.ts`.

### Caching
`withCache(request, cacheKey, ttlSeconds, factory)` wraps the CF Cache API. TTL constants in `CACHE_TTL` (`$lib/server/constants.ts`). Adds `X-Cache: HIT|MISS` header.

### D1 helpers (`$lib/server/db.ts`)
- `queryAll<T>(db, sql, params)` — SELECT returning T[]
- `queryFirst<T>(db, sql, params)` — SELECT returning T | null
- `execute(db, sql, params)` — INSERT/UPDATE/DELETE returning affected count
- `batchExecute(db, statements)` — batch multiple statements (keep batches ≤50 for D1 limits)

### NOAA data quirk
All NOAA JSON numeric values arrive as **strings** — always parse before use.

### File headers
Use version comment: `// filename.ts v0.1.0 — Brief description`. Increment version on modification.

### Path alias
`$types` → `./src/lib/types` (configured in `svelte.config.js`)

### Cron schedules
- `*/3` — Kp index + solar wind
- `*/5` — alerts
- `*/15` — event summaries

## Testing

Tests in `tests/` using Vitest. Test files follow `*.test.ts` pattern. Focus on deterministic business logic (scoring, classification, risk models).
