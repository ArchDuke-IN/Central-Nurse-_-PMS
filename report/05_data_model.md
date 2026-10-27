# 5. Data Model and RDBMS Schema (Milestone M5)

The brief specifies six tables — Patients, Beds, Instruments, Vitals_Log, Alerts,
Staff — plus foreign keys, an index on `bed_id` with timestamp, constraints, and
an ER diagram. This section delivers those and explains four tables the brief does
not name but without which the design does not hold together.

The full executable schema is `db/01_schema.sql`; seed data is `db/02_seed.sql`.
The relationship view is `figures/m5_er_diagram.svg`.

## 5.1 Why PostgreSQL

Three requirements decide the engine, and none of them are generic "RDBMS"
requirements:

| Requirement | PostgreSQL feature |
|---|---|
| `Vitals_Log` will hold roughly 30 million rows per bed-week and must be aged out by policy | **Declarative range partitioning** — retention becomes `DROP TABLE` on a partition rather than a mass `DELETE` that bloats the heap and holds locks |
| A bed can never hold two overlapping patient assignments | **Exclusion constraints** — a declarative, index-backed guarantee |
| Alarm timelines across five beds and two stations must reconcile | Native **`TIMESTAMPTZ`** with real timezone semantics |

## 5.2 Entity relationships

```
Patient 1 ──< Admission 1 ──< Vitals_Log >── 1 Bed 1 ──< Instrument
                                        │            │            │
                                        │            │            └─ referenced by Vitals_Log
                                        │            │
                                        │            └──< Bed_Assignment >── 1 Admission
                                        │
                                        ├── 1 Alert ──< Alarm_Acknowledgement >── 1 Staff
                                        │
                                        └── 1 ABDM consent link

Staff 1 ──< Admission (admitting_staff_id)

Admission 1 ──< Consumable_Usage >── 1 Consumable
Admission 1 ──< Billing_Event
```

### 5.2.1 Four tables the brief does not list

Each is omitted from the brief but necessary, and each is a table the design
cannot be correct without.

**`admissions`.** A patient's stay spans days and may occupy several beds. Without
a first-class admission entity, `vitals_log` has no episode to belong to, discharge
has nothing to close, and ABDM care contexts have nothing to reference. This is the
Encounter in FHIR terms.

**`bed_assignments`.** A bed is occupied over a *time interval*, not permanently.
Collapsing this into `vitals_log.bed_id` makes it impossible to answer "who was in
bed 3 at 03:00 last night", and impossible to enforce that a bed holds one patient.

**`alarm_acknowledgements`.** IEC 60601-1-8 requires a **tamper-evident record of
alarm events** — a regulatory export obligation, not a query convenience. A single
`acknowledged_at` column on `alerts` records that *someone* responded but not who,
how many times, or whether the response was an acknowledgement, a silence or a
pause. Those are different clinical acts with different meanings.

**`sync_outbox`.** The mechanism for relational-to-MongoDB propagation. See 5.6.

Two integration tables complete the picture: `abdm_consent_links` and
`parameters`, the LOINC-terminology lookup.

## 5.3 Index design

The brief specifies an index on `bed_id` together with timestamp. Column **order**
is not incidental — the nurse-station access pattern is always *"one bed, newest
first"*, which is a range scan on `recorded_at` within an equality filter on
`bed_id`:

```sql
-- The primary time-series access path.
CREATE INDEX IF NOT EXISTS ix_vitals_bed_time
    ON vitals_log (bed_id, recorded_at DESC);

-- Per-parameter trend review across the whole ward.
CREATE INDEX IF NOT EXISTS ix_vitals_param_time
    ON vitals_log (parameter_code, recorded_at DESC);

-- The nurse-station alarm list: unacknowledged, most severe first.
CREATE INDEX IF NOT EXISTS ix_alerts_open
    ON alerts (acknowledged_at, priority, raised_at DESC);
```

## 5.4 Constraints that encode clinical safety

A schema that stores bad data correctly is not a passing schema. The constraints
below exist because each one corresponds to a specific way a monitoring system
can mislead a clinician.

| Constraint | Prevents |
|---|---|
| `ck_vitals_hr_plausible` | A 4000 bpm reading reaching a nurse's screen. This is a sensor or mapping fault, not a patient. |
| `ck_vitals_spo2_plausible` | Saturation above 100 %, which is not a physiological state |
| `ck_vitals_bp_plausible`, `ck_vitals_temp_plausible` | Out-of-range pressure and temperature |
| `ck_vitals_derived_provenance` | Mean arterial pressure recorded **without declaring what it was derived from**. MAP is computed as (SBP + 2·DBP)/3, never measured; a value without provenance is untraceable. |
| `ux_bed_assignments_open` | **Two patients mapped to one bed** — the single most dangerous data error in a ward system |
| `uq_vitals_source_row` | Duplicate rows from at-least-once broker redelivery |
| `ck_alerts_priority` | Alarm priorities outside the IEC 60601-1-8 Table 1 set |
| `ck_alerts_ack_by_staff` | An alarm acknowledged with no identified operator |
| `ck_vitals_clock_order` | A row arriving before the moment it describes |
| `ck_patients_abha_envelope` | An ABHA number reaching the database in plaintext |
| `ck_consent_status` | Consent states outside the ABDM value set |

### 5.4.1 Two clocks, deliberately

`vitals_log` carries both `recorded_at` — when the sensor sampled — and
`received_at` — when the hub durably wrote the row. The difference between them is
the network-transport component of the alarm latency budget that IEC 60601-1-8
requires to be disclosed. Collapsing them to one column makes the disclosure
impossible to produce.

