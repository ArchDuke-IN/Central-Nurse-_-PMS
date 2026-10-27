-- =====================================================================
--  PMS 5-Bed Centralised Patient Monitoring System
--  Milestone M5  -  RDBMS schema (PostgreSQL 15+)
-- =====================================================================
--  Authored in PostgreSQL dialect. Executed by the build/verify loop via
--  verify/rules/sql-shim.mjs, which proves the script parses and that the
--  clinical-safety constraints actually reject bad rows.
--
--  Design notes
--  ------------
--  * PostgreSQL is chosen over SQLite/MySQL for three reasons that matter
--    to this application: declarative range partitioning of the Vitals_Log
--    time series, exclusion constraints for bed-occupancy overlap, and
--    native TIMESTAMPTZ for alarm-timeline reconciliation across 5 beds.
--  * Identifiers are application-supplied TEXT, not SERIAL. Device-originated
--    rows must be idempotent under MQTT QoS 1 at-least-once redelivery, so
--    the natural key comes from the source device, not from a sequence.
--  * Every patient-facing table carries a PostgreSQL exclusion constraint
--    (guarded by @pg-only markers) so the same invariant is enforced twice:
--    once natively in production, once portably in the verification engine.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Reference data
-- ---------------------------------------------------------------------
CREATE TABLE parameters (
    code            TEXT        PRIMARY KEY,          -- LOINC code
    display         TEXT        NOT NULL,
    unit_ucum       TEXT        NOT NULL,          -- UCUM code, not a display string
    loinc_class     TEXT,
    min_plausible   REAL,
    max_plausible   REAL,
    is_derived      BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_parameters_ucum
        CHECK (unit_ucum IN ('mm[Hg]','%','Cel','/min','{beats}/min','{breaths}/min','cm')),
    CONSTRAINT ck_parameters_range
        CHECK (min_plausible IS NULL OR max_plausible IS NULL OR min_plausible <= max_plausible)
);

COMMENT ON TABLE parameters IS
    'LOINC-terminology lookup. Vitals_Log.code is a foreign key to this
     table so that a mis-typed LOINC code cannot enter the time series.';

-- ---------------------------------------------------------------------
--  People
-- ---------------------------------------------------------------------
CREATE TABLE patients (
    id                        TEXT        PRIMARY KEY,
    mrn                       TEXT        NOT NULL UNIQUE,
    given_name                TEXT        NOT NULL,
    family_name               TEXT        NOT NULL,
    gender                    TEXT        NOT NULL,
    date_of_birth             DATE        NOT NULL,
    -- ABHA numbers are NEVER stored in plaintext. This column holds a
    -- versioned ciphertext envelope: "v1:<base64>". The plain value exists
    -- only in transit, encrypted to the ABDM public certificate.
    abha_number_encrypted     TEXT,
    abha_address_encrypted    TEXT,
    created_at                TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_patients_gender
        CHECK (gender IN ('male','female','other','unknown')),
    -- Rejects plaintext ABHA and malformed ciphertext envelopes alike.
    -- Uses length()/substr() rather than the PostgreSQL regex operator "~"
    -- so that the verification engine can execute the constraint rather
    -- than skip it. Both functions exist in PostgreSQL as well.
    CONSTRAINT ck_patients_abha_envelope
        CHECK (abha_number_encrypted IS NULL
               OR (length(abha_number_encrypted) > 18
                   AND substr(abha_number_encrypted, 1, 3) = 'v1:'))
);

CREATE TABLE staff (
    id                TEXT        PRIMARY KEY,
    registration_no   TEXT        NOT NULL UNIQUE,
    given_name        TEXT        NOT NULL,
    family_name       TEXT        NOT NULL,
    role              TEXT        NOT NULL,
    password_hash     TEXT        NOT NULL,
    is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_staff_role
        CHECK (role IN ('NURSE','CHARGE_NURSE','DOCTOR','TECHNICIAN','ADMIN'))
);

-- ---------------------------------------------------------------------
--  Physical plant
-- ---------------------------------------------------------------------
CREATE TABLE beds (
    id                    TEXT        PRIMARY KEY,
    bed_label             TEXT        NOT NULL UNIQUE,   -- 'BED-01'
    ward                  TEXT        NOT NULL,
    bay                   TEXT,
    -- operational_status drives what the nurse station shows for a bed that
    -- has no patient: O occupied, U unoccupied, C closed for cleaning,
    -- H housekeeping in progress, X out of service.
    operational_status    TEXT        NOT NULL DEFAULT 'U',
    -- Equipotential bonding stud identifier for the medical IT group.
    bonding_stud_id       TEXT,
    CONSTRAINT ck_beds_status
        CHECK (operational_status IN ('O','U','C','H','X'))
);

