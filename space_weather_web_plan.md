# Modern SWPC-Focused Space Weather Web Platform
**GNSS / Terrestrial Effects Oriented Architecture**  
Built on **Cloudflare Pages + Workers + D1**

---

## 1) Project purpose

Create a modern, real-time space weather website that:

- Focuses on **terrestrial impacts**, especially **GNSS / GPS / survey / drone operations**
- Uses official **NOAA SWPC** data, but presents it in a clearer, faster, more actionable format
- Avoids permanent storage of large image archives
- Serves as the **authoritative API source** for a future **Discord bot** and webhooks

---

## 2) Core stack

| Component | Purpose |
|---|---|
| **Cloudflare Pages** | Frontend UI hosting (React / SvelteKit / Next-on-Pages) |
| **Cloudflare Workers** | Backend API layer, ingestion, caching, image proxy |
| **Cloudflare D1** | SQL database (events, Kp history, configs, metadata) |
| **Cloudflare Cache API** | Primary “storage” layer for images & manifests |
| **Workers Cron Triggers** | Scheduled ingestion & summary generation |
| **Optional: Cloudflare R2** | Rolling short-term frame cache (not permanent storage) |

---

## 3) Architectural philosophy

### Do
- Prefer SWPC **JSON feeds** and **animation manifests** over crawling folder trees
- Make **cache your storage** for media (edge cache + browser cache)
- Normalize data into **GNSS-relevant models** and summaries
- Keep Workers **stateless** (D1 for persistent metadata only)

### Don’t
- Archive animation frames long-term
- Rebuild/host GIFs
- Depend on raw SWPC FTP folder semantics when JSON exists

---

## 4) Data sources

### NOAA SWPC (primary)
Base:
- `https://services.swpc.noaa.gov/`

Use for:
- Kp index and geomagnetic products
- Alerts / watches / warnings
- Solar wind summaries
- Images + animation manifests (SUVI, Aurora, CCOR-1, etc.)

### NOAA archives (historical backfill)
- NCEI archive
- NOAA space weather open datasets (AWS Open Data), when helpful for bulk history

### NASA DONKI (event correlation)
Use for “event stories”:
- CME / flare / geomagnetic storm knowledge base
- Correlate with SWPC alerts + Kp timeline

---

## 5) Critical media strategy (images + animations)

### Problem
Animations are many individual frames → permanent storage explodes.

### Solution: **Manifest-based playback (no GIFs)**
1. Worker fetches SWPC animation manifest JSON  
2. Worker normalizes to a stable response:
   - `source`
   - `frame_rate`
   - list of `frames` with `url` + `timestamp`
   - `last_updated`
3. Client animates in-browser by swapping `<img src>` on a timer
4. Cache aggressively:
   - **manifest** cached short (1–3 minutes)
   - **frames** cached longer (10–30 minutes)

### Optional: rolling “hot cache” in R2 (only if needed)
- Store only last N hours of frames for selected panels
- Auto-expire via lifecycle rules
- D1 stores only pointers/metadata

---

## 6) Panels to support (initial scope)

| Panel | Purpose |
|---|---|
| **SUVI 304Å** | Chromosphere / flare structure |
| **SUVI 195Å** | Coronal activity |
| **CCOR-1 coronagraph** | CME detection |
| **Aurora North** | High-latitude geomagnetic effects |
| **Aurora South** | Southern hemisphere effects |

---

## 7) Backend API (v1) — stable, bot-ready

### Kp & geomagnetic state
- `GET /api/v1/kp?range=24h|72h|7d`
- `GET /api/v1/kp/summary`

### Alerts & events
- `GET /api/v1/alerts/active`
- `GET /api/v1/alerts/recent?hours=48`
- `GET /api/v1/events/recent?hours=72`

### GNSS risk modeling (your value-add)
- `GET /api/v1/gnss/risk?range=24h|72h`
Returns:
- computed risk score
- recommended operator actions (survey/drone/GNSS oriented)
- supporting indicators used (Kp, storm level, etc.)

### Panels (latest images)
- `GET /api/v1/panels`
- `GET /api/v1/panels/:id/latest`

### Animations (manifest only)
- `GET /api/v1/animations/:id/manifest`

### Charts (for web UI and Discord embeds)
- `GET /api/v1/charts/kp?range=72h&format=png`

> **Requirement:** these endpoints must be sufficient for a future Discord bot that pulls **only** from your site.

---

## 8) D1 schema (core)

### `kp_obs`
- `ts` (UTC)
- `kp_value`
- `source`

### `kp_forecast`
- `forecast_time`
- `kp_value`
- `window`
- `source`

