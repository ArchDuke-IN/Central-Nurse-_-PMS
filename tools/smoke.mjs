/**
 * Build smoke test.
 *
 *   node tools/smoke.mjs
 *
 * Verifies the deployment artefacts rather than the sources. The critical
 * property is that pms-standalone.html opens from a bare filesystem with no
 * server and no network, which means it must reference nothing external.
 * That is easy to break accidentally - one stray CDN link or fetch() call
 * and the file silently stops working offline while still looking fine when
 * served over http, because http hides the problem.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'dist-web');

const GREEN = s => `\x1b[32m${s}\x1b[0m`;
const RED = s => `\x1b[31m${s}\x1b[0m`;
const DIM = s => `\x1b[90m${s}\x1b[0m`;

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ${GREEN('ok  ')} ${name}`); }
  else { fail++; console.log(`  ${RED('FAIL')} ${name}${detail ? '  — ' + detail : ''}`); }
};

console.log('');
console.log(DIM('  Build smoke test'));
console.log(DIM('  ' + '-'.repeat(62)));

if (!fs.existsSync(WEB)) {
  console.log(RED('  dist-web/ not found. Run: npm run build:web'));
  process.exit(1);
}

/* --- required artefacts --------------------------------------------------- */
const REQUIRED = [
  'index.html', 'app.css', 'sw.js', 'manifest.webmanifest', 'icon.svg',
  'js/sim.js', 'js/audio.js', 'js/store.js', 'js/scope-data.js', 'js/app.js',
  'js/scope.json', 'pms-standalone.html',
];
for (const r of REQUIRED) {
  const p = path.join(WEB, r);
  const ok = fs.existsSync(p) && fs.statSync(p).size > 0;
  check(`artefact ${r}`, ok, ok ? '' : 'missing or empty');
}

/* --- standalone must be self-contained ----------------------------------- */
const standalonePath = path.join(WEB, 'pms-standalone.html');
if (fs.existsSync(standalonePath)) {
  const html = fs.readFileSync(standalonePath, 'utf8');

  const externalLinks = [...html.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)].map(m => m[1]);
  check('standalone has no external src/href', externalLinks.length === 0, externalLinks.join(', '));

  const externalImports = [...html.matchAll(/import\s+[^;]*?from\s*["'](https?:\/\/[^"']+)["']/g)];
  check('standalone imports nothing over the network', externalImports.length === 0);

  // fetch() of a sibling file is blocked under file://, so scope data must be
  // embedded. Any fetch of a relative path is therefore a latent breakage.
  const relativeFetches = [...html.matchAll(/fetch\(\s*["'`](\.[^"'`]+)["'`]/g)].map(m => m[1]);
  check('standalone never fetches a relative path', relativeFetches.length === 0, relativeFetches.join(', '));

  check('standalone embeds its stylesheet', /<style>[\s\S]{2000,}<\/style>/.test(html));
  check('standalone embeds its script', /<script type="module">[\s\S]{20000,}<\/script>/.test(html));
  check('standalone embeds scope coverage', /export const SCOPE_DATA|const SCOPE_DATA/.test(html));
  check('standalone guards service worker for file://', html.includes("location.protocol.startsWith('http')"));

  // A stray external reference in a font import or url() would also break offline.
  const cssUrls = [...html.matchAll(/url\(\s*["']?(https?:\/\/[^)"']+)/g)].map(m => m[1]);
  check('no remote url() in styles', cssUrls.length === 0, cssUrls.join(', '));

  /* --- the flattened bundle must be self-contained ----------------------- */
  const bundleMatch = /<script type="module">([\s\S]*?)<\/script>/.exec(html);
  if (bundleMatch) {
    const bundle = bundleMatch[1];
    check('bundle has no unresolved import statements', !/^\s*import\s/m.test(bundle));
    check('bundle has no unresolved export keywords', !/^\s*export\s+(?=(const|let|function|class|async))/m.test(bundle));
  } else {
    check('bundle script block found', false);
  }
}

/* --- bundle integrity ----------------------------------------------------
 * dist-web/js/*.js are ES modules served natively, so their imports are
 * correct there. The self-containment check belongs on the flattened bundle
 * inside the standalone file, which has no module loader at all.
 */
const standalonePath2 = path.join(WEB, 'pms-standalone.html');

/* --- scope data is current ----------------------------------------------- */
const scopePath = path.join(WEB, 'js/scope.json');
if (fs.existsSync(scopePath)) {
  try {
    const d = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
    const complete = d.goalSummary && d.milestoneSummary &&
      d.goalSummary.missing === 0 && d.milestoneSummary.missing === 0;
    check('scope coverage reports no gaps', !!complete,
      complete ? '' : `${d.goalSummary.missing} goals, ${d.milestoneSummary.missing} milestones outstanding`);
    check('scope data names every goal', (d.goals || []).length === 5);
    check('scope data names every milestone', (d.milestones || []).length === 9);
  } catch (e) {
    check('scope.json parses', false, e.message);
  }
}

/* --- server manifest advertises what exists ------------------------------- */
const mfPath = path.join(WEB, 'manifest.webmanifest');
if (fs.existsSync(mfPath)) {
  try {
    const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
    // Relative URLs need a base to resolve against.
    const startUrl = new URL(mf.start_url, 'http://placeholder/');
    check('manifest start_url exists on disk',
      fs.existsSync(path.join(WEB, startUrl.pathname)));
    const iconOk = (mf.icons || []).every(i => {
      const u = new URL(i.src, 'http://placeholder/');
      return fs.existsSync(path.join(WEB, u.pathname));
    });
    check('manifest icons exist on disk', iconOk);
  } catch (e) {
    check('manifest parses', false, e.message);
  }
}

/* --- report --------------------------------------------------------------- */
console.log(DIM('  ' + '-'.repeat(62)));
console.log(`  ${fail === 0 ? GREEN(`${pass} passed`) : RED(`${pass} passed, ${fail} failed`)}`);
console.log('');

process.exit(fail === 0 ? 0 : 1);
