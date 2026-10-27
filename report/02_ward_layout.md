# 2. Ward Layout and Physical Design (Milestone M3)

Goal **G1** requires a safe, functional five-bed layout with instrumented bedside
units. The floor plan is `figures/m3_ward_layout.svg`; electrode placement is
`figures/m3_electrode_12lead.svg` with the derivation reference in Appendix B.

## 2.1 Zoning and dimensions

The ward is 9.6 m by 7.2 m of internal floor area — 69.1 m² over five beds, or
about 13.8 m² per bed including circulation and support space. Beds are arranged in
**three bays** rather than a single row, because bay separation gives a physical
barrier between adjacent patients that a single row cannot.

| Zone | Clearance | Rationale |
|---|---|---|
| Bed footprint | 2.2 m × 3.0 m | Bed plus head-unit depth and lateral transfer space |
| Foot of bed to circulation | 1.5 m clear | Bed extraction without turning |
| Corridor | 1.8 m clear | Bed transport and emergency egress |
| Bay entry to first bed | 1.2 m | Hand hygiene point before patient contact |
| Nurse station to nearest bay | direct line of sight | see 2.2 |

**Hand-wash basins are placed at every bay entry**, not only at the ward door.
The clinical evidence for hand hygiene is that it is performed at the point of
contact with the patient, not at the point of entry to the room, and in a shared
bay the bay entry is the relevant moment.

## 2.2 Nurse station placement

The station is positioned on the ward's long axis so that **every bed is visible
without the nurse leaving the desk or losing a patient to a corner**. This is not
an aesthetic preference. Under **IEC 62366-1** it is a use-related risk control:
a nurse attending to one patient must be able to retain situational awareness of the
other four without a head turn through an obstruction.

The sightline requirement has a hardware consequence recorded in Appendix A as
**N-04**: bed identity becomes ambiguous the moment a bed is occluded by a curtain,
a mobile screen or a tall piece of equipment. Curtains must not be drawn across a
sightline without the station receiving an explicit indication that a bed is no
longer visible. The bed's `operational_status` field in the relational schema
carries the occupied, unoccupied, closed and out-of-service states that drive this
display.

## 2.3 Bed head services

Each bed head carries the point-of-care services and the monitoring equipment
identified in section 3:

| Service | Specification |
|---|---|
| Multifunction monitor | Wall- or rail-mounted, 5-bed + 1 spare |
| Oxygen | Wall outlet, flowmeter |
| Suction | Wall outlet, jar, with isolation valve |
| NIBP cuff set | Adult, large adult, paediatric, neonatal |
| SpO₂ probes | Reusable adult clip plus single-patient disposables |
| Temperature probe | Single-patient skin probe, axillary |
| Data outlets | Two isolated outlets per bed, medical IT group |
| Equipotential bonding stud | One per bed head |

**Bed head clearance is kept at 1.5 m** so that a nurse can work at the head of the
bed, where monitoring adjustment, airway access and defibrillation all occur, without
the bed being pushed against a wall.

## 2.4 Cable routing

Every bedside cable run is shown on the floor plan as a **segregated data trunk**
running from the nurse station along a dedicated route, deliberately separated from
mains cabling.

This is a deliberate response to a specific and well-documented failure mode in
hospital installations: twin-and-earth data cable run close to mains provides
**no electromagnetic shielding whatsoever**, because the cable has none. Shielded
twisted-pair in a segregated containment is the minimum acceptable construction.

Two further routing rules follow from section 2.6:

1. **Do not bundle ECG, SpO₂ and NIBP cables into a single trunk run.** Bundling
   dissimilar cable types over long distances is the textbook crosstalk geometry,
   and reactive coupling between them is strongest at low impedance and high current,
   which is exactly the NIBP pump's load signature.
2. **Do not route data trunks past the suction tubing.** Suction is a strong
   mechanical and pneumatic source and will induce microphonic artefact in adjacent
   ECG lead cables.

## 2.5 Electrode choice and placement

Placement is given in full in Appendix B and drawn in
`figures/m3_electrode_12lead.svg`. The ward-scale decision is **five-lead** rather
than twelve-lead at the bedside.

A twelve-lead acquisition requires ten electrodes and, in practice, a trained
technician and a settled patient. It is not a continuous-monitoring configuration;
it is a diagnostic one, which is precisely why IEC 60601-2-25 excludes cardiac
monitors from its scope. A five-lead set adds one precordial electrode, conventionally
V5, and is what actually improves detection of myocardial ischaemia in a monitored
patient. Twelve-lead capability is retained in the hub so that a diagnostic
electrocardiogram can be recorded on demand without moving the patient, and that
recording is governed by the diagnostic standard rather than the monitoring one.

Electrodes are disposable Ag/AgCl with hydrogel. The half-cell potential is
approximately +0.22 V per electrode, and because the offsets are common-mode they
cancel **only if the electrodes are chemically identical**. Mixing electrode types or
ages within one patient is therefore a design constraint on the stores system, not
merely a procurement preference.

## 2.6 Electromagnetic compatibility and the diathermy problem

