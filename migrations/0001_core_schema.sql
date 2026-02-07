-- 0001_core_schema.sql — Core tables for SWPC Web Platform v0.1.0

-- Observed Kp index values from NOAA SWPC
CREATE TABLE IF NOT EXISTS kp_obs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,                    -- ISO 8601 timestamp
    kp_value REAL NOT NULL,             -- Kp index (0.00 – 9.00)
    source TEXT NOT NULL DEFAULT 'swpc', -- data source identifier
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(ts, source)
);

-- Kp index forecasts
CREATE TABLE IF NOT EXISTS kp_forecast (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_time TEXT NOT NULL,         -- forecasted time window
    kp_value REAL NOT NULL,
    window TEXT,                         -- e.g. "00-03UT"
    source TEXT NOT NULL DEFAULT 'swpc',
    issued_at TEXT NOT NULL,             -- when the forecast was issued
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Raw alert messages from SWPC alerts.json
CREATE TABLE IF NOT EXISTS alerts_raw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_time TEXT NOT NULL,            -- issue_datetime from SWPC
    message TEXT NOT NULL,               -- full alert message text
    product_id TEXT,                     -- SWPC product_id
    raw_source TEXT,                     -- serialized original JSON
    content_hash TEXT NOT NULL,          -- SHA-256 for deduplication
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(content_hash)
);

-- Classified/parsed alerts derived from raw alerts
CREATE TABLE IF NOT EXISTS alerts_classified (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_alert_id INTEGER NOT NULL REFERENCES alerts_raw(id),
    event_type TEXT NOT NULL,            -- e.g. 'geomagnetic_storm', 'radio_blackout'
    severity TEXT NOT NULL,              -- 'minor', 'moderate', 'strong', 'severe', 'extreme'
    scale_type TEXT,                     -- 'G', 'S', 'R' (NOAA scale)
    scale_value INTEGER,                -- scale level (1-5)
    begins TEXT,                         -- event begin time
    ends TEXT,                           -- event end time
    summary TEXT,                        -- human-readable summary
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Downsampled solar wind observations (5-min intervals)
CREATE TABLE IF NOT EXISTS solarwind_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,                    -- ISO 8601 timestamp (5-min bucket)
    speed REAL,                          -- solar wind speed (km/s)
    density REAL,                        -- proton density (p/cc)
    bt REAL,                             -- total B field magnitude (nT)
    bz REAL,                             -- Bz GSM component (nT)
    temperature REAL,                    -- proton temperature (K)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(ts)
);

-- Detected space weather events (storms, flares, etc.)
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,            -- 'geomagnetic_storm', 'solar_flare', 'cme', etc.
    severity TEXT NOT NULL,
    begins TEXT NOT NULL,
    ends TEXT,
    peak_time TEXT,
    title TEXT NOT NULL,
    description TEXT,
    gnss_impact_level TEXT,             -- 'none', 'low', 'moderate', 'high', 'severe'
    gnss_advisory TEXT,                 -- operator guidance text
    metadata_json TEXT,                 -- additional data as JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Site news/headline items from SWPC
CREATE TABLE IF NOT EXISTS site_news_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    published_at TEXT,
    image_url TEXT,
    summary TEXT,
    content_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Static content articles (explainers, guides)
CREATE TABLE IF NOT EXISTS content_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    tags_json TEXT,                      -- JSON array of tag strings
    published_at TEXT,
    updated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tracks last-run times for cron tasks
CREATE TABLE IF NOT EXISTS cron_state (
    task_name TEXT PRIMARY KEY,
    last_run TEXT NOT NULL,
    last_status TEXT NOT NULL DEFAULT 'ok',
    rows_affected INTEGER DEFAULT 0,
    error_message TEXT
);
