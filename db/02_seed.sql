-- =====================================================================
--  PMS 5-Bed Centralised Patient Monitoring System
--  Milestone M5  -  Seed data for verification
-- =====================================================================
--  Minimal but self-consistent: one ward, five beds, two patients, one
--  admission, one open bed assignment, and a representative spread of
--  vitals including a correctly-provenanced derived MAP.
--
--  Every id is a literal so the behavioural constraint tests in
--  verify/rules/sql-lint.mjs can target them deterministically.
-- =====================================================================

INSERT INTO parameters (code, display, unit_ucum, loinc_class, min_plausible, max_plausible, is_derived) VALUES
  ('8867-4',  'Heart rate',                                  '/min',   'VITAL-SIGNS',   0,   350, FALSE),
  ('8480-6',  'Systolic blood pressure',                     'mm[Hg]', 'VITAL-SIGNS',   20,  300, FALSE),
  ('8462-4',  'Diastolic blood pressure',                    'mm[Hg]', 'VITAL-SIGNS',   20,  300, FALSE),
  ('8478-0',  'Mean blood pressure',                         'mm[Hg]', 'VITAL-SIGNS',   20,  300, TRUE),
  ('85354-9', 'Blood pressure panel with all children optional','mm[Hg]','VITAL-SIGNS',  20,  300, TRUE),
  ('59408-5', 'Oxygen saturation in Arterial blood by Pulse oximetry', '%', 'VITAL-SIGNS', 50, 100, FALSE),
  ('8310-5',  'Body temperature',                            'Cel',    'VITAL-SIGNS',   25,  45,  FALSE),
  ('9279-1',  'Respiratory rate',                            '{breaths}/min', 'VITAL-SIGNS', 4, 80, FALSE),
  ('11524-6', 'EKG study',                                   '{beats}/min', 'VITAL-SIGNS', 0, 350, TRUE);

INSERT INTO staff (id, registration_no, given_name, family_name, role, password_hash, is_active, created_at) VALUES
  ('staff-001', 'NMC-IND-448120', 'Asha',  'Menon',  'NURSE',       '$2b$12$stubhash0000000000000000000000000000000000', TRUE,  '2026-01-04T09:00:00Z'),
  ('staff-002', 'NMC-IND-448121', 'Ravi',  'Kulkarni','CHARGE_NURSE','$2b$12$stubhash0000000000000000000000000000000001', TRUE,  '2026-01-04T09:00:00Z'),
  ('staff-003', 'MCI-IND-990233', 'Priya', 'Nair',   'DOCTOR',      '$2b$12$stubhash0000000000000000000000000000000002', TRUE,  '2026-01-04T09:00:00Z'),
  ('staff-004', 'TECH-IND-33120', 'Imran', 'Shaikh', 'TECHNICIAN',  '$2b$12$stubhash0000000000000000000000000000000003', TRUE,  '2026-01-04T09:00:00Z');

INSERT INTO patients (id, mrn, given_name, family_name, gender, date_of_birth, abha_number_encrypted, abha_address_encrypted, created_at) VALUES
  ('pat-001', 'MR2026001', 'Anil', 'Sharma', 'male',   '1979-03-15', 'v1:QWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=', 'v1:d29uQGV4YW1wbGUuYWI=', '2026-10-19T05:40:00Z'),
  ('pat-002', 'MR2026002', 'Meera','Iyer',   'female', '1985-11-02', NULL,                                    NULL,                    '2026-10-19T06:15:00Z');

INSERT INTO beds (id, bed_label, ward, bay, operational_status, bonding_stud_id) VALUES
  ('bed-001', 'BED-01', 'ICU-A', 'BAY-1', 'O', 'EPS-ICU-A-01'),
  ('bed-002', 'BED-02', 'ICU-A', 'BAY-1', 'U', 'EPS-ICU-A-02'),
  ('bed-003', 'BED-03', 'ICU-A', 'BAY-2', 'U', 'EPS-ICU-A-03'),
  ('bed-004', 'BED-04', 'ICU-A', 'BAY-2', 'U', 'EPS-ICU-A-04'),
  ('bed-005', 'BED-05', 'ICU-A', 'BAY-3', 'X', 'EPS-ICU-A-05');

