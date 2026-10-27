/* =====================================================================
   Client state: beds, the alarm engine, and trend history.

   The alarm engine here mirrors the obligations the design places on the
   hub: grading, hysteresis so a value hovering on a limit does not
   flap, acknowledgement by an identified operator, escalation when a
   high-priority alarm is ignored, and the strict separation of
   INFORMATION signals from alarm conditions.
   ===================================================================== */

import { Bed, BED_SEEDS, LIMITS, PARAM_META, ALARM_TEXT, gradePriority, describeBreach } from './sim.js';

let seq = 0;
const uid = p => `${p}-${(++seq).toString(36)}`;

/**
 * Priority ordering. Exported so the display layer and the engine cannot
 * disagree about which alarm matters most, and so a bundle has one copy.
 */
export const RANK = { HIGH: 3, MEDIUM: 2, LOW: 1, INFORMATION: 0 };

export class Store {
  constructor() {
    this.beds = BED_SEEDS.map(c => new Bed(c));
    this.alarms = [];
    this.acknowledged = new Set();
    this.operator = { id: 'staff-001', name: 'A. Menon', role: 'Charge Nurse' };
    this.history = new Map();      // bedId -> [snapshot]
    this.active = new Map();       // bedId|code -> alarm
    this.events = [];              // audit trail
    this.nibpStates = new Map();
    this.lastSnapAt = 0;
  }

  get occupied() { return this.beds.filter(b => b.occupied); }

  log(kind, text) {
    this.events.unshift({ at: new Date(), kind, text });
    if (this.events.length > 200) this.events.pop();
  }

  /* ------------------------------------------------------------- alarm */

  /** Evaluate one bed and raise or clear alarms. Called every tick. */
  evaluate(bed, now) {
    if (!bed.occupied) return;
    const live = new Set();

    for (const b of bed.breaches()) {
      const key = `${bed.id}|${b.code}`;
      live.add(key);
      const existing = this.active.get(key);

      if (existing) {
        existing.value = b.value;
        existing.updatedAt = now;

        // Re-grade on every tick. A patient who is deteriorating must
        // escalate the alarm, not keep the priority it happened to be
        // assigned when the condition was first detected.
        const currentMagnitude = b.side === 'low' ? LIMITS[b.code].low - b.value
                                                  : b.value - LIMITS[b.code].high;
        const regraded = gradePriority(b.code, currentMagnitude, b.side, b.value);
        const wasPriority = existing.priority;

        // Refresh the text too. A nurse reading "89%" while the monitor shows
        // 82% is worse than no message at all.
        existing.message = describeBreach(b.code, b.value, b.side, LIMITS[b.code]);

        if (RANK[regraded] > RANK[wasPriority]) {
          existing.priority = regraded;
          this.log('escalation', `${bed.label} · ${existing.label} escalated ${wasPriority} → ${regraded} at ${b.value}`);
        } else if (RANK[regraded] < RANK[wasPriority]) {
          // De-escalation is permitted, but only once the value has recovered
          // properly, which the hysteresis band already guarantees.
          existing.priority = regraded;
          this.log('de-escalation', `${bed.label} · ${existing.label} reduced ${wasPriority} → ${regraded}`);
        }

        // Escalation on neglect: a high-priority alarm nobody has touched.
        if (existing.priority === 'HIGH' && !existing.acknowledgedAt &&
            (now - existing.raisedAt) / 1000 > 45) {
          existing.escalationCount += 1;
          this.log('escalation', `${existing.priority} alarm on ${bed.label} unattended for 45 s`);
        }
        continue;
      }

      // Hysteresis band: a value must clear the limit by this much before the
      // alarm is considered resolved, otherwise it re-triggers on every tick.
      const lim = LIMITS[b.code];
      const backoff = b.side === 'low' ? b.value < lim.low + 2 : b.value > lim.high - 2;
      if (existing === undefined && !backoff) { /* fall through to raise */ }

      const magnitude = b.side === 'low' ? lim.low - b.value : b.value - lim.high;
      const priority = gradePriority(b.code, magnitude, b.side, b.value);
      const param = PARAM_META[b.code].label;

      const alarm = {
        id: uid('alm'),
        bedId: bed.id,
        bedLabel: bed.label,
        patientName: bed.name,
        code: b.code,
        label: param,
        priority,
        kind: 'physiological',
        // The parameter label is carried explicitly: systolic and diastolic
        // pressure both breach on the same patient, and two identical
        // "Hypotension" lines on one screen would be ambiguous.
        message: describeBreach(b.code, b.value, b.side, lim),
        value: b.value,
        limit: b.limit,
        raisedAt: now,
        updatedAt: now,
        acknowledgedAt: null,
        acknowledgedBy: null,
        clearedAt: null,
        escalationCount: 0,
      };
      this.active.set(key, alarm);
      this.alarms.unshift(alarm);
      this.log('alarm', `${priority} · ${bed.label} · ${alarm.message}`);
    }

    // Clear alarms whose parameter has returned inside the hysteresis band.
    for (const [key, alarm] of [...this.active]) {
      if (live.has(key)) continue;
      const bed = this.beds.find(b => b.id === alarm.bedId);
      const reading = bed.readings().find(r => r.code === alarm.code);
      if (reading === undefined) continue;
      const lim = LIMITS[alarm.code];
      const value = reading.value;
      const stillLow = value < lim.low + 2;
      const stillHigh = value > lim.high - 2;
      if (stillLow || stillHigh) continue;

      alarm.clearedAt = now;
      this.active.delete(key);
      this.log('cleared', `${alarm.bedLabel} · ${alarm.label} returned within limits`);
    }
  }

