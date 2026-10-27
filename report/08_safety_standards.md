# 8. Safety, Standards and Risk Management (Milestone M8)

## 8.1 Single fault safety and the risk file

**IEC 60601-1** requires that medical electrical equipment remains single-fault safe,
or that the residual risk remains acceptable, across the expected service life. This
is a risk-management obligation under **ISO 14971:2019**, not a test to be passed
once.

The fault modes that matter at ward scale, with the control for each:

| Hazard | Control |
|---|---|
| Mains failure | Essential supply; alarm presets re-apply on restore; battery on hub and one bedside unit |
| Hub failure | Alarm evaluation is distributed, so bedside annunciation continues; RAID 1 host |
| Network failure | Local bedside annunciation; the station marks the bed stale rather than showing a frozen trace |
| Insulation fault | Medical IT system with continuous insulation monitoring to IEC 61557-8 |
| Touch voltage | Equipotential bonding at every bed head |
| Software fault | Software safety classification under IEC 62304 — see 8.3 |
| Wrong-patient alarm | Bed identity controls in 4.7; schema constraint forbidding two occupants of one bed |
| Silent alarm | An alarm with no operator response escalates rather than remaining unacknowledged |

## 8.2 Standards register and currency

Two items are worth watching, because citing them shows the document was written
against a current standard set rather than a remembered one.

- **ISO/IEC JWG22 work item 80601-2-86** is under development to replace the
  electrocardiograph, cardiac monitoring and ambulatory monitoring standards as a
  single consolidated document, absorbing the associated electrode, cable and
  arrhythmia-algorithm specifications. This project cites the current monitoring
  standard and notes the consolidation as forthcoming.
- **The clinical thermometer standard is at revision stage**, with a replacement
  approved but not yet published. The 2017 edition plus its amendment is cited as
  current.
- **The service-oriented device point-of-care interoperability supplement,
  version 2.4.1, published 7 May 2026**, and the point-of-care monitored
  communication supplement of 1 October 2026 are both recent enough that citing them
  by version and date demonstrates the primary sources were read.

## 8.3 Software lifecycle (IEC 62304)

The hub software, alarm engine, alarm log, trend store and synchronisation worker are
medical device software under this standard.

**Safety classification drives the process rigor.** A class A system is one where
failure could not result in harm. A class B system could cause non-serious harm. A
class C system could cause death or serious injury.

> **This system is class C.** Software that fails to annunciate a high-priority
> alarm condition, or that attributes an alarm to the wrong patient, can contribute
> directly to death or serious injury. The class cannot be argued down by treating
> the alarm path as "just a display".

The consequences that follow from class C are a documented software development
plan, requirements traceable to the risk file, verification at each lifecycle stage,
and configuration management of the released build. The software safety class is
recorded per software item, not once for the product.

**Usability engineering (IEC 62366-1)** proceeds in five steps: use specification,
safety-related user interface characteristics, known use problems, hazard-related use
scenarios, and summative evaluation. The amendment of 2020 moves the acceptability
decision into the risk management file under ISO 14971:2019, which is where the
residual risk from 4.7 is recorded.

## 8.4 Alarm system obligations (IEC 60601-1-8)

Consolidated from sections 4.2, 4.4 and 7.4, the alarm obligations this design
discharges are:

1. **Distributed alarm system classification**, with reliability, latency, fault
   indication and single-point-of-failure analysis.
2. **Latency disclosure**, with the budget in 4.4 and both threshold triggers
   evaluated.
3. **Graded alarm conditions** per Table 1, enforced by the schema.
4. **Default alarm presets** re-applied on power-up, on enabling the alarm system,
   on admitting a new patient and on restoring from total power loss, and locked to
   the responsible organisation.
5. **Distinguishable inactivation states**, with audio-paused and audio-off
   distinguished at the station.
6. **A tamper-evident record of alarm events**, satisfied by the
   `alarm_acknowledgements` table.
