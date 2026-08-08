# SWPC-Web Summary Log

## 2026-02-23 14:13 — Audit and improve CLAUDE.md

Comprehensive audit of CLAUDE.md against actual codebase. Key corrections:
- Migration count: 4 → 5 (added 0005_kp_estimated_source.sql)
- Table count: 12 → 13 (was undercounting)
- Added missing `src/lib/server/` modules (kp.ts, kp-sources.ts, alerts.ts, events.ts, charts.ts, panels.ts, solarwind.ts, links.ts)
- Added missing cron worker lib files (discord.ts, link-crawler.ts, link-checker.ts)
- Added undocumented `/ingest-kp` HTTP endpoint on cron worker
- Added `/data-sources` page and `/admin/` section (4 admin pages) to key directories
- Added complete API endpoint listing (public + admin)
- Fixed D1 source column values: `kp_obs` defaults to `'swpc'`, `kp_estimated` defaults to `'noaa'`
- Added platform binding `BOM_API_KEY` to app.d.ts description
- Documented client-side refresh intervals (layout=2min, homepage=3min, stale ticker=30s)
- Documented storm banner system (G2/G3/G4 tiers with 30-min hysteresis)
- Noted display vs. ingest source priority discrepancy (kp-sources.ts labels Boulder as "Primary" for reliability, but ingest code tries NOAA Estimated first)
- Noted `formatters.ts` deprecation in favor of `timeFormat.ts`
- Added 0005 migration to schema section

## 2026-02-23 14:42 — Comprehensive README.md rewrite

Replaced the stale README.md (from 2026-02-09) with a comprehensive version covering the full current state of the project. Key changes from the old README:
- Fixed live site URL: swft-web.pages.dev → swft.skypixels.org
- Fixed GNSS risk weights: was 35%/20%/20%/25%, now correct 40%/25%/20%/15%
- Fixed database table count: 9 → 13 (5 migrations)
- Added complete 5-source Kp fallback chain documentation with priority table
- Added Knowledge Hub section (10 articles across 3 audiences)
- Added admin tools section (4 admin pages)
- Added data-sources page documentation
- Expanded API reference from 12 to 22 endpoints (including admin endpoints with cache TTLs)
- Added detailed project history section with dates and key technical decisions (CLS fix, D1 datetime bug, anomalous-zero detection)
- Added environment variables table with secrets management note
- Added client-side refresh interval table (layout=2min, homepage=3min, staleness=30s)
- Updated architecture diagram to show all 5 data sources
- Updated roadmap to reflect completed vs. planned work
- Added GFZ Potsdam and Australian BoM to data attribution