### `alerts_raw`
- `issue_time`
- `message`
- `product_id`
- `raw_source`

### `alerts_classified`
- `id`
- `event_type` (flare / geomagnetic / proton / radio blackout / etc.)
- `severity` (numeric or enum)
- `scale_rsg` (R/S/G if applicable)
- `begins`
- `ends`
- `summary`

### `solarwind_summary`
- `ts`
- `speed`
- `density`
- `bt`
- `bz`

### `site_news_items`
- `title`
- `url`
- `published_at`
- `image_url`
- `summary`

### `content_articles`
- `slug`
- `title`
- `body_markdown`
- `tags_json`
- `published_at`
- `updated_at`

---

## 9) Scheduling (Workers Cron)

| Interval | Task |
|---|---|
| **1–5 min** | Refresh Kp, solar wind summaries (as needed) |
| **5–15 min** | Ingest alerts + normalize into events |
| **15 min** | Generate a compact “current summary” object for UI + bot |
| **On-demand** | Fetch animation manifests (cache-backed) |

---

## 10) UI/UX structure (GNSS-first)

### Home dashboard
- Big **Kp now** + trend
- “GNSS disruption risk” meter
- Active alerts (deduped & classified)
- Key panels:
  - SUVI 304Å, SUVI 195Å, CCOR‑1, Aurora N/S
- “What this means for GNSS” short guidance block

### Explainers / FAQs
- What Kp is and what it means operationally
- Ionospheric disturbance symptoms in RTK/PPK
- CORS network considerations and best practices
- Flight/survey decision guidance during storms

### Event pages (“story mode”)
- Automatically generated for major events
- Includes:
  - alert timeline
  - Kp timeline chart
  - recommended actions
  - references to NOAA + NASA DONKI (as applicable)

---

## 11) News/carousel ingestion (SWPC site)
- Worker endpoint `GET /api/v1/news`
- Fetch SWPC homepage + news archive pages
- Normalize to `site_news_items`
- Cache 10 minutes

---

## 12) Caching strategy (make cache your storage)

| Content | TTL goal |
|---|---|
| Kp summary | 60–180 seconds |
| Alerts | 2–5 minutes |
| Animation manifests | 1–3 minutes |
| Frame images | 10–30 minutes |

Implementation:
- Use Worker Cache API (`caches.default`) for repeated fetches
- Set browser cache headers intentionally for images and chart renders

---

## 13) Discord bot future support (website responsibilities)

Even before the bot exists, the website must:
- Expose the stable endpoints in section 7
- Provide chart image rendering (`/charts/kp`)
- Provide “discord-ready” compact summary payloads (optional):
  - `GET /api/v1/discord/summary`
- Support per-server configs in D1 later

**Rule:** the Discord bot must call **only your website APIs**.

---

## 14) Build phases

### Phase 1 — MVP
- Pages UI + layout
- Worker `/api/v1/kp`, `/api/v1/alerts`
- Panels + animation manifests for the 5 key panels
- Client-side animation player (no GIF creation)

### Phase 2 — Persistence + value-add
- D1 ingestion for Kp/alerts/summaries
- GNSS risk scoring
- News ingestion

### Phase 3 — Differentiators
- NASA DONKI correlation for event narratives
- Historical backfill via archives
- Full FAQ/article system + search
- Shareable “incident links”

---

## 15) Guiding principle (pin this at the top of the repo)

**Cache is storage. Metadata is permanent. Frames are temporary.**

# PROMPT 1 — Update the SWPC Website Plan to Support a Future Discord Bot (Do NOT build the bot yet)

## Context
We are building a modern space weather web application focused on terrestrial/GNSS impacts. The site ingests and normalizes data from NOAA SWPC (services.swpc.noaa.gov) and potentially NASA DONKI, and provides a Kp-first dashboard, alerts, panels, and explainers.

A future phase will add a Discord bot that MUST pull data ONLY from OUR website/APIs (not directly from SWPC). Therefore, the website architecture must include specific supporting endpoints and data structures now, even though the Discord bot will be implemented later.

## Goals for this update
1. Extend the website/backend plan to explicitly support a future Discord integration:
   - scheduled posting (every 15 minutes)
   - event-triggered posting (big flare/storm thresholds)
   - per-server configuration dashboard
   - thread creation/management for major events
2. Keep the bot itself out of scope for now, but define what the website must expose.

## Website Requirements to Add (Bot Support)

### A) Public/Protected API endpoints for Discord consumption
Implement stable versioned endpoints the Discord bot will call:

1. Kp + geomagnetic state
- GET /api/v1/kp?range=24h|72h|7d
  - returns timeseries, current Kp, max in range, and the source timestamps
