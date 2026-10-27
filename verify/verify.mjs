/**
 * PMS build-and-verify loop.
 *
 *   node verify/verify.mjs            full run
 *   node verify/verify.mjs --json     machine-readable only
 *   node verify/verify.mjs --quiet    errors only
 *
 * Exit code 0 = gate passed, 1 = gate failed.
 *
 * The verifier never throws on a missing artifact: a missing file is a
 * finding, so that an incomplete build reports progress rather than
 * crashing halfway through the checks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { BANNED, REQUIRED } from './rules/standards-lint.mjs';
import { toSqlite, extractSqlFences } from './rules/sql-shim.mjs';
import { structuralLint, behaviourTests } from './rules/sql-lint.mjs';
import { extractJsonFences, lintFhir } from './rules/fhir-lint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const JSON_ONLY = argv.includes('--json');
const QUIET = argv.includes('--quiet');

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/manifest.json'), 'utf8'));

const findings = [];
const add = (level, check, message, file = null) => findings.push({ level, check, message, file });

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/**
 * Minimal glob-to-regex supporting `**` (zero or more path segments) and `*`
 * (anything within one segment). Patterns are matched against the
 * POSIX-style path relative to the project root.
 *
 * Note: fs does not expand globs, and path.join(ROOT, 'report\**\*.md')
 * silently yields a path that does not exist, so walking the literal prefix
 * and filtering is the only reliable approach here.
 */
function globToRegExp(pat) {
  const re = pat
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:[^/]+/)*');
  return new RegExp('^' + re + '$');
}

function expandGlobs() {
  const out = [];
  for (const g of manifest.scanGlobs.content) {
    const parts = g.replace(/\\/g, '/').split('/');
    const literal = [];
    let i = 0;
    while (i < parts.length && !parts[i].includes('*')) literal.push(parts[i++]);
    const rootDir = path.join(ROOT, ...literal);
    if (!fs.existsSync(rootDir)) {
      add('warn', 'glob-root', `Scan glob "${g}" has no matching directory "${literal.join('/')}".`);
      continue;
    }
    const re = globToRegExp(parts.slice(i).join('/'));

    const walk = dir => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        const rel = path.relative(ROOT, p).replace(/\\/g, '/');
        if (re.test(rel)) out.push(p);
      }
    };
    walk(rootDir);
  }
  return [...new Set(out)].sort();
}

function figuresOnDisk() {
  const dir = path.join(ROOT, 'figures');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.svg')).map(f => path.join(dir, f));
}

const contentFiles = expandGlobs();
const allText = new Map();
for (const f of contentFiles) allText.set(f, fs.readFileSync(f, 'utf8'));

// ---------------------------------------------------------------------------
// 1. Artifact existence and content gates
// ---------------------------------------------------------------------------
function checkArtifacts() {
  const declared = [];
  for (const s of manifest.sections) declared.push({ ...s, kind: 'markdown', milestone: 'M8' });
  for (const a of manifest.appendices) declared.push({ ...a, kind: 'markdown', milestone: a.milestone });
  for (const f of manifest.figures) declared.push({ ...f, kind: 'svg', milestone: f.milestone });

  for (const a of declared) {
    const abs = path.join(ROOT, a.file);
    const rel = a.file;
    if (!fs.existsSync(abs)) {
      add('error', 'artifact-exists', `Missing artifact: ${a.file}`, rel);
      continue;
    }
    const size = fs.statSync(abs).size;
    if (size < 400) {
      add('error', 'artifact-size', `${a.file} is only ${size} bytes; too small to be a deliverable.`, rel);
    }
    if (a.kind === 'svg') {
      const s = fs.readFileSync(abs, 'utf8');
      if (!/<svg[\s>]/i.test(s)) add('error', 'svg-root', `${a.file} has no <svg> root element.`, rel);
      if (!/<title[\s>]/i.test(s)) add('error', 'svg-title', `${a.file} has no <title>; figures must be self-describing for accessibility.`, rel);
      if (!/viewBox=/i.test(s)) add('warn', 'svg-viewbox', `${a.file} has no viewBox; it will not scale cleanly.`, rel);
    }
    if (a.kind === 'markdown' && !/^#\s/m.test(fs.readFileSync(abs, 'utf8'))) {
      add('error', 'md-heading', `${a.file} has no top-level markdown heading.`, rel);
    }
  }
  return declared;
}

