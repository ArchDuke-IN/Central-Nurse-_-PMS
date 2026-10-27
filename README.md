# Patient Monitoring System — Assignment Workspace

Five-bed centralised patient monitoring system for a biomedical engineering
assignment, built under an **executable build-and-verify loop**: the report,
the database schema and the figures are assembled and then checked by a gate
that must pass before anything is submitted.

## Quick start

```bash
npm run ci          # everything: lint, scope, report, tests, build, smoke
npm start           # build the site, then serve it at http://127.0.0.1:8420
```

Or open `dist-web/pms-standalone.html` directly — the whole application in one
file, no server and no network needed.

Individual stages:

```bash
npm run loop        # assemble the report, then verify
npm run verify      # verify only (no rebuild)
npm test            # prove the gate actually catches faults
npm run scope       # audit every goal and milestone against real files
npm run lint        # parse every JS file
npm run web         # build dist-web/
npm run smoke       # prove the built artefact is self-contained
npm run package     # release/PMS-<version>.zip
npm run serve:dev   # serve frontend/ directly while editing
```

Requires Node 22.5 or later (uses the built-in `node:sqlite`). No dependencies
at any stage — `npm install` is a no-op and never needed.

See **DEPLOYMENT.md** for hosting, headers, containers and troubleshooting.

## Project documentation

- [Setup guide](SETUP.md) — prerequisites, first run, development and release checks
- [Deployment guide](DEPLOYMENT.md) — static hosting, Docker, nginx and systemd
- [Contributing](CONTRIBUTING.md) — workflow, coding standards and pull requests
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [MIT License](LICENSE)

This repository is an educational prototype and is **not a certified medical
device**. It must not be used for diagnosis, treatment, monitoring of real
patients, or clinical decision-making.

## Layout

```
frontend/          Nurse-station application (plain HTML/CSS/ES modules)
  index.html         Shell and navigation
  app.css            Dark clinical theme, responsive, print, reduced motion
  js/sim.js          Physiological signal synthesis and limit grading
  js/store.js        Alarm engine: grading, hysteresis, escalation, acknowledgement
  js/audio.js        Pulse tone and IEC 60601-1-8 priority-differentiated alarm sounds
  js/app.js          Rendering, sweeping traces, views
  js/scope-data.js   Generated — scope coverage consumed by the UI
  js/scope.json      Generated — the same data for tooling

demo/DEMO_PLAN.md   Timed walkthrough, contingencies, anticipated questions

report/            eight sections + two appendices   (edit these)
  01_introduction.md        1  Introduction and scope
  02_ward_layout.md         2  Ward layout and physical design
  03_instrument_specs.md    3  Instrument specifications
  04_system_architecture.md 4  Architecture and alarm design
  05_data_model.md          5  Data model and RDBMS schema
  06_digital_health.md      6  Digital health integration
  07_hms_integration.md     7  HMS integration
  08_safety_standards.md    8  Safety, standards and risk
  appendices/A_...md        M1 requirements checklist
  appendices/B_...md        M3 electrode placement reference

db/01_schema.sql   PostgreSQL DDL, milestone M5
db/02_seed.sql     Seed data for verification
figures/*.svg      Six diagrams
research/          Research notes and source corrections
deploy/            Dockerfile, systemd unit, nginx configuration

build/manifest.json   Artifact registry, required citations, coverage rules
build/status.json     Written by the verifier; consumed by the loop
verify/               The gate
tools/loop.mjs        Assemble -> verify -> record
tools/lint-js.mjs     Parse every JS file (catches silent syntax corruption)
tools/selftest.mjs    Injects faults to prove the gate works
tools/scope-audit.mjs Checks every goal and milestone against real files
tools/build-web.mjs   Builds the static site and the standalone file
tools/smoke.mjs       Asserts the built artefact is self-contained
tools/serve.mjs       Production static server
tools/pack.mjs        Builds the release archive
dist/PMS_Report.md    Generated. Do not edit.
dist-web/             Generated. The deployable site.
release/              Generated. The distributable archive.
loop_log/build.log    Timestamped history of every run
```

## The nurse-station application

`npm start`, then open `http://127.0.0.1:8420`.

Six views: **Nurse Station** (live five-bed display), **Trends**, **Ward**,
**Audit** (event trail and the full alarm log), **Standards**, **Scope
Coverage**. Keys `1`–`6` switch views, `a` acknowledges everything, `Escape`
closes the alarm drawer.

Traces are swept at a fixed 62 px per second — the rate a 25 mm/s monitor sweep
produces — rather than once per frame, so the display means the same thing
whatever the refresh rate. Waveforms are synthesised from summed Gaussian
components, not noise, because a clinician recognises a malformed QRS instantly.

