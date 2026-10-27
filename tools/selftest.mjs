/**
 * Verifier self-test.
 *
 *   node tools/selftest.mjs
 *
 * A build gate that has never failed is not evidence of anything. This script
 * injects deliberate faults into the sources, confirms the gate rejects each
 * one with the expected rule id, and restores the original file. Every
 * mutation is reverted in a finally block, even if an assertion throws.
 *
 * If a check below cannot be made to fail, that check is not providing the
 * assurance it claims to provide, and it should be rewritten or removed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifyPath = path.join(ROOT, 'verify/verify.mjs');
const statusPath = path.join(ROOT, 'build/status.json');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/manifest.json'), 'utf8'));

const DIM = s => `\x1b[90m${s}\x1b[0m`;
const GREEN = s => `\x1b[32m${s}\x1b[0m`;
const RED = s => `\x1b[31m${s}\x1b[0m`;

/** Every file the verifier scans. scope 'md' excludes the SQL sources. */
const scannable = (scope) => {
  const md = [
    ...manifest.sections.map(s => s.file),
    ...manifest.appendices.map(a => a.file)
  ];
  return scope === 'md' ? md : [...md, ...manifest.sql.files];
};

/** Case-insensitive replace-all, so a mutation cannot be silently evaded by a capitalised heading. */
function applyEdits(text, edits) {
  let out = text;
  for (const e of edits) {
    const re = new RegExp(e.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, e.repl);
  }
  return out;
}

function runVerify() {
  spawnSync(process.execPath, [verifyPath, '--json'], { cwd: ROOT, encoding: 'utf8' });
  return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
}

/**
 * Each mutation declares either a single {file, find, repl} target, or
 * `everywhere` to remove a term from every scanned section.
 */
const MUTATIONS = [
  {
    name: 'banned LOINC code reintroduced',
    file: 'report/06_digital_health.md',
    find: '`8480-6`',
    repl: '`85026-9`',
    expect: 'loinc-banned'
  },
  {
    name: 'superseded standard number cited as current',
    file: 'report/03_instrument_specs.md',
    find: 'IEC 80601-2-30',
    repl: 'IEC 60601-2-30',
    expect: 'std-60601-2-30'
  },
  {
    name: 'FHIR Observation loses its required subject',
    file: 'report/06_digital_health.md',
    find: '  "subject": { "reference": "Patient/pat-001", "display": "Anil Sharma" },',
    repl: '  "note": "subject removed to simulate a malformed resource",',
    expect: 'fhir'
  },
  {
    name: 'FHIR unit code contradicts its display string',
    file: 'report/06_digital_health.md',
    find: '"code": "mm[Hg]"',
    repl: '"code": "mmHg"',
    expect: 'fhir'
  },
  {
    name: 'alarm priority constraint weakened to accept anything',
    file: 'db/01_schema.sql',
    find: "CHECK (priority IN ('HIGH','MEDIUM','LOW','INFORMATION'))",
    repl: 'CHECK (priority IS NOT NULL)',
    expect: 'sql-constraint'
  },
  {
    name: 'SpO2 plausibility constraint removed from vitals_log',
    file: 'db/01_schema.sql',
    find: "        CHECK (parameter_code <> '59408-5' OR (value_num BETWEEN 50 AND 100)),",
    repl: '        -- plausibility check removed to simulate a regression',
    expect: 'sql-constraint'
  },
  {
    name: 'derived-value provenance constraint removed',
    file: 'db/01_schema.sql',
    find: '        CHECK (parameter_code <> \'8478-0\' OR derived_from IS NOT NULL),',
    repl: '        -- provenance constraint removed to simulate a regression',
    expect: 'sql-constraint'
  },
  {
    name: 'outbox tombstone constraint removed, permitting erasure to be undone',
    file: 'db/01_schema.sql',
    find: "    CONSTRAINT ck_outbox_tombstone\n        CHECK (NOT is_tombstone OR operation = 'DELETE'),",
    repl: '    -- tombstone constraint removed: a delete may now be replayed as an update',
    expect: 'sql-constraint'
  },
  {
    name: 'required composite index on (bed_id, timestamp) removed',
    file: 'db/01_schema.sql',
    find: 'CREATE INDEX ix_vitals_bed_time\n    ON vitals_log (bed_id, recorded_at DESC);',
    repl: '-- index removed to simulate a regression',
    expect: 'sql-structure'
  },
  {
    name: 'embedded report SQL references a table that does not exist',
    file: 'report/05_data_model.md',
    find: 'FROM consumables\n WHERE on_hand <= reorder_level',
    repl: 'FROM consumables_typo\n WHERE on_hand <= reorder_level',
    expect: 'sql-fence'
  },
  {
    // The required-concept check is document-wide by design, and the concept
    // also appears in the schema comments, so the fault has to cover both.
    // The replace is case-insensitive so a capitalised comment cannot evade it.
    name: 'required concept removed from every file that states it',
    everywhere: [{ find: 'distributed alarm system', repl: 'remote alert arrangement' }],
    expect: 'required-content'
  },
  {
    // Goal coverage is an alternation, so every branch of the pattern has to go
    // before the check can be expected to fire. Scoped to markdown, because
    // replacing these words inside the SQL would corrupt column names.
    name: 'every term addressing goal G5 removed from the prose',
    everywhere: [
      { find: 'HMS', repl: 'legacy system' },
      { find: 'billing', repl: 'charging' },
      { find: 'inventory', repl: 'stock' },
      { find: 'admission', repl: 'arrival' }
    ],
    scope: 'md',
    expect: 'goal-coverage'
  }
];

