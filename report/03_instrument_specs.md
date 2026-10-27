# 3. Instrument Specifications (Milestone M2)

The brief asks for each bedside device to be specified by signal type, power
rating and isolation class. This section provides those, and additionally
records the measurement physics, because the accuracy figures in any
specification table are only meaningful alongside the method that produced
them.

**A framing that governs the whole section:** all four measurements are
estimations from indirect proxies, not direct measurements. Mean arterial
pressure is inferred from the shape of an oscillogram. Oxygen saturation is
inferred from a ratio of absorbances through a scattering tissue bed. The
strongest engineering content available here is therefore not the numbers but
the error budgets behind them.

## 3.1 Summary specification table

| | **ECG** | **NIBP** | **SpO₂** | **Body temperature** |
|---|---|---|---|---|
| **Signal type** | Surface electrical potential, DC-coupled | Pressure oscillations superimposed on a cuff ramp | Optical transmittance, two wavelengths | Resistive (NTC thermistor) |
| **Amplitude** | ~1 mV against ±300 mV electrode offset | AC 0.1–10 % of a 0–300 mmHg DC ramp | AC ≈ 0.01–10 % of DC | NTC ≈ 10 kΩ @ 25 °C |
| **Principle** | Differential amplification across Einthoven / Wilson terminals | Cuff occludes artery and acts as transducer | Beer–Lambert, ratio-of-ratios | Steinhart–Hart R–T conversion |
| **Bandwidth** | 0.5–40 Hz monitoring | DC to ~40 Hz envelope | ~1–5 Hz pulse | 0.1–10 s response |
| **Accuracy** | Gain ±5 % | Mean ≤ 5 mmHg, SD ≤ 8 mmHg | ±2 % over 70–100 % | Lab ≤ ±0.3 °C |
| **Applied part** | **Type CF, defibrillation-proof** | Type BF | Type BF, defib-proof | Type BF |
| **Isolation barrier** | 2 MOPP, 4 kV RMS / 1 min | 2 MOPP, 4 kV RMS / 1 min | 2 MOPP, 4 kV RMS / 1 min | 2 MOPP, 4 kV RMS / 1 min |
| **Patient leakage (normal)** | 10 µA | 100 µA | 100 µA | 100 µA |
| **Supply** | 100–240 V AC → 12 V bus | same, plus pneumatic drive | same, isolated sensor rail | same, low current |
| **Power (whole monitor)** | 60–100 W design figure | — | — | — |
| **Standard** | IEC 60601-2-27 | IEC 80601-2-30 | ISO 80601-2-61 | ISO 80601-2-56 |

## 3.2 Isolation architecture — the central design decision

Under **IEC 80601-2-49** the design must choose between two arrangements, and the
choice determines whether the standard is tractable to demonstrate.

A *single function* is the measurement of one physiological parameter. The
standard permits **one applied part carrying multiple single functions** that all
share a single circuit reference. It also permits **multiple separate applied
parts**, each independently isolated.

The first arrangement creates **potential leakage-current paths between single
functions** — ECG, SpO₂, NIBP and temperature all referenced to one common point —
which must each be tested. The testing asymmetry makes the second arrangement far
more practical: for a Type BF applied part all patient connections are tied
together at one measurement point, but for **Type CF each patient connection is
measured individually**, because the limit is ten times tighter.

> **Design decision: each bed's ECG forms its own isolated Type CF domain, with
> SpO₂, NIBP and temperature on a separately isolated Type BF domain.**

This makes 80601-2-49 compliance demonstrable module by module and allows a
parameter module to be hot-swapped without re-testing the entire patient
connection.

The applied-part assignment follows from this:

| Applied part | Class | Justification |
|---|---|---|
| ECG electrodes and lead wires | **Type CF, defibrillation-proof** | Chest electrodes on a patient with an intracardiac catheter or surgical chest access are effectively direct cardiac application |
| SpO₂ probe | Type BF, defibrillation-proof | Non-invasive, not applied to the heart |
| NIBP cuff and hose | Type BF | Non-invasive, limb |
| Temperature probe | Type BF | Non-invasive |