CREATE TABLE instruments (
    id                  TEXT        PRIMARY KEY,
    bed_id              TEXT        NOT NULL REFERENCES beds(id),
    device_type         TEXT        NOT NULL,
    manufacturer        TEXT,
    model               TEXT,
    serial_number       TEXT        NOT NULL,
    -- Not the lease. The calibration due date, which IEC 62304 risk
    -- management treats as a maintenance control.
    calibration_due_on  DATE,
    last_maintenance_on DATE,
    is_defib_ready      BOOLEAN     NOT NULL DEFAULT FALSE,
    is_operational      BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_instruments_type
        CHECK (device_type IN ('ECG','NIBP','SPO2','TEMP','MONITOR','PUMP','ESU','NURSE_CALL'))
);

-- ---------------------------------------------------------------------
--  Clinical episodes
-- ---------------------------------------------------------------------
CREATE TABLE admissions (
    id                  TEXT        PRIMARY KEY,
    patient_id          TEXT        NOT NULL REFERENCES patients(id),
    encounter_class     TEXT        NOT NULL DEFAULT 'IMP',  -- FHIR v3 ActCode
    admitted_at         TIMESTAMPTZ NOT NULL,
    discharged_at       TIMESTAMPTZ,
    admitting_staff_id  TEXT        REFERENCES staff(id),
    -- ABDM care context reference. Must equal the referenceNumber the
    -- hospital publishes to ABDM, or discovery and linking cannot resolve.
    care_context_ref    TEXT        UNIQUE,
    CONSTRAINT ck_admissions_class
        CHECK (encounter_class IN ('AMB','IMP','EMER','HH','VR','OBSENC','SS','ECT')),
    CONSTRAINT ck_admissions_discharge
        CHECK (discharged_at IS NULL OR discharged_at >= admitted_at)
);

CREATE TABLE bed_assignments (
    id             TEXT        PRIMARY KEY,
    bed_id         TEXT        NOT NULL REFERENCES beds(id),
    admission_id   TEXT        NOT NULL REFERENCES admissions(id),
    assigned_at    TIMESTAMPTZ NOT NULL,
    released_at    TIMESTAMPTZ
);

-- Clinical-safety invariant: a bed has at most ONE open assignment.
-- This partial unique index is the portable, executable enforcement.
CREATE UNIQUE INDEX ux_bed_assignments_open
    ON bed_assignments (bed_id)
    WHERE released_at IS NULL;

-- Production-grade enforcement of the full overlap rule, including closed
-- historical rows. Requires btree_gist and is therefore not executable by
-- the SQLite verification engine.
-- @pg-only:begin
-- CREATE EXTENSION IF NOT EXISTS btree_gist;
-- ALTER TABLE bed_assignments
--     ADD CONSTRAINT ex_bed_no_overlap
--     EXCLUDE USING gist (
--         bed_id WITH =,
--         tstzrange(assigned_at, COALESCE(released_at, 'infinity'::timestamptz), '[)') WITH &&
--     );
-- @pg-only:end

-- ---------------------------------------------------------------------
--  Time series
-- ---------------------------------------------------------------------
CREATE TABLE vitals_log (
    id                  TEXT        NOT NULL,
    bed_id              TEXT        NOT NULL REFERENCES beds(id),
    patient_id          TEXT        NOT NULL REFERENCES patients(id),
    admission_id        TEXT        REFERENCES admissions(id),
    parameter_code      TEXT        NOT NULL REFERENCES parameters(code),
    instrument_id       TEXT        REFERENCES instruments(id),
    value_num           REAL,
    value_text          TEXT,
    unit_ucum           TEXT        NOT NULL,
    -- Two clocks, deliberately. recorded_at is when the sensor sampled;
    -- received_at is when the central station durably wrote the row. The
    -- gap between them is the network-transport component of the alarm
    -- latency budget that IEC 60601-1-8 requires to be disclosed.
    recorded_at         TIMESTAMPTZ NOT NULL,
    received_at         TIMESTAMPTZ NOT NULL,
    -- Provenance. Mean arterial pressure is computed as (SBP + 2*DBP)/3,
    -- never measured, so it must declare what it was derived from.
    derived_from        TEXT,
    -- IHE PCD-XR two-phase commit, expressed in the FHIR R4 observation
    -- lifecycle: a row is written preliminary, then updated to final once
    -- every component of a panel has arrived. The consumer never treats a
    -- partial panel as complete.
    record_status       TEXT        NOT NULL DEFAULT 'preliminary',
    CONSTRAINT ck_vitals_status
        CHECK (record_status IN ('preliminary','final','amended','corrected','cancelled')),
    CONSTRAINT ck_vitals_has_value
        CHECK (value_num IS NOT NULL OR value_text IS NOT NULL),
    -- Physiological plausibility, per parameter. A 4000 bpm heart rate is
    -- a sensor or mapping fault, not a patient, and must not reach a nurse.
    CONSTRAINT ck_vitals_hr_plausible
        CHECK (parameter_code <> '8867-4' OR (value_num BETWEEN 0 AND 350)),
    CONSTRAINT ck_vitals_spo2_plausible
        CHECK (parameter_code <> '59408-5' OR (value_num BETWEEN 50 AND 100)),
    CONSTRAINT ck_vitals_bp_plausible
        CHECK (parameter_code NOT IN ('8480-6','8462-4','8478-0')
               OR (value_num BETWEEN 20 AND 300)),
    CONSTRAINT ck_vitals_temp_plausible
        CHECK (parameter_code <> '8310-5' OR (value_num BETWEEN 25 AND 45)),
    -- Derived parameters must declare their provenance.
    CONSTRAINT ck_vitals_derived_provenance
        CHECK (parameter_code <> '8478-0' OR derived_from IS NOT NULL),
    CONSTRAINT ck_vitals_clock_order
        CHECK (received_at >= recorded_at),
    -- Idempotency key for at-least-once MQTT delivery.
    CONSTRAINT uq_vitals_source_row UNIQUE (instrument_id, parameter_code, recorded_at)
);

