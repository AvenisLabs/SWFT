# SWPC-Web Summary Log

## 2026-04-20 — Restore Feb 16 baseline (Phase 1 of revamp)

After site was shut down on 2026-03-19 due to D1/worker bugs, recovery began with clean
restore to the last known-good committed state. Working tree had 99 modifications and
deletions from the uncommitted March 15 (D1 quota rescue) and March 19 (live-NOAA rewrite)
work. None of that had been committed, so `git restore .` reverted cleanly to commit
`2bfa216` (Feb 16 — 5-source Kp fallback + data-sources page). March 19 summary entries
preserved as `summarylog_2026-03-19.md` before restore so the lessons learned weren't lost.

### Verification
- 57 tests pass (`alert-classifier` 17, `gnss-risk` 40)
- Production build clean (7.45s, all 17 routes)
- `svelte-check` reports 3 pre-existing type errors (vite.config test field, cache.ts
  CacheStorage type, events/[id] json unknown) — will be addressed in Phase 2

### Tag
- `pre-revamp-baseline` → `2bfa216` (lightweight tag — git identity not set in repo)

### Next phases queued
1. Apply known-correct March 15 D1 fixes (precomputed ISO bounds, bounded COUNTs,
   table cleanup, FK indexes)
2. Schema 0007 adds `kp_events` (Kp>=4 persistent) + `kp_recent` (24h rolling) + mode
   state rows in `cron_state`
3. Cron worker rewrite: single `*/5` schedule with skip-gate and three tiers
   (normal/hourly, elevated/15-min when Kp>=5 or G1, storm/5-min when Kp>=6 or G2+)
4. `GET /api/v1/events/kp` searchable history endpoint + mode indicator in UI
5. Staged deploy + 48h D1 usage monitoring

## 2026-04-20 — Deploy checklist authored (Phase 6, staging)

Wrote `docs/DEPLOY.md` as the operational runbook for promoting Alpha to
production. I don't run the deploy myself (production-affecting, credentials
on the user's machine, cf-side rollback UI) — the checklist is the handoff.

Covers:
- Pre-flight (clean tree, all tests, wrangler auth, CF dashboard open).
- Safety nets recap (Alpha branch, pre-revamp-baseline tag, untouched master).
- Step-by-step: D1 migration -> cron worker deploy -> Pages deploy -> smoke
  checks. Each step has expected output, verification queries, and rollback
  notes.
- First-60-min and 48-hour watch criteria with concrete D1 read/write budgets
  and red flags.
- Post-watch Alpha -> master merge procedure (fast-forward only).
- Optional storm-day dry run via system_state manual update (lets us verify
  the skip-gate transitions before a real G2 hits).

### Key numbers to watch (from DEPLOY.md)
- Worker invocations: 288/day expected (all modes — skip-gate absorbs).
- Full batches: ~24/day in normal mode.
- D1 reads budget: 100k-300k/day normal; red flag at 1M/day.
- D1 writes budget: 10k-50k/day normal; red flag at 200k/day.

Phase 6 remains open in the task list until the user executes the deploy and
reports the 48h watch outcome.

## 2026-04-20 — Searchable Kp events API + monitoring-mode indicator (Phase 5)

### New search endpoint
- `src/routes/api/v1/events/kp/+server.ts` NEW — `GET /api/v1/events/kp`.
  Query params: `from`, `to` (ISO 8601; defaults 30d ago / now), `min_kp`
  (default 4, clamped 4..9), `storm_class` (`active|G1|G2|G3|G4|G5`), `limit`
  (default 100, max 500). Uses the indexes on `ts`, `kp_value`, `storm_class`.
  Precomputed ISO bounds bound into the query so the plan keeps the index.
  Cached 60s (short TTL so new storms show up quickly).

### Monitoring-mode data flow
- `src/lib/server/mode.ts` NEW — `getModeState(db)` reads the three keys from
  `system_state` and applies expiry on read. UI never sees a stale 'storm'
  label lingering past `storm_until_iso`.
