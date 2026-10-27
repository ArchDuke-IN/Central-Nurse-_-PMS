# 6. Digital Health Integration (Milestone M6)

## 6.1 Scope, and what ABDM is actually for

This system is a **Health Information Provider (HIP)** within the Ayushman Bharat
Digital Mission ecosystem. Its obligations are to register patients against an
**ABHA** (Ayushman Bharat Health Account), hold their records in a consent-gated
exchange, and publish discrete consented documents under an ABHA-linked care
context.

> **ABDM is not a streaming target.** Its record types are discrete, consented
> documents — a prescription, a discharge summary, a wellness record. Pushing
> high-frequency vital-sign telemetry at ABDM continuously is not something the
> exchange is designed for, and attempting it would generate request volume with no
> clinical consumer.

The architecture in 6.5 therefore separates the two concerns cleanly: **real-time
clinical monitoring stays inside the hospital**, and **ABDM publication happens at
episode close**, when a discharge summary or wellness record is assembled from the
episode's data and pushed under an explicit patient consent.

## 6.2 ABHA identity

An **ABHA number** is a unique 14-digit identifier, formatted `NN-NNNN-NNNN-NNNN`.
An **ABHA address** is a self-declared handle for linking and sharing records with
consent, conforming to:

```
^[a-zA-Z0-9][a-zA-Z0-9_.]+[a-zA-Z0-9]@(abdm|sbx)$
```

The suffix is `@abdm` in production and `@sbx` in the sandbox. The pattern implies
a minimum length of 8 characters. There is **no scoping-modifier mechanism**; the
namespace suffix is fixed.

### 6.2.1 Two integration details that cause most failures

**Reinsert the dashes before encrypting.** Encrypting the 14 bare digits is
rejected by the service. Official documentation records a dated sandbox failure
where an OTP request carrying the bare digits returned a validation error, while
the same number formatted as `91-1234-5678-9015` succeeded. This is a data-format
defect that presents as an authentication failure.

**There are two tokens, and they are not interchangeable.** The **gateway token**
identifies the hospital application. The **user token** identifies the patient.
Profile and record calls require the user token; sending the gateway token produces
an error that reads like an expired token but is not.

**Check digits should be validated locally.** ABHA uses a **Luhn** check digit and
Aadhaar uses Verhoeff. Computing these before spending an API call saves a round
trip and gives the user immediate feedback at the ward counter.

### 6.2.2 Relevant endpoints

The integration targets the current v3 surface. Older route families are no longer
routable and must not appear in an implementation.

| Step | Method and path |
|---|---|
| Acquire gateway session | `POST /api/hiecm/gateway/v3/sessions` with `grantType=client_credentials` |
| Request enrolment OTP | `POST /abha/api/v3/enrollment/request/otp` |
| Create ABHA and verify OTP | `POST /abha/api/v3/enrollment/enrol/byAadhaar` |
| Generate link token | `POST /api/hiecm/v3/token/generate-token` |
| Link a care context | `POST /api/hiecm/hip/v3/link/carecontext` |
| Request consent | `POST /api/hiecm/consent/v3/request/init` |
| Fetch consent artefact | `POST /api/hiecm/consent/v3/fetch` |
| Request health information | `POST /api/hiecm/data-flow/v3/health-information/request` |

All gateway calls require the `X-CM-ID` header (`sbx` in sandbox, `abdm` in
production), a fresh `REQUEST-ID` per call, and an ISO-8601 `TIMESTAMP`.

### 6.2.3 The ward-admission flow

The operationally relevant pattern is **scan and register**: the patient presents
an ABHA QR code at the admission counter and the exchange posts the profile to the
hospital's bridge.

The hospital must expose a continuously listening callback endpoint and acknowledge
within 30 seconds. Two properties of this flow dominate its implementation:

- The bridge handler **must reply first and process afterwards**. Placing a
  database or MongoDB write behind the acknowledgement risks timeouts that cause
  duplicate registration attempts.
- Callbacks **may arrive out of order and may be delivered twice**. Every handler
  must be idempotent, keyed on the request identifier.

## 6.3 Consent

Two distinct objects exist and are frequently conflated. The **consent request** is
the ask, held by the requesting organisation. The **consent artefact** is the
permission, created only when the patient grants it. One request can yield several
artefacts, so **both the request identifier and every artefact identifier must be
stored**.

The ABDM state set is:

| State | Meaning |
|---|---|
| `REQUESTED` | The patient has not yet acted |
| **`GRANTED`** | **The patient approved. This is the success state.** |
| `DENIED` | The patient refused |
| `EXPIRED` | The patient did not act within the requested window |
| `REVOKED` | The patient withdrew a previously granted consent |

Persisting an approval under the label `ACTIVE` is a common and consequential
error: the record then fails to match the exchange's payload on read-back.

**Three clocks are in play and are routinely confused:**

1. The **request window**, set by the requester. Lapsing it produces `EXPIRED`.
2. The **consent validity period**, set by the patient at the moment of grant.
   This determines `dataEraseAt`.
3. The **date range** of records in scope, which is a property of when care
   happened.

A consent granted today may legitimately cover records from a previous admission.

