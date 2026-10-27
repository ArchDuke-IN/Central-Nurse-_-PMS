/**
 * Scope coverage audit.
 *
 *   node tools/scope-audit.mjs          audit and report
 *   node tools/scope-audit.mjs --write  also emit frontend/js/scope.json
 *
 * Answers one question: is every goal and milestone in the assignment brief
 * actually discharged by an artifact in this repository?
 *
 * A goal counts as satisfied only when its evidence files exist AND contain
 * the specific markers below. Asserting coverage in prose is not evidence;
 * the checks here point at files and content that a reader can open.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const DIM = s => `\x1b[90m${s}\x1b[0m`;
const GREEN = s => `\x1b[32m${s}\x1b[0m`;
const RED = s => `\x1b[31m${s}\x1b[0m`;
const YELLOW = s => `\x1b[33m${s}\x1b[0m`;

const read = rel => {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};

/**
 * evidence: [{ file, must?: [substring or RegExp], note }]
 * A missing file fails immediately. A `must` that is absent fails the item.
 */
const GOALS = [
  {
    id: 'G1', phase: 1,
    goal: 'Physical ward design — safe, functional 5-bed layout with instrumented bedside units',
    evidence: [
      { file: 'report/02_ward_layout.md', must: [/clearance/i, /equipotential bonding/i, /hand.?wash/i], note: 'zoning, clearance, bonding, hand hygiene' },
      { file: 'figures/m3_ward_layout.svg', must: ['BED-01', 'BED-05', 'NURSE STATION'], note: 'five beds and the station' },
      { file: 'report/02_ward_layout.md', must: [/electrosurg|diathermy/i, /shielded/i], note: 'VOC diathermy handled' },
      { file: 'report/appendices/A_requirements_checklist.md', must: ['E-01', 'N-10'], note: 'environmental constraints traced' },
    ]
  },
  {
    id: 'G2', phase: 2,
    goal: 'Centralised monitoring — all beds feed live vitals to a single nurse-station hub',
    evidence: [
      { file: 'report/04_system_architecture.md', must: [/distributed alarm system/i], note: 'DAS classification' },
      { file: 'report/04_system_architecture.md', must: [/latency/i, /MQTT/i, /NTP|time synch/i], note: 'latency budget, transport, time sync' },
      { file: 'figures/m4_block_diagram.svg', must: ['CENTRAL HUB', 'ACKNOWLEDGEMENT LOOP', 'ALARM SIGNAL PATH'], note: 'block, alarm path, ack loop' },
      { file: 'frontend/index.html', must: ['Nurse Station', 'view-dashboard'], note: 'working centralised display' },
    ]
  },
  {
    id: 'G3', phase: 3,
    goal: 'Digital health integration — ABHA registration and MongoDB-backed record sync',
    evidence: [
      { file: 'report/06_digital_health.md', must: [/ABHA/i, /Luhn/i, /GRANTED/i, /WellnessRecord/i], note: 'identity, check digit, consent state, record type' },
      { file: 'report/06_digital_health.md', must: [/FHIR R4|4\.0\.1/, /outbox|change data capture/i], note: 'R4 and sync pattern' },
      { file: 'figures/m6_data_flow.svg', must: ['ENROLMENT', 'CONSENT', 'PUBLISH', 'MongoDB'], note: 'four-stage flow' },
      { file: 'report/05_data_model.md', must: [/sync_outbox/, /tombstone/i], note: 'outbox + tombstone in the schema' },
      { file: 'db/01_schema.sql', must: ['ck_outbox_tombstone', 'data_erase_at'], note: 'erasure path enforced, not just described' },
    ]
  },
  {
    id: 'G4', phase: 2,
    goal: 'Data modelling — full RDBMS schema covering patients, vitals, alerts and staff',
    evidence: [
      { file: 'db/01_schema.sql', must: ['CREATE TABLE patients', 'CREATE TABLE beds', 'CREATE TABLE instruments', 'CREATE TABLE vitals_log', 'CREATE TABLE alerts', 'CREATE TABLE staff'], note: 'all six briefed tables' },
      { file: 'db/01_schema.sql', must: ['ix_vitals_bed_time', 'recorded_at'], note: 'brief-mandated composite index' },
      { file: 'db/01_schema.sql', must: [/CHECK/i], note: 'constraints present' },
      { file: 'figures/m5_er_diagram.svg', must: ['patients', 'vitals_log', 'alerts', 'staff'], note: 'ER diagram' },
      { file: 'report/05_data_model.md', must: [/derived_from/i, /provenance/i], note: 'derived-value provenance' },
    ]
  },
  {
    id: 'G5', phase: 4,
    goal: 'HMS linkage — admission, billing and inventory into hospital-wide systems',
    evidence: [
      { file: 'report/07_hms_integration.md', must: [/admission/i, /billing/i, /inventory/i, /reorder/i], note: 'all three domains' },
      { file: 'report/07_hms_integration.md', must: [/severity hierarchy/i, /Code Blue/i], note: 'alarm severity across systems' },
      { file: 'figures/m7_hms_integration.svg', must: ['ADMISSION', 'BILLING', 'INVENTORY', 'NURSE CALL'], note: 'integration map' },
      { file: 'db/01_schema.sql', must: ['CREATE TABLE billing_events', 'CREATE TABLE consumables'], note: 'ledger tables' },
    ]
  }
];

