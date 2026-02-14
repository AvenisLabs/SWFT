# 🚫 When Should Drone Pilots Cancel Missions?  
## KP Thresholds, Risk Indicators, and Go/No-Go Decision Criteria

**INSTRUCTIONS FOR CLAUDE CODE (READ FIRST):**  
- Verify all links, make sure links are relevant to the content. 
- Validate all analogies to make sure they make sense, if the dont then propose 3-5 alternatives that I will select one. 
- Verify all claims if any are not accurate, purpose alternative, validate your alternatives with hard references and links to references.
- Build content on website for this.

This is a practical operational guidance article.  
- Preserve the decision framework and tables.  
- Maintain professional tone for commercial drone pilots and mapping crews.  
- Keep analogies — they aid comprehension without reducing technical accuracy.  
- Keep all external references intact and clickable.  
- Optimize formatting only.

---

## 🛰️ Overview

Most drone pilots carefully check wind, precipitation, airspace, and battery status before flight — but space weather can be just as critical for missions that rely on GPS or RTK positioning.

Solar activity can degrade GNSS accuracy, disrupt RTK corrections, and compromise mapping results. In severe cases, missions may need to be postponed to avoid costly rework or unusable data.

This guide provides practical thresholds and indicators for determining when to proceed and when to cancel.

📖 Reference:  
NOAA Space Weather Prediction Center — GPS Systems Impacts  
https://www.swpc.noaa.gov/impacts/gps-systems  

📖 Reference:
FAA — GNSS Interference Resource Guide
https://www.faa.gov/about/office_org/headquarters_offices/avs/offices/afx/afs/afs400/afs410/GNSS

**Analogy:**  
Ignoring space weather is like flying in strong winds that aren’t visible — the drone may stay airborne, but precision tasks can fail.

---

## 📊 Key Indicators to Check Before Flight

### ✔ KP Index (Geomagnetic Activity)

The KP index is the fastest way to gauge global GNSS risk.

📖 Reference:  
NOAA — Planetary K Index  
https://www.swpc.noaa.gov/products/planetary-k-index  

---

### ✔ Solar Radiation Storms (S-scale)

Proton events ionize the polar atmosphere, indirectly degrading GNSS signal quality through the ionosphere. Satellite hardware in orbit can also be affected.

📖 Reference:  
NOAA Space Weather Scales  
https://www.swpc.noaa.gov/noaa-scales-explanation  

---

### ✔ Ionospheric Disturbance / Scintillation

Rapid signal fluctuations can cause RTK instability and loss of lock.

📖 Reference:  
NOAA — Ionospheric Scintillation  
https://www.swpc.noaa.gov/phenomena/ionospheric-scintillation  

---

### ✔ RTK Performance Indicators

Real-time field observations matter:

- Frequent FIX → FLOAT transitions  
- Long initialization times  
- Large accuracy fluctuations  
- Satellite count instability  

---

## 🚁 KP Thresholds for Drone Operations

| KP | Activity Level | NOAA Scale | Operational Guidance |
|----|----------------|------------|----------------------|
| 0–2 | Quiet | Below G-scale | Generally safe for precision missions |
| 3 | Unsettled | Below G-scale | Monitor conditions; usually reliable |
| 4 | Active | Below G-scale | Caution — RTK issues possible, especially at high latitudes |
| 5 | Minor storm | G1 | Postpone survey-grade work; use GCPs if flying |
| 6+ | Moderate–Extreme | G2–G5 | Cancel or postpone all precision missions |

📖 Reference:  
NOAA Geomagnetic Storm Scale  
https://www.swpc.noaa.gov/phenomena/geomagnetic-storms  

**Analogy:**  
KP is like a wind forecast for the invisible environment your navigation system depends on.

---

## ⚠️ When You SHOULD Cancel a Mission

### 🔴 KP ≥ 6 (Moderate Storm or Higher)

- RTK likely unstable
- Position accuracy unreliable
- Mapping outputs may be unusable

---

### 🔴 Persistent RTK FLOAT Conditions

If FIX cannot be maintained consistently, precision georeferencing is compromised.

---

### 🔴 Severe Scintillation Reports

Particularly at low and high latitudes, signal tracking may fail repeatedly.

---

### 🔴 Mission Requires Survey-Grade Accuracy

Examples:

- Engineering surveys  
- Corridor mapping  
- Construction measurement  
- Legal boundary work  

In these cases, even moderate degradation may be unacceptable.

---

## ⚠️ When to Consider Postponement (Not Mandatory Cancellation)

### 🟠 KP = 4–5

Operations may still be possible with precautions:

- Use ground control points (GCPs)
- Expect reinitializations
- Plan additional validation
- Postpone survey-grade work at Kp 5

---

### 🟠 Long RTK Initialization Times

If achieving FIX takes significantly longer than normal, conditions may be unstable.

---

### 🟠 High Solar Activity Alerts

Even before geomagnetic storms arrive, conditions can degrade.

---

## 🟢 When It Is Generally Safe to Fly

### ✔ KP ≤ 3

- Generally stable ionosphere
- Reliable RTK performance in most conditions
- Normal accuracy expectations

Note: Equatorial scintillation, traveling ionospheric disturbances, and solar radio bursts can occasionally degrade GNSS performance independently of Kp. Always verify RTK status in the field.

---

### ✔ Non-Precision Missions

Examples:

- Visual inspections  
- Search and rescue  
- Media capture  
- Situational awareness flights  

These rely less on centimeter-level positioning.

---

## 📏 Special Considerations for Mapping Missions

Mapping projects amplify small positioning errors across entire datasets.

Potential consequences:

- Misaligned orthomosaics  
- Elevation errors in models  
- GCP mismatches  
- Reprocessing requirements  

📖 Reference:
EarthScope Consortium — GNSS Resources
https://www.earthscope.org

**Analogy:**  
A small navigation error repeated across hundreds of images becomes a large mapping error.

---

## 🧠 Decision Framework: Go / Mitigate / No-Go

### 🟢 GO

- KP ≤ 3
- Stable RTK performance
- No major solar alerts

---

### 🟠 GO WITH MITIGATION

- KP 4–5
- Intermittent instability
- Use GCPs and plan redundant flights
- Validate results carefully
- At Kp 5, postpone survey-grade work

---

### 🔴 NO-GO

- KP ≥ 6
- Severe scintillation
- Persistent FLOAT conditions
- Mission requires survey-grade accuracy

---

## 🌞 Why Waiting Often Works

Geomagnetic storms are temporary. Conditions frequently improve within hours to days.

Rescheduling may save:

- Field time  
- Processing effort  
- Data quality issues  
- Project delays  

**Analogy:**  
Postponing for better conditions is like waiting for clouds to clear before aerial photography — the result is dramatically better.

---

## 🔭 Additional Monitoring Resources

- NOAA Space Weather Prediction Center: https://www.swpc.noaa.gov  
- ESA Space Weather Portal: https://swe.ssa.esa.int  
- International GNSS Service: https://igs.org  
- NASA Space Weather Overview: https://science.nasa.gov/heliophysics/space-weather  

---

## 🧭 Key Takeaways

- Space weather can silently compromise mission accuracy  
- KP index is a practical first check  
- RTK instability is a critical warning sign  
- Precision mapping projects are most sensitive  
- Canceling early may prevent costly rework  

**Bottom line:**  
If your mission depends on precise positioning, space weather should be part of your go/no-go checklist.

---

**This page is part of the GNSS Reliability & Space Weather Guide.**
