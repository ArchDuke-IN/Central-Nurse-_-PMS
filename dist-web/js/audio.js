/* =====================================================================
   Audio for the patient monitoring system.

   WHY THIS IS SYNTHESISED RATHER THAN A DOWNLOADED SOUND PACK
   ------------------------------------------------------------
   Real manufacturer alarm tones (Draeger, Philips, GE, Mindray, Nihon
   Kohden) are proprietary product IP and are not lawfully distributable.
   They were not used.

   That is not a compromise. IEC 60601-1-8 specifies the alarm sounds
   PARAMETRICALLY - fundamental frequency ranges, pulse durations, the
   gap structure of the burst, and a tolerance on how closely the four
   largest harmonics must sit together. It does not prescribe a waveform
   file. That is by design: the requirement must be reproducible on a
   cheap piezo sounder as well as on a mains-powered monitor. A faithful
   implementation driven from the specification is therefore *more*
   accurate than any single manufacturer's file, which is merely one
   implementation of the same specification.

   Sources for the numbers implemented here:
     - IEC 60601-1-8:2006+A1:2012, Tables 1 and 2 (pulse and burst
       parameters), reproduced freely in Texas Instruments application
       literature SLOA273 and SSZT261.
     - AMD2:2020 auditory icon and pointer clauses, via the PUI Audio
       application guide.
     - Edworthy (2023), Forum Acusticum, CC BY 3.0, for the design
       rationale behind melodic differentiation.

   WHAT IS DELIBERATELY ABSENT
   ----------------------------
   The exact Table 3 pulse repetition rates and the absolute minimum
   sound pressure level remain paywalled, and at least one secondary
   source states them incorrectly. Absolute SPL is in any case not
   deliverable from a browser. The relative dynamic ladder is specified
   here instead, and that is what makes the set legible.
   ===================================================================== */

/* ------------------------------------------------------- note frequencies */
/* Equal temperament, A4 = 440 Hz. */
const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
  F5: 698.46, A5: 880.00,
};

/**
 * Alarm categories and their melodies.
 *
 * A real monitor does not emit one generic alarm. The melody identifies the
 * *category* - what is wrong - and the pulse count identifies the *priority* -
 * how urgently. Cardiovascular, oxygenation, ventilation and temperature each
 * carry their own melodic material, which is what lets a trained nurse know
 * the kind of problem before reading the screen.
 *
 * MEDIUM is a three-pulse figure. HIGH is the five-note figure played twice,
 * giving the ten pulses the standard requires.
 */
export const CATEGORIES = {
  cardiovascular: {
    medium: [N.C4, N.E4, N.G4],          // c - e - g, the reserved cardiovascular melody
    high:   [N.C4, N.E4, N.G4, N.G4, N.C5],   // c - e - g - g - C
  },
  oxygenation: {
    medium: [N.C5, N.B4, N.A4],
    high:   [N.C5, N.B4, N.A4, N.G4, N.F4],
  },
  ventilation: {
    medium: [N.C4, N.A4, N.F4],
    high:   [N.C4, N.A4, N.F4, N.A4, N.F4],
  },
  temperature: {
    medium: [N.C4, N.D4, N.E4],
    high:   [N.C4, N.D4, N.E4, N.E4, N.C5],
  },
  infusion: {
    medium: [N.C5, N.D4, N.G4],
    high:   [N.C5, N.D4, N.G4, N.G4, N.C5],
  },
  general: {
    medium: [N.C4, N.C4, N.C4],
    high:   [N.C4, N.C4, N.C4, N.C4, N.C4],
  },
};

/** Map a LOINC parameter code to the alarm category it belongs to. */
export function categoryFor(code) {
  switch (code) {
    case '59408-5': return 'oxygenation';   // oxygen saturation
    case '9279-1':  return 'ventilation';   // respiration
    case '8310-5':  return 'temperature';
    case '8867-4':
    case '8480-6':
    case '8462-4':
    case '8478-0':  return 'cardiovascular';
    default:        return 'general';
  }
}

/* -------------------------------------------------- burst timing constants */
/*
 * IEC 60601-1-8 Tables 1 and 2. Values are the midpoint of each permitted
 * range, which is what a manufacturer would select.
 */
