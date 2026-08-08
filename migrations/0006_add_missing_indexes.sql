-- 0006_add_missing_indexes.sql v0.1.0 — Add FK index on alerts_classified.raw_alert_id
-- Rationale (from 2026-03-15 D1 postmortem): alerts_raw JOIN alerts_classified ON
-- c.raw_alert_id = r.id had no supporting index on the FK column, so every join
-- forced a full scan of alerts_classified. With 90-day retention the scan grows
-- linearly. This index makes the join a single B-tree lookup per joined row.

CREATE INDEX IF NOT EXISTS idx_alerts_classified_raw_alert_id
  ON alerts_classified(raw_alert_id);
