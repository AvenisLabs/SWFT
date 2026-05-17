-- 0008_notifications.sql v0.1.0 — Notification subscriptions, channels, rules, schedules, state, delivery audit log.
--
-- Architecture (see CLAUDE.md "Notifications" once added):
--   notif_users         — Email allowlist for /notifications page. Mirrored to a
--                         Cloudflare Access Group via the CF API so the actual
--                         auth gate is at the edge. Mirror exists so the admin
--                         page renders without an API roundtrip.
--   notif_channels      — One row per Discord webhook (or SMS phone) the user
--                         has registered. Owner_email FKs notif_users(email).
--   notif_rules         — 1:1 with channel. Holds threshold + cadence + burst
--                         window + off-hours-digest behavior. Kept in a
--                         separate table so we can extend without bloating
--                         notif_channels.
--   notif_schedules     — N per channel. Each row is one active window:
--                         day-of-week mask + hour range + optional date range +
--                         timezone. Multiple rows = union of windows (e.g.
--                         weekdays 7-19 + weekends 9-21).
--   notif_state         — 1:1 with channel. Mutable runtime state used by the
--                         cron dispatcher: watermark in kp_events, last-sent
--                         timestamps, burst-window start, SMS 12h cap clock,
--                         off-hours event buffer.
--   notif_deliveries    — Append-only audit log. Newest 100/channel rendered
--                         on /notifications/log for debugging missed alerts.

-- Email allowlist mirror. Source of truth in the CF Access Group; this table
-- exists so the admin UI can render the list without hitting the CF API every
-- pageview. Sync direction: D1 -> CF (writes flow through both).
CREATE TABLE IF NOT EXISTS notif_users (
  email          TEXT    PRIMARY KEY,
  role           TEXT    NOT NULL DEFAULT 'user',          -- 'user' | 'admin'
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at  TEXT
);

-- One row per registered destination (Discord webhook URL or SMS phone).
CREATE TABLE IF NOT EXISTS notif_channels (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_email  TEXT    NOT NULL REFERENCES notif_users(email) ON DELETE CASCADE,
  name         TEXT    NOT NULL,                           -- user-facing label
  kind         TEXT    NOT NULL,                           -- 'discord' | 'sms'
  target       TEXT    NOT NULL,                           -- webhook URL or E.164 phone
  mention      TEXT,                                       -- '<@&roleid>' / '<@userid>' for Discord
  enabled      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_channels_owner   ON notif_channels(owner_email);
CREATE INDEX IF NOT EXISTS idx_notif_channels_enabled ON notif_channels(enabled) WHERE enabled = 1;

-- 1:1 with channel. The 'rule' the dispatcher evaluates each tick.
CREATE TABLE IF NOT EXISTS notif_rules (
  channel_id                  INTEGER PRIMARY KEY REFERENCES notif_channels(id) ON DELETE CASCADE,
  threshold_kp                REAL    NOT NULL DEFAULT 4.0,    -- buffer/summary threshold
  immediate_threshold_kp      REAL    NOT NULL DEFAULT 6.0,    -- push-immediately threshold (G2+ default)
  summary_interval_min        INTEGER NOT NULL DEFAULT 60,     -- 15 | 30 | 60
  burst_window_max_hours      INTEGER NOT NULL DEFAULT 8,      -- cap on 15-min cadence after first event
  off_hours_digest_time       TEXT,                            -- 'HH:MM' UTC, null = none
  off_hours_digest_on_resume  INTEGER NOT NULL DEFAULT 0,      -- send buffered digest when schedule resumes
  storm_end_notify            INTEGER NOT NULL DEFAULT 1,      -- ping when active_mode returns to normal
  quiet_below_g1              INTEGER NOT NULL DEFAULT 0       -- suppress alerts unless storm_class != 'active'
);

-- N per channel. Multiple windows union together.
CREATE TABLE IF NOT EXISTS notif_schedules (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id        INTEGER NOT NULL REFERENCES notif_channels(id) ON DELETE CASCADE,
  days_mask         INTEGER NOT NULL DEFAULT 127,              -- bits Sun=1,Mon=2,Tue=4,Wed=8,Thu=16,Fri=32,Sat=64 (127 = all)
  hour_start        INTEGER NOT NULL DEFAULT 0,                -- 0-23
  hour_end          INTEGER NOT NULL DEFAULT 24,               -- 1-24 (24 = end of day)
  timezone          TEXT    NOT NULL DEFAULT 'UTC',            -- IANA tz, e.g. 'America/Denver'
  date_range_start  TEXT,                                      -- 'YYYY-MM-DD' inclusive, null = no lower bound
  date_range_end    TEXT,                                      -- 'YYYY-MM-DD' inclusive, null = no upper bound
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_schedules_channel ON notif_schedules(channel_id);

-- 1:1 with channel. Mutable dispatcher state.
CREATE TABLE IF NOT EXISTS notif_state (
  channel_id          INTEGER PRIMARY KEY REFERENCES notif_channels(id) ON DELETE CASCADE,
  last_event_id_sent  INTEGER NOT NULL DEFAULT 0,              -- watermark in kp_events.id
  last_immediate_at   TEXT,                                    -- ISO; rate-limit immediate pings
  last_summary_at     TEXT,                                    -- ISO; cadence anchor for summaries
  burst_started_at    TEXT,                                    -- ISO; 15-min cadence eligibility timer
  sms_last_sent_at    TEXT,                                    -- ISO; 12h SMS cap clock
  off_hours_buffer    TEXT    NOT NULL DEFAULT '[]'            -- JSON: [{event_id,ts,kp_value,storm_class}]
);

-- Append-only delivery audit log. Newest 100/channel shown on /notifications/log.
CREATE TABLE IF NOT EXISTS notif_deliveries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id       INTEGER NOT NULL,                           -- no FK so deletes preserve history
  channel_name     TEXT    NOT NULL,                           -- snapshot at send time
  kind             TEXT    NOT NULL,                           -- 'immediate'|'summary'|'off_hours_digest'|'storm_end'|'test'
  payload_summary  TEXT,                                       -- one-line human description
  ok               INTEGER NOT NULL DEFAULT 0,
  http_status      INTEGER,
  error            TEXT,
  sent_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_deliveries_channel_sent ON notif_deliveries(channel_id, sent_at DESC);

-- Seed first admin. Email matches Claude env userEmail; change/add via the
-- /notifications/admin/users page once provisioned.
INSERT OR IGNORE INTO notif_users (email, role) VALUES ('karathrace69@gmail.com', 'admin');
