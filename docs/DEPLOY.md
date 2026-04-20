# Deploy Checklist — 2026-04-20 Revamp (Alpha → Production)

v0.1.0 — Walks through rolling the Phases 1–5 work from branch `Alpha` onto the
live site. Do this from top to bottom; each step has rollback notes.

---

## 0. Pre-flight

Before running anything production-affecting:

- [ ] Local working tree on `Alpha`, clean: `git status` shows nothing pending,
      `git rev-parse HEAD` ~= latest commit (currently `acc3248` or newer).
- [ ] `npm run test` → 94/94 pass.
- [ ] `npm run check` → 0/0.
- [ ] `npm run build` → clean.
- [ ] `cd workers/cron-ingest && npx tsc --noEmit` → clean.
- [ ] Authenticated with Cloudflare: `npx wrangler whoami` returns your account.
- [ ] Cloudflare dashboard open to the D1 metrics page for `swpc-web-db` so you
      can watch row-read counts during/after deploy.

### Safety nets already in place

- Branch `Alpha` is on GitHub with full per-phase commit history.
- Tag `pre-revamp-baseline` → commit `2bfa216` is the last-known-good Feb 16
  state. `git checkout pre-revamp-baseline` and redeploy would fully revert the
  app code (D1 schema is a separate concern — see §5).
- Branch `master` is untouched and still tracks the pre-revamp codebase.

---

## 1. Apply D1 migration 0007 to remote

**What it does:** creates `kp_events` + `system_state`, seeds 4 mode-state rows,
`DROP TABLE kp_obs` (irreversible — this is the one-way door).

```bash
# Optional dry-run equivalent: list what's about to apply
npx wrangler d1 migrations list swpc-web-db --remote

# Apply
npx wrangler d1 migrations apply swpc-web-db --remote
```

**Expected output:** `✔ Applied migration 0007_threshold_events.sql`.

**Verify** from a second terminal:
```bash
npx wrangler d1 execute swpc-web-db --remote --command \
  "SELECT key, value FROM system_state ORDER BY key"
```

You should see four rows: `active_mode=normal`, `elevated_until_iso=''`,
`last_kp_events_ts_seen=''`, `storm_until_iso=''`.

```bash
npx wrangler d1 execute swpc-web-db --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('kp_obs','kp_events','system_state')"
```

Should return two rows: `kp_events`, `system_state`. No `kp_obs`.

**If it fails mid-way:** individual statements in the migration are independent
at the D1 level. Re-running `migrations apply` is safe only if the tracking
table is in a good state (D1 handles this automatically). If stuck, manually
run the remaining statements via `wrangler d1 execute --command`. The DROP is
the last and riskiest — if everything before it succeeded but DROP didn't, the
site still runs correctly against the old code (kp_obs intact, new tables
extra but unread by old code).

**Rollback:** the DROP is one-way — there's no backup of kp_obs data. The
design assumes "clean start" is acceptable. If you need to reverse, you can
`CREATE TABLE kp_obs (...)` with the old schema and accept an empty table; the
old code path would then work again on an empty table.

---

## 2. Deploy the cron worker

**What it does:** replaces the old three-schedule cron (`*/3 + */5 + */15`)
with the single `*/5` + skip-gate worker (`index.ts` v1.1.0). Starts writing to
`kp_events` and `system_state`.

```bash
cd workers/cron-ingest
npm run deploy
```

**Expected output:** `Deployed swft-cron-ingest triggers` with the two cron
schedules (`*/5 * * * *` and `0 12 * * 1`).

**Verify the worker is live:**
```bash
curl https://swft-cron-ingest.<your-cf-subdomain>.workers.dev/health
```

Expected JSON (first hit — mode will still be `normal` with empty expiries
until the first full batch runs):
```json
{"status":"ok","worker":"swft-cron-ingest","mode":"normal","storm_until":null,"elevated_until":null}
```

**Watch the first full-batch run** from the CF dashboard → Workers → swft-cron-ingest → Logs.
The first fire at the next `:00` minute should log:

- `[ingest-kp-estimated] source=..., inserted=N, events_appended=M`
- `[cron:full] events_created=0, rows_pruned=...` (old rows purged, expected)

If Kp is quiet, `events_appended=0` is correct.

**Rollback:** `git checkout master && cd workers/cron-ingest && npm run deploy`
redeploys the previous worker. Cron schedule reverts to the old triad. The new
D1 tables are still there but inert — not a problem.

---

## 3. Deploy the Pages app

**What it does:** rolls the new SSR layout (with mode chip), `/api/v1/events/kp`
search endpoint, and all the Phase 2–3 server-code redirects (kp_obs → kp_estimated,
kp_events_row_count in /status, etc.).

```bash
cd ../..                          # back to repo root
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name swft-web
```

**Expected output:** a `Deployment complete!` line with a preview URL.