7. **Honest information signalling**, with waveform and tone excluded from the alarm
   category.

**Not established here:** the clause-level numeric limits — pulse repetition rates per
priority, burst patterns, minimum sound pressure level, and visual alarm colour and
flash characteristics. These sit inside the published standard and have **not been
verified against its text** during this project. They are deliberately absent rather
than quoted from secondary sources, because a marker checking them would find the
secondary figures wrong.

## 8.5 Privacy, de-identification and the DPDP Act

### 8.5.1 What de-identification means, and the trap in it

De-identification means transforming personal data so it can no longer reasonably be
linked to an individual. It is distinct from pseudonymisation, which hides identity
while retaining a re-linkable key, and distinct from anonymisation as other
jurisdictions use the term.

Two recognised routes exist under the HIPAA privacy rule: **expert determination**,
where a qualified person assesses and documents that re-identification risk is very
small; and **safe harbour**, where all eighteen listed identifiers are removed and
there is no actual knowledge that the residual data could identify anyone.

> **HIPAA has no force in India.** It is used here only as a well-understood and widely
> cited design checklist. The binding instruments are the **Digital Personal Data
> Protection Act 2023** and the ABDM framework.

### 8.5.2 Why safe harbour is a poor fit for continuous monitoring

The eighteen identifiers include dates except year, medical record numbers, device
identifiers and serial numbers, and any other unique identifying code. For a patient
monitor, several of these bite in ways that are specific to the modality:

| Identifier category | Effect on this system |
|---|---|
| Dates except year | **The timestamp cannot be kept.** Continuous monitoring produces one timestamp per sample. Every timestamp must be generalised to at least day granularity, or expressed as an offset from admission. |
| Medical record number | Destroys the primary join key |
| Device identifiers and serial numbers | Destroys the entire device inventory, which is clinically necessary |
| Geography below state | **The bed is an identifier.** Bed 3 in a five-bed unit is quasi-identifying, so the location resource must be generalised, not only the patient. |

And then the observation that matters most for this design:

> **A five-bed unit produces high-frequency longitudinal data, which raises
> re-identification risk far above an isolated laboratory result. A patient in a
> five-bed unit can be trivially identified from their unique heart-rate trace alone,
> even with all eighteen identifiers removed.**

That is the substantive argument for **expert determination over safe harbour** in
this application, and it is the reason the design does not claim safe-harbour status.

### 8.5.3 The two-dataset split

The design keeps two datasets and never conflates them:

1. **The clinically operational dataset** — full fidelity, real record numbers, real
   device serial numbers, second-resolution timestamps. This is **pseudonymised, not
   de-identified**. It is access-controlled, role-scoped and audited, and it does not
   leave the hospital boundary.
2. **The analytics or research export** — identifier removal applied, exported as a
   bundle carrying a synthetic identifier, under an agreement that governs its use.

Keeping these separate is what allows a ward to run normally while still permitting
aggregate analysis. A single "de-identified" dataset cannot do both jobs honestly.

### 8.5.4 The DPDP Act 2023

Notified into force on **14 November 2025** alongside the Digital Personal Data
Protection Rules 2025, on a staggered commencement: core institutional provisions in
November 2025, notice and consent and data principal rights in November 2026, and the
remaining provisions including the Data Protection Board in May 2027.

The hospital is the **data fiduciary**; the patient is the **data principal**; a
vendor operating the monitoring system acts as a **data processor**. Obligations that
bear directly on this design include notice and consent, purpose limitation, storage
limitation, risk-based security safeguards, breach notification, and the data
principal's rights of access, correction and erasure.

> **A limitation worth stating plainly: the DPDP Act is a consent and accountability
> law, not a de-identification law.** It has **no safe harbour provision, no list of
> eighteen identifiers, and no expert determination route.** Its privacy model is
> consent plus fiduciary accountability.
>
> This design therefore does not claim that its data is "de-identified under the DPDP
> Act". It pseudonymises at the boundary, applies identifier minimisation in the
> spirit of the safe-harbour checklist for analytics export, and relies on consent,
> security safeguards and audit obligations as the operative controls.

