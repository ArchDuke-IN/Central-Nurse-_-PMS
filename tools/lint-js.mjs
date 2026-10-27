/**
 * JavaScript syntax gate.
 *
 *   node tools/lint-js.mjs
 *
 * Parses every source file without executing it. This exists because of a real
 * defect it would have caught instantly: a scripted edit rewrote
 * `const $$ = ...` into `const $ = ...`, because in a String.replace()
 * *replacement string* the sequence `$$` is an escape for a literal `$`. The
 * file still parsed as text and the report still verified, so only the browser
 * revealed it — the whole application failed to boot on the first frame.
 *
 * A parse-only pass turns that class of mistake from "the demo is broken" into
 * "the build is red". It is cheap, so it runs first.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = s => `\x1b[32m${s}\x1b[0m`;
const RED = s => `\x1b[31m${s}\x1b[0m`;
const DIM = s => `\x1b[90m${s}\x1b[0m`;

/* Directories scanned for JavaScript. frontend/js is the application; tools and
 * verify are the harness; both ship, so both must parse. `verify` recurses, so
 * its subdirectory is not listed separately. */
const TARGETS = ['frontend/js', 'tools', 'verify'];

/* Generated from JSON, so it is machine-written and need not be hand-checked
 * with the same rigour, but it must still parse. */
const GENERATED = new Set(['scope-data.js']);

function collect(dir, acc = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) collect(rel, acc);
    else if (/\.(mjs|js)$/.test(e.name)) acc.push(rel);
  }
  return acc;
}

console.log('');
console.log(DIM('  JavaScript syntax gate'));
console.log(DIM('  ' + '-'.repeat(62)));

const files = TARGETS.flatMap(t => collect(t)).sort();
let bad = 0;

for (const f of files) {
  const name = f.replace(/\\/g, '/');
  // `node --check` parses without running, which is exactly the guarantee
  // wanted here: no module is imported and no side effect is triggered.
  const r = spawnSync(process.execPath, ['--check', path.join(ROOT, f)], {
    encoding: 'utf8', timeout: 20000
  });

  if (r.status === 0) {
    const tag = GENERATED.has(path.basename(f)) ? DIM(' (generated)') : '';
    console.log(`  ${GREEN('ok  ')} ${name}${tag}`);
  } else {
    bad++;
    console.log(`  ${RED('FAIL')} ${name}`);
    const msg = (r.stderr || '')
      .split('\n')
      .filter(l => l.trim() && !l.includes('Node.js v') && !l.startsWith('    at '))
      .slice(0, 6);
    for (const l of msg) console.log(`         ${RED(l.trim())}`);
  }
}

console.log(DIM('  ' + '-'.repeat(62)));
console.log(bad === 0
  ? `  ${GREEN(`${files.length} files parsed`)}`
  : `  ${RED(`${bad} of ${files.length} failed to parse`)}`);
console.log('');

process.exit(bad === 0 ? 0 : 1);