**Smoke checks** (substitute your live domain; these also check the CORS
headers from `hooks.server.ts` haven't regressed):

```bash
# 1. Status includes mode
curl -s https://swft.skypixels.org/api/v1/status | jq '.data.mode, .data.storm_until'
# Expect: "normal" and null

# 2. Search endpoint returns an empty array initially
curl -s "https://swft.skypixels.org/api/v1/events/kp?limit=5" | jq '.data.count'
# Expect: 0 until Kp rises above 4

# 3. Homepage renders (should include the footer mode chip)
curl -sI https://swft.skypixels.org/ | head -1
# Expect: HTTP/2 200

# 4. Kp summary works against kp_estimated
curl -s https://swft.skypixels.org/api/v1/kp/summary | jq '.data.current_kp, .data.status'
```

**Rollback:** CF Pages keeps all previous deployments. Go to Cloudflare
dashboard → Pages → swft-web → Deployments → click the previous successful
deployment → "Rollback to this deployment". One click, reverts in ~30s.

---

## 4. First 60 minutes — what to watch

| Signal | Expected | If wrong |
|---|---|---|
| `/health` on worker shows `mode: normal` | ✓ after first `:00` fire | Worker isn't running full batches — check logs for exceptions |
| `/api/v1/status` → `kp_events_row_count` | 0 at deploy, grows only during Kp≥4 | Persistent growth in quiet conditions = ingest bug |
| Worker invocations/hour on CF dashboard | 12 (one per `*/5` fire) | Less = worker crashing; more = unexpected |
| CF Pages error rate | 0 / near-zero | 500s = check SSR layout load (mode query may fail on cold start) |
| D1 reads/hour | <~5k in normal mode | Much higher = index not being used |

The first full batch fires at the next `:00` mark. Before that, all cron fires
take the skip path (~1ms, one D1 read each, so ~11 reads/hour).

---

## 5. 48-hour watch

Metrics to check at 24h and 48h on the CF dashboard:

| Metric | Normal-mode budget (per day) | Elevated-mode (active alert day) |
|---|---|---|
| Worker invocations | 288 | 288 (same — skip-gate absorbs) |
| Full batches executed | ~24 | ~24–96 |
| D1 reads | 100k–300k | +20% during elevated hours |
| D1 writes | 10k–50k | +30% during elevated hours |
| 95p latency `/api/v1/*` | <200 ms | same |

**Red flags:**

- D1 reads >1M/day — look for an unbounded COUNT that slipped through.
- D1 writes >200k/day — `appendKpEvents` watermark broken (re-appending).
- Worker invocations not hitting 288/day — cron trigger misconfigured.
- Pages SSR errors on layout — `getModeState` throwing due to missing
  system_state rows. Recoverable by re-running the seed SQL:
  ```sql
  INSERT OR IGNORE INTO system_state (key, value, updated_at) VALUES
    ('active_mode', 'normal', '1970-01-01T00:00:00.000Z'),
    ('storm_until_iso', '', '1970-01-01T00:00:00.000Z'),
    ('elevated_until_iso', '', '1970-01-01T00:00:00.000Z'),
    ('last_kp_events_ts_seen', '', '1970-01-01T00:00:00.000Z');
  ```

---

## 6. Post-deploy: merge Alpha → master

Only after the 48h watch passes cleanly:

```bash
git checkout master
git merge --ff-only Alpha      # fast-forward; Alpha sits at the tip
git push origin master
```

Keep `Alpha` around as a branch — future revamp work can land there first
before promotion.

If the merge needs a three-way (because master got a hotfix during the watch
period), reconcile manually, don't force-merge.

---

## 7. Storm-day dry-run (optional, recommended before a real G2 hits)

To validate the skip-gate and mode transitions without waiting for real space
weather:

```sql
-- Force storm mode for 1 hour to observe the cadence change
UPDATE system_state SET value = ?, updated_at = ? WHERE key = 'storm_until_iso';
```

Bind the ISO for `now + 1 hour` and current time. Then watch:

- `/health` → `mode: "storm"` within 5 min.
- Worker logs → full batches every 5 min (not just `:00`, `:15`, etc.).
- Homepage → footer chip turns orange and pulses.

After 1 hour the expiry passes and mode auto-falls back to normal. Verify
cleanup was automatic (no manual reset needed).

---

## Appendix: Command reference

```bash
# Current state
git log --oneline Alpha -10
npx wrangler d1 migrations list swpc-web-db --remote
npx wrangler d1 execute swpc-web-db --remote --command "SELECT key,value,updated_at FROM system_state"

# Deploy sequence (copy/paste-able)
npx wrangler d1 migrations apply swpc-web-db --remote
cd workers/cron-ingest && npm run deploy && cd ../..
npm run build && npx wrangler pages deploy .svelte-kit/cloudflare --project-name swft-web

# Emergency rollback
# (1) Pages: click "Rollback" on previous deployment in CF dashboard
# (2) Worker: git checkout master && cd workers/cron-ingest && npm run deploy
# (3) D1: one-way; recreate kp_obs with empty schema if needed
```