let passed = 0;
let failed = 0;

console.log('');
console.log(DIM('  Verifier self-test — injecting deliberate faults'));
console.log(DIM('  ' + '-'.repeat(68)));

// The tree must pass before any fault is injected, otherwise every assertion
// below would be trivially satisfied.
const baseline = runVerify();
if (!baseline.pass) {
  console.log(RED('  Baseline does not pass. Clear existing errors before testing the gate.'));
  process.exit(1);
}
console.log(DIM('  baseline            PASS (0 errors)'));
console.log('');

for (const m of MUTATIONS) {
  const edits = m.everywhere || [{ find: m.find, repl: m.repl }];

  // Resolve the set of files this mutation touches.
  let targets;
  if (m.everywhere) {
    targets = scannable(m.scope)
      .map(file => {
        const abs = path.join(ROOT, file);
        const original = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
        return { abs, original, has: applyEdits(original, edits) !== original };
      })
      .filter(t => t.has)
      .map(t => ({ abs: t.abs, original: t.original }));
  } else {
    const abs = path.join(ROOT, m.file);
    if (!fs.existsSync(abs)) {
      console.log('  ' + RED('SKIP') + '  ' + m.name + ' — missing ' + m.file);
      failed++;
      continue;
    }
    targets = [{ abs, original: fs.readFileSync(abs, 'utf8') }];
  }

  const anchored = targets.filter(t => applyEdits(t.original, edits) !== t.original);
  if (!anchored.length) {
    console.log('  ' + RED('SKIP') + '  ' + m.name + ' — anchor text not found');
    failed++;
    continue;
  }

  try {
    for (const t of anchored) {
      fs.writeFileSync(t.abs, applyEdits(t.original, edits), 'utf8');
    }

    const status = runVerify();
    const hit = status.findings.find(f => f.check === m.expect && f.level === 'error');

    if (status.pass) {
      console.log('  ' + RED('MISS') + '  ' + m.name);
      console.log(DIM('          gate reported PASS despite the injected fault'));
      failed++;
    } else if (!hit) {
      console.log('  ' + RED('WRONG') + '  ' + m.name);
      console.log(DIM('          failed, but not on rule "' + m.expect + '". Fired: ' +
        [...new Set(status.findings.filter(f => f.level === 'error').map(f => f.check))].join(', ')));
      failed++;
    } else {
      console.log('  ' + GREEN('CAUGHT') + '  ' + m.name);
      console.log(DIM('          rule: ' + m.expect + ' — ' + hit.message.slice(0, 90)));
      passed++;
    }
  } finally {
    for (const t of targets) fs.writeFileSync(t.abs, t.original, 'utf8');
  }
}

console.log('');
console.log(DIM('  ' + '-'.repeat(68)));
console.log(`  ${passed} caught, ${failed} missed, ${MUTATIONS.length} mutations`);
console.log('');

// Confirm the tree came back clean.
const final = runVerify();
if (final.pass) {
  console.log('  ' + GREEN('restored') + '  tree verified PASS after reverting every mutation');
  console.log('');
} else {
  console.log('  ' + RED('BROKEN') + '  tree did NOT return to a passing state');
  process.exit(1);
}

process.exit(failed === 0 ? 0 : 1);