- `src/lib/types/api.ts` v0.8.0 -> v0.9.0 — new `MonitoringModeData` type;
  `StatusResponse` extended with `mode` + two expiry fields; new
  `KpEventsSearchResult` for the search envelope.
- `src/lib/server/constants.ts` v0.7.0 -> v0.8.0 — `CACHE_TTL.KP_EVENTS = 60`,
  `CACHE_TTL.MODE_STATE = 60`.
- `src/routes/api/v1/status/+server.ts` v0.3.0 -> v0.4.0 — `/status` now
  surfaces monitoring mode and expiry timestamps.

### UI indicator
- `src/lib/components/MonitoringMode.svelte` NEW — small pill chip in the
  footer. Three states with distinct colors: green (normal, hourly), yellow
  (elevated, 15 min), orange with gentle pulse (storm, 5 min). Shows expiry
  time in UTC when applicable. Title attribute carries the full ISO.
- `src/routes/+layout.server.ts` v0.1.0 -> v0.2.0 — loads mode state
  alongside link overrides via `Promise.all`, with per-resource `catch`
  fallbacks so a single D1 hiccup can't break the whole layout.
- `src/routes/+layout.svelte` v0.12.0 -> v0.13.0 — renders the chip in the
  footer (small, unobtrusive; doesn't compete with the existing G-scale
  storm banner for attention).

### SSR, no extra polling
Chip is pure SSR — it refreshes on navigation, no client poll added. Matches
the spirit of the March 15 "no client polling" cleanup. A user in the middle
of a storm will see the chip update the next time any page loads (at most a
~60s lag given the cached layout data).

### Verification
- 94/94 tests pass.
- `svelte-check` 0 errors.
- Production build clean.

## 2026-04-20 — Dynamic-rate cron worker with skip-gate (Phase 4)

Replaced the three-schedule cron (`*/3 + */5 + */15`) with a single `*/5` fire
and an in-worker skip-gate. Mode is read from `system_state` on every tick:
storm runs every fire, elevated acts when `minute % 15 === 0`, normal acts only
when `minute === 0`. Skip path is ~1ms (one D1 read, no NOAA fetches).

### Pure state machine — unit-testable
- `workers/cron-ingest/src/lib/evaluate-mode.ts` NEW — `evaluateMode()`,
  `computeEffectiveMode()`, `shouldActForMode()`. No D1 refs; tests import it
  directly. Storm triggers: Kp>=6 OR active G2+ alert. Elevated triggers: Kp>=5
  OR active G1 alert (storm implies elevated floor). Both use a 12-hour
  minimum hold extended by alert end time when longer — hysteresis keeps a
  brief Kp dip from flapping us out of storm tracking.
- `workers/cron-ingest/src/lib/storm-class.ts` NEW — extracted from db.ts so
  the unit test can import it without pulling Workers globals.

### Tests (+30)
- `tests/storm-class.test.ts` NEW — 7 G-scale boundary tests.
- `tests/evaluate-mode.test.ts` NEW — 23 transition tests: triggers by Kp,
  triggers by alert, null-Kp resilience, hysteresis on Kp dips, storm->
  elevated->normal passive downgrade, promotion from elevated to storm.
- Total test count: 57 -> 87.

### Cron worker rewrite
- `workers/cron-ingest/src/index.ts` v0.8.0 -> v1.0.0 — scheduled handler reads
  mode, decides skip, runs full batch only when gate opens. Full batch: all
  four ingest tasks in parallel; then re-evaluate mode from fresh data via
  `evaluateMode()` and persist; then `generateSummaries` for derived events +
  retention. Transitions are logged. `/health` HTTP endpoint now returns
  current mode + expiry timestamps.
- `workers/cron-ingest/wrangler.toml` — crons reduced from 4 expressions to 2
  (`*/5` + weekly link check).

