# SWFT Summary Log

## 2026-04-30 19:48 — Production restored: Alpha promoted, D1 quota recovery deploy

Brought the site back online after the 2026-03-19 shutdown. Promoted the Alpha
branch (Phases 1–5 of the D1 quota recovery) into production following
`docs/DEPLOY.md`, with one extra fix discovered during pre-flight.

### Pre-flight discovery
- `src/lib/server/solarwind.ts:29` was still using
  `WHERE datetime(ts) > datetime('now', ? || ' hours')` — the same
  index-killing pattern the March 15 postmortem indicted, on a hot SSR path
  (24h of solar wind on every homepage load). Phase 2 swept `kp_estimated`
  and `alerts_raw` but missed `solarwind_summary`. Fixed:
  precomputed ISO bound bound as a plain string, comment rewritten to lead
  with the constraint (index unusable when wrapped) instead of describing
  what the wrap did. File header bumped v0.2.0 → v0.3.0.

### Pre-flight verification
- `npm run check` → 0/0
- `npm run test` → 94/94
- `npm run build` → clean
- `cd workers/cron-ingest && npx tsc --noEmit` → clean

### Deploy sequence executed
1. **D1 migration 0007** applied to remote — created `kp_events`,
   `system_state`, seeded 4 rows, dropped `kp_obs`. Verified via
   `sqlite_master` (only `kp_events` + `system_state` returned, no `kp_obs`)
   and `system_state` keys (`active_mode=normal`, both `*_until_iso`
   empty, `last_kp_events_ts_seen` empty).
2. **Cron worker deployed** as `swft-cron-ingest` v1.1.0. Triggers live:
   `*/5 * * * *` and `0 12 * * 1`. Worker URL is on
   `avenislabs.workers.dev` (the `CRON_WORKER_URL` env var in
   `wrangler.toml` points to a stale `maine-sky-pixels` subdomain — but
   `CRON_WORKER_URL` is unreferenced anywhere in the source, so the
   mismatch is harmless).
3. **Pages app deployed** with `--branch master --commit-dirty=true`
   (master is the production branch for this project). Deploy ID
   `a937c810`. Custom domain (`swft.skypixels.org`) picked up the new
   code immediately.

### Smoke checks (custom domain)
- `/api/v1/status` → `mode=normal`, `kp_events_row_count=0`,
  expiries null ✓
- `/api/v1/events/kp?limit=5` → `count=0`, `ok=true` ✓
- `/` → `HTTP/1.1 200 OK` ✓
- `/api/v1/kp/summary` → `current_kp=1.78`, `status=quiet` ✓ (real data
  flowing from `kp_estimated`)
- Worker `/health` → `{status:ok, mode:normal, storm_until:null,
  elevated_until:null}` ✓

### Outstanding items (not in this session)
- **First-60-min watch and 48h watch** per DEPLOY.md §4–§5 — D1 reads
  budget 100k–300k/day in normal mode, red flag at 1M/day; worker
  invocations should hit ~288/day; full batches now ~48/day in normal
  (after the 30-min cadence change, see below).

## 2026-04-30 20:09 — Post-deploy bug sweep + normal-mode cadence change

### 1. Wiped 43-day-old ingest tables (3,190 rows)
Migration 0007 only dropped `kp_obs`. The other ingest tables
(`kp_estimated`, `solarwind_summary`, `alerts_raw`, `alerts_classified`,
`kp_forecast`, `events`) still held data from immediately before the
2026-03-19 shutdown — bad optics on a "back online" dashboard.
DELETE'd those 6 tables (FK order: classified before raw). Preserved
`cron_state` (task watermarks) and content tables (`content_articles`,
`site_news_items`, `site_links`, `link_check_*`).

### 2. Changed `normal` mode cadence from hourly to every 30 min
Per user request — `:00` and `:30` instead of just `:00`.
- `workers/cron-ingest/src/lib/evaluate-mode.ts` v0.1.0 → v0.2.0:
  `shouldActForMode` returns `minuteOfHour % 30 === 0` for normal.
- `tests/evaluate-mode.test.ts`: updated the "normal acts only at the
  top of the hour" test to assert `:00` and `:30` are true, all other
  5-min marks are false. 94/94 pass.
- `workers/cron-ingest/src/index.ts` v1.1.0 → v1.2.0: comment updated.
- `CLAUDE.md` "Cron schedules" section rewritten to describe the
  single `*/5` schedule + skip-gate (the previous text still showed
  the obsolete `*/3 + */5 + */15` triad).
- `docs/DEPLOY.md` §5 budget: `~24` full batches/day → `~48`.

### 3. Critical pre-existing bug — NOAA timestamp format mismatch
The 00:00 UTC ingest succeeded for Kp + alerts but produced 0 solar
wind rows. Investigation found NOAA serves timestamps in space-separated
format (`'2026-05-01 00:01:00.000'`) but downstream code does ISO 8601
string comparisons (`'2026-04-30T00:00:00Z'`). ASCII space (32) sorts
BEFORE 'T' (84), so the cutoff filter
`recentPlasma = plasma.filter(p => p.ts > cutoff)` discards rows with
yesterday's date. Same root-cause family as the 2026-03-15 D1 disaster
(timestamp format mismatch in string comparisons), just on the in-memory
filter side instead of the SQL side.

The same bug also affected the mode evaluator's
`WHERE r.issue_time > ?` query in `index.ts:78` — meaning even
actively-firing G-alerts would be invisible to the upgrade path.

**Fix:** added `noaaTsToIso()` helper in `noaa-client.ts` v0.6.0 → v0.7.0
that normalises NOAA's space-separated timestamps to ISO at the parser
boundary. Applied to `fetchPlasma`, `fetchMag`, `fetchAlerts`. Left
`fetchKpForecast` alone (CLAUDE.md exception — small table, queries
already use `datetime()`). `fetchKpIndex` was already dead code (kp_obs
dropped).

**Backfill:** ran `UPDATE alerts_raw SET issue_time = REPLACE(issue_time, ' ', 'T') || 'Z' WHERE issue_time NOT LIKE '%T%'`
to convert the 137 alerts ingested under the buggy code path to ISO.
`solarwind_summary` was empty so no backfill needed.

**CLAUDE.md** "NOAA data quirk" section expanded to call out the
timestamp format and reference the helper, so a future contributor
doesn't reintroduce the same bug a third time.

### 4. Deploys
- Worker v1.1.0 → v1.2.0 (cadence change) → v0.7.0 NOAA-client (parser fix).
  Two deploys, two version IDs (`b97b716e`, `7e98e4f0`).
- Pages app NOT redeployed — no client-side changes.

### Verification window
Next full-batch fire at `00:30 UTC` (currently 00:08 UTC). After that
fire, expect `solarwind_summary` to populate (~288 rows = 24h ÷ 5 min)
and the mode evaluator to see the alert backfill. No banner change
expected — current Kp is quiet (1.78), no G-alerts active.
