# Deployment

How to run, host and hand over this project.

---

## The short version

```bash
npm run ci          # lint, scope, report, tests, build, smoke  — must be green
npm run package     # release/PMS-1.1.0.zip
```

To look at it:

```bash
npm start           # build the site, then serve it on http://127.0.0.1:8420
```

Or, with nothing to build and nothing to serve — open
`dist-web/pms-standalone.html` by double-clicking it.

**There are no npm dependencies.** `npm install` is a no-op and is never
required. The only requirement is Node 22.5 or newer, and only for the build
tools; the application itself runs in any browser from 2021 onward.

---

## Three ways to run it

### 1. Standalone file — for a demo or an examiner

`dist-web/pms-standalone.html` is the entire application in one file: markup,
stylesheet, all modules, and the scope-coverage data. It has no external
references of any kind, so it works from a USB stick, an email attachment, or
a machine with no network.

Double-click it. Nothing else is required.

This is the right form for the demonstration. It cannot be broken by a missing
asset, a failed download, or a moved file.

### 2. Static site — for hosting

`dist-web/` is the same application as separate files, with correct MIME types,
a service worker for offline use, and a web app manifest so it can be installed
to a home screen.

Serve the folder with any static web server:

```bash
npx serve dist-web
python -m http.server -d dist-web 8080
```

There is nothing dynamic: no backend, no database, no API to configure.

**Do not open the files over `file://` for the served form.** Browsers apply
CORS to module scripts loaded from the filesystem, so `js/app.js` will be
blocked. The standalone build has no such problem because it is a single file;
that difference is exactly why both forms exist.

### 3. Development server — for changing the code

```bash
npm run serve:dev      # serves frontend/ directly, no build, no caching
```

Edit a file, refresh. Caching is disabled, so a stale asset cannot be mistaken
for a change that did not work.

---

## Deployment checklist

Run this before handing anything over.

| Check | Command | Expected |
|---|---|---|
| Every file parses | `npm run lint` | `19 files parsed` |
| Report assembles and verifies | `npm run loop` | `PASS`, 0 errors, 0 warnings |
| Fault injection still caught | `npm test` | `12/12 caught, 0 missed` |
| Scope fully satisfied | `npm run scope` | `ALL SCOPE SATISFIED` |
| Site builds | `npm run web` | `built dist-web/` |
| Standalone is self-contained | `npm run smoke` | `27 passed` |

`npm run ci` runs all six in order and stops at the first failure.

The smoke test is the one that matters most for deployment specifically: it
asserts that the standalone file references nothing external. Serving over HTTP
hides that class of bug, because HTTP will happily supply a missing dependency,
so a build can look fine when tested and break on the examiner's machine.

---

## Hosting it somewhere real

The build output is a plain static folder, so any of these work unchanged.

| Target | How |
|---|---|
| GitHub Pages | push `dist-web/` to a branch, enable Pages |
| Netlify / Vercel | drag the folder in, or connect the repo and set publish directory to `dist-web` |
| Nginx | `root /var/www/pms; index index.html;` |
| Apache | copy `dist-web/` into the document root |
| S3 / CloudFront | upload the folder, enable static website hosting |

If the host is already HTTPS, nothing else changes — the application makes no
network requests at all once loaded, so there is no mixed-content risk and no
backend to provision.

### Cache invalidation — read this before deploying

Every asset in this build keeps a **stable filename** across releases. `app.js`
is `app.js` in every version, because there is no bundler emitting content
hashes and none is needed at this size.

That single fact rules out the directive most static sites use:

```
Cache-Control: public, max-age=31536000, immutable
```

`immutable` is a promise to the browser that the bytes behind a URL will never
change. Combined with a stable URL that promise is false, and the browser is
entitled to believe it for a year. The consequence is silent and total: a
browser that has seen one build will never fetch another, and **no subsequent
deployment can ever reach it**. During development this looked like "my CSS
change did nothing" — the new file was on disk, the server was serving it, and
the browser refused to ask.

