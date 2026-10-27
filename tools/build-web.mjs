/**
 * Web build.
 *
 *   node tools/build-web.mjs
 *
 * Produces two deployment artefacts from frontend/:
 *
 *   dist-web/                  a static site, ready for any web server
 *   dist-web/pms-standalone.html   ONE file with everything inlined, which
 *                                 opens directly from the filesystem with no
 *                                 server and no network
 *
 * The standalone build matters for an assignment: it can be attached to an
 * email, copied onto a USB stick, or opened on a machine with no network and
 * no toolchain, and it behaves identically.
 *
 * Module bundling is deliberately minimal. The frontend is four plain ES
 * modules with no circular imports, so concatenating them in dependency order
 * and stripping the import/export keywords is sufficient and auditable. A real
 * bundler would be more machinery than this project needs.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'frontend');
const OUT = path.join(ROOT, 'dist-web');

const DIM = s => `\x1b[90m${s}\x1b[0m`;
const BOLD = s => `\x1b[1m${s}\x1b[0m`;
const GREEN = s => `\x1b[32m${s}\x1b[0m`;
const RED = s => `\x1b[31m${s}\x1b[0m`;

/* Dependency order. sim has no imports; audio imports sim; store imports sim;
 * app imports all three. */
const MODULES = ['js/sim.js', 'js/audio.js', 'js/store.js', 'js/scope-data.js', 'js/app.js'];

/** Strip ES module syntax so the files can share one script scope. */
function flatten(code, file) {
  const out = code
    // Remove import statements, including multi-line ones.
    .replace(/^import\s+[^;]*?;\s*$/gms, '')
    // Remove the export keyword from declarations.
    .replace(/^export\s+(?=(const|let|var|function|class|async))/gm, '');

  if (/^\s*(import|export)\s/m.test(out)) {
    console.error(RED(`  ${file}: module syntax survived flattening`));
    process.exit(1);
  }
  return out;
}

