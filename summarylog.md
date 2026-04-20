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