### 5.4.2 Provisional versus final

IHE PCD-XR solves push-message reliability with a two-phase commit: the sender
delivers a provisional report, the receiver acknowledges it as provisional, and
only when the complete data set has arrived does a second message make it final.
The receiver therefore never silently treats half a panel as complete.

That maps directly onto the FHIR R4 observation lifecycle, which already defines
`preliminary` and `final`:

> A blood-pressure panel is written as three `preliminary` rows. When the third
> arrives, all three are promoted to `final`. A trend query filters on
> `record_status = 'final'`, so a partially delivered panel is never charted.

### 5.4.3 A defect the build harness caught

Enforcing `received_at >= recorded_at` initially failed on seed data written as
`09:00:00Z` against `09:00:00.120Z`. The cause is genuine and worth recording:
**ISO-8601 timestamps with variable fractional-second precision do not sort
correctly as strings**, because `.` (0x2E) orders below `Z` (0x5A). PostgreSQL
compares `TIMESTAMPTZ` natively and is immune, but any system that serialises to
text — including an MQTT payload or an ABDM JSON body — must normalise to fixed
fractional width before it can be range-sorted or compared.

## 5.5 Executable verification

The schema is not merely printed in this report; it is executed. The build harness
loads it, loads seed data, then attempts to insert deliberately invalid rows and
asserts that each is **rejected for the reason claimed**.

```sql
-- The nurse-station alarm list. Unacknowledged only, most severe first.
SELECT a.priority, b.bed_label, a.parameter_code, a.message, a.raised_at
  FROM alerts a
  JOIN beds b ON b.id = a.bed_id
 WHERE a.acknowledged_at IS NULL
 ORDER BY a.priority, a.raised_at DESC;
```

```sql
-- Bed occupancy, including unoccupied and out-of-service beds.
SELECT b.bed_label, b.operational_status, p.mrn, ba.assigned_at
  FROM beds b
  LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.released_at IS NULL
  LEFT JOIN admissions a ON a.id = ba.admission_id
  LEFT JOIN patients p ON p.id = a.patient_id
 ORDER BY b.bed_label;
```

```sql
-- Provenance audit for every computed mean arterial pressure.
SELECT id, value_num, derived_from, recorded_at
  FROM vitals_log
 WHERE parameter_code = '8478-0'
 ORDER BY recorded_at DESC;
```

```sql
-- Consumables at or below reorder level, worst first.
SELECT sku, description, on_hand, reorder_level, unit_cost_inr
  FROM consumables
 WHERE on_hand <= reorder_level
 ORDER BY (reorder_level - on_hand) DESC;
```

The harness applies ten behavioural assertions, including a **positive control**
that a correctly-formed, properly-provenanced MAP row *is* accepted. Without that
control the nine rejection tests would still report success if every statement
errored out for an unrelated reason — which is precisely the failure mode this
harness encountered and had to be corrected for.

## 5.6 Relational to document-store propagation

Milestone G3 requires a MongoDB-backed record sync. The design principle is:

> **The RDBMS is the system of record. MongoDB is a read model for aggregation.
> Neither is written by the application in parallel.**

A dual write has no atomicity across two stores, so the databases are guaranteed
to drift, and the drift is silent. The harness cannot test what is not specified,
so this is stated as a design decision rather than an implementation.

**Change data capture via a transactional outbox**, rather than log-based CDC, is
selected for this project: it is simple, transactional, and at-least-once, and it
does not require the application to enable binary logging.

```sql
-- Publisher side: reads unpublished outbox rows, marks them, streams to Mongo.
SELECT id, source_table, source_pk, operation, payload, is_tombstone
  FROM sync_outbox
 WHERE published_at IS NULL
 ORDER BY id
 LIMIT 500;
```

| Option | Latency | Intrusive | Assessment |
|---|---|---|---|
| Log-based CDC (Debezium on the write-ahead log) | ms–s | No | Preferred at production scale |
| **Transactional outbox** | ms | No (one extra table) | **Selected** — simplest correct option |
| Trigger-based | s | Yes, degrades writes | Avoid |
| Periodic polling on a watermark | min–hr | No | Fallback; misses deletes |
| Dual write from application code | real | — | **Rejected** — no atomicity, guaranteed drift |

### 5.6.1 Non-negotiable properties of the consumer

1. **Idempotent upserts** keyed on the source primary key — CDC is at-least-once.
2. **Tombstones.** CDC delivers deletes; replaying one must not resurrect a row.
   Enforced by `is_tombstone` and `ck_outbox_tombstone`.
3. **Schema-evolution tolerance** — added and removed columns must not crash the
   consumer.
4. **Never mirror Aadhaar, OTP or password into MongoDB.** Exclusion belongs at
   the transformer, not at the reader, or it will eventually be missed.
5. **Honour `data_erase_at` in both stores.** A consent erasure that clears only
   the relational store has not happened.

## 5.7 Volume and retention

At 5 beds × 10 parameters × 1 reading/second, `vitals_log` grows by roughly
**30 million rows per bed-week**. Three consequences follow:

1. **Partition monthly** on `recorded_at`, so retention is `DROP TABLE`.
2. **Waveform data does not belong in `vitals_log` rows.** Full-disclosure
   waveforms should live in a time-series or object store keyed by bed, start
   time and duration. The reference implementation for this class of system keeps
   240 hours of full disclosure and 3,000 events at 16 seconds of waveform either
   side of each alarm.
3. **Trend queries must be bounded.** Unbounded scans of a partitioned table
   spanning five beds will fall off the index and become the dominant load on the
   hub. Section 4.6 sets the retention target: 72 hours of full disclosure and
   30 days of trends.
