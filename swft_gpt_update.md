# Claude Code Task — SWFT UI/UX + Time + Accessibility Overhaul (Phases 0–5)

Project: **SWFT (Space Weather Forecast & Tracking)**  
Stack: **SvelteKit (Svelte 5 runes) + Cloudflare Pages + D1 + CF Cache**  
Architecture + conventions are defined in CLAUDE.md — follow them exactly.  
API contracts, naming, and NOAA attribution rules must remain intact.

You are modifying an existing production site. Do not break ingestion, APIs, or D1 schema.

---

# GLOBAL ENGINEERING RULES

- Use **Svelte 5 runes** patterns (`$props`, `$derived`, `$state`, `$effect`) correctly.
- Reusable logic goes in:
  - `src/lib/utils/` → formatting & helpers
  - `src/lib/components/` → UI components
- Do NOT scatter timezone logic across pages.
- Do NOT change API shapes.
- Respect existing dark theme, just improve contrast and usability.

---

# PHASE 0 — Footer + Page Last-Edited Time + Accessibility Baseline

## 0A — Global Footer (ALL pages)

Add a footer to the global layout (root layout file) showing:

© {CURRENT_YEAR} SWFT SkyPixels — Last updated: YYYY-MM-DD HH:mm ET (EST/EDT)

### Requirements

- Must appear on every route.
- “Last updated” = **last git commit time of the page file**, rounded to the minute.
- Must display in **America/New_York** timezone.
- Must show **EST or EDT** correctly depending on date.
- Must not break Cloudflare Pages SSR.

### Implementation approach

Create a utility:

`src/lib/utils/lastEdited.ts`

Responsibilities:
- Read build-time injected metadata OR fallback to build timestamp
- Convert to America/New_York
- Format `YYYY-MM-DD HH:mm ET`
- Detect DST to show EST/EDT

If per-page git metadata is not available in this environment:
- Use build timestamp and document limitation in a comment.

---

## 0B — Accessibility & Contrast Upgrade

Improve contrast site-wide:

- Body text must be high contrast (near white on dark)
- Card backgrounds slightly darker for separation
- Ensure:
  - All icon buttons have `aria-label`
  - Focus states visible
  - Headings use correct hierarchy
  - Tooltips keyboard accessible

Update `app.css` or theme tokens — do not inline styles everywhere.

---

# PHASE 1 — KP Chart + Timezone System

## 1A — Make KP chart 3–4x larger

Home page chart (`KP INDEX — LAST 24 HOURS`) must:

- Be visually dominant
- Use responsive container
- Not distort chart aspect ratio
- Labels readable

Modify chart container, not API.

---

## 1B — Universal Time Display System

Create:

`src/lib/utils/timeFormat.ts`

Functions:

- `formatLocal(dt)`
  - User’s browser timezone
  - 24-hour format
  - Timezone abbreviation
  - Fallback: UTC

- `formatUTC(dt)`
  - Always UTC

- `formatDual(dt)`
  - `UTC (Local: …)`

### Apply everywhere:
- Alerts page timestamps
- Events page
- Dashboard Kp timestamp
- GNSS page
- Popovers

Never manually format dates inside components again.

---

# PHASE 2 — Card Linking + Help Popovers

## 2A — Clickable homepage cards

Cards must link:

| Card | Route |
|------|------|
| Active Alerts | `/alerts` |
| GNSS Risk | `/gnss` |
| KP Index | `/gnss` (KP context lives there) |

Whole card clickable and keyboard accessible.

---

## 2B — Help Popovers

Add reusable component:

`src/lib/components/HelpPopover.svelte`

Used on:
- All homepage cards
- GNSS sections
- Alerts page sections

Must:
- Be keyboard accessible
- Have `aria-describedby`
- Close on ESC or outside click

---

# PHASE 3 — GNSS Risk Bar (Homepage)

Under GNSS Risk on home:

Add a horizontal **risk bar** (0–100 scale).

- Left = low risk
- Right = high risk
- Marker showing current value
- `?` help icon explains:
  - What GNSS risk means
  - How it’s calculated
  - Factor weights (Kp, Bz, Wind, R-scale)

Must pull value from existing GNSS API logic, not recompute.

---

# PHASE 4 — Events + Alerts Major Improvements

## 4A — Events Page

Problems:
- Ancient events mixed with recent
- Confusing time language

Fix:
- Group by date with headers
- Separate **Recent Events** and **Historical Archive**
- If solar wind normalized, show badge:
  - “Solar wind back to nominal”

---

## 4B — Alerts Page Overhaul

Must implement:

- Categories (Geomagnetic, Radio Blackout, Solar Radiation, GNSS, Other)
- Search input
- Pagination
- Filters (severity, category, time window)
- “Active only” toggle

Do not infinite scroll.

---

# PHASE 5 — GNSS Page UI Rework

Reorganize page into sections:

1. Current GNSS Risk
2. Drivers (Kp, Bz, Wind, R-scale)
3. Operational Impact
4. Operator Guidance
5. Methodology

Add help popovers where needed.

---

# DELIVERABLES

After implementation provide:

1. **Changelog grouped by phase**
2. **Verification checklist**
   - Footer appears
   - Timezones correct
   - KP chart large
   - Alerts search/filter/pagination works
   - Accessibility checks

---

# CRITICAL: DO NOT BREAK

- NOAA ingestion
- `/api/v1/*` responses
- D1 schema
- Svelte 5 rune patterns

If a requirement cannot be fully implemented, document:
- Why
- Best alternative used

