-- 0007_threshold_events.sql v0.1.0 — Threshold event log, system_state, drop kp_obs
-- Part of the 2026-04-20 revamp. Replaces the unbounded kp_obs table with two things:
--   1. kp_events — persistent, searchable, append-only log of every 15-min bucket
--      where Kp >= 4. Grows slowly (a quiet year adds ~0 rows).
--   2. kp_estimated (existing) — retention expanded from 12h → 24h in ingest code,
--      so it now doubles as the dashboard's rolling buffer. No schema change here.
-- Also introduces system_state, a dedicated key/value table for monitoring-mode
-- flags (active_mode, storm_until_iso, elevated_until_iso) so we don't overload
-- cron_state.

-- Append-only Kp event log. No UPSERT: the ingest code tracks the last-seen
-- bucket ts in system_state and only appends buckets newer than that.
CREATE TABLE kp_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT    NOT NULL,                      -- ISO 8601 bucket start
  kp_value     REAL    NOT NULL,
  source       TEXT    NOT NULL,                      -- noaa | noaa_boulder | gfz | bom | noaa_forecast
  storm_class  TEXT    NOT NULL,                      -- active | G1 | G2 | G3 | G4 | G5
  bz_nt        REAL,                                  -- Bz at same bucket (nullable if SW lags)
  speed_kms    REAL,                                  -- solar wind speed at same bucket (nullable)
  created_at   TEXT    NOT NULL                       -- ISO 8601 ingest time
);

CREATE INDEX idx_kp_events_ts          ON kp_events(ts);
CREATE INDEX idx_kp_events_kp_value    ON kp_events(kp_value);
CREATE INDEX idx_kp_events_storm_class ON kp_events(storm_class);

-- Dedicated key/value state table (separate from cron_state so per-task run logs
-- stay isolated from system-wide flags).
CREATE TABLE system_state (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Seed the rows the cron worker needs to UPDATE. Epoch value for timestamp fields
-- so the first real update is unambiguously newer than the seed.
INSERT INTO system_state (key, value, updated_at) VALUES
  ('active_mode',            'normal', '1970-01-01T00:00:00.000Z'),
  ('storm_until_iso',        '',       '1970-01-01T00:00:00.000Z'),
  ('elevated_until_iso',     '',       '1970-01-01T00:00:00.000Z'),
  ('last_kp_events_ts_seen', '',       '1970-01-01T00:00:00.000Z');

-- Clean start. Dashboard now reads 24h of 15-min kp_estimated data instead of
-- 3-hour kp_obs. Historical archive (pre-shutdown) is considered stale.
DROP TABLE IF EXISTS kp_obs;
