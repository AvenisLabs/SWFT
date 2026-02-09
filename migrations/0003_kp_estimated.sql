-- 0003_kp_estimated.sql — 15-minute downsampled estimated Kp from 1-min NOAA data

CREATE TABLE IF NOT EXISTS kp_estimated (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,              -- 15-min bucket start (ISO 8601 UTC)
    kp_value REAL NOT NULL,       -- Average estimated Kp for the bucket
    sample_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(ts)
);

CREATE INDEX IF NOT EXISTS idx_kp_estimated_ts ON kp_estimated(ts DESC);
