# SWFT — Space Weather Forecast & Tracking

A real-time space weather dashboard focused on **terrestrial and GNSS impacts**. Ingests data from NOAA's Space Weather Prediction Center (and four additional fallback sources), stores it in Cloudflare D1, and serves a dark-themed SSR dashboard with live-updating Kp index, GNSS disruption risk scoring, classified alerts, solar imagery animations, and a Knowledge Hub of educational articles for drone pilots and surveyors.

**Live site:** [swft.skypixels.org](https://swft.skypixels.org)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Data Sources](#data-sources)
- [GNSS Risk Model](#gnss-risk-model)
- [API Reference](#api-reference)
- [Knowledge Hub](#knowledge-hub)
- [Admin Tools](#admin-tools)
- [Database Schema](#database-schema)
- [Development](#development)
- [Deployment](#deployment)
- [Project History](#project-history)
- [Roadmap](#roadmap)
- [Data Attribution](#data-attribution)

---

## Features

- **Real-time Kp Index** — current Kp value with status classification (Quiet/Active/Storm/Severe/Extreme), 24-hour trend, and an interactive SVG line chart with non-linear Y-axis scaling that emphasizes storm-level values
- **GNSS Disruption Risk Meter** — weighted composite score combining Kp (40%), Bz (25%), solar wind speed (20%), and R-scale (15%) with actionable operator guidance for survey and drone work
- **Classified Alerts** — NOAA alerts parsed and classified by event type (geomagnetic storm, solar flare, radio blackout, proton event) with severity levels and deduplication
- **Solar Imagery** — animated panels (SUVI 304/195/171, LASCO C3, Aurora North) with manifest-based client-side frame playback — no server-side GIF generation
- **5-Source Kp Fallback Chain** — automatic failover across NOAA Estimated, NOAA Boulder, GFZ Potsdam, Australian BoM, and NOAA Forecast with anomalous-zero detection and freshness validation
- **Storm Banners** — severity-tiered banners (G2/G3/G4) with color-coded animations and 30-minute hysteresis to avoid flicker during storm transitions
- **Data Outage Detection** — automatic "NOAA Data Outage" banner when data is more than 1 hour stale (4 missed 15-minute updates), with a 30-second re-evaluation ticker
- **Knowledge Hub** — 10 educational articles organized by audience (Basics, Drone Pilots, Surveyors) covering GNSS reliability during space weather events
- **External Link Management** — admin-controllable overrides (redirect, unlink, remove) for all external links, with weekly automated health checks and optional Discord reporting
- **Data Sources Page** — live visualization of all 5 Kp sources with per-source status, latest values, and charts
- **SSR-First, CLS-Free** — all pages render with server-fetched data on first paint; client-side polling overlays fresher data without Cumulative Layout Shift
- **Dark Theme** — space-themed UI using CSS custom properties throughout

---

## Architecture

Two independently deployable units share one Cloudflare D1 database:

```
NOAA SWPC JSON ─┐
NOAA Boulder ───┤
GFZ Potsdam ────┼──► Cron Worker ──► D1 Database ◄── SvelteKit API ◄── Svelte Components
Australian BoM ─┤    (scheduled)     (swpc-web-db)    (SSR + client polling)
NOAA Forecast ──┘
```

### SvelteKit Pages App (root `/`)

The main web application deployed to Cloudflare Pages. Serves SSR-rendered pages and a REST API at `/api/v1/*`.

| Directory | Contents |
|---|---|
| `src/routes/` | SvelteKit pages and API endpoints |
| `src/routes/api/v1/` | 22 REST API endpoints (public + admin) |
| `src/routes/gnss-reliability/` | Knowledge Hub (10 articles + hub landing page) |
| `src/routes/data-sources/` | Live Kp source status page |
| `src/routes/admin/` | Admin section (4 pages) |
| `src/lib/server/` | Server modules — DB helpers, caching, risk model, data queries (12 files) |
| `src/lib/components/` | 13 Svelte 5 components |
| `src/lib/types/` | TypeScript types — `noaa.ts` (raw NOAA), `api.ts` (response contracts) |
| `src/lib/stores/` | Client-side polling utilities (`fetchApi<T>()`, `isDataStale()`) |
| `src/lib/utils/` | Formatters (`timeFormat.ts`), build info, SHA-256 hashing |

### Cron Worker (`workers/cron-ingest/`)

A Cloudflare Worker with scheduled triggers that ingests data from external sources and writes to D1.

| Directory | Contents |
|---|---|
| `src/tasks/` | 6 ingest tasks (kp, kp-estimated, solarwind, alerts, summaries, check-links) |
| `src/lib/` | NOAA HTTP client, D1 helpers, Discord webhook embeds, link crawler/checker |

**Cron schedules:**

| Interval | Tasks |
|---|---|
| Every 3 minutes | Kp index, 15-min estimated Kp (5-source fallback), solar wind |
| Every 5 minutes | Alert ingestion and classification |
| Every 15 minutes | Event summary generation and detection |
| Monday noon UTC | External link health check + optional Discord report |

**Manual HTTP triggers:** `GET /health`, `GET /check-links`, `GET /ingest-kp`

### Client-Side Refresh

| Scope | Interval | What refreshes |
|---|---|---|
| Root layout | 2 minutes | Navbar Kp value, alert count, storm/fallback/outage banners |
| Homepage | 3 minutes | All dashboard panels (Kp, risk, alerts, chart, events) |
| Staleness ticker | 30 seconds | Re-evaluates data age; triggers outage banner if >1 hour stale |

---

## Tech Stack

| Component | Technology | Version |
|---|---|---|
| Frontend framework | SvelteKit (Svelte 5 with runes) | SvelteKit 2, Svelte 5.49 |
| Language | TypeScript (strict mode) | 5.9 |
| Hosting | Cloudflare Pages | — |
| Database | Cloudflare D1 (SQLite) | — |
| Caching | Cloudflare Cache API | `withCache()` wrapper with TTL constants |
| Background jobs | Cloudflare Workers Cron Triggers | — |
| Build tool | Vite | 7.3 |
| Testing | Vitest | 4.0 |
| Validation | Zod | 4.3 |
| Adapter | `@sveltejs/adapter-cloudflare` | 7.2 |

---

## Data Sources

### Kp Fallback Chain

The cron worker tries 5 sources in priority order every 3 minutes. A source is accepted if its latest bucket is less than 30 minutes old and passes the anomalous-zero check (a sudden drop to 0.0 from an elevated reading is treated as a data glitch, not a legitimate quiet period).

| Priority | Source | DB ID | Resolution | Notes |
|---|---|---|---|---|
| 1 | NOAA Estimated Kp | `noaa` | 15-min (from 1-min samples) | Global planetary average; primary in ingest code |
| 2 | NOAA Boulder K-index | `noaa_boulder` | 15-min (from 1-min samples) | Single-station; labeled "Primary" on data-sources page for superior operational reliability |
| 3 | GFZ Potsdam Hp30 | `gfz` | 30-min | Independent European source |
| 4 | Australian BoM K-index | `bom` | Varies | Southern hemisphere; requires `BOM_API_KEY` secret |
| 5 | NOAA Kp Forecast | `noaa_forecast` | 3-hour | Last resort; coarsest granularity |

When a non-primary source is active, a blue fallback banner appears site-wide showing the active source name. The source is tracked per-row in the `kp_estimated` table's `source` column. Admins can force a specific source via `/admin/kp-source`.

### Other NOAA Data

- **Solar wind** — plasma (speed, density, temperature) and magnetic field (Bt, Bz) from 7-day JSON feeds, downsampled to 5-minute buckets in `solarwind_summary`
- **Alerts** — raw alerts ingested from `alerts.json`, deduplicated via SHA-256 content hash, then classified by event type and severity into `alerts_classified`
- **Imagery** — animation manifests for SUVI 304/195/171, LASCO C3, Aurora North; individual frames cached at the Cloudflare edge (15-minute TTL), not archived in D1 or R2

---

## GNSS Risk Model

A weighted composite score computed in `src/lib/server/gnss-risk.ts`:

| Factor | Weight | Source | Rationale |
|---|---|---|---|
| Kp index | 40% | `kp_estimated` (15-min) | Primary ionospheric disruption indicator |
| Bz (southward IMF) | 25% | `solarwind_summary` | Drives geomagnetic coupling when negative |
| Solar wind speed | 20% | `solarwind_summary` | Energizes magnetosphere |
| R-Scale (radio blackouts) | 15% | `alerts_classified` | Direct HF/GPS signal absorption |

**Risk levels:** Low (0-19), Moderate (20-39), High (40-59), Severe (60-79), Extreme (80-100)

**Kp-based floors** ensure storms always register at the correct risk level, even if other indicators are calm:

| Storm Level | Minimum Kp | Minimum Risk Score | Risk Level |
|---|---|---|---|
| G4 | 8 | 80 | Extreme |
| G3 | 7 | 60 | Severe |
| G2 | 6 | 50 | High |
| G1 | 5 | 40 | High |
| Active | 4 | 25 | Moderate |

---

## API Reference

All endpoints return the standard envelope:
```json
{ "ok": true, "data": "...", "data_freshness": "2026-02-16T12:00:00Z", "cached": false }
```

### Public Endpoints

| Endpoint | Description | Cache TTL |
|---|---|---|
| `GET /api/v1/kp` | Kp index timeseries (`?hours=24\|72\|168`) | 120s |
| `GET /api/v1/kp/summary` | Current Kp, trend, status, 24h max, active source | 120s |
| `GET /api/v1/kp/estimated` | 15-minute estimated Kp data points | 120s |
| `GET /api/v1/kp/sources` | Live data from all 5 Kp sources with status | 180s |
| `GET /api/v1/alerts/active` | Currently active alerts | 180s |
| `GET /api/v1/alerts/recent` | Recent alerts (`?hours=48`) | 180s |
| `GET /api/v1/gnss/risk` | GNSS disruption risk score + factor breakdown + guidance | 120s |
| `GET /api/v1/panels` | List of supported imagery panels | 120s |
| `GET /api/v1/panels/[id]/latest` | Latest image for a specific panel | 120s |
| `GET /api/v1/animations/[id]/manifest` | Animation frame manifest with URLs + timestamps | 120s |
| `GET /api/v1/charts/kp` | Server-rendered Kp chart PNG | 900s |
| `GET /api/v1/events/recent` | Recent space weather events (`?hours=72`) | 180s |
| `GET /api/v1/events/[id]` | Single event detail | 180s |
| `GET /api/v1/news` | NOAA site news items | 300s |
| `GET /api/v1/status` | System health and ingestion timestamps | 30s |
| `GET /api/v1/routes` | Auto-discovered site page routes (used by link crawler) | — |

### Admin Endpoints

| Endpoint | Description |
|---|---|
| `GET/POST /api/v1/admin/kp-source` | Get/set Kp source override (`auto` or force a specific source) |
| `GET/POST /api/v1/admin/links` | List/create external link overrides |
| `PUT/DELETE /api/v1/admin/links/[id]` | Update/delete a single link override |
| `GET /api/v1/admin/link-checks` | List all link check runs |
| `GET /api/v1/admin/link-checks/[id]` | Per-URL results for a specific check run |
| `POST /api/v1/admin/link-check` | Manually trigger a full link health check |

---

## Knowledge Hub

Located at `/gnss-reliability/`, the Knowledge Hub contains 10 educational articles organized by audience:

**GNSS & Space Weather Basics**
- How Space Weather Affects GPS
- Understanding GNSS Risk Levels
- Solar Flares vs. Geomagnetic Storms
- Ionospheric Delay Explained
- Space Weather Glossary

**For Drone Pilots**
- When to Cancel a Drone Mission
- RTK Float Drops During Storms
- DJI & Emlid Base Station Tips

**For Surveyors**
- Space Weather & GNSS Survey
- OPUS/PPP Failures During Events

All articles use the `ExtLink` component for external URLs (supporting admin overrides) and cross-link to related articles within the hub.

---

## Admin Tools

Four admin pages at `/admin/`:

| Page | Purpose |
|---|---|
| `/admin/` | Admin dashboard overview |
| `/admin/kp-source` | Force a specific Kp data source or return to automatic fallback chain |
| `/admin/links` | View/edit external link overrides (redirect URLs, unlink to plain text, or remove entirely) |
| `/admin/link-checks` | Browse link check run history with per-URL status codes and response times |

The source override is stored in the `cron_state` table (`task_name = 'kp-source-override'`). When set to anything other than `'auto'`, the cron worker bypasses the fallback chain and forces that specific source. If the forced source fails, it falls back to the automatic chain.

---

## Database Schema

Cloudflare D1 database (`swpc-web-db`) with 13 tables across 5 migrations in `migrations/`:

| Migration | Tables Created/Modified | Purpose |
|---|---|---|
| `0001_core_schema` | `kp_obs`, `kp_forecast`, `alerts_raw`, `alerts_classified`, `solarwind_summary`, `events`, `site_news_items`, `content_articles`, `cron_state` | Core data model (9 tables) |
| `0002_indexes` | *(indexes only)* | Performance indexes on timestamp columns |
| `0003_kp_estimated` | `kp_estimated` | 15-minute estimated Kp with sample counts |
| `0004_admin_links` | `site_links`, `link_check_runs`, `link_check_results` | External link management, health check history |
| `0005_kp_estimated_source` | *(alter table)* | Adds `source` column to `kp_estimated` for fallback chain tracking |

---

## Development

### Prerequisites

- Node.js 18+
- npm
- Wrangler CLI (`npm install -g wrangler`) for D1 migrations and Cloudflare deployment
- A Cloudflare account (for deployment; local dev works without one)

### Setup

```bash
# Install dependencies for both the app and the cron worker
npm install
cd workers/cron-ingest && npm install && cd ../..

# Apply D1 migrations locally
npx wrangler d1 migrations apply swpc-web-db --local

# Start the dev server
npm run dev
```

### Common Commands

```bash
# SvelteKit app (from repo root)
npm run dev              # Local dev server
npm run build            # Production build
npm run preview          # Preview the production build locally
npm run check            # Svelte type-checking
npm run test             # Run all tests
npm run test:watch       # Watch mode
npx vitest run tests/gnss-risk.test.ts   # Single test file

# Cron worker (from workers/cron-ingest/)
npm run dev              # Wrangler dev (local worker)
npm run deploy           # Deploy to Cloudflare
```

### Environment Variables

| Variable | Where | Required | Purpose |
|---|---|---|---|
| `DB` | Both (D1 binding) | Yes | Cloudflare D1 database binding |
| `CRON_WORKER_URL` | Pages app (wrangler.toml) | Yes | URL of the deployed cron worker |
| `SITE_URL` | Cron worker (wrangler.toml) | Yes | Base URL of the live site (used by link crawler) |
| `BOM_API_KEY` | Cron worker (secret) | No | Australian BoM API key — enables 4th fallback source |
| `DISCORD_WEBHOOK_URL` | Cron worker (secret) | No | Discord webhook for weekly link check reports |

Secrets are set via `wrangler secret put <NAME>` (not in wrangler.toml).

### Testing

Tests live in `tests/` using Vitest, focused on deterministic business logic:

- `gnss-risk.test.ts` — GNSS risk scoring, Kp floor enforcement, weight calculations
- `alert-classifier.test.ts` — Alert parsing and severity classification

Scoring functions in `gnss-risk.ts` are private; tests reimplement the scoring logic to verify behavior independently.

---

## Deployment

```bash
# 1. Build the SvelteKit app
npm run build

# 2. Deploy to Cloudflare Pages
npx wrangler pages deploy .svelte-kit/cloudflare --project-name swft-web

# 3. Deploy the cron worker (only if workers/cron-ingest/ files changed)
cd workers/cron-ingest && npm run deploy

# 4. Apply D1 migrations to production (if new migrations added)
npx wrangler d1 migrations apply swpc-web-db --remote
```

---

## Project History

### Phase 1 — MVP (2026-02-06)

The full platform was built in a single session: SvelteKit app with SSR dashboard, Cloudflare D1 schema (9 core tables), cron worker with scheduled NOAA ingestion, Kp index display with SVG chart, alert classification system, GNSS risk scoring model, solar imagery animation player with manifest-based playback, and a versioned REST API. Originally planned as "SWPC Web", rebranded to **SWFT** (Space Weather Forecast & Tracking) before the initial commit.

### UI/UX Overhaul (2026-02-09)

Major visual refinement: enlarged Kp chart with local time labels, hover tooltips replacing click popovers, 15-minute estimated Kp line chart, GNSS explainer panel, and accessibility fixes (heading hierarchy, WCAG color contrast). This session uncovered and solved a critical Cumulative Layout Shift (CLS) problem — the initial hydration approach created a blank frame between SSR and client rendering. The solution was the `$derived` + `$state` overlay pattern:

```svelte
let ssrData = $derived(data.value ?? null);           // reactive to SSR prop
let clientData = $state<T | undefined>(undefined);     // undefined = not fetched yet
let merged = $derived(clientData !== undefined ? clientData : ssrData);
```

This pattern became the project's core SSR hydration strategy, rendering server data on first paint with zero CLS, then seamlessly overlaying client-polled data.

### Knowledge Hub and Link Management (2026-02-10)

Added the Knowledge Hub at `/gnss-reliability/` with educational articles for three audiences (basics, drone pilots, surveyors). Built the `ExtLink` component for admin-controllable external link overrides and the link management admin pages.

### Real-Time Kp and D1 Fixes (2026-02-13)

Upgraded from 3-hour observed Kp to 15-minute estimated Kp derived from NOAA's 1-minute data feed. Discovered and fixed a critical D1 datetime comparison bug: JavaScript's `toISOString()` produces `2026-02-10T02:15:00Z` while SQLite's `datetime('now')` returns `2026-02-10 02:15:00` — the `T` character sorts higher than a space, causing `WHERE ts > datetime('now',...)` to silently match all ISO-formatted rows. The fix requires wrapping all timestamp columns with `datetime()` for normalization.

Expanded the Knowledge Hub to 10 articles with cross-linking and tightened Kp classification thresholds.

### 5-Source Kp Fallback Chain (2026-02-16)

Added four additional Kp data sources beyond NOAA's planetary estimate:

1. **NOAA Boulder K-index** — single-station fallback with high reliability
2. **GFZ Potsdam Hp30** — independent European source at 30-minute resolution
3. **Australian BoM K-index** — independent southern hemisphere infrastructure
4. **NOAA Kp Forecast** — last resort with 3-hour granularity

Built anomalous-zero detection (a sudden drop to 0.0 from elevated readings is flagged as a data glitch), freshness validation (<30 min), the `/data-sources` page with live per-source status and charts, and admin source override controls. Added a site-wide blue fallback banner when a non-primary source is active.

---

## Roadmap

### Completed
- Phase 1 MVP — Dashboard, API, cron ingestion, GNSS risk model, alerts, events, solar imagery panels
- Knowledge Hub — 10 educational articles organized by audience
- External link management with weekly health checks
- 5-source Kp fallback chain with data-sources page and admin controls
- SSR-first architecture with CLS-free hydration

### Planned
- **Discord bot** (Phase 3) — a companion bot pulling exclusively from SWFT APIs for scheduled posting, event-triggered alerts, per-server configuration, and thread management. D1 tables for guild configs are designed in `space_weather_web_plan.md` but not yet created.
- **NASA DONKI correlation** — event narratives linking CME/flare data with SWPC alerts and Kp timelines
- **Historical backfill** — bulk Kp/event history from NCEI archives and AWS Open Data
- **Full-text search** — searchable article system across Knowledge Hub content

---

## Data Attribution

All space weather data is sourced from the [NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/) with additional data from [GFZ Potsdam](https://kp.gfz.de/) and the [Australian Bureau of Meteorology](https://www.sws.bom.gov.au/). SWFT is an independent project and is not affiliated with or endorsed by NOAA, GFZ, or BoM.

## License

Private project. All rights reserved.
