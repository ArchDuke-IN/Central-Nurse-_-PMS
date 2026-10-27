# 1. Introduction and Scope

## 1.1 Purpose

This document is the design and justification record for a **five-bed centralised
Patient Monitoring System (PMS)** for a general critical-care ward. Five instrumented
bedside units feed live physiological data to a single nurse-station hub, which
publishes to the hospital's clinical record, to India's national digital health
exchange, and to the hospital management system.

It answers assignment goals **G1** (ward design), **G2** (centralised monitoring),
**G3** (digital health), **G4** (data modelling) and **G5** (HMS linkage), and
delivers milestones **M1** through **M9**.

## 1.2 What this system is, in standards terms

The classification drives every subsequent decision, so it is stated first.

A 5-bed centralised PMS is a **medical electrical system** built from equipment
governed by **IEC 60601-1:2005+A1:2012+A2:2020 (Ed. 3.2)**, and it is declared for
the **professional healthcare facility environment** of
**IEC 60601-1-2:2014+A1:2020 (Ed. 4.1)**. That single environment declaration selects
the highest of the three immunity tiers and therefore determines the entire EMC
test plan.

The bedside units are **multifunction patient monitors**, governed primarily by
**IEC 80601-2-49:2018+A1:2024 (Ed. 1.1)**. This standard is not named in the
assignment brief, and that omission matters: it is the particular standard written
specifically for equipment of this class, and every other particular standard in the
table below modifies it rather than replaces it.

> *"Where particular standards exist, this standard should not be used alone."*
> — IEC 60601-1 scope

## 1.3 Standard hierarchy applied

| Level | Standard | Edition | Scope in this design |
|---|---|---|---|
| General | IEC 60601-1 | 2005+A1:2012+A2:2020 (Ed. 3.2) | Basic safety and essential performance |
| Collateral — EMC | IEC 60601-1-2 | 2014+A1:2020 (Ed. 4.1) | Immunity and emissions; environment tiers |
| Collateral — alarms | IEC 60601-1-8 | 2006+A1:2012+A2:2020 (Ed. 2.2) | Alarm system; governs the distributed alarm system |
| Collateral — usability | IEC 60601-1-6 | 2010+A1:2013+A2:2020 (Ed. 3.2) | Usability engineering |
| **Particular — monitor** | **IEC 80601-2-49** | **2018+A1:2024 (Ed. 1.1)** | **Multifunction patient monitoring equipment** |
| Particular — ECG | IEC 60601-2-27 | 2011 (Ed. 3.0) | ECG monitoring, not diagnostic reporting |
| Particular — NIBP | IEC 80601-2-30 | 2018 (Ed. 2.0) | Automated sphygmomanometers |
| Particular — SpO₂ | ISO 80601-2-61 | 2026 (Ed. 3.0) | Pulse oximeter equipment |
| Particular — temperature | ISO 80601-2-56 | 2017+A1:2018 (Ed. 2) | Clinical thermometers |
| Software | IEC 62304 | 2006+A1:2015 (Ed. 1.1) | Hub, alarm engine and sync software lifecycle |
| Usability | IEC 62366-1 | 2015+A1:2020 (Ed. 1.1) | Use-related risk of the 5-bed hub interface |
| Risk management | ISO 14971 | 2019 | Top-level risk management |
| Installation | IEC 60364-7-710 | 2021 (Ed. 2.0) | Medical-location electrical installation |

### 1.3.1 Three deliberate deviations from the brief

The brief and the literature it draws on cite standards that are superseded or
misapplied. These corrections are applied deliberately and are flagged here so that
a reader can see each is intentional rather than an oversight.

**IEC 60601-2-25 is the wrong standard for bedside ECG.**
It covers *electrocardiographs for producing diagnostic ECG reports*, and its own
scope excludes *"cardiac monitors covered by IEC 60601-2-27 where not intended for
obtaining electrocardiographic reports for diagnostic purposes."* This system
monitors; it does not issue diagnostic reports. **IEC 60601-2-27:2011 (Ed. 3.0)** is
cited instead. The diagnostic standard is retained in the hierarchy only as the
reference for calibration and gain accuracy, which both share.

**IEC 60601-2-30 no longer exists as a 60601 number.**
Non-invasive blood pressure was renumbered to **IEC 80601-2-30:2018 (Ed. 2.0)**, and
the renumbering also aligned it with the third edition of IEC 60601-1.

**IEC 60601-1-11 does not apply to this project.**
It is triggered by a *home healthcare* intended use, irrespective of operator
training. A staffed general ward is by definition a professional healthcare
facility environment, so citing 60601-1-11 as a requirement would misstate the
design intent. It appears in this document only as the origin of the environment
tier taxonomy that IEC 60601-1-2 harmonises against.

### 1.3.2 Note on the term "De-health"

<!-- lint-allow de-health-typo -->

Milestone M2 asks the team to *"Research Abha ID API and De-health/FHIR standards."*
**No standard, specification or recognised technical term named "De-health" exists.**
The two plausible readings are *Digital health* and *de-identification*. Both are
covered: digital health in section 6, and de-identification and privacy in
sections 6.6 and 8.5. This is flagged as a probable typographical error in the brief.

A second term needs the same treatment. The brief lists *"diathermy"* as a voice of
the customer. Three distinct technologies are described by that word in different
sources — electrosurgery at roughly 500 kHz, short-wave diathermy at 27 MHz, and
therapeutic ultrasound — and they map to **different standards with different
interference physics**. Section 2.6 analyses the electrosurgical case as the
dominant EMI risk to millivolt-level signals, which is the interpretation used
throughout.

## 1.4 Essential performance

For this system the essential performance is not merely the numeric readouts. It is:

1. Accurate measurement of heart rate, arterial oxygen saturation, non-invasive
   blood pressure and body temperature.
2. **Annunciation of an alarm condition** at the nurse station, and its
   acknowledgement by an identified operator — maintained *under disturbance*.

Point 2 is why the alarm path is treated as a safety function throughout this
document and why section 4.4 devotes an end-to-end latency budget to it.

## 1.5 Scope boundaries

| In scope | Out of scope |
|---|---|
| Five instrumented bedside units | Wired or wireless telemetry to off-ward areas |
| Central nurse-station hub, one view station plus a duty-desk repeater | Full EMR replacement |
| RDBMS schema for patients, vitals, alerts, staff and inventory | Clinical decision support |
| ABHA enrolment and ABDM record publication | Live high-frequency streaming to ABDM (see 6.4) |
| Admission, billing and inventory hooks into the HMS | Pharmacy or theatre systems |
| Ward electrical installation and EM zoning | Hospital-wide electrical infrastructure |

## 1.6 How to read this document

Figures are referenced by filename throughout and every one is embedded in the
section that argues from it. Section 5 embeds the executable schema; section 6
embeds FHIR resources. Both are validated automatically by the build harness
described in section 8.7, so any inconsistency between the prose and the machine-
readable artifacts is a build failure rather than something a reader must catch.

**Traceability to the brief**

| Goal | Addressed in |
|---|---|
| G1 Physical ward design | Section 2, Appendix A, `figures/m3_ward_layout.svg` |
| G2 Centralised monitoring | Section 4, `figures/m4_block_diagram.svg` |
| G3 Digital health integration | Section 6, `figures/m6_data_flow.svg` |
| G4 Data modelling | Section 5, `figures/m5_er_diagram.svg`, `db/01_schema.sql` |
| G5 HMS linkage | Section 7, `figures/m7_hms_integration.svg` |