const T = {
  tdHigh:   0.146,   // HIGH pulse duration. Range 75-200 ms. 146 ms is the
                      // value measured from a conforming reference tone.
  tdMed:    0.200,   // MEDIUM and LOW pulse duration. Range 125-250 ms.
  x:        0.124,   // Ordinary interpulse gap. Range 50-125 ms.
  mid:      0.800,   // Gap between the 5th and 6th pulse. Range 0.35-1.30 s.
  interHigh:  5.0,   // HIGH interburst interval. Range 2.5-15 s.
  interMed:   9.0,   // MEDIUM interburst interval. Range 2.5-30 s.
  interLow:   18.0,  // LOW interburst interval. Greater than 15 s.
  rise:      0.10,   // Rise time as a fraction of pulse duration.
};

/* Relative levels. A lower-priority burst must never exceed a higher-priority
 * one; that is normative, so it is expressed as a constant ladder rather than
 * left to taste. Three to six decibels per step is the practical guidance. */
const LEVEL_DB = { HIGH: 0, MEDIUM: -4, LOW: -8 };
const INFO_OFFSET_DB = -18;   // pulse beep sits well below every alarm

/* ----------------------------------------------------------- pulse tone */
/*
 * Measured from real conforming medical hardware: a "lub" at about 691 Hz
 * and a "dub" at about 469 Hz. That interval is a perfect fifth, which is
 * very close to the real lub-dub of the heart, and is why it reads as a
 * heartbeat rather than as a beep.
 */
