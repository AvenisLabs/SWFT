-- 0002_indexes.sql — Performance indexes for SWPC Web Platform v0.1.0

CREATE INDEX IF NOT EXISTS idx_kp_obs_ts ON kp_obs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_kp_forecast_time ON kp_forecast(forecast_time DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_raw_issue ON alerts_raw(issue_time DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_classified_type ON alerts_classified(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_classified_begins ON alerts_classified(begins DESC);

CREATE INDEX IF NOT EXISTS idx_solarwind_ts ON solarwind_summary(ts DESC);

CREATE INDEX IF NOT EXISTS idx_events_begins ON events(begins DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, severity);

CREATE INDEX IF NOT EXISTS idx_news_published ON site_news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON content_articles(slug);