The scenario bar drives deterministic clinical events on BED-01 so a
demonstration replays identically: `SpO₂ → 82%`, `HR → 168`, `72/44`, `Lead off`,
`Info signal`. Operator settings persist across reloads.

### Accessibility and narrow screens

An alarm list that vanishes when the window is narrow is the worst possible
failure for this device, so below 1180 px the rail becomes a slide-over drawer
with a permanently visible toggle carrying the open alarm count — an alarm is
never silently off-screen. New alarms are announced through an `aria-live`
region, every trace canvas carries a spoken description, focus states are
visible throughout, the breach blink respects `prefers-reduced-motion`, and a
print stylesheet renders the current view in black on white.

This is not certification. IEC 60601-1-6 and IEC 62366-1 usability
engineering are named in the report as requirements the demonstration does not
yet meet, and saying so is more accurate than claiming conformance.

## Audio

**No downloaded sound pack.** IEC 60601-1-8 specifies alarm sounds
*parametrically* — fundamental ranges, pulse durations, the burst gap structure and
a tolerance on harmonic balance — rather than as waveform files, deliberately so a
cheap piezo sounder can reproduce them. Manufacturer alarm tones are proprietary
product IP and are not lawfully distributable. Driving synthesis from the
specification is therefore more accurate than shipping one vendor's file, which is
only one implementation of the same spec.

**The alarm signal.** Two independent encodings:

- **Pulse count carries priority** — 10 / 3 / 2 pulses for high / medium / low,
  with the specified gap structure (including `2×gap + duration` intervals and the
  0.35–1.30 s delay between the fifth and sixth pulse) and interburst intervals of
  5 / 9 / 18 s.
- **Melody carries category** — c–e–g for cardiovascular (the reserved figure),
  C–B–A for oxygenation, c–a–f for ventilation, c–d–e for temperature.

**The pulse tone** is a two-part *lub-dup* at 691 Hz then 469 Hz — a perfect fifth,
close enough to the real lub-dub of the heart that the ear reads it as a
heartbeat. Rate follows pulse rate, pitch follows SpO₂, with slight per-beat
variation. Selectable per bed, because five simultaneous tones are unintelligible.

**Timbre is what decides whether it sounds clinical.** Real conforming alarms use a
*flat harmonic stack*: harmonics 1 and 3–9 within about 5.5 dB, second partial
~26 dB down. A plain sine or an evenly-spaced stack sounds synthetic. The prototype
measures **11 harmonics in 300–4000 Hz against a requirement of 4**, and the **four
largest within 2.0 dB against a tolerance of 15 dB**.

**Level** uses a normative 3–6 dB per-priority ladder applied on separate gain
buses, so a lower priority cannot exceed a higher one. The pulse tone sits 18 dB
below, because it runs continuously. Absolute SPL is not a browser capability —
laptop speakers cannot reach the 70–80 dB(A) at 1 m that real monitors produce.

Category and priority are auditionable on demand. Table 3 pulse repetition rates
and minimum sound pressure level are **not** implemented or quoted, because they
could not be verified — see report §4.9.7.

The alarm engine implements the properties the design specifies: grading by
excursion magnitude, **re-grading on every tick so a deteriorating patient
escalates the alarm**, hysteresis so a value on a limit does not flap, escalation
when a high-priority alarm is unattended, acknowledgement attributed to an
identified operator, and the strict separation of INFORMATION signals from alarm
conditions.

Grading is **per parameter, in that parameter's own units**. A single shared
threshold is silently wrong across mixed quantities — it graded a saturation of
86% and a temperature of 38.5 °C as LOW because neither excursion reaches twelve
units, and made a pyrexia excursion of 12 °C (unreachable) the only route to
MEDIUM. Absolute rules also fire on critical values regardless of how wide a
limit has been set. The derivation is in report §7.4.2.1.

Two beds are seeded with clinical profiles — a `desat` patient at SpO₂ ~86% and a
`sepsis` patient — so a ward of five healthy patients does not look like a ward.
They alarm on load, correctly, because they *are* deteriorating. The scenario bar
still drives BED-01 only, so a demonstration replays identically regardless of
how long the page has been open.

## How the loop works

1. **Assemble** concatenates the eight sections, both appendices and a generated
   figure list into `dist/PMS_Report.md`.
2. **Verify** runs `verify/verify.mjs` as a child process. Exit 0 means the gate
   passed.
3. **Record** appends a timestamped result line to `loop_log/build.log`.

The loop is idempotent. Edit a section, re-run, and the gate tells you what broke.

## What the gate checks