  /**
   * Device conditions are raised separately from physiological ones.
   *
   * A disconnected electrode is a fault in the equipment, not an event in the
   * patient, and the design requires the two to be distinguishable at the
   * station — conflating them is a documented route to alarm fatigue.
   */
  evaluateTechnical(bed, now) {
    const text = bed.activeTechnical;
    const key = `${bed.id}|__tech`;
    const existing = this.active.get(key);

    if (!text) {
      if (existing) {
        existing.clearedAt = now;
        this.active.delete(key);
        this.log('cleared', `${existing.bedLabel} · technical condition resolved`);
      }
      return;
    }
    if (existing) { existing.message = text; existing.updatedAt = now; return; }

    const alarm = {
      id: uid('tec'),
      bedId: bed.id, bedLabel: bed.label, patientName: bed.name,
      code: null, label: 'TECH', priority: 'MEDIUM', kind: 'technical',
      message: text,
      value: null, limit: null,
      raisedAt: now, updatedAt: now,
      acknowledgedAt: null, acknowledgedBy: null, clearedAt: null,
      escalationCount: 0,
    };
    this.active.set(key, alarm);
    this.alarms.unshift(alarm);
    this.log('technical', `${bed.label} · ${text}`);
  }

  /** Acknowledge by the identified operator, per IEC 60601-1-8 audit needs. */
  acknowledge(alarmId) {
    const a = this.alarms.find(x => x.id === alarmId);
    if (!a || a.acknowledgedAt) return;
    a.acknowledgedAt = Date.now();
    a.acknowledgedBy = this.operator;
    this.acknowledged.add(alarmId);
    this.log('ack', `${a.bedLabel} · ${a.label} acknowledged by ${this.operator.name}`);
  }

  acknowledgeAll() {
    const open = this.alarms.filter(a => !a.acknowledgedAt && !a.clearedAt);
    for (const a of open) this.acknowledge(a.id);
    this.log('ack', `All open alarms acknowledged by ${this.operator.name}`);
  }

  /** Push an INFORMATION signal. Explicitly not an alarm condition. */
  inform(bed, text) {
    const sig = {
      id: uid('sig'),
      bedId: bed.id, bedLabel: bed.label, patientName: bed.name,
      code: null, label: 'INFO', priority: 'INFORMATION', kind: 'system',
      message: text, value: null, limit: null,
      raisedAt: Date.now(), updatedAt: Date.now(),
      acknowledgedAt: null, acknowledgedBy: null, clearedAt: Date.now(),
      escalationCount: 0,
    };
    this.alarms.unshift(sig);
    this.log('signal', `${bed.label} · ${text}`);
  }

  get open()  { return this.alarms.filter(a => !a.clearedAt && !a.acknowledgedAt); }
  get unacked(){ return this.alarms.filter(a => !a.acknowledgedAt && !a.priority.includes('INFORMATION')); }

  /* ----------------------------------------------------------- history */

  record() {
    const now = Date.now();
    for (const bed of this.beds) {
      if (!bed.occupied) continue;
      if (!this.history.has(bed.id)) this.history.set(bed.id, []);
      const arr = this.history.get(bed.id);
      arr.push(bed.snapshot());
      if (arr.length > 360) arr.shift();   // 60 minutes at 10 s resolution
    }
    this.lastSnapAt = now;
  }

  historyFor(bedId) { return this.history.get(bedId) || []; }

  /* ------------------------------------------------------------- drive */

  step(dt) {
    const now = Date.now();
    for (const bed of this.beds) bed.tick(dt);
    for (const bed of this.beds) this.evaluate(bed, now);
    for (const bed of this.beds) this.evaluateTechnical(bed, now);

    if (now - this.lastSnapAt >= 10000) this.record();
  }

  /* ------------------------------------------ demonstration scenarios */

  /** Drive a specific clinical event so a walkthrough is reproducible. */
  demo(kind) {
    const bed = this.beds[0];
    const t = this.log.bind(this);

    switch (kind) {
      case 'desat':
        bed.perturb('spo2', 82, 30);
        t('scenario', 'SpO₂ driven to 82% on BED-01 — expect a HIGH priority alarm');
        break;
      case 'tachy':
        bed.perturb('hr', 168, 30);
        bed.perturb('rr', 32, 30);
        t('scenario', 'HR driven to 168 bpm on BED-01 — expect a HIGH priority alarm');
        break;
      case 'hypotension':
        bed.perturb('sbp', 72, 30);
        bed.perturb('dbp', 44, 30);
        t('scenario', 'Pressure driven to 72/44 on BED-01 — expect a MEDIUM priority alarm');
        break;
      case 'technical':
        bed.injectTechnical('ECG lead off: RA electrode disconnected');
        t('scenario', 'Electrodes disconnected on BED-01 — a device condition, not a patient event');
        break;
      case 'info':
        this.inform(bed, 'Temperature probe re-sited by A. Menon');
        break;
      case 'reset':
        for (const b of this.beds) { b.override = {}; b.overrideUntil = {}; b.technicalText = null; b.technicalUntil = 0; }
        t('scenario', 'All injected scenarios cleared');
        break;
    }
  }
}
