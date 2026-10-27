# PMS Research Context — Consolidated Reference

**Project:** 5-bed centralised Patient Monitoring System (PMS), Biomedical Engineering assignment
**Compiled:** 19 October 2026
**Status:** Research phase complete. Source document: `PMS_Assignment_Goals_Milestones.pdf`

---

## How to read this document

Each section is tagged with a confidence level:

| Tag | Meaning |
|---|---|
| ✅ **VERIFIED** | Confirmed against a primary source (publisher catalogue, standards body, official API docs) |
| 🟡 **SECONDARY** | From a reputable secondary source; plausible but not confirmed against the standard text |
| 🔴 **UNVERIFIED** | Could not confirm. **Do not cite without obtaining the standard.** |

Section 1 lists corrections to your assignment brief. **Read it before writing anything.**

---

# 1. Corrections to the assignment brief

These are places where the brief, or the common secondary literature it draws on, is wrong. Fixing them is the cheapest way to raise the quality of the submission.

## 1.1 IEC 60601 standards

| Brief / common citation | What is actually current | Tag |
|---|---|---|
| IEC 60601-2-25 for bedside ECG | `60601-2-25` is **electrocardiographs for producing diagnostic ECG reports** and *explicitly excludes* cardiac monitors under 60601-2-27. For a bedside monitor you need **IEC 60601-2-27:2011 (Ed. 3.0)** | ✅ |
| *(not mentioned in brief)* | **IEC 80601-2-49:2018+A1:2024 (Ed. 1.1)** — *Multifunction patient monitoring equipment*. **This is the single most important particular standard for this project** and the brief omits it | ✅ |
| IEC 60601-2-30 for NIBP | Renumbered → **IEC 80601-2-30:2018 (Ed. 2.0)**. The 60601 number no longer exists | ✅ |
| IEC 80601-2-56 for thermometers | It is **ISO** 80601-2-56:2017+A1:2018 (Ed. 2), not IEC. Currently at stage 90.92 "to be revised"; **ISO/FDIS 80601-2-56 is imminent** | ✅ |
| ISO 80601-2-61:2017 | **WITHDRAWN 2026-04-10** → replaced by **ISO 80601-2-61:2026 (Ed. 3.0)** | ✅ |
| ESD/immunity levels cited to 60601-1 | Those levels are in **60601-1-2**, not 60601-1. Common assignment error | ✅ |

**⚠️ "De-health" in the brief (M2) is almost certainly a typo for "Digital health."** There is no "De-health" standard. Confirm with your instructor.

**⚠️ IEC 60601-1-11 does NOT apply to this project.** It is triggered by a *home healthcare* intended use. A ward is a "professional healthcare facility environment." Citing it as a requirement would be wrong — cite it only as the origin of the environment taxonomy.

### Recommended standards stack for this project

| Level | Standard | Edition |
|---|---|---|
| General | IEC 60601-1 | 2005+A1:2012+A2:2020 (Ed. 3.2), stability 2028 |
| EMC (collateral) | IEC 60601-1-2 | 2014+A1:2020 (Ed. 4.1), stability 2028 |
| Usability (collateral) | IEC 60601-1-6 | 2010+A1:2013+A2:2020 (Ed. 3.2) |
| Alarms (collateral) | IEC 60601-1-8 | 2006+A1:2012+A2:2020 (Ed. 2.2) |
| **Monitor (particular)** | **IEC 80601-2-49** | **2018+A1:2024 (Ed. 1.1)** |
| ECG monitoring | IEC 60601-2-27 | 2011 (Ed. 3.0), stability 2026 |
| NIBP | IEC 80601-2-30 | 2018 (Ed. 2.0) |
| Pulse oximetry | ISO 80601-2-61 | 2026 (Ed. 3.0) |
| Thermometry | ISO 80601-2-56 | 2017+A1:2018 (Ed. 2) |
| Software lifecycle | IEC 62304 | 2006+A1:2015 (Ed. 1.1) |
| Usability engineering | IEC 62366-1 | 2015+A1:2020 (Ed. 1.1) |
| Risk management | ISO 14971 | 2019 |
| IT-network risk | IEC 80001-1 | 🔴 edition unverified |
| Building installation | IEC 60364-7-710 | 2021 (Ed. 2.0) |
| ESU / diathermy source | IEC 60601-2-2 | 2017+A1:2023 (Ed. 6.1), stability 2030 |

### 🔴 Numeric limits you cannot cite without buying the standard

IEC 60601-1 leakage current tables, dielectric withstand voltages, creepage/clearance tables, 60601-1-2 immunity levels (V/m, A/m, kV), and 60601-1-8 Table 3 (pulse rates, burst patterns, minimum SPL) are all inside paywalled PDFs. Where this document gives a number for these, it is flagged 🔴 or 🟡.

**⚠️ Active misinformation warning:** `tda-buzzer.com` publishes a "60601-1-8 compliance guide" with alarm figures that conflate carrier frequency with pulse repetition rate. Do not cite it.

---

## 1.2 ABDM / ABHA

| Brief | Reality (Oct 2026) | Tag |
|---|---|---|
| `/v0.1/health-id/registry/...`, `/auth/token` | **Legacy, not routable.** Live surface is `/v3` and `/abha/api/v3`. Verified by live HTTP probe — legacy paths return 503/404 | ✅ |
| HIP / **HISP** / **HSP** | HISP and HSP are **retired terminology.** Current roles are **HIP, HIU, HRP** | ✅ |
| **PBM** (Personal Health Record Blockchain) | Not in current docs. Blockchain was the 2020–21 "Acacia" concept; the delivered architecture is **HIE-CM**, not a blockchain | ✅ |
| ABHA = SHA-256 hash of Aadhaar/phone + salt | **Unsupported.** Appears only on third-party integrator pages. No official ABDM document says this | ✅ (refuted) |
| "ABDM Health Data Vocabulary" / "Health Data Pay" | **Neither artifact exists.** Real: *FHIR Implementation Guide for ABDM* and *ABDM Health Data Interchange Specifications 1.0* | ✅ |
| Consent state `ACTIVE` | Correct state is **`GRANTED`**. Official five: REQUESTED / **GRANTED** / DENIED / EXPIRED / REVOKED | ✅ |

**⚠️ Terminology trap:** in the ABDM glossary, **PMS = *Pharmacy* Management System**, not Patient Monitoring System. Be careful when citing ABDM docs.

**⚠️ "De-health" (M2)** — see §1.1.

---

## 1.3 FHIR / interoperability

| Brief | Reality | Tag |
|---|---|---|
| SpO₂ = `2708-6` or `59408-5` | `2708-6` = **arterial blood SaO₂** (blood-gas analyser result, no method qualifier). **`59408-5` is correct** — explicitly method-qualified "Pulse oximetry", maps to IEEE 11073 `MDC_PULS_OXIM_SAT_O2` | ✅ |
| NIBP panel `85026-9` | **`85026-9` returns HTTP 404 on loinc.org and zero NLM hits.** Correct panel is **`85354-9`** "Blood pressure panel with all children optional" | ✅ |
| (implicit) FHIR `Waveform` resource | **No `Waveform` resource exists in R4 or R5.** Use `Observation.valueSampledData`, or `Binary` + `DocumentReference` | ✅ |
| IHE PCD as a live domain | **PCD merged into IHE Devices (DEV).** PCD-01/PCD-XR are legacy/superseded. Current: SDPi | ✅ |
| "FHIR over MQTT" standard / "Spark Care" | **No HL7/IHE normative FHIR-over-MQTT document could be found.** Sparkplug B is a real spec (Eclipse Tahu) but defines *state management, not clinical payloads*. "Spark Care" unverified — do not cite | ✅ (absence) |
| SNOMED CT requires paid licence | **India is a SNOMED International Member** → free SNOMED Affiliate Licence | ✅ |
| DPDP Act 2023 "coming up" | **Notified in force 14 Nov 2025** with DPDP Rules 2025, staggered: 14 Nov 2025 / 14 Nov 2026 / 14 May 2027 | ✅ |
| ISO/IEC 27701 | 27701:**2019** was joint with 27001 → **27701:2025** is standalone PIMS | ✅ |

---

## 1.4 Instrument engineering

| Commonly cited | Correction | Tag |
|---|---|---|
| "5 mm/mV = 1 mV" as *standard* calibration | **Full standard is 10 mm/mV.** AAMI EC11 requires fixed gains of 20/10/5 mm/mV ±5%. "5 mm/mV" and "0.5 mV/cm" are the *same* half-standardisation, not two different specs | ✅ |
| NIBP inflation/deflation 40–60 mmHg/s | Plausible as *inflation*, far too fast for the *measurement* phase. Deflation is typically **2–4 mmHg/s** (30–60 s per measurement); 5–10 mmHg/s in "stat" mode. Some devices measure during *inflation* instead | ✅ |
| "CMRR > 100 dB" as the standard requirement | AAMI EC11 specifies a **system-level rejection test**, not a dB figure: all electrodes tied through 51 kΩ ∥ 47 nF, 20 V rms @ 60 Hz injected via 100 pF, requiring **≤1 mV p-p referred-to-input over 60 s**. Chip-level CMRR of 80–120 dB is a *design* value. Specify both | ✅ |
| SpO₂ ±3% at 70–79% | Widely used **marketing/label claim**, not a FDA-recognised clause in 80601-2-61 §201.12.1.101.1. Cite as labelling | 🟡 |
| Temperature ±0.1 °C | Likely wrong as the *standard* limit. ISO 80601-2-56 / ASTM E1965 specify **laboratory error ≤ ±0.3 °C** against a blackbody. ±0.1 °C is the *sensor element* tolerance | 🔴 |
| "30–50 kΩ practical electrode limit" | Derived engineering constraint (Rattfält et al.), **not** a standard limit. No AAMI/ANSI electrode-impedance pass/fail number exists | 🟡 |
| "Blender" cuff sizing | No standard by that name. Conflation of **AAMI SP10**, **ANSI-AAMI**, and the **Blender et al. 1990 *Circulation*** paper that established the 40%/80% rule | ✅ |
| IEEE 11073 implemented in multi-parameter monitors | No evidence found. What is actually deployed: **HL7 v2.3.1**, proprietary Philips Data Export, Mindray PDS | 🟡 |

---

# 2. M1 — Requirements & standards (Phase 1)

## 2.1 System classification

A 5-bed centralised PMS is a **medical electrical system** (ME System) under **IEC 60601-1**, declared for the **professional healthcare facility environment** of **IEC 60601-1-2 Ed. 4.1**. ✅

That environment declaration drives the entire EMC test plan — 60601-1-2 harmonises immunity levels across three tiers (professional healthcare facility / home healthcare / special), and the professional tier is the highest.

Governing principle worth quoting: *"Where particular standards exist, this standard should not be used alone."* ✅

## 2.2 Essential performance

For this system: HR, SpO₂, NIBP, temperature, **and alarm annunciation under disturbance**. Single-fault safety is required across the expected service life.

## 2.3 Distributed Alarm System (DAS) — the key architectural classification ✅

> *"A bedside monitor routing alarms to a nursing station is the canonical example"* of a **distributed alarm system** under IEC 60601-1-8.

This matters because DAS inherits **reliability, latency, fault-indication and single-point-of-failure** obligations from 60601-1-8. **This single sentence is the highest-value standards observation in the whole project.**

Delay-disclosure obligations 🟡:
- If (max alarm condition delay + max alarm signal generation delay) **> 10 s** → disclose the statistics of each distribution in the IFU
- If (mean delays sum) **> 5 s** → disclose the delays
- DAS (§6.4.2): disclose delay from onset to the point the representation leaves the I/O part, **and** the maximum remote alarm signal generation delay

→ **Compute and state an end-to-end alarm latency budget:** sensor → bedside detection → bedside signal generation → network transport → central annunciation → nurse acknowledgement. A realistic total is **4–8 s**. Then design so it stays under the disclosure thresholds, or disclose it.

## 2.4 Alarm priority framework (60601-1-8 Table 1) 🟡

| Potential harm from failure to respond ↓ / Onset → | Immediate | Prompt | Delayed |
|---|---|---|---|
| **Death or irreversible injury** | HIGH | HIGH | MEDIUM |
| **Reversible injury** | HIGH | MEDIUM | LOW |
| **Minor injury or discomfort** | MEDIUM | LOW | LOW |
| Information signal only | — | — | LOW / none |

Definitions: HIGH = immediate operator response; MEDIUM = prompt response; LOW = operator awareness; **INFORMATION SIGNAL = not an alarm** (explicitly includes the ECG waveform and the SpO₂ tone).

**Default alarm presets** must be auto-selected on power-up, on enabling the alarm system, **on admitting a new patient**, and on restoring from total power loss. Presets are locked to the Responsible Organisation.

## 2.5 Usability (IEC 62366-1) — strongly justified here

The five-step process: use specification → safety-related UI characteristics → known use problems → hazard-related use scenarios → summative evaluation. As amended by AMD1:2020, residual-risk acceptability is decided in the **ISO 14971 risk management file**. ✅

**Justification for inclusion:** a nurse watching 5 patients' alarms on one screen faces a textbook use-error hazard — **bed identity confusion** and **alarm limit mis-setting**. This is the strongest justification for including 62366-1 in the write-up.

---

# 3. M2 — Instrument specifications (Phase 1)

## 3.1 The four bedside instruments — summary table

| | **ECG** | **NIBP** | **SpO₂** | **Temperature** |
|---|---|---|---|---|
| **Signal type** | Electrical potential, µV–mV, DC-coupled. Diagnostic 0.05–150 Hz; monitoring 0.5–40 Hz | Mechanical pressure oscillations on a 0–300 mmHg cuff ramp | Optical transmittance, 2λ (660/940 nm). AC ≈ 0.01–10% of DC | Resistive (NTC thermistor) or radiative (IR) |
| **Principle** | Body-surface potential differences across Einthoven triangle / WCT / Goldberger. ±300 mV half-cell offsets removed *after* differential amplification | Cuff occludes artery and acts as transducer. Envelope peak = MAP. **SBP/DBP are empirical estimates, not measurements** | Beer–Lambert dual-wavelength. Ratio-of-ratios R → quadratic empirical curve, calibrated by controlled co-oximetry desaturation studies | Thermistor R–T via Steinhart–Hart, or IR radiance vs. blackbody |
| **Accuracy** | Gain ±5%; calibration pulse ±5% of 1.00±0.01 mV (AAMI EC11) | **Mean diff ≤5 mmHg, SD ≤8 mmHg, n=85** (ISO 81060-2:2018) | **±2% over 70–100%** ARMS. Real ICU LoA vs. intra-arterial far wider | **Lab ≤±0.3 °C** (ISO 80601-2-56 / ASTM E1965). Clinical performance substantially worse |
| **Applied part** | **Type CF, defibrillation-proof** | Type BF | Type BF, defib-proof | Type BF |
| **Isolation barrier** | 2 MOPP, 4 kV RMS / 1 min; creepage 8 mm, clearance 5 mm @ 250 V RMS; 5 kV peak defib 🟡 | Same | Same | Same |
| **Standards** | 60601-2-27 (monitoring) / 60601-2-25 (diagnostic); AAMI **EC11** (perf), **EC12** (electrodes), **EC53** (cables/leadwires), **EC57** (arrhythmia algorithms), **EC13** (defib sync) | **80601-2-30**; ISO 81060-2; ISO 80369-1 (connectors) | **ISO 80601-2-61:2026**; FDA Pulse Oximeter Guidance 2025 | **ISO 80601-2-56**; ASTM E1965 |
| **Key hazard** | Electrode burn from ESU; **defib-proof cables not just electrodes** (see GE recall Z-1878-2019) | Wrong cuff = **up to 30 mmHg error**. Neonatal max **150 mmHg** | Cannot detect COHb/MetHb — CO poisoning can read 100% | Cross-infection; single-patient probe mandatory. **Axillary ≠ core** |

