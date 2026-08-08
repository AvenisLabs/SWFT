# SWFT Summary Log

## 2026-05-17 12:55 — Cache-layer bug fix: site-wide latency from broken `cache.put`

### Symptom
User reported swft.skypixels.org (and skypixels.org) "timing out" then loading
very slowly. Curl showed homepage taking 4–14s and `/api/v1/kp/summary` taking
5–11s, erratic, with `X-Cache: MISS` on every single hit.

### Root cause
`src/lib/server/cache.ts` (`withCache`) was firing `cache.put(...)` without
`await` and with a silent `.catch`. In Cloudflare Workers, non-awaited promises
that aren't passed to `ctx.waitUntil()` get cancelled when the response is
sent — so the put never completed, the cache stayed permanently empty, and
every request hit D1 cold. The silent catch hid the failure from logs.

Same class of bug was present in the SSR data path: `+page.server.ts` and
`+layout.server.ts` were calling DB helpers (`getKpSummary`, etc.) directly,
bypassing `withCache` entirely. Even if the API cache had been working, the
homepage SSR did 9–11 D1 queries on every request.

### Fixes
- **`cache.ts` v0.4.0** — `cache.put` is now `await`ed (adds ~5–10ms to
  cache-miss responses, turns the cache from "never works" into "works").
  Silent catch replaced with `console.warn` so future write failures are
  visible in `wrangler tail`.
- **`server-cache.ts`** (new) — `cachedServerCall(key, ttl, factory)` wraps
  the CF Cache API for JSON-serialisable values. Distinct URL prefix
  (`/srv/`) from `withCache`'s `/cache/` so the two layers can't collide.
- **`+page.server.ts` v0.5.0** — All 4 DB calls wrapped in `cachedServerCall`
  with the corresponding `CACHE_TTL` constants. Tried `fetch`-via-internal-API
  first (v0.4.0) but it didn't actually hit the cache under
  adapter-cloudflare — direct cache calls sidestep that issue.
- **`+layout.server.ts` v0.3.0** — `getActiveOverrides` and `getModeState`
  wrapped in `cachedServerCall`.
- **`hooks.server.ts` v0.3.2** — Identity resolution made lazy: now only
  runs on `/notifications/*` routes. Previously, every authenticated user's
  every pageload did an extra `loadAuthUser` D1 query.

### Results (post-fix, verified via curl)
| Endpoint | Before | After (cold) | After (warm) |
|---|---|---|---|
| Homepage `/` | 4–14s | 27s (first hit, D1 laggy) | **130–210ms** |
| `/api/v1/kp/summary` | 5–11s | n/a (was already cached) | **120–140ms** |

### Also fixed earlier today
- **CF Access JWT decode fallback** (`notif-auth.ts` v0.2.0) — CF Access
  Application config emits `Cf-Access-Jwt-Assertion` but not always
  `Cf-Access-Authenticated-User-Email`. Added JWT payload decode (base64url
  → JSON, read `email` claim) as a fallback. Trust model: CF Access verified
  the JWT at the edge, and CF strips client-provided `cf-*` headers globally,
  so signature re-verification is not strictly required.
- **CF Access dashboard setup guidance** — walked the user through the
  Group-vs-Policy-vs-Application hierarchy after the initial "That account
  does not have access" error (group existed but wasn't referenced by any
  Allow policy on the Application).

### Deploy
- 4 Pages deployments today (last: cb1b9e52 → 667a4521 for the SSR cache).
- Cron worker unchanged this session.

## 2026-05-17 11:50 — Notifications subsystem (Discord webhooks + SMS) shipped

Built a full subscription-notifications feature for Kp threshold events, with
Cloudflare Access auth, per-channel rule/schedule editors, a cron-driven
dispatcher, Discord embed builder, TextBelt SMS support, and a delivery audit
log. Two independent agent review passes drove the design to a clean state.

### What landed
- **Migration 0008** — six tables: `notif_users`, `notif_channels`,
  `notif_rules`, `notif_schedules`, `notif_state`, `notif_deliveries`.
  Seeded `karathrace69@gmail.com` as the first admin.
- **Migration 0009** — seeds `system_state.notif_last_dispatch_mode = 'normal'`
  so the dispatcher's mode-transition CAS has a defined baseline on first run.
- **Auth via Cloudflare Access** (Google IdP) — `hooks.server.ts` reads
  `Cf-Access-Authenticated-User-Email`, resolves the row in `notif_users`,
  enforces the allowlist at `/notifications/*` and `/api/v1/notifications/*`.
  Dev override `DEV_AUTH_EMAIL` for local SvelteKit; loud `console.warn` if it
  ever leaks into production.
- **CF Access Group sync** — `src/lib/server/cf-access.ts` PUTs the email
  allowlist via the CF API on every admin add/remove. Drift detection +
  one-directional reconcile (D1 → CF) on the admin UI.