const MILESTONES = [
  {
    id: 'M1', phase: 1, name: 'Requirements checklist', deliverable: 'One-page checklist',
    evidence: [
      { file: 'report/appendices/A_requirements_checklist.md', must: ['Functional requirements', 'Non-functional', 'Standards to be cited'], note: 'F / N / E / standards blocks' },
    ]
  },
  {
    id: 'M2', phase: 1, name: 'Instrument specification', deliverable: 'Spec table with signal, power, isolation',
    evidence: [
      { file: 'report/03_instrument_specs.md', must: ['Signal type', 'Isolation', 'Power', 'Type CF', 'Type BF'], note: 'the three briefed attributes' },
      { file: 'report/03_instrument_specs.md', must: [/ECG/i, /NIBP/i, /SpO/i, /temperature/i], note: 'all four instruments' },
      { file: 'report/03_instrument_specs.md', must: [/80601-2-49/, /60601-2-27/, /80601-2-30/, /80601-2-61/, /80601-2-56/], note: 'correct particular standards' },
    ]
  },
  {
    id: 'M3', phase: 2, name: 'Ward layout and electrode diagram', deliverable: 'Layout schematic + electrode diagram',
    evidence: [
      { file: 'report/02_ward_layout.md', must: [/electrode/i, /equipotential|grounding/i], note: 'electrodes and grounding points' },
      { file: 'figures/m3_ward_layout.svg', must: ['BED-01', 'BED-05', 'ESU'], note: 'floor plan' },
      { file: 'figures/m3_electrode_12lead.svg', must: ['RA', 'LA', 'RL', 'LL', 'V1', 'V6'], note: 'ten electrodes' },
      { file: 'report/appendices/B_electrode_placement.md', must: ['Mason', 'Einthoven', 'Wilson'], note: 'derivation reference' },
    ]
  },
  {
    id: 'M4', phase: 2, name: 'System architecture diagram', deliverable: 'Labelled block diagram with alarm and ack paths',
    evidence: [
      { file: 'report/04_system_architecture.md', must: [/gateway/i, /alarm/i, /acknowledg/i], note: 'architecture argued' },
      { file: 'figures/m4_block_diagram.svg', must: ['CENTRAL HUB', 'ALARM SIGNAL PATH', 'ACKNOWLEDGEMENT LOOP', 'MongoDB', 'ABDM'], note: 'labelled with both paths' },
    ]
  },
  {
    id: 'M5', phase: 2, name: 'RDBMS schema design', deliverable: 'ER diagram + schema DDL',
    evidence: [
      { file: 'db/01_schema.sql', must: ['REFERENCES', 'CREATE INDEX', 'CONSTRAINT'], note: 'FKs, indexes, constraints' },
      { file: 'figures/m5_er_diagram.svg', must: ['vitals_log', 'alerts', 'sync_outbox'], note: 'ER diagram' },
      { file: 'report/05_data_model.md', must: ['vitals_log', 'alerts', 'staff'], note: 'schema discussed' },
    ]
  },
  {
    id: 'M6', phase: 3, name: 'Digital health flow', deliverable: 'Data flow diagram',
    evidence: [
      { file: 'report/06_digital_health.md', must: [/ABDM/, /consent/i, /FHIR/], note: 'flow documented' },
      { file: 'figures/m6_data_flow.svg', must: ['STAGE 1', 'STAGE 4', 'MongoDB'], note: 'four-stage diagram' },
      { file: 'report/06_digital_health.md', must: ['8867-4', '59408-5', '85354-9'], note: 'LOINC mapping' },
    ]
  },
  {
    id: 'M7', phase: 3, name: 'HMS integration design', deliverable: 'Integration map',
    evidence: [
      { file: 'report/07_hms_integration.md', must: [/hook/i, /billing/i, /inventory|reorder/i], note: 'triggers and ledger' },
      { file: 'figures/m7_hms_integration.svg', must: ['ADMISSION', 'BILLING', 'INVENTORY'], note: 'integration map' },
    ]
  },
  {
    id: 'M8', phase: 4, name: 'Draft all sections', deliverable: 'Full 8-section document',
    evidence: [
      { file: 'report/01_introduction.md', must: ['Introduction'] },
      { file: 'report/02_ward_layout.md', must: ['Ward Layout'] },
      { file: 'report/03_instrument_specs.md', must: ['Instrument Specif'] },
      { file: 'report/04_system_architecture.md', must: ['Architecture'] },
      { file: 'report/05_data_model.md', must: ['Data Model'] },
      { file: 'report/06_digital_health.md', must: ['Digital Health'] },
      { file: 'report/07_hms_integration.md', must: ['Hospital Management'] },
      { file: 'report/08_safety_standards.md', must: ['Safety'] },
    ]
  },
  {
    id: 'M9', phase: 4, name: 'Review and finalise', deliverable: 'Submission-ready document',
    evidence: [
      { file: 'README.md', must: ['npm run loop', 'npm test'], note: 'build and verify documented' },
      { file: 'dist/PMS_Report.md', must: ['Table of contents'], note: 'assembled submission document' },
      { file: 'build/status.json', must: ['"pass"'], note: 'gate verdict' },
    ]
  }
];

