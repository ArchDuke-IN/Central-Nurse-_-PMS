# Demonstration Plan

**Purpose:** prove, in twelve minutes, that every goal and milestone in the brief
is discharged by something an examiner can open and interrogate.

**Audience:** a biomedical engineering examiner who will ask follow-up questions.
The plan is built so that every claim on screen is backed by a file in the
repository and a check that can be run live.

---

## 1. Before you start

```bash
npm run ci          # lint, scope, report, tests, build, smoke -> must all pass
npm start           # build the site, then serve it
```

Open `http://127.0.0.1:8420` and **maximise the window**. The layout shows five
beds side by side at 1400 px or wider; below that it stacks and the alarm list
becomes a drawer with a floating badge carrying the open alarm count, so no
alarm is ever silently off-screen.

> **Have a fallback ready.** `dist-web/pms-standalone.html` is the entire
> application in one file. If the network dies, the server hangs, or the
> machine is someone else's, double-click that instead. It needs no server and
> no network. Demonstrate from it and nobody will know the difference.

**Have these open in tabs, ready:**
1. The nurse station app
2. `dist/PMS_Report.md` (the assembled submission)
3. A terminal

Do not start by scrolling the report. Start with the system working, then justify
it.

---

## 2. The running order

### 0:00 — The one-sentence framing

> "This is a five-bed ward whose bedside monitors feed a single nurse station.
> Everything on screen is driven by the same alarm engine the design specifies, and
> every claim I make is backed by a file you can open and a check that can be run."

### 0:30 — Enable audio (do this first, quietly)

Click **Enable audio**. Browsers block audio until a deliberate gesture, so the
control must be pressed; it plays a short medium-priority tone to confirm it works.

> "These are **not** generic beeps, and they are not a downloaded sound pack. The
> IEC standard specifies alarm sounds *parametrically* — frequencies, durations,
> gaps, harmonic tolerance — not as recordings, precisely so that a cheap piezo
> sounder can reproduce them. Manufacturer alarm tones are proprietary and were not
> used. Driving the synthesis from the specification is therefore *more* accurate
> than shipping one vendor's file."

Play the **cardiovascular** category at High, Medium and Low.

> "The pulse count carries the **priority** — ten, three and two pulses. The melody
> carries the **category** — c–e–g for cardiovascular. A real monitor does not emit
> one generic alarm, and that is what lets a nurse know the kind of problem before
> reading the screen."

Switch **Category** to *Oxygenation* and play Medium again — a completely different
melody, same pulse count.

> "The second number that matters is the level ladder: high at 0 dB, medium at
> minus 4, low at minus 8, applied on separate buses so a lower priority *cannot*
> exceed a higher one. That is normative, not a preference. And the pulse tone sits
> eighteen decibels below all of it — it runs continuously, so at parity it would
> mask every alarm."

Click the **♡** button.

> "That is the heartbeat pip: a two-part lub-dup, 691 hertz then 469 hertz. That
> interval is a perfect fifth, and it sits close enough to the real lub-dub of the
> heart that the ear reads it as a heartbeat. A single blip does not."

Point at the **Pulse tone** selector. Switch it from BED-01 to BED-04 and the pip
rate changes to that patient's heart rate.

Then show the silence controls:

Then show the silence controls:

> "Pause and silence are **different states**. Pause auto-resumes after two minutes
> and counts down. Silence is indefinite and requires a deliberate act to end. If
> those two were the same control, a single press could suppress a high-priority
> condition indefinitely."

### 1:00 — Live nurse station (tab 1)

Let it run thirty seconds **before touching anything**. The ECG, plethysmograph
and respiration sweeps must be visibly tracking at realistic speed, with the
values drifting. Do not talk over it. A frozen or fast-scrolling trace is the first
thing a clinical examiner looks for.

Point out:
- **BED-01, BED-03, BED-04** carry different clinical pictures. BED-03 is
  desaturating, BED-04 is febrile and tachycardic. They are not the same patient
  drawn three times.