- GET /api/v1/kp/summary
  - returns "now" Kp, trend, status label (e.g., Quiet/Unsettled/Storm), and recommended messaging snippets

2. Alerts + event normalization
- GET /api/v1/alerts/active
- GET /api/v1/alerts/recent?hours=48
- GET /api/v1/events/recent?hours=72
  - events are normalized objects (flare, geomagnetic storm, proton, radio blackout, etc.)

3. GNSS-focused advisory endpoints
- GET /api/v1/gnss/risk?range=24h|72h
  - returns a computed "GNSS disruption risk" score based on Kp and other available indicators
  - includes recommended operator actions (e.g., "avoid critical static sessions", "re-occupy", "monitor CORS residuals")

4. Image/panel endpoints used by Discord posts
- GET /api/v1/panels
  - returns canonical set of supported panels (SUVI 195/304, CCOR-1, Aurora N/S, etc.)
- GET /api/v1/panels/:id/latest
  - returns latest image URL via our proxy
- GET /api/v1/animations/:id/manifest
  - returns normalized frame list + timestamps (for web UI); Discord bot may choose to post only "latest"

5. Chart image generation support (for Discord)
Provide a way for the bot to obtain a ready-to-embed chart image:
- GET /api/v1/charts/kp?range=72h&format=png
  - returns a PNG chart (or a signed URL to a rendered image)
  - include legend/scale reference on image
  - include “Kp scale and typical effects” annotation
Implementation note: can be done using an external chart rendering service (e.g., QuickChart) or server-side SVG.

### B) Data model additions in D1 (to support Discord later)
Add tables for future bot config/state:

1) discord_guilds
- guild_id (PK)
- owner_user_id (from OAuth)
- created_at, updated_at

2) discord_configs
- guild_id (FK)
- default_timezone_mode (optional; Discord timestamps will localize automatically, but keep for future)
- post_frequency_minutes (default 15)
- enabled_products (json)
- channel_routes (json mapping: product -> channel_id)
- thresholds (json; e.g., post thread on X flare, G3+ storms)

3) discord_channel_state
- guild_id, channel_id, product_id
- last_posted_at
- last_content_hash (dedupe)

4) discord_event_threads
- guild_id, channel_id
- event_id
- thread_id
- expires_at
- status

### C) Admin configuration dashboard requirements (website UI)
Add a “Discord Integration” section:
- Connect Discord via OAuth2 (Add to Server)
- Select a server (guild)
- Select which products post to which channels
- Enable/disable:
  - 15-min status updates
  - Kp chart posts
  - Event threads for major events
- Provide “Test Post” button per channel/product
- Show last posted timestamp and last error (for troubleshooting)

### D) Posting semantics and formatting requirements (for future bot)
Define formatting constraints now so APIs return the right metadata:
- All posts should include Unix timestamps so Discord can render local time via <t:UNIX:F> and <t:UNIX:R>
- Include summary text with compact bullet points (Kp now/trend/max, risk score, key alerts)
- Provide “safe to repost” dedupe keys (content hash) to prevent spam

### E) Scheduling and event triggers (website-side support only)
Website should support:
- A cron-triggered Worker job (every 15 minutes) that:
  - refreshes data
  - updates “current summary” cache objects
  - prepares a “discord-ready payload” that the future bot can consume
- An event detector that flags major events and writes rows to `events` table with severity levels.

## Deliverables from you (the AI agent)
1. Update the overall architecture plan to include all bot-supporting endpoints, caching rules, and D1 schema additions.
2. Provide a route-by-route API contract for /api/v1 endpoints listed above (request/response JSON).
3. Provide D1 schema (SQLite) migration SQL for the new tables.
4. Identify any security requirements for these endpoints:
   - bot API keys / service tokens
   - rate limits
   - per-guild authorization
5. Keep the Discord bot implementation OUT OF SCOPE; only build the website support for it.

## Constraints
- The future Discord bot must pull data from our site only.
- Avoid permanent storage of large image archives; prefer manifests + caching + proxy.
- Focus on Kp and GNSS impact messaging as primary value.

# PROMPT 1 — Update the SWPC Website Plan to Support a Future Discord Bot (Do NOT build the bot yet)

## Context
We are building a modern space weather web application focused on terrestrial/GNSS impacts. The site ingests and normalizes data from NOAA SWPC (services.swpc.noaa.gov) and potentially NASA DONKI, and provides a Kp-first dashboard, alerts, panels, and explainers.

A future phase will add a Discord bot that MUST pull data ONLY from OUR website/APIs (not directly from SWPC). Therefore, the website architecture must include specific supporting endpoints and data structures now, even though the Discord bot will be implemented later.

