/* =====================================================================
   Physiological signal simulation.

   Everything here is deterministic given a seed, so a demonstration
   replays identically every time. The waveforms are synthesised from
   summed Gaussian components rather than random noise, because a
   nurse reading this screen will recognise a wrong-looking QRS
   immediately and that is precisely the skill the system is meant
   to support.
   ===================================================================== */

/** Deterministic PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (t, mu, sigma) => Math.exp(-((t - mu) ** 2) / (2 * sigma * sigma));

/* ------------------------------------------------------------------ ECG */

/**
 * One normalised PQRST complex over a phase of 0..1, scaled by 1 mV.
 * Component amplitudes and widths are within normal adult ranges:
 * P 0.10-0.25 mV, R 0.5-2.0 mV, T 0.1-0.5 mV.
 */
function qrs(phase) {
  let v = 0;
  v += 0.15 * gauss(phase, 0.16, 0.022);   // P
  v += -0.08 * gauss(phase, 0.28, 0.006);  // Q
  v += 1.00 * gauss(phase, 0.30, 0.008);   // R
  v += -0.22 * gauss(phase, 0.33, 0.009);  // S
  v += 0.30 * gauss(phase, 0.46, 0.035);   // T
  // Slow ST-segment drift, the reason a 0.05 Hz high-pass exists at all.
  v += 0.012 * Math.sin(phase * Math.PI * 2);
  return v;
}

/* -------------------------------------------------- plethysmograph (PPG) */

/** Arterial pulse with a dicrotic notch: fast upstroke, decay, notch, second decay. */
function pleth(phase) {
  const systole = Math.exp(-((phase - 0.16) ** 2) / (2 * 0.055 * 0.055)) * 1.0;
  const notch   = 0.32 * Math.exp(-((phase - 0.40) ** 2) / (2 * 0.045 * 0.045));
  const decay   = 0.55 * Math.exp(-phase / 0.16) * (phase > 0.12 ? 1 : 0);
  return Math.max(0, systole + notch + decay);
}

/* ------------------------------------------------------------ respiratory */

function respiration(phase) {
  return Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
}

/* ===================================================================== */
/*  Bed model                                                            */
/* ===================================================================== */

export const BED_SEEDS = [
  { id: 'bed-001', label: 'BED-01', mrn: 'MR2026001', name: 'Anil Sharma',   sex: 'M', age: 47, dx: 'Post-operative monitoring',  seed: 101, profile: 'stable' },
  { id: 'bed-002', label: 'BED-02', mrn: null,         name: null,           sex: null, age: null, dx: null, seed: 202, profile: 'free' },
  { id: 'bed-003', label: 'BED-03', mrn: 'MR2026002', name: 'Meera Iyer',     sex: 'F', age: 41, dx: 'Acute asthma, exacerbation', seed: 303, profile: 'desat' },
  { id: 'bed-004', label: 'BED-04', mrn: 'MR2026003', name: 'Joseph D’Souza', sex: 'M', age: 68, dx: 'Community-acquired pneumonia', seed: 404, profile: 'sepsis' },
  { id: 'bed-005', label: 'BED-05', mrn: null,         name: null,           sex: null, age: null, dx: null, seed: 505, profile: 'oos' },
];

/* Default alarm limits. Clinical practice defaults, not values prescribed by
   IEC 60601-1-8 — the standard grades conditions, it does not set limits. */
export const LIMITS = {
  '8867-4':  { low: 50,  high: 120, unit: '/min' },
  '59408-5': { low: 90,  high: 100, unit: '%' },
  '8480-6':  { low: 90,  high: 160, unit: 'mmHg' },
  '8462-4':  { low: 50,  high: 100, unit: 'mmHg' },
  '8478-0':  { low: 65,  high: 110, unit: 'mmHg' },
  '8310-5':  { low: 36.0,high: 38.0,unit: '°C' },
  '9279-1':  { low: 8,   high: 30,  unit: '/min' },
};