// ---------------------------------------------------------------------------
// 2. Standards lint across all prose
// ---------------------------------------------------------------------------
function checkStandards() {
  const SUPPRESS = /lint-allow\s+([a-z0-9-]+)/i;

  for (const [file, text] of allText) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/^\s*(import|export|\/\/)/.test(line)) return;

      // Explicit suppressions, declared on this line or within the three above.
      // These stay visible in the source, so a suppressed finding is auditable
      // rather than silently absent.
      const suppressed = new Set();
      for (let k = Math.max(0, i - 3); k <= i; k++) {
        const m = (lines[k] || '').match(SUPPRESS);
        if (m) suppressed.add(m[1].toLowerCase());
      }

      // Prose wraps. A qualification such as "diagnostic" or "half
      // standardisation" is routinely on a different line from the term it
      // qualifies, so search a small window rather than the single line.
      const window = lines.slice(Math.max(0, i - 2), i + 3).join(' ');

      for (const rule of BANNED) {
        const m = line.match(rule.pattern);
        if (!m) continue;
        if (suppressed.has(rule.id)) continue;
        if (rule.allowContext && rule.allowContext.test(window)) continue;
        add(rule.severity, rule.id, 'line ' + (i + 1) + ': ' + rule.message + ' (found "' + m[0] + '"). Fix: ' + rule.fix, rel);
      }
    });
  }

  const joined = [...allText.values()].join('\n');
  for (const r of REQUIRED) {
    if (!r.pattern.test(joined)) {
      add('error', 'required-content', `Required concept absent from the whole document: ${r.why}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Terminology validation
// ---------------------------------------------------------------------------
function checkTerminology() {
  const { loincVerified, loincBanned, ucumVerified } = manifest.globalChecks.requiredTerminology;
  const verified = new Set(loincVerified);
  const banned = new Set(loincBanned);

  // Match NNNN-N but not the NNNN-NN-MM prefix of dates, nor 60601-1-2 style segments.
  // LOINC codes are cited in four places: backtick code spans, FHIR JSON code
  // values, SQL VALUES rows, and bare parenthetical references. Restricting the
  // scan to those contexts keeps standard designations such as IEC 60601-1 or
  // ISO 81060-2 out of the results, which a bare NNNN-N pattern cannot do.
  const LOINC_SHAPED = /^[0-9]{2,5}-[0-9]$/;

  const candidatesIn = text => {
    const out = new Set();
    const take = raw => {
      for (const p of String(raw).split(/[\s,;|]+/)) {
        if (LOINC_SHAPED.test(p)) out.add(p);
      }
    };
    for (const m of text.matchAll(/`([^`\n]{1,60})`/g)) take(m[1]);
    for (const m of text.matchAll(/"code"\s*:\s*"([^"\n]{1,60})"/g)) take(m[1]);
    for (const m of text.matchAll(/\(\s*([0-9]{2,5}-[0-9])\s*\)/g)) take(m[1]);
    for (const m of text.matchAll(/^\s*\(\s*'([0-9]{2,5}-[0-9])'\s*,/gm)) take(m[1]);
    return out;
  };

  for (const [file, text] of allText) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    for (const code of candidatesIn(text)) {
      if (banned.has(code)) {
        add('error', 'loinc-banned', 'Banned LOINC code ' + code + ' appears in this file.', rel);
      } else if (!verified.has(code)) {
        add('warn', 'loinc-unverified', 'Code ' + code + ' is shaped like a terminology code but is not in the verified LOINC set. Confirm on loinc.org before citing.', rel);
      }
    }
  }

  const joined = [...allText.values()].join('\n');
  if (/units-of-measure\.org/.test(joined)) {
    add('error', 'ucum-uri', 'Wrong UCUM system URI "units-of-measure.org". Correct is "http://unitsofmeasure.org" (no "s" between "units" and "of").');
  }
  for (const u of ucumVerified) {
    if (!joined.includes(u)) add('info', 'ucum-unused', `Verified UCUM code ${u} never appears.`);
  }
}

// ---------------------------------------------------------------------------
// 4. SQL: structural lint, execution, behavioural tests
// ---------------------------------------------------------------------------
function checkSql() {
  // A single fixture database, reused for the report's embedded SQL. Checking
  // embedded queries against an empty database proves nothing - every
  // reference would fail on "no such table".
  let fixture = null;

  for (const rel of manifest.sql.files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { add('error', 'sql-exists', `Missing SQL file ${rel}`, rel); continue; }
    const src = fs.readFileSync(abs, 'utf8');

    // 4a. structural
    const { findings: sf } = structuralLint(src, manifest);
    for (const f of sf) add(f.level, 'sql-structure', f.message, f.file);

    // 4b. execute
    const { sql, stripped } = toSqlite(src);
    for (const s of stripped.slice(0, 12)) {
      add('info', 'sql-pg-only', `PostgreSQL-only statement not executed by the SQLite engine: ${s.slice(0, 80)}`, rel);
    }
    let db;
    try {
      db = new DatabaseSync(':memory:');
      db.exec(sql);
      add('info', 'sql-exec', 'Schema executes cleanly under the PostgreSQL->SQLite shim.', rel);
    } catch (e) {
      add('error', 'sql-exec', `Schema failed to execute: ${e.message}`, rel);
      return;
    }

    // 4c. seed, then behavioural constraint tests
    const seedRel = manifest.sql.seedFile;
    const seedAbs = path.join(ROOT, seedRel);
    if (fs.existsSync(seedAbs)) {
      try {
        db.exec(toSqlite(fs.readFileSync(seedAbs, 'utf8')).sql);
        add('info', 'sql-seed', 'Seed data loads cleanly.', seedRel);
      } catch (e) {
        add('error', 'sql-seed', `Seed data failed to load: ${e.message}`, seedRel);
        return;
      }
    } else {
      add('warn', 'sql-seed', `Seed file ${seedRel} not found; behavioural constraint tests will be skipped.`, seedRel);
      return;
    }

    for (const t of behaviourTests(db)) {
      if (t.pass) add('info', 'sql-constraint', 'PASS ' + t.name + ' -- ' + t.detail);
      else add('error', 'sql-constraint', 'FAIL ' + t.name + ' -- ' + t.detail, rel);
    }

    // Behavioural tests deliberately insert invalid rows; roll back to a
    // clean state so the fixture stays representative for the report queries.
    fixture = db;

    // 4d. the index the brief demands must actually be usable
    try {
      const plan = db.prepare(
        `EXPLAIN QUERY PLAN SELECT * FROM vitals_log WHERE bed_id = 1 ORDER BY recorded_at DESC LIMIT 50`
      ).all();
      const usesIndex = JSON.stringify(plan).includes('ix_vitals_bed_time');
      if (usesIndex) add('info', 'sql-index-used', 'The nurse-station query for one bed uses ix_vitals_bed_time.', rel);
      else add('warn', 'sql-index-used', 'Bed+time query did not select ix_vitals_bed_time. Check index column order.', rel);
    } catch (e) {
      add('error', 'sql-index-used', `Could not plan the primary query: ${e.message}`, rel);
    }
  }

  // Embedded SQL in the report must execute against the seeded fixture.
  let fenceCount = 0;
  for (const [file, text] of allText) {
    const blocks = extractSqlFences(text);
    blocks.forEach((b, i) => {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      fenceCount++;
      if (!fixture) {
        add('error', 'sql-fence', 'Embedded SQL block ' + (i + 1) + ' cannot be checked: the schema fixture did not load.', rel);
        return;
      }
      try {
        fixture.exec(toSqlite(b).sql);
        add('info', 'sql-fence', 'Embedded SQL block ' + (i + 1) + ' executes against the seeded schema.', rel);
      } catch (e) {
        add('error', 'sql-fence', 'Embedded SQL block ' + (i + 1) + ' does not execute: ' + e.message, rel);
      }
    });
  }
  if (fenceCount === 0) add('info', 'sql-fence', 'No embedded SQL blocks found in the report.');
}

// ---------------------------------------------------------------------------
// 5. FHIR JSON blocks
// ---------------------------------------------------------------------------
function checkFhir() {
  let count = 0;
  for (const [file, text] of allText) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    for (const block of extractJsonFences(text)) {
      let obj;
      try { obj = JSON.parse(block); }
      catch (e) { add('error', 'json-parse', 'A fenced json block is not valid JSON: ' + e.message, rel); continue; }
      if (!obj.resourceType) continue;
      count++;
      for (const f of lintFhir(obj, rel)) add(f.level, 'fhir', f.message, rel);
    }
  }
  if (count === 0) add('warn', 'fhir-coverage', 'No FHIR resources found in any ```json block. Section 6 should show at least one Observation.');
  else add('info', 'fhir-coverage', `Validated ${count} FHIR resource(s).`);
}

