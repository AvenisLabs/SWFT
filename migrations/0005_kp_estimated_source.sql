-- 0005_kp_estimated_source.sql — Add source column to track data origin for fallback chain

ALTER TABLE kp_estimated ADD COLUMN source TEXT NOT NULL DEFAULT 'noaa';