## 3.2 ECG — engineering detail

**Half-cell potentials vs SHE:** Ag/AgCl ≈ **+0.22 V** (some sources quote +0.197 V at 25 °C in KCl). Ag alone = +0.799 V and highly polarisable. Al³⁺ = −1.706 V. 🟡

**Dynamic range problem:** total input DC offset is typically **±300 mV** against a ~1–2 mV signal — a 100–300 dB gap. This is the central engineering challenge. ✅

**Electrode–skin impedance:** stratum corneum is ~**50 kΩ/cm²** intact; mild abrasion (~20 strokes) drops it below **5 kΩ/cm²**. Target ≤5 kΩ/junction; warn >30 kΩ; alarm >50 kΩ. 🟡 The 30–50 kΩ figures are derived, not standard. ✅

**Front end:** instrumentation amp → right-leg drive (RLD) → anti-ESU filter → 24-bit ADC.
- DC current into patient leads **≤0.1 µA** (EC11)
- System noise **≤30 µV p-p** referred to input over 10 s (EC11)
- RLD must include a series output resistor to keep current **<10 µA even in single fault** (e.g. >330 kΩ on a 3.0 V rail) — ADI AD8232 design note, directly quotable ✅

**Notch filter:** use a **Fliege** notch (4 components vs. 6 for Twin-T, better tolerance of mismatch, Q and f₀ independently adjustable). **India's grid is 50 Hz — set the notch to 50 Hz.** ✅ This is a genuine, specific, India-relevant spec line.

**Lead configurations:** 3-lead (I, II, III) · 5-lead (adds V5, ischaemia detection) · 12-lead (10 electrodes: RA, LA, RL ground, LL, V1–V6).
- **Wilson Central Terminal**: RA/LA/LL each through equal **5 kΩ** resistors to a summing node. Note WCT for V1–V6 omits only RL, so **true unipolar recording needs 4 physical electrodes**.
- **Goldberger augmented leads**: resistors removed, exploring limb disconnected → ~1.5× augmentation. But the augmentation ratio shows "tremendous variability" (Wilson/Goldberger, *Circulation* 1951) — **do not state "exactly +50%"**.
- **Mason–Likar** (relocated limb electrodes, for exercise/Holter): Papouchado et al., *Eur Heart J* 1987 showed real differences — rightward QRS axis shift, reduced R amplitude in I/aVL, increased in II/III/aVF, and **inferior Q waves may be masked**. This explains the high false-negative rate for inferior-wall ischaemia. **Serial comparison against standard distal placement is invalid.** ✅

**Bandwidth, and the test behind it:**
| Standard | Bandwidth | Bench test |
|---|---|---|
| IEC 60601-2-25 (diagnostic) | 0.05–150 Hz | 20 ms base-width triangular wave → ≤12% amplitude reduction |
| IEC 60601-2-27 (monitoring) | ~0.5–40 Hz | 40 ms triangular wave → up to 30% reduction |
| IEC 60601-2-47 (Holter) | 1–40 Hz | ≤20% with 40 ms wave for patients <10 kg |

**⚠️ Critical ICU design caveat:** a 0.05 Hz high-pass has a **20 s time constant**. After a defibrillator pulse (1 V, ~1000× normal), the trace can take **10–15 s to become visible again**, with residual 5–50 mV offsets. Monitors often pass the defib-recovery test with the *monitoring* filter but fail with the *diagnostic* filter — and the standard doesn't say which to use.
→ **Design default: monitoring bandwidth (0.5–40 Hz) with a hardware/software baseline-reset function. Label the diagnostic mode as non-defib-certified.** ✅ This is a strong, defensible design decision.

**Cable ecosystem:** trunk cables are **proprietary and not interchangeable** — Philips 12-pin, GE rectangular 11-pin. Trunk 2.0–3.6 m; chest leadwires ~74 cm, limb ~130 cm. **AHA and IEC colour label sets are distinct and both still in the field — specify which, or you buy the wrong leadwires.** ✅

**GE recall Z-1878-2019:** 58,045 trunk cables and leadwire sets worldwide (incl. India) reduced delivered defibrillation energy. → **Specify defibrillation-proof *patient cables*, not merely defibrillation-proof electrodes.** ✅ Strong spec line.

## 3.3 NIBP — engineering detail

**Why oscillometric won:** no human observer (no inter-observer error), works in noisy environments, fully automatable, works in neonates and obese patients where auscultation fails. **But it does not measure BP — it estimates it.** The standard says so explicitly.

**Signal processing:** high-pass out the DC ramp → low-pass (~5–40 Hz) → extract per-beat peak amplitude → bin by mean cuff pressure → **oscillogram (amplitude vs. cuff pressure)**.

**MAP** = cuff pressure at maximum envelope amplitude. **SBP/DBP are inferred from envelope shape by proprietary algorithms:**

| Algorithm | Description | Performance |
|---|---|---|
| Maximal amplitude | MAP from envelope peak; SBP/DBP from ratio points | Peak is really ≈ **0.45·SBP + 0.55·DBP**, not MAP. Total error typically 10–15% |
| Fixed ratio | Descending branch at amplitude ≈ **0.50** of max (SBP); ascending branch at ≈ **0.70** (DBP) | Brittle — true ratios vary over 0.5–0.6; a 0.2 ratio error amplifies into **>40×** a BP error |
| Derivative | Track d(amplitude)/d(cuff pressure) | **<1.5 mmHg error** if noise removed. Best in theory, noise-sensitive |

**→ State as a design limitation: NIBP has no independently verifiable systolic/diastolic reference. Accuracy is validated as a system against a reference, never derived analytically.**

**Cuff sizing — the AHA rule (Blender et al., *Circulation* 1990):**
> **Bladder WIDTH = 40% of arm circumference. Bladder LENGTH = 80% of arm circumference.**
> Using the wrong cuff can affect accuracy by **up to 30 mmHg**.

Sizes (GE clinical chart, cm): Infant 8–13 · Child 12–19 · Small adult 17–25 · **Adult 23–33** · Large adult 31–40 · Thigh 38–50.
**Neonates: one cuff size, 4–9.8 cm** for all newborns. IEC 80601-2-30 neonatal mode **caps max pressure at 150 mmHg**.
A 2023 *Acta Paediatrica* study found visual "two-thirds rule" selection correct only 84% (upper arm) / 43% (width rule) / 56% (length rule) — **measuring is mandatory**.

**Error budget — useful for a "why this matters" table:** arm not at heart level **0.77 mmHg/cm** · wrong cuff size **up to 30 mmHg** · talking/crossed legs +5 to +10 mmHg SBP · full bladder +10 to +15 · cuff over clothing +5 to +10.

**Real-world caveat:** a 2022 systematic review (7 studies, 1,593 critically ill patients) found pooled MAP bias **−1.50 mmHg** vs. intra-arterial — clinically acceptable — but **95% limits of agreement ranged from −14.6 to +40.3 mmHg**, far wider than the ±8 mmHg SD criterion. → *limits of agreement narrow clinical applicability, particularly during vasopressor titration.* ✅

**Engineering spec:** cuff 0–300 mmHg · inflation 20–60 mmHg/s · **deflation 2–4 mmHg/s (5–10 stat)** · measurement 30–60 s · interval user-selectable 1/2/3/5/10/15/30 min + STAT · two overpressure protection devices required · safety valve vents on power loss · **ISO 80369-1** connectors · latex-free TPU hose.

**ESU recovery is mandatory essential performance:** IEC 80601-2-30 §202.8.101 "Electrosurgery interference recovery". ✅ Your NIBP module *must* recover from ESU bursts.

## 3.4 SpO₂ — engineering detail

**Principle:** Beer–Lambert. In 600–800 nm, **deoxyhaemoglobin absorbs far more than oxyhaemoglobin**; above 800 nm the relationship **reverses**. That spectral inversion is the entire physical basis.

```
R ≈ (AC₆₆₀/DC₆₆₀) / (AC₉₄₀/DC₉₄₀)      SpO₂ = aR² + bR + c
```
Published coefficient examples: MAX30101 → a=1.5958422, b=−34.6596622, c=112.6898759. Tremper & Barker (valid 0.4 ≤ R ≤ 3.3) → a=−3.3, b=−21.1, c=109.6.

**Calibration origin:** controlled desaturation studies on healthy volunteers breathing hypoxic gas, with SaO₂ measured **in vitro by co-oximetry** on drawn arterial blood. **Not transferable** — a different optical shield on the same sensor shifts the curve.

**Hardware:** LEDs multiplexed at up to ~500 Hz in a 3-state sequence (red-on/IR-off → IR-on/red-off → both-off ambient reference). LEDs vary **±15 nm** part-to-part; some vendors characterise each LED and encode it in a resistor in the connector. LED has no on-board resistor — **the monitor supplies ~220 Ω current limiting**. Standard probe terminates in a **DE-9** (often mis-called "DB-9"); Nellcor OxiMax pinout: pin 2/3 = LED rails (opposite polarity selects red vs IR), pin 5 = PD anode, pin 9 = PD cathode, pin 7 = shield.

**Validated accuracy requirement (ISO 80601-2-61):** ≥**200 paired data points** evenly distributed over SaO₂ **70–100%**, on **≥10 subjects** varying in age and gender, with a range of skin pigmentations including **≥2 darkly pigmented subjects or 15% of the pool**, using controlled desaturation to **10–12 stable SaO₂ plateaus** (~70, 73, 76, 80, 83, 86, 89, 92, 95, 98, 100%). 🟡

**Why it fails where it fails:**

| Failure mode | Mechanism |
|---|---|
| **70–85% range** | Least physiological + optical data supports the steep part of the curve; small ΔR → large ΔSpO₂ |
| **Dyshaemoglobinaemia** | Two wavelengths **physically cannot distinguish** COHb/MetHb. MetHb drives readings toward **~85%** (the "saturation gap"); COHb reads as oxyHb → **falsely high**. A CO-poisoned patient can read 100% |
| **Low perfusion** | AC shrinks into the noise floor; R indeterminate. **~0.3% modulation** is the practical low-perfusion limit |
| **Motion** | Shifts optical path and AC phase → corrupts both AC and DC. Why every vendor sells a motion-tolerant algorithm (Masimo SET, Nellcor Adaptive Motion Tracking, Philips FAST) |
| **Dyes** | Methylene blue, indocyanine green, henna, tattoo ink. Nail polish: dark blue limits of agreement up to **14.4%** |
| **Skin pigmentation** | Overestimation in darker skin — now a regulatory issue. FDA 2025 guidance requires 3,000+ paired observations across SaO₂ 70–100%, ≥30% per Monk Skin Tone group |
| **Optical path-length ratio** | **Fundamental limitation:** Beer–Lambert assumes no scattering, but tissue scatters heavily and the scattering constant and path length **differ between red and IR** |

**Probe types:** transmission (finger/toe — best under low perfusion) · reflectance (forehead/neonate — needs underlying bone) · Y-site ear probe · adhesive disposable (single-patient, >8 h).

**Co-oximetry vs. pulse oximetry:** co-oximetry is multi-wavelength spectrophotometry on a **drawn blood sample** and detects + quantifies COHb, MetHb, HbF, HbS. → **State in the design that a co-oximeter is required as the arbiter when CO/MetHb poisoning is suspected.** ✅ A clinical-governance point reviewers reward.

**Annex GG (data interface)** — relevant to integration: the standard covers the **master** SpO₂ device. The **slave/remote display at the nurse station is explicitly out of scope** of 80601-2-61 and is governed by 80601-2-49 / 60601-1 instead. ✅ Same logic applies to the other parameters.

## 3.5 Temperature — engineering detail

**The regulated requirement:** **ISO 80601-2-56 / ASTM E1965-98 — laboratory (blackbody) error ≤ ±0.3 °C.** These standards **do not specify a clinical accuracy requirement** — they specify lab accuracy plus a clinical comparison study.

**⚠️ The most important clinical finding for this project** (systematic review + meta-analysis, 13 cohort studies, 632 patients, 105,375 measurements, ICU adults vs. pulmonary artery catheter):
> **Axillary, tympanic infrared and zero-heat-flux thermometers all UNDERESTIMATE intravascular temperature. Only oesophageal measurement showed clinically acceptable accuracy.** Heterogeneity 99–100%.

→ **Specify the monitor with an explicit site-offset table (site + age + mode), and state that axillary skin temperature is a proxy, not core temperature.** ✅

**Honest performance data** (in-hospital study): probes mean error **0.04 °C** @ 37 °C; digital contact thermometers 0.24 °C; **over half of forehead IR and ear IR units failed ISO 80601-2-56 / ASTM E1965**. A 6-model NCIT evaluation found **48–88% of individual measurements outside the labelled accuracy**, and sensitivity for detecting >38 °C ranged **0 to 0.69**. In a 2023 systematic review only **29 of 50** NCIT settings met ±0.3 °C.

**Probe technology → NTC thermistor**, 10 kΩ @ 25 °C, axillary/skin site. Self-heating is the key accuracy risk:
- Error governed by dissipation constant δ. For δ = 2 mW/°C, 1/10 of δ → **0.1 °C** rise; 1/100 → **0.01 °C**.
- **Design rule: bias with a constant current source at 50–100 µA**, not a naive resistive divider. (To hit 0.05 °C, dissipation must be ≤0.05 mW → at 45 °C, R=4356 Ω → V=330 mV → I=75.75 µA → pull-up 28.7 kΩ.)
- **Always implement Steinhart–Hart.** Published data: datasheet curves only → ±0.26 °C; **2-term Steinhart–Hart → ±0.03 °C (9× better)**; linear approximation → ±1.2 °C.