## Goals for this update
1. Extend the website/backend plan to explicitly support a future Discord integration:
   - scheduled posting (every 15 minutes)
   - event-triggered posting (big flare/storm thresholds)
   - per-server configuration dashboard
   - thread creation/management for major events
2. Keep the bot itself out of scope for now, but define what the website must expose.

## Website Requirements to Add (Bot Support)

### A) Public/Protected API endpoints for Discord consumption
Implement stable versioned endpoints the Discord bot will call:

1. Kp + geomagnetic state
- GET /api/v1/kp?range=24h|72h|7d
  - returns timeseries, current Kp, max in range, and the source timestamps
- GET /api/v1/kp/summary
  - returns "now" Kp, trend, status label (e.g., Quiet/Unsettled/Storm), and recommended messaging snippets

2. Alerts + event normalization
- GET /api/v1/alerts/active
- GET /api/v1/alerts/recent?hours=48
- GET /api/v1/events/recent?hours=72
  - events are normalized objects (flare, geomagnetic storm, proton, radio blackout, etc.)

3. GNSS-focused advisory endpoints
- GET /api/v1/gnss/risk?range=24h|72h
  - returns a computed "GNSS disruption risk" score based on Kp and other available indicators
  - includes recommended operator actions (e.g., "avoid critical static sessions", "re-occupy", "monitor CORS residuals")

4. Image/panel endpoints used by Discord posts
- GET /api/v1/panels
  - returns canonical set of supported panels (SUVI 195/304, CCOR-1, Aurora N/S, etc.)
- GET /api/v1/panels/:id/latest
  - returns latest image URL via our proxy
- GET /api/v1/animations/:id/manifest
  - returns normalized frame list + timestamps (for web UI); Discord bot may choose to post only "latest"

5. Chart image generation support (for Discord)
Provide a way for the bot to obtain a ready-to-embed chart image:
- GET /api/v1/charts/kp?range=72h&format=png
  - returns a PNG chart (or a signed URL to a rendered image)
  - include legend/scale reference on image
  - include “Kp scale and typical effects” annotation
Implementation note: can be done using an external chart rendering service (e.g., QuickChart) or server-side SVG.

### B) Data model additions in D1 (to support Discord later)
Add tables for future bot config/state:

1) discord_guilds
- guild_id (PK)
- owner_user_id (from OAuth)
- created_at, updated_at

2) discord_configs
- guild_id (FK)
- default_timezone_mode (optional; Discord timestamps will localize automatically, but keep for future)
- post_frequency_minutes (default 15)
- enabled_products (json)
- channel_routes (json mapping: product -> channel_id)
- thresholds (json; e.g., post thread on X flare, G3+ storms)

3) discord_channel_state
- guild_id, channel_id, product_id
- last_posted_at
- last_content_hash (dedupe)

4) discord_event_threads
- guild_id, channel_id
- event_id
- thread_id
- expires_at
- status

### C) Admin configuration dashboard requirements (website UI)
Add a “Discord Integration” section:
- Connect Discord via OAuth2 (Add to Server)
- Select a server (guild)
- Select which products post to which channels
- Enable/disable:
  - 15-min status updates
  - Kp chart posts
  - Event threads for major events
- Provide “Test Post” button per channel/product
- Show last posted timestamp and last error (for troubleshooting)

### D) Posting semantics and formatting requirements (for future bot)
Define formatting constraints now so APIs return the right metadata:
- All posts should include Unix timestamps so Discord can render local time via <t:UNIX:F> and <t:UNIX:R>
- Include summary text with compact bullet points (Kp now/trend/max, risk score, key alerts)
- Provide “safe to repost” dedupe keys (content hash) to prevent spam

### E) Scheduling and event triggers (website-side support only)
Website should support:
- A cron-triggered Worker job (every 15 minutes) that:
  - refreshes data
  - updates “current summary” cache objects
  - prepares a “discord-ready payload” that the future bot can consume
- An event detector that flags major events and writes rows to `events` table with severity levels.

## Deliverables from you (the AI agent)
1. Update the overall architecture plan to include all bot-supporting endpoints, caching rules, and D1 schema additions.
2. Provide a route-by-route API contract for /api/v1 endpoints listed above (request/response JSON).
3. Provide D1 schema (SQLite) migration SQL for the new tables.
4. Identify any security requirements for these endpoints:
   - bot API keys / service tokens
   - rate limits
   - per-guild authorization
5. Keep the Discord bot implementation OUT OF SCOPE; only build the website support for it.

## Constraints
- The future Discord bot must pull data from our site only.
- Avoid permanent storage of large image archives; prefer manifests + caching + proxy.
- Focus on Kp and GNSS impact messaging as primary value.
