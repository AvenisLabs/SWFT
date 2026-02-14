# GNSS Reliability & Space Weather — Pillar Article Map

**Internal documentation only — NOT for public display.**
Use for navigation architecture, breadcrumbs, and contextual linking decisions.

Last updated: 2026-02-15

---

## Core Strategy

The site uses a **hub-and-spoke topic cluster model** centered on GNSS reliability under space weather conditions.

Target search authority:
- GNSS accuracy degradation
- RTK reliability
- Survey errors
- Space weather impacts on GPS
- Drone mission planning

---

## LEVEL 1 — HOMEPAGE (Operational Dashboard)

**Route:** `/`
**Purpose:** Real-time situational awareness — minimal education, maximum operational value

### Primary Outbound Links
- `/gnss` — GNSS Risk Assessment (live Kp/risk widget)
- `/gnss-reliability` — Knowledge Hub landing page
- `/alerts` — Alerts / Advisories

---

## LEVEL 2 — CORE DECISION PAGE

### GNSS Risk Levels for Drone & Survey Operations
**Route:** `/gnss-reliability/gnss-risk-levels`
**Status:** LIVE
**Purpose:** Rapid go/no-go decision support
**Audience:** Drone pilots, survey crews, project managers

Links TO (implemented):
- `/gnss-reliability/ionospheric-delay` (ionospheric stability)
- `/gnss-reliability/rtk-float-drops` (RTK workflows affected first)
- `/gnss-reliability/glossary#scintillation` (scintillation term)

Links FROM:
- Homepage
- All operational articles (contextual)
- Knowledge Hub

---

## LEVEL 3 — KNOWLEDGE HUB

### GNSS Reliability & Space Weather Guide
**Route:** `/gnss-reliability`
**Status:** LIVE (v0.10.0)
**Purpose:** Central educational landing page — organizes all content

### Fundamentals Section (all LIVE)
| Article | Route | Status |
|---------|-------|--------|
| How Space Weather Affects GPS | `/gnss-reliability/how-space-weather-affects-gps` | LIVE |
| GNSS Risk Levels for Operations | `/gnss-reliability/gnss-risk-levels` | LIVE |
| Solar Flares vs Geomagnetic Storms | `/gnss-reliability/solar-flares-vs-storms` | LIVE |
| What Is Ionospheric Delay? | `/gnss-reliability/ionospheric-delay` | LIVE |
| GNSS Space Weather Glossary | `/gnss-reliability/glossary` | LIVE |

### Drone Operations Section
| Article | Route | Status |
|---------|-------|--------|
| When Should Drone Pilots Cancel Missions? | `/gnss-reliability/drone-mission-cancel` | LIVE |
| Why RTK Drops to FLOAT | `/gnss-reliability/rtk-float-drops` | LIVE |
| Why DJI, Emlid & Base Stations Struggle | `/gnss-reliability/dji-emlid-base-stations` | LIVE |

### Survey & Geodesy Section (all LIVE)
| Article | Route | Status |
|---------|-------|--------|
| How Space Weather Ruins GNSS Surveys | `/gnss-reliability/space-weather-gnss-survey` | LIVE |
| OPUS & PPP Failures Explained | `/gnss-reliability/opus-ppp-failures` | LIVE |

### Not Yet in Hub
| Article | Library File | Status |
|---------|-------------|--------|
| KP Index for Drone Pilots | `Library/KP Index for Drone Pilots.md` | UNPROCESSED |

---

## LEVEL 4 — PRIMARY PILLAR ARTICLES

### How Space Weather Affects GPS, RTK, and Survey Accuracy
**Route:** `/gnss-reliability/how-space-weather-affects-gps`
**Status:** LIVE
**Role:** Foundational overview article

Links TO (implemented):
- `/gnss-reliability/ionospheric-delay` (ionosphere link)
- `/gnss-reliability/rtk-float-drops` (FIX → FLOAT transitions)
- `/gnss-reliability/gnss-risk-levels` (monitoring takeaway)
- `/gnss-reliability/solar-flares-vs-storms` (section heading)
- `/gnss-reliability/glossary#scintillation` (scintillation term)
- `/gnss-reliability/glossary#cycle-slip` (cycle slips term)

---

### What Is Ionospheric Delay?
**Route:** `/gnss-reliability/ionospheric-delay`
**Status:** LIVE
**Role:** Core technical explanation

Links TO (implemented):
- `/gnss-reliability/rtk-float-drops` (RTK reliability)
- `/gnss-reliability/opus-ppp-failures` (PPP convergence delays)
- `/gnss-reliability/solar-flares-vs-storms` (solar flares/CMEs/storms)
- `/gnss-reliability/gnss-risk-levels` (monitoring takeaway)

---

