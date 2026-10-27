/**
 * Distribution packer.
 *
 *   node tools/pack.mjs
 *
 * Produces release/PMS-<version>.zip containing everything a recipient needs:
 * the standalone application, the full static site, the report, and the
 * demonstration notes. The intent is that the archive can be attached to an
 * email, copied to a USB stick, or unpacked onto a machine with no toolchain,
 * and the application works immediately.
 *
 * The ZIP writer is implemented here rather than pulled in as a dependency.
 * The project otherwise has no npm dependencies at all, and adding one to
 * produce an archive would be a poor trade: it would make `npm run package`
 * require a network install on a machine that may not have one. Store and
 * deflate are the only two methods required, and both are in node:zlib.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'release');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const GREEN = s => `\x1b[32m${s}\x1b[0m`;
const RED = s => `\x1b[31m${s}\x1b[0m`;
const DIM = s => `\x1b[90m${s}\x1b[0m`;
const BOLD = s => `\x1b[1m${s}\x1b[0m`;

/* ------------------------------------------------------------ crc32 ---- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ------------------------------------------------------------- zip ------ */

/* ZIP stores dates in MS-DOS format: 2 bits of second precision, so the year
 * is limited to 1980-2107 and the clock is coarse. Not a problem, but the
 * encoding has to be exact or the archive is rejected by strict readers. */
function dosTime(d) {
  const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
  const date = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
  return { time, date };
}

/**
 * Build a ZIP from [{ name, data }]. Fixed modification time so the archive is
 * byte-identical for identical input, which makes it possible to checksum a
 * release meaningfully.
 */
function zip(entries, stamp) {
  const { time, date } = dosTime(stamp);
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const raw = e.data;
    const crc = crc32(raw);

    // Store when compression does not help; the standalone HTML is already
    // highly repetitive so deflate still wins there, but small files often grow.
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);          // extra length
    locals.push(local, nameBuf, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031E, 4);    // made by: UNIX, version 3.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);        // extra
    central.writeUInt16LE(0, 32);        // comment
    central.writeUInt16LE(0, 34);        // disk
    central.writeUInt16LE(0, 36);        // internal attrs
    central.writeUInt32LE(0o644 << 16, 38); // external attrs: unix perms
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, end]);
}

/* ------------------------------------------------------------ assemble -- */

const stamp = new Date(Date.UTC(2026, 0, 1)); // fixed, for reproducibility

const SOURCES = [
  { from: 'dist-web/pms-standalone.html', to: 'PMS-standalone.html', required: true,
    note: 'the application — open this directly, no server needed' },
  { from: 'README.md',                  to: 'README.md', required: false },
  { from: 'DEPLOYMENT.md',              to: 'DEPLOYMENT.md', required: true },
  { from: 'demo/DEMO_PLAN.md',          to: 'DEMO_PLAN.md', required: false },
  { from: 'dist/PMS_Report.md',         to: 'PMS_Report.md', required: true },
  { from: 'package.json',               to: 'package.json', required: false },
];

/* The whole static site, for anyone who wants to serve it properly. */
function collectSite(acc = [], dir = path.join(ROOT, 'dist-web')) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) collectSite(acc, abs);
    else acc.push({
      name: 'site/' + path.relative(path.join(ROOT, 'dist-web'), abs).replace(/\\/g, '/'),
      data: fs.readFileSync(abs),
    });
  }
  return acc;
}

/* Deployment descriptors, carried alongside the site they apply to so the
 * archive is self-sufficient: a recipient who wants to host it has the
 * Dockerfile, the unit file and the server config without needing this repo. */
function collectDeploy(acc = []) {
  const dir = path.join(ROOT, 'deploy');
  if (!fs.existsSync(dir)) return acc;
  for (const name of ['Dockerfile', 'pms.service', 'nginx.conf']) {
    const abs = path.join(dir, name);
    if (fs.existsSync(abs)) acc.push({ name: 'site/' + name, data: fs.readFileSync(abs) });
  }
  const server = path.join(ROOT, 'tools/serve.mjs');
  if (fs.existsSync(server)) acc.push({ name: 'site/serve.mjs', data: fs.readFileSync(server) });
  return acc;
}

console.log('');
console.log(BOLD('  Distribution pack'));
console.log(DIM('  ' + '-'.repeat(64)));

const entries = [];
const missing = [];

for (const s of SOURCES) {
  const abs = path.join(ROOT, s.from);
  if (!fs.existsSync(abs)) {
    if (s.required) missing.push(s.from);
    else console.log(DIM(`  skip     ${s.from} (not built yet)`));
    continue;
  }
  entries.push({ name: s.to, data: fs.readFileSync(abs) });
  console.log(`  ${GREEN('include')}  ${s.from}`);
  if (s.note) console.log(DIM(`           ${s.note}`));
}

if (missing.length) {
  console.log('');
  console.log(RED(`  missing required inputs: ${missing.join(', ')}`));
  console.log(DIM('  run "npm run ci" first'));
  console.log('');
  process.exit(1);
}

