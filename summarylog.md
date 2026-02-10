# SWPC-Web Summary Log

## 2026-02-10 02:15 — Only autoplay 304Å animation on imagery page

Changed `AnimationPlayer.svelte` (v0.2.0 → v0.3.0) to accept an `autoplay` prop (default `false`). Previously all animations started playing immediately on load. Now only the SUVI 304Å panel autoplays; the rest load paused on the first frame and require a click to play. Updated `PanelGrid.svelte` (v0.1.0 → v0.2.0) to pass `autoplay={panel.id === 'suvi-304'}`.

## 2026-02-10 00:54 — Add Knowledge Base nav tab

Added "Knowledge Base" link to the top navigation bar in `+layout.svelte` (v0.5.0 → v0.6.0), pointing to `/gnss-reliability`. Now visible site-wide alongside Home, GNSS, Alerts, Events, and Imagery tabs.

Build: zero warnings. Deployed to Cloudflare Pages.

## 2026-02-10 00:49 — GNSS Reliability hub page visual polish

Updated `src/routes/gnss-reliability/+page.svelte` (v0.2.0 → v0.3.0):
- "Coming soon" labels now bright yellow (`#f5c542`) with bold weight for visibility
- Live articles ("How Space Weather Affects GPS", "Why RTK Drops to FLOAT") now have a blue "Read now →" badge and a persistent blue border on their cards
- Uses `:has(.live)` selector for card border highlight

Build: zero warnings. Deployed to Cloudflare Pages.

## 2026-02-10 00:35 — Fix CRON_WORKER_URL + clarify dashboard link counts

**Bug fix:** `CRON_WORKER_URL` in `wrangler.toml` had wrong subdomain (`skypixels` instead of `maine-sky-pixels`), causing CF error 1016 (DNS resolution failure) when triggering manual link checks. Fixed to `https://swft-cron-ingest.maine-sky-pixels.workers.dev`.

**Dashboard clarity:** The dashboard showed "13 healthy" in the check result toast but "26 healthy" in the summary cards — both correct but measuring different things:
- 13 = unique URLs checked (what the link checker deduplicates to)
- 26 = link placements in `site_links` (same URL on different pages = separate rows, e.g. NOAA footer on all 8 pages = 8 rows)

Updated `admin/+page.svelte` v0.2.0:
- Added "Unique URLs" card alongside "Link Placements" card
- Check run section now says "unique URLs checked"
- Toast message clarified with "(unique URLs)" suffix

**Verification:** Confirmed all 21 ExtLink placements in source match live site output exactly. Zero hardcoded external `<a>` tags remain. D1 `site_links` table has 26 rows (13 unique URLs across 8 crawled pages) — all healthy (HTTP 200).

## 2026-02-10 00:10 — Admin section: link management, ExtLink component, check history

Implemented full admin dashboard for external link health monitoring and override management.

**Phase 1 — D1 Migration** (`migrations/0004_admin_links.sql`):
- `site_links` table: discovered external links with override fields (url, text, action)
- `link_check_runs` table: run metadata (timestamps, counts, trigger type)
- `link_check_results` table: per-URL results per run
- Applied locally and remotely

**Phase 2 — Server helpers** (`src/lib/server/links.ts` + `src/lib/types/api.ts`):
- Query functions: getActiveOverrides, getAllLinks, getLinkById, updateLinkOverride, check run queries
- New types: SiteLink, LinkOverride, LinkCheckRun, LinkCheckResult

**Phase 3 — ExtLink component** (`src/lib/components/ExtLink.svelte` + `src/routes/+layout.server.ts`):
- Component reads overrides from `$page.data.linkOverrides` (loaded by layout server)
- Three render modes: default (link), unlink (text only), remove (hidden)
- Layout server loads active overrides from D1 with graceful fallback

**Phase 4 — Link migration**:
- Replaced all 21 external `<a>` tags with `<ExtLink>` across 3 files
- `+layout.svelte` (1), `how-space-weather-affects-gps/+page.svelte` (10), `rtk-float-drops/+page.svelte` (10)

**Phase 5 — Admin API endpoints** (5 new files under `src/routes/api/v1/admin/`):
- GET links, PUT links/[id], POST link-check (proxy to cron worker), GET link-checks, GET link-checks/[id]
- Added CRON_WORKER_URL to wrangler.toml and app.d.ts

**Phase 6 — Admin UI** (5 new files under `src/routes/admin/`):
- Dashboard: health summary cards, last check run, manual trigger button
- Link management: table with inline editing (override URL, text, action)
- Check history: list of past runs + detail view with per-URL results

**Phase 7 — Cron worker updates**:
- `link-crawler.ts` v0.2.0: extracts link text via HTMLRewriter (returns `Map<url, Map<page, text>>`)
- `link-checker.ts` v0.2.0: accepts new map structure
- `check-links.ts` v0.3.0: creates check run, upserts site_links, persists results, accepts triggerType
- `index.ts` v0.5.0: passes 'scheduled'/'manual' trigger type
- Added `/panels` to SITE_PATHS

**Files created (11):** migration, server helpers, ExtLink, layout.server, 5 admin pages, 5 API endpoints
**Files modified (8):** layout.svelte, 2 article pages, api.ts, app.d.ts, wrangler.toml, 4 cron worker files

Build: 0 new errors, 0 new warnings, 46 tests pass. Deployed SvelteKit app + cron worker to production.

## 2026-02-10 00:04 — Fact-check corrections to "RTK Float Drops" article

Applied 5 corrections to `src/routes/gnss-reliability/rtk-float-drops/+page.svelte` (v0.2.0 → v0.3.0) based on fact-check against authoritative sources (SwiftNav, Trimble, ESA Navipedia, PX4 issues, peer-reviewed journals):

1. **Reworded "often caused by ionosphere"** (line 30) — Changed to acknowledge obstructions, multipath, and radio link as common causes, with ionospheric disturbance dominant specifically during geomagnetic storms. Per SwiftNav/Trimble troubleshooting guides.
2. **Reworded Key Takeaway "often atmospheric"** (line 192) — Same qualification: atmospheric causes dominate during storms but other causes are equally common in routine operations.
3. **Added safety qualifier to flight control claim** (line 174) — Now notes that some autopilot platforms may experience position jumps during RTK transitions. Per PX4 issues #21555 and #21471.
4. **Fixed FLOAT analogy** (line 110) — Changed "occasionally drifts" to "can't hold exact speed" to convey persistent degradation rather than intermittent.
5. **Replaced CORS link with ESA Navipedia RTK Fundamentals** (line 48) — Old link pointed to CORS network homepage, not RTK fundamentals. New link: `gssc.esa.int/navipedia/index.php/RTK_Fundamentals`.

Also fixed 4 unused CSS selector warnings across both article pages (`.reference a` and `.source-list a` → `.reference :global(a)` and `.source-list :global(a)`) caused by ExtLink component boundary.

Build verified clean with zero warnings.