The Type CF limit is ten times tighter than Type BF for a stated reason:
**34 µA rms at 50 or 60 Hz through the heart can compromise cardiac function.**
That figure is the physiological threshold, and it is what makes the ECG
barrier a design constraint rather than a compliance formality.

## 3.3 ECG

**Working principle.** The myocardium acts as a volume current dipole, producing
body-surface potentials of order 0.5–4 mV. Each electrode–electrolyte interface
presents a DC half-cell potential of about +0.22 V for Ag/AgCl. These offsets are
common-mode and self-cancelling *only if the electrodes are chemically identical*.
The resulting input DC offset is therefore typically ±300 mV against a 1–2 mV
signal: **a dynamic-range problem of 100–300 dB**, and the defining engineering
constraint of the ECG front end.

**Front-end chain.**

```
electrode → DC blocking → instrumentation amplifier → right-leg drive
          → anti-ESU filter → 24-bit ADC → digital filter → display
```

| Parameter | Design value |
|---|---|
| Electrode–skin impedance target | ≤ 5 kΩ per junction |
| Alarm threshold on electrode impedance | > 30 kΩ |
| DC current into patient leads | ≤ 0.1 µA |
| System noise, referred to input | ≤ 30 µV p-p over 10 s |
| Common-mode rejection, system test | ≤ 1 mV p-p for 20 V rms at 50 Hz injected through 100 pF |
| Right-leg-drive series resistor | > 330 kΩ, to hold RLD current < 10 µA even in single fault |

**A note on the mains notch.** India's supply is 50 Hz, so the notch must be
set to 50 Hz, not 60 Hz. This is a small specification line with a large
practical consequence: a 60 Hz notch leaves the fundamental mains component
inside the ECG passband.

**Calibration.** The full standard is **10 mm/mV**; fixed gains of 20, 10 and
5 mm/mV are selectable, with ±5 % gain accuracy. The commonly quoted
**5 mm/mV is half-standardisation** — the same thing as "0.5 mV/cm", and it
is a display choice, not the standard gain.

**Bandwidth and its bench test.** Diagnostic bandwidth is 0.05–150 Hz, verified
by a 20 ms triangular wave showing at most 12 % amplitude reduction. Monitoring
bandwidth is 0.5–40 Hz, verified by a 40 ms triangular wave allowing 30 %
reduction.

> **Design decision: the system defaults to monitoring bandwidth
> (0.5–40 Hz) with a hardware baseline-reset function, and the diagnostic mode
> is labelled as not defibrillation-certified.**

The reason is a recovery-time problem. A 0.05 Hz high-pass has a 20 s time
constant. After a defibrillator pulse of roughly 1000× normal signal amplitude,
the trace can take 10–15 s to become visible again, with residual offsets of
5–50 mV. Monitors commonly pass the defibrillation-recovery test with the
monitoring filter and fail with the diagnostic filter, and the standards do not
mandate which filter is used. Making baseline reset independent of filter
selection is a risk-management requirement, not a convenience.

**Cabling.** Trunk cables are proprietary and **not interchangeable** between
vendors. Both the AHA and IEC electrode colour conventions remain in service, so
the chosen convention must be stated explicitly or the wrong leadwires will be
purchased. A published manufacturer recall covering 58,045 trunk cables
worldwide for reducing delivered defibrillation energy leads to one requirement:
**defibrillation-proof patient cables, not merely defibrillation-proof
electrodes.**

## 3.4 NIBP

Oscillometric measurement has replaced auscultation because it removes the human
observer, works in noisy environments, and is fully automatable. The standard is
explicit that the device **does not measure blood pressure — it estimates it.**

Mean arterial pressure is the cuff pressure at peak envelope amplitude, where
transmural arterial pressure passes through zero. **Systolic and diastolic have
no physical marker** and are inferred from envelope shape by a proprietary
algorithm:

| Algorithm | Basis | Performance |
|---|---|---|
| Maximal amplitude | MAP from envelope peak, then ratios | Peak is closer to 0.45·SBP + 0.55·DBP than to MAP; total error typically 10–15 % |
| Fixed ratio | ~0.50 of maximum on the descending branch for SBP, ~0.70 ascending for DBP | Brittle; true ratios vary over 0.5–0.6, and a ratio error of 0.2 amplifies into a pressure error of more than 40× |
| Derivative | Track d(amplitude)/d(cuff pressure) | Under 1.5 mmHg if oscillogram noise is removed |

