# 🛰️ SWFT Site Structural Upgrade — Knowledge Hub Integration (No Content Bloat)

You are working on the SWFT (Space Weather Forecast & Tracking) site.

This task is **site architecture only**, not full article writing.

Your goals are:

1. Preserve current performance, accessibility, and best-practices scores (100/100/100 target)
2. Keep the homepage clean and dashboard-like
3. Add a scalable content structure for GNSS education
4. Use placeholder content only (we will write real articles later)

---

## 🚨 CRITICAL RULES

- DO NOT add large images, heavy components, or JS libraries
- DO NOT add blog-style feeds or post grids
- DO NOT fetch remote assets
- DO NOT modify charts or live data components
- Keep all new sections lightweight HTML/CSS
- Follow existing design system and color scheme
- Maintain accessibility contrast standards

---

## 🏠 HOMEPAGE CHANGES

The homepage must remain a **GNSS risk dashboard**, not a blog.

### Add a new section BELOW the live GNSS charts:

Section Title:
**"Understanding GNSS Reliability"**

This section should contain **3 lightweight article cards only** (not a list, not a feed).

Each card includes:

- Simple icon (SVG or existing icon set)
- Article title (placeholder)
- 1-sentence summary (placeholder text)
- Link button: **"Learn more →"**

### Create these 3 placeholder cards:

1. **How Space Weather Affects GPS, RTK, and Survey Accuracy**
   - Summary: "Overview of how solar activity impacts GNSS positioning and RTK performance."

2. **KP Index for Drone Pilots: What Number Is Too High?**
   - Summary: "Understanding KP values and operational risk for drone mapping missions."

3. **Why RTK Drones Drop from FIX to FLOAT**
   - Summary: "Common causes of RTK instability and the role of ionospheric disturbances."

Each card should link to:

/gnss-reliability

NOT to individual articles yet.

---

## 📘 CREATE NEW PAGE: GNSS RELIABILITY HUB

Create a new route/page:

/gnss-reliability

This page is a **Knowledge Hub landing page**, not a full article.

### Page Title:
**GNSS Reliability & Space Weather Guide**

### Intro Paragraph (placeholder):
Explain this page is a central resource for understanding how space weather affects GPS, GNSS, RTK, drone operations, and surveying accuracy.

---

### Add 3 Section Blocks (with placeholder links)

#### 🛰️ GNSS & Space Weather Basics
- How Space Weather Affects GPS (placeholder link)
- Solar Flares vs Geomagnetic Storms (placeholder link)
- What Is Ionospheric Delay? (placeholder link)

#### 🚁 For Drone Pilots
- When Should Drone Pilots Cancel Missions? (placeholder link)
- Why RTK Drops to FLOAT (placeholder link)

#### 📏 For Surveyors
- How Space Weather Ruins GNSS Surveys (placeholder link)
- OPUS & PPP Failures Explained (placeholder link)

Each item should link to:

#

These are placeholders only.

---

## 🧱 SITE STRUCTURE UPDATE

Ensure navigation or footer includes a link to:

**GNSS Reliability Guide** → /gnss-reliability

Do not make it visually dominant — keep dashboard focus on homepage.

---

## 🎯 DESIGN GOAL

The homepage should feel like:

A real-time GNSS operational intelligence dashboard

NOT:

A blog or news site

The Knowledge Hub should feel like:

A structured technical reference library

---

## ✅ FINAL CHECKS

Before finishing:

- Verify Lighthouse performance is unaffected
- No large DOM increases
- No blocking scripts added
- No accessibility contrast regressions
- Layout remains clean and professional

---

## 📦 OUTPUT REQUIREMENTS

Output only the code changes required to implement this structure.
Do not write article content.
Do not explain your reasoning.