const PHASES = [
  { id: 'P1', name: 'Research and planning', members: ['M1', 'M2'] },
  { id: 'P2', name: 'Design',                members: ['M3', 'M4', 'M5'] },
  { id: 'P3', name: 'Integration design',    members: ['M6', 'M7'] },
  { id: 'P4', name: 'Write-up and submission', members: ['M8', 'M9'] }
];

/* ---------------------------------------------------------------- audit */

function auditItem(item) {
  const evidence = [];
  let ok = true;
  for (const ev of item.evidence) {
    const text = read(ev.file);
    if (text === null) {
      evidence.push({ file: ev.file, ok: false, why: 'file missing', note: ev.note });
      ok = false;
      continue;
    }
    if (ev.must) {
      const missing = ev.must.filter(m => typeof m === 'string' ? !text.includes(m) : !m.test(text));
      if (missing.length) {
        const labels = missing.map(m => typeof m === 'string' ? `"${m}"` : String(m));
        evidence.push({ file: ev.file, ok: false, why: `missing ${labels.join(', ')}`, note: ev.note });
        ok = false;
        continue;
      }
    }
    evidence.push({ file: ev.file, ok: true, note: ev.note });
  }
  return { ...item, ok, evidence };
}

const goals = GOALS.map(auditItem);
const milestones = MILESTONES.map(auditItem);
const phases = PHASES.map(p => {
  const members = milestones.filter(m => p.members.includes(m.id));
  const missing = members.filter(m => !m.ok).length;
  return { id: p.id, name: p.name, total: members.length, satisfied: members.length - missing, missing };
});