- **BED-02 is empty and shows a flat baseline**, not a stale trace from the
  previous occupant. Freezing a dead patient's waveform on screen is the exact
  failure this design has to avoid.
- **BED-05 is out of service** — reserved, outlets live, no patient.
- Each numeric tile shows its **alarm limits underneath**, so a clinician can see
  why something is alarming, not just that it is.

### 1:30 — Alarm generation (the core demonstration)

Click **`SpO₂ → 82%`**.

Within a few seconds, in order:
1. The BED-01 tile border turns **red** and the saturation numeral starts blinking.
2. A **HIGH** priority banner appears on the tile.
3. The alarm enters the right-hand rail at the **top**.
4. Open `window.PMS.store.events` in the console and show the audit trail.

**Say this:**

> "The alarm is graded by the magnitude of the excursion, not by the parameter.
> Oxygen saturation below ninety is LOW; below eighty-five is HIGH, because a
> falling saturation threatens perfusion. The grading function re-evaluates on
> every tick, so as the patient deteriorates the alarm **escalates** rather than
> sitting at whatever priority it was assigned when it first fired. You can see
> that in the event log: *SpO₂ escalated LOW → HIGH at 85*."

**This is the single most valuable thing to demonstrate.** Grade escalation on
deterioration is a real clinical safety property, and most student projects do
not have it.

### 3:00 — Acknowledgement and audit

Click **Acknowledge** on the tile or the rail entry.

> "The acknowledgement records the identified operator — name and role — not just
> a boolean. IEC 60601-1-8 requires a tamper-evident record of alarm events, so
> `alarm_acknowledgements` is a separate table from `alerts`: `alerts` records
> that something happened, and the acknowledgement table records who responded,
> when, and whether they acknowledged, silenced or paused."

Point at the entry, now dimmed, still showing *"ack A. Menon"*.

### 3:45 — Technical versus physiological

Click **`Lead off`**.

> "That raises a **technical** alarm, not a physiological one. A disconnected
> electrode is a fault in the equipment, not an event in the patient, and the
> standard requires the two to be distinguishable. Conflating them is a documented
> route to alarm fatigue."

Then click **`Info signal`**:

> "An INFORMATION signal is not an alarm at all. IEC 60601-1-8 explicitly places
> the ECG waveform and the saturation tone in that category — they are signals,
> not alarms. Ours is generated and deliberately not routed as one."

### 4:45 — Trends (tab: Trends)

> "Trends carry the alarm limits as dashed reference lines, and mean arterial
> pressure is treated as what it is — a **derived** value, not a measurement."

If asked how you know MAP is derived: `(SBP + 2·DBP)/3`, and the schema **refuses
to store it without recording what it was derived from**. That constraint is
demonstrated live later.

### 5:30 — Ward (tab: Ward)

> "The ward plan shows the three zones that matter for this system: the bedheads
> on a dedicated supply group, the nurse station with an unobstructed sightline to
> all five beds, and — outside the ward envelope — the electrosurgical source."

If asked about the ESU placement:

> "Electrosurgery radiates harmonics and generates 40–50 V/m at one metre. The
> patient is part of the radiating antenna, so shielding cannot fully solve it.
> **Separation is the primary control**, not filtering. The compliance standard
> sets immunity test levels but does not tell a designer how to achieve them, so
> formal EM zoning and specified separation distances are the design controls."

### 6:15 — Audit (tab: Audit)

Press **`4`**. This screen was worth adding because alarm safety is mostly an
accountability problem.

> "Three things. The **alarm record** — every alarm raised this session, with the
> count acknowledged and the count escalated. The **event trail** — the ordered
> log. And the **alarm latency budget** from report §4.4: sensor to detection
> 0.5–1.0 s, bedside generation ≤ 0.2 s, transport ≤ 0.1 s, hub annunciation
> ≤ 0.3 s, so a remote annunciation lands in 1.5–2.5 s."

