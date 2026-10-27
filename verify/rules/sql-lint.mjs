/**
 * Semantic DDL lint + behavioural constraint tests.
 *
 * Two layers:
 *  1. Structural - a light parser that checks cross-references the SQL
 *     engine will not catch (FKs pointing at tables that do not exist,
 *     indexes on columns that do not exist, missing composite indexes
 *     the brief demands).
 *  2. Behavioural - actually insert bad rows and assert the database
 *     REJECTS them. A schema that parses but does not enforce its own
 *     clinical-safety constraints is not a passing schema.
 *
 * TIMESTAMP NORMALISATION
 * -----------------------
 * The verification engine stores TIMESTAMPTZ as ISO-8601 TEXT. Lexical and
 * chronological order only agree if every timestamp carries the same number
 * of fractional-second digits, because '.' (0x2E) sorts below 'Z' (0x5A).
 * PostgreSQL compares TIMESTAMPTZ natively and does not have this hazard,
 * but every fixture below is written normalised so that a failure means a
 * constraint failure and never a formatting artefact.
 */

const PG_ONLY_FEATURES = [
  'EXCLUDE', 'DEFERRABLE', 'MATERIALIZED VIEW', 'CREATE EXTENSION',
  'PARTITION BY RANGE', 'PARTITION OF', 'DISTINCT ON'
];

export function structuralLint(sql, manifest) {
  const findings = [];
  const tables = new Map();
  const indexes = [];
  const fks = [];

  // --- CREATE TABLE blocks -------------------------------------------------
  const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)\s*\(([\s\S]*?)\n\);/gi;
  let m;
  while ((m = tableRe.exec(sql)) !== null) {
    const name = m[1].toLowerCase();
    const body = m[2];
    const cols = new Set();
    const colRe = /^\s{2,}([a-z_][a-z0-9_]*)\s+[A-Za-z]/gmi;
    let c;
    while ((c = colRe.exec(body)) !== null) cols.add(c[1].toLowerCase());
    tables.set(name, cols);

    const fkRe = /REFERENCES\s+([a-z_][a-z0-9_]*)\s*\(\s*([a-z_][a-z0-9_]*)\s*\)/gi;
    let f;
    while ((f = fkRe.exec(body)) !== null) {
      fks.push({ from: name, to: f[1].toLowerCase(), col: f[2].toLowerCase() });
    }

    for (const feat of PG_ONLY_FEATURES) {
      if (new RegExp('\\b' + feat + '\\b', 'i').test(body)) {
        findings.push({
          level: 'info', file: 'db/01_schema.sql',
          message: `Table ${name} uses PostgreSQL-only feature ${feat}; guarded by @pg-only markers, so not executed by the SQLite verification engine.`
        });
      }
    }
  }

  // --- Indexes -------------------------------------------------------------
  const idxRe = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)\s+ON\s+([a-z_][a-z0-9_]*)\s*\(([^)]+)\)/gi;
  while ((m = idxRe.exec(sql)) !== null) {
    const cols = m[3].split(',').map(s => s.trim().replace(/\s+(ASC|DESC)$/i, '').toLowerCase());
    indexes.push({ name: m[1].toLowerCase(), table: m[2].toLowerCase(), cols });
  }

  // --- Referential integrity across tables --------------------------------
  for (const fk of fks) {
    if (!tables.has(fk.to)) {
      findings.push({
        level: 'error', file: 'db/01_schema.sql',
        message: `Foreign key on ${fk.from}.${fk.col} references table "${fk.to}" which is never created.`
      });
    }
  }

  // --- Columns referenced by indexes must exist ----------------------------
  for (const ix of indexes) {
    if (!tables.has(ix.table)) {
      findings.push({
        level: 'error', file: 'db/01_schema.sql',
        message: `Index ${ix.name} targets table "${ix.table}" which is never created.`
      });
      continue;
    }
    for (const col of ix.cols) {
      if (!tables.get(ix.table).has(col)) {
        findings.push({
          level: 'error', file: 'db/01_schema.sql',
          message: `Index ${ix.name} references column ${ix.table}.${col} which does not exist.`
        });
      }
    }
  }

  // --- Brief-mandated tables ----------------------------------------------
  for (const req of manifest.sql.mustContainTables) {
    if (!tables.has(req.toLowerCase())) {
      findings.push({
        level: 'error', file: 'db/01_schema.sql',
        message: 'Milestone M5 requires a "' + req + '" table. Not found.'
      });
    }
  }

  // --- Brief-mandated composite index: index on (bed_id + timestamp) -------
  const isTimeColumn = c => /(_at|_time|_ts|timestamp|effective|recorded)/.test(c);
  const hasTimeIndex = indexes.some(ix =>
    ix.table === 'vitals_log' &&
    ix.cols.length >= 2 &&
    ix.cols.includes('bed_id') &&
    ix.cols.some(isTimeColumn));
  if (!hasTimeIndex) {
    findings.push({
      level: 'error', file: 'db/01_schema.sql',
      message: 'Milestone M5 requires an index on (bed_id + timestamp) for vitals_log. No composite index found on bed_id together with a time column.'
    });
  }

  return { findings, tables: [...tables.keys()], indexes, fks };
}