INSERT INTO instruments (id, bed_id, device_type, manufacturer, model, serial_number, calibration_due_on, last_maintenance_on, is_defib_ready, is_operational) VALUES
  ('inst-001', 'bed-001', 'MONITOR', 'Mindray',   'BeneView T8',  'SN-T8-448120', '2027-01-15', '2026-10-01', TRUE,  TRUE),
  ('inst-002', 'bed-001', 'SPO2',    'Masimo',    'SET Series',   'SN-SP-99120',  '2027-01-15', '2026-10-01', TRUE,  TRUE),
  ('inst-003', 'bed-001', 'TEMP',    'Starboard', '400 Series',   'SN-TP-33120',  '2027-01-15', '2026-10-01', FALSE, TRUE),
  ('inst-004', 'bed-002', 'MONITOR', 'Mindray',   'BeneView T8',  'SN-T8-448121', '2027-01-15', '2026-10-01', TRUE,  TRUE),
  ('inst-005', 'bed-003', 'MONITOR', 'BPL',       'Ultima Prime', 'SN-UP-77120',  '2027-02-01', '2026-09-15', TRUE,  TRUE),
  ('inst-006', 'bed-004', 'MONITOR', 'Philips',   'Efficia CM10', 'SN-CM-22410',  '2027-02-01', '2026-09-15', TRUE,  TRUE),
  ('inst-007', 'bed-005', 'MONITOR', 'Contec',    'CMS8000',      'SN-C8-10022',  '2026-11-01', '2026-08-20', FALSE, FALSE);

INSERT INTO admissions (id, patient_id, encounter_class, admitted_at, discharged_at, admitting_staff_id, care_context_ref) VALUES
  ('adm-001', 'pat-001', 'IMP', '2026-10-19T05:40:00Z', NULL, 'staff-002', 'TMH-PUID-0001'),
  ('adm-002', 'pat-002', 'IMP', '2026-10-19T06:15:00Z', NULL, 'staff-002', 'TMH-PUID-0002');

-- Bed 1 holds the only OPEN assignment. The behavioural test inserts a
-- second open row for bed-001 and expects the partial unique index to
-- reject it, which is the clinical invariant that two patients can never
-- be mapped to one bed.
INSERT INTO bed_assignments (id, bed_id, admission_id, assigned_at, released_at) VALUES
  ('ba-001', 'bed-001', 'adm-001', '2026-10-19T05:45:00Z', NULL),
  ('ba-002', 'bed-003', 'adm-002', '2026-10-19T06:20:00Z', NULL),
  -- Historical, correctly closed. Same bed, no overlap.
  ('ba-003', 'bed-002', 'adm-002', '2026-10-19T01:00:00Z', '2026-10-19T04:00:00Z');

INSERT INTO vitals_log (id, bed_id, patient_id, admission_id, parameter_code, instrument_id, value_num, unit_ucum, recorded_at, received_at, derived_from, record_status) VALUES
  ('v-001', 'bed-001', 'pat-001', 'adm-001', '8867-4',  'inst-001', 78,   '/min',      '2026-10-19T09:00:00.000Z', '2026-10-19T09:00:00.120Z', NULL,                    'final'),
  ('v-002', 'bed-001', 'pat-001', 'adm-001', '59408-5', 'inst-002', 97,   '%',         '2026-10-19T09:00:00.000Z', '2026-10-19T09:00:00.140Z', NULL,                    'final'),
  ('v-003', 'bed-001', 'pat-001', 'adm-001', '8310-5',  'inst-003', 37.2, 'Cel',       '2026-10-19T09:00:00.000Z', '2026-10-19T09:00:00.160Z', NULL,                    'final'),
  ('v-004', 'bed-001', 'pat-001', 'adm-001', '9279-1',  'inst-001', 16,   '{breaths}/min','2026-10-19T09:00:00.000Z','2026-10-19T09:00:00.180Z', NULL,                   'final'),
  ('v-005', 'bed-001', 'pat-001', 'adm-001', '8480-6',  'inst-001', 120,  'mm[Hg]',    '2026-10-19T09:00:00.000Z', '2026-10-19T09:00:01.100Z', NULL,                    'final'),
  ('v-006', 'bed-001', 'pat-001', 'adm-001', '8462-4',  'inst-001', 78,   'mm[Hg]',    '2026-10-19T09:00:00.000Z', '2026-10-19T09:00:01.100Z', NULL,                    'final'),
  -- MAP is derived, never measured. Provenance is mandatory.
  ('v-007', 'bed-001', 'pat-001', 'adm-001', '8478-0',  'inst-001', 92,   'mm[Hg]',    '2026-10-19T09:00:00.000Z', '2026-10-19T09:00:01.120Z', 'v-005,v-006',           'final');