**Infection control:** probe covers/sheaths mandatory for any mucosal or ear-canal site. **Single-patient probes mandatory** for paediatrics, neonates, immunocompromised. Reusable probes are NOT permitted between patients. **Alcohol wipes cause large transient error — allow ≥5–10 min.** ✅ That last one is a practical cause of spurious temperature alarms and is worth a line in the design doc.

**Sampling:** 1–5 s for continuous skin probes; ~1 s for tympanic IR. Alarm delay typically 10–15 s debounce on a 0.2–0.3 °C excursion, to avoid nuisance alarms from probe displacement.

## 3.6 Cross-cutting: power and isolation

**Mains:** 100–240 V AC, 50/60 Hz universal. **India is 230 V / 50 Hz — the ECG notch must be set to 50 Hz.** Class I with equipotential bonding terminal, or Class II.

**Realistic consumption:** design for **60–100 W** per full-featured monitor, **40 W** for a basic/transport unit. Solid references: Datex-Ohmeda S/5 Light **17.5–37 W**; Philips IntelliVue PSU **AC/DC 14 V / 80 W**; Maquet Pulsiocare **max 140 W**. Marketplace listings quoting 50 W and 150 W for the same family are unreliable. ✅

**Internal rail architecture** (verified from Philips IntelliVue and Mindray BeneView service docs):
```
100-240 VAC ──► [2 MOPP AC/DC PSU, 4 kVrms] ──► 12-15 V DC bus
   ├── +3.3 V  LCD, motherboard, CPU, module rack
   ├── +5.0 V  DVI, recorder, CF card, USB
   ├── +12 V   recorder, LCD backlight inverter, parameter modules
   └── [Isolating DC/DC, 1.5–5 kVac] ──► isolated patient-side rails
```
**Key design principle to state in the report:** *the patient-facing sensor rail must be isolated from mains and chassis ground independently of the main PSU barrier, because the sensor cable is the most exposed part of the system.* P-DUKE's modular design does exactly this — 2×MOPP 20 W converter for the patient bus, plus a **second 2×MOPP barrier on the isolated LAN interface**, because *"wiring or connection errors and isolation failures within other devices in the network may void the safety concept of the system."* ✅

**This is the direct argument for a 5-bed central station: you cannot rely on every bedside unit in the network being correctly isolated.**

### ⭐ The 80601-2-49 single-function vs. applied-part distinction — most valuable design point

Per IEC 80601-2-49:
- A **SINGLE FUNCTION** = measurement of one physiological parameter (ECG, SpO₂, IBP, NIBP, temperature)
- A monitor may have **ONE applied part with MULTIPLE single functions** all sharing one circuit reference (COM) — which creates **potential leakage-current paths between single functions**, tested per §19.3 dd and ee
- **OR** (preferred for parameter modules) **multiple separate applied parts**: ECG as its own CF applied part with 5 patient connections; SpO₂/IBP as a separately isolated BF applied part
- **Testing differs:** for **BF**, all patient connections of the applied part under test are tied together at one measurement point. For **CF**, **each patient connection is measured individually** — because CF limits are 10× tighter

> **→ Build each bed's ECG as its own isolated CF domain, and keep SpO₂/NIBP/temperature on a separate BF domain.** Makes 80601-2-49 compliance tractable and allows hot-swapping modules without re-testing the whole patient connection. ✅

**Leakage limits** (🟡 from secondary summaries of IEC 60601-1 Table IV — confirm against the standard before printing):

| | Normal | Single fault |
|---|---|---|
| Type **BF** patient leakage | 100 µA ac, 10 µA dc | 500 µA / 50 µA |
| Type **CF** patient leakage | **10 µA ac or dc** | 50 µA / 50 µA |

**Why CF is 10× tighter:** **34 µA rms at 50/60 Hz through the heart can compromise the heart.** ADI's design rule: *"Ensure no path exists for normal or single-fault conditions that can create a current in excess of 10 µA rms through the patient... Insure isolation between the patient and earth ground for at least 5000 V."*

## 3.7 Applied-part assignment

| Instrument | Class | Justification |
|---|---|---|
| **ECG electrodes + lead wires** | **Type CF, defibrillation-proof** | Surface chest electrodes with an intracardiac catheter or chest access are effectively direct cardiac application. Every cardiac monitor is FDA Class III |
| SpO₂ probe | Type BF, defib-proof | Non-invasive, not applied to the heart |
| NIBP cuff + hose | Type BF | Non-invasive limb |
| Temperature probe | Type BF | Non-invasive |

---

# 4. Diathermy / ESU interference (M1 VOC item) — M3 mitigation

## 4.1 Terminology warning ⚠️

Your brief says "VOC diathermy." **There are at least three different things, mapping to different standards:**

| Term | Meaning | Standard |
|---|---|---|
| **Electrosurgery / electrocautery / HF surgical** | Cut & coagulate at ~300–500 kHz, current *through* the patient | **IEC 60601-2-2** (Ed. 6.1) |
| **Short-wave diathermy / SW diathermy** | Therapeutic heating at **27 MHz** ISM, capacitive applicator | 🔴 **particular standard not verified — do not assume 60601-2-2** |
| Therapeutic ultrasound | MHz, acoustic | Different standard |

→ **Verify what "diathermy" means in your brief before assigning a standard to it.**

## 4.2 Mechanism ✅ (best-sourced section of the research)

- Electrosurgery uses currents **>1 A** and EMFs **>4 kV**; typical **500 kHz**. It *"radiates at harmonics of this frequency, especially between 1 and 10 MHz."* It was *"adapted during the Second World War for jamming radar."*
- **ESU can generate 40–50 V/m at 1 m** — *"making it difficult to use monitors in the same room."* Pacemakers can be affected.
- **Shielding is not feasible because the patient forms part of the radiating antenna.** *"However problems can be reduced by careful placement of leads."*
- SW diathermy at **27 MHz** creates problems *"through demodulation giving an audio signal, giving buzzing noises on telephones."*

**Why monitors are the victim — signal amplitudes:**

| Measurement | Typical voltage |
|---|---|
| **ECG** | **1 mV** |
| EEG | 100 µV |
| EMG | 10 µV |
| Evoked potentials | 1 µV |

- **Surface transient voltages on the patient: 100–400 V**, ubiquitous across the skin
- **SNR during ESU activation: ≈ −90 dB**
- **Rectification at Ag/AgCl electrodes** demodulates the burst envelope and injects non-stationary interference **inside the ECG passband**
- Residual components after RF filtering: strong **100, 120, 180 Hz** plus random LF, with magnitudes/phases varying *"substantially and rapidly as the surgeon moves the knife"*

**Three propagation mechanisms:** **conduction** (dominant risk **below 30 MHz** — which places ESU ~500 kHz and SW diathermy 27 MHz squarely in the conducted regime) · **reactive coupling** (inductive with high current/low impedance; capacitive with high voltage/high impedance; **crosstalk when different cable types are bundled over long distances**) · **radiation** (dominant **above ~30 MHz**).

## 4.3 How monitors cope ✅

1. **Passive RF pre-filters at the electrode** — three cascaded single-pole LP filters at **100 kHz / 30 kHz / 1 kHz**, each in its own **copper-clad compartment**. Passive (not active) because active filters would overload from the hundreds of volts present.
2. **MΩ-input balanced FET differential amplifiers** — preserve the linear coupling characteristic of the pads and **minimise rectification at the pads**.
3. **Common reference to the patient** (all signals referenced to RL), which floats with respect to earth — *"eliminates the possibility of accidental skin burns at the ECG electrodes."*
4. **Optical isolation** (e.g. HP 5082-4354 optocouplers) to remove residual common-mode RF.
5. **3-pole linear-phase (Bessel) LPF at ~600 Hz**, then ADC.
6. **Adaptive noise cancellation (LMS, Widrow 1983)** — *"superior to fixed tuned notch filters because the notches stay locked where the interference actually is"* and *"a filter designed for 60 Hz needs no change for a 50 Hz supply."* ✅

**Generator-side (IEC 60601-2-2 Ed. 6.1):**
- **CISPR 11 Group 2** applies to equipment *"intentionally generating RF for treatment, e.g. diathermy"* 🟡
- **Contact Quality Monitoring (CQM) neutral electrodes** — a *new* requirement in Ed. 6.1. CQM *"continuously checks electrode contact and stops energy delivery if unsafe conditions are detected."*
- *"Return electrode failures remain one of the most common causes of electrosurgical injuries."*
- AMD1:2023 requires **accessory length** documentation (longer cables → more stray current) and risk analysis for **duty cycles above 45%**.
- HF leakage current limit cited as **150 mA through a 200 Ω load** 🟡 — verify clause.

## 4.4 What the design must do anyway ⚠️

**Honesty point worth putting in the report:**
> Standards such as EN 60601-1-2 *"specify levels of EMC performance but do not tell designers and installers of devices and systems how to go about achieving compliance."* — EBME, Univ. of York ✅

**60601-1-2 alone will not save you from a 40–50 V/m electrosurgical field.** Practical requirements:

- **EM zoning and physical separation** — *"placing SW diathermy or electrosurgery in a different part of the building to EEG and other sensitive equipment"*
- **Segregated shielded data cabling** — *"community hospitals… installed using simple twin-and-earth cables, quite often running parallel and in very close proximity to hospital data network. The use of twin-and-earth cable does not provide any protection of EMI (as no shielding is provided)"* ✅ **Strong argument for shielded segregated cabling in your ward design.**
- **Avoid bundling** ECG/SpO₂/NIBP cables into one central rack — that is the textbook crosstalk geometry
- Keep **smoke evacuator motors ≥2 m** from trunk cable routing; separate power circuit; star earth
- Keep **suction tubing away from ECG leads** (microphonics)

🔴 **Electrosurgical smoke was not researched.** Authoritative source if needed: NIOSH *Safe Practice Guidelines for Surgical Smoke* (cdc.gov/niosh). Don't cite from memory.

---

# 5. M5 — RDBMS schema (Phase 2)

## 5.1 Tables required by the brief

Patients · Beds · Instruments · Vitals_Log · Alerts · Staff — plus the join tables the brief doesn't name but the design needs.

**Recommended additions:** `Admissions` (Encounter equivalent — an inpatient admission spans days and many beds-visits) · `Bed_Assignments` (a bed can be occupied by many admissions over time) · `Alarm_Acknowledgements` (IEC 60601-1-8 requires a tamper-evident alarm record) · `Consumables` / `Consumable_Usage` (for M7 inventory alerts) · `Sync_State` (for the MongoDB outbox/CDC pattern).

## 5.2 Index design

The brief specifies **index on (bed_id + timestamp)** — correct, and the right form is a **composite** index because the query pattern is always "all readings for bed X in time range T."

Recommended:
```sql
-- the primary time-series access path
CREATE INDEX ix_vitals_bed_time ON vitals_log (bed_id, recorded_at DESC);

-- the per-parameter trend query
CREATE INDEX ix_vitals_code_time ON vitals_log (parameter_code, recorded_at DESC);

-- alarm list at the nurse station: unacknowledged, highest priority first
CREATE INDEX ix_alerts_open ON alerts (acknowledged_at, priority, raised_at DESC);
```

**Design points to justify:**
- **Partitioning:** `Vitals_Log` will dominate. Partition by **range on `recorded_at`** (monthly), or better by **`bed_id` hash** if you query per-bed. With 5 beds × 10 parameters × 1 reading/s × 7 days ≈ 30M rows/week, partitioning is not optional at production scale — and worth showing the arithmetic for.
- **Waveforms do not belong in `Vitals_Log` rows.** Store full-disclosure waveform data in a time-series store or object/blob store keyed by (bed_id, start_time, duration). Mindray BeneVision CMS stores **240 h full-disclosure + 3000 events × 16 s pre/post** — that's the reference target. ✅
- **Referential integrity for patients:** never hard-delete a patient. Use soft-delete/tombstone, because CDC gives you deletes and re-applying them must not resurrect rows.
- **`Vitals_Log` needs `derived_from`.** NIBP MAP is *computed*, not measured — `(SBP + 2×DBP)/3`. Store provenance so a machine-readable chain exists for derived parameters. ✅ This is a good schema design point.

## 5.3 ER relationships

```
Patient 1 ──── * Admission (Encounter)
Patient 1 ──── * Bed_Assignment * ──── 1 Bed
Bed    1 ──── * Instrument
Bed    1 ──── * Vitals_Log * ──── 1 Parameter
Admission 1 ─── * Vitals_Log
Instrument 1 ─── * Vitals_Log        (Observation.device equivalent)
Vitals_Log 1 ─── * Alert             (or Alert 1 ─── 1 Vitals_Log, whichever)
Alert  1 ──── * Alarm_Ack  * ──── 1 Staff
Staff  1 ──── * Alarm_Ack
Patient 1 ──── 1 ABHA_Link          (ABHA address, encrypted)
Admission 1 ─── 1 Care_Context      (ABDM care context reference)
```

**The `Care_Context` link is the ABDM join key** — see §6.3. Without it you cannot answer ABDM discovery or publish records.

## 5.4 Key constraints to state

- `Bed_Assignment`: **no overlapping occupancy** — enforce with an exclusion constraint or a trigger. This is a real clinical-safety constraint (two patients assigned one bed).
- `Vitals_Log.parameter_code` must reference a **lookup table** constrained to the LOINC set in §7.1 — not a free-text column.
- `Alerts.priority` ∈ {HIGH, MEDIUM, LOW, INFORMATION} per IEC 60601-1-8 Table 1. ✅
- `Patients.abha_number` and `Patients.aadhaar_hash`: **encrypted at the column level**, and **never logged**. ✅
- `Vitals_Log.recorded_at` (when the sensor sampled) vs `Vitals_Log.stored_at` (when the server wrote it) — **store both**. Alarm timelines across 5 beds will not reconcile without NTP.

---

# 6. M6 — Digital health flow (Phase 3)

## 6.1 ABHA — verified facts ✅

- **ABHA number:** unique **14-digit** number, format `NN-NNNN-NNNN-NNNN`
- **ABHA address:** unique self-declared username. Authoritative regex from the OpenAPI spec:
  ```
  ^[a-zA-Z0-9][a-zA-Z0-9_.]+[a-zA-Z0-9]@(abdm|sbx)$
  ```
  → minimum length 8; `@abdm` production, `@sbx` sandbox. **No scoping modifiers exist in v3.**
- **No scoping modifier mechanism.** Older material describing scoped addresses is not reflected in current docs.