| Check | What it proves |
|---|---|
| Artifact presence | Every declared section, appendix and figure exists and is non-trivial |
| Structure | SVG figures carry a `<title>` and a `viewBox`; markdown carries a top-level heading |
| **Standards linter** | No superseded standard number cited as current; ten deprecated-usage rules enforced, each with auditable inline suppression via `<!-- lint-allow rule-id -->` |
| Terminology | Every LOINC-shaped code cited in a code span is verified; unit-of-measure URI spelled correctly |
| Schema structure | Foreign keys resolve, indexes reference real columns, the tables and the composite index the brief mandates are present |
| **Schema execution** | The DDL parses under a PostgreSQL-to-SQLite translation and loads with its seed data |
| **Behavioural constraints** | Fourteen inserts attempted — thirteen invalid, each must be **rejected for the reason claimed**. A positive control on each table proves the negative tests are meaningful |
| Index usage | The nurse-station query actually selects the composite index |
| FHIR resources | Every embedded resource has required elements, valid status and class, and unit codes consistent with their display strings |
| Embedded SQL | Every SQL block in the report executes against the seeded schema |
| Cross-references | Every figure is referenced from the prose; no broken relative links |
| Goal coverage | Goals G1–G5 are each addressed in the report prose |
| Required content | Key concepts and citations are present document-wide |

Errors fail the build. Warnings do not. Info lines report what the gate confirmed.

## Scope coverage

`npm run scope` answers a different question from the gate: *is every goal and
milestone in the brief actually discharged?*

A goal counts as satisfied only when its evidence files exist **and** contain the
specific markers listed for it. Asserting coverage in prose is not evidence — the
audit points at files and content a reader can open.

`npm run scope:write` additionally emits `frontend/js/scope-data.js` and
`scope.json`, which the app's Scope Coverage view renders. The audit and the UI
therefore cannot disagree.

## Deployment artefacts

`npm run web` produces two forms of the same application:

| Artefact | What it is | When to use it |
|---|---|---|
| `dist-web/pms-standalone.html` | Everything inlined into one file | Demonstrations, email, USB, offline |
| `dist-web/` | Static site with service worker and manifest | Hosting on a real server |

The standalone form references nothing external — no CDN, no fonts, no
`fetch()` of a sibling file — so it cannot be broken by a missing asset or a
moved file. `npm run smoke` asserts exactly that, because serving over HTTP
hides the failure: HTTP will quietly supply a dependency that `file://` refuses,
so a build can pass every test locally and still fail on the examiner's machine.

`npm run package` collects the standalone application, the servable site, the
report and the deployment descriptors into `release/PMS-<version>.zip`, then
re-opens it with the platform unzipper to confirm an independent implementation
accepts it.

`tools/serve.mjs` is the production server: ETag revalidation, Brotli and gzip,
a strict Content-Security-Policy, `/healthz`, range requests, and path-traversal
containment. `deploy/` carries a Dockerfile, a systemd unit and an nginx
configuration.

Full detail, including a candid statement of what "deployment ready" does *not*
mean for a clinical device, is in **DEPLOYMENT.md**.

## Why the schema is PostgreSQL but verified on SQLite

The DDL is authored in PostgreSQL because the design needs range partitioning,
exclusion constraints and native `TIMESTAMPTZ`. Verifying it needs an engine that
actually executes it, so `verify/rules/sql-shim.mjs` translates the handful of
features SQLite lacks and runs the result.

Constructs SQLite cannot express are guarded in the source by `-- @pg-only:begin`
and `-- @pg-only:end` markers, stripped during verification, and reported as info —
so a skipped statement is never silently ignored.

## Proving the gate works

`npm test` injects twelve deliberate faults one at a time — a banned LOINC code, a
superseded standard number, a malformed FHIR resource, a deleted constraint, a
removed outbox tombstone guard, a missing index, a broken query, a removed
required concept — and asserts the gate rejects each on the expected rule. Every
mutation is reverted, and the run ends by confirming the tree passes again.

> A gate that has never failed is not evidence of anything. If a mutation cannot
> make a check fail, that check is not providing the assurance it claims to.

The verifier prints **every** finding, including passing ones. An earlier version
capped informational output at fourteen lines and printed "… N more", which made
a passing constraint test hidden below the cap indistinguishable from a test that
never ran. For a gate whose only product is a trustworthy list of what it checked,
truncating that list is worse than printing a long one.

## Adding content

- **New section** — add the file, then declare it in `build/manifest.json` under
  `sections`. The gate will fail until it exists.
- **New figure** — drop the SVG in `figures/`, declare it under `figures`, and
  reference the filename from the prose. An unreferenced figure fails the build.
- **New rule** — add an entry to `verify/rules/standards-lint.mjs` with a `severity`,
  a `pattern`, a `fix` message, and optionally `allowContext` for legitimate
  qualified usage. Then add a matching mutation to `tools/selftest.mjs` so the new
  rule is proven to fire.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Gate passed |
| 1 | Gate failed, or the self-test missed a fault |
