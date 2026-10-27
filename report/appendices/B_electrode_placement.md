# Appendix B — Electrode Placement Reference (Milestone M3)

Companion to `figures/m3_electrode_12lead.svg`. Covers the placement decisions the
figure illustrates and the limits of each configuration.

## B.1 Electrode types

| Type | Half-cell potential | Impedance | Motion artefact | Use |
|---|---|---|---|---|
| Disposable wet-gel Ag/AgCl | ≈ +0.22 V | Best, typically under 5 kΩ per junction after skin preparation | Lowest | **Default. The only type permitted in this system** |
| Dry electrode | Material-dependent; bare silver is +0.80 V and highly polarisable | Poor | High | Long-term wearable and home use only |
| Suction or cup electrode | ≈ +0.22 V | Poor transiently | Very high | Operating theatre only |
| Reusable limb clamp | Not Ag/AgCl; higher and less stable offset | Variable | High | Legacy. Not used |

**Mixing types or ages of electrode within one patient is prohibited.** The
half-cell offsets are common-mode and cancel only when the electrodes are chemically
identical. This is a stores constraint, not merely a procurement preference.

## B.2 Skin preparation

Intact stratum corneum presents roughly **50 kΩ/cm²**. Mild abrasion with a fine
abrasive reduces this below **5 kΩ/cm²** and is the single highest-value operator step
for artefact control — more effective than any filter in the signal chain.

| Step | Action |
|---|---|
| 1 | Position the patient supine, arms at the sides, limbs relaxed |
| 2 | Identify the ten sites and mark them |
| 3 | Clean each site with alcohol and allow to dry fully |
| 4 | Abrade each site lightly — about 20 strokes |
| 5 | Apply conductive gel and attach the electrode with no edge overhang |
| 6 | Confirm impedance is acceptable before connecting the trunk cable |

Alcohol must be allowed to evaporate. A wet site produces an electrode impedance
far higher than the abraded figure, which is a frequent cause of a "lead off" alarm
that resolves itself after a minute.

## B.3 Standard twelve-lead positions

| Electrode | Position |
|---|---|
| RA | Right arm, distal clavicle |
| LA | Left arm, distal clavicle |
| RL | Right leg, above the ankle. Ground reference |
| LL | Left leg, above the ankle |
| V1 | Fourth intercostal space, right sternal border |
| V2 | Fourth intercostal space, left sternal border |
| V3 | Midway between V2 and V4 |
| V4 | Fifth intercostal space, midclavicular line |
| V5 | Same level, anterior axillary line |
| V6 | Same level, midaxillary line |

## B.4 The derived leads

**Einthoven, bipolar.** The heart is modelled as a point source at the centre of an
equilateral triangle formed by the three limb electrodes, and the bipolar leads are
edge differences:

```
I   = LA − RA
II  = LL − RA
III = LL − LA          and  II = I + III  (Einthoven's law)
```

**Goldberger, augmented.** The equalising resistors are removed and the exploring
limb is disconnected, leaving a two-limb average:

```
aVR = RA − ½(LA + LL)
aVL = LA − ½(RA + LL)
aVF = LL − ½(RA + LA)
```

The nominal augmentation is 50 %, but the measured ratio varies substantially both
between individuals and between leads in the same individual. **V leads and aV leads
are not interchangeable**, and the augmentation should not be treated as an exact
constant in any analysis.

**Wilson, unipolar.** RA, LA and LL each connect through an equal 5 kΩ non-inductive
resistor to a summing node of near-zero potential, and each precordial lead is the
exploring potential minus that node:

```
Vx = V(x) − WCT
```

For the precordial leads the central terminal omits only the right leg, so **the right
leg is a fourth physical electrode** and true unipolar recording requires all ten
electrodes present, not seven.

**The right leg is not an earth.** It is an active reference driven by the
right-leg-drive amplifier, which inverts the common-mode signal and returns it to the
patient. This is why the patient reference floats with respect to earth, and it is
part of what prevents burns at the electrode sites when an electrosurgical unit is
active.

## B.5 Mason–Likar modification

Relocating the limb electrodes to the torso — RA and LA below the clavicles, RL and LL
on the anterior axillary line — suppresses myoelectric noise during exercise or
ambulatory recording. The precordial positions are unchanged.

**The claim that this produces a tracing essentially identical to distal placement is
not supported.** Measured differences include:

- a rightward shift of the mean QRS axis;
- significant reduction in R-wave amplitude in leads I and aVL;
- significant increase in R-wave amplitude in II, III and aVF;
- altered precordial R-wave amplitudes;
- **inferior Q waves that may be masked.**

The last point accounts for the high false-negative rate for inferior-wall ischaemia on
exercise testing, and the inability to predict infarct location reliably.

> **Consequence for this system: a serial recording made with relocated electrodes
> cannot be compared with one made in standard placement, and the modification used
> must be recorded on the recording itself.**

Relocation is not used in this ward design; it is documented here because the hub
supports on-demand diagnostic recording and a clinician may request it.

## B.6 Five-lead at the bedside

The bedside configuration is **five-lead**: RA, LA, RL, LL and one precordial
electrode, conventionally V5.

| Configuration | Electrodes | Leads | Ward role |
|---|---|---|---|
| Three-lead | 3 | I, II, III | Minimum viable; rhythm only |
| **Five-lead** | **5** | **I, II, III, V, V5** | **Selected. Adds ischaemia detection** |
| Twelve-lead | 10 | 12 | Diagnostic, on demand from the hub |

Five-lead is selected because it adds one electrode and delivers the single largest
gain in continuous monitoring: detection of ischaemic change, conventionally through
V5. Twelve-lead acquisition is a diagnostic procedure requiring ten electrodes, a
technician and a settled patient, and it is governed by the diagnostic
electrocardiography standard rather than the monitoring standard — which is precisely
why the monitoring standard's scope excludes cardiac monitors.

## B.7 Cable and connector discipline

| Element | Requirement |
|---|---|
| Trunk cable | 2.0–3.6 m. **Proprietary and not interchangeable between vendors.** |
| Lead wires | Chest approximately 74 cm, limb approximately 130 cm |
| Labelling | **AHA and IEC colour conventions are both still in service. The convention in use must be stated on the order, or the wrong leadwires will be delivered.** |
| Shielding | Electrically shielded throughout, entering a shielded compartment at the monitor |
| Defibrillation proofing | **Cables, not only electrodes.** A manufacturer recall covering tens of thousands of trunk cables worldwide was issued because certain sets reduced the energy delivered to the patient during defibrillation. |

## B.8 Applied-part classification

All ten electrodes, the patient cable and the lead wires form the **Type CF
defibrillator-proof applied part** of this system. This is the strictest of the three
applied-part categories because the surface of the chest is, in a patient with an
intracardiac catheter or surgical access, effectively direct cardiac application, and
because currents of the order of tens of microamps at mains frequency through the
heart can compromise cardiac function.

Section 3.2 explains why the electrocardiogram channel is isolated as its own domain
rather than sharing a reference with the other parameters, and section 5.4 shows the
corresponding leakage-current constraint enforced in the relational schema.
