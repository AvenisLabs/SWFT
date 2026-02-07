# PROMPT 2 — Separate Implementation: Build a Discord Bot That Pulls Data ONLY From Our Website

## Context
The website is already operational and exposes stable API endpoints under /api/v1 (Kp timeseries, alerts/events, GNSS risk, panel images, and chart images). The bot must NOT call SWPC directly. It only calls OUR site.

We want a Discord integration that:
- Posts scheduled updates every 15 minutes
- Posts a Kp chart image (72h recommended) with legend/scale reference
- Creates threads for major events (e.g., X-class flare, G3+ storms) that live 3 hours to 3 days
- Uses Discord timestamps that display in each viewer’s local time
- Allows per-server configuration via a web dashboard (already built on the website)
- Supports multiple servers (guilds), each with different channels/products enabled

## Architecture Recommendation
Prefer Cloudflare-only where possible:
- Use Cloudflare Workers + Cron Triggers for scheduled posting (no persistent gateway needed)
- Use Discord Webhooks for channel posting
- Use Discord Interactions (slash commands) if needed (HTTP endpoint on Worker)
Only add a traditional gateway-connected bot process if we later need real-time message/event listening.

## Bot Functional Requirements

### A) Scheduled Posting (Cron, every 15 minutes)
- Fetch from our APIs:
  - GET /api/v1/kp/summary
  - GET /api/v1/gnss/risk?range=24h
  - GET /api/v1/alerts/active
  - GET /api/v1/charts/kp?range=72h&format=png (or obtain URL)
- For each guild config in D1:
  - Post an embed to the configured channel(s)
  - Attach chart image (or embed URL) for Kp chart
  - Include timestamps using Discord timestamp syntax:
    - <t:UNIX:F> and <t:UNIX:R>
- Dedupe:
  - Use last_content_hash per guild/channel/product to avoid reposting identical content

### B) Event Threads for Major Events
- Poll GET /api/v1/events/recent?hours=72
- Detect severity thresholds from guild config:
  - X flare, G3/G4/G5 storms, proton events, etc.
- If a qualifying event is new:
  - Create a message in the main channel
  - Create or start a thread for that event
  - Post periodic updates to the thread for the event lifespan
- Thread expiration:
  - Use expires_at from config (e.g., 72 hours)
  - After expiry, stop posting; optionally post a final summary message

### C) Slash Commands (optional but recommended)
Implement Interactions (no gateway) for:
- /kp (shows current Kp + chart)
- /gnss (shows risk score + advice)
- /spaceweather (shows active alerts)
- /config (links to the web dashboard config page for that guild)

### D) Web Dashboard Integration
Bot must respect configuration stored in D1:
- enabled products
- channel routes
- posting frequency (default 15)
- thresholds for thread creation
- a “test post” action (via API call from the dashboard)

## Cloudflare Implementation Details
- Worker routes:
  - /discord/cron (invoked by Cron Trigger)
  - /discord/interactions (Discord Interactions endpoint)
- Secrets:
  - DISCORD_APPLICATION_ID
  - DISCORD_PUBLIC_KEY
  - DISCORD_BOT_TOKEN (if needed)
  - WEBSITE_API_TOKEN (service token to call our site if endpoints are protected)
- Storage:
  - D1 tables: discord_guilds, discord_configs, discord_channel_state, discord_event_threads

## Message Formatting Requirements
- Use embeds with:
  - Title: "Space Weather Update"
  - Fields:
    - Kp now + trend
    - GNSS Risk Score + recommended actions
    - Active alerts summary (R/S/G)
  - Image: Kp chart (72h) with legend
- Include link buttons to:
  - Website dashboard page (Kp dashboard)
  - Specific “event page” if an event thread is created

## Deliverables from you (the AI agent)
1. A full implementation plan and file structure for a Cloudflare Workers-based Discord integration.
2. Pseudocode or real code for:
   - Cron posting loop across guild configs
   - Event detection + thread mapping lifecycle
   - Dedupe hashing strategy
3. A minimal Interaction handler for /kp and /gnss
4. A security and rate-limit plan:
   - avoid Discord rate limits
   - retry/backoff strategies
   - prevent config abuse/spam

## Constraints
- Bot must consume ONLY our website APIs.
- No permanent storage of large media inside the bot.
- Prefer webhook + scheduled + interactions; avoid persistent gateway unless proven necessary.