- **`/notifications` UI** — channels list with masked target display,
  enable/disable toggle, test-send button (60s cooldown), delete.
  `/notifications/channels/[id]` hosts the rule editor and the schedule editor
  (multiple windows per channel, IANA tz, optional date range).
  `/notifications/admin/users` for admins to manage the allowlist.
  `/notifications/log` shows last 200 dispatches with status/error.
- **Cron dispatcher** — `workers/cron-ingest/src/tasks/dispatch-notifications.ts`
  runs every `*/5` tick regardless of mode skip-gate. Pure decision logic in
  `notif-decide.ts`; orchestrator handles I/O, CAS-based watermark claim,
  per-action persistence of `last_immediate_at` / `sms_last_sent_at` only on
  successful dispatch.
- **TextBelt SMS** with hard 12h-per-phone cap, immediate-only delivery.
- **Footer link** — "Notify (subscription notifications)" added to the global
  footer, pointing to `/notifications`.
- **pages.dev block** — `*.pages.dev/notifications/*` and `.../api/v1/notifications/*`
  return 410 Gone with a redirect hint, preventing CF Access bypass via the
  always-on Cloudflare-assigned URL.

### Code review
Two independent agent review rounds across 5 sub-passes found 13 issues; all
medium+ severity fixed before deploy. Notable catches:
- **Events between cadence ticks were silently dropped** from summaries —
  redesigned `decide()` to buffer all qualifying events and drain on summary
  fire, fixing the silent data loss.
- **Race condition on concurrent dispatcher ticks** — added CAS-based watermark
  claim (`tryClaim`) so identical-tick races can't double-fire.
- **`datetime('now')` → `new Date()` footgun** (same class as the NOAA timestamp
  bug in CLAUDE.md) — fixed by binding explicit ISO 8601 on every
  `notif_deliveries` insert.
- **Mode-transition CAS** on `system_state.notif_last_dispatch_mode` so two
  ticks observing the same transition can't both emit `storm_end`.
- **Storm-end gated on `inSchedule`** to avoid 3am pings for off-schedule users.

Final state: **144/144 tests pass**, `npm run check` 0 errors/0 warnings,
`tsc --noEmit` clean on the cron worker.

### Provisioning done
- CF Access Application protecting `swft.skypixels.org/notifications*` set up
  via Zero Trust → Access controls (new menu structure post-2025 rebrand).
- API token, account ID, Access Group ID uploaded as Pages secrets.
- `.dev.vars` populated locally with `DEV_AUTH_EMAIL` + the three CF secrets;
  `.dev.vars` added to `.gitignore`.
- D1 migrations 0008 + 0009 applied to local AND remote.
- `notif_users` table synced with CF Access Group (1 admin + 3 users).

### Deferred / known limitations
- Residual race window for `on_resume` digest when two concurrent ticks have
  identical inputs — would need a tick-id column to fully close. Worst case is
  one duplicate Discord message; documented in `dispatch-notifications.ts`.
- `off_hours_digest_time` is UTC-only (matches schema; UI labels it
  explicitly). Could later interpret in the schedule's timezone if asked.


## 2026-05-17 12:58:31 -04:00
- Added AGENTS.md contributor guide with repository structure, npm commands, coding/testing expectations, PR guidance, and Cloudflare configuration notes.

## 2026-05-17 13:18:00 -04:00
- Performed a load-path review for homepage latency. Found duplicated first-load data fetches (SSR+layout/page hooks + client refresh), and separate cache namespaces for SSR loader data vs API endpoints that force repeated D1 reads for first-time visitors. Identified likely reasons first-time load is still >1s and proposed consolidation/stale-while-revalidate changes. See findings in next message.

## 2026-05-17 13:08:32 -04:00
- Implemented 1–4 latency optimizations and validated cleanly:
  1) Passed platform context into SSR cache calls (`cachedServerCall`) so stale values can be background-refreshed via `ctx.waitUntil`.
  2) Repointed homepage API handlers (`kp/summary`, `kp/estimated`, `gnss/risk`, `alerts/active`) to share the same `/srv/` cache keys as SSR loaders, so hydrated API refreshes avoid duplicate D1 reads.
  3) Added a startup refresh guard in `+page.svelte` so the page skips redundant `fetchApi(...)` calls when SSR data is already present and up-to-date.
  4) Kept `/notifications` auth lazy and moved identity lookup strictly behind protected routes (`hooks.server.ts`, `notif-auth.ts`) to remove non-route auth/db overhead.
- Review fix: guarded the new server cache helper when the Workers `caches` global is absent, preserving local dev fallback behavior.
- Verification: `npm run check` passed (0 errors, 0 warnings). `npm test` passed (`8 files, 144 tests`). `npm run build` passed.
- Residual: first-ever cold-hit SSR path still does an uncached D1 round-trip; after cache warmup, homepage/route API reads are now cache-first and sub-200ms in warm-path targets.