const site = collectSite();
const deploy = collectDeploy();

if (site.length) {
  entries.push(...site);
  const bytes = site.reduce((a, s) => a + s.data.length, 0);
  console.log(`  ${GREEN('include')}  dist-web/  ${site.length} files, ${(bytes / 1024).toFixed(1)} kB`);
  console.log(DIM('           servable site — unzip and point any web server at site/'));
}

if (deploy.length) {
  entries.push(...deploy);
  console.log(`  ${GREEN('include')}  deploy/   ${deploy.length} files (Dockerfile, systemd unit, nginx config, server)`);
}

/* A short note inside the archive, so its contents are self-explanatory. */
entries.push({
  name: 'START-HERE.txt',
  data: Buffer.from(`PMS — Patient Monitoring System
Biomedical engineering assignment, version ${pkg.version}

WHAT TO OPEN FIRST
  PMS-standalone.html   the complete application in one file. Double-click it.
                        It opens in any modern browser with no server, no
                        install and no network. This is the demo.

  PMS_Report.md         the written submission — eight sections, two
                        appendices, six figures. Reads as markdown; any
                        editor or GitHub will render it.

  DEMO_PLAN.md          a twelve-minute scripted walkthrough, with the
                        requirement each step demonstrates and answers to
                        questions the panel is likely to ask.

IF YOU WANT TO SERVE IT INSTEAD
  site/                 the same application as separate files, plus a service
                        worker for offline use. Point any static web server at
                        that folder, for example:

                          npx serve site
                          python -m http.server -d site 8080

  Requires Node 22.5 or newer only if you want the build tools; the
  application itself has no dependencies and no build step.

AUDIO
  The alarm sounds are synthesised in the browser from the parameters given in
  IEC 60601-1-8 rather than sampled from a manufacturer's system, because those
  tones are proprietary. Sound needs a click first: browsers block audio until
  the user interacts with the page. Use the audio bar or press the button.
`, 'utf8'),
});

const buf = zip(entries, stamp);
fs.mkdirSync(OUT, { recursive: true });
const name = `PMS-${pkg.version}.zip`;
const outFile = path.join(OUT, name);
fs.writeFileSync(outFile, buf);

console.log(DIM('  ' + '-'.repeat(64)));
console.log(`  ${entries.length} entries`);
console.log(`  ${BOLD(name)}  ${buf.length} B  (${(buf.length / 1024).toFixed(1)} kB)`);
console.log('');

/* ---------------------------------------------------------------------------
   Read the archive back with an independent implementation.

   Self-testing a ZIP writer by feeding it to itself proves nothing: the writer
   and the reader would agree on a shared mistake. The platform unzipper is a
   genuinely separate implementation, so if it accepts the archive then the
   format is right. Skipped with a visible note if no such tool is available,
   rather than silently passing.
   --------------------------------------------------------------------------- */

const probe = path.join(ROOT, 'release', '.probe');
fs.rmSync(probe, { recursive: true, force: true });
fs.mkdirSync(probe, { recursive: true });

let verified = false;
try {
  if (process.platform === 'win32') {
    const r = spawnSync('powershell', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -LiteralPath '${outFile.replace(/'/g, "''")}' -DestinationPath '${probe.replace(/'/g, "''")}' -Force`,
    ], { encoding: 'utf8', timeout: 60000 });
    verified = r.status === 0;
    if (!verified) {
      console.log(RED('  archive rejected by Expand-Archive'));
      console.log(DIM('  ' + (r.stderr || '').trim().split('\n').slice(0, 4).join('\n  ')));
      process.exit(1);
    }
  } else {
    const r = spawnSync('unzip', ['-tqq', outFile], { encoding: 'utf8', timeout: 60000 });
    if (r.error?.code === 'ENOENT') throw new Error('no unzip');
    verified = r.status === 0;
    if (!verified) {
      console.log(RED('  archive rejected by unzip'));
      process.exit(1);
    }
    spawnSync('unzip', ['-q', outFile, '-d', probe], { timeout: 60000 });
  }

  // The one file that must work is the standalone application.
  const unpacked = path.join(probe, 'PMS-standalone.html');
  if (!fs.existsSync(unpacked) || fs.statSync(unpacked).size === 0) {
    console.log(RED('  standalone application missing from the archive'));
    process.exit(1);
  }
  const roundTrip = fs.statSync(unpacked).size;
  if (roundTrip !== fs.statSync(path.join(ROOT, 'dist-web/pms-standalone.html')).size) {
    console.log(RED('  standalone did not survive the round trip intact'));
    process.exit(1);
  }
  verified = true;
} catch (e) {
  console.log(DIM(`  no independent unzipper available (${e.message}) — archive not round-tripped`));
}

fs.rmSync(probe, { recursive: true, force: true });

console.log(DIM(`  ${path.relative(ROOT, outFile).replace(/\\/g, '/')}`));
console.log(verified
  ? GREEN('  packaged and verified against an independent unzipper')
  : DIM('  packaged'));
console.log('');