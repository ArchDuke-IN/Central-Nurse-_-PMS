# 4. System Architecture and Alarm Design (Milestone M4)

Goal **G2** requires all five beds to feed live vitals to a single nurse-station hub.
The block diagram is `figures/m4_block_diagram.svg`.

## 4.1 Architecture in one sentence

Five bedside monitors publish over a dedicated segmented network to a hub that
terminates their device associations, normalises terminology, evaluates alarm limits
locally, and serves one nurse station plus a duty-desk repeater — with the archival
record and the national health exchange deliberately kept off the alarm path.

## 4.2 The classification that shapes everything: a distributed alarm system

The single most consequential standards statement in this project is that
**a bedside monitor routing alarms to a nursing station is the canonical example of a
distributed alarm system** under **IEC 60601-1-8**.

A distributed alarm system is one in which the alarm is communicated from the source
device to one or more remote devices for operator awareness. The standard sets
expectations on **reliability, latency, fault indication and single-point-of-failure
analysis** for exactly that arrangement.

This classification is not a formality. It carries four concrete obligations:

1. **Reliability.** An alarm that exists at the bedside and does not appear at the
   station has failed, regardless of whether the physiological alarm was genuine.
2. **Latency.** The standard sets thresholds above which delay statistics must be
   disclosed in the instructions for use. Those thresholds are addressed in 4.4.
3. **Fault indication.** If the network or the hub fails, the system must *say so*
   rather than silently displaying stale data.
4. **Single-point-of-failure analysis.** The hub is a single point of failure for all
   five beds, and must be treated as such in the design and in the risk file.

**The design consequence is the most important architectural decision in this
document: alarm evaluation happens at the bedside and at the hub, and never on the
archival path.** If alarm detection depended on a successful database write, then a
storage fault would become a patient-safety fault. This is why section 6.5 separates
the real-time and archival paths.

## 4.3 Transport and the normalisation gateway

### 4.3.1 Why a gateway is unavoidable

A clinical monitor does not speak FHIR. It speaks a vendor protocol, or an IEEE 11073
device association negotiated at the application layer over a serial or network port.
A FHIR server speaks HTTPS and JSON. **Nothing bridges these natively.** The gateway is
therefore not an implementation convenience but the primary architectural decision.

Beyond translation, the gateway is the **single normalisation point**. Device-specific
codes are mapped to LOINC and UCUM in exactly one place, so that integrating a new
monitor model is a change to one component rather than to every consumer of the data.
This is the translator-and-adapter pattern, and it is the defensible answer at a scale
where the bedside hardware is under the design team's control.

Its scale requirement is real but modest: five beds at one to five updates per second
across ten parameters produces on the order of **50–250 messages per second** at one
station. Ingest is therefore batched per bed rather than written as individual
resources, and full-disclosure waveform data is kept out of the relational store
entirely.

### 4.3.2 Transport choice

| Criterion | FHIR over HTTPS | HL7 v2 over MLLP | MQTT |
|---|---|---|---|
| Offline tolerance | Fails if the server is down | Partial | Queued, replayed on reconnect |
| Acknowledgement | HTTP status | Application-level message | Built into QoS 1 |
| Fan-out | One request per subscriber | Consumer must be addressed | Native |
| Backpressure | Server errors | Application-level | Built in |
| Semantic richness | High | Codes in string fields | None |
| Regulatory recognition | High | Medium | Low |

**Selection: Ethernet for transport, MQTT at QoS 1 for the real-time feed, FHIR R4 over
HTTPS for the durable record, and HL7 v2 only as an input adapter where a specific
monitor cannot be spoken to any other way.**

Two points justify this rather than a single-protocol answer:

- **Ethernet is the only acceptable physical transport for a fixed bedside unit.**
  USB offers no galvanic isolation guarantee and is therefore unsuitable for
  patient-connected data. Wireless is discouraged for a fixed installation: it
  occupies unlicensed spectrum in a building that already runs clinical Wi-Fi.
- **QoS 1 matters specifically.** It provides delivery acknowledgement and replay.
  This is what makes an at-least-once feed safe, and the schema is built to expect it:
  the unique key on instrument, parameter and timestamp means a redelivered sample is
  rejected rather than duplicated. Section 5.5 shows this constraint being exercised.

### 4.3.3 Time synchronisation

The hub is the network time source; all five beds, both view stations and the recorder
synchronise to it at sub-second resolution.