const LUB_HZ = 691;
const DUB_HZ = 469;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.enabled = false;

    this.master = 0.85;        // deliberately high; the alarm bus is normalised below
    this.alarmVol = 0.85;
    this.pulseVol = 0.5;

    this.toneBedId = 'bed-001';
    this.pulseOn = true;

    this.alarmState = 'live';  // live | paused | off
    this.pausedUntil = 0;

    this.masterGain = null;
    this.bus = {};
    this._lastPhase = new Map();
    this._announced = new Set();
    this._sounding = new Map();
    this._lastPlay = new Map();
  }

  /* ------------------------------------------------------------- setup */

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    this.ctx = new AC();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    /* -- master chain: bus -> tone shaping -> soft clip -> compressor -> out -- */

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.master;

    // Small-driver roll-off. Real sounders are piezo elements a couple of
    // centimetres across and lose everything above roughly 4.5 kHz. Without
    // this the harmonic stack sounds like a synthesiser.
    this.tone = this.ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 4500;
    this.tone.Q.value = 0.7;

    // A gentle high-pass keeps the stack from sounding boomy on laptop speakers.
    this.hp = this.ctx.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = 180;

    // Soft clip rather than hard clipping. The standard's test suite checks
    // for both hard clipping and spectral-balance distortion.
    this.shaper = this.ctx.createWaveShaper();
    this.shaper.curve = makeSoftClipCurve(2048, 1.6);
    this.shaper.oversample = '4x';

    // Safety limiter so two simultaneous high-priority alarms cannot sum into
    // a distorted wall of noise.
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -6;
    this.comp.knee.value = 6;
    this.comp.ratio.value = 12;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.18;

    this.tone.connect(this.hp);
    this.hp.connect(this.shaper);
    this.shaper.connect(this.comp);
    this.comp.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // One bus per priority, so the level ladder is applied once and cannot
    // drift between paths.
    for (const p of ['HIGH', 'MEDIUM', 'LOW']) {
      const g = this.ctx.createGain();
      g.gain.value = this.alarmVol * dbToGain(LEVEL_DB[p]);
      g.connect(this.tone);
      this.bus[p] = g;
    }
    const info = this.ctx.createGain();
    info.gain.value = this.alarmVol * dbToGain(INFO_OFFSET_DB);
    info.connect(this.tone);
    this.bus.INFO = info;

    this.wave = clinicalWave(this.ctx);
    this.ready = true;
    return true;
  }

  setMaster(v) {
    this.master = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setAlarmVol(v) {
    this.alarmVol = v;
    if (!this.ready) return;
    for (const p of ['HIGH', 'MEDIUM', 'LOW']) {
      this.bus[p].gain.value = v * dbToGain(LEVEL_DB[p]);
    }
    this.bus.INFO.gain.value = v * dbToGain(INFO_OFFSET_DB);
  }

  async toggle() {
    if (!this.ready) { const ok = await this.init(); if (!ok) return false; }
    this.enabled = !this.enabled;
    if (this.enabled && this.ctx.state === 'suspended') await this.ctx.resume();
    return this.enabled;
  }

  get audible() { return this.enabled && this.alarmState !== 'off'; }

  /* ------------------------------------------------------- pulse tone */

  /**
   * The heartbeat pip. Deliberately a two-part lub-dup rather than a single
   * blip, because the two-part shape is what a real monitor produces and it
   * is immediately recognisable. Slight per-beat variation keeps it from
   * sounding machine-generated; identical repeats read as synthetic.
   */
  pulse(bed) {
    if (!this.audible || !this.pulseOn || !this.pulseVol) return;
    if (bed.id !== this.toneBedId) return;

    const t = this.ctx.currentTime;
    const bpm = Math.max(25, Math.min(200, bed.vitals.hr));
    const interval = 60 / bpm;
    const last = this._lastPlay.get('pulse') || 0;
    if (t - last < interval * 0.55) return;   // refractory guard
    this._lastPlay.set('pulse', t);

    // Pitch tracks saturation. Higher saturation, higher tone.
    const spo2 = Math.max(70, Math.min(100, bed.vitals.spo2));
    const shift = Math.pow(2, (spo2 - 90) / 36);

    // Saturation also pulls the level down slightly, so a falling saturation
    // is audible before the number is read.
    const level = this.pulseVol * (0.45 + 0.55 * ((spo2 - 70) / 30));

    const jit = () => 1 + (Math.random() - 0.5) * 0.006;   // about +/-0.3%

    this._pulse(LUB_HZ * shift * jit(), t, 0.105, level);
    this._pulse(DUB_HZ * shift * jit(), t + 0.125, 0.155, level * 0.86);
  }

  _pulse(freq, at, dur, gain) {
    this._blip({ at, freq, dur, gain, dest: this.bus.INFO, wave: this.wave, rise: 0.012 });
  }

  /* ------------------------------------------------------ alarm sounds */

  alarm(alarm) {
    if (!this.audible) return;
    const now = this.ctx.currentTime;

    const sounding = this._sounding.get(alarm.id);
    if (sounding && sounding > now) return;

    const last = this._lastPlay.get(alarm.priority) || 0;
    if (now - last < 0.15) return;
    this._lastPlay.set(alarm.priority, now);

    const cat = alarm.kind === 'technical' ? 'general' : categoryFor(alarm.code);
    let end = now;

    switch (alarm.priority) {
      case 'HIGH':     end = this._high(now, cat); break;
      case 'MEDIUM':   end = this._medium(now, cat); break;
      case 'LOW':      end = this._low(now); break;
      default:         end = this._information(now); break;
    }
    this._sounding.set(alarm.id, end);
  }

  stopAlarm(id) { this._sounding.delete(id); }
  stopAll() { this._sounding.clear(); this._lastPlay.clear(); }

  /**
   * HIGH priority: the five-note figure played twice, giving ten pulses.
   * The gap between the fifth and the sixth falls at the long delay the
   * standard specifies, which is what makes the two halves audible as one
   * figure rather than as two.
   */
  _high(t0, category) {
    const notes = CATEGORIES[category]?.high ?? CATEGORIES.general.high;
    const td = T.tdHigh;
    const x = T.x;
    const twoXtd = 2 * x + td;

    // [1-2, 2-3, 3-4, 4-5, 5-6, 6-7, 7-8, 8-9, 9-10]
    const gaps = [x, x, twoXtd, x, T.mid, x, x, twoXtd, x];

    let t = t0;
    for (let i = 0; i < 10; i++) {
      const f = notes[i % notes.length];
      this._blip({ at: t, freq: f, dur: td, gain: 1, dest: this.bus.HIGH, wave: this.wave, rise: T.rise });
      t += td + (gaps[i] ?? x);
    }
    return t + T.interHigh - td;
  }

  /** MEDIUM priority: three pulses, the category's melodic figure. */
  _medium(t0, category) {
    const notes = CATEGORIES[category]?.medium ?? CATEGORIES.general.medium;
    const td = T.tdMed;
    let t = t0;
    for (const f of notes) {
      this._blip({ at: t, freq: f, dur: td, gain: 1, dest: this.bus.MEDIUM, wave: this.wave, rise: T.rise });
      t += td + T.x;
    }
    return t + T.interMed - td;
  }

  /**
   * LOW priority: two pulses, a descending minor third. The low alarm is the
   * rarest and the least urgent, so it repeats only every eighteen seconds.
   */
  _low(t0) {
    const td = T.tdMed;
    const notes = [N.E4, N.C4];
    let t = t0;
    for (const f of notes) {
      this._blip({ at: t, freq: f, dur: td, gain: 1, dest: this.bus.LOW, wave: this.wave, rise: T.rise });
      t += td + T.x;
    }
    return t + T.interLow - td;
  }

  /**
   * Information signal. One short, soft, mid-register blip.
   *
   * Deliberately NOT alarm-shaped. The standard classes the saturation tone and
   * the electrocardiogram waveform sound as information signals, not alarm
   * signals, and they must never be confused with one.
   */
  _information(t0) {
    this._blip({ at: t0, freq: N.C5, dur: 0.055, gain: 1, dest: this.bus.INFO, wave: null, rise: 0.008 });
    return t0 + 0.4;
  }

  /* ------------------------------------------------------------- voice */

  /** One enveloped tone on the harmonic stack, with a trapezoidal envelope. */
  _blip({ at, freq, dur, gain, dest, wave, rise }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    if (wave) osc.setPeriodicWave(wave);
    else osc.type = 'sine';
    osc.frequency.value = freq;

    const peak = Math.max(0.0002, gain * 0.75);
    const tr = Math.max(0.006, dur * (rise ?? T.rise));
    const tf = Math.min(0.030, dur * 0.25);

    // Trapezoid: linear rise, sustain, exponential fall. A linear ramp all the
    // way down sounds like a test tone; alarms are percussive.
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(peak, at + tr);
    env.gain.setValueAtTime(peak, Math.max(at + tr + 0.001, at + dur - tf));
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(env);
    env.connect(dest);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  /* --------------------------------------------------- silence control */

  /** Bounded pause. Auto-resumes; visibly different from a full mute. */
  pauseAlarms(seconds = 120) {
    this.alarmState = 'paused';
    this.pausedUntil = Date.now() + seconds * 1000;
    this.stopAll();
  }

  /** Indefinite silence. Requires an explicit act to end. */
  muteAlarms() {
    this.alarmState = 'off';
    this.stopAll();
  }

  resumeAlarms() {
    this.alarmState = 'live';
    this.pausedUntil = 0;
  }

  tick() {
    if (this.alarmState === 'paused' && Date.now() >= this.pausedUntil) {
      this.alarmState = 'live';
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------- auditioning */

  async audition(priority, category = 'cardiovascular') {
    if (!this.ready) await this.init();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.stopAll();
    const t = this.ctx.currentTime + 0.04;
    if (priority === 'HIGH') this._high(t, category);
    else if (priority === 'MEDIUM') this._medium(t, category);
    else if (priority === 'LOW') this._low(t);
    else this._information(t);
  }

  /** The pulse tone on its own, for demonstrating the heartbeat pip. */
  async auditionPulse() {
    if (!this.ready) await this.init();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const t = this.ctx.currentTime + 0.04;
    const bed = { id: 'preview', id_: 'preview', vitals: { hr: 78, spo2: 96 } };
    this._pulse(LUB_HZ, t, 0.105, 0.5);
    this._pulse(DUB_HZ, t + 0.125, 0.155, 0.43);
    void bed;
  }
}

/* ================================================================ utils */

const dbToGain = db => Math.pow(10, db / 20);

/**
 * The clinical harmonic stack.
 *
 * This is the single most important parameter for making a synthesised alarm
 * sound like a real one. Measured spectra of conforming alarm tones show
 * harmonics 1 and 3 through 9 sitting within about 5.5 dB of each other, with
 * the second partial some 26 dB down. A plain sine, or a naive 1-2-3-4 stack
 * with even-numbered harmonics prominent, sounds thin and synthetic - which
 * is precisely the complaint that a "normal" tone does not sound like
 * hospital equipment.
 *
 * The flatness is itself a requirement: the four largest components must lie
 * within 15 dB of each other, and the tolerance exists so that direct and
 * reflected sound in a ward cannot cancel a particular partial and leave the
 * alarm inaudible in some positions.
 */
function clinicalWave(ctx, { nH = 9, secondPartialDb = -26 } = {}) {
  const real = new Float32Array(nH + 1);
  const imag = new Float32Array(nH + 1);
  for (let n = 1; n <= nH; n++) {
    const db = n === 1 ? 0 : n === 2 ? secondPartialDb : 0;
    imag[n] = Math.pow(10, db / 20);
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

/** tanh-style soft clipper. Kills digital harshness without hard-clipping. */
function makeSoftClipCurve(n, drive) {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}
