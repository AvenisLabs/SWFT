# SWFT — Space Weather Forecast & Tracking

A real-time space weather dashboard focused on **GNSS and terrestrial impacts**. Ingests official NOAA Space Weather Prediction Center data and presents it in a clear, actionable format with operator-specific guidance for survey, drone, and precision GNSS work.

**Live site:** [swft-web.pages.dev](https://swft-web.pages.dev)

## Features

### Dashboard
- **Kp Index** — Current planetary K-index with trend direction, status classification (Quiet/Active/Storm/Severe/Extreme), and inline SVG chart of the last 24 hours
- **GNSS Disruption Risk** — Composite risk score (0–100) combining four weighted factors:
  - Kp index (35%) — geomagnetic activity
  - Bz component (25%) — interplanetary magnetic field orientation
  - Solar wind speed (20%) — particle stream velocity
  - R-scale (20%) — radio blackout level
- **Active Alerts** — Deduplicated and classified NOAA alerts with severity badges
- **Operator Advisory** — Plain-language guidance for RTK, PPP, and static GNSS operations based on current risk level

### Pages
| Route | Description |
|-------|-------------|
| `/` | Dashboard — Kp, GNSS risk, active alerts, Kp chart |
| `/gnss` | GNSS risk detail with factor breakdown and operator guidance |
| `/alerts` | Full alerts listing (active and recent) |
| `/events` | Detected space weather events (storms, flares, CMEs) |
| `/panels` | Solar imagery panels with animation player (SUVI 304/195/171, LASCO C3, Aurora) |

### API
Versioned REST API at `/api/v1/` designed for both the web frontend and a future Discord bot integration. All endpoints return a standard envelope:

```json
{ "ok": true, "data": ..., "data_freshness": "2026-02-09T12:00:00Z", "cached": false }
```

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/kp` | Kp index timeseries (`?hours=24\|72\|168`) |
| `GET /api/v1/kp/summary` | Current Kp, trend, status, recent readings |
| `GET /api/v1/alerts/active` | Active alerts (last 24h) |
| `GET /api/v1/alerts/recent` | Recent alerts with pagination (`?hours=48`) |
| `GET /api/v1/gnss/risk` | GNSS disruption risk score with factor breakdown |
| `GET /api/v1/panels` | Panel definitions (SUVI, LASCO, Aurora) |
| `GET /api/v1/panels/[id]/latest` | Latest frame image for a panel |
| `GET /api/v1/animations/[id]/manifest` | Normalized animation frame list |
| `GET /api/v1/charts/kp` | Server-rendered Kp chart PNG |
| `GET /api/v1/events/recent` | Recent detected events (`?hours=72`) |
| `GET /api/v1/events/[id]` | Single event detail |
| `GET /api/v1/news` | NOAA news items |
| `GET /api/v1/status` | System health and ingestion timestamps |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | SvelteKit (Svelte 5 with runes) |
| Hosting | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| Data ingestion | Cloudflare Workers (Cron Triggers) |
| Caching | Cloudflare Cache API |
| Type checking | TypeScript (strict mode) |
| Testing | Vitest |
| Chart rendering | QuickChart.io (server-side PNG) |

## Architecture

The platform consists of two independently deployed units sharing one D1 database:

```
NOAA SWPC JSON APIs
        |
        v
  +-----------------+         +-------------------+
  | Cron Worker     |  D1 DB  | SvelteKit Pages   |
  | (swft-cron-     | ------> | (swft-web)        |
  |  ingest)        |         |                   |
  |                 |         | /api/v1/* routes   |
  | */3  Kp + wind  |         | SSR pages         |
  | */5  alerts     |         | CF Cache API       |
  | */15 summaries  |         |                   |
  +-----------------+         +-------------------+
                                      |
                                      v
                              Browser / API clients
```

**Cron Worker** fetches from NOAA endpoints on a schedule, parses and deduplicates the data, classifies alerts, detects events, and writes to D1.

**SvelteKit App** reads from D1, wraps responses in the Cloudflare Cache API for performance, and serves both server-rendered pages and JSON API endpoints. The frontend auto-refreshes every 3 minutes.

### Data sources

All data originates from [NOAA SWPC](https://services.swpc.noaa.gov):
- Planetary K-index (observed + forecast)
- Solar wind plasma (density, speed, temperature) and magnetic field (Bx, By, Bz, Bt)
- Space weather alerts, watches, and warnings
- Animation manifests for SUVI, LASCO, and Ovation Aurora imagery

### Database

D1 schema (9 tables) defined in `migrations/`:

| Table | Purpose |
|-------|---------|
| `kp_obs` | Observed Kp index values |
| `kp_forecast` | Forecasted Kp windows |
| `alerts_raw` | Raw NOAA alerts (deduplicated by SHA-256 hash) |
| `alerts_classified` | Parsed alerts with event type, severity, G/S/R scales |
| `solarwind_summary` | 5-minute downsampled solar wind data |
| `events` | Detected storms, flares, CMEs with GNSS impact assessment |
| `site_news_items` | NOAA headlines |
| `content_articles` | Static guide articles (markdown) |
| `cron_state` | Cron task tracking (last run, status, errors) |

## Development

### Prerequisites
- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- A Cloudflare account (for deployment)

### Setup

```bash
# Install dependencies
npm install
cd workers/cron-ingest && npm install && cd ../..

# Apply D1 migrations locally
npx wrangler d1 migrations apply swpc-web-db --local
```

### Run locally

```bash
# SvelteKit dev server (from repo root)
npm run dev

# Cron worker dev server (from workers/cron-ingest/)
cd workers/cron-ingest
npm run dev
```

### Testing

```bash
npm run test             # Run all tests
npm run test:watch       # Watch mode
npx vitest run tests/gnss-risk.test.ts   # Single file
```

### Type checking

```bash
npm run check
```

### Build

```bash
npm run build            # Production build
npm run preview          # Preview the build locally
```

### Deploy

```bash
# Apply migrations to remote D1
npx wrangler d1 migrations apply swpc-web-db --remote

# Deploy SvelteKit to CF Pages (from repo root)
npx wrangler pages deploy .svelte-kit/cloudflare

# Deploy cron worker (from workers/cron-ingest/)
cd workers/cron-ingest
npm run deploy
```

## Project Structure

```
├── src/
│   ├── routes/              # SvelteKit pages + API endpoints
│   │   ├── api/v1/          # REST API (+server.ts per endpoint)
│   │   ├── alerts/          # Alerts page
│   │   ├── events/          # Events pages
│   │   ├── gnss/            # GNSS risk detail page
│   │   └── panels/          # Solar imagery page
│   ├── lib/
│   │   ├── server/          # Backend: db.ts, cache.ts, constants.ts, gnss-risk.ts
│   │   ├── components/      # Svelte 5 components
│   │   ├── stores/          # Client-side reactive stores
│   │   ├── types/           # TypeScript interfaces (noaa.ts, api.ts)
│   │   └── utils/           # Formatters, hash utility
│   ├── app.css              # Global styles (dark theme)
│   ├── app.d.ts             # Platform type bindings (D1, Cache)
│   └── hooks.server.ts      # CORS middleware for /api/*
├── workers/cron-ingest/     # Companion Cloudflare Worker
│   └── src/
│       ├── tasks/           # ingest-kp, ingest-solarwind, ingest-alerts, generate-summaries
│       ├── lib/             # noaa-client.ts, db.ts
│       └── index.ts         # Cron dispatcher
├── migrations/              # D1 SQL schema files
├── tests/                   # Vitest test files
└── static/                  # Favicon and static assets
```

## Roadmap

- **Phase 1** (complete) — Dashboard, API, cron ingestion, GNSS risk model, alerts, events, panels
- **Phase 2** — NASA DONKI event correlation, historical backfill, FAQs/explainer articles
- **Phase 3** — Discord bot integration (API endpoints already designed for bot consumption)

## Data Attribution

All space weather data is sourced from the [NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov). This project is not affiliated with or endorsed by NOAA.

## License

Private project. All rights reserved.