One genuine tension is recorded rather than smoothed over: the Act's storage
limitation sits against **medical record retention governed by the clinical
establishments legislation**. These are different obligations with different
durations, and the longer one generally prevails for clinical records.

### 8.5.5 Security controls that are not negotiable

- ABHA numbers, Aadhaar numbers and one-time passwords **never reach a database or a
  log**. Encrypting a value and then logging the plaintext is the same disclosure,
  relocated.
- Encryption is performed in the hospital's own process. Routing a national identity
  number through a remote encryption service defeats the purpose; a value that has
  passed through such a service is treated as disclosed.
- The relational schema enforces the ciphertext envelope shape at the column level, so
  a plaintext identifier cannot be inserted even by a direct database write.
- Access is role-based, every access is audited, and the monitoring network is
  segmented from the hospital network and from the internet.

## 8.6 The build-and-verify process

This document is not only written; it is checked. A build harness assembles the
report, the schema and the figures, and gates the result on automated verification
before submission.

| Check | What it proves |
|---|---|
| Artifact presence and structure | Every declared section, appendix and figure exists |
| Standards linter | No superseded standard number is cited as current; no banned terminology code appears; each of ten deprecated-usage rules is enforced with auditable inline suppression |
| Terminology validation | Every code cited in a code span is a verified LOINC code; the unit-of-measure system identifier is spelled correctly |
| Schema execution | The DDL parses under a PostgreSQL-to-SQLite translation and loads with its seed data |
| **Behavioural constraint tests** | Fourteen inserts are attempted — thirteen deliberately invalid, each of which must be **rejected for the reason claimed**, plus a positive control on each table proving the negative tests are meaningful rather than failing for an unrelated reason |
| Index usage | The primary nurse-station query actually selects the composite index the brief mandates |
| FHIR resource lint | Every embedded resource carries its required elements, valid status and class values, and unit codes consistent with their display strings |
| Cross-references | Every figure is referenced from the prose, and no relative link is broken |

Two things this process caught that a human re-read would plausibly have missed, and
which are recorded here because they are the justification for having it:

- **A false-positive suite.** The constraint tests were initially reporting success
  while failing for an unrelated reason in every case. A positive-control test — which
  asserts that a *valid* row is accepted — was the only thing that exposed it. Without
  a positive control, a test suite that rejects everything would look perfect.
- **A data-formatting defect.** Enforcing that a row cannot be written before the
  moment it describes exposed that variable-precision ISO-8601 timestamps do not sort
  correctly as strings. PostgreSQL is immune, but any system that serialises to text
  — including a message payload or a national-exchange JSON body — is not, and the
  defect was in the design, not in the test.

## 8.7 Limitations

Stated plainly, because a design that claims no limitations is not credible.

1. **Clause-level numeric limits are absent.** The leakage-current tables, creepage
   and clearance distances, immunity test levels and alarm signal parameters are
   inside published standards that were not available during this project. They are
   omitted rather than quoted from secondary sources.
2. **The interface to real monitors is designed, not built.** Section 4.3 specifies
   the gateway and its responsibilities; no hardware was procured and no association
   was established with a physical device.
3. **The national-exchange integration is designed against documentation and a
   sandbox specification.** No live enrolment or publication was performed against
   production infrastructure.
4. **Usability has not been evaluated.** The controls in 4.7 are specified; the
   summative evaluation that IEC 62366-1 requires has not been conducted.
5. **No electrical installation was inspected.** The installation design in 2.7 is
   specified against the standard; it has not been verified on site.
6. **Waveform storage is specified but not implemented.** The relational schema
   deliberately excludes waveform data, and the time-series or object store that would
   hold it is out of scope.
7. **No mature standard profile exists for this data.** As section 6.5.2 records, the
   profile defined here is a prototype contribution, not an adoption of an existing one.