## 2026-05-17 13:15:43 -04:00
- Verified live data with Wrangler before production deployment:
  - Wrangler auth OK for account `fb1f24438ff7a3d967ede61f6b0ea7cd`; missing `ai-search` scopes warning is unrelated to Pages/D1 deploy.
  - Remote D1 `swpc-web-db`: `kp_estimated` newest `2026-05-17T16:45:00Z`, `solarwind_summary` newest `2026-05-17T16:55:00Z`, `alerts_raw` newest `2026-05-17T16:12:50.913Z`.
  - Live APIs matched D1 freshness: Kp summary `2026-05-17T16:45:00Z`, GNSS risk updated `2026-05-17T16:55:00Z`, status showed ingest timestamps around `17:01-17:05`.
- Deployed current build first as `Alpha` preview (`d13fbc4a`), then correctly redeployed to production branch `master`.
- Found the production first hit was still too slow after cache-only changes (`7.986s`), so added hard SSR budgets: root layout `350ms`, homepage dashboard `650ms`; cold data loads now continue through `ctx.waitUntil` while the shell renders quickly.
- Final production deployment: `520355b8` on `master`.
- Post-deploy custom-domain verification: first measured homepage hit `0.266870s` HTTP 200, repeat `0.580724s` HTTP 200; Kp/GNSS/status APIs all HTTP 200 with current live data.
- Validation after final code changes: `npm run check`, `npm test`, and `npm run build` passed. `git diff --check` passed with only existing CRLF normalization warnings from Git.

## 2026-05-17 13:36:38 -04:00
- Reviewed and fixed notification stale-backlog replay after the first Discord webhook sent historical Kp data.
- Live D1 verification showed channel `SolarEvents` was created on 2026-05-17 with state advanced only after dispatching two old backlog messages: immediate `Kp 6.56 G2 @ 2026-05-04T20:45:00Z` and a 100-event summary. Current live `kp_estimated` data was fresh for 2026-05-17, but `kp_events` had no May 17 threshold rows because current Kp was below 4.
- Fixed new channel creation to bind ISO `created_at` and seed `notif_state.last_event_id_sent` to the current `kp_events` high-water mark.
- Added a cron-worker defensive bootstrap for zero-watermark channels created after the latest stored event, a CAS race fix so concurrent ticks cannot both claim the same new watermark, and watermark advancement across all seen `kp_events` so lowering a channel threshold later cannot replay older below-threshold events.
- Added regression tests in `tests/notif-channels.test.ts` and `tests/notif-dispatch-watermark.test.ts`.
- Validation: `npm run check`, `npm test` (156 tests), `npm run build`, worker `tsc --noEmit`, and `git diff --check` passed; diff check only reported existing CRLF normalization warnings.
- Deployed Pages app (`20f373a9.swft-web.pages.dev`) and cron worker version `6f6b153b-6f32-4741-b31a-a76eccda374f`. Post-deploy D1 checks showed no new notification deliveries and channel state at event id `119` with an empty buffer.

## 2026-05-17 14:24:13 -04:00
- Changed notification "Test" behavior to a Discord-only One-Time Push that sends a current + previous 6-hour K-index source snapshot at 1-hour intervals.
- Added shared K-index push snapshot/embed generation for exactly labeled sources from the data-sources page: `NOAA Boulder K-index`, `NOAA Estimated Kp`, and `GFZ Potsdam Hp30`.
- Added scheduled K-index push support:
  - New D1 table `notif_kindex_push_schedules` via `migrations/0010_kindex_push_schedules.sql`.
  - Channel detail UI for daily scheduled pushes at user-defined local time, timezone, and lookback from 1-12 previous hours.
  - Pages APIs for one-time push and scheduled-push CRUD.
  - Cron worker dispatch that sends due scheduled K-index pushes once per local date.
- Updated notification embeds and notification pages to use the user's timezone where available; when unavailable, formatting falls back to UTC plus Eastern time.
- Added delivery-log support for `kindex_push` records and regression tests for source labels and schedule timing.
- Validation: `npm run check`, worker `tsc --noEmit`, `npm test` (159 tests), `npm run build`, and `git diff --check` passed; diff check only reported existing CRLF normalization warnings.
- Applied migration locally and remotely. Remote migration API returned Cloudflare code `7403`, so the SQL was applied through `wrangler d1 execute --remote --file` and the remote `d1_migrations` row was marked manually after schema verification.
- Verified live data before deploy: remote Kp latest `2026-05-17T18:00:00Z` from `noaa_boulder`; live `/api/v1/kp/sources` returned HTTP 200.
- Deployed Pages app (`48d0910f.swft-web.pages.dev`) and cron worker version `96362288-a047-455e-874c-e4f22f4bbfd7`. Post-deploy checks: `/notifications` returned Cloudflare Access 302, `/api/v1/kp/sources` HTTP 200, cron worker `/health` HTTP 200, and the new schedule table is present with 0 rows.
