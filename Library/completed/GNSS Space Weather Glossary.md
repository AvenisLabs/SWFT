# 📘 GNSS Space Weather Glossary

**INSTRUCTIONS FOR CLAUDE CODE (READ FIRST):**
- Verify all links, make sure links are relevant to the content. 
- Validate all analogies to make sure they make sense, if the dont then propose 3-5 alternatives that I will select one. 
- Verify all claims if any are not accurate, purpose alternative, validate your alternatives with hard references and links to references.
- Build content on website for this.

This is a permanent reference glossary page.  
- Preserve all definitions and analogies.  
- Maintain professional tone suitable for pilots, surveyors, and engineers.  
- Do NOT simplify by removing technical accuracy.  
- This page should be easy to understand without prior physics background.  
- Optimize formatting only.

---

## 🛰️ Overview

Space weather introduces specialized terminology that can be confusing even for experienced GNSS users. This glossary explains key concepts in clear, practical language while preserving technical accuracy.

These terms describe the primary ways solar activity affects GPS, RTK, and survey operations.

---

## ⚡ Scintillation

**Technical Definition:**  
Ionospheric scintillation is the rapid fluctuation of radio signal amplitude and phase caused by small-scale irregularities in the ionosphere.

📖 Reference:  
NOAA SWPC — Ionospheric Scintillation  
https://www.swpc.noaa.gov/phenomena/ionospheric-scintillation

**What It Means in Practice:**  
The signal strength from satellites rapidly rises and falls, and phase tracking becomes unstable. Receivers may lose lock or produce noisy measurements.

**Why It Matters:**  
Scintillation is one of the main causes of RTK instability and sudden drops from FIX to FLOAT.

**Analogy:**  
Like watching a distant light flicker through heat waves or turbulent air — sometimes bright and clear, sometimes dim or distorted.

---

## 🌍 Ionospheric Delay

**Technical Definition:**  
A delay in GNSS signal propagation caused by interaction with charged particles in the ionosphere. The amount of delay depends on electron density and signal frequency.

📖 Reference:  
ESA Navipedia — Ionospheric Delay  
https://gssc.esa.int/navipedia/index.php/Ionospheric_Delay

**What It Means in Practice:**  
Signals take slightly longer to reach the receiver, making satellites appear farther away than they really are. This introduces positioning error.

Dual-frequency GNSS systems can correct most of this delay, but disturbances during solar activity can exceed correction capabilities.

**Why It Matters:**  
Even small timing errors translate into significant position errors at the centimeter or meter scale.

**Analogy:**  
Like sound traveling slower through dense fog than through clear air — the signal still arrives, just later than expected.

---

## 🔄 Cycle Slip

**Technical Definition:**  
A discontinuity in carrier-phase measurements caused by temporary loss of signal lock, resulting in an unknown integer number of cycles being added or lost.

📖 Reference:
ESA Navipedia — Carrier Phase Cycle-Slip Detection
https://gssc.esa.int/navipedia/index.php/Carrier_Phase_Cycle-Slip_Detection

**What It Means in Practice:**  
The receiver loses track of the exact phase of the satellite signal and must reinitialize to regain high-precision accuracy.

**Why It Matters:**  
Cycle slips break RTK FIX solutions and increase survey processing errors.

**Analogy:**  
Like losing count while counting steps in the dark — once you lose track, you must start over.

---

## 📡 TEC (Total Electron Content)

**Technical Definition:**  
Total Electron Content measures the number of free electrons along the path between a satellite and receiver, typically expressed in TEC Units (TECU).

📖 Reference:  
NOAA SWPC — Ionospheric TEC  
https://www.swpc.noaa.gov/phenomena/total-electron-content

**What It Means in Practice:**  
Higher TEC indicates more charged particles in the ionosphere, which generally means greater signal delay and increased likelihood of disturbances.

Rapid TEC changes are especially problematic for GNSS accuracy.

**Why It Matters:**  
TEC is a key indicator of ionospheric conditions affecting positioning performance.

**Analogy:**  
Think of TEC as the “thickness” of the charged particle layer the signal must travel through — like driving through fog of varying density.

---

## 📊 KP Index (Planetary K Index)

**Technical Definition:**  
A global index measuring geomagnetic activity on a scale from 0 to 9, derived from magnetometer observations worldwide.

📖 Reference:  
NOAA SWPC — Planetary K Index  
https://www.swpc.noaa.gov/products/planetary-k-index

**What It Means in Practice:**  
Higher KP values indicate stronger geomagnetic disturbances, which typically correlate with increased ionospheric instability.

KP ≥ 5 indicates geomagnetic storm conditions.

**Why It Matters:**  
The KP index provides a quick, widely used indicator of GNSS reliability risk.

**Analogy:**  
Like a weather severity scale for the invisible magnetic environment around Earth — calm at low values, stormy at high values.

---

## 🧠 How These Terms Connect

These concepts describe different aspects of the same underlying problem: disturbances in the ionosphere affecting GNSS signal propagation.

- TEC describes how much charged material is present  
- Ionospheric delay describes the timing error caused  
- Scintillation describes rapid fluctuations  
- Cycle slips describe receiver tracking failures  
- KP indicates overall geomagnetic activity driving these effects  

**Analogy:**  
If GNSS signals were cars traveling on a highway:

- TEC is traffic density  
- Ionospheric delay is slower travel time  
- Scintillation is erratic stop-and-go movement  
- Cycle slips are cars that exit and re-enter with a scrambled odometer  
- KP is the overall traffic severity warning

---

## 🔭 Additional Authoritative Sources

- NOAA Space Weather Prediction Center: https://www.swpc.noaa.gov  
- ESA Space Weather Portal: https://swe.ssa.esa.int  
- International GNSS Service: https://igs.org  
- EarthScope Consortium: https://www.earthscope.org  

---

**This glossary is part of the GNSS Reliability & Space Weather Guide.**
