-- 0009_notif_seed_and_iso.sql v0.1.0 — Seed notif_last_dispatch_mode + document
-- the timestamp-format invariant introduced by the third-pass code review.
--
-- 1. Seed `notif_last_dispatch_mode = 'normal'` in system_state so the
--    dispatcher's CAS-on-mode-transition has a well-defined starting value
--    on a fresh install (otherwise the first transition silently no-ops).
-- 2. Document (via comment only — SQLite does not support ALTER COLUMN
--    DEFAULT cleanly) that notif_deliveries.sent_at MUST be bound as an
--    explicit ISO 8601 string by the insert code. The schema's
--    `(datetime('now'))` default produces space-separated values which
--    JS `new Date()` parses inconsistently. recordDelivery() and
--    logDelivery() now bind the value explicitly to bypass the default.
--    See src/lib/server/notif-channels.ts and workers/cron-ingest/src/tasks/
--    dispatch-notifications.ts for the bound values.

INSERT OR IGNORE INTO system_state (key, value, updated_at)
VALUES ('notif_last_dispatch_mode', 'normal', '1970-01-01T00:00:00.000Z');