// ---------------------------------------------------------------------------
// 6. Cross-references: figures referenced from prose, no broken links
// ---------------------------------------------------------------------------
function checkCrossRefs(declared) {
  const joined = [...allText.values()].join('\n');
  const onDisk = new Set(figuresOnDisk().map(p => path.basename(p)));

  for (const f of manifest.figures) {
    const base = path.basename(f.file);
    if (!onDisk.has(base)) continue; // already reported by artifact-exists
    const re = new RegExp(base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (!re.test(joined)) {
      add('error', 'fig-reference', `Figure ${base} exists but is never referenced from the report text. Milestone M9 requires every diagram to be referenced in prose.`, f.file);
    }
  }

  // Orphan SVGs not declared in the manifest
  for (const base of onDisk) {
    if (!manifest.figures.some(f => path.basename(f.file) === base)) {
      add('warn', 'fig-undeclared', `${base} exists in figures/ but is not declared in the manifest.`);
    }
  }

  // Broken relative markdown links
  for (const [file, text] of allText) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const dir = path.dirname(file);
    const linkRe = /\]\((?!https?:|#)([^)\s]+)\)/g;
    for (const m of text.matchAll(linkRe)) {
      const target = m[1].split('#')[0];
      if (!target) continue;
      if (!fs.existsSync(path.resolve(dir, target))) {
        add('error', 'link-broken', `Broken relative link: ${m[1]}`, rel);
      }
    }
  }

  // Section completeness
  for (const s of manifest.sections) {
    if (!fs.existsSync(path.join(ROOT, s.file))) continue;
  }
  return declared;
}

// ---------------------------------------------------------------------------
// 7. Goal coverage (G1..G5)
// ---------------------------------------------------------------------------
function checkGoals() {
  // Goal coverage is a property of the written report, so this joins the
  // prose only. Including the SQL would let a table named "admissions"
  // satisfy a goal that the narrative never actually addresses.
  const prose = [...allText.entries()]
    .filter(([f]) => f.toLowerCase().endsWith('.md'))
    .map(([, t]) => t)
    .join('\n');

  for (const [goal, re] of Object.entries(manifest.globalChecks.coverage.goalsRegex)) {
    if (!new RegExp(re, 'i').test(prose)) {
      add('error', 'goal-coverage',
        'Goal ' + goal + ' (' + manifest.goals[goal] + ') is not addressed anywhere in the report prose.');
    }
  }
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
const declared = checkArtifacts();
checkStandards();
checkTerminology();
checkSql();
checkFhir();
checkCrossRefs(declared);
checkGoals();

const counts = findings.reduce((a, f) => ((a[f.level] = (a[f.level] || 0) + 1), a), {});
const errors = counts.error || 0;
const warns = counts.warn || 0;
const pass = errors === 0;

// status file drives the loop
fs.writeFileSync(
  path.join(ROOT, 'build/status.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), pass, errors, warns, infos: counts.info || 0, findings }, null, 2)
);

if (!JSON_ONLY) {
  const G = s => `\x1b[32m${s}\x1b[0m`, R = s => `\x1b[31m${s}\x1b[0m`, Y = s => `\x1b[33m${s}\x1b[0m`, D = s => `\x1b[90m${s}\x1b[0m`;
  console.log('');
  console.log(D('  PMS build-and-verify loop'));
  console.log(D('  ' + '-'.repeat(64)));
  console.log(`  ${D('scanned')}  ${contentFiles.length} content files, ${figuresOnDisk().length} figures`);

  const groups = [['error', R], ['warn', Y], ['info', D]];
  for (const [level, colour] of groups) {
    const list = findings.filter(f => f.level === level);
    if (!list.length) continue;
    if (level === 'info' && QUIET) continue;

    console.log('');
    console.log(`  ${colour(level.toUpperCase().padEnd(5))} (${list.length})`);

    // Info is shown in full. This gate's entire value is that a developer can
    // tell "this check passed" from "this check did not run", and truncating
    // the list destroys that distinction: a passing constraint test hidden
    // below a cap is indistinguishable from a missing one. The volume here is
    // small (tens of lines), so the readability cap was never buying much and
    // was costing certainty.
    //
    // Errors and warnings were already never truncated, and must not be.
    for (const f of list) {
      console.log(`    ${colour(f.level === 'error' ? 'x' : f.level === 'warn' ? '!' : '-')} ${f.check}  ${f.message}${f.file ? D('  [' + f.file + ']') : ''}`);
    }
  }

  console.log('');
  console.log(D('  ' + '-'.repeat(64)));
  const verdict = pass ? G(`  PASS  ${errors} errors, ${warns} warnings`) : R(`  FAIL  ${errors} errors, ${warns} warnings`);
  console.log(verdict);
  console.log('');
}

process.exit(pass ? 0 : 1);