This is not operational tidiness. Alarm thresholds, "time since event" displays,
early-warning-score calculation and waveform alignment all depend on it, and an
alarm timeline that cannot be reconstructed across five beds is worthless for
post-incident review. Every vitals row therefore records **both** the moment the sensor
sampled and the moment the hub wrote the row, so that the transport component of the
latency budget is measurable rather than assumed.

## 4.4 End-to-end alarm latency budget

The distributed-alarm obligation is discharged by stating a budget and then measuring
it. The table below is the design target.

| Stage | Budget | Notes |
|---|---|---|
| Sensor acquisition to bedside detection | 0.5–1.0 s | Dominated by signal averaging; the SpO₂ averaging window alone is 8–16 s depending on sensitivity setting |
| Bedside signal generation | ≤ 0.2 s | Includes alarm priority evaluation |
| Network transport | ≤ 0.1 s | Local switched Ethernet |
| Hub receipt and re-annunciation | ≤ 0.3 s | |
| Nurse perception and acknowledgement | 3–20 s | Human, not engineered, but bounded by observation of the display |
| **Total, onset to nurse** | **4–8 s** | |
| **Total, onset to remote annunciation** | **1.5–2.5 s** | |

Two disclosure thresholds in the alarm standard apply to these numbers, and both must
be honoured: where the maximum alarm condition delay plus the maximum signal
generation delay exceeds ten seconds, the statistics of each distribution must be
disclosed in the instructions for use; where the mean delays sum to more than five
seconds, the delays must be disclosed. **This design publishes both sets of figures
rather than relying on being under the threshold**, because a clinically meaningful
alarming rate across five beds will exceed a five-second mean more often than not.

The mean-reverberation time to declare an alarm may additionally be disclosed as the
maximum time to generate the technical alarm condition at a remote location.

### 4.4.1 Two delays that must be disclosed explicitly

**Suppression delay.** Oxygen saturation alarms are suppressed while the
non-invasive blood cuff inflates, because cuff inflation reliably produces a
spurious desaturation artefact. This is a deliberate delay in alarm annunciation and
**must be disclosed as such**, not hidden.

**Silence and pause must be distinguishable.** A paused alarm resumes automatically
after a defined interval; a silenced alarm stays silent until a person acts. If the
nurse cannot tell these apart at a glance, a high-priority condition can be
effectively suppressed for an unbounded period. The nurse-station display therefore
distinguishes them by design.

## 4.5 Failure behaviour

| Failure | Required behaviour |
|---|---|
| Bedside network link lost | Local annunciation continues at the bedside. The hub marks the bed stale and shows the time of last contact. The station **must never display a frozen trace as live.** |
| Hub unavailable | Bedside units continue to alarm locally. This is the reason alarm evaluation is distributed. |
| Power interruption | Default alarm presets re-apply on restore. Essential supply takes the station and at least one bedside unit. |
| Time source unavailable | The hub flags alarm timelines as unsynchronised rather than presenting a plausible-looking but wrong ordering. |

**Default alarm presets must be re-applied** on power-up, on enabling the alarm
system, **on admitting a new patient**, and on restoring from total power loss. This
last point is the one most often missed in ward configuration: without it, a bed
adopted at a later date can inherit limits set for a different patient category, and
the alarm presets are locked to the responsible organisation so that an individual
operator cannot overwrite them.

## 4.6 Nurse station design

| Capability | Reference figure | 5-bed target |
|---|---|---|
| Patients per display | 16–36 on a 30-bed class system | **5–8, never more than 10** |
| Waveforms per patient | 8–12 | 5–6 |
| Full-disclosure waveform retention | 240 h | **≥ 72 h** |
| Trend retention | 240 h | **30 days** |
| Event recall | 3,000 events at 16 s either side | **≥ 500 events** |
| Measurements retained | 3,000 | **≥ 1,000** |

Host specification for a five-bed ward: a four-core processor, 8 GB of memory and a
250 GB solid-state store, against a 500 GB mechanical disk for the 64-bed class
system. One 1 kVA online UPS with at least 30 minutes of autonomy, and a RAID 1
mirrored host, because the hub is a single point of failure for the entire ward.

**Data backfill on reconnect.** When a bed rejoins after a network interruption, the
hub merges and de-duplicates the recovered interval rather than either dropping it or
presenting a discontinuous trace without indication. The redundancy model is
deliberate: UPS for power loss, RAID 1 for host loss, local bedside annunciation for
network loss.