**⚠️ Critical gotcha, explicitly documented with a dated test:** encrypting the **14 bare digits is rejected**. On the sandbox, *11 September 2026*, an OTP request sent that way returned `400 {"loginId": "LoginId is invalid"}`. The same number as `91-1234-5678-9015` passed. **Put the dashes back before encrypting.**

**Check-digit algorithm:** implement **Luhn** for ABHA and **Verhoeff** for Aadhaar locally before spending an API call. 🟡 (stated once in prose, no worked example)

## 6.2 ABHA generation — live v3 endpoints ✅

**Gateway session (the only unauthenticated call):**
```
POST https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions
Headers: REQUEST-ID, TIMESTAMP (ISO-8601 UTC), X-CM-ID: sbx
Body:    { "clientId": "...", "clientSecret": "...", "grantType": "client_credentials" }
```
OAuth2 client_credentials, but on `/api/hiecm/gateway/v3/sessions` — **not `/auth/token`**. Response: `accessToken`, `expiresIn` 1200, `refreshToken`, `refreshExpiresIn` 1800.

**Create ABHA by Aadhaar OTP:**
```
Step 1  POST /abha/api/v3/enrollment/request/otp
        { "txnId", "scope": ["abha-enrol"], "loginHint": "aadhaar",
          "loginId": "<encrypted aadhaar>", "otpSystem": "aadhaar" }

Step 2  POST /abha/api/v3/enrollment/enrol/byAadhaar
        { "authData": { "authMethods": ["otp"],
                       "otp": { "txnId", "otpValue": "<encrypted>", "mobile" } },
          "consent": { "code": "abha-enrollment", "version": "1.4" } }
```
Response contains `ABHAProfile` with `ABHANumber`, `phrAddress[]`, `abhaStatus`, `isNew`. **`isNew: false` means the Aadhaar already had an ABHA — always read `isNew`.**

**⚠️ The two-token model — the most common integration bug:**
- **Gateway token** (`accessToken`) — identifies *your application*
- **User X-token** (`tokens.token`) — identifies *the person*

Never send the gateway token in `X-token`. `ABDM-1094` means X-token expired — usually the *wrong kind* of token, not an old one.

**Scopes (M1):** `abha-enrol`, `abha-login`, `mobile-verify`, `email-verify`, `abha-profile`, `search-abha`. **The verify call must carry the same scope array as the request call** or it is refused.

## 6.3 The PMS-relevant flow: Scan and Register ✅

This is the "patient scans QR at your counter" flow — directly analogous to ward registration.

**Counter QR URL:** `https://phrsbx.abdm.gov.in/share-profile?hip-id=<HIP_ID>&counter-id=<COUNTER_ID>`
`counter-id`: your choice, 1–20 alphanumerics. **Never** reuse the facility ID, HIP id or HIP name. **Keep it stable** — reprinting with a new counter id starts a new queue.

**ABDM posts to your bridge at `/api/v3/hip/patient/share`:**
```json
{ "intent": "PROFILE_SHARE",
  "metaData": { "hipId": "<HIP_ID>", "context": "OPD1", "latitude": "12.97", "longitude": "77.71" },
  "profile": { "patient": {
      "abhaNumber": "<ABHA_NUMBER>", "abhaAddress": "<ABHA_ADDRESS>",
      "name": "<NAME>", "gender": "M",
      "dayOfBirth": "6", "monthOfBirth": "6", "yearOfBirth": "2000",
      "address": { "line": "...", "district": "...", "state": "...", "pincode": "..." },
      "phoneNumber": "<MOBILE_NUMBER>" } } }
```
Note `pincode` has a **lowercase c**. `abhaNumber` is `null` for address-only accounts — **match on `abhaAddress`.**

**Your reply within 30 seconds — `POST /api/v3/patient-share/v3/on-share`:**
```json
{ "acknowledgement": { "status": "SUCCESS", "abhaAddress": "<ABHA_ADDRESS>",
                       "profile": { "context": "OPD1", "tokenNumber": "1", "expiry": "1800" } },
  "response": { "requestId": "<REQUEST-ID of the share>" } }
```
Send `acknowledgement` **or** `error`, never both.

## 6.4 Publishing PMS records ✅

**Link token** — `POST /api/hiecm/v3/token/generate-token`. **Valid 6 months** — store per *patient*, not per visit.

**Care contexts** — `POST /api/hiecm/hip/v3/link/carecontext` (token in `X-Link-Token`).

**⚠️ Care context rules — where "PMS data" becomes ABDM-visible:**
- The HIE-CM holds **only two fields** per care context: your `referenceNumber` and a `display` name **with nothing clinical in it**
- Guidance: **one care context per outpatient visit, one per inpatient admission**
- **Do NOT create a care context per vitalss reading.** A 24-hour vitals trace is not 288 care contexts. One care context per episode; the record count goes in `count`
- Link **when the record is ready to share**, not when the visit opens

**This is the single most important design constraint for M6** — and it maps directly onto your schema: `Care_Context.referenceNumber` must equal `Admission.id` on your side.

**Data flow (HIU side)** — `POST /api/hiecm/data-flow/v3/health-information/request` with `consent.id`, `dateRange`, `dataPushUrl`, and `keyMaterial` (ECDH / curve25519).

## 6.5 Consent management ✅

**Two distinct objects:** the **consent request** (the ask, held by the HIU) and the **consent artefact** (the permission, created only on grant, held by the HIE-CM). One request can produce **multiple artefact ids**. **Store the request id and every artefact id.**

**Official five states:** `REQUESTED` · **`GRANTED`** · `DENIED` · `EXPIRED` · `REVOKED`. **`GRANTED` is the success state, not `ACTIVE`.**

**Request** — `POST /api/hiecm/consent/v3/request/init`. Controlled value sets:
- `purpose.code`: `CAREMGT` | `BTG` | `PUBHLTH` | `HPAYMT` | `DSRCH` | `PATRQT`
- `permission.accessMode`: `VIEW` | `STORE` | `STREAM` | `QUERY`
- `frequency.unit`: `HOUR` | `DAY` | `WEEK` | `MONTH` | `YEAR`

**Fetch artefact** — `POST /api/hiecm/consent/v3/fetch` → 202 → arrives at `/api/v3/hiu/consent/on-fetch` with approved care contexts, permitted hiTypes, date range, erase date, HIP/HIU, and a **signature**.

**The three clocks (frequently confused):**
1. **Request window** (set by HIU) → running out = `EXPIRED`
2. **Consent validity period** (set by patient at grant) → `dataEraseAt`
3. **Date range** (which *records* are in scope, by when care happened)

A consent granted today can legitimately cover records from 2019. ✅

**Key errors:** `ABDM-1061` expired artefact · `ABDM-1062` consent not granted · `ABDM-1112` invalid/expired artefact id · `ABDM-1038` ABHA/link-token mismatch · `ABDM-1056` care context already linked · `ABDM-1026` invalid link token · `ABDM-1022` too many requests · `ABDM-1027` blocked for 24 h.

**⚠️ On revocation:** *"What to do with data you already hold is **not documented yet**"* — stated verbatim in the official consent doc. **Do not assert a policy.**

## 6.6 Hospital PMS role: HIP ✅

| Term | Definition | In current glossary? |
|---|---|---|
| **HIP** — Health Information Provider | Creates/holds health information; makes it available for consent-based exchange | ✅ |
| **HIU** — Health Information User | Requests and uses records for a stated purpose | ✅ |
| **HRP** — Health Repository Provider | Stores records on behalf of a provider | ✅ |
| HISP | — | ❌ **retired** |
| HSP | — | ❌ **not in glossary** |

**A hospital PMS is primarily a HIP.** Prerequisites: registered in **HFR** with a Facility ID · HIP ID mapped to Client ID · valid **callback URL** via `PATCH /api/hiecm/gateway/v3/bridge-url`.

**M2 — five mandatory capabilities** for an HMIS: FHIR R4 records across all record types · care contexts · linking (HIP-initiated + discovery) · **answering discovery — mandatory for every HIP, even if all patients give you an ABHA address** (a patient who visited two years ago did not) · health-information request + data transfer.

**Discovery matching rule (directly relevant if your PMS holds demographics):** weight **verified** identifiers above patient-declared ones. Unverified values (facility patient ID, medical registration number) may *sharpen* a match, never *make* one. **The discovery response carries metadata only** — no diagnosis, no results. A not-yet-proven patient reads it. ✅

## 6.7 Sandbox

- Apply at `https://sbxai.abdm.gov.in` — 6-stage onboarding
- `X-CM-ID: sbx` (sandbox) / `abdm` (production)
- **Official Postman collections:** `hiecm-m1` (120 requests), `hiecm-m2` (10), `hiecm-m3` (7), `hiecm-p2` (42), plus `hiecm-sandbox.postman_environment.json`
- ⚠️ **No test ABHA numbers are published.** The docs supply sandbox hostnames but no seeded credentials. Use Aadhaar test number **999999990019**, which appears throughout official examples.
- ⚠️ **Rate limit thresholds are explicitly not published.** Back off on both `1022` and `1027`. **Do not retry "Request an OTP"** — it is rate-limited, and a retry loop is the usual cause of the 24-hour lockout it tries to escape.

## 6.8 Security

**M1 input encryption (RSA):** encrypt Aadhaar, **ABHA number**, mobile, email, OTP, password.
- M1 + PHR: `RSA/ECB/OAEPWithSHA-1AndMGF1Padding` — OAEP with **SHA-1** for both digest and MGF
- M4 registries: `RSA/ECB/PKCS1Padding`, different certificate
- **⚠️ Most common failure:** most crypto libraries default OAEP to **SHA-256**. For M1 you must pass **SHA-1 explicitly**. The certificate arrives as **base64 DER with no PEM armour** — add the armour before loading.
- **Two different certificates — never cross them:** `/abha/api/v3/profile/public/certificate` (M1) vs `/abha/api/v3/phr/app/login/public/certificate` (PHR)