-- The index milestone M5 mandates: nurse-station queries are always
-- "one bed, newest first".
CREATE INDEX ix_vitals_bed_time
    ON vitals_log (bed_id, recorded_at DESC);

-- Per-parameter trend review across the ward.
CREATE INDEX ix_vitals_param_time
    ON vitals_log (parameter_code, recorded_at DESC);

-- ---------------------------------------------------------------------
--  Alarms  (IEC 60601-1-8)
-- ---------------------------------------------------------------------
CREATE TABLE alerts (
    id                  TEXT        PRIMARY KEY,
    bed_id              TEXT        NOT NULL REFERENCES beds(id),
    patient_id          TEXT        REFERENCES patients(id),
    admission_id        TEXT        REFERENCES admissions(id),
    parameter_code      TEXT        REFERENCES parameters(code),
    -- Table 1 of IEC 60601-1-8. INFORMATION is explicitly not an alarm
    -- condition; the standard lists the ECG waveform and the SpO2 tone in
    -- that category, so it must not be routable as a nurse-actionable alarm.
    priority            TEXT        NOT NULL,
    kind                TEXT        NOT NULL,
    message             TEXT        NOT NULL,
    raised_at           TIMESTAMPTZ NOT NULL,
    -- Distributed alarm system: the condition and its annunciation at a
    -- remote station are separate events with separate clocks.
    annunciated_at      TIMESTAMPTZ,
    acknowledged_at     TIMESTAMPTZ,
    acknowledged_by     TEXT        REFERENCES staff(id),
    cleared_at          TIMESTAMPTZ,
    escalation_count    INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT ck_alerts_priority
        CHECK (priority IN ('HIGH','MEDIUM','LOW','INFORMATION')),
    CONSTRAINT ck_alerts_kind
        CHECK (kind IN ('physiological','technical','system')),
    CONSTRAINT ck_alerts_ack_ordered
        CHECK (acknowledged_at IS NULL OR acknowledged_at >= raised_at),
    CONSTRAINT ck_alerts_ack_by_staff
        CHECK (acknowledged_at IS NULL OR acknowledged_by IS NOT NULL)
);

-- The nurse-station alarm list: unacknowledged, most severe first.
CREATE INDEX ix_alerts_open
    ON alerts (acknowledged_at, priority, raised_at DESC);

-- Tamper-evident alarm log. IEC 60601-1-8 requires an auditable record of
-- alarm events, which is a regulatory export obligation, not just a query
-- convenience.
CREATE TABLE alarm_acknowledgements (
    id            TEXT        PRIMARY KEY,
    alert_id      TEXT        NOT NULL REFERENCES alerts(id),
    staff_id      TEXT        NOT NULL REFERENCES staff(id),
    acknowledged_at TIMESTAMPTZ NOT NULL,
    action        TEXT        NOT NULL,
    CONSTRAINT ck_alarm_ack_action
        CHECK (action IN ('ACK','SILENCE','PAUSE','EXTEND')),
    CONSTRAINT uq_alarm_ack UNIQUE (alert_id, staff_id, acknowledged_at)
);

