-- 0004_admin_links.sql — Admin link management and check history tables

-- Discovered external links with optional overrides
CREATE TABLE IF NOT EXISTS site_links (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    url         TEXT NOT NULL,
    link_text   TEXT NOT NULL DEFAULT '',
    page_path   TEXT NOT NULL,
    first_seen  TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen   TEXT NOT NULL DEFAULT (datetime('now')),
    last_status INTEGER,                          -- HTTP status from most recent check
    last_check  TEXT,                              -- ISO timestamp of most recent check
    override_url    TEXT,                          -- replacement URL (NULL = use original)
    override_text   TEXT,                          -- replacement link text (NULL = use original)
    action      TEXT NOT NULL DEFAULT 'default',   -- 'default' | 'unlink' | 'remove'
    UNIQUE(url, page_path)
);

-- Check run metadata
CREATE TABLE IF NOT EXISTS link_check_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    trigger_type    TEXT NOT NULL DEFAULT 'scheduled',  -- 'scheduled' | 'manual'
    total_links     INTEGER NOT NULL DEFAULT 0,
    healthy_count   INTEGER NOT NULL DEFAULT 0,
    broken_count    INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'running'     -- 'running' | 'completed' | 'error'
);

-- Per-URL results for each check run
CREATE TABLE IF NOT EXISTS link_check_results (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id          INTEGER NOT NULL REFERENCES link_check_runs(id),
    url             TEXT NOT NULL,
    ok              INTEGER NOT NULL DEFAULT 0,         -- 1 = healthy, 0 = broken
    status_code     INTEGER,
    status_text     TEXT,
    method          TEXT,
    response_time_ms INTEGER,
    found_on_pages  TEXT,                               -- JSON array of page paths
    checked_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_link_check_results_run ON link_check_results(run_id);
CREATE INDEX IF NOT EXISTS idx_site_links_action ON site_links(action) WHERE action != 'default';