Point at the operator field:

> "Every acknowledgement is attributed to a named operator, because 60601-1-8
> requires a tamper-evident record of alarm events, and an unattributed
> acknowledgement is not one."

If asked *"is this a real audit trail?"*:

> "No, and I want to be clear about that. It is in-memory for the demonstration.
> The production design puts alarm events through the transactional outbox into
> `alarm_events` with an append-only constraint and operator identity, which is
> what makes it tamper-evident. Report §5 covers that. This screen is the shape
> of it, not the security of it."

### 6:45 — Standards (tab: Standards)

> "Two things on this screen matter. First, **IEC 80601-2-49** — multifunction
> patient monitors — is the standard that actually governs this equipment, and it is
> not named in the brief. Second, three of the brief's citations are superseded or
> misapplied, and each correction is deliberate rather than accidental."

Walk the **Deviations applied deliberately** panel. Each is a defensible correction:

| Brief | Correction | Why |
|---|---|---|
| IEC 60601-2-25 for bedside ECG | **60601-2-27** | The diagnostic standard's own scope excludes cardiac monitors |
| IEC 60601-2-30 | **80601-2-30** | Renumbered; the 60601 number no longer exists |
| *(absent)* | **80601-2-49 added** | The primary particular standard for this equipment |
| *(if cited)* IEC 60601-1-11 | **excluded** | Home-healthcare triggered; a ward is not that |

### 7:30 — Scope coverage (tab: Scope Coverage)

> "This is generated, not asserted. `npm run scope` checks every goal and
> milestone against files that must exist and content that must be present, and
> emits this table."

Switch to the terminal and run it live:

```
npm run scope
```

It prints each goal, each piece of evidence, and the verdict.

### 8:30 — The schema is executable, not printed

Switch to the terminal:

```
npm run verify
```

> "The report embeds SQL. Rather than trusting that it parses, the harness
> executes it — the DDL, the seed data, and then ten deliberately invalid rows,
> each of which must be **rejected for the reason claimed**."

Then show the self-test:

```
npm test
```

> "And because a gate that has never failed proves nothing, this injects twelve
> faults — a banned terminology code, a superseded standard, a malformed FHIR
> resource, a deleted constraint, a missing index — and asserts the gate catches
> each one. Currently twelve caught, zero missed."

### 10:00 — The one architectural argument

> "If I have one claim to make about the design, it is this: **a bedside monitor
> routing alarms to a nursing station is the textbook definition of a distributed
> alarm system** under IEC 60601-1-8, which carries reliability, latency,
> fault-indication and single-point-of-failure obligations. The consequence is
> that **alarm evaluation happens at the bedside and the hub, and never on the
> archival path**. If alarm detection depended on a successful database write, a
> storage fault would become a patient-safety fault."

Follow with the latency budget from report §4.4.

### 11:00 — Limitations, stated before being asked

Do not wait to be challenged. Say:

> "Four things are design rather than build, and I would rather state them than
> have you find them."

1. The monitor interface is **specified, not implemented** — no hardware was
   procured and no device association established.
2. The national health exchange integration is designed against documentation and
   a sandbox specification; no live enrolment was performed.
3. Usability controls are specified; the **summative evaluation that IEC 62366-1
   requires has not been conducted**.
4. Clause-level numeric limits — leakage tables, creepage, immunity levels — sit
   inside paywalled standards. They are **omitted rather than quoted from
   secondary sources**, because the secondary figures are wrong.

---

## 3. Requirement to demonstration map

