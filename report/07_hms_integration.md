# 7. Hospital Management System Integration (Milestone M7)

Goal **G5** requires the monitoring system to plug into hospital-wide admission,
billing and inventory. The integration map is `figures/m7_hms_integration.svg`.

## 7.1 Admission and discharge hooks

Admission and discharge are **transactional hooks, not polled queries**. An admission
event creates, in one database transaction:

- the patient record, keyed on medical record number;
- the `admissions` encounter, with class `IMP`;
- the `bed_assignments` row, which is what makes the bed occupied;
- the ABDM care context reference;
- the default alarm preset for the patient's category.

Making these one transaction is what guarantees that **a vitals row always has an
episode to belong to**. A polled design permits the race where an observation arrives
for an admission that has not yet been written, and the orphan row is either dropped —
losing data — or accepted — producing a reading attributed to no patient.

Discharge closes the encounter and releases the bed assignment in the same
transaction. Until `released_at` is written, the partial unique index on open
assignments prevents any other patient from being admitted to that bed, so **bed
occupancy cannot silently fork**.

Every outbound event carries its source identifier and is idempotent on receipt. The
publishing side uses the transactional outbox described in section 5.6; the
consuming side deduplicates on that identifier. Without idempotency, a redelivered
event produces a duplicate charge, which is both a financial error and a patient
record error.

## 7.2 Billing events

Billing is generated **from consumption, not from a tariff lookup**. This matters
because a tariff lookup at billing time prices yesterday's consumables at today's
rates, and a rate change mid-admission silently alters the patient's bill.

| Event | Triggered by | Carries |
|---|---|---|
| Bed-day charge | Midnight census over open admissions | Ward, bed label, day count |
| Device usage | Monitor assigned to a bed | Asset identifier, duration |
| Consumable | Stock issued to a bed | SKU, quantity, **cost at issue time** |
| Discharge | Encounter closure | Summary line, consumables roll-up |

Consumable line items are raised when stock is **issued** to a bed, not when the
episode closes, because that is when the cost is actually incurred and when the
inventory position must be updated.

**The single largest cost lever in this system is one policy decision**, not a
technical one: whether oxygen saturation probes and temperature probes are reusable
and shared, or single-patient disposable. On the pricing collected for this project,
per-patient-day consumables range from roughly ₹300 to ₹1,200, and the spread is
almost entirely driven by that single choice. It is recorded here as a design
decision to be taken by the clinical governance group, with its cost consequence
made explicit, rather than left to a procurement default.

Device usage is additionally constrained by what the device actually is. A
transport monitor removed from a bed generates a device-usage event; the spare unit
held against the 20 % spare-capacity policy is tracked as an asset movement, not as
a second rental.

## 7.3 Inventory alerting

Alerts fire when **on-hand stock reaches the reorder level**, not when it reaches
zero and not when it reaches some fixed minimum. The reorder level accounts for
procurement lead time; alerting at zero means the stock-out has already happened.

The consumables under management, with the clinical risk each carries:

| SKU category | Reorder basis | Risk if unmanaged |
|---|---|---|
| ECG electrodes | Per patient-day, 2–3 sets | **Monitoring stops.** The single most common consumable |
| Oxygen saturation probes | Per patient, reusable or disposable | Loss of saturation monitoring; single-patient policy dominates cost |
| NIBP cuffs | Per bed, in two sizes | Wrong cuff size biases pressure by up to 30 mmHg — see 3.4 |
| Temperature probes | Per patient, single-use | Cross-infection risk if reissued between patients |

The last two rows are where inventory management is a **clinical safety control**
rather than a supply-chain convenience. A mis-sized cuff and a reused temperature
probe are both measurable patient-safety events, and both are prevented by the
same mechanism: the stores system cannot issue an item to a bed without recording
it against an episode.

Consumption is recorded at the point of issue by the `consumable_usage` table, which
carries the admission and the bed. That makes per-episode, per-bed and per-patient
consumption rates computable, which is what allows the reorder levels to be set from
observed usage rather than from a supplier's default.

## 7.4 Nurse call integration

Most nurse-call systems have **no interface to the patient monitor**. They are a
parallel system, and the honest design position is to say so rather than to assume an
integration that does not exist.

Where integration is required, it is graded:

| Grade | Mechanism | Assessment |
|---|---|---|
| **1** | Relay or coaxial contact closure from the monitor's nurse-call output to the console input | Cheapest, universally available, **selected as the base build** |
| 2 | HL7 or serial via an integration engine | Requires third-party software; documented upgrade path |
| 3 | Direct networking, console subscribes to a monitor feed | Newest generation; not universally available |

> **Standards warning: the moment monitor alarms are routed to a nurse-call console,
> the combination becomes a distributed alarm system** and inherits the full
> reliability, latency, fault-indication and delay-disclosure obligations of the alarm
> standard. **This must not be done casually**, and it is the reason grade 1 — a relay
> output, not an alarm feed — is the base build.

### 7.4.1 Alarm severity hierarchy

If both systems annunciate, they must not compete as undifferentiated noise. The
specified precedence is:

1. Code Blue
2. Monitor **HIGH** priority alarm
3. Monitor **MEDIUM** priority alarm
4. Code Red
5. Monitor **LOW** priority alarm
6. Routine nurse call

**Information signals are not alarm conditions and must not be routed as one.** The
alarm standard explicitly places the electrocardiogram waveform and the saturation
tone in the information category — they are signals, not alarms, and treating them as
alarms is precisely the mechanism by which alarm fatigue develops.

### 7.4.2 Grading of alarm conditions

The alarm standard grades conditions by the potential result of failure to respond
against the onset of potential harm:

| | Immediate onset | Prompt onset | Delayed onset |
|---|---|---|---|
| Death or irreversible injury | **HIGH** | **HIGH** | MEDIUM |
| Reversible injury | **HIGH** | MEDIUM | LOW |
| Minor injury or discomfort | MEDIUM | LOW | LOW |
| No alarm, information only | — | — | LOW or none |

The schema enforces the resulting four-value priority set directly in
`ck_alerts_priority`, so that a value outside the graded set cannot be persisted.
Ventricular fibrillation and asystole are always HIGH regardless of onset.

#### 7.4.2.1 Implementing the matrix against measured values

The matrix grades *conditions*; the system observes *numbers*. Connecting the two
requires a rule for how far beyond its limit a parameter has moved, and that
rule cannot be a single number shared across parameters.

Excursion distance is not comparable between quantities in different units. A
uniform rule of "twelve beyond the limit" produces clinically wrong answers: a
pulse oximetry saturation of 86% and a temperature of 38.5 °C both fall short of
twelve in their own units and are graded LOW — the same priority as a heart rate
of 63/min — while a temperature excursion of 12 °C is not reachable at all, so
pyrexia can never rise above LOW however high the patient runs. The defect is
invisible in testing unless the test cases span units.

The grading is therefore expressed per parameter, in that parameter's units,
implementing the matrix by mapping potential harm onto excursion distance:

| Parameter | MEDIUM beyond limit | HIGH beyond limit | Absolute HIGH regardless of limit |
|---|---|---|---|
| SpO₂ | 3 % | 5 % | ≤ 85 % |
| Heart rate | 10 /min | 30 /min | ≤ 40 or ≥ 180 /min |
| Systolic BP | 15 mmHg | 30 mmHg | ≤ 70 or ≥ 220 mmHg |
| Diastolic BP | 10 mmHg | 25 mmHg | ≤ 40 or ≥ 130 mmHg |
| Mean arterial pressure | 6 mmHg | 15 mmHg | ≤ 50 or ≥ 140 mmHg |
| Temperature | 0.7 °C | 1.5 °C | — |
| Respiratory rate | 8 /min | 15 /min | — |

Saturation is graded most aggressively of the seven, because hypoxaemia kills
quickly and the parameter is cheap to measure continuously. Temperature is graded
least, because a rise is slow and the harm from a missed pyrexia is delayed and
reversible. The absolute column exists because a limit can legitimately be
widened for a particular patient — and a widened limit must not make an
already-critical reading acceptable.

These bands are engineering judgement consistent with the alarm limits in
Table 1, not transcribed from a paywalled clause of IEC 60601-1-8; see §4.9 for
what could and could not be verified. A production implementation would derive
them per-patient from the configured limits rather than from constants.

## 7.5 Interface and its boundaries

| Property | Specification |
|---|---|
| Protocol | HL7 v2.3.1, patient administration and observation reporting chapters |
| Framing | Start `0x0B`, end `0x1C 0x0D`, ISO 8859-1 |
| Transport | Over the hospital network, **never over the monitoring VLAN** |
| Idempotency | Every event keyed on a source identifier, deduplicated on receipt |
| Failure behaviour | Retried from the outbox. No event is dropped silently. |

**The monitoring network and the hospital interface network are separate segments.**
Clinical monitoring must not compete with radiology, laboratory or general hospital
traffic for bandwidth, and a fault in the hospital network must not propagate into
alarm annunciation.

**No clinical alarm transits this interface.** Alarm annunciation is a safety
function with its own latency budget, and coupling it to a message broker would turn
a staffing or network problem into a patient-safety problem.

## 7.6 What the system deliberately does not integrate

Stating the boundaries is part of the integration design.

- **Glucometers are not electrically integrated.** They are stand-alone, non-networked
  point-of-care devices with no standard interface. Integration is by *protocol*: a
  reading that triggers a hypoglycaemia alarm or a sepsis screening score is entered
  by barcode scan into the clinical record and reaches the station from there. The
  monitoring system does not read a glucometer, and the design does not pretend
  otherwise.
- **Infusion pumps are integrated where a real interface exists**, and they matter
  here for a specific reason: a pump cycling at 1 to 10 Hz produces pressure
  pulsations in the giving set, and if that set runs through the same limb as the
  blood pressure cuff the oscillogram is corrupted. Pump alarms should therefore be
  visible centrally so staff can see the cause. Conversely, inflating the cuff on a
  limb carrying an intravenous line occludes that line and raises a pump
  back-pressure alarm — a false alarm whose cause is at the bedside.
- **Diathermy units are not integrated.** They are an interference source managed by
  physical separation, not a device in the data path. See section 2.6.
