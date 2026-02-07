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