## 6.4 FHIR R4 resource mapping

### 6.4.1 Why R4 and not R5

R4 (4.0.1) is the correct target for this project, for four reasons that can be
stated in a design defence:

1. **ABDM mandates R4.** The national implementation guide for this jurisdiction
   is built on FHIR R4, so aligning with it is the locally correct engineering
   decision.
2. **R4 is the normative, stable release.** R5 is a trial-use release, and the
   specification itself notes that adoption pace is slowing and the timeline is
   unclear.
3. **All implementations, validators and libraries in practice are R4.**
4. **Migration can be planned, not absorbed.** The largest structural change
   between R4 and R5 is the reworking of subscriptions, which affects only this
   system's archival feed and not its real-time path (6.5).

### 6.4.2 Terminology

Observations are coded in **LOINC**, units in **UCUM**, and clinical meaning —
body sites, device types, allergies — in **SNOMED CT**. Units are held as the UCUM
machine-readable code with a human-readable display alongside; a quantity whose
display string and code disagree is non-conformant.

| Vital | LOINC | UCUM |
|---|---|---|
| Heart rate | `8867-4` | `/min` |
| Systolic blood pressure | `8480-6` | `mm[Hg]` |
| Diastolic blood pressure | `8462-4` | `mm[Hg]` |
| Mean blood pressure | `8478-0` | `mm[Hg]` |
| Oxygen saturation by pulse oximetry | `59408-5` | `%` |
| Body temperature | `8310-5` | `Cel` |
| Respiratory rate | `9279-1` | `{breaths}/min` |
| Blood pressure panel | `85354-9` | — |

Two terminology points that matter:

- `59408-5` is the pulse-oximetry code and is method-qualified accordingly.
  The superficially similar arterial-blood saturation code refers to a
  co-oximetry result from a blood gas analyser, and using it for a bedside
  monitor would be clinically wrong.
- **India is a SNOMED International member**, so SNOMED CT is available under a
  free affiliate licence. Clinical coding in this project therefore carries no
  licensing cost, which is worth recording for a ward-scale deployment.

### 6.4.3 A heart-rate observation

```json
{
  "resourceType": "Observation",
  "id": "obs-hr-0001",
  "meta": {
    "profile": ["http://hl7.org/fhir/StructureDefinition/vitalsigns"],
    "lastUpdated": "2026-10-19T09:00:00.120Z"
  },
  "text": {
    "status": "generated",
    "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\"><p>Heart rate 78 /min</p></div>"
  },
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "vital-signs",
          "display": "Vital Signs"
        }
      ]
    }
  ],
  "code": {
    "coding": [{ "system": "http://loinc.org", "code": "8867-4", "display": "Heart rate" }],
    "text": "Heart rate"
  },
  "subject": { "reference": "Patient/pat-001", "display": "Anil Sharma" },
  "encounter": { "reference": "Encounter/adm-001" },
  "performer": [{ "reference": "Device/inst-001" }],
  "effectiveDateTime": "2026-10-19T09:00:00.000Z",
  "issued": "2026-10-19T09:00:00.120Z",
  "valueQuantity": {
    "value": 78,
    "unit": "/min",
    "system": "http://unitsofmeasure.org",
    "code": "/min"
  },
  "interpretation": [
    { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": "N" }] }
  ],
  "referenceRange": [
    { "low": { "value": 60, "unit": "/min", "code": "/min" },
      "high": { "value": 100, "unit": "/min", "code": "/min" } }
  ]
}
```

Note the two timestamps. `effectiveDateTime` is when the sensor sampled;
`issued` is when the server recorded the row. Both are required to reproduce the
latency budget of section 4.4.

### 6.4.4 A blood-pressure panel, with derived provenance

Blood pressure is a **panel**, not a single observation: three components sampled
at one instant. Mean arterial pressure is computed, and the derivation is
recorded explicitly in `derivedFrom`.

```json
{
  "resourceType": "Observation",
  "id": "obs-bp-0001",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "vital-signs"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "85354-9",
        "display": "Blood pressure panel with all children optional"
      }
    ],
    "text": "Non-invasive blood pressure"
  },
  "subject": { "reference": "Patient/pat-001" },
  "encounter": { "reference": "Encounter/adm-001" },
  "device": { "reference": "Device/inst-001", "display": "BeneView T8 bedside monitor" },
  "effectiveDateTime": "2026-10-19T09:00:00.000Z",
  "method": {
    "coding": [{ "system": "http://loinc.org", "code": "8357-6", "display": "Blood pressure method" }],
    "text": "Oscillometric, non-invasive"
  },
  "component": [
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure" }] },
      "valueQuantity": { "value": 120, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
    },
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8462-4", "display": "Diastolic blood pressure" }] },
      "valueQuantity": { "value": 78, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
    },
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8478-0", "display": "Mean blood pressure" }] },
      "valueQuantity": { "value": 92, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" },
      "derivedFrom": [
        { "reference": "Observation/obs-sbp-0001" },
        { "reference": "Observation/obs-dbp-0001" }
      ]
    }
  ]
}
```