> **Stated limitation: NIBP accuracy has no independently verifiable systolic or
> diastolic reference. It is validated as a system against a reference device,
> never derived analytically.**

**Accuracy criterion** (ISO 81060-2): mean difference ≤ 5 mmHg, SD ≤ 8 mmHg,
85 subjects, every cuff size tested. Real-world critical-care performance is
narrower than this suggests: a 2022 systematic review across 1,593 patients found
a pooled mean-arterial-pressure bias of −1.50 mmHg, which is clinically
acceptable, but 95 % limits of agreement spanning −14.6 to +40.3 mmHg. **The
limits of agreement, not the bias, determine whether the device is usable during
vasopressor titration.**

**Cuff sizing dominates real-world error.** Bladder width should be 40 % of arm
circumference and length 80 %. A wrongly sized cuff can shift the result by up to
30 mmHg — six times the standard's own mean-error criterion. Adult size covers
23–33 cm of limb circumference. **IEC 80601-2-30 caps neonatal cuff pressure at
150 mmHg**, so a separate neonatal mode is mandatory.

**Pneumatic and timing.** Cuff range 0–300 mmHg, inflation 20–60 mmHg/s, and a
measurement-phase **deflation rate of 2–4 mmHg/s** — far slower than the
inflation rate, because the oscillogram must be sampled along the pressure axis.
Fast or static mode runs 5–10 mmHg/s as a deliberate compromise. A typical adult
measurement therefore takes 30–60 s.

**Electrosurgical interference recovery is mandatory essential performance**
(IEC 80601-2-30). The NIBP module must recover from ESU bursts; this is not an
optional robustness feature.

## 3.5 SpO₂

Two wavelengths are used: 660 nm and 940 nm. Between 600 and 800 nm
deoxyhaemoglobin absorbs far more strongly than oxyhaemoglobin; above 800 nm the
relationship reverses. That spectral inversion is the entire physical basis.

SpO₂ is derived from the ratio of ratios R, mapped through an empirically fitted
quadratic curve `aR² + bR + c`. The curve comes from **controlled desaturation
studies on healthy volunteers**, with arterial saturation measured *in vitro by
co-oximetry*. It is not transferable between sensor geometries — a different
optical shield on the same sensor shifts the curve.

**Validation requirement** (ISO 80601-2-61): at least 200 paired observations
evenly distributed over 70–100 % SaO₂, on at least 10 subjects spanning age and
gender and a range of skin pigmentation, using 10–12 stable plateaus.

**Why the reading is wrong when it is wrong:**

| Failure mode | Mechanism |
|---|---|
| 70–85 % range | The steep part of the curve has the least supporting physiological and optical data |
| Carbonmonoxyhaemoglobin | Two wavelengths physically cannot distinguish it. Reads as oxyhaemoglobin — **a carbon-monoxide-poisoned patient can display 100 %** |
| Methaemoglobinaemia | Absorbs broadly, driving readings toward ~85 % — the "saturation gap" |
| Low perfusion | The pulsatile component collapses into the noise floor; ~0.3 % modulation is the practical limit |
| Motion | Shifts the optical path and phase, corrupting both AC and DC estimates |
| Dyes and inks | Methylene blue, indocyanine green and henna all bias the reading |
| Darker skin pigmentation | Overestimation, now an explicit regulatory concern |
| Optical path-length ratio | The fundamental limit: Beer–Lambert assumes no scattering, but tissue scatters heavily and the scattering constant differs between red and infrared |

**Governance consequence.** A **co-oximeter is required as the arbiter**
whenever carbon monoxide or methaemoglobinaemia is suspected. The monitor
cannot detect these conditions and must not be relied upon to do so.

> **Scope boundary worth recording: ISO 80601-2-61 explicitly does not apply to
> remote or slave equipment displaying SpO₂ outside the patient environment.**
> The nurse-station display of the same reading is therefore outside the scope
> of the oximeter standard and is governed by IEC 80601-2-49 and IEC 60601-1
> instead. The same reasoning applies to every other parameter: the bedside
> module is in scope of its particular standard, the central display is not.