| Brief item | Where it is demonstrated | Where it is documented |
|---|---|---|
| G1 ward design | Ward tab, layout figure | §2, Appendix A, `m3_ward_layout.svg` |
| G2 centralised monitoring | Nurse station, alarm escalation, acknowledgement | §4, `m4_block_diagram.svg` |
| G3 digital health | Scope tab, live console on `store.events` | §6, `m6_data_flow.svg` |
| G4 data modelling | `npm run verify` — constraint tests | §5, `db/01_schema.sql`, `m5_er_diagram.svg` |
| G5 HMS linkage | Ward tab, scope tab | §7, `m7_hms_integration.svg` |
| M1 checklist | Scope tab evidence column | Appendix A |
| M2 instrument spec | Standards tab | §3 |
| M3 layout + electrodes | Ward tab, `m3_electrode_12lead.svg` | §2, Appendix B |
| M4 block diagram | Ward + architecture narrative | §4, `m4_block_diagram.svg` |
| M5 ER + DDL | `npm run verify` output | §5, `db/01_schema.sql` |
| M6 data flow | Scope tab | §6, `m6_data_flow.svg` |
| M7 HMS map | Ward tab | §7, `m7_hms_integration.svg` |
| M8 full draft | `dist/PMS_Report.md` | All eight sections |
| M9 review | `npm run loop` PASS, `npm test` 12/12 | README, `loop_log/` |

---

## 4. Contingencies

| If this happens | Do this |
|---|---|
| The app does not start | `npm start` again; check port 8420 is free, or open `dist-web/pms-standalone.html` directly |
| No alarms appear | Click `SpO₂ → 82%`. The scenario bar always works |
| No sound | Audio needs a user gesture — click **Enable audio** first. Browsers block autoplay |
| Pulse tone is on the wrong patient | Use the **Pulse tone** selector; it is per-bed by design |
| Waveforms look frozen | Hard refresh `Ctrl+Shift+R`; the sweep needs ~10 s to fill |
| The scope tab is empty | Run `node tools/scope-audit.mjs --write` to regenerate `scope.json` |
| `npm run verify` fails | It is meant to catch edits — read the failing rule, fix the source, re-run |
| Asked about a number you cannot source | **Say so.** Every unverified number is flagged in the research notes and omitted from the report |

---

## 5. Questions to expect, and the answers

**"Why 5-lead rather than 12-lead at the bedside?"**
Twelve-lead acquisition needs ten electrodes, a technician and a settled patient.
It is a diagnostic procedure governed by the diagnostic ECG standard, which is
precisely why that standard's scope excludes cardiac monitors. Five-lead adds one
precordial electrode — conventionally V5 — and delivers the largest single gain in
continuous monitoring, which is ischaemia detection. Twelve-lead remains available
on demand from the hub for a recording that is then governed by the diagnostic
standard.

**"How do you know which alarm belongs to which patient?"**
Three controls. Persistent bed identity on every tile and alarm. Audible
differentiation by priority using distinct melodic structures rather than pitch
alone. And a schema constraint that **forbids two patients being mapped to one
bed** — a partial unique index on open assignments, which is demonstrated live by
the constraint test. A third control is in the report and not built: the
summative evaluation IEC 62366-1 requires.

**"What happens if the network drops?"**
Local bedside annunciation continues, because alarm evaluation is distributed. The
station marks the bed stale and shows the time of last contact — it must never
present a frozen trace as live. When the bed reconnects the hub merges and
de-duplicates the recovered interval rather than dropping it or showing a silent
discontinuity.

**"What is your error budget for NIBP?"**
The standard criterion is a mean difference of 5 mmHg with a standard deviation of
8, across 85 subjects, every cuff size tested. But the standard is explicit that the
device **estimates** blood pressure rather than measuring it: mean arterial pressure
comes from the envelope peak, while systolic and diastolic have no physical marker
and are inferred from envelope shape. The fixed-ratio algorithm is the weak link —
a ratio error of 0.2 amplifies into a pressure error of more than 40×. In practice
cuff sizing dominates: a wrongly sized cuff shifts the result by up to 30 mmHg,
six times the standard's own criterion.

