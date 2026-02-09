# SWPC-Web Summary Log

## 2026-02-09 12:00 — Created CLAUDE.md

Created `CLAUDE.md` project-level instructions file for Claude Code. Analyzed the full codebase architecture including:
- SvelteKit Pages app + Cron Worker dual-deployment structure
- Build/dev/test commands
- API envelope pattern, caching, D1 helpers
- Svelte 5 runes conventions
- NOAA naming conventions and data quirks
- Key directory layout and path aliases

Rotated previous summarylog.md to `summarylog_2026-02-06.md`.

---

## 2026-02-09 15:45 — Created README.md

Created full project `README.md` covering:
- Feature overview: dashboard, GNSS risk model (4-factor weighted composite), alerts, panels
- All 5 frontend pages with route table
- All 13 API endpoints with descriptions and response envelope format
- Tech stack table (SvelteKit, Svelte 5, CF Pages, D1, Workers, Vitest)
- Architecture diagram showing Cron Worker → D1 → SvelteKit → clients data flow
- Data sources (NOAA SWPC endpoints)
- Database schema (9 tables) with purpose descriptions
- Development setup: prerequisites, install, local dev, testing, type checking, build, deploy
- Project directory structure
- Roadmap (Phase 1 complete, Phase 2–3 planned)
- NOAA data attribution

---

## 2026-02-09 16:01 — Committed & Pushed All Pending Changes

Committed and pushed `ecbd19b` to `origin/master` with 6 files: CLAUDE.md, README.md, summarylog.md, summarylog_2026-02-06.md, swft_gpt_update.md, website update.md.

---

## 2026-02-09 16:47 — UI/UX Overhaul (Phases 0–5)

Implemented full UI/UX overhaul across 6 phases:

**Phase 0 — Footer + Accessibility:**
- Created `src/lib/utils/buildInfo.ts` — Vite-injected `__BUILD_TIME__` with America/New_York formatting
- Updated `vite.config.ts` with `define: { __BUILD_TIME__ }`
- Merged footer: copyright + last updated + NOAA attribution + version on two lines
- Improved contrast: `--text-secondary` → `#9eaab6`, `--text-muted` → `#7d8590`
- Added `:focus-visible`, `::selection`, `.sr-only` global styles
- Added `aria-label` to AlertCard toggle button, `aria-live` to AnimationPlayer frame counter

**Phase 1 — Kp Chart + Time System:**
- Enlarged KpChart: BAR_HEIGHT 120→220, BAR_WIDTH 28→40, MAX_BARS 16→24, larger fonts
- Removed fixed SVG height — responsive via viewBox + width="100%"
- Created `src/lib/utils/timeFormat.ts` — `formatLocal()`, `formatUTC()`, `formatDual()`, `formatDateHeader()`, `dateKey()`
- Replaced all `formatTimestamp()` usage with new time functions across AlertCard, KpDisplay, events page, events detail page
- Events detail page uses `formatDual()` for UTC + local display
- Deprecated `formatTimestamp()` in formatters.ts

**Phase 2 — Card Linking + Help + Alert Preview:**
- Created `src/lib/components/HelpPopover.svelte` — accessible `?` popover with keyboard support, click-outside close
- Updated `Card.svelte` to support `href` prop (clickable card) and `headerExtra` snippet slot
- Homepage cards now link: Kp → /gnss, GNSS Risk → /gnss, Active Alerts → /alerts
- Added help popovers to all 3 homepage cards with descriptive text
- Improved alert preview: 3 items max, severity badge with scale type, event type label, truncated summary, separators

**Phase 3 — GNSS Risk Bar:**
- Added horizontal risk bar to homepage GNSS Risk card: colored fill, marker, 0-100 scale labels
- Animated transitions on fill width and marker position

**Phase 4 — Events + Alerts Improvements:**
- Events page: grouped by date using `formatDateHeader()` with styled date section headers
- Alerts page: complete overhaul with category filter chips (7 types), severity filter chips (4 levels), search input, active-only toggle, client-side pagination (15/page), results count display
- Alert classifier fix in cron worker: Electron/2MeV/integral flux/energetic → solar_radiation; magnetometer/sudden impulse/SSC → geomagnetic_storm; HSS → solar_wind

**Phase 5 — GNSS Page Rework:**
- Reorganized into 5 sections: Current Risk (with risk bar + timestamp), Risk Drivers (2-col grid with mini-cards + help popovers), Operational Impact (RTK/PPP/Static/Drone guidance), Operator Guidance (highlighted current level), Methodology (collapsible)

**Files modified:** 15 (3 new, 12 modified)
**Tests:** 46/46 passing | **Build:** successful, zero warnings

---

## 2026-02-09 17:16 — Cloudflare Deployment & Project Rename

- Deployed cron worker `swft-cron-ingest` to Cloudflare (alert classifier fix live)
- Deleted old `swpc-web` Pages project (custom domains removed first)
- Confirmed old `swpc-cron-ingest` worker already deleted
- Created new `swft-web` Pages project with `--production-branch master`
- Deployed Pages app to `https://swft-web.pages.dev`
- Updated `wrangler.toml` project name from `swpc-web` → `swft-web`
- Custom domains (`swft.skypixels.org`, `swf.skypixels.org`) need manual re-add in CF dashboard
