# Appendix A — Requirements Checklist (Milestone M1)

**Deliverable:** one-page requirements checklist derived from the brief.
Every requirement carries a trace to where it is discharged, so the checklist
doubles as a coverage matrix for milestone M9.

## A.1 Functional requirements

| # | Requirement | Source | Discharged in |
|---|---|---|---|
| F-01 | Monitor **five** beds from a single centralised station | Brief G2 | 4.1, 4.3 |
| F-02 | Continuous ECG, SpO₂, NIBP and temperature per bed | Brief M2 | 3.1–3.5 |
| F-03 | Three- or twelve-lead ECG acquisition | Brief M3 | 2.5, Appendix B |
| F-04 | Parameter-specific alarms with priority classification | IEC 60601-1-8 | 4.4 |
| F-05 | Alarm acknowledgement by an identified operator | IEC 60601-1-8 | 4.5, 5.4 |
| F-06 | Trend review and event recall at the station | Brief G2 | 4.6 |
| F-07 | Admission and discharge driven from the HMS | Brief G5 | 7.1 |
| F-08 | Consumable and device-usage billing events | Brief M5, G5 | 7.2 |
| F-09 | Electrode and probe inventory alerting | Brief M5 | 7.3 |
| F-10 | ABHA registration at the point of admission | Brief G3 | 6.2 |
| F-11 | Record synchronisation to the MongoDB read model | Brief G3 | 6.5 |

## A.2 Non-functional requirements

| # | Requirement | Source | Discharged in |
|---|---|---|---|
| N-01 | Single fault safety across the expected service life | IEC 60601-1 | 8.1 |
| N-02 | Alarm annunciation survives loss of the network or the hub | IEC 60601-1-8 | 4.5 |
| N-03 | Documented end-to-end alarm latency | IEC 60601-1-8 | 4.4 |
| N-04 | Bed-to-patient mis-identification is a designed-out hazard | IEC 62366-1 | 4.7 |
| N-05 | Electrosurgical interference recovery is mandatory essential performance | IEC 80601-2-30 | 2.6, 3.3 |
| N-06 | No ABHA number, Aadhaar number or OTP reaches a database or a log | ABDM security | 6.6, 8.5 |
| N-07 | Consent-scoped, revocable record sharing | ABDM | 6.3 |
| N-08 | FHIR R4 conformance validated before submission | ABDM FHIR IG | 6.4 |
| N-09 | Time synchronised across all beds and both stations | IEC 60601-1-8 | 4.3 |
| N-10 | Medical IT supply, equipotential bonding and insulation monitoring | IEC 60364-7-710 | 2.7 |
| N-11 | Segregated shielded data cabling to suppress conducted EMI | IEC 60601-1-2 | 2.6 |
| N-12 | Repository of record is relational; analytics read model is document-based | Brief G4 | 5.1, 6.5 |

## A.3 Environmental and physical constraints

| # | Constraint | Source | Discharged in |
|---|---|---|---|
| E-01 | Staffed general ward = professional healthcare facility environment | IEC 60601-1-2 | 1.2 |
| E-02 | Minimum clear floor area and bedhead clearance per bed | Ward brief | 2.1 |
| E-03 | Nurse station sightline to every bed without occlusion | Usability | 2.2 |
| E-04 | Cable routing segregated from mains and from RF sources | EMI | 2.6 |
| E-05 | Diathermy and electrosurgery physically separated from the bedhead group | CISPR 11 Gr. 2 | 2.6 |
| E-06 | Operating range 10–35 °C, 10–90 % RH | Equipment rating | 2.7 |
| E-07 | Battery backup for hub and at least one bedside unit | Availability | 4.6 |

## A.4 Standards to be cited

- [x] IEC 60601-1 Ed. 3.2 — general requirements
- [x] IEC 60601-1-2 Ed. 4.1 — EMC and environment tiers
- [x] IEC 60601-1-8 Ed. 2.2 — alarm systems, distributed alarm system
- [x] **IEC 80601-2-49 Ed. 1.1 — multifunction patient monitors** *(added; absent from brief)*
<!-- lint-allow std-60601-2-25-misuse -->

- [x] IEC 60601-2-27 Ed. 3.0 — ECG monitoring *(substituted for the diagnostic ECG standard)*
- [x] IEC 80601-2-30 Ed. 2.0 — NIBP *(renumbered)*
- [x] ISO 80601-2-61 Ed. 3.0 — pulse oximetry
- [x] ISO 80601-2-56 Ed. 2 — clinical thermometers
- [x] IEC 62304 Ed. 1.1 — software lifecycle
- [x] IEC 62366-1 Ed. 1.1 — usability engineering
- [x] ISO 14971:2019 — risk management
- [x] IEC 60364-7-710 Ed. 2.0 — medical locations
- [x] IEC 60601-2-2 Ed. 6.1 — HF surgical equipment (EMI source, not a PMS requirement)
- [ ] ~~IEC 60601-1-11~~ — **excluded**, home-healthcare triggered only
<!-- lint-allow std-60601-2-25-misuse -->

- [ ] ~~IEC 60601-2-25~~ — diagnostic ECG reports only; not a monitoring requirement

## A.5 Voice-of-the-customer themes

| Theme | Requirement raised | Answered by |
|---|---|---|
| Patient safety | Mis-identification, alarm fatigue, single-fault safety | 4.7, 4.8, 8.1 |
| Diathermy coexistence | RF interference with millivolt signals | 2.6 |
| Pulse oximetry | Accuracy, probe hygiene, dyshaemoglobinaemia limits | 3.4 |
| Clinical usability | One screen, five patients — cognitive load | 4.7 |
| Regulatory traceability | Cited standards must be current | 1.3, 8.2 |
| Data sovereignty | ABHA and consent-gated sharing | 6.3, 8.5 |