`derivedFrom` is not decoration. It makes the provenance of every computed
parameter machine-readable — mean arterial pressure here, and equally perfusion
index, shock index or early-warning scores derived downstream.

### 6.4.5 The admission as an Encounter

```json
{
  "resourceType": "Encounter",
  "id": "adm-001",
  "status": "in-progress",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "IMP",
    "display": "inpatient encounter"
  },
  "subject": { "reference": "Patient/pat-001" },
  "period": { "start": "2026-10-19T05:40:00.000Z" },
  "location": [
    { "location": { "reference": "Location/bed-001", "display": "BED-01" }, "status": "active" }
  ],
  "participant": [
    { "type": [{ "coding": [{ "code": "ATND" }] }],
      "individual": { "reference": "Practitioner/staff-002" } }
  ],
  "serviceProvider": { "reference": "Organization/hospital-001" }
}
```

The `location` array is how *"which bed is this patient in"* becomes a single
search rather than a join across the relational store.

### 6.4.6 Which ABDM record type carries vitals

Among the eight ABDM record types, the profile that covers **vitals, physical
examination and general wellness** is **`WellnessRecord`**, backed by an
observation-vital-signs profile. This is the primary profile for a monitoring
system; the remaining types cover prescriptions, diagnostic reports, discharge
summaries, immunisation records, invoices and outpatient consultations, none of
which are generated by continuous monitoring.

## 6.5 Architecture: real-time and archival deliberately separated

```
 Bedside monitors
       │
       ▼
 ┌─────────────────────────────────────────────────────┐
 │  CENTRAL STATION / GATEWAY                          │
 │   • terminates device associations                 │
 │   • normalises device codes → LOINC + UCUM          │
 │   • applies time synchronisation                   │
 │   • evaluates alarm limits locally                  │
 └────┬────────────────────────────┬───────────────────┘
      │ MQTT, QoS 1                │ HTTPS, FHIR R4
      ▼                            ▼
 Nurse station                Durable record store
 (live, alarm-critical)       (audit, trends, ABDM export at episode close)
```

**The real-time path uses MQTT at quality of service 1**, not a FHIR push
mechanism. The reasons are specific rather than general:

- QoS 1 provides **delivery acknowledgement and replay**. A FHIR subscription is
  trial-use, best-effort, and the specification states plainly that **no
  notification is issued when a resource is deleted or ceases to meet the
  subscription criteria** — a correctness gap in a monitoring system.
- FHIR guarantees **no latency**. Clinical monitors are alarm-critical; a
  best-effort trial-use push mechanism is the wrong primary safety path.
- Topic structure carries the routing information that would otherwise require
  repeated round trips.

**Alarms never traverse the archival path at all.** They are evaluated at the
bedside and at the gateway, and are annunciated on a dedicated high-priority
channel, so that archival latency cannot delay a nurse.

### 6.5.1 Device association and the normalisation gateway

Bedside monitors do not speak FHIR. They speak vendor protocols or a device
association protocol, over a serial or network port. The gateway is therefore not
an implementation convenience — it is the **single normalisation point** where
device-specific codes are mapped once to LOINC and UCUM, and the only component
that must change when a new monitor model is introduced.

Its scale requirement is modest but real: five beds at roughly one to five
updates per second across ten parameters produces on the order of **50–250
messages per second** at one station, which is why ingest is batched per bed
rather than written as individual resources.

### 6.5.2 A gap in current standards, stated as such

There is **no mature, published FHIR profile for bedside-monitor data**. The
point-of-care device FHIR implementation guide remains at ballot, and the current
service-oriented device interoperability supplement states that its FHIR gateway
mappings are **not yet ready for profiling and product implementation**.

This project therefore defines its own observation profile for bedside vitals,
modelled on the device-interoperability actor and transaction model, and validates
it against the ABDM R4 guide. **The gap is real, and the design decision is to
model it explicitly rather than to pretend an off-the-shelf profile exists.**

## 6.6 Synchronisation to the document store

Section 5.6 specifies the outbox pattern. Three ABDM constraints shape it:

| ABDM constraint | Design consequence |
|---|---|
| The exchange is data-blind and never holds a health record | MongoDB is **not** an ABDM requirement. It is the hospital's own analytics store. |
| A care context holds only a reference number and a display label | MongoDB must retain the **same care-context references** as the relational store, or discovery and linking cannot resolve. |
| Sharing is consent-scoped and revocable | The document store inherits the erasure obligation. **`data_erase_at` must be honoured in both stores.** |

**One care context per admission.** A continuous 24-hour trace is not 86,400 care
contexts. The care context identifies the episode; the record count travels
alongside it. This is the single most important constraint for milestone G3, and
it maps directly onto the `care_context_ref` column of the `admissions` table.

## 6.7 Privacy

ABHA numbers, Aadhaar numbers and one-time passwords **never reach a database or a
log**. Encryption followed by logging the plaintext is the same disclosure,
relocated. Encryption happens in the hospital's own process, not at a remote
service, and a value that has passed through such a service is treated as
disclosed.

Section 8.5 covers de-identification, the DPDP Act, and the two-dataset split
between the operational record and any analytics export.