INSERT INTO alerts (id, bed_id, patient_id, admission_id, parameter_code, priority, kind, message, raised_at, annunciated_at, acknowledged_at, acknowledged_by, cleared_at, escalation_count) VALUES
  -- HIGH: open, unacknowledged. This is what the nurse station sorts to the top.
  ('alr-001', 'bed-001', 'pat-001', 'adm-001', '59408-5', 'HIGH',   'physiological', 'SpO2 low: 88% below limit 90%', '2026-10-19T09:02:00Z', '2026-10-19T09:02:00.640Z', NULL, NULL, NULL, 0),
  ('alr-002', 'bed-001', 'pat-001', 'adm-001', '8867-4',  'MEDIUM', 'technical',     'ECG lead off: RA electrode disconnected', '2026-10-19T09:01:00Z', '2026-10-19T09:01:00.510Z', '2026-10-19T09:01:22Z', 'staff-001', '2026-10-19T09:03:00Z', 0),
  ('alr-003', 'bed-003', 'pat-002', 'adm-002', '9279-1',  'LOW',    'system',        'NIBP cuff size mismatch - verify 23-33 cm', '2026-10-19T09:00:00.000Z', '2026-10-19T09:00:00.380Z', '2026-10-19T09:00:45Z', 'staff-001', '2026-10-19T09:05:00Z', 1),
  -- INFORMATION is explicitly not an alarm condition under 60601-1-8.
  ('alr-004', 'bed-001', 'pat-001', 'adm-001', '8310-5',  'INFORMATION', 'system',  'Temperature probe re-sited by staff-001', '2026-10-19T09:04:00Z', '2026-10-19T09:04:00.200Z', '2026-10-19T09:04:05Z', 'staff-001', '2026-10-19T09:04:05Z', 0);

INSERT INTO alarm_acknowledgements (id, alert_id, staff_id, acknowledged_at, action) VALUES
  ('ack-001', 'alr-002', 'staff-001', '2026-10-19T09:01:22Z', 'ACK'),
  ('ack-002', 'alr-003', 'staff-001', '2026-10-19T09:00:45Z', 'ACK'),
  ('ack-003', 'alr-004', 'staff-001', '2026-10-19T09:04:05Z', 'ACK');

INSERT INTO abdm_consent_links (id, patient_id, consent_artefact_id, consent_status, purpose_code, access_mode, valid_from, data_erase_at) VALUES
  ('cnc-001', 'pat-001', 'CAREMGT-2026-10-19-a91f', 'GRANTED', 'CAREMGT', 'VIEW', '2026-10-19T09:00:00.000Z', '2027-10-19T09:00:00Z'),
  -- A request that the patient has not yet acted on. Not an artefact.
  ('cnc-002', 'pat-002', NULL,                        'REQUESTED','CAREMGT','VIEW', NULL, NULL);

INSERT INTO consumables (id, sku, description, category, unit_of_issue, on_hand, reorder_level, unit_cost_inr) VALUES
  ('con-001', 'ECG-ELEC-50',  'ECG electrodes Ag/AgCl PE foam, 50 pack', 'ECG_ELECTRODE', 'pack',   42,  20, 148.00),
  ('con-002', 'SPO2-PROBE-A', 'SpO2 adult reusable finger clip probe',      'SPO2_PROBE',    'each',   9,   6,  1792.00),
  ('con-003', 'NIBP-CUFF-AD', 'NIBP cuff reusable adult 23-33 cm latex-free','NIBP_CUFF',    'each',   14,  8,  240.00),
  ('con-004', 'TEMP-PROBE-S', 'Temperature probe skin, single patient use', 'TEMP_PROBE',   'each',   60,  40, 62.00);

INSERT INTO consumable_usage (id, consumable_id, admission_id, bed_id, quantity, used_at, billed) VALUES
  ('cu-001', 'con-001', 'adm-001', 'bed-001', 3, '2026-10-19T05:50:00Z', TRUE),
  ('cu-002', 'con-002', 'adm-001', 'bed-001', 1, '2026-10-19T05:52:00Z', TRUE),
  ('cu-003', 'con-004', 'adm-001', 'bed-001', 2, '2026-10-19T05:55:00Z', FALSE);

INSERT INTO billing_events (id, admission_id, event_type, description, amount_inr, occurred_at) VALUES
  ('bil-001', 'adm-001', 'BED_CHARGE',  'ICU bed day, 19 Oct 2026',          8500.00, '2026-10-19T06:00:00Z'),
  ('bil-002', 'adm-001', 'DEVICE_USAGE','Multifunction monitor rental',       1200.00, '2026-10-19T06:00:00Z'),
  ('bil-003', 'adm-001', 'CONSUMABLE',  'ECG electrodes 50-pack x3',            444.00, '2026-10-19T05:50:00Z'),
  ('bil-004', 'adm-001', 'CONSUMABLE',  'SpO2 probe issue',                   1792.00, '2026-10-19T05:52:00Z');