export const PARAM_META = {
  '8867-4':  { key: 'hr',    label: 'HR',   unit: '/min',      colour: 'var(--ecg)',  digits: 0 },
  '59408-5': { key: 'spo2',  label: 'SpO₂', unit: '%',         colour: 'var(--spo2)', digits: 0 },
  '8480-6':  { key: 'sbp',   label: 'SYS',  unit: 'mmHg',      colour: 'var(--nibp)', digits: 0 },
  '8462-4':  { key: 'dbp',   label: 'DIA',  unit: 'mmHg',      colour: 'var(--nibp)', digits: 0 },
  '8478-0':  { key: 'map',   label: 'MAP',  unit: 'mmHg',      colour: 'var(--nibp)', digits: 0 },
  '8310-5':  { key: 'temp',  label: 'TEMP', unit: '°C',        colour: 'var(--temp)', digits: 1 },
  '9279-1':  { key: 'rr',    label: 'RR',   unit: '/min',      colour: 'var(--resp)', digits: 0 },
};

export class Bed {
  constructor(cfg) {
    Object.assign(this, cfg);
    this.operationalStatus = cfg.profile === 'oos' ? 'X' : cfg.profile === 'free' ? 'U' : 'O';
    this.r = rng(cfg.seed);
    this.base = { hr: 78, spo2: 97, sbp: 122, dbp: 76, temp: 36.9, rr: 15 };
    this.vitals = { ...this.base };
    this.phase = { ecg: 0, pleth: 0, resp: this.r() };
    this.history = [];
    this.nibpPhase = 'idle';
    this.nibpTimer = 8 + this.r() * 40;
    this.leadsOff = false;
    this.spo2SignalLost = false;
    this.override = {};
    this.overrideUntil = {};
    this.technicalText = null;
    this.technicalUntil = 0;
  }

  get occupied() { return this.operationalStatus === 'O'; }

  /** One simulation tick. dt is elapsed seconds. */
  tick(dt) {
    if (!this.occupied) return;
    const r = this.r;

    // --- targets drift toward the profile's clinical picture -------------
    const target = { hr: 78, spo2: 97, sbp: 122, dbp: 76, temp: 36.9, rr: 15 };
    if (this.profile === 'desat')  Object.assign(target, { spo2: 86, hr: 112, rr: 26, sbp: 118, dbp: 72 });
    if (this.profile === 'sepsis') Object.assign(target, { hr: 118, rr: 26, sbp: 94,  dbp: 54, temp: 38.6, spo2: 93 });

    // Demonstration overrides win over the profile, and expire on their own.
    for (const key of Object.keys(this.override)) {
      this.overrideUntil[key] -= dt;
      if (this.overrideUntil[key] <= 0) { delete this.override[key]; delete this.overrideUntil[key]; continue; }
      target[key] = this.override[key];
    }
    if (this.technicalUntil > 0) this.technicalUntil -= dt;

    // Per-parameter smoothing so numbers wander rather than jump.
    // An injected override converges quickly; natural drift stays gentle.
    const ease = (key, rate, jitter) => {
      const forced = this.override[key] !== undefined;
      const r = forced ? rate * 6 : rate;
      this.vitals[key] += (target[key] - this.vitals[key]) * r * dt + (this.r() - 0.5) * jitter * dt;
    };
    ease('hr',    0.25, 1.2);
    ease('spo2',  0.30, 0.25);
    ease('sbp',   0.15, 1.6);
    ease('dbp',   0.15, 1.2);
    ease('rr',    0.20, 0.5);
    ease('temp',  0.06, 0.02);

    // Derived value, never measured. (SBP + 2*DBP)/3, recorded with provenance.
    this.vitals.map = Math.round((this.vitals.sbp + 2 * this.vitals.dbp) / 3);

    // --- waveform phase -------------------------------------------------
    // Advanced only in sample(). Advancing here as well would run the ECG and
    // plethysmograph at double speed, because the display samples the same
    // phase the model advances.
    const bpm = Math.max(30, Math.min(180, this.vitals.hr));
    this.currentBpm = bpm;

    // --- NIBP cycle ------------------------------------------------------
    this.nibpTimer -= dt;
    if (this.nibpTimer <= 0) {
      if (this.nibpPhase === 'idle') { this.nibpPhase = 'inflate'; this.nibpTimer = 4; }
      else if (this.nibpPhase === 'inflate') { this.nibpPhase = 'deflate'; this.nibpTimer = 12; }
      else {
        this.nibpPhase = 'idle';
        this.nibpTimer = 60 + r() * 90;   // 1–2.5 minute cycle
      }
    }
  }