So both `tools/serve.mjs` and `deploy/nginx.conf` set:

```
Cache-Control: public, max-age=300, must-revalidate   # assets
Cache-Control: no-cache                                # index.html, sw.js
```

A conditional request on a later visit costs a few hundred bytes and buys a
deployment that is guaranteed to arrive. At 230 kB total that is not a
trade-off worth optimising.

The service worker uses the same reasoning: **network-first with a cache
fallback**, not cache-first, and its cache name is derived from the build so a
new build drops the previous entries. Offline capability is preserved — the
cache is the fallback when the network is gone, which is the case that
actually matters on a ward — but a connected station always runs current code.

If you later add content-hashed filenames, `immutable` becomes correct and both
settings can be tightened.

---

## The production server

`tools/serve.mjs` is a real server, not a convenience wrapper. It exists so that
what gets demonstrated locally matches what a deployment behaves like.

```bash
node tools/serve.mjs --port 8420 --root dist-web
node tools/serve.mjs --dev --port 8420        # serve sources, no caching
```

What it does that `python -m http.server` does not:

- **ETag and 304 revalidation** — a reload transfers nothing
- **Brotli and gzip** — `app.js` compresses from 42 kB to 12 kB
- **Cache-Control** — assets held briefly then revalidated, so a deployment
  actually arrives. `immutable` is deliberately *not* used; see the section above
- **Content-Security-Policy** — the app is fully self-contained, so the policy
  can be strict: no external origins are reachable at all
- **`/healthz`** — for a load balancer or container probe
- **Range requests** — large assets are resumable
- **Path-traversal containment** — requests resolving outside the root are
  refused
- **Correct MIME types**, including `application/manifest+json`, without which
  the installable manifest is rejected

Verified behaviour:

```
GET /healthz                    200  {"status":"ok","root":"dist-web","dev":false}
GET /js/app.js   Accept-Encoding: br
                                200  br, 12238 B  (from 42020 B)
GET /js/app.js   If-None-Match   304  no body
GET /js/app.js   Range: 0-99     206  bytes 0-99/42020
GET /../package.json             404  refused
DELETE /                         405
```

### As a service

`tools/` contains a systemd unit and a Dockerfile; both are copied into
`release/site/` by the packer.

```bash
# systemd
sudo cp release/site/pms.service /etc/systemd/system/
sudo systemctl enable --now pms

# container
docker build -t pms dist-web
docker run -p 8420:8420 pms
```

---

## What "ready for deployment" does and does not mean here

It is worth being precise, because the difference matters.

**This is deployable:** a static artefact with no runtime dependencies, a
production server with correct headers, an offline-capable service worker, a
single-file build that cannot be broken by deployment, and a build that fails
loudly rather than shipping something broken.

**This is not deployable to a hospital, and could not be.** The application is a
demonstration nurse station: physiological signals are synthesised in
`frontend/js/sim.js`, not acquired from a patient. There is no device
interface, no data store, no authentication, and no audit trail that survives a
restart. Those are the subject of the report rather than the deliverable, and
the report says so in the safety case.

Deployment readiness here means the artefact is well-formed and honestly
bounded. It does not mean clinical readiness, and the project should not claim
it.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Blank page, console shows a CORS error | `index.html` opened over `file://` | Use `pms-standalone.html`, or serve the folder |
| No alarm sound | The browser has not been interacted with | Click anywhere, then use the audio bar |
| Audio too quiet | OS output level, or the station's master trim | Check the OS first; the app's control is a trim, not the only gain stage |
| Changes do not appear | A stale cached copy of the asset | See "Cache invalidation" above. In a browser, hard-reload; in `tools/serve.mjs`, `--dev` disables caching entirely |
| `PMS-Report.md` unchanged after an edit | `dist/` is generated | Run `npm run loop`; edit `report/*.md`, never `dist/` |
| Port already in use | Another server on 8420 | `--port 8421` |
| `node:sqlite` error | Node older than 22.5 | The SQL tests need `node:sqlite`; upgrade, or skip `npm run selftest` |