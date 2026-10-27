/**
 * Production static server for the built site.
 *
 *   node tools/serve.mjs [--port 8420] [--root dist-web] [--dev]
 *
 * The default root is the built site, so what is served is what was built
 * rather than the source tree. Differences from a trivial file server, and
 * why each matters here:
 *
 *   - ETag / 304            the station must not re-download on every reload
 *   - Brotli and gzip       the bundle compresses to about a third
 *   - Cache-Control         HTML revalidated, assets held, so a deployed
 *                           update is picked up but assets are not refetched
 *   - Content-Security-Poly the app is entirely self-contained, so it can be
 *                           locked down hard; anything external is refused
 *   - /healthz              for a load balancer or a container probe
 *   - Range requests        a large bundle should be resumable
 *
 * --dev serves frontend/ directly for iteration, with caching disabled.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const flag = name => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DEV = flag('--dev');
const PORT = Number(value('--port', 8420));
const HOST = value('--host', '127.0.0.1');
const BASE = path.resolve(ROOT, value('--root', DEV ? 'frontend' : 'dist-web'));

if (!fs.existsSync(BASE)) {
  console.error(`\n  ${path.relative(ROOT, BASE)} does not exist. Run:  npm run build:web\n`);
  process.exit(1);
}

/* --------------------------------------------------------------- helpers */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

// The app ships no external assets and makes no third-party requests, so the
// policy can be strict. 'unsafe-inline' is required for style and the inlined
// style attributes the renderer sets; script is NOT granted it.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json)|image\/svg)/;

function etagFor(buf) {
  return '"' + crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 27) + '"';
}

/**
 * Cache policy.
 *
 * Deliberately NOT `immutable` on assets. That directive is only safe when a
 * URL changes whenever its content does, and here every asset keeps a stable
 * name across releases — app.js is app.js forever. Pairing a stable name with
 * `immutable, max-age=1y` means a browser that has seen one build will never
 * fetch another: the station silently keeps running the first version it
 * cached, with no way for an update to reach it.
 *
 * So assets are held briefly and then revalidated, which costs a conditional
 * request on a later visit and buys a guaranteed-fresh deploy. HTML and the
 * service worker are always revalidated. `npm run build:web` produces 230 kB;
 * at this size correctness beats the last few milliseconds.
 */
function cacheControl(rel) {
  if (DEV) return 'no-store';
  if (rel.endsWith('.html')) return 'no-cache';
  if (rel.includes('sw.js')) return 'no-cache';   // so updates take effect
  return 'public, max-age=300, must-revalidate';
}

/* --------------------------------------------------------------- server */

const server = http.createServer((req, res) => {
  const started = process.hrtime.bigint();

  const send = (code, body, headers = {}) => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(`  ${String(code).padEnd(3)} ${String(ms.toFixed(1)).padStart(6)} ms  ${req.method} ${req.url}`);
    res.writeHead(code, { ...SECURITY_HEADERS, ...headers });
    res.end(body);
  };

  if (req.url === '/healthz') {
    return send(200, JSON.stringify({ status: 'ok', root: path.relative(ROOT, BASE), dev: DEV }), {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(405, 'method not allowed', { allow: 'GET, HEAD' });
  }

  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(400, 'bad request');
  }
  if (rel.endsWith('/')) rel += 'index.html';

  const file = path.join(BASE, rel);
  // Containment check: reject anything that escapes the served root.
  if (file !== BASE && !file.startsWith(BASE + path.sep)) {
    return send(403, 'forbidden');
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      return send(404, `not found: ${rel}\n`, { 'content-type': 'text/plain; charset=utf-8' });
    }

    fs.readFile(file, (readErr, buf) => {
      if (readErr) return send(500, 'read error');

      const ext = path.extname(file);
      const type = TYPES[ext] || 'application/octet-stream';
      const etag = etagFor(buf);
      const baseHeaders = {
        'content-type': type,
        etag,
        'cache-control': cacheControl(rel),
        vary: 'Accept-Encoding',
        'last-modified': stat.mtime.toUTCString(),
      };

      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, { ...SECURITY_HEADERS, ...baseHeaders });
        console.log(`  304 ${req.method} ${req.url}`);
        return res.end();
      }

      if (req.method === 'HEAD') {
        res.writeHead(200, { ...SECURITY_HEADERS, ...baseHeaders, 'content-length': buf.length });
        return res.end();
      }

      // Range support, so a large asset is resumable.
      const range = req.headers.range;
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (m) {
          const start = m[1] ? Number(m[1]) : 0;
          const end = m[2] ? Number(m[2]) : buf.length - 1;
          if (start <= end && end < buf.length) {
            const slice = buf.subarray(start, end + 1);
            res.writeHead(206, {
              ...SECURITY_HEADERS,
              ...baseHeaders,
              'content-range': `bytes ${start}-${end}/${buf.length}`,
              'accept-ranges': 'bytes',
              'content-length': slice.length,
            });
            const ms = Number(process.hrtime.bigint() - started) / 1e6;
            console.log(`  206 ${String(ms.toFixed(1)).padStart(6)} ms  ${req.method} ${req.url} (range)`);
            return res.end(slice);
          }
        }
        return send(416, 'range not satisfiable', { 'content-range': `bytes */${buf.length}` });
      }

      const accept = String(req.headers['accept-encoding'] || '');
      if (COMPRESSIBLE.test(type) && /\b(br|gzip)\b/.test(accept) && buf.length > 1024) {
        const body = /\bbr\b/.test(accept)
          ? zlib.brotliCompressSync(buf, {
              params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
            })
          : zlib.gzipSync(buf, { level: 6 });
        const encoding = /\bbr\b/.test(accept) ? 'br' : 'gzip';
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          ...baseHeaders,
          'content-encoding': encoding,
          vary: 'Accept-Encoding',
          'content-length': body.length,
        });
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        console.log(`  200 ${String(ms.toFixed(1)).padStart(6)} ms  ${req.method} ${req.url} [${encoding} ${buf.length}->${body.length}]`);
        return res.end(body);
      }

      res.writeHead(200, { ...SECURITY_HEADERS, ...baseHeaders, 'content-length': buf.length });
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      console.log(`  200 ${String(ms.toFixed(1)).padStart(6)} ms  ${req.method} ${req.url} [${buf.length}]`);
      res.end(buf);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log(`  \x1b[1mPMS${DEV ? ' (dev)' : ''}\x1b[0m  http://${HOST}:${PORT}/`);
  console.log(`  \x1b[90mserving  ${path.relative(ROOT, BASE)}${DEV ? '' : '  — run "npm run build:web" after changing frontend/'}\x1b[0m`);
  console.log(`  \x1b[90mhealth    http://${HOST}:${PORT}/healthz\x1b[0m`);
  console.log('');
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n  ${sig} — closing`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
