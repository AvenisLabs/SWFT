# 🚁 Why Your RTK Drone Suddenly Drops to FLOAT (Space Weather Explained)

**INSTRUCTIONS FOR CLAUDE CODE (READ FIRST):**  
This is a finished evergreen technical article.  
- Preserve both technical explanations and analogies.  
- Do NOT simplify by removing analogies — they are intentional.  
- Maintain professional tone for drone pilots, surveyors, and GNSS users.  
- Keep all external references intact.  
- Optimize formatting only.

---

## 📍 Overview

RTK drones rely on extremely precise satellite signal tracking to maintain a FIX solution. When conditions are ideal, centimeter-level accuracy is possible. But during periods of space weather activity, RTK systems can suddenly lose FIX and fall back to FLOAT.

This transition is not usually caused by your drone, base station, or radio link — it is often caused by disturbances in the ionosphere affecting GNSS signals.

**Analogy:**  
Think of RTK FIX like having a crystal-clear phone call. FLOAT is like when the connection gets noisy — you can still talk, but clarity drops.

---

## 🛰️ What “FIX” Actually Means

A FIX solution means the receiver has resolved the integer ambiguities in the carrier-phase measurements from satellites. This allows precise positioning.

To maintain FIX, the receiver must continuously track the phase of signals from multiple satellites without interruption.

📖 Reference:  
RTK Fundamentals – NOAA CORS Program  
https://geodesy.noaa.gov/CORS/

**Analogy:**  
FIX is like solving a complex lock combination. Once solved, everything works smoothly. But if someone jiggles the lock, you have to start over.

---

## 🌍 The Ionosphere’s Role

GNSS signals pass through the ionosphere, a region filled with charged particles. During solar activity, this layer becomes unstable.

The disturbances cause:

- Rapid changes in signal delay  
- Signal fading (scintillation)  
- Phase shifts that confuse the receiver  

📖 Reference:  
NOAA SWPC – Ionospheric Scintillation  
https://www.swpc.noaa.gov/phenomena/ionospheric-scintillation

**Analogy:**  
It’s like trying to see a road clearly through a windshield while driving through heat shimmer — the road is still there, but it wobbles and blurs.

---

## ⚡ Why RTK Is So Sensitive

RTK relies on measuring the *phase* of signals, not just the code. Phase tracking requires very stable conditions.

When ionospheric irregularities cause rapid phase changes, the receiver can no longer maintain integer ambiguity resolution.

This forces a drop from FIX → FLOAT.

📖 Reference:  
ESA GNSS Science Support – Ionospheric Effects  
https://gssc.esa.int/navipedia/index.php/Ionospheric_Delay

**Analogy:**  
RTK is like balancing a tightrope walker. A small breeze is manageable. Strong gusts (space weather) make balance impossible.

---

## 📉 What Happens During a Drop to FLOAT

When FIX is lost:

- Position accuracy degrades from centimeters to decimeters or worse  
- Survey-grade consistency is lost  
- Mapping datasets may contain distortions  
- RTK reinitialization is required  

📖 Reference:  
UNAVCO GNSS Resources  
https://www.unavco.org/instrumentation/geodetic-gnss

**Analogy:**  
FLOAT is like using cruise control that occasionally drifts. You’re still moving forward, but precision is gone.

---

## 🔄 Why It Happens Even with a Nearby Base

Many operators assume short baseline distance prevents problems. However, ionospheric disturbances can vary rapidly even over short distances, and RTK correction models assume smooth ionospheric behavior.

During geomagnetic storms, this assumption fails.

📖 Reference:  
International GNSS Service Space Weather Working Group  
https://igs.org/wg/space-weather/

**Analogy:**  
It’s like two boats anchored close together in rough waves. They still move unpredictably, even though they’re near each other.

---

## 🌞 Solar Activity Triggers

RTK drops are more likely during:

| Event | Effect |
|------|--------|
| Solar flares | Sudden ionization increase |
| Geomagnetic storms | Large-scale ionospheric instability |
| High KP index | Increased positioning risk |

📖 Reference:  
NOAA SWPC Space Weather Scales  
https://www.swpc.noaa.gov/noaa-scales-explanation

**Analogy:**  
These events are like sudden weather fronts moving through the atmosphere — but invisible and affecting radio waves instead of airplanes.

---

## 🚁 Practical Impact for Drone Pilots

When RTK drops to FLOAT during a mission:

- Flight control remains stable  
- Position tagging accuracy decreases  
- Post-processing corrections increase  
- GCPs may be required  

Monitoring space weather helps anticipate these events.

**Analogy:**  
It’s like shooting photos with a camera that occasionally loses focus. The pictures are usable, but extra work is needed to fix them.

---

## 🧠 Key Takeaways

- FIX loss is often atmospheric, not equipment failure  
- RTK is extremely sensitive to ionospheric instability  
- Solar storms increase the likelihood of FLOAT conditions  
- Monitoring GNSS space weather reduces mission risk

**Analogy:**  
You wouldn’t ignore wind forecasts before flying. Space weather is the “wind forecast” for GNSS signals.

---

## 🔭 Additional Authoritative Sources

- NOAA Space Weather Prediction Center: https://www.swpc.noaa.gov  
- ESA Space Weather Portal: https://swe.ssa.esa.int  
- International GNSS Service: https://igs.org  
- NASA Space Weather Overview: https://science.nasa.gov/heliophysics/space-weather

---

**This page is part of the GNSS Reliability & Space Weather Guide.**
