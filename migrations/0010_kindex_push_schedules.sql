-- 0010_kindex_push_schedules.sql v0.1.0 - Scheduled K-index source push configuration.
--
-- Each row sends the same K-index source snapshot used by the one-time push:
-- NOAA Boulder K-index, NOAA Estimated Kp, and GFZ Potsdam Hp30 at 1-hour
-- intervals over the previous N hours. push_time is interpreted in timezone.

CREATE TABLE IF NOT EXISTS notif_kindex_push_schedules (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id            INTEGER NOT NULL REFERENCES notif_channels(id) ON DELETE CASCADE,
  enabled               INTEGER NOT NULL DEFAULT 1,
  push_time             TEXT    NOT NULL,                  -- 'HH:MM' in timezone
  timezone              TEXT    NOT NULL,                  -- IANA timezone
  lookback_hours        INTEGER NOT NULL DEFAULT 6,         -- 1-12
  last_sent_local_date  TEXT,                              -- 'YYYY-MM-DD' in timezone
  last_sent_at          TEXT,                              -- ISO timestamp
  created_at            TEXT    NOT NULL,
  updated_at            TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_kindex_push_channel
  ON notif_kindex_push_schedules(channel_id);

CREATE INDEX IF NOT EXISTS idx_notif_kindex_push_enabled_time
  ON notif_kindex_push_schedules(enabled, push_time)
  WHERE enabled = 1;