**M2/M3 payload encryption:** ECDH Curve25519 → AES-256-GCM → HKDF-SHA256. Nonces: first 20 bytes = HKDF salt, last 12 = IV. HKDF input = **x-coordinate of the shared key**; `info` empty; no AAD. New key pair per exchange → forward secrecy. **Use [fidelius](https://github.com/sukreet/fidelius) — do not implement this yourself.**

**What must never be logged:**
> *"Aadhaar numbers, one time passwords and passwords **never reach a log or a database**."*
> *"Encrypting a value and then logging the plain one is the same leak, moved."*

**Where to encrypt:** **in your own process.** Sending an Aadhaar number to a remote "encryption service" defeats the purpose. If a remote helper has ever been in a production path, *"treat every value that passed through it as disclosed."*

**Formal audit:** **WASA** by an STQC-approved or CERT-In-empanelled agency, against **staging** (not production), producing a Safe to Host certificate. One audit covers **one platform** — website, Android and iOS need three separately. **Any backend change forces re-audit.**

**Idempotency:** `REQUEST-ID` is the idempotency key — one fresh UUID per call.
- Retry-safe: session token, read endpoints
- **Never retry**: OTP request, OTP verify, ABHA enrolment (*"a success you did not see still created an account"*)

**Read the body, not the status.** A `404` can carry `ABDM-1016`. A `404` with body "Status report" and no code means no route matched.

**⚠️ Callback handling (the #1 integration failure):** register **one base URL** for the whole bridge, reachable from the public internet and **listening continuously** (ABDM posts when ready, not when you poll). Match on `response.requestId`; **callbacks can arrive out of order and can be delivered twice** — a repeat must change nothing.

**⚠️ RBAC and key management are NOT specified** in the ABDM developer docs (🔴 gap). Source them from the **ABDM Health Data Management Policy** and the **DPDP Act** if your assignment needs them.

## 6.9 SQL → MongoDB sync

**Does ABDM mandate anything here? No.** ABDM has no opinion on your internal datastore. What it *does* constrain:

| ABDM constraint | Consequence for your sync design |
|---|---|
| **HIE-CM is data-blind** — never holds a health record | Never design Mongo as an ABDM-required replica. It's *your* analytics store |
| **HIE-CM holds only `referenceNumber` + `display` per care context** | Mongo must retain the **same care-context reference IDs** as SQL, or you cannot answer discovery/linking |
| Records move HIP→HIU direct, encrypted, in a ~20-minute window | The FHIR bundle is assembled **at transfer time**, not pre-stored |
| Consent-scoped, revocable access | Mongo copies carry the same obligations as SQL. **`dataEraseAt` must be honoured in both stores** |
| Bridge callbacks are synchronous | The `/api/v3/hip/patient/share` handler must reply `200` **immediately**, then process. **Never put it behind an async Mongo write** |

**Recommended pattern: SQL = system of record → CDC → Mongo = read model.**
```
[SQL/RDBMS] --WAL/binlog--> [CDC connector] --stream--> [Transformer] --> [MongoDB]
   truth                      log-based, low latency   FHIR shaping    aggregations
```

| Option | Latency | Intrusive? | Assessment |
|---|---|---|---|
| **Log-based CDC** (Debezium on MySQL binlog; SQL Server CDC) | ~ms–s | No | ✅ **Best fit** — no schema locks, ordered, resumable |
| **Transactional outbox** | ms | No (extra table) | ✅ **Best for a student project** — simple, transactional, at-least-once |
| Trigger-based | s | Yes — hurts write perf | ⚠️ Avoid |
| Periodic polling (`updated_at` watermark) | min–hr | No | ⚠️ Fallback; misses deletes, needs overlap + dedup |
| **Dual write** (app writes both) | real | — | ❌ **Never** — no atomicity, guaranteed drift |

**Real-time vs periodic — choose by use case, not by default:**
- **Real-time / streaming** for anything clinically time-sensitive (vitals, alarms, trend display)
- **Periodic batch** for heavy aggregations (daily census, monthly reports) — cheaper, replayable

**Pragmatic hybrid for this project:** CDC or outbox for the hot path + a **nightly full reconciliation job** that rebuilds Mongo aggregates and reports drift.

**Non-negotiables:** idempotent upserts keyed on the SQL primary key (CDC is **at-least-once**) · soft deletes / tombstones · schema-evolution tolerance · **never mirror Aadhaar/OTP/password into Mongo — exclude at the transformer, not the reader** · honour `dataEraseAt` in Mongo.

## 6.10 ABDM data standards ✅

- **FHIR Implementation Guide for ABDM** — `https://nrces.in/ndhm/fhir/r4/index.html`, **v6.5.0**, package `ndhm.in#6.5.0`, based on **FHIR R4 (4.0.1)**, generated 2025-05-08
- **ABDM Health Data Interchange Specifications 1.0** — the scope document the IG implements

**Eight record types (`hiTypes`), all mandatory for an HMIS:**

| `hiType` | Profile | Covers |
|---|---|---|
| `DiagnosticReport` | `DiagnosticReportRecord` | Radiology + lab reports |
| `DischargeSummary` | `DischargeSummaryRecord` | Discharge summary |
| `HealthDocumentRecord` | `HealthDocumentRecord` | Unstructured historical records |
| `ImmunizationRecord` | `ImmunizationRecord` | Vaccinations, certificates |
| `OPConsultation` | `OPConsultRecord` | Outpatient notes |
| `Prescription` | `PrescriptionRecord` | Medications (PCI-compliant) |
| **`WellnessRecord`** | `WellnessRecord` | **Vitals, physical exam ← most relevant to a PMS** |
| `Invoice` | `InvoiceRecord` | Billing |

> **For a patient monitoring system, `WellnessRecord` is your primary profile.** It covers vitals and physical examination. Underlying resource profiles: **`ObservationVitalSigns`**, `ObservationBodyMeasurement`, `ObservationGeneralAssessment`, `ObservationLifestyle`, `ObservationPhysicalActivity`, `ObservationWomenHealth`.

**Required resource profiles (all present):** `Patient`, `Observation` (+ 6 specialisations), `Encounter`, `Condition`, `MedicationRequest`, `DiagnosticReport` (Imaging + Lab), `DocumentReference`, `CarePlan`, `ChargeItem`, `AllergyIntolerance`, `Appointment`, `Binary`, `FamilyMemberHistory`, `ImagingStudy`, `Immunization`, `ImmunizationRecommendation`, `Invoice`, `Media`, `Medication`, `MedicationStatement`, `Organization`, `Practitioner`, `PractitionerRole`, `Procedure`, `ServiceRequest`, `Specimen`, and **`DocumentBundle`** (Bundle) — the transport envelope: *"all resources into a single instance with containing context to act as an exchangeable clinical document."*

**MUST Support Elements:** the receiving HIU must be *able to read* the element though the sender may omit it. Sender/receiver asymmetry.

**⚠️ Documented inconsistency:** the M3 consent doc lists **7** hiTypes and omits `Invoice`; the M2 error message lists those 7 **plus** `Invoice`; the FHIR page says 8. **Send `Invoice` last / verify against the live OpenAPI.** ✅

## 6.11 ⚠️ ABDM is not a streaming target — design accordingly

ABDM's record types are **discrete, consented documents**, not a high-frequency live stream. **Live streaming of vitals to ABDM is not what ABDM is for.**

**Correct position for this project:**
> *The PMS records into its own FHIR R4 server. On discharge / episode close, an export step builds an `OPConsultRecord` or `HealthDocumentRecord` (a `Composition`) bundling the episode's data, which is then consented and pushed to ABDM.*

✅ This is both accurate and demonstrates you understand ABDM's actual information model. **Strong differentiator for the write-up.**

---

# 7. FHIR R4 resource mapping (M6)

## 7.1 Verified LOINC codes ✅

| Vital | LOINC | Long Common Name | UCUM unit |
|---|---|---|---|
| Heart rate | **`8867-4`** | Heart rate | `/min`, `{beats}/min` |
| Systolic BP | **`8480-6`** | Systolic blood pressure | `mm[Hg]` |
| Diastolic BP | **`8462-4`** | Diastolic blood pressure | `mm[Hg]` |
| Mean BP | **`8478-0`** | Mean blood pressure | `mm[Hg]` |
| **SpO₂ (pulse ox)** | **`59408-5`** | Oxygen saturation in Arterial blood **by Pulse oximetry** | `%` |
| SaO₂ (blood gas) | ~~`2708-6`~~ | Oxygen saturation in Arterial blood *(blood gas analyser — not this)* | `%` |
| Body temperature | **`8310-5`** | Body temperature | `Cel` |
| Respiratory rate | **`9279-1`** | Respiratory rate | `{breaths}/min` |
| **BP panel** | **`85354-9`** | **Blood pressure panel with all children optional** | — |

**BP panel `85354-9` children** (verified cardinality from loinc.org): `8480-6` SBP (O 0..1) · `8462-4` DBP (O 0..1) · `8478-0` MAP (O 0..1) · `8357-6` BP method (O) · `41904-4` BP measurement site (O) · `8358-4` BP cuff size (O, `cm`) · `41901-0` Type of BP device (O).

**Other verified codes:** `34565-2` vital signs/weight/height panel (umbrella `PANEL.VITALS`) · `55417-0` short BP panel · `35094-2` BP panel · `55284-4` BP sys+dia (used by US Core) · `76536-2` BP mean by noninvasive (NIBP MAP) · `11524-6` EKG study · `9874-9` / `8619-9` EKG rhythm segment interpretation · `89263-8` special circumstances observations panel (*"patient asleep"*, *"in pain"* — genuinely useful for a monitor).

**⚠️ `93000-9`** ("EKG 12 channel study") returned **zero hits** in the NLM LOINC database during verification. Use **`11524-6`** as the verified-safe ECG study code.

## 7.2 UCUM units ✅

System URI: **`http://unitsofmeasure.org`** (no *s* between "units" and "of").

| Quantity | UCUM code | Notes |
|---|---|---|
| Blood pressure | **`mm[Hg]`** | Square brackets mark a non-SI customary symbol |
| Oxygen saturation | **`%`** | |
| Temperature | **`Cel`** | UCUM deliberately does **not** use `°C` |
| Temperature (US) | `[degF]` | |
| Heart rate | **`/min`** | simplest, most widely used in profiles |
| Heart rate (explicit) | **`{beats}/min`** | semantically identical — `{beats}` is a non-semantic annotation |
| Respiratory rate | **`{breaths}/min`** | LOINC's preferred form for `9279-1` |

`/min` and `{beats}/min` are **semantically identical** (UCUM §6.4: annotations do not contribute to semantics). **Be consistent and note the equivalence.**

```json
"valueQuantity": { "value": 120, "unit": "mmHg",
                   "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
```
**The `unit` field is human-readable display; `code` is machine-readable. Always populate both, with the UCUM code in `code`.**

## 7.3 R4 over R5 — recommendation ✅

| | **R4 = 4.0.1** | R4B = 4.3.0 | **R5 = 5.0.0** |
|---|---|---|---|
| Published | 2019 | 2021 | **March 2023** |
| Status | **Mixed Normative + STU** | STU | **STU (Trial Use)** — "current published version" |
| Backward compat | — | Guaranteed vs R4 | **Not guaranteed** |

HL7 R5 spec, verbatim:
> *"the pace of implementation adoption of new versions is slowing, and **it is unclear how quickly R5 will be adopted**."*

**Production reality:** US federal (ONC/ASTP USCDI) **R4** · **India (ABDM) R4** · UK **R4** · Germany, Nordics, most EU national IGs **R4**.

**→ Use FHIR R4 (4.0.1).** Four defensible reasons for the report: ABDM is R4 so alignment is the locally correct decision · R4 is the normative locked release while R5 is explicitly STU and HL7 says R5→R6 will promote resources to Normative (meaning R5's own element shapes will move) · every library and tutorial is R4 · you can mention R5 in a version-strategy section as currency awareness.

**Resource maturity (FMM) of the ones you'll use** — note Device is Trial Use:

```
Patient            N (Normative)     Observation          N (Normative)
Practitioner       5                  PractitionerRole     4
Organization       5                  Location             5
Encounter          4                  DocumentReference    4
Condition          5                  Procedure            4
MedicationRequest  4                  DiagnosticReport     3
AllergyIntolerance 3                  CarePlan             2
Device             2  ← Trial Use     DeviceMetric         1  ← Trial Use
Subscription       3  ← Trial Use     SubscriptionTopic    2
```

## 7.4 Resource mapping for the PMS

| Concept | FHIR R4 resource | Key elements |
|---|---|---|
| Patient | **`Patient`** (FMM N) | `identifier[]` (MRN — **the join key**), `name[]`, `telecom[]`, `gender`, `birthDate` (date only), `address`, `managingOrganization` |
| Admission | **`Encounter`** (FMM 4) | `status`, `class` = **`IMP`** for inpatient, `subject`, `period` (start = admission, end = discharge), `hospitalization`, **`location[]` → the bed**, `participant[]` (type `ATND`) |
| Bed | **`Location`** (FMM 5) | `identifier` (`BED-03`), `status`, `operationalStatus` (`O` occupied / `U` unoccupied / `C` closed), `physicalType` (SNOMED bed), **`partOf`** → Bay → Ward → Hospital |
| Bedside monitor | **`Device`** (FMM 2) | `identifier`, `status`, **`statusReason[]`** (`transduc-discon`, `hw-discon` — use for alarm-condition device state), **`specialization[].systemType`** = the communication standard, **`patient`** → who it's on, **`location`** → which bed, **`parent`** → device hierarchy |
| A reading | **`Observation`** (FMM N) | `status`, `category` = `vital-signs`, **`code`** = LOINC, `subject`, `effective[x]`, `issued`, `performer[]`, `value[x]`, `interpretation[]`, `bodySite`, **`device`** → which monitor, `method`, **`component[]`**, `referenceRange[]`, **`derivedFrom[]`** |
| Alarm | *(no native resource)* | Model as `Observation` with a `critical` flag, or a `DetectedIssue`-style local profile, plus `AuditEvent`/`Provenance` |
| Nurse | **`Practitioner`** (FMM 5) + **`PractitionerRole`** (FMM 4) | `identifier[]` (registration no.), `qualification[]`; role: `organization`, `code[]` (SNOMED nurse `224535009`), **`location[]`** = assigned ward |
| Hospital | **`Organization`** (FMM 5) | `identifier`, `type`, `name`, `partOf` |

### ⭐ `Device.parent` is the most important element for a monitoring system

IEEE 11073 models a monitor as a **containment tree**: MDS → channels → VMDs (virtual medical devices) → metrics. FHIR models it as **`Device.parent` chains.**

```
Device  (Transport Monitor BED-01)
 ├─ specialization.systemType = IEEE 11073-20601  v2.x
 ├─ location → Location/BED-01
 ├─ statusReason[] → transduc-discon when probe off
 └─ parent → null
Device (SpO₂ Probe)
 └─ parent → Device/MON-BED-01
```

This lets you represent "the SpO₂ probe attached to the transport monitor at Bed 3 for Patient 42" exactly. ✅

### Honest note on `DeviceMetric`

`DeviceMetric` is **FMM 1 — the lowest maturity level** — and its own R4 scope note says it *"is only applicable to describe a single metric node in the containment tree that is produced by the context scanner."*

**Most real FHIR implementations model each vital as an `Observation` with `Observation.device` pointing at the `Device`, and use `DeviceMetric` only for static metric metadata.** **Say this explicitly in the report — it shows you read the maturity table rather than copying a list.** ✅

### `derivedFrom` — a genuinely strong exam point

NIBP MAP is **computed** as `(SBP + 2×DBP)/3`, not measured. Attach:
```
Observation(8478-0).derivedFrom → [Observation(8480-6), Observation(8462-4)]
```
and you have machine-readable provenance for an entire class of derived parameters. Extend to SpO₂-derived perfusion index, shock index (HR/SBP), NEWS2. ✅

## 7.5 Waveforms — no `Waveform` resource exists ✅

Checked both R4 and R5 resource indexes: **there is no `Waveform` resource.** (Proposed from STU3, not carried into R4/R5.)

| Approach | When |
|---|---|
| **`Observation` with `valueSampledData`** | ✅ **Best fit.** Carries `origin`, `period` (sample interval in seconds), `sample[]`, `dimensions[]` — explicitly designed for waveform data |
| **`Binary` + `DocumentReference`** | Full-fidelity 12-lead ECG files (DICOM/ECG waveforms, SCP-ECG). `Binary.contentType` + base64 |
| **`Observation.component[]`** for derived values | HR, PR interval, QRS duration, QT/QTc, ST deviation, RR interval |
| **`DiagnosticReport`** | Formal ECG *report* with `result[]` → the Observations, plus `conclusion` (e.g. sinus rhythm) |

**`DiagnosticReport.result[]` is how you link a panel of ECG observations into a report.** ✅

## 7.6 Narrative — the rule people get wrong ✅

```json
"text": { "status": "generated",
          "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\"><p>HR 78 /min</p></div>" }
```
`text.status`: `generated` | `extensions` | `additional` | `empty`. `div` **must be valid XHTML**, must use the `http://www.w3.org/1999/xhtml` namespace, must not contain `head`/`body`/`iframe`.

**Requirement:** *"If a server is asked to render a resource, and the resource has a `text.status` of `generated`, the server **SHALL** render the narrative exactly as supplied."*

**For this project:** generate narrative for every Observation so nurse-facing displays and printed trend sheets render without re-implementing each resource's logic. **But never display `text.div` in a clinical alarm path — parse the structured fields.** Narrative is a *rendering* of the data, not the data. ✅

## 7.7 Extensions ⚠️

| Extension | Status |
|---|---|
| `http://hl7.org/fhir/StructureDefinition/patient-birthPlace` | **Draft in R4**; Trial-Use in the R5 extensions package. Canonical URL is **capital P** (`patient-birthPlace`) though the docs page is `extension-patient-birthplace.html` |
| `http://hl7.org/fhir/StructureDefinition/patient-birthTime` | Verified present in the R4 Patient example |
| `.../us/core/StructureDefinition/us-core-race`, `.../ethnicity` | US OMB race/ethnicity |

**Rules:** use canonical URLs under a namespace you control; make extensions **complex where possible** (extensible) rather than simple; **never overload an existing element to mean something else.**

---

# 8. M4 / M6 — Device integration and real-time transport

## 8.1 Why you need a gateway — the central argument ✅

Six arguments, in order of strength:

1. **Protocol mismatch.** A Philips IntelliVue speaks 11073 over a bespoke TCP association. A FHIR server speaks HTTPS + JSON. **Nothing translates them natively.** This is not an implementation detail — it is the primary architectural decision.
2. **Scale asymmetry.** 5 beds × ~10 parameters × 1–5 Hz = **50–250 messages/second** at one station. That is well beyond what a FHIR REST server should absorb as individual resource writes. **Batch on ingest**: one `transaction` Bundle per bed per N seconds, or waveforms as `Binary` + `valueSampledData`.
3. **Every device is different.** Dozens of vendors, dozens of nomenclatures. The gateway is the **single normalisation point** — the only place IEEE 11073 codes get mapped once to LOINC + UCUM. This is the translator/adapter pattern, and it's the defensible answer for a 5-bed system where you control the bedside hardware.
4. **Reliability.** Monitors buffer; networks hiccup. The gateway owns retry, sequencing, deduplication and gap-detection. **The FHIR server should be a durable archive, not the real-time path.**
5. **Safety boundary.** **Alarms must never wait on the FHIR server.** Architecturally exclude the FHIR server from the alarm loop.
6. **Time synchronisation.** Alarm thresholds, "time since event", NEWS2 and waveform alignment all need accurate time. Use NTP; record `Observation.issued` *and* `Observation.effectiveDateTime` and state which is which.

## 8.2 HL7 v2 / ORU^R01 ✅

Still the dominant standard for **legacy lab/radiology/pharmacy device interfaces**. `ORU^R01^ORU_R01` = O-bservation-R-eport / U-nsolicited.

**Why v2 is still everywhere in bedside monitoring:**
1. Monitors have shipped it for 25 years — it's a *solved, purchased, certified* integration
2. **FHIR cannot talk to a monitor directly.** FHIR is a *RESTful data model*; v2 is a *messaging standard*. There is no FHIR-speaking port on a 2015-vintage monitor. **v2 is the transport that already exists.**
3. Every v2 interface engine understands it (Mirth, HAPI, Rhapsody)
4. IHE standardised it: PCD-01 was a constrained HL7 v2.6 ORU^R01; the current `DEC` profile continues this; **SDPi's DEC Gateway maps SDC ⇄ v2**
5. **Downside is real:** the IHE PCD-01 message was measured at **~5.66× larger** than the raw IEEE 11073 encoding for a single BP reading (Lee et al., 2018) — the cost of v2's verbose, pipe-delimited, position-indexed format

**Segments:** `MSH` (header) · `PID` (identity) · `PV1` (visit — **room/bed here**) · `OBR` (grouping) · **`OBX`** (one per measurement) · `NTE` (notes).

```
OBX|1|NM|8867-4^Heart rate^LN||78|/min|f||20261019142300|||F
OBX|3|NM|8480-6^Systolic blood pressure^LN||120|mm Hg|f||20261019142300|||F
OBX|4|NM|59408-5^Oxygen saturation by pulse oximetry^LN||97|%|f||20261019142300|||F
```
`OBX-3` = observation identifier (code^system^display — **the codenominator**) · `OBX-6` = units (**UCUM goes here**) · `OBX-14` = date/time of the observation (**vital for a monitor**).

## 8.3 Transport comparison ✅

| | **FHIR over HTTPS** | **HL7 v2 over MLLP** | **MQTT** |
|---|---|---|---|
| Transport | HTTP/1.1 or /2, TLS | TCP 2575 (MLLP), 2576 (MLLP-S) | 1883 / MQTTS 8883 |
| Framing | HTTP + JSON/XML | `VT` … `FS CR` | Topic + payload |
| Direction | Pull + push (`Subscription`) | Push (one-way feed) | Native pub/sub |
| Acknowledgement | HTTP status | `ACK^R01` | **Built into QoS 1/2** |
| Latency | ~10–100 ms | ~5–50 ms | **~5–50 ms** |
| Payload efficiency | Verbose | Worse | ⭐ Best — topic carries metadata, payload is bare value |
| Offline tolerance | ❌ Fails if server down | ⚠️ Partial | ⭐⭐ **Queued QoS 1, replayed on reconnect** |
| Fan-out | N subscribers × N requests | Consumer must be addressed | ⭐ Native; N subscribers, one publish |
| Backpressure | 429/503 | Application-level | ⭐ Built in |
| Semantic layer | ⭐⭐⭐ Rich | Codes as strings | None built in |
| Regulatory recognition | ⭐⭐⭐ (ABDM, ONC, UK) | ⭐⭐ | ⭐ Low |
| Auditability | ⭐⭐⭐ `AuditEvent`, `Provenance` | Application-level | ⚠️ Broker logs only |

**Recommended layered architecture:**
```
Bedside monitors (11073 / vendor SDK)
        │
   ┌────▼─────────────────────────────────────────┐
   │  CENTRAL STATION / GATEWAY                    │
   │  • terminates 11073 associations              │
   │  • normalises 11073 MDC codes → LOINC + UCUM  │
   │  • applies NTP time sync                      │
   │  • emits MQTT (QoS 1) to the nurse station    │
   │  • AND writes durable FHIR R4 to the server   │
   └────┬────────────────────────┬────────────────┘
        │ MQTT QoS1              │ HTTPS + FHIR R4
        ▼                        ▼
  Nurse station             FHIR server (audit,
  (WebSocket → browser)     trends, ABDM export)
```

**Topic hierarchy:**
```
pms/v1/hospital/HOSP001/ward/ICU/bed/BED-01/device/MON-BED-01/param/8867-4
pms/v1/hospital/HOSP001/ward/ICU/bed/BED-01/alarm/HR-HIGH
pms/v1/hospital/HOSP001/ward/ICU/bed/BED-01/waveform/II-lead2
```
Wildcard: `pms/v1/hospital/HOSP001/ward/ICU/bed/BED-01/#`

## 8.4 ⚠️ Don't build a 5-bed real-time system on FHIR `Subscription` alone

R4 `Subscription` (FMM 3, Trial Use): `status`, `contact`, `end`, `reason`, **`criteria`** (a search string — same syntax as REST search, a nice design property), `error`, `channel{type, endpoint, payload, header}`. Channel types: `rest-hook`, `websocket`, `email`, `sms`, `message`.

**⚠️ Honest limitations:**
- The R4 WebSocket channel's advertised URL lives in a CapabilityStatement extension the spec literally marks **`subscriptions/webSocketUrl (todo)`** — underspecified. WebSocket support in R4 servers is patchy.
- *"There is no notification when a resource is deleted, or when a resource is updated so that it no longer meets the criteria."* **This is a real correctness gap for a monitoring system.**
- **FHIR guarantees no latency.** Trial Use, best-effort, lossy.
- **"Real clinical monitors are alarm-critical; a FHIR STU push mechanism is the wrong primary safety path."** ✅ — saying this out loud is a strong engineering judgement.

**R5 redesign** (the biggest structural change R4→R5): replaces `Subscription` with **`Subscription`** (config) + **`SubscriptionTopic`** (what to subscribe to, declared once) + **`SubscriptionStatus`** (server→client status/heartbeat). An official backport IG exists for R4 implementations.

**The realistic architecture:**

| Layer | Mechanism | Why |
|---|---|---|
| Bedside → central station | **MQTT** (QoS 1) or vendor SDK | Low-latency, survives FHIR server being down |
| Central station → nurse display | WebSocket | Push, low overhead |
| Central station → FHIR server | FHIR `rest-hook`, **empty payload** | Durable, auditable, replayable |
| Nurse station → history/trends | `GET /Observation?subject=...&_since=...` | FHIR's polling fallback |

Then **state the P99 latency budget** (e.g. sensor → nurse display < 2 s; alarm ≤ 1 s).

## 8.5 IHE SDPi — the modern device-integration framework ✅

**⚠️ 2026 structural update:** the **IHE Patient Care Devices (PCD) domain has been folded into IHE Devices (DEV).** DEV TF Rev 10.0 (2024-11-04) normative profiles: `ACM`, `DEC`, `IDCO`, `IPEC`, `PIV`, `RTM`.

**SDPi (Service-oriented Device Point-of-care Interoperability)** — joint HL7–IHE "Gemini" project (began early 2020). Current: **SDPi 2.4.1, published 2026-05-07.**

| Profile | Purpose |
|---|---|
| **SDPi-P** | Plug-and-trust — discovery + connectivity |
| **SDPi-R** | Reporting — **send medical data with an intended medical purpose** |
| **SDPi-A** | **Alerting — distributed alarm system**; options for DAS, alert delegation, user acknowledgement, remote signalling |
| **SDPi-xC** | External control |

**Backing IEEE 11073 SDC standards:** `11073-10207` BICEPS (semantic model) · `11073-20701` DEC · `11073-20702` MDPWS · `11073-10700`/`10701` PKP (Plug-and-Trust, 2022) · `11073-20601` Optimized Exchange Protocol (current revision **20601-2026**).

**SDPi alert transactions:** `DEV-38`/`DEV-39`/`DEV-40` Medical Alert Exchange/Publish/Status · `DEV-48`/`DEV-49` Distributed Alarm System.

**SDPi system types** map beautifully onto FHIR `Device.specialization.systemType`: **`DGW`** Data Gateway · **`CS`** Central Station · **`SAS`** Smart Alerting System · **`AGW`** Alert Gateway.

**SDPi §3:8.7.3 *Device: Physiologic monitor*** is a BICEPS containment-tree example in which a physiologic-monitor MDS comprises a blood-pressure VMD, a Context, and an AlertSystem. **Use this as the blueprint for your FHIR `Device.parent` hierarchy.** ✅

### ⭐⭐ The single most valuable finding in this section

SDPi 2.4 states, verbatim, about the FHIR gateway actor:
> *"The HL7 FHIR resources and related Point-of-Care Device FHIR Implementation Guide (PoCD FHIR IG) is **still under active development**. Initial mappings have been made from SDC to FHIR; however, **they are not yet ready for profiling and product implementation.**"*

And `uv-pocd` is still at **1.0.0-ballot3** with a placeholder description.

**→ There is no mature, published FHIR profile for IEEE 11073 bedside-monitor data. You cannot just adopt one.**

**Reframe this as a strength, not a gap:**
> *"No mature, published FHIR profile exists for IEEE 11073 bedside-monitor data — the PoCD FHIR IG (`uv-pocd`) remains at ballot and the SDPi supplement states its FHIR gateway is 'not yet ready for profiling and product implementation.' This project therefore defines its own R4 `Observation` profile for bedside vitals, modelled on the SDPi-R actor/transaction model."*

## 8.6 PCD-XR — the reliability pattern worth copying

**PCD-XR (Extended Reconciliation)** = the **two-phase commit** workflow that solves push-message reliability:
1. DOR sends a provisional report flagged `complete=false` / `final=false`
2. DOC stores it as provisional and returns an ACK with a **reconciliation handle**
3. DOR sends a second message flipping to `final=true` with that handle
4. Only then does the DOC commit

**→ At-most-once semantics with visible incompleteness.** The DOC never silently treats half a data set as complete.

**FHIR analogue:** create the Observation with `status = preliminary`, then `PUT` with `status = final` once all components have arrived. R4's status value set explicitly supports this lifecycle (`preliminary → final → amended/corrected`). **Designing and justifying a provisional observation state in a FHIR PMS is a strong, non-obvious engineering contribution.** ✅

**⚠️ Naming trap:** `PCD-XR`, `SDC` and `UCUM` are **three different things** and are routinely conflated. `PCD-XR` is an IHE **workflow/message profile** in the legacy HL7-v2 world. `SDC` is the **IEEE 11073 family**. `UCUM` is units. **SDPi deliberately supersedes PCD-XR.**

## 8.7 IEEE 11073-20601 association ✅

Legacy devices can't be given IP addresses and often can't do TLS. 11073-20601 provides a **point-to-point association over TCP, negotiated at the application layer inside TLS**.

1. Association Request (monitor → gateway)
2. Association Response (accept/reject + negotiated **Association Context**)
3. Association Release Request / Response

Then over the established association: RDE (hierarchical device description) → MDIB (config/capability tree) → Data notifications → **separate asynchronous Alerts stream**.

**Key properties:** Association Context negotiation makes the protocol **agnostic to the data model** · Discovery uses UDP multicast (239.165.127.63) or mDNS, so no manual configuration.

---

# 9. M7 — HMS integration (Phase 3)

## 9.1 Interfaces available on real bedside monitors ✅

| Interface | Detail | Use here |
|---|---|---|
| **RS-232 (MIB)** | Philips IntelliVue "MIB/RS-232 Interface"; Mindray converts UART → **RS-422**. Philips note: *"The IntelliVue Data Export Interface cannot be accessed via the LAN when connected to the Philips LAN… Communication via the MIB/RS-232 Interface is always possible."* | Legacy/fallback only. Point-to-point, proprietary framing. Scales badly |
| **RS-485 / RS-422** | Differential, longer reach | Better choice for RS-232-class links |
| **Ethernet (10/100 RJ-45)** | Mindray: *"Network Connector: RJ45 used to connect an ethernet network or a PC"*; BeneVision CMS requires Ethernet 802.3 ≥100 M | ⭐ **The primary interface.** Use Ethernet as the backbone |
| **USB** | Local peripherals only | ⚠️ **Do not** use for monitor→central data (no galvanic isolation guarantee) |
| **Bluetooth** | Not standard on bedside monitors; present on telemetry transmitters | ⚠️ **Recommend against** for a fixed 5-bed unit. Unlicensed ISM band, and the hospital already has 2.4 GHz Wi-Fi. Choose **wired Ethernet** or a dedicated **WMTS** network |
| **Wi-Fi** | BeneVision CMS supports "Wired, wireless, and dedicated WMTS network" | Only where cabling is impractical |
| **HL7** | Mindray PDS Protocol = **HL7 v2.3.1** using ch. 2 (Control/Query), 3 (Patient Admin), 7 (Observation Reporting). Framing `0x0B` … `0x1C 0x0D`, ISO 8859-1. eGateway exports **IHE HL7 PCD v2** | **To HIS/EMR, not normally bedside→central** |
| **NTP** | BeneVision CMS: *"Time Support: synchronizing with NTP server"* | **Essential** — without it alarm timelines across 5 beds won't reconcile |
| **IEEE 11073** | 🔴 Not found in any multi-parameter monitor reviewed | ⚠️ **Do not cite without verification** |

## 9.2 Reference central-station behaviour — Mindray BeneVision CMS ✅

This is the best-documented reference architecture for your assignment.

| Capability | Figure |
|---|---|
| Devices per central station | up to **64** (128 for Server Edition) |
| Whole network | up to **1,200** bedside devices |
| Topology | **3-layer** |
| Display | 1920×1080; up to 4 displays/station; **up to 36 patients** on one 1080p display; 16 at 1280×1024 |
| Waveforms | up to 8 per patient in sectors; 12 in full ViewBed |
| Trend review | **240 h** tabular + graphic |
| Full-disclosure waveforms | **240 h** (full and compressed) |
| Events | **3,000** events, each with **16 s of waveform before and after** the alarm |
| NIBP review | **3,000** measurements |
| 12-lead review | **720** results |
| Alarm | physiological / technical / system; high/medium/low/message; audible + visual |
| Remote control from central station | limits, **priority**, **pause**, reset — **bi-directional** |
| Speaker | **45–85 dB** alarm tones |
| UPS | 1000 VA, 220 V / 50 Hz |
| **Network failover** | *"Supports receiving the data generated during interruption from networked monitors and **combining the data**"* + RAID 1 + UPS |
| Security | LDAP, SSL, **RAID 1**, data backfilling, VMware virtualisation |
| Min host spec | 4 cores @ ≥2.9 GHz, 4 GB RAM (16 GB w/ eGateway), 500 GB |

## 9.3 Scaled-down design targets for 5 beds ✅

| Parameter | 30-bed class | **5-bed target** |
|---|---|---|
| Monitors per station | 64 | **8 (5 + 3 spare/hot-swap)** |
| Central host | 4-core/2.9 GHz, 4–16 GB, 500 GB | **2-core/2.5 GHz, 8 GB, 250 GB SSD** |
| Displays per station | 4 | **1 (1920×1080, ≥27")** |
| Patients per display | 16–36 | **5–8** (do not exceed 10) |
| UPS | 1000 VA | **1000 VA / 1 kVA online, ≥30 min** |
| Network | 3-layer, 1200 devices | **1 managed 8–16 port switch on a dedicated VLAN** |
| Storage depth | 240 h full-disclosure | **≥72 h full-disclosure + 30 days trends** |
| Spare capacity | — | **≥20%** |

**Design decisions to state and justify:**
1. **Ethernet (10/100) as the sole bedside→central transport.** RS-232 is point-to-point and proprietary; USB has no isolation guarantee.
2. **NTP server on the central station**, all 5 beds + view stations + recorder synchronised to sub-second alignment.
3. **VLAN separation.** Monitoring traffic must be separate from EMR/HL7 traffic — clinical monitoring should not compete with PACS or hospital Wi-Fi.
4. **Bi-directional alarm control** (limits, priority, pause, silence, reset) — but **lock Responsible-Organisation presets** per 60601-1-8.
5. **Data backfill on reconnect.** When a bed returns after a network drop, merge and de-duplicate.
6. **Host redundancy (RAID 1) + UPS** — the central station is a single point of failure for all 5 beds.
7. **Document end-to-end alarm latency** and disclose per 60601-1-8 §6.4.2.
8. **Do not put the monitor on the hospital EMR VLAN** without a gateway. The correct layering is monitor → central station → gateway → HIS/EMR via HL7.

## 9.4 Other bedside instruments

**ESU / diathermy** — see §4. **Smoke evacuator** — ≥2,000 L/min (open surgery), 500–800 L/min (laparoscopy), carbon + HEPA biofilter. Smoke contains benzene, toluene, xylene, phenol, formaldehyde, HCN. **Integration:** many units expose a remote activation port; require **ESU activation and smoke evacuation to be logged together**; the "filter full" indicator should feed the BMS.

**Glucometer** — amperometric enzymatic biosensor, GOD or GDH (FAD/PQQ). ~0.5–1.0 µL capillary whole blood. **ISO 15197:2013:** ≥95% within ±15 mg/dL (<100) or ±15% (≥100); ≥99% in Clarke zones A+B. **Specify GDH-FAD** — GDH-PQQ is uniquely vulnerable to maltose/icodextrin interference; GDH-FAD removes haematocrit, pO₂ and most drug interference. **⚠️ Honest design statement: glucometers are stand-alone, non-networked point-of-care devices with no standard interface.** Integration is by *protocol* — a reading that triggers a sepsis screen (NEWS2) or hypoglycaemia alarm, entered by QR scan into the EMR, then reaching the central station via HL7. **The PMS itself does not read the glucometer.**

**Infusion pumps** — IEC 60601-2-24. Syringe MPE **±2%**, volumetric **±5%** 🟡 (verify — the standard itself says MPE "shall be defined by the manufacturer"). **This is where real, standard integration exists** (BeneLink; HL7). **⚠️ Critical NIBP interference:** pumps cycling at 1–10 Hz produce pressure pulsations in the IV line; if the line runs through the same arm as the cuff, it corrupts the oscillogram. Also, **cuff on the same arm as the IV occludes the line, causing a pump back-pressure alarm** — the PMS should surface pump alarms centrally so staff see the cause.

**Nurse call** — **⚠️ Most Indian nurse-call systems have no interface to the patient monitor; they are a parallel system.** Where integration exists, three grades: **(1) relay/BNC contact closure** from the monitor's nurse-call output (cheapest; Mindray BeneView exposes a BNC auxi output; Datex-Ohmeda S/5 has 2 fixed + 2 configurable) · **(2) HL7/serial via an integration engine** · **(3) direct networking.**
**⚠️ Critical standards point: once monitor alarms are routed to a nurse-call system, it becomes a Distributed Alarm System under 60601-1-8 and inherits all §6.4.2 delay-disclosure obligations. Do not do this casually.**
**Recommended severity hierarchy to specify:** Code Blue > monitor HIGH > monitor MEDIUM > Code Red > monitor LOW > routine nurse call. ✅

---

# 10. Alarm engineering

## 10.1 Auditory alarm specification 🟡

| Parameter | Value |
|---|---|
| Individual pulse fundamental frequency | **150–1000 Hz** |
| At least four harmonics must be present | **300–4000 Hz** |
| Overall alarm signal band | **200 Hz – 5000 Hz** |
| High-priority temporal pattern | **10 pulses of equal duration**, interpulse rhythm **3-2-3-2**, then a longer interburst interval |
| Inter-pulse gap detail | 10 pulses, or two sets of 5; **0.35–1.3 s** delay between the fifth and sixth |
| Relative SPL of harmonics | within **±15 dB** of each other |
| Medium-priority reserved melody | musical notes **"c – e – g"** |

**Why AMD2 (2020) exists:** *"each of the **eight high-priority auditory alarm signals** had the same acoustic structure and same temporal pattern. The only difference could be found in their **pitch patterns**."*

**🔴 NOT VERIFIED — do not cite:** Table 3 pulse **repetition rates in pulses/minute** per priority · exact burst structure per priority · **minimum SPL in dB(A)** and required margin above ambient · visual alarm colour/flash/duty cycle.

## 10.2 Alarm delay, silence and pause 🟡

- **AUDIO PAUSED** = limited duration; **AUDIO OFF** = indefinite. **These must be distinguishable.**
- **LATCHING ALARM SIGNAL** continues after the trigger disappears until deliberately stopped by the operator.
- **DE-ESCALATION / ESCALATION** — priority changes with time or context.
- **INTELLIGENT ALARM SYSTEM** — logical decisions without operator intervention (e.g. rate-of-change escalation, suppression when a higher-priority alarm recently fired).
- ⚠️ *Astute Labs: "if alarm silencing prevents a high-priority condition from re-annunciating while the condition is still active, it can create a compliance issue."*
- **Nuisance-alarm rates: IEC 60601-1-8 sets no numeric budget.** 🔴 No such requirement exists. Use peer-reviewed literature and frame it as **your own design target**, not as a standard requirement.

## 10.3 Default alarm limits (clinical practice, **not** standard-mandated) 🟡

| Parameter | Low | High | Typical priority |
|---|---|---|---|
| HR (ECG) | **50 bpm** | **120 bpm** | High for extreme brady/tachy; **asystole/VF always HIGH** |
| SpO₂ | **90%** (92–94% for COPD/CO₂ retainers) | — | High |
| NIBP SBP | 90 mmHg | 160 mmHg | Medium/High |
| NIBP DBP | 50 mmHg | 100 mmHg | Medium |
| **NIBP MAP** | **65 mmHg** | **110 mmHg** | **High** (vasopressor titration target) |
| Temperature | 36.0 °C | 38.0 °C (38.3/39 for sepsis) | Medium |
| RR | 8 (adult) / 5 | 30 | Medium |
| Artificial pacemaker | HR < set rate | — | High |

IEC 60601-2-27 adds: **asystole alarm delay default 4 s**; **VTach default 6 PVC/min at 110 bpm**. Mindray's DPM 6–7 clinical guideline instructs clinicians to change high HR to 130, low SpO₂ to 87%, low RR to 5 — **showing these limits are per-patient-category and mutable.**

## 10.4 Alarm fatigue — the honest engineering caveat ✅

**Alarm fatigue is the #1 cause of missed clinically significant alarms in ICUs.** A well-designed 5-bed system should include:

- **NIBP-aware SpO₂ suppression** (Masimo "NIBP Simul" is on by default on Mindray) — SpO₂ alarms suspended during cuff inflation to prevent the classic inflation artefact alarm. **State explicitly that this is a delay, disclosed per 6.4.1.**
- **Lead-off / probe-off *technical* alarms distinguished from *physiological* alarms** (80601-2-49 defines both)
- **Central-station alarm statistics**

---

# 11. Hospital electrical safety (M3 grounding points)

**IEC 60364-7-710:2021 (Ed. 2.0)** — applies to electrical installations in medical locations: *"hospitals and clinics or equivalent institutions."* ✅

**Clause structure:** 710.30 Assessment of general characteristics · 710.31 Purposes, supplies and structure · 710.313 Supplies · 710.314 Division of installation · 710.41 Protection against electric shock · 710.411 Protective measure: automatic disconnection.

**Components required for a medical IT system** 🟡: switching (changeover) device between general and safety supply · distribution consisting of **isolating transformer** · **insulation monitoring device (IMD) in accordance with IEC 61557-8** · automatic insulation-fault disconnection.

| Requirement | Relevance to the ward design |
|---|---|
| **Medical IT system** (isolated, ungrounded, 400 V line-to-line) | First line of defence for the bedhead group |
| **Isolating medical location transformer** | Powers the "critical" branch |
| **IMD to IEC 61557-8** | Continuous insulation surveillance; alarm to staff |
| **Equipotential bonding** | Patient-area protective bonding conductor; reduces touch potential |
| **Group-based supply division** | Determines which outlets your PMS plugs into |
| Essential-supply changeover | Battery-supported safety power supply |

🔴 **Not verified:** conductor sizes, the "10 s / 15 min" IT-system monitoring response convention, RCD parameters per group.

**Equotable national guidance (🔴 unverified):** UK **HTM 06-02** (electrical services – medical locations), **HTM 08-01/08-02** (electrical safety), **HTM 08-03** (bedhead services / nurse call) · US **NFPA 99** · Germany **DIN VDE 0100-7-710**.

**Periodic testing:** IEC 62353 🟡 (UK practice).

**Nurse call:** there is **no single dedicated IEC standard called "nurse call systems."** It falls across 60601-1-8 (as an alarm system), national guidance (HTM 08-03), and product safety (VDE 0834 parts 1 & 2).

---

# 12. Privacy and de-identification (M6/M8)

## 12.1 What "De-health" most likely means — and what to write instead

⚠️ **There is no "De-health" standard.** If the brief means **de-identification**, here is the substance:

**Two routes under HIPAA Privacy Rule, 45 CFR §164.514(b):**
- **(a) Expert Determination** §164.514(b)(1) — a qualified person determines the re-identification risk is "very small" **and documents the method**
- **(b) Safe Harbor** §164.514(b)(2) — remove all **18 listed identifiers** **and** have no actual knowledge the residual data could identify anyone

**HIPAA Safe Harbor — 18 identifiers** (45 CFR §164.514(b)(2)(i)): names · geographic subdivisions smaller than a State (except 3-digit ZIP under conditions) · **all elements of dates except year** (birth, admission, discharge, date of death) and **all ages over 89** · telephone · fax · email · SSN · **medical record numbers** · health plan beneficiary numbers · account numbers · certificate/licence numbers · vehicle identifiers · **device identifiers and serial numbers** · URLs · **IP addresses** · biometric identifiers · **full face photographs** · any other unique identifying number, characteristic or code.

**⚠️ HIPAA is US law with no force in India.** Use it as a well-understood design checklist, not a legal requirement. The binding laws are the **DPDP Act 2023** and the **ABDM framework**.

**⚠️ Why Safe Harbor is painful for a patient monitor specifically:**

| Safe Harbor item | Why it hurts a PMS |
|---|---|
| **(C) Dates except year** | **You cannot keep `effectiveDateTime`.** Continuous monitoring means one timestamp per sample. Generalise to day granularity or relative offset from admission |
| **(C) Ages over 89** | Collapse the elderly band |
| **(B) Geography below State** | **Your `Location`/bed number is an identifier.** "Bed 3 in ICU at Hospital X" is quasi-identifying in a small unit. **Generalise `Location`, not just `Patient`** |
| **(M) Device identifiers** | ⚠️ **Directly hits `Device.serialNumber`, `udiCarrier.deviceIdentifier`, `manufacturer`, `location`.** Your whole device-inventory model needs a de-identified variant |
| **(H) MRN** | Kills `Patient.identifier` — your primary join key |
| **(R) Any other unique code** | Kills resource ids, MQTT client ids, timestamps-as-unique-values |

**⚠️ The sharpest observation available to you:**
> A 5-bed ICU monitor produces **high-frequency longitudinal data**, which raises re-identification risk far above an isolated lab result. **A patient in a 5-bed unit is trivially identifiable by their unique HR trace alone, even with all 18 identifiers stripped.**

→ This is a genuinely sharp argument for **Expert Determination over Safe Harbor** in this context. ✅

**The recommended design — a two-dataset split:**
1. **Clinically-operational dataset** (full fidelity, real MRN, real serial numbers, second-resolution timestamps) — **pseudonymised**, not de-identified. Access-controlled, RBAC + SMART-on-FHIR scopes + `AuditEvent`. **Never leaves the hospital boundary.**
2. **De-identified research/analytics dataset** — Safe Harbor or Expert Determination applied, exported as a `Bundle` with a **synthetic identifier**.

Also relevant: **§164.514(e) Limited Data Set** — 16 identifiers removed (all except geography and "any other unique code"), permitted for research/public health/healthcare operations under a **Data Use Agreement**. Often the right middle ground.

## 12.2 India's DPDP Act, 2023 ✅

**Notified in force 14 November 2025** with the **DPDP Rules, 2025**, on a staggered commencement: 14 Nov 2025 (core institutional) · 14 Nov 2026 (notice & consent / Data Principal rights) · 14 May 2027 (remaining, incl. the **Data Protection Board of India**).

**Architecture:** **Digital Personal Data** (processed in connection with a Digital Personal Data Facility — offline data is out of scope unless digitised) · **Data Principal** (the patient) · **Data Fiduciary** (your hospital) · **Data Processor** (your PMS vendor) · **Consent Manager** · **Significant Data Fiduciary** (extra obligations).

**Obligations relevant here:** notice · **consent** (§5 — notices in English or any of the 22 scheduled languages, readable by a child) · **purpose limitation** (§6 — no detrimental treatment based on automated decision-making) · data accuracy (§8) · **storage limitation** (retain only as long as necessary) · **security safeguards** (risk-based — a vital-sign stream demands stronger controls than demographics) · **breach notification** · **erasure** (§12, subject to lawful retention) · data principal rights · data fiduciary duties (audit, erase on withdrawal, grievance redressal) · child data (verifiable parental consent) · cross-border transfer restricted to India · Data Protection Board.

**⚠️ The most important limitation to state:**
> **The DPDP Act 2023 is a *consent- and fiduciary-architecture* law, not a *de-identification* law.** Unlike HIPAA it has **no Safe Harbor, no 18 identifiers, and no Expert Determination route.** Its privacy model is *consent + accountability*, not *anonymisation*.

So you cannot claim "our data is de-identified under DPDP." What you can say: *"we pseudonymise at the boundary, apply a HIPAA Safe Harbor-style minimisation for analytics export, and rely on consent + security safeguards + the Data Fiduciary's audit obligations as the operative controls."* ✅ **Worth a paragraph — precisely what separates a strong report from a copy-paste one.**

**⚠️ Tension to flag:** DPDP storage limitation vs. **medical record retention governed by the 2023 amended Clinical Establishments Act/Rules.** Not identical — note it.

## 12.3 ISO/IEC 27001 and 27701 ✅

- **ISO/IEC 27001:2022** — ISMS, security not privacy. Annex A has organisational/people/physical/technological controls. Relevant: access control, cryptography, logging, network segmentation (**isolate the OT/medical device VLAN from clinical and from the internet** — IEC 62443 territory), supplier security for the monitor vendor, incident management, business continuity.
- **ISO/IEC 27701:2019** was joint ISMS+PIMS (you needed both). **ISO/IEC 27701:2025** is now a **standalone PIMS standard** — no longer requires 27001 certification alongside it.
- **27001 = "is it secure?" · 27701 = "is personal data handled lawfully and transparently?"**

> **DPDP Act 2023 is law you must comply with. ISO 27001/27701 are management-system frameworks you align to. HIPAA Safe Harbor is a design checklist you borrow.**

**Do not claim certification for a student project — claim alignment.**

## 12.4 ABDM Health Data Management Policy

Guiding principle: **"Security and Privacy by Design."** ABHA is linked to records; sharing happens via the **Health Information Exchange + Consent Manager** — consent-gated and patient-controlled. ✅

🔴 **Genuine gap:** ABDM developer docs cover encryption and audit but publish **no RBAC model and no key-management scheme** (rotation, HSM, custody). Source from `abdm.gov.in/strapicms/uploads/health_management_policy_*.pdf` and the DPDP Act.

---

# 13. Terminology (LOINC / UCUM / SNOMED CT / ICD)

| System | URI | Governs | Licence |
|---|---|---|---|
| **SNOMED CT** | `http://snomed.info/sct` | **Clinical meaning** — diagnoses, procedures, symptoms, anatomy, body sites, allergy agents, findings (~350k concepts) | ⚠️ **Free in Member countries. India IS a Member** ✅ |
| **LOINC** | `http://loinc.org` | **What you measured** — observations, test names, panels (~130k codes). 6-part FSN: `<component>:<property>:<system>:<time>:<scale>:<method>` | ✅ **Free**, no registration needed to use |
| **UCUM** | `http://unitsofmeasure.org` | **Units of measure only** — purely dimensional | ✅ Free |
| **ICD-10/11** | WHO URIs | **Diagnosis / billing classification** | ⚠️ WHO copyright |

> **SNOMED CT says *what the thing is*. LOINC says *what you measured*. UCUM says *in what units*. ICD says *what the diagnosis was, for the ledger*.**

### ✅ India's SNOMED position — a point most reports miss

`snomed.org/members` lists **India** under Asia Pacific (54 Members total).
→ **SNOMED CT is free for Indian use under a free SNOMED Affiliate Licence.** Register for it, use SNOMED CT freely for clinical coding, and **say so in the report.** This is a real, concrete, correct point about Indian digital-health infrastructure.

### Where to use which

| Element | Terminology | Example |
|---|---|---|
| `Observation.code` | **LOINC** | Non-negotiable for vitals |
| `Observation.valueQuantity.system/code` | **UCUM** | |
| `Observation.bodySite` | **SNOMED CT** | `368209003` Right upper arm |
| `Observation.method` | LOINC method axis | `59408-5`'s method is LOINC **LP6469-3** "Pulse oximetry" |
| `Observation.interpretation` | HL7 v3 | `N`, `L`, `H`, `HH`, `LL`, `A`, `AA` |
| `Observation.referenceRange` | `Quantity` + `Range` | **Age is a Range — paediatric normals differ; this matters clinically** |
| `Device.specialization.systemType` | local | e.g. `IEEE 11073-20601` |
| `Condition.code` | **ICD-10** (billing) + **SNOMED CT** (meaning) | Keep both |
| `Encounter.class` | HL7 v3 ActCode | `IMP` |

**Dual-coding matters in India:** carrying both LOINC and SNOMED on the same element lets one record serve both a clinical user and a billing/reporting user.

---

# 14. Cost reference (India)

## 14.1 Bedside monitors

| Model | INR | Source |
|---|---|---|
| Contec CMS8000 | ₹32,947 | biomedsuppliers.com |
| BPL Ultima Prime | ₹78,457 | biomedsuppliers.com |
| Mindray BeneView T8 | ₹99,000 | accu-mart.com |
| Mindray BeneVision N15 | ₹2,09,172 (MRP ₹2,54,006) | Medicom Healthcare |
| Philips Efficia CM10 | ₹1,46,000 | biomedsuppliers.com |
| GE Healthcare B450 | ₹2,50,000 | biomedsuppliers.com |
| GE CARESCAPE B650 | up to ₹5,00,000 | biomedsuppliers.com |
| Mindray BeneVision N12 (modular, Masimo SET) | ₹3,91,000 | accu-mart.com |
| **Philips IntelliVue MP50/MP70 (used/refurb)** | ₹65,000–₹75,000 | ⚠️ **not comparable to new; often grey-market** |
| Nihon Kohden CNS-9101 central monitor 24" | ₹14,000 | IndiaMART |

**⚠️ Price integrity flags:** refurbished ≠ new · modularity tiers explain N12 vs N15 vs uMEC100 spread · **GST treatment varies** (18% GST on most devices; customs + 18% IGST on imports) so institutional quotes are often substantially above listed MRP · GeM/PMABHIM procurement differs again.

## 14.2 Central stations

| System | INR |
|---|---|
| Generic "Central Patient Monitoring System" listing | ₹14,000/piece |
| Contec Central PMS | ₹28,000 |
| Digi-Tech wireless standard (25 beds) | ₹45,000 |
| WREN Central PMS | ₹1,05,000 |
| Mindray BeneVision CMS | "Call for pricing" |

## 14.3 Consumables

| Consumable | Indicative INR |
|---|---|
| ECG electrodes disposable Ag/AgCl PE foam (50 pk) | ₹148/pack (₹2.95 ea); 3M ₹499–₹999/100 |
| ECG cable 3-lead / 5-lead | ₹900–₹1,200 / ₹1,000–₹1,200 |
| ECG cable 10-lead Philips 15-pin | ₹1,300–₹1,500 |
| SpO₂ probe adult clip generic | ₹1,000–₹1,500; Contec ₹1,792–₹3,200; Masimo ₹2,800 |
| NIBP cuff reusable adult latex-free TPU | ₹150–₹504; Philips ₹1,750–₹3,500 |
| NIBP cuff disposable neonatal | ₹120–₹250 |
| NIBP hose 1 m with connectors | ₹1,140–₹1,200 |
| Temperature probe skin 3-pin | ₹1,250 |
| Temperature probe cover/sheath (100 pk) | ₹200–🔴 ₹600 (not verified) |
| Glucose strips (50) | ₹660–₹1,245 (RSSDI 2024) |
| Lancets (100) | ₹105–₹200 |

**Per-patient-day consumables: ≈ ₹300–₹1,200**, dominated by whether you mandate single-patient SpO₂ disposables. **That single policy decision is the biggest cost lever in the whole system — worth stating explicitly.**

## 14.4 Other equipment

| | Range (INR) |
|---|---|
| ESU / diathermy | ₹30,000 – ₹6,90,000 (typical 400 W unit: 230 V, 50 Hz, 500 kHz) |
| Smoke evacuator | ₹1,20,000 – ₹5,00,000 |
| Infusion pump (syringe / volumetric) | ₹30,500 – ₹1,80,000 / ₹38,000 – ₹87,500 |
| Nurse call (whole system) | ₹3,000 – ₹51,200 (~₹2,000–₹5,000/bed wired) |

## 14.5 System budget — 5 beds, new build

| Line item | INR |
|---|---|
| 5 × bedside monitor (mid-tier) | ₹4,75,000 – ₹7,50,000 |
| 2 × spare/transport monitors | ₹1,50,000 – ₹4,00,000 |
| Central station (server + 2 view stations + 1 kVA UPS + switch + printer + 3-ch recorder) | ₹3,00,000 – ₹8,00,000 |
| ECG cables, 5-bed × 5-lead + spares | ₹40,000 – ₹1,00,000 |
| SpO₂ probes, 5 × reusable + 2 spare | ₹10,000 – ₹30,000 |
| NIBP cuffs + hoses, 5 beds × 2 sizes | ₹10,000 – ₹40,000 |
| Temperature probes, 5 × 2 | ₹12,000 – ₹25,000 |
| Nurse call, 5 beds | ₹15,000 – ₹50,000 |
| Structured cabling, network points, installation | ₹50,000 – ₹2,00,000 |
| **Capital subtotal** | **₹10 – ₹25 lakh** |
| Annual AMC (8–12%) 🟡 | ₹1,00,000 – ₹2,50,000 |
| **Annual consumables** (5 beds × 7 days × 365) | **₹3.8 – ₹15 lakh** |

Low tier (Contec/BPL class at ₹33,000–₹99,000) can bring capital to **₹5–₹8 lakh**, at the cost of algorithm quality, alarm sophistication and support network.

---

# 15. Two work items to watch (adds currency to the report)

1. **ISO/IEC JWG22 `80601-2-86`** — will replace IEC 60601-2-25, 60601-2-27 and 60601-2-47, folding in AAMI EC12 (electrodes), EC53 (cables/leadwires) and EC57 (arrhythmia analysis). 🟡 Cite 2-27 as current and note 80601-2-86 as forthcoming.
2. **ISO/FDIS 80601-2-56** — temperature standard revision imminent. ISO stage 90.92.

Also: **IHE SDPi 2.4.1 (2026-05-07)** and **IHE PCMC (2026-10-01)** (Point-of-Care Monitored Communication — literally about continuous monitoring) are both recent. Citing them by name and date demonstrates you read primary sources.

---

# 16. Two sentences that will read as genuine standards literacy

> *"No mature, published FHIR profile exists for IEEE 11073 bedside-monitor data — the PoCD FHIR IG (`uv-pocd`) remains at ballot and the SDPi 2.4.1 supplement states its FHIR gateway is 'not yet ready for profiling and product implementation.' This project therefore defines its own R4 `Observation` profile for bedside vitals, modelled on the SDPi-R actor/transaction model."*

> *"A FHIR `Subscription` is Trial Use, best-effort and non-guaranteeing of delivery, deletion or ordering, and is therefore architecturally unsuitable as the primary real-time alarm path for a patient monitor. The design uses MQTT QoS 1 for the real-time feed and FHIR R4 REST for the durable, auditable record, with alarms carried on a separate high-priority channel per the IHE PCD Continuous Observation Report rule and the SDPi-A alert transactions (DEV-38/39/40)."*

---

# 17. Confidence register — what to double-check before citing

| Item | Status | Action |
|---|---|---|
| All standard edition numbers, dates, scopes | ✅ | Cite directly |
| Applied-part leakage current **limits** | 🔴 | Buy IEC 60601-1 Ed. 3.2, Table 4 |
| Dielectric withstand, creepage, clearance tables | 🔴 | Buy the standard |
| 60601-1-2 immunity levels + proximity-field table | 🔴 | Buy 60601-1-2 Ed. 4.1 |
| 60601-1-8 Table 3 pulse rates, min SPL, visual alarm | 🔴 | Buy 60601-1-8 Ed. 2.2. **Do NOT use tda-buzzer.com** |
| ECG HR range/sampling/lead-off per 60601-2-27 | 🔴 | Buy 60601-2-27 Ed. 3.0 |
| NIBP MAP algorithm, cuff sizes, modes | 🔴 | Buy 80601-2-30:2018; check ISO 81060-2 |
| SpO₂ ±2%, perfusion index | 🔴 | Buy ISO 80601-2-61:**2026** |
| Temperature ±0.1 °C as a standard limit | 🔴 **probably wrong** | Buy ISO 80601-2-56:2017+Amd1:2018 |
| HF leakage 150 mA / 200 Ω | 🟡 | Verify clause in 60601-2-2 Ed. 6.1 |
| IEC 80001-1 edition | 🔴 | Verify |
| **Short-wave diathermy particular standard** | 🔴 | **Verify — do not assume 60601-2-2** |
| Nuisance-alarm rates as a *standard* requirement | 🔴 **no such requirement exists** | Use literature + state as your own design target |
| HTM 06-02 / NFPA 99 / VDE 0100-7-710 clause content | 🔴 | Verify if cited |
| Electrosurgical smoke (NIOSH) | 🔴 | Not researched — cdc.gov/niosh |
| IEEE 11073 in multi-parameter monitors | 🔴 no evidence found | **Do not cite** |
| Infusion pump ±2%/±5% | 🟡 | Standard says MPE is manufacturer-defined |
| ABHA = SHA-256 hash | ✅ **refuted** | Do not assert |
| Legacy ABDM endpoints | ✅ **dead** | Build against v3 only |
| BP/LEAKAGE/CMRR derived figures (30–50 kΩ, >100 dB) | 🟡 | Present as *design* values, not standard limits |
| AMCs as % of capital | 🟡 general practice | Obtain quotations |

---

# 18. Next steps

**For Phase 1 deliverables:**
- **M1** — Requirements checklist is fully supported: §2 (classification, DAS, alarm framework), §11 (electrical safety), §4 (diathermy). Ready to write.
- **M2** — Instrument spec table is fully supported: §3.1 summary table plus the per-instrument detail. **Decide and state the "diathermy" meaning first.**

**Suggested clarifications to get from your instructor:**
1. Is **"De-health"** in M2 a typo for "Digital health," or does it mean de-identification?
2. What does **"VOC diathermy"** in M1 refer to — electrosurgery, short-wave diathermy, or a general RF source?
3. Does the brief expect **3-lead or 12-lead ECG**? (M3 says "12-lead or 3-lead" — the choice materially changes isolation design, cabling and cost.)
4. Is **M3 meant to be a drawn schematic or a CAD drawing**?
5. For **M6**, is a real ABDM sandbox integration expected, or a design-level data flow diagram?
6. Which **relational DBMS** for M5 — the brief says "RDBMS schema" and "DDL" but names no engine.