## 4.7 Usability: the five-patient cognitive problem (IEC 62366-1)

A nurse watching five patients is the defining use-related hazard of this design, and
it is the strongest justification for including a usability standard in the project.

The hazard is **bed identity confusion**. An alarm must be attributable, within
seconds, to one of five patients whom the nurse may not currently be observing. Three
controls address it:

1. **Persistent, unambiguous bed identity** on every display tile, in every alarm
   presentation and in the printed record. The relational schema enforces that a bed
   has at most one open assignment, so the identity mapping itself cannot fork.
2. **Audible alarm differentiation by priority**, with distinct melodic structures
   rather than differing pitch alone — which is what the second amendment to the
   alarm standard introduced, having found that the original design gave eight
   high-priority alarms identical temporal structure.
3. **Alarm severity hierarchy across systems**, defined in section 7.4, so that a
   monitor alarm and a code blue do not compete as undifferentiated noise.

A summative evaluation would be required before release: five representative nurses
performing representative tasks against the specification, measuring whether they
correctly and promptly identify which patient an alarm belongs to.

## 4.8 Alarm fatigue and the suppression of nuisance alarms

Alarm fatigue is the leading cause of missed clinically significant alarms in
critical care. Three design responses are specified.

**Differentiate technical from physiological alarms.** A disconnected electrode is a
device fault, not a patient event, and must not be presented with the same urgency
as ventricular fibrillation. Both are represented in the schema — the `kind` field
distinguishes physiological, technical and system conditions — but they are ranked
and styled differently at the station.

**Manage known artefact sources.** NIBP-aware suppression of saturation alarms during
cuff inflation, with the delay disclosed per 4.4.1, is the standard example.

**Instrument nuisance rates rather than assert them.** The alarm standard **sets no
numeric nuisance-alarm budget**. Any figure quoted for this design is therefore a
**design target set by this project**, traceable to the alarm statistics function of
the central station, and not a figure inherited from a standard. The relational schema
supports the measurement: `escalation_count` on every alert, and a retained
acknowledgement record, together make alarm rates and response times computable per
bed, per parameter and per shift.

## 4.9 Alarm audio design

Two sound systems are specified, and keeping them separate is the point.

### 4.9.1 Why these sounds are synthesised rather than recorded

Real manufacturer alarm tones are **proprietary product intellectual property**.
No lawful source of a Dräger, Philips, GE, Mindray or Nihon Kohden alarm-tone
recording exists, and none was used.

That is not a compromise, and it is worth stating why. **IEC 60601-1-8 specifies
the alarm sounds parametrically** — fundamental frequency range, pulse duration,
the gap structure of the burst, and a tolerance on how closely the four largest
harmonics must sit together. It does not prescribe a waveform file. That is
deliberate: the requirement must be reproducible on a cheap piezo sounder as well
as on a mains-powered monitor. A faithful implementation driven from the
specification is therefore **more** accurate than any single manufacturer's
recording, which is merely one implementation of the same specification.

The timing parameters below are those of IEC 60601-1-8:2006+A1:2012 Tables 1 and
2, as reproduced in freely available manufacturer application literature.

### 4.9.2 The pulse tone

A two-part **lub-dup** pip on each detected heartbeat: a short "lub" at about
691 Hz followed by a "dub" at about 469 Hz. That interval is a perfect fifth and
sits very close to the true lub-dub of the heart, which is why it reads as a
heartbeat rather than as a beep. A single blip does not.

- **Rate** follows the pulse rate, one pip per detected beat.
- **Pitch** follows oxygen saturation, so a falling saturation is audible before
  the number is read.
- **Level** falls slightly with saturation as well.
- **Per-beat variation** of a few tenths of a percent is applied to pitch.
  Perfectly identical repeats read as synthetic; slight physiological variation
  reads as alive.

On real equipment **this tone comes from the bedside unit, not the central
station**, because five simultaneous pulse tones are unintelligible. The station
therefore makes the tone source **selectable per bed**, and the working prototype
implements exactly that.

**It is an information signal, not an alarm.** The standard classes the saturation
tone and the electrocardiogram waveform sound as information signals, and neither
may ever follow the alarm burst grammar.

### 4.9.3 The alarm signal