  /**
   * Advance one trace by dt seconds and return its current amplitude.
   *
   * Sampling is time-based rather than frame-based: a monitor sweep must run
   * at a fixed paper speed (25 mm/s here) whatever the display refresh rate,
   * or the trace silently means different things on different hardware.
   */
  sample(kind, dt) {
    if (kind === 'resp') {
      this.phase.resp = (this.phase.resp + (this.vitals.rr / 60) * dt) % 1;
      return respiration(this.phase.resp);
    }
    const bpm = Math.max(30, Math.min(180, this.vitals.hr));
    if (kind === 'ecg') {
      this.phase.ecg = (this.phase.ecg + (bpm / 60) * dt) % 1;
      return qrs(this.phase.ecg);
    }
    this.phase.pleth = (this.phase.pleth + (bpm / 60) * dt) % 1;
    return pleth(this.phase.pleth);
  }

  /** Temporarily drive a parameter, for demonstration scenarios. */
  perturb(key, value, seconds = 30) {
    this.override[key] = value;
    this.overrideUntil[key] = seconds;
  }

  /** Raise a device-condition fault, distinct from a physiological event. */
  injectTechnical(text, seconds = 45) {
    this.technicalText = text;
    this.technicalUntil = seconds;
  }

  get activeTechnical() {
    return this.technicalText && this.technicalUntil > 0 ? this.technicalText : null;
  }

  /** Current value plus LOINC code for each parameter. */
  readings() {
    const v = this.vitals;
    return [
      { code: '8867-4',  value: Math.round(v.hr) },
      { code: '59408-5', value: Math.round(v.spo2) },
      { code: '8480-6',  value: Math.round(v.sbp) },
      { code: '8462-4',  value: Math.round(v.dbp) },
      { code: '8478-0',  value: v.map },
      { code: '8310-5',  value: Math.round(v.temp * 10) / 10 },
      { code: '9279-1',  value: Math.round(v.rr) },
    ];
  }

  /** Grade each reading against its limit set. Returns breaches only. */
  breaches() {
    const out = [];
    for (const { code, value } of this.readings()) {
      const lim = LIMITS[code];
      if (!lim) continue;
      if (value < lim.low)  out.push({ code, value, side: 'low',  limit: lim.low });
      if (value > lim.high) out.push({ code, value, side: 'high', limit: lim.high });
    }
    return out;
  }

  snapshot() {
    return {
      t: Date.now(),
      hr: Math.round(this.vitals.hr),
      spo2: Math.round(this.vitals.spo2),
      sbp: Math.round(this.vitals.sbp),
      dbp: Math.round(this.vitals.dbp),
      map: this.vitals.map,
      temp: Math.round(this.vitals.temp * 10) / 10,
      rr: Math.round(this.vitals.rr),
    };
  }
}

/* --------------------------------------------------------------- alarms */

/** Clinical descriptors for a breach. Kept free of the parameter name so
 *  the composed message does not read "SpO2 — SpO2 low". */
export const ALARM_TEXT = {
  '59408-5': { hi: 'Supra-normal saturation', lo: 'Desaturation' },
  '8867-4':  { hi: 'Tachycardia',             lo: 'Bradycardia' },
  '8480-6':  { hi: 'Hypertension',            lo: 'Hypotension' },
  '8462-4':  { hi: 'Hypertension',            lo: 'Hypotension' },
  '8478-0':  { hi: 'Above target',            lo: 'Hypoperfusion' },
  '8310-5':  { hi: 'Pyrexia',                 lo: 'Hypothermia' },
  '9279-1':  { hi: 'Tachypnoea',              lo: 'Bradypnoea' },
};

/** Compose the text a nurse reads. */
export function describeBreach(code, value, side, limits) {
  const m = PARAM_META[code];
  const descriptor = ALARM_TEXT[code]?.[side === 'low' ? 'lo' : 'hi'] ?? `${side === 'low' ? 'Below' : 'Above'} limit`;
  return `${m.label}: ${descriptor} — ${value}${m.unit} (limit ${limits.low}–${limits.high})`;
}