const summary = list => ({
  total: list.length,
  satisfied: list.filter(i => i.ok ?? i.missing === 0).length,
  missing: list.filter(i => (i.ok ?? i.missing === 0) === false).length
});

const result = {
  generatedAt: new Date().toISOString(),
  goals: goals.map(g => ({ id: g.id, phase: g.phase, goal: g.goal, ok: g.ok, evidence: g.evidence })),
  milestones: milestones.map(m => ({ id: m.id, phase: m.phase, name: m.name, deliverable: m.deliverable, ok: m.ok, evidence: m.evidence })),
  goalSummary: summary(goals),
  milestoneSummary: summary(milestones),
  phaseSummary: summary(phases),
};

/* --------------------------------------------------------------- output */

const line = (item) => {
  const badge = item.ok ? GREEN(' ok ') : RED('GAP ');
  console.log(`  ${badge} ${item.id.padEnd(4)} ${item.name || item.goal}`);
  for (const e of item.evidence) {
    if (e.ok) console.log(DIM(`         + ${e.file}${e.note ? '  — ' + e.note : ''}`));
    else console.log(RED(`         x ${e.file}  — ${e.why}`));
  }
};

console.log('');
console.log(DIM('  Scope coverage audit'));
console.log(DIM('  ' + '-'.repeat(70)));
console.log(`  ${DIM('GOALS')}`);
goals.forEach(line);
console.log(`  ${DIM('MILESTONES')}`);
milestones.forEach(line);
console.log(`  ${DIM('PHASES')}`);
for (const p of phases) {
  const b = p.missing ? RED('GAP ') : GREEN(' ok ');
  console.log(`  ${b} ${p.id.padEnd(4)} ${p.name.padEnd(26)} ${p.satisfied}/${p.total}`);
}
console.log(DIM('  ' + '-'.repeat(70)));

const allOk = result.goalSummary.missing === 0 && result.milestoneSummary.missing === 0;
console.log(`  ${result.goalSummary.satisfied}/${result.goalSummary.total} goals · ` +
            `${result.milestoneSummary.satisfied}/${result.milestoneSummary.total} milestones · ` +
            `${result.phaseSummary.satisfied}/${result.phaseSummary.total} phases`);
console.log('');
console.log(allOk ? GREEN('  ALL SCOPE SATISFIED') : YELLOW('  SCOPE HAS GAPS'));
console.log('');

if (WRITE) {
  const outDir = path.join(ROOT, 'frontend/js');
  fs.mkdirSync(outDir, { recursive: true });

  // JSON, for tooling and for anything that wants to read it as data.
  fs.writeFileSync(path.join(outDir, 'scope.json'), JSON.stringify(result, null, 2), 'utf8');

  // A module, so the application never has to fetch() it. A fetch of a
  // sibling file is blocked under the file:// origin, which would silently
  // break the standalone build; embedding removes the failure mode rather
  // than guarding against it.
  const js = '/* Generated by tools/scope-audit.mjs --write. Do not edit. */\n'
    + 'export const SCOPE_DATA = ' + JSON.stringify(result, null, 2) + ';\n';
  fs.writeFileSync(path.join(outDir, 'scope-data.js'), js, 'utf8');

  console.log(DIM('  wrote frontend/js/scope.json'));
  console.log(DIM('  wrote frontend/js/scope-data.js'));
  console.log('');
}

process.exit(allOk ? 0 : 1);