### Per-bucket Bz/speed enrichment (deferred from Phase 3 review)
- `workers/cron-ingest/src/tasks/ingest-kp-estimated.ts` v0.10.0 -> v0.11.0 —
  fetches a 3-hour solar-wind window once, then looks up the nearest-neighbour
  reading (30-min tolerance) for each appended kp_events bucket. Accurate
  per-bucket enrichment even during first-run catch-up with many stale buckets.

### db.ts
- `workers/cron-ingest/src/lib/db.ts` v0.5.0 -> v0.6.0 — `classifyStormClass`
  moved to ./storm-class.ts; imported back from there.

### Projected cron usage
- Worker invocations/day: 288 (was 864 across three schedules).
- Full batches/day in normal mode: 24 (down from 288 previously doing
  meaningful work). Elevated: 96. Storm: 288.
- D1 read/write during skip: 1 read, 0 writes.

### Verification
- 87/87 tests pass.
- `svelte-check` 0 errors.
- `tsc --noEmit` in workers/cron-ingest clean.
- Production build clean.

### Follow-up after Phase 4 review
- `workers/cron-ingest/src/lib/solar-wind-match.ts` NEW — `nearestSolarWind`
  extracted from ingest-kp-estimated.ts so it's testable without Workers globals.
- `workers/cron-ingest/src/tasks/ingest-kp-estimated.ts` v0.11.0 -> v0.12.0 —
  solar-wind lookback widened 3h -> 25h (covers full kp_estimated retention so
  first-run catch-up still finds neighbours for older Kp>=4 buckets).
- `tests/solar-wind-match.test.ts` NEW — 7 tests (empty input, exact match,
  left edge, right edge, out-of-tolerance, null fields, custom tolerance).
- `workers/cron-ingest/src/index.ts` v1.0.0 -> v1.1.0 — removed the three
  unauthenticated HTTP write-triggers (`/check-links`, `/ingest-kp`, `/run`).
  Cron runs reliably on its own; manual runs go through `wrangler dev` locally.
  Closes a pre-existing security exposure where anyone with the worker URL
  could spam full ingests.
- Test count: 87 -> 94.

## 2026-04-20 — Threshold tables + system_state + drop kp_obs (Phase 3)

Introduced the persistent-storm-log / transient-buffer split and the dedicated
system-state key/value table that the upcoming cron rewrite (Phase 4) will use
for mode gating.

### Migration 0007_threshold_events.sql
- `kp_events` — append-only log, Kp>=4 only. Columns: id (autoincrement), ts,
  kp_value, source, storm_class (active|G1|G2|G3|G4|G5), bz_nt, speed_kms,
  created_at. Indexes on ts, kp_value, storm_class.
- `system_state(key, value, updated_at)` — seeded with `active_mode='normal'`,
  `storm_until_iso=''`, `elevated_until_iso=''`, `last_kp_events_ts_seen=''`.
- `DROP TABLE kp_obs` — clean start (month-old data considered stale).

### No `kp_recent` after all
Realised mid-plan that `kp_estimated` already was a 15-min rolling buffer, just
with 12h retention. Rather than creating a near-duplicate table, retention is
expanded to 24h in ingest code. One less table to reason about.