/**
 * Excursion thresholds that raise MEDIUM and HIGH, per parameter, in that
 * parameter's own units.
 *
 * This table exists because a single global threshold cannot work across
 * mixed units, and trying it produces clinically wrong answers. An earlier
 * version used one MEDIUM rule of "12 beyond the limit" for everything, which
 * silently graded a saturation of 86% and a temperature of 38.5°C as LOW —
 * the same bucket as a heart rate of 63 — because neither excursion reaches 12
 * in its own units. A temperature excursion of 12 °C is not reachable at all,
 * so pyrexia could never be MEDIUM by that route however high it rose.
 *
 * Excursion distance is therefore not comparable between parameters, and the
 * grading has to be expressed per parameter. The bands below are the
 * implementation of the risk matrix in report §7.4.2 — grade by the potential
 * result of failing to respond — mapped onto each parameter's excursion:
 *
 *   - SpO₂ is graded aggressively because hypoxaemia kills quickly. Falling
 *     below 85% is severe hypoxaemia and is HIGH at any excursion.
 *   - Blood pressure grades on absolute value as well as excursion, because
 *     a systolic of 70 is urgent even against a permissive limit.
 *   - Heart rate uses the conventional bands.
 *   - Temperature moves slowly and harms slowly, so it grades the least.
 *
 * Values are clinical judgement consistent with the limits in LIMITS above,
 * not quoted from a paywalled clause; see report §4.9 for what is and is not
 * verifiable.
 */
const EXCURSION = {
  // code: { medium, high, highLow }  — the low column is the threshold for
  // excursions in the alarming direction, which is the one that matters
  // clinically for a downward trend.
  '59408-5': { medium: 3, high: 5 },              // SpO2 %        — hypoxaemia
  '8867-4':  { medium: 10, high: 30 },             // HR /min
  '8480-6':  { medium: 15, high: 30 },             // systolic mmHg
  '8462-4':  { medium: 10, high: 25 },             // diastolic mmHg
  '8478-0':  { medium: 6, high: 15 },              // MAP mmHg — hypoperfusion
  '8310-5':  { medium: 0.7, high: 1.5 },           // temp °C — slow harm
  '9279-1':  { medium: 8, high: 15 },              // RR /min
};

/**
 * Absolute values that are HIGH regardless of excursion. A permissive limit
 * must not make an already-critical value look acceptable: a ward that has
 * widened the SpO2 low limit to 88% should still escalate a reading of 84%.
 */
const ABSOLUTE_HIGH = {
  '59408-5': { low: 85 },      // severe hypoxaemia
  '8867-4':  { low: 40, high: 180 },
  '8480-6':  { low: 70, high: 220 },
  '8462-4':  { low: 40, high: 130 },
  '8478-0':  { low: 50, high: 140 },
};

/**
 * Grade a limit breach to an IEC 60601-1-8 alarm priority.
 *
 * `magnitude` is the unsigned distance beyond the limit, `side` says which
 * way, and `value` is the reading itself — needed for the absolute-value
 * rules, since excursion alone cannot express them. Keeping the direction
 * explicit avoids the classic sign bug where a downward excursion silently
 * never meets an upward threshold.
 */
export function gradePriority(code, magnitude, side, value) {
  const ex = magnitude;

  // A value critical in its own right outranks any excursion measure.
  const abs = ABSOLUTE_HIGH[code];
  if (abs !== undefined && typeof value === 'number') {
    if (side === 'low' && abs.low !== undefined && value <= abs.low) return 'HIGH';
    if (side === 'high' && abs.high !== undefined && value >= abs.high) return 'HIGH';
  }

  const band = EXCURSION[code];
  if (band === undefined) {
    // Unrecognised code. Grade on excursion alone rather than defaulting to
    // LOW, which would under-report an unknown parameter as unremarkable.
    return ex >= 12 ? 'MEDIUM' : 'LOW';
  }

  if (ex >= band.high) return 'HIGH';
  if (ex >= band.medium) return 'MEDIUM';
  return 'LOW';
}