/** Reject duplicate top-level bindings, which would break a shared scope. */
function assertNoCollisions(parts) {
  const seen = new Map();
  for (const { file, code } of parts) {
    const names = [...code.matchAll(/^(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    for (const n of names) {
      if (seen.has(n)) {
        console.error(RED(`  duplicate top-level binding "${n}" in ${file} and ${seen.get(n)}`));
        process.exit(1);
      }
      seen.set(n, file);
    }
  }
  return seen.size;
}

function build() {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(SRC, 'app.css'), 'utf8');

  let scopeJson = '{}';
  const scopePath = path.join(SRC, 'js', 'scope.json');
  if (fs.existsSync(scopePath)) scopeJson = fs.readFileSync(scopePath, 'utf8');
  else console.log(DIM('  note: scope.json absent — run "npm run scope:write" first'));

  const parts = MODULES.map(file => ({
    file,
    code: flatten(fs.readFileSync(path.join(SRC, file), 'utf8'), file),
  }));
  const bindingCount = assertNoCollisions(parts);

  // Scope coverage is embedded rather than fetched: a fetch of a sibling file
  // is blocked under the file:// origin, and the standalone build must work
  // from a bare filesystem with no server.
  // scope-data.js is already one of the modules, so its data is bundled
  // with everything else and needs no separate preamble.
  const preamble = '';

  const bundle = preamble + parts.map(p => `\n/* ==== ${p.file} ==== */\n${p.code}`).join('\n');

  // --- standalone: everything in one file -----------------------------------
  let standalone = html
    .replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`)
    .replace(/<link rel="manifest"[^>]*>/, '')
    .replace(/<script type="module" src="\.\/js\/app\.js"><\/script>/,
      `<script type="module">\n${bundle}\n</script>`);

  // A service worker cannot be registered from file:// and would throw.
  standalone = standalone.replace(
    /<\/body>/,
    `  <script>\n    // Offline registration is only meaningful over http(s).\n    if (location.protocol.startsWith('http')) {\n      navigator.serviceWorker && navigator.serviceWorker.register('./sw.js').catch(() => {});\n    }\n  </script>\n</body>`);

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'pms-standalone.html'), standalone, 'utf8');

  // --- static site ---------------------------------------------------------
  const copy = (from, to) => {
    const dst = path.join(OUT, to);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(from, dst);
  };
  copy(path.join(SRC, 'index.html'), 'index.html');
  copy(path.join(SRC, 'app.css'), 'app.css');
  for (const m of MODULES) copy(path.join(SRC, m), m);
  for (const extra of ['js/scope.json', 'js/scope-data.js']) {
    const src = path.join(SRC, extra);
    if (fs.existsSync(src)) copy(src, extra);
  }

  /* Service worker.
   *
   * Strategy is network-first with a cache fallback, NOT the cache-first that
   * a static site normally wants. Cache-first is wrong here for two reasons:
   *
   *   1. The bundle is served at a stable URL. app.js is app.js across every
   *      release, so a cache-first worker would serve the first version it
   *      ever cached, permanently, and no update could ever reach the
   *      browser. Silent, total staleness.
   *   2. A clinical display running superseded code is worse than one that
   *      takes an extra moment to refresh.
   *
   * Network-first keeps the offline capability that a dropped network link
   * requires — the cache is the fallback, not the primary — and the cache name
   * is derived from the build, so activating a new build drops the old
   * entries rather than accumulating them. The cache is also populated
   * opportunistically on every successful fetch, so a device that is online
   * once after installation stays offline-capable.
   */
  const sw = `/* Generated by tools/build-web.mjs */
const CACHE = 'pms-${Date.now().toString(36)}';
const SHELL = [
  './', './index.html', './app.css', './manifest.webmanifest', './icon.svg',
  './js/sim.js', './js/audio.js', './js/store.js', './js/scope-data.js',
  './js/app.js', './js/scope.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      // A missing optional entry must not abort the install.
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // Every cache but this build's is stale by definition.
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // never proxy cross-origin

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
`;
  fs.writeFileSync(path.join(OUT, 'sw.js'), sw, 'utf8');

  /* Web app manifest, so the station can be installed to a home screen. */
  const manifest = {
    name: 'PMS Nurse Station — ICU-A',
    short_name: 'PMS',
    description: 'Five-bed centralised patient monitoring system',
    start_url: './index.html',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#070b10',
    theme_color: '#070b10',
    icons: [{
      src: './icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    }],
  };
  fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="36" fill="#070b10"/>
  <path d="M24 96h34l17-46 24 96 17-46h44" fill="none" stroke="#35e07a"
        stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
  fs.writeFileSync(path.join(OUT, 'icon.svg'), icon, 'utf8');

  // Report sizes.
  const sizes = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else sizes.push({ rel: path.relative(OUT, p).replace(/\\/g, '/'), bytes: fs.statSync(p).size });
    }
  };
  walk(OUT);
  const total = sizes.reduce((a, s) => a + s.bytes, 0);

  console.log('');
  console.log(BOLD('  Web build'));
  console.log(DIM('  ' + '-'.repeat(62)));
  console.log(`  ${DIM('modules ')}  ${MODULES.length} flattened, ${bindingCount} top-level bindings, no collisions`);
  for (const s of sizes.sort((a, b) => b.bytes - a.bytes)) {
    console.log(`  ${DIM(s.rel.padEnd(28))} ${String(s.bytes).padStart(8)} B`);
  }
  console.log(DIM('  ' + '-'.repeat(62)));
  console.log(`  ${DIM('total')}     ${String(total).padStart(8)} B  (${(total / 1024).toFixed(1)} kB)`);
  const gz = zlib.gzipSync(fs.readFileSync(path.join(OUT, 'pms-standalone.html'))).length;
  console.log(`  ${DIM('standalone gzip')} ${String(gz).padStart(5)} B  (${(gz / 1024).toFixed(1)} kB)`);
  console.log('');
  console.log(GREEN('  built dist-web/'));
  console.log(DIM('  open dist-web/pms-standalone.html directly, no server needed'));
  console.log('');
}

build();
