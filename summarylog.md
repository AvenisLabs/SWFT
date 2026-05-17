# SWFT Summary Log

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