/**
 * Behavioural tests. Each inserts a deliberately invalid row and asserts
 * the database rejects it. Returns an array of {name, pass, detail}.
 */
export function behaviourTests(db) {
  const results = [];

  const attempt = (name, sql, params, expectReject) => {
    const shouldReject = expectReject !== false;
    try {
      // Bind correctly. Using .apply(null, ...) here silently detaches the
      // Statement from its Database and every test reports "Illegal
      // invocation", which makes all the rejection tests false positives.
      db.prepare(sql).run(...(params || []));
      results.push({
        name,
        pass: !shouldReject,
        detail: shouldReject
          ? 'ACCEPTED an invalid row - the constraint is missing or too weak'
          : 'accepted as expected'
      });
    } catch (e) {
      results.push({
        name,
        pass: shouldReject,
        detail: (shouldReject ? 'rejected: ' : 'WRONGLY rejected: ') + e.message.slice(0, 110)
      });
    }
  };

  const V = (id, bed, pat, code, inst, val, unit, at, recv) =>
    "INSERT INTO vitals_log (id, bed_id, patient_id, parameter_code, instrument_id, value_num, unit_ucum, recorded_at, received_at) " +
    `VALUES ('${id}', '${bed}', '${pat}', '${code}', '${inst}', ${val}, '${unit}', '${at}', '${recv}')`;

  // Normalised fixtures: 09:00:00.000Z matches the seed exactly.
  const T0900 = '2026-10-19T09:00:00.000Z';
  const T1000 = '2026-10-19T10:00:00.000Z';
  const R1000 = '2026-10-19T10:00:00.100Z';

  // 1. Alarm priority must be constrained to the IEC 60601-1-8 Table 1 set.
  attempt('alerts.priority rejects an invalid priority',
    "INSERT INTO alerts (id, bed_id, patient_id, parameter_code, priority, kind, message, raised_at) " +
    `VALUES ('alr-bad', 'bed-001', 'pat-001', '8867-4', 'URGENT', 'physiological', 'x', '${T1000}')`);

  // 2. Physiological plausibility. 4000 bpm is a sensor or mapping fault,
  //    not a patient, and must never reach a nurse's screen.
  attempt('vitals_log rejects an impossible heart rate',
    V('v-bad-hr', 'bed-001', 'pat-001', '8867-4', 'inst-001', 4000, '/min', T1000, R1000));

  // 3. Referential integrity back to the bed inventory.
  attempt('vitals_log rejects a row for a non-existent bed',
    V('v-orphan', 'bed-999', 'pat-001', '8867-4', 'inst-001', 80, '/min', T1000, R1000));

  // 4. Oxygen saturation is a percentage.
  attempt('vitals_log rejects SpO2 above 100 percent',
    V('v-bad-spo2', 'bed-001', 'pat-001', '59408-5', 'inst-002', 140, '%', T1000, R1000));

  // 5. Mean arterial pressure is computed, never measured. Without
  //    provenance the value is untraceable, so it is refused.
  attempt('vitals_log rejects MAP without derived_from provenance',
    V('v-bad-map', 'bed-001', 'pat-001', '8478-0', 'inst-001', 93, 'mm[Hg]', T1000, R1000));

  // 6. A bed may hold at most one OPEN assignment. This is the clinical
  //    invariant that two patients can never be mapped to one bed.
  attempt('bed_assignments prevents two open occupants of the same bed',
    "INSERT INTO bed_assignments (id, bed_id, admission_id, assigned_at, released_at) " +
    `VALUES ('ba-dup', 'bed-001', 'adm-002', '${T1000}', NULL)`);

  // 7. An at-least-once broker redelivering an already-stored sample must
  //    not create a duplicate row. Timestamps match seed row v-001 exactly,
  //    so this is a genuine redelivery rather than a near-duplicate.
  attempt('vitals_log rejects redelivery of an already-stored sample',
    V('v-dup', 'bed-001', 'pat-001', '8867-4', 'inst-001', 78, '/min', T0900, '2026-10-19T09:00:09.000Z'));

  // 8. ABHA numbers must never reach the database in plaintext.
  attempt('patients rejects a plaintext or malformed ABHA value',
    "INSERT INTO patients (id, mrn, given_name, family_name, gender, date_of_birth, abha_number_encrypted, created_at) " +
    `VALUES ('pat-bad', 'MR2026099', 'Test', 'Patient', 'other', '1990-01-01', '91-1234-5678-9015', '${T1000}')`);

  // 9. An alarm cannot be acknowledged without an identified operator.
  //    IEC 60601-1-8 requires an auditable record of who responded.
  attempt('alerts rejects acknowledgement with no staff member',
    "INSERT INTO alerts (id, bed_id, patient_id, parameter_code, priority, kind, message, raised_at, acknowledged_at) " +
    `VALUES ('alr-noack', 'bed-002', 'pat-002', '8867-4', 'HIGH', 'physiological', 'tachycardia', '${T1000}', '2026-10-19T10:00:05.000Z')`);

  // 10. A correctly formed derived MAP with provenance must be ACCEPTED.
  //     Without this positive control, tests 1-9 would still "pass" if every
  //     statement errored out for an unrelated reason.
  attempt('vitals_log accepts a properly provenanced MAP',
    "INSERT INTO vitals_log (id, bed_id, patient_id, parameter_code, instrument_id, value_num, unit_ucum, recorded_at, received_at, derived_from) " +
    `VALUES ('v-ok-map', 'bed-001', 'pat-001', '8478-0', 'inst-001', 92, 'mm[Hg]', '2026-10-19T10:05:00.000Z', '2026-10-19T10:05:00.100Z', 'v-005,v-006')`,
    [], false);

  /* ---------------------------------------------------------------------
     Outbox tests. These guard the erasure path, which is the one place a
     bug is both silent and irreversible.

     The document store is fed by replaying sync_outbox. A tombstone records
     that a row was deleted so the consumer removes it. If a tombstone could
     be written against a non-DELETE operation, the publisher would replay
     an update over a row that was supposed to be gone, and the erased
     record reappears in the read model - a patient who revoked consent
     would still be findable. Nothing else in the schema would notice.
     --------------------------------------------------------------------- */

  const OUTBOX = (op, tombstone, at) =>
    "INSERT INTO sync_outbox (id, source_table, source_pk, operation, payload, created_at, is_tombstone) " +
    `VALUES ('ob-${op}-${tombstone ? 't' : 'n'}', 'patients', 'pat-001', '${op}', '{}', '${at}', ${tombstone ? 1 : 0})`;

  // 11. The operation vocabulary is closed. A publisher that does not
  //     recognise an operation must not silently drop the event.
  attempt('sync_outbox rejects an unrecognised operation',
    OUTBOX('UPSERT', false, T1000));

  // 12. A tombstone must describe a delete. Anything else permits replay to
  //     resurrect an erased row in the document read model.
  attempt('sync_outbox rejects a tombstone on a non-delete operation',
    OUTBOX('UPDATE', true, T1000));

  // 13. Positive control: a correctly formed DELETE tombstone is accepted.
  //     Without it, 11 and 12 could pass merely because every insert into
  //     this table failed for some unrelated reason.
  attempt('sync_outbox accepts a well-formed delete tombstone',
    OUTBOX('DELETE', true, '2026-10-19T10:10:00.000Z'),
    [], false);

  // 14. A non-delete event must not be marked as a tombstone, or the
  //     consumer would delete a live row on replay.
  attempt('sync_outbox rejects a tombstone flag on an insert',
    OUTBOX('INSERT', true, '2026-10-19T10:15:00.000Z'));

  return results;
}