## 3.6 Body temperature

**The regulated requirement is laboratory accuracy against a blackbody, within
±0.3 °C** (ISO 80601-2-56 and ASTM E1965). These standards do **not** specify a
clinical accuracy requirement — they specify laboratory accuracy plus a clinical
comparison study. The per-site figures often quoted are sensor element
tolerances, not the standard's limit.

| Layer | Figure |
|---|---|
| Sensor element tolerance | ±0.1 °C at 37 °C; ±0.2 °C across 5–45 °C |
| **System laboratory error (the standard's requirement)** | **≤ ±0.3 °C** |
| Reported in-hospital probe error | mean 0.04 °C at 37 °C |
| Forehead and ear infrared units | over half failed the laboratory criterion in one survey |

**The clinically important finding is that site matters more than sensor
accuracy.** A systematic review across 13 cohort studies and 105,375
measurements found that axillary, tympanic-infrared and zero-heat-flux
thermometers all **underestimate** intravascular temperature, with only
oesophageal measurement showing clinically acceptable accuracy.

> **Design decision: the monitor ships with an explicit site-offset table keyed
> by site, age band and mode, and the user documentation states that axillary
> skin temperature is a proxy and not core temperature.**

**Probe technology.** An NTC thermistor is selected for sensitivity and cost,
with self-heating as the dominant accuracy risk. The rule that follows is
quantitative rather than qualitative: **bias the probe with a constant current
source at 50–100 µA, not a resistive divider**, and always apply a two-term
Steinhart–Hart conversion. Datasheet curves alone give ±0.26 °C; Steinhart–Hart
gives ±0.03 °C — a ninefold improvement — while linear approximation gives ±1.2 °C.

**Infection control.** Single-patient probes are mandatory for paediatrics,
neonates and immunocompromised patients, and disposable probe covers are
required for any mucosal or ear-canal site. Alcohol disinfection produces a
large transient error and requires 5–10 minutes to settle — a practical cause of
spurious temperature alarms.

## 3.7 Power and internal rails

Mains input is 100–240 V AC, 50/60 Hz universal, Class I with an equipotential
bonding terminal. **The Indian supply is 230 V at 50 Hz.**

Internal distribution, following real monitor service documentation:

```
100-240 VAC ──► [2 MOPP AC/DC PSU, 4 kVrms] ──► 12-15 V DC bus
   ├── +3.3 V   display, CPU, module rack
   ├── +5.0 V   interface, recorder, storage, USB
   ├── +12 V    recorder, display backlight, parameter modules
   └── [isolating DC/DC, 1.5-5 kVac] ──► isolated patient-side rails
```

Design for **60–100 W** per full-featured monitor. Published marketplace figures
for the same product family range from 50 W to 150 W and are not reliable;
manufacturer technical documentation for comparable units sits in the 17.5 W
to 140 W range depending on configuration.

> **Design principle: the patient-facing sensor rail is isolated from mains and
> chassis ground independently of the main power-supply barrier, because the
> sensor cable is the most exposed part of the system.**

This is also the direct architectural argument for a centralised hub. The sensor
bus requires a **second** isolation barrier beyond the power barrier, and a
networked bedside unit cannot be assumed to have it. A central hub that owns
patient-side isolation removes that assumption from the network entirely.

## 3.8 Specification-to-verification matrix

| Specification claim | Verified against |
|---|---|
| Alarm priority values | IEC 60601-1-8 Table 1 — enforced by `ck_alerts_priority` in `db/01_schema.sql` |
| Applied-part classes | IEC 60601-1 and IEC 80601-2-49 — section 3.2 |
| Parameter codes and units | LOINC and UCUM — enforced by `parameters` lookup and `ck_parameters_ucum` |
| MAP is derived, not measured | `ck_vitals_derived_provenance` in `db/01_schema.sql` |
| Physiologically plausible ranges | `ck_vitals_hr_plausible`, `ck_vitals_spo2_plausible`, `ck_vitals_bp_plausible`, `ck_vitals_temp_plausible` |

Section 5.5 shows these constraints being exercised by the build harness rather
than merely asserted here.