**"What do the different alarm sounds mean?"**
Two independent encodings. The **pulse count** carries priority — ten, three and
two pulses for high, medium and low. The **melody** carries the category — c-e-g
for cardiovascular, C-B-A for oxygenation, c-a-f for ventilation, c-d-e for
temperature. A real monitor does not emit one generic alarm, and that is what lets
a nurse know the kind of problem before reading the screen. Information signals
get one short soft blip that is deliberately *not* alarm-shaped, because they are
not alarms.

**"Where did the sounds come from — did you download a pack?"**
No, and that is deliberate. IEC 60601-1-8 specifies the alarm sounds
*parametrically* — fundamental ranges, pulse durations, the gap structure of the
burst, and a tolerance on harmonic balance — rather than as waveform files, so
that a cheap piezo sounder can reproduce them. Manufacturer alarm tones are
proprietary product IP and are not lawfully distributable. Driving the synthesis
from the specification is therefore *more* accurate than shipping any single
vendor's recording, which is only one implementation of the same specification.

**"Have you verified those sound parameters?"**
The ones implemented are verified, and where the standard gives a range the value
sits inside it: pulse durations, the gap structure including the 2x-gap plus
duration intervals and the 0.35-1.30 s mid-burst delay, the interburst intervals,
and the harmonic requirements. The prototype measures **eleven harmonics between
300 and 4000 Hz against a requirement of four**, with the **four largest components
within 2.0 dB against a tolerance of 15 dB**.

The Table 3 pulse repetition rates in pulses per minute and the absolute minimum
sound pressure level I did **not** quote — they sit inside a paywalled document and
at least one secondary source states them incorrectly. The harmonic flatness is
not cosmetic either: the 15 dB tolerance exists so that direct and reflected sound
in a ward cannot cancel one partial and leave the alarm inaudible from some
positions.

**"Why is it not as loud as a real monitor?"**
A browser cannot produce the 70-80 dB(A) at one metre that real monitors do —
laptop speakers top out far below that, against a ward ambient of roughly
55 dB(A). **Absolute SPL is not a browser capability.** What this design specifies
is the *relative* dynamic ladder — high at 0 dB, medium at -4, low at -8, with the
pulse tone 18 dB below — applied on separate buses so a lower priority cannot
exceed a higher one. That ladder is what makes the set legible, and it is what the
standard actually requires.

**"Why is the alarm path not the database path?"**
Two reasons. Reliability: a database write can fail for reasons unrelated to the
patient. And latency: archival latency is unconstrained, and clinical monitors are
alarm-critical. The design therefore carries alarms on a dedicated channel and keeps
the archival store off the loop entirely.

**"Why MQTT rather than FHIR subscriptions?"**
Because QoS 1 gives delivery acknowledgement and replay. A FHIR subscription is
trial-use and best-effort, and the specification states plainly that **no
notification is issued when a resource is deleted or ceases to match the
criteria** — a correctness gap in a monitoring system. FHIR R4 is still used, but
for the durable auditable record, which is what it is good at.

**"What is your biggest technical limitation?"**
There is **no mature published FHIR profile for bedside-monitor data**. The
point-of-care device FHIR implementation guide is still at ballot and the device
interoperability supplement states its FHIR gateway mappings are not yet ready for
profiling or product implementation. So the profile in this design is a prototype
contribution, modelled on the device-interoperability actor model, rather than an
adoption of an existing standard. The report says so rather than implying otherwise.

**"Why not claim de-identification?"**
Because the Indian DPDP Act is a consent and accountability law, not a
de-identification law — it has no safe-harbour provision, no list of eighteen
identifiers and no expert-determination route. And because for this application
safe harbour is the wrong tool anyway: a five-bed unit produces high-frequency
longitudinal data, and a patient is trivially identifiable from their own
heart-rate trace even with every identifier stripped. The design keeps two
datasets — a full-fidelity operational one and a minimised export — and says
which is which.