Goal G1 and milestone M1 both name diathermy as a voice of the customer. As set out
in section 1.3.2, this is treated here as **electrosurgical** interference, which is
the dominant EMI risk to physiological monitoring.

### 2.6.1 Why monitors are the victims

Electrosurgery drives currents above 1 A at a fundamental frequency around 500 kHz,
and radiates harmonics extending into the low megahertz range. It can generate fields
of **40–50 V/m at one metre**, and its historical adaptation as a radar jammer is a
reasonable indication of its power. Shielding cannot fully solve this, because
**the patient is part of the radiating antenna**.

Against that, the signals being measured are small:

| Signal | Typical amplitude |
|---|---|
| Electrocardiogram | **1 mV** |
| Electroencephalogram | 100 µV |
| Electromyogram | 10 µV |
| Evoked potential | 1 µV |

The electrosurgical unit also places **100–400 V of transient voltage directly across
the patient's skin**, from the geometry of current returning through tissue of varying
conductivity. The consequence is that the burst is **rectified at the Ag/AgCl
electrodes**, which demodulates it and injects non-stationary interference *inside* the
electrocardiogram passband rather than outside it where a filter could remove it.
Signal-to-noise ratio during activation falls to roughly −90 dB.

### 2.6.2 Three propagation mechanisms

| Mechanism | Dominant range | Relevance here |
|---|---|---|
| Conduction | Below 30 MHz | **Directly applicable** — electrosurgery at ~500 kHz and short-wave diathermy at 27 MHz both fall in this regime |
| Reactive coupling | Any | Inductive coupling follows high current and low impedance; capacitive follows high voltage and high impedance. Crosstalk appears when dissimilar cables are bundled over distance |
| Radiation | Above 30 MHz | Harmonic content of the fundamental |

### 2.6.3 Mitigations, in order of effectiveness

**Physical separation is the primary control and it is not optional.** The
electrosurgical source is located **outside the ward**, behind a shielded boundary,
which is why it is drawn outside the ward envelope in the floor plan. No amount of
filtering substitutes for distance.

**Passive filtering at the electrode.** Three cascaded single-pole low-pass stages at
100 kHz, 30 kHz and 1 kHz, each in its own shielded compartment to prevent leakage
between stages. These are **passive** rather than active filters precisely because an
active front end would be destroyed by the hundreds of volts present.

**Common-mode rejection.** An instrumentation amplifier with a right-leg-drive
amplifier returning inverted common-mode signal to the reference electrode, fed
through a series resistor greater than 330 kΩ so that drive current stays below
10 µA even in a single fault.

**Optical isolation** between the analogue front end and the digital processing
chain, to remove residual common-mode energy and prevent the monitor from
re-establishing an earth path through the patient.

**Adaptive cancellation.** Least-mean-squares adaptive filtering is preferred to a
fixed notch because the notches remain locked where the interference actually is.
It also has an incidental but real advantage in this jurisdiction: a filter designed
for 60 Hz needs no modification to work on a 50 Hz supply, whereas a fixed 60 Hz notch
on Indian mains leaves the fundamental inside the passband.

### 2.6.4 What the standards do not do for you

A point worth stating plainly, because it is routinely assumed otherwise:

> EMC standards specify performance levels but do not tell a designer or an installer
> how to achieve compliance.

Meeting an immunity test does not protect against a 40–50 V/m electrosurgical field at
one metre. **Formal EM zoning and specified separation distances are the design
controls**; the EMC test result is evidence that they are necessary, not a substitute
for them.

Electrosurgical smoke is a separate occupational hazard requiring evacuation at the
surgical field and is out of scope for this monitoring design, but it is noted because
the smoke evacuator's motor is a large switched inductive load that belongs on a
**separate supply circuit** and should be routed at least two metres from the data
trunk.

## 2.7 Electrical installation

Specified by **IEC 60364-7-710:2021**, which applies to electrical installations in
medical locations.

| Element | Requirement |
|---|---|
| Supply grouping | Each bed head is on a designated group. Group 2 (critical) supplies the monitoring outlets. |
| Medical IT system | An isolated, unearthed system with an isolating transformer, providing a first line of defence independent of the earth reference |
| Insulation monitoring | Continuous insulation monitoring to **IEC 61557-8**, with alarm to staff. A first insulation fault must be annunciated before a second develops a dangerous touch voltage |
| Equipotential bonding | A protective bonding conductor at every bed head, reducing touch potential during a first fault |
| Automatic disconnection | RCD selection appropriate to the medical group. Note that residual-current protection is constrained within a medical IT system |
| Essential supply | Changeover to a battery-supported safety supply for the critical group |

The five bonding studs marked EPS-01 to EPS-05 on the floor plan are the physical
realisation of this requirement, and each is recorded against its bed in the `beds`
table as `bonding_stud_id` so that the record can be traced to the installation
rather than to a drawing nobody maintains.

## 2.8 Environmental conditions

The ward operates within 10–35 °C and 10–90 % relative humidity. Equipment rated to
that envelope is specified, and the ward has no local heating, cooling or humidity
control beyond the building services — an assumption recorded because it constrains
equipment selection and would need revisiting in any ward with dedicated conditioning.