### Cron worker changes
- `workers/cron-ingest/src/lib/db.ts` v0.4.0 -> v0.5.0 — removed `upsertKpObs`.
  Added `classifyStormClass`, `appendKpEvents` (respects `last_kp_events_ts_seen`
  watermark so rerunning the ingest doesn't double-append), `getSystemState`,
  `setSystemState`.
- `workers/cron-ingest/src/tasks/ingest-kp.ts` v0.2.0 -> v0.3.0 — now ingests
  kp_forecast only. kp_obs writes removed entirely.
- `workers/cron-ingest/src/tasks/ingest-kp-estimated.ts` v0.9.0 -> v0.10.0 —
  buffer retention 12h -> 24h, appends Kp>=4 buckets to kp_events enriched with
  current Bz/speed from solarwind_summary (nearest-neighbour within 15 min).
- `workers/cron-ingest/src/tasks/generate-summaries.ts` v0.4.0 -> v0.5.0 —
  storm detection reads from kp_estimated; kp_obs retention line removed.

### SvelteKit readers redirected
- `src/lib/server/kp.ts` v0.11.0 -> v0.12.0 — `getRecentKp()` now reads kp_estimated,
  default window 24h (capped).
- `src/lib/server/charts.ts` v0.4.0 -> v0.5.0 — reads kp_estimated, default 24h (capped).
- `src/lib/server/gnss-risk.ts` — comment updated (no code change).

### Status API reshaped
- `src/routes/api/v1/status/+server.ts` v0.2.0 -> v0.3.0 — `kp_row_count` replaced
  by `kp_events_row_count` (full table count since the table grows slowly).
  `last_kp_ingest` now prefers `ingest-kp-estimated` timestamp.
- `src/lib/types/api.ts` v0.7.0 -> v0.8.0 — StatusResponse field rename,
  new `KpEventRow` interface.

### Verification
- 57/57 tests pass.
- Production build clean.
- `svelte-check found 0 errors and 0 warnings`.

### Follow-up after Phase 3 review
- `src/routes/api/v1/kp/+server.ts` v0.1.0 -> v0.2.0 — `?hours` upper bound
  168 -> 24 to match the new buffer retention. Default 48 -> 24.
- `src/routes/api/v1/charts/kp/+server.ts` v0.1.0 -> v0.2.0 — same clamp change.
- `src/routes/api/v1/status/+server.ts` — comment added explaining why the
  `COUNT(*) FROM kp_events` query stays unbounded (append-only log of Kp>=4
  buckets, few thousand rows per active solar year — the March 15 rule targets
  large tables).
- Deferred: per-bucket Bz/speed enrichment in `appendKpEvents` and tests for
  `classifyStormClass` (will land alongside Phase 4's `evaluateMode` tests).

## 2026-04-20 — Apply March 15 D1 correctness fixes (Phase 2)

Ported the known-correct patterns from the never-committed March 15 rescue into the
restored baseline. Also fixed the 3 pre-existing `svelte-check` errors that predate
the March crisis.

### Index-friendly WHERE (ISO bound in JS, plain string compare in SQL)
- `src/lib/server/kp.ts` v0.10.0 -> v0.11.0 — `isoHoursFromNow()` helper; `kp_obs`
  and `kp_estimated` queries use `ts > ?`; `kp_forecast` keeps `datetime()` because
  NOAA stores it in space-separated format.
- `src/lib/server/alerts.ts` v0.1.0 -> v0.2.0 — active + recent alert queries.
- `src/lib/server/events.ts` v0.1.0 -> v0.2.0 — recent events query.
- `src/lib/server/charts.ts` v0.3.0 -> v0.4.0 — Kp chart data query.
- `src/lib/server/gnss-risk.ts` v0.4.0 -> v0.5.0 — R-scale alert lookup.
- `workers/cron-ingest/src/tasks/ingest-kp-estimated.ts` v0.8.0 -> v0.9.0 — DELETE purge.
- `workers/cron-ingest/src/tasks/generate-summaries.ts` v0.3.0 -> v0.4.0 — all four
  date-windowed queries converted.

### Bounded COUNTs in /status
- `src/routes/api/v1/status/+server.ts` v0.1.0 -> v0.2.0 — three `COUNT(*)` calls
  now include `WHERE ts > ?` with a 7-day ISO bound so the index is used instead of
  scanning the full table.
- `src/lib/server/constants.ts` v0.6.0 -> v0.7.0 — `CACHE_TTL.STATUS` 30 -> 300.

### Retention cleanup (defense in depth; pre-empts runaway growth before Task 3's
threshold schema lands)
- `generate-summaries.ts` now prunes via `db.batch()`: `kp_obs` 30d, `solarwind_summary`
  7d, `alerts_raw`/`alerts_classified` 90d, `events` 90d. `alerts_classified` pruned
  via subquery on the parent's `issue_time` so FK integrity stays intact.

### Missing FK index
- `migrations/0006_add_missing_indexes.sql` — `idx_alerts_classified_raw_alert_id`
  on `alerts_classified(raw_alert_id)` for the alerts_raw JOIN.

### Pre-existing svelte-check errors
- `vite.config.ts` v0.1.0 -> v0.2.0 — import `defineConfig` from `vitest/config`
  so the `test` field is typed.
- `src/lib/server/cache.ts` v0.2.0 -> v0.3.0 — narrow cast for `caches.default`
  (CF-specific augmentation not in standard `CacheStorage`).
- `src/routes/events/[id]/+page.svelte` v0.3.0 -> v0.3.1 — type assertion on the
  fetch response JSON.

### CLAUDE.md
- "D1 datetime gotcha" section replaced with "D1 timestamp queries — index-friendly
  pattern". The old guidance ("always wrap with `datetime()`") was exactly what
  caused the March 15 disaster.

### Verification
- 57/57 tests pass.
- Production build clean.
- `svelte-check found 0 errors and 0 warnings` (was 3 errors).

## 2026-02-23 14:13 — Audit and improve CLAUDE.md

Comprehensive audit of CLAUDE.md against actual codebase. Key corrections:
- Migration count: 4 → 5 (added 0005_kp_estimated_source.sql)
- Table count: 12 → 13 (was undercounting)
- Added missing `src/lib/server/` modules (kp.ts, kp-sources.ts, alerts.ts, events.ts, charts.ts, panels.ts, solarwind.ts, links.ts)
- Added missing cron worker lib files (discord.ts, link-crawler.ts, link-checker.ts)
- Added undocumented `/ingest-kp` HTTP endpoint on cron worker
- Added `/data-sources` page and `/admin/` section (4 admin pages) to key directories
- Added complete API endpoint listing (public + admin)
- Fixed D1 source column values: `kp_obs` defaults to `'swpc'`, `kp_estimated` defaults to `'noaa'`
- Added platform binding `BOM_API_KEY` to app.d.ts description
- Documented client-side refresh intervals (layout=2min, homepage=3min, stale ticker=30s)
- Documented storm banner system (G2/G3/G4 tiers with 30-min hysteresis)
- Noted display vs. ingest source priority discrepancy (kp-sources.ts labels Boulder as "Primary" for reliability, but ingest code tries NOAA Estimated first)
- Noted `formatters.ts` deprecation in favor of `timeFormat.ts`
- Added 0005 migration to schema section

## 2026-02-23 14:42 — Comprehensive README.md rewrite

Replaced the stale README.md (from 2026-02-09) with a comprehensive version covering the full current state of the project. Key changes from the old README:
- Fixed live site URL: swft-web.pages.dev → swft.skypixels.org
- Fixed GNSS risk weights: was 35%/20%/20%/25%, now correct 40%/25%/20%/15%
- Fixed database table count: 9 → 13 (5 migrations)
- Added complete 5-source Kp fallback chain documentation with priority table
- Added Knowledge Hub section (10 articles across 3 audiences)
- Added admin tools section (4 admin pages)
- Added data-sources page documentation
- Expanded API reference from 12 to 22 endpoints (including admin endpoints with cache TTLs)
- Added detailed project history section with dates and key technical decisions (CLS fix, D1 datetime bug, anomalous-zero detection)
- Added environment variables table with secrets management note
- Added client-side refresh interval table (layout=2min, homepage=3min, staleness=30s)
- Updated architecture diagram to show all 5 data sources
- Updated roadmap to reflect completed vs. planned work
- Added GFZ Potsdam and Australian BoM to data attribution