| Parameter | High | Medium | Low |
|---|---|---|---|
| **Pulses per burst** | **10** | **3** | **2** |
| Pulse duration | 146 ms (range 75–200) | 200 ms (range 125–250) | 200 ms |
| Ordinary gap | 124 ms (range 50–125) | 124 ms | 124 ms |
| Special gap | 394 ms = 2×gap + duration, twice; plus 800 ms between the fifth and sixth (range 0.35–1.30 s) | — | — |
| Interburst interval | 5.0 s (range 2.5–15) | 9.0 s (range 2.5–30) | 18.0 s (over 15) |
| Relative level | 0 dB | −4 dB | −8 dB |

**The melody identifies the category; the pulse count identifies the priority.**
A real monitor does not emit one generic alarm, and that distinction is what lets
a nurse know the kind of problem before reading the screen.

| Category | Medium melody | High melody |
|---|---|---|
| **Cardiovascular** | c – e – g | c – e – g – g – C |
| **Oxygenation** | C – B – A | C – B – A – g – f |
| **Ventilation** | c – a – f | c – a – f – a – f |
| **Temperature** | c – d – e | c – d – e – e – C |
| **General** | c – c – c | c – c – c – c – c |

The cardiovascular melody **c – e – g** is the reserved figure in the standard, and
the high-priority form is that figure extended to five notes and played twice,
which is where the ten pulses come from.

Low priority is a single descending pair, e – c. Information signals receive one
short, soft, mid-register blip that is **deliberately not alarm-shaped**, because
an information signal is not an alarm condition.

### 4.9.4 Timbre — the parameter that decides whether it sounds clinical

This is the single most important choice, and it is where a naive synthesiser
fails. A pure sine, or an evenly-spaced 1-2-3-4 harmonic stack, sounds thin and
obviously synthetic.

Measured spectra of conforming alarm tones show a **flat harmonic stack**:
harmonics 1 and 3 through 9 sitting within about 5.5 dB of each other, with the
second partial some 26 dB down. That flatness is itself a requirement — the four
largest components must lie within 15 dB of each other — and the tolerance exists
so that direct and reflected sound in a ward cannot cancel one partial and leave
the alarm inaudible from some positions.

The design implements harmonics 1 through 9 with the second partial at −26 dB and
the remainder flat. **Measured on the working prototype: eleven harmonics present
between 300 and 4000 Hz against a requirement of four, and the four largest
components within 2.0 dB against a tolerance of 15 dB.**

Fundamentals sit between 260 and 700 Hz, below the 1000 Hz threshold recommended
for long-distance audibility. A 4.5 kHz low-pass emulates the roll-off of a small
piezo driver and removes the digital edge.

### 4.9.5 Relative level

The standard requires only that a high-priority burst be louder than medium,
which in turn is louder than low. The practical guidance is **three to six
decibels per step**; four is used here. The ladder is applied on **separate gain
buses**, so a lower priority can never exceed a higher one — that is normative,
so it is expressed as a constant rather than left to taste.

The pulse tone sits **18 dB below the high-priority bus**. It runs continuously,
and at parity it would mask every alarm. This figure is a design inference, not a
standard value: the standard does not specify the pulse tone level at all.

Absolute sound pressure is not deliverable from a browser — laptop speakers top
out well below the 70–80 dB(A) at one metre that a real monitor produces, against
a ward ambient of roughly 55 dB(A). **The relative dynamic ladder is what this
design specifies, and that is what makes the set legible.** A soft clipper and a
compressor stand in for the limiter that protects a real monitor's sounder.

### 4.9.6 Silence control

A **bounded pause** and an **indefinite silence** are separate states and are
presented differently, because conflating them allows a high-priority condition to
be suppressed for an unbounded period by a single press.

### 4.9.7 What is deliberately absent

The pulse repetition rates in pulses per minute from the standard's Table 3, the
absolute minimum sound pressure level, and the visual alarm parameters are **not
quoted**, because they sit inside a paywalled document and secondary sources were
found to misstate them — one published "compliance guide" conflates carrier
frequency with pulse repetition rate. The structures above are built from
parameters that were verified; the absolute rates are an implementation choice,
labelled as such rather than presented as compliance.

| Requirement | Where it is discharged |
|---|---|
| Audible priority differentiation | 4.9.3, and the category audition control in the prototype |
| Harmonic content and balance | 4.9.4, measured on the prototype |
| Information signals not routed as alarms | 4.9.2, enforced by a separate severity class and bus |
| Pause and silence distinguishable | 4.9.6 |
| Audible technical versus physiological | 4.8 |
| Alarm not dependent on the archival path | 4.2 |