### Solar Flares vs Geomagnetic Storms
**Route:** `/gnss-reliability/solar-flares-vs-storms`
**Status:** LIVE
**Role:** Clarifies commonly confused space weather events

Links TO (implemented):
- `/gnss-reliability/glossary#scintillation` (scintillation term)
- `/gnss-reliability/glossary#cycle-slip` (cycle slips term)
- `/gnss-reliability/rtk-float-drops` (RTK FIX instability)
- `/gnss-reliability/gnss-risk-levels` (Kp 5 reference)

---

### KP Index for Drone Pilots
**Route:** not yet created
**Status:** UNPROCESSED (Library file exists)
**Role:** Practical operational guidance

Planned links TO:
- `/gnss-reliability/gnss-risk-levels`
- `/gnss-reliability/rtk-float-drops`
- `/gnss-reliability/space-weather-gnss-survey`

---

## DRONE OPERATIONS CLUSTER

### Why Your RTK Drone Suddenly Drops to FLOAT
**Route:** `/gnss-reliability/rtk-float-drops`
**Status:** LIVE

Links TO (implemented):
- `/gnss-reliability/ionospheric-delay` (ionosphere link)
- `/gnss-reliability/gnss-risk-levels` (monitoring takeaway)
- `/gnss-reliability/glossary#scintillation` (scintillation term)

---

### Why DJI, Emlid & Base Stations Struggle
**Route:** `/gnss-reliability/dji-emlid-base-stations`
**Status:** LIVE

Links TO (implemented):
- `/gnss-reliability/gnss-risk-levels`
- `/gnss` (GNSS Risk Assessment)
- `/gnss-reliability/ionospheric-delay` (ionosphere link)
- `/gnss-reliability/rtk-float-drops` (FIX drops to FLOAT)
- `/gnss-reliability/glossary#scintillation` (scintillation term)

---

## SURVEY & GEODESY CLUSTER

### How Space Weather Can Ruin a GNSS Survey
**Route:** `/gnss-reliability/space-weather-gnss-survey`
**Status:** LIVE

Links TO (implemented):
- `/gnss-reliability/ionospheric-delay` (delays link)
- `/gnss-reliability/rtk-float-drops` (FIX → FLOAT transitions)
- `/gnss-reliability/gnss-risk-levels` (Kp ≥ 5 reference)
- `/gnss-reliability/glossary#cycle-slip` (cycle slips term)

---

### OPUS & PPP Failures Explained
**Route:** `/gnss-reliability/opus-ppp-failures`
**Status:** LIVE

Links TO (implemented):
- `/gnss-reliability/gnss-risk-levels`
- `/gnss` (GNSS Risk Assessment)
- `/gnss-reliability/ionospheric-delay` (ionosphere becomes irregular)
- `/gnss-reliability/glossary#scintillation` (scintillation reports)

---

## SUPPORTING CONTENT

### GNSS Space Weather Glossary
**Route:** `/gnss-reliability/glossary`
**Status:** LIVE

Links TO (implemented):
- `/gnss-reliability/rtk-float-drops` (drops from FIX to FLOAT)
- `/gnss-reliability/ionospheric-delay` (ionospheric delay deep dive)
- `/gnss-reliability/gnss-risk-levels` (GNSS reliability risk)

---

## INTERNAL LINKING STATUS

### Current State
**All 9 live articles have contextual in-body cross-links implemented** (completed 2026-02-14). Every article links to:
- The Core Risk Page (`/gnss-reliability/gnss-risk-levels`)
- At least one related pillar article
- The Glossary when technical terms first appear (via anchor links like `#scintillation`, `#cycle-slip`)

### Linking Rules
Every article SHOULD link to:

### Anchor Text Guidelines
Use descriptive anchor text:
- "GNSS risk levels"
- "KP index guidance for drone pilots"
- "ionospheric delay effects"
- "RTK FLOAT conditions"

Avoid generic phrases like "click here."

---

## WHY THIS STRUCTURE WORKS

- Builds strong topical authority
- Supports both operational and educational use cases
- Keeps homepage fast and uncluttered
- Enables scalable future expansion
- Signals expertise to search engines

---

## REMAINING WORK

### Content to Build
1. **KP Index for Drone Pilots** — Library file exists, needs processing and hub entry
2. **When Should Drone Pilots Cancel Missions?** — listed in hub as coming soon, no Library file yet

### Cross-Linking Pass
Completed 2026-02-14. All 9 live articles have contextual in-body cross-links.

---

## FUTURE EXPANSION OPTIONS

- Space weather alert archive
- Regional GNSS impact guides
- Aviation GNSS reliability
- Maritime navigation impacts
- Mission planning tools
- Case studies of real solar storms

---

**This document defines the internal knowledge architecture for the SWFT platform.**