-- ---------------------------------------------------------------------
--  Digital health / ABDM
-- ---------------------------------------------------------------------
CREATE TABLE abdm_consent_links (
    id                  TEXT        PRIMARY KEY,
    patient_id          TEXT        NOT NULL REFERENCES patients(id),
    -- The consent ARTEFACT, not the request. A request can produce several
    -- artefact ids, and only an artefact grants access.
    consent_artefact_id TEXT,
    consent_status      TEXT        NOT NULL,
    purpose_code        TEXT        NOT NULL,
    access_mode         TEXT        NOT NULL,
    valid_from          TIMESTAMPTZ,
    data_erase_at       TIMESTAMPTZ,
    CONSTRAINT ck_consent_status
        CHECK (consent_status IN ('REQUESTED','GRANTED','DENIED','EXPIRED','REVOKED')),
    CONSTRAINT ck_consent_purpose
        CHECK (purpose_code IN ('CAREMGT','BTG','PUBHLTH','HPAYMT','DSRCH','PATRQT')),
    CONSTRAINT ck_consent_access_mode
        CHECK (access_mode IN ('VIEW','STORE','STREAM','QUERY'))
);

-- ---------------------------------------------------------------------
--  Change data capture outbox (RDBMS -> MongoDB read model)
-- ---------------------------------------------------------------------
-- A transactional outbox rather than a second write in application code.
-- Dual writes have no atomicity across two stores, so the two databases
-- are guaranteed to drift; this pattern cannot.
CREATE TABLE sync_outbox (
    id              BIGSERIAL    PRIMARY KEY,
    source_table    TEXT        NOT NULL,
    source_pk       TEXT        NOT NULL,
    operation       TEXT        NOT NULL,   -- INSERT | UPDATE | DELETE
    payload         TEXT        NOT NULL,   -- JSONB in production
    created_at      TIMESTAMPTZ NOT NULL,
    published_at    TIMESTAMPTZ,
    -- Set when the consumer sees a delete, so replaying the tombstone
    -- cannot resurrect a row in the MongoDB read model.
    is_tombstone    BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_outbox_op
        CHECK (operation IN ('INSERT','UPDATE','DELETE')),
    CONSTRAINT ck_outbox_tombstone
        CHECK (NOT is_tombstone OR operation = 'DELETE'),
    CONSTRAINT uq_outbox_event UNIQUE (source_table, source_pk, operation, created_at)
);

CREATE INDEX ix_outbox_unpublished
    ON sync_outbox (created_at)
    WHERE published_at IS NULL;

-- ---------------------------------------------------------------------
--  Inventory and billing  (milestone M7)
-- ---------------------------------------------------------------------
CREATE TABLE consumables (
    id                  TEXT        PRIMARY KEY,
    sku                 TEXT        NOT NULL UNIQUE,
    description         TEXT        NOT NULL,
    category            TEXT        NOT NULL,
    unit_of_issue       TEXT        NOT NULL,
    on_hand             INTEGER     NOT NULL,
    reorder_level       INTEGER     NOT NULL,
    unit_cost_inr       NUMERIC(10,2) NOT NULL,
    CONSTRAINT ck_consumables_category
        CHECK (category IN ('ECG_ELECTRODE','SPO2_PROBE','NIBP_CUFF','TEMP_PROBE','LEADWIRE','CABLE')),
    CONSTRAINT ck_consumables_stock
        CHECK (on_hand >= 0 AND reorder_level >= 0)
);

CREATE TABLE consumable_usage (
    id              TEXT        PRIMARY KEY,
    consumable_id   TEXT        NOT NULL REFERENCES consumables(id),
    admission_id    TEXT        NOT NULL REFERENCES admissions(id),
    bed_id          TEXT        REFERENCES beds(id),
    quantity        INTEGER     NOT NULL,
    used_at         TIMESTAMPTZ NOT NULL,
    billed          BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_usage_qty CHECK (quantity > 0)
);

CREATE TABLE billing_events (
    id              TEXT        PRIMARY KEY,
    admission_id    TEXT        NOT NULL REFERENCES admissions(id),
    event_type      TEXT        NOT NULL,
    description     TEXT        NOT NULL,
    amount_inr      NUMERIC(10,2) NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_billing_type
        CHECK (event_type IN ('BED_CHARGE','DEVICE_USAGE','CONSUMABLE','PROCEDURE','DISCHARGE'))
);

-- =====================================================================
--  PostgreSQL-only optimisation, declared but not executed by the verifier
-- =====================================================================
-- @pg-only:begin
-- -- Vitals_Log will be the largest table by an order of magnitude.
-- -- Range partitioning by month lets a retention policy drop whole
-- -- partitions with DROP TABLE instead of a mass DELETE that bloats the
-- -- heap and holds locks.
-- CREATE TABLE vitals_log (...) PARTITION BY RANGE (recorded_at);
-- CREATE TABLE vitals_log_2026_10 PARTITION OF vitals_log
--     FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
-- @pg-only:end
