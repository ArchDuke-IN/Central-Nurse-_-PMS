/* =====================================================================
   Rendering and application shell.
   ===================================================================== */

import { Store, RANK } from './store.js';
import { PARAM_META, LIMITS } from './sim.js';
import { AudioEngine } from './audio.js';
import { SCOPE_DATA } from './scope-data.js';

const store = new Store();
const audio = new AudioEngine();
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------- waveform sweep buffer */

/**
 * Each live trace owns an offscreen canvas that is shifted one pixel left
 * per frame and drawn into at the right edge. That produces the wiping
 * sweep a clinician expects from a monitor; a scrolling redraw does not
 * look like the equipment it is emulating.
 */
class Sweep {
  constructor(w = 620, h = 34) {
    this.cv = document.createElement('canvas');
    this.cv.width = w; this.cv.height = h;
    this.ctx = this.cv.getContext('2d', { willReadFrequently: false });
    this.ctx.fillStyle = '#0a0f15';
    this.ctx.fillRect(0, 0, w, h);
    this.acc = 0;
    this.filled = 0;
    this.lastY = h / 2;
  }

  /** Map an amplitude, nominally 0..1, to a y coordinate. */
  y(v) {
    const c = this.cv.height;
    return c - v * c * 0.80 - c * 0.10;
  }

  push(value, colour) {
    const { ctx, cv } = this;
    const x = cv.width - 1;

    // Shift the existing trace one pixel left.
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(cv, -1, 0);
    ctx.globalCompositeOperation = 'source-over';

    // Draw only the segment joining the previous sample to this one.
    // Extending each column down to the canvas floor floods the buffer into
    // a solid block and destroys the trace within about a second.
    const yPos = this.y(value);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 1, this.lastY);
    ctx.lineTo(x, yPos);
    ctx.stroke();

    this.lastY = yPos;
    if (this.filled < cv.width) this.filled++;
  }

  /** Flat baseline, for a bed with no patient attached. */
  idle(colour = '#1e2833') {
    const { ctx, cv } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cv.height / 2);
    ctx.lineTo(cv.width, cv.height / 2);
    ctx.stroke();
  }

  reset() {
    this.ctx.fillStyle = '#0a0f15';
    this.ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    this.filled = 0;
    this.lastY = this.cv.height / 2;
  }
}

/* ------------------------------------------------------------ bed tiles */

const sweeps = new Map();

function bedTile(bed) {
  // Ensure each live trace has its sweep buffer before the tile is rendered.
  if (!sweeps.has(bed.id)) sweeps.set(bed.id, {});
  for (const k of ['ecg', 'pleth', 'resp']) {
    if (!sweeps.get(bed.id)[k]) sweeps.get(bed.id)[k] = new Sweep();
  }

  const readings = bed.readings();
  const breachSet = new Set(bed.breaches().map(b => b.code));

  // Show the most severe open alarm for this bed, never merely the newest.
  // A tile that displays MEDIUM while a HIGH alarm is active for the same
  // patient is exactly the mis-prioritisation this design has to prevent.
  const topAlarm = store.open
    .filter(a => a.bedId === bed.id && a.priority !== 'INFORMATION')
    .sort((a, b) => RANK[b.priority] - RANK[a.priority])[0] || null;

  const chip = bed.operationalStatus === 'O' ? 'chip--occ'
             : bed.operationalStatus === 'X' ? 'chip--oos' : 'chip--free';
  const chipText = { O: 'Occupied', U: 'Unoccupied', X: 'Out of service' }[bed.operationalStatus];

  const nums = readings.map(r => {
    const m = PARAM_META[r.code];
    const breach = breachSet.has(r.code);
    const limit = LIMITS[r.code];
    // The unit sits on its own line rather than inline. Seven parameters
    // across a two-up tile leaves roughly 60 px per column, and "106/min"
    // set inline at that width clips to "106/ni".
    return `<div class="num" data-p="${m.key}" data-breach="${breach}">
      <div class="num__v">${bed.occupied ? r.value : '--'}</div>
      <div class="num__u">${m.unit}</div>
      <div class="num__k">${m.label}<span class="num__lim">${bed.occupied
        ? (breach ? 'BREACH' : `${limit.low}–${limit.high}`) : ''}</span></div>
    </div>`;
  }).join('');

  const wave = (k, tag, colour, label) => `
    <div class="wave">
      <span class="wave__tag" style="color:${colour}">${tag}</span>
      <canvas data-bed="${bed.id}" data-kind="${k}" role="img"
              aria-label="${label}" width="620" height="34"></canvas>
    </div>`;

  const who = bed.occupied ? `${bed.name}, ${bed.sex}${bed.age}` : 'no patient';

  return `
  <article class="bed" data-status="${bed.operationalStatus}" data-alarm="${topAlarm ? topAlarm.priority : ''}" data-bedid="${bed.id}"
           aria-label="Bed ${bed.label}, ${who}">
    <header class="bed__hdr">
      <span class="bed__id">${bed.label}</span>
      ${bed.occupied
        ? `<span class="bed__pt">${bed.name}</span><span class="bed__meta">${bed.mrn} · ${bed.sex}${bed.age}</span>`
        : `<span class="bed__pt" style="color:var(--fg-faint)">No patient assigned</span>`}
      <span class="bed__spacer"></span>
      <span class="chip ${chip}">${chipText}</span>
    </header>

    <div class="waves">
      ${wave('ecg', 'II', 'var(--ecg)', `Lead II electrocardiogram, ${bed.occupied ? Math.round(bed.vitals.hr) + ' beats per minute' : 'no patient'}`)}
      ${wave('pleth', 'PLETH', 'var(--spo2)', `Plethysmogram, oxygen saturation ${bed.occupied ? Math.round(bed.vitals.spo2) + ' percent' : 'unavailable'}`)}
      ${wave('resp', 'RESP', 'var(--resp)', `Respiration, ${bed.occupied ? Math.round(bed.vitals.rr) + ' breaths per minute' : 'unavailable'}`)}
    </div>

    <div class="nums">${nums}</div>

    ${topAlarm ? `
      <div class="alarmbar" data-p="${topAlarm.priority}" role="alert">
        <span>${topAlarm.priority}</span>
        <span>${topAlarm.message}</span>
        <button data-ack="${topAlarm.id}">Acknowledge</button>
      </div>` : ''}
  </article>`;
}

function renderDashboard() {
  $('#beds').innerHTML = store.beds.map(bedTile).join('');
  bindWaves();
  renderRail();
}

/* ------------------------------------------------------------ alarm rail */

function renderRail() {
  // The list a nurse reads is ordered by severity first and recency second.
  // Sorting by time alone would bury a HIGH alarm under a stream of LOWs.
  const list = [...store.alarms]
    .sort((a, b) => {
      const rank = RANK[b.priority] - RANK[a.priority];
      if (rank !== 0) return rank;
      const acked = (a.acknowledgedAt ? 1 : 0) - (b.acknowledgedAt ? 1 : 0);
      if (acked !== 0) return acked;
      return b.raisedAt - a.raisedAt;
    })
    .slice(0, 40);

  $('#railList').innerHTML = list.map(a => `
    <div class="alm" data-p="${a.priority}" data-ack="${a.acknowledgedAt ? 'true' : 'false'}" data-alid="${a.id}">
      <div class="alm__top">
        <span class="alm__bed">${a.bedLabel}</span>
        <span class="alm__pri">${a.priority}</span>
        <span class="alm__t">${new Date(a.raisedAt).toLocaleTimeString('en-GB')}</span>
      </div>
      <div class="alm__msg">${a.message}</div>
      <div class="alm__kind">${a.kind} · ${a.label}${a.escalationCount ? ` · escalated ×${a.escalationCount}` : ''}${a.acknowledgedBy ? ` · ack ${a.acknowledgedBy.name}` : ''}</div>
      ${!a.acknowledgedAt && a.priority !== 'INFORMATION'
        ? `<button class="alm__ack" data-ack="${a.id}">Acknowledge as ${store.operator.name}</button>` : ''}
    </div>`).join('');

  const open = store.open.filter(a => a.priority !== 'INFORMATION').length;
  $('#railCount').textContent = open === 0 ? 'all clear' : `${open} open`;
  $('#badge').textContent = open;
  $('#badge').style.display = open ? '' : 'none';

  // Empty state, so an empty rail reads as intentional rather than broken.
  $('#railEmpty').style.display = list.length ? 'none' : '';

  // The narrow-screen toggle must carry the count. If it does not, an alarm
  // can be entirely off-screen with no indication that it exists.
  const tb = $('#railToggleBadge');
  if (tb) {
    tb.textContent = String(open);
    tb.dataset.zero = String(open === 0);
  }
}

/* ----------------------------------------------------------- trend view */

function sparkPath(values, w, h, min, max, pad = 6) {
  if (!values.length) return '';
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = (hi - lo) || 1;
  return values.map((v, i) => {
    const x = pad + (i / (values.length - 1 || 1)) * (w - pad * 2);
    const y = h - pad - ((v - lo) / span) * (h - pad * 2);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join('');
}

function trendChart(bedId, key, label, colour, unit, limits) {
  const rows = store.historyFor(bedId);
  const W = 1000, H = 190;
  const vals = rows.map(r => r[key]);
  const lo = limits ? Math.min(limits.low, ...vals) : undefined;
  const hi = limits ? Math.max(limits.high, ...vals) : undefined;

  const grid = [0.25, 0.5, 0.75].map(f =>
    `<line x1="6" y1="${(H * f).toFixed(0)}" x2="${W - 6}" y2="${(H * f).toFixed(0)}" stroke="#18202a" stroke-width="1"/>`).join('');

  const band = limits
    ? `<rect x="6" y="${(H - 6 - ((limits.high - (lo ?? 0)) / ((hi ?? 1) - (lo ?? 0))) * (H - 12)).toFixed(1)}"
             width="${W - 12}" height="${(((limits.high - limits.low) / ((hi ?? 1) - (lo ?? 0))) * (H - 12)).toFixed(1)}"
             fill="${colour}" opacity="0.06"/>` : '';

  return `
  <div class="card">
    <div class="card__hd">${label} <span style="color:var(--fg-faint);text-transform:none;letter-spacing:0">· ${bedId}</span></div>
    <div class="card__bd">
      <svg class="trend" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        ${grid}${band}
        ${limits ? `<line x1="6" y1="${(H - 6 - ((limits.high - (lo ?? 0)) / ((hi ?? 1) - (lo ?? 0))) * (H - 12)).toFixed(1)}" x2="${W - 6}" y2="${(H - 6 - ((limits.high - (lo ?? 0)) / ((hi ?? 1) - (lo ?? 0))) * (H - 12)).toFixed(1)}" stroke="${colour}" stroke-width="1" stroke-dasharray="4 4" opacity=".55"/>` : ''}
        ${limits ? `<line x1="6" y1="${(H - 6 - ((limits.low - (lo ?? 0)) / ((hi ?? 1) - (lo ?? 0))) * (H - 12)).toFixed(1)}" x2="${W - 6}" y2="${(H - 6 - ((limits.low - (lo ?? 0)) / ((hi ?? 1) - (lo ?? 0))) * (H - 12)).toFixed(1)}" stroke="${colour}" stroke-width="1" stroke-dasharray="4 4" opacity=".55"/>` : ''}
        <path d="${sparkPath(vals, W, H, lo, hi)}" fill="none" stroke="${colour}" stroke-width="1.8"/>
      </svg>
      <div class="legend">
        <span><b style="background:${colour}"></b>${label} (${unit})</span>
        ${limits ? `<span style="color:var(--fg-faint)">dashed = alarm limits ${limits.low}–${limits.high}</span>` : ''}
        <span style="margin-left:auto;color:var(--fg-faint)">${vals.length} samples · 60 min window</span>
      </div>
    </div>
  </div>`;
}

function renderTrends() {
  const bed = store.occupied[0];
  $('#trends').innerHTML = `
    <div class="grid2">
      ${trendChart(bed.label, 'hr',   'Heart rate',   'var(--ecg)',  '/min', LIMITS['8867-4'])}
      ${trendChart(bed.label, 'spo2', 'Oxygen saturation', 'var(--spo2)', '%', LIMITS['59408-5'])}
      ${trendChart(bed.label, 'sbp',  'Systolic pressure', 'var(--nibp)', 'mmHg', LIMITS['8480-6'])}
      ${trendChart(bed.label, 'temp', 'Body temperature', 'var(--temp)', '°C', LIMITS['8310-5'])}
    </div>`;
}

/* ----------------------------------------------------------- ward view */

function renderWard() {
  const W = 980, H = 470;
  const bedBox = (b, x, y) => {
    const alarm = store.open.find(a => a.bedId === b.id);
    const stroke = b.operationalStatus === 'X' ? '#ff3b3b'
                 : alarm ? `var(--${alarm.priority.toLowerCase()})` : '#1e2833';
    const fill = b.operationalStatus === 'O' ? '#151d27' : '#0f151d';
    const readings = b.readings();
    const get = c => readings.find(r => r.code === c)?.value;
    return `
    <g>
      <rect x="${x}" y="${y}" width="150" height="128" rx="7"
            fill="${fill}" stroke="${stroke}" stroke-width="${alarm ? 2 : 1.2}"/>
      <text x="${x + 12}" y="${y + 22}" fill="#d7e0ea" font-size="12" font-weight="700">${b.label}</text>
      <text x="${x + 138}" y="${y + 22}" fill="${stroke}" font-size="9.5" text-anchor="end" font-weight="700">
        ${b.operationalStatus === 'O' ? 'OCCUPIED' : b.operationalStatus === 'X' ? 'OUT OF SERVICE' : 'FREE'}
      </text>
      <text x="${x + 12}" y="${y + 38}" fill="#8b9aab" font-size="10">${b.name || 'No patient'}</text>
      ${b.occupied ? `
      <text x="${x + 12}" y="${y + 64}" fill="var(--ecg)" font-size="15" font-weight="700">${get('8867-4')}<tspan font-size="9" fill="#5a6875"> bpm</tspan></text>
      <text x="${x + 84}" y="${y + 64}" fill="var(--spo2)" font-size="15" font-weight="700">${get('59408-5')}<tspan font-size="9" fill="#5a6875"> %</tspan></text>
      <text x="${x + 12}" y="${y + 88}" fill="var(--nibp)" font-size="13" font-weight="700">${get('8480-6')}/${get('8462-4')}<tspan font-size="9" fill="#5a6875"> mmHg</tspan></text>
      <text x="${x + 12}" y="${y + 108}" fill="var(--temp)" font-size="13" font-weight="700">${get('8310-5')}<tspan font-size="9" fill="#5a6875"> °C</tspan></text>
      <text x="${x + 84}" y="${y + 108}" fill="var(--resp)" font-size="13" font-weight="700">${get('9279-1')}<tspan font-size="9" fill="#5a6875"> /min</tspan></text>`
      : `<text x="${x + 12}" y="${y + 70}" fill="#3a4654" font-size="11">Bed reserved, outlets live</text>`}
      ${alarm ? `<rect x="${x}" y="${y + 118}" width="150" height="10" rx="3" fill="${stroke}" opacity=".85"/>` : ''}
    </g>`;
  };

  $('#ward').innerHTML = `
  <div class="card">
    <div class="card__hd">Ward ICU-A · 5 beds · plan view</div>
    <div class="card__bd">
      <svg class="wardmap" viewBox="0 0 ${W} ${H}">
        <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="#0a0f15" stroke="#1e2833" stroke-width="2" rx="4"/>

        <rect x="26" y="26" width="150" height="128" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="5 4" rx="6"/>
        <rect x="196" y="26" width="150" height="128" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="5 4" rx="6"/>
        <rect x="366" y="26" width="150" height="128" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="5 4" rx="6"/>
        <text x="26" y="20" fill="#b45309" font-size="9" font-weight="700">PATIENT SAFETY ZONE</text>

        ${bedBox(store.beds[0], 26, 40)}
        ${bedBox(store.beds[1], 196, 40)}
        ${bedBox(store.beds[2], 366, 40)}
        ${bedBox(store.beds[3], 196, 190)}
        ${bedBox(store.beds[4], 366, 190)}

        <rect x="26" y="190" width="150" height="128" rx="7" fill="#0d1117" stroke="#0369a1" stroke-width="1.4"/>
        <text x="36" y="212" fill="#8b9aab" font-size="10" font-weight="700">CLEAN UTILITY</text>
        <text x="36" y="232" fill="#5a6875" font-size="9.5">Consumables · PPE</text>
        <text x="36" y="250" fill="#5a6875" font-size="9.5">No data cabling</text>
        <text x="36" y="290" fill="#5a6875" font-size="9.5">Reorder alerts feed</text>
        <text x="36" y="304" fill="#5a6875" font-size="9.5">the HMS stores system</text>

        <rect x="536" y="40" width="200" height="278" rx="7" fill="#0d1a14" stroke="#047857" stroke-width="1.6"/>
        <text x="548" y="62" fill="#35e07a" font-size="11.5" font-weight="700">CENTRAL NURSE STATION</text>
        <text x="548" y="82" fill="#5a6875" font-size="9.5">Sightline to all five beds</text>
        ${[['VIEW STATION', '5 beds · trends · alarm list'], ['HUB SERVER', 'RAID 1 · 1 kVA UPS'], ['MANAGED SWITCH', 'dedicated VLAN only']]
          .map(([t, s], i) => `
          <rect x="548" y="${96 + i * 72}" width="176" height="60" rx="4" fill="#0a0f15" stroke="#1e2833"/>
          <text x="558" y="${116 + i * 72}" fill="#8b9aab" font-size="10" font-weight="700">${t}</text>
          <text x="558" y="${132 + i * 72}" fill="#5a6875" font-size="9">${s}</text>`).join('')}

        <rect x="756" y="40" width="204" height="128" rx="7" fill="#1a1206" stroke="#a16207" stroke-width="1.4"/>
        <text x="768" y="62" fill="#ffb03a" font-size="10.5" font-weight="700">MEDICAL IT SUPPLY</text>
        <text x="768" y="82" fill="#8b9aab" font-size="9.5">Isolating transformer</text>
        <text x="768" y="98" fill="#8b9aab" font-size="9.5">Insulation monitoring</text>
        <text x="768" y="114" fill="#5a6875" font-size="9">IEC 61557-8</text>
        <text x="768" y="136" fill="#5a6875" font-size="9">Equipotential bonding</text>
        <text x="768" y="152" fill="#5a6875" font-size="9">stud at every bed head</text>

        <rect x="756" y="190" width="204" height="128" rx="7" fill="#1a0d0d" stroke="#b91c1c" stroke-width="1.4" stroke-dasharray="6 4"/>
        <text x="768" y="212" fill="#ff6b6b" font-size="10.5" font-weight="700">EM ZONE</text>
        <text x="768" y="232" fill="#8b9aab" font-size="9.5">Electrosurgical source sits</text>
        <text x="768" y="246" fill="#8b9aab" font-size="9.5">outside the ward envelope.</text>
        <text x="768" y="266" fill="#5a6875" font-size="9">40–50 V/m at 1 m</text>
        <text x="768" y="282" fill="#5a6875" font-size="9">Separation is the primary</text>
        <text x="768" y="296" fill="#5a6875" font-size="9">control, not filtering.</text>
        <text x="768" y="312" fill="#5a6875" font-size="9">Shielded segregated data trunk</text>

        <path d="M 640 336 L 640 372 L 101 372 L 101 172" stroke="#7c3aed" stroke-width="3.5" fill="none"/>
        <path d="M 640 336 L 640 372 L 271 372 L 271 172" stroke="#7c3aed" stroke-width="3.5" fill="none"/>
        <path d="M 640 336 L 640 372 L 441 372 L 441 172" stroke="#7c3aed" stroke-width="3.5" fill="none"/>
        <path d="M 640 336 L 640 372 L 271 372 L 271 322" stroke="#7c3aed" stroke-width="3.5" fill="none"/>
        <path d="M 640 336 L 640 372 L 441 372 L 441 322" stroke="#7c3aed" stroke-width="3.5" fill="none"/>
        <text x="540" y="390" fill="#a78bfa" font-size="9.5" font-weight="700">SEGREGATED SHIELDED DATA TRUNK</text>

        <rect x="26" y="410" width="934" height="36" fill="#0d1117" stroke="#1e2833"/>
        <text x="38" y="433" fill="#5a6875" font-size="9.5">Corridor · 1.8 m clear width · bed extraction without turning</text>
        <text x="948" y="433" fill="#5a6875" font-size="9.5" text-anchor="end">9.6 m × 7.2 m internal · 69.1 m² over 5 beds</text>
      </svg>
    </div>
  </div>`;
}

/* ------------------------------------------------------------ standards */

function renderStandards() {
  const rows = [
    ['IEC 60601-1', '2005+A1:2012+A2:2020 (Ed. 3.2)', 'General requirements; basic safety and essential performance'],
    ['IEC 60601-1-2', '2014+A1:2020 (Ed. 4.1)', 'EMC. Environment tiers — professional healthcare facility declared'],
    ['IEC 60601-1-8', '2006+A1:2012+A2:2020 (Ed. 2.2)', 'Alarm systems. Governs the distributed alarm system'],
    ['IEC 80601-2-49', '2018+A1:2024 (Ed. 1.1)', 'Multifunction patient monitors — primary particular standard'],
    ['IEC 60601-2-27', '2011 (Ed. 3.0)', 'ECG monitoring. Not 60601-2-25, which covers diagnostic reports'],
    ['IEC 80601-2-30', '2018 (Ed. 2.0)', 'Automated sphygmomanometers. Renumbered from 60601-2-30'],
    ['ISO 80601-2-61', '2026 (Ed. 3.0)', 'Pulse oximetry. Excludes remote slave displays — the nurse station'],
    ['ISO 80601-2-56', '2017+A1:2018 (Ed. 2)', 'Clinical thermometers'],
    ['IEC 62304', '2006+A1:2015 (Ed. 1.1)', 'Software lifecycle. Hub and alarm engine are class C'],
    ['IEC 62366-1', '2015+A1:2020 (Ed. 1.1)', 'Usability engineering for the five-patient display'],
    ['ISO 14971', '2019', 'Risk management'],
    ['IEC 60364-7-710', '2021 (Ed. 2.0)', 'Medical-location electrical installation'],
    ['IEC 60601-2-2', '2017+A1:2023 (Ed. 6.1)', 'HF surgical equipment — the EMI source, not a PMS requirement'],
  ];
  $('#standards').innerHTML = `
  <div class="card">
    <div class="card__hd">Standards register <span style="color:var(--fg-faint);text-transform:none">— verified current at 19 Oct 2026</span></div>
    <div class="card__bd" style="padding:0">
      <table>
        <thead><tr><th style="width:170px">Standard</th><th style="width:250px">Edition</th><th>Role in this design</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td><code>${r[0]}</code></td><td class="mono">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
      </table>
    </div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card__hd">Deviations applied deliberately</div>
      <div class="card__bd">
        <dl class="kv">
          <dt>60601-2-25 → 60601-2-27</dt><dd>The diagnostic ECG standard explicitly excludes cardiac monitors.</dd>
          <dt>60601-2-30 → 80601-2-30</dt><dd>The 60601 number no longer exists.</dd>
          <dt>80601-2-49 added</dt><dd>Absent from the brief; the most relevant particular standard.</dd>
          <dt>60601-1-11 excluded</dt><dd>Triggered by home-healthcare use. A ward is not that.</dd>
          <dt>"De-health"</dt><dd>No such standard exists. Read as digital health or de-identification.</dd>
        </dl>
      </div>
    </div>
    <div class="card">
      <div class="card__hd">Alarm obligations discharged by this build</div>
      <div class="card__bd">
        <dl class="kv">
          <dt>Grading</dt><dd>Four-value priority set, IEC 60601-1-8 Table 1</dd>
          <dt>Hysteresis</dt><dd>Deadband prevents limit-flapping re-alarms</dd>
          <dt>Escalation</dt><dd>High-priority alarm unattended &gt; 45 s escalates</dd>
          <dt>Attribution</dt><dd>Acknowledgement records the identified operator</dd>
          <dt>Information signals</dt><dd>Generated, but never routed as alarms</dd>
          <dt>Latency</dt><dd>Budget stated in report §4.4</dd>
        </dl>
      </div>
    </div>
  </div>`;
}

/* ----------------------------------------------------------------- scope */

async function renderScope() {
  const host = $('#scope');
  try {
    // Imported as a module rather than fetched: a fetch of a sibling file is
    // blocked under the file:// origin, which would silently break the
    // standalone build. Generated by "npm run scope:write".
    const data = SCOPE_DATA;

    const summary = `
    <div class="grid3">
      ${[['Goals', data.goalSummary], ['Milestones', data.milestoneSummary], ['Phases', data.phaseSummary]]
        .map(([label, s]) => `
        <div class="card"><div class="card__hd">${label}</div>
          <div class="card__bd">
            <div style="font-size:28px;font-weight:700;font-family:var(--mono);
                        color:${s.missing ? 'var(--high)' : 'var(--ok)'}">${s.satisfied}<span style="font-size:15px;color:var(--fg-faint)">/${s.total}</span></div>
            <div style="font-size:11px;color:var(--fg-dim);margin-top:4px">${s.missing ? `${s.missing} unsatisfied` : 'all satisfied'}</div>
            <div class="bar"><i style="width:${(s.satisfied / s.total * 100).toFixed(0)}%;background:${s.missing ? 'var(--high)' : 'var(--ok)'}"></i></div>
          </div>
        </div>`).join('')}
    </div>`;

    const table = (rows, cols) => `
    <div class="card"><div class="card__bd" style="padding:0">
      <table>
        <thead><tr>${cols.map(c => `<th${c.w ? ` style="width:${c.w}"` : ''}>${c.h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.cells.map((cell, i) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div></div>`;

    host.innerHTML = summary
      + table(data.goals.map(g => ({ cells: [
          `<span class="mono">${g.id}</span>`, g.goal, g.evidence.map(e => `<div><code>${e.file}</code>${e.note ? ` <span style="color:var(--fg-faint)">${e.note}</span>` : ''}</div>`).join(''),
          `<span class="pill pill--${g.ok ? 'ok' : 'no'}">${g.ok ? 'satisfied' : 'gap'}</span>`] })),
        [{ h: 'Goal', w: '56px' }, { h: 'Objective' }, { h: 'Evidence' }, { h: 'Status', w: '110px' }])
      + table(data.milestones.map(m => ({ cells: [
          `<span class="mono">${m.id}</span>`, m.name, m.deliverable,
          m.evidence.map(e => `<div><code>${e.file}</code></div>`).join('') || '<span style="color:var(--fg-faint)">—</span>',
          `<span class="pill pill--${m.ok ? 'ok' : 'no'}">${m.ok ? 'satisfied' : 'gap'}</span>`] })),
        [{ h: 'ID', w: '56px' }, { h: 'Milestone' }, { h: 'Deliverable', w: '260px' }, { h: 'Evidence' }, { h: 'Status', w: '110px' }]);
  } catch (e) {
    host.innerHTML = `<div class="card"><div class="card__hd">Scope coverage</div>
      <div class="card__bd" style="color:var(--fg-dim)">Run <code>node tools/scope-audit.mjs</code> to generate <code>frontend/js/scope.json</code>.</div></div>`;
  }
}

/* ------------------------------------------------------------- audio UI */

function renderAudioState() {
  const state = !audio.enabled ? 'off' : audio.alarmState;
  const el = $('#audioState');
  const label = { live: 'live', paused: 'paused', off: audio.enabled ? 'silenced' : 'off' }[state];
  el.dataset.state = state;
  el.textContent = label;

  const btn = $('#audioToggle');
  btn.dataset.on = String(audio.enabled);
  btn.textContent = audio.enabled ? 'Audio on' : 'Enable audio';

  const paused = audio.alarmState === 'paused';
  $('#audioPause').textContent = paused
    ? `Resume (${Math.max(0, Math.round((audio.pausedUntil - Date.now()) / 1000))}s)`
    : 'Pause 2 min';
  $('#audioPause').classList.toggle('muted', !audio.enabled);
  $('#audioOff').classList.toggle('muted', !audio.enabled);
}

function wireAudio() {
  $('#audioToggle').addEventListener('click', async () => {
    // Must be a user gesture: browsers refuse to start an AudioContext otherwise.
    const on = await audio.toggle();
    if (on) audio.audition('MEDIUM');   // confirm it works
    renderAudioState();
  });

  $('#audioVol').addEventListener('input', e => {
    // The alarm bus is the loudest thing the station produces; the control is
    // a level trim, not the only stage of gain.
    settings.master = Number(e.target.value) / 100;
    audio.setMaster(settings.master);
    saveSettings();
  });

  $('#pulseVol').addEventListener('input', e => {
    settings.pulse = Number(e.target.value) / 100;
    audio.pulseVol = settings.pulse;
    saveSettings();
  });

  $('#toneBed').addEventListener('change', e => {
    settings.toneBed = e.target.value;
    audio.toneBedId = settings.toneBed === 'none' ? null : settings.toneBed;
    audio.pulseOn = settings.toneBed !== 'none';
    saveSettings();
  });

  $('#auditionCat').addEventListener('change', e => {
    settings.category = e.target.value;
    saveSettings();
  });

  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-audition]');
    if (a) {
      await audio.audition(a.dataset.audition, settings.category);
      return;
    }
    if (e.target.id === 'auditionPulse') await audio.auditionPulse();
  });

  $('#audioPause').addEventListener('click', () => {
    if (!audio.enabled) return;
    if (audio.alarmState === 'paused') audio.resumeAlarms();
    else audio.pauseAlarms(120);
    renderAudioState();
  });

  $('#audioOff').addEventListener('click', () => {
    if (!audio.enabled) return;
    audio.muteAlarms();
    renderAudioState();
  });

  renderAudioState();
}

/** Announce newly raised alarms, and stop sounds for resolved ones. */
function syncAlarmAudio() {
  const live = new Set();

  for (const a of store.alarms) {
    live.add(a.id);
    if (audio._announced.has(a.id)) continue;
    audio._announced.add(a.id);
    if (!a.clearedAt) {
      audio.alarm(a);
      if (a.priority !== 'INFORMATION') announce(a);
    }
  }

  for (const id of [...audio._announced]) {
    if (!live.has(id)) {
      audio._announced.delete(id);
      audio.stopAlarm(id);
    }
  }
}

/** Fire the pulse pip when the electrocardiogram phase wraps (the R-wave). */
function syncPulseTone() {
  if (!audio.enabled) return;
  for (const bed of store.beds) {
    if (!bed.occupied) continue;
    const last = audio._lastPhase.get(bed.id);
    const now = bed.phase.ecg;
    if (last !== undefined && now < last) audio.pulse(bed);
    audio._lastPhase.set(bed.id, now);
  }
}

/* -------------------------------------------------- settings persistence */

const SETTINGS_KEY = 'pms.settings.v1';

const DEFAULTS = {
  view: 'dashboard',
  master: 0.85,
  pulse: 0.45,
  toneBed: 'bed-001',
  category: 'cardiovascular',
  railOpen: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    // Private browsing, disabled storage, or corrupt value. Defaults are fine.
    return { ...DEFAULTS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* storage unavailable; the session still works, just not remembered */ }
}

let settings = loadSettings();

function applySettings() {
  audio.setMaster(settings.master);
  audio.pulseVol = settings.pulse;
  audio.toneBedId = settings.toneBed === 'none' ? null : settings.toneBed;
  audio.pulseOn = settings.toneBed !== 'none';
  const v = $('#audioVol'); if (v) v.value = String(Math.round(settings.master * 100));
  const p = $('#pulseVol'); if (p) p.value = String(Math.round(settings.pulse * 100));
  const t = $('#toneBed'); if (t) t.value = settings.toneBed;
  const c = $('#auditionCat'); if (c) c.value = settings.category;
}

/* ------------------------------------------------------- live announcing */

/**
 * Announce newly raised alarms to assistive technology.
 *
 * A canvas trace means nothing to a screen reader, so without this a nurse
 * using assistive technology would receive no notification of an alarm
 * condition at all. Assertive because an alarm must interrupt.
 */
let announcedCount = 0;
function announce(alarm) {
  const live = $('#live');
  if (!live) return;
  live.textContent = `${alarm.priority} priority alarm, ${alarm.bedLabel}, ${alarm.message}`;
  announcedCount++;
}

/* ------------------------------------------------------------ audit view */

function renderAudit() {
  const events = store.events;
  const alarms = store.alarms;

  const counts = alarms.reduce((a, x) => (a[x.priority] = (a[x.priority] || 0) + 1, a), {});
  const acked = alarms.filter(a => a.acknowledgedAt);
  const escalated = alarms.filter(a => a.escalationCount > 0);

  $('#audit').innerHTML = `
  <div class="grid3">
    <div class="card"><div class="card__hd">Alarm record</div><div class="card__bd">
      <div style="font-size:26px;font-weight:700;font-family:var(--mono)">${alarms.length}</div>
      <div style="font-size:11px;color:var(--fg-dim)">${acked.length} acknowledged · ${escalated.length} escalated</div>
      <div style="margin-top:10px;font-size:11px;color:var(--fg-dim);line-height:1.7">
        ${Object.entries(counts).map(([k, v]) => `<span class="pill pill--${k === 'HIGH' ? 'no' : k === 'MEDIUM' ? 'part' : 'ok'}">${k} ${v}</span>`).join(' ')}
      </div>
    </div></div>

    <div class="card"><div class="card__hd">Alarm latency</div><div class="card__bd">
      <div style="font-size:11px;color:var(--fg-dim);line-height:1.75">
        Budget in report §4.4:<br>
        sensor to detection <b>0.5–1.0 s</b><br>
        bedside generation <b>≤ 0.2 s</b><br>
        network transport <b>≤ 0.1 s</b><br>
        hub annunciation <b>≤ 0.3 s</b><br>
        <b style="color:var(--fg)">remote annunciation total 1.5–2.5 s</b>
      </div>
    </div></div>

    <div class="card"><div class="card__hd">Operator</div><div class="card__bd">
      <div style="font-size:14px;font-weight:600">${store.operator.name}</div>
      <div style="font-size:11px;color:var(--fg-dim)">${store.operator.role} · ${store.operator.id}</div>
      <div style="font-size:11px;color:var(--fg-faint);margin-top:8px;line-height:1.6">
        Every acknowledgement is attributed. IEC 60601-1-8 requires a
        tamper-evident record of alarm events.
      </div>
    </div></div>
  </div>

  <div class="card">
    <div class="card__hd">Event trail <span style="color:var(--fg-faint);text-transform:none;letter-spacing:0">— ${events.length} entries</span></div>
    <div class="card__bd" style="padding:0">
      ${events.length ? `<table>
        <thead><tr><th style="width:88px">Time</th><th style="width:110px">Event</th><th>Detail</th></tr></thead>
        <tbody>${events.map(e => `<tr>
          <td class="mono">${e.at.toLocaleTimeString('en-GB')}</td>
          <td><span class="pill pill--${e.kind === 'alarm' ? 'no' : e.kind === 'escalation' ? 'part' : 'ok'}">${e.kind}</span></td>
          <td>${e.text}</td></tr>`).join('')}</tbody>
      </table>` : '<div style="padding:18px;color:var(--fg-faint);font-size:12px">No events recorded yet.</div>'}
    </div>
  </div>

  <div class="card">
    <div class="card__hd">Alarm log <span style="color:var(--fg-faint);text-transform:none;letter-spacing:0">— full record including resolved conditions</span></div>
    <div class="card__bd" style="padding:0">
      ${alarms.length ? `<table>
        <thead><tr><th style="width:88px">Raised</th><th style="width:74px">Bed</th><th style="width:96px">Priority</th>
          <th style="width:96px">Kind</th><th>Message</th><th style="width:150px">Acknowledged by</th><th style="width:96px">State</th></tr></thead>
        <tbody>${alarms.map(a => `<tr>
          <td class="mono">${new Date(a.raisedAt).toLocaleTimeString('en-GB')}</td>
          <td class="mono">${a.bedLabel}</td>
          <td><span class="pill pill--${a.priority === 'HIGH' ? 'no' : a.priority === 'MEDIUM' ? 'part' : 'ok'}">${a.priority}</span></td>
          <td>${a.kind}</td>
          <td>${a.message}</td>
          <td>${a.acknowledgedBy ? a.acknowledgedBy.name : '<span style="color:var(--fg-faint)">—</span>'}</td>
          <td>${a.clearedAt ? 'cleared' : a.acknowledgedAt ? 'acknowledged' : 'open'}</td>
        </tr>`).join('')}</tbody>
      </table>` : '<div style="padding:18px;color:var(--fg-faint);font-size:12px">No alarms recorded yet.</div>'}
    </div>
  </div>`;
}

/* ------------------------------------------------------------ animation */

function bindWaves() {
  for (const cv of $$('.waves canvas')) {
    const bed = store.beds.find(b => b.id === cv.dataset.bed);
    const set = sweeps.get(cv.dataset.bed);
    const sw = set && set[cv.dataset.kind];
    if (!sw) continue;

    // An unoccupied bed shows a flat baseline, not a stale trace from
    // whoever was there before. Leaving the old trace on screen would be
    // exactly the frozen-reading failure the design has to avoid.
    if (!bed || !bed.occupied) { sw.reset(); sw.idle(); }

    const ctx = cv.getContext('2d');
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(sw.cv, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    // The ECG gets a measurement grid, as a real monitor does. Drawn on top of
    // the trace with 'destination-over' so it sits behind the signal.
    if (cv.dataset.kind === 'ecg' && bed && bed.occupied) {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#0a0f15';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = '#12211b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < cv.width; x += 25) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, cv.height); }
      for (let y = 0; y < cv.height; y += 8) { ctx.moveTo(0, y + .5); ctx.lineTo(cv.width, y + .5); }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

/* Sweep speed, in pixels per second. 62 px/s across a 620 px canvas gives a
   10-second visible window, matching a 25 mm/s monitor sweep. */
const SWEEP_HZ = 62;

function paintSweeps(dt) {
  const step = 1 / SWEEP_HZ;
  for (const bed of store.beds) {
    if (!bed.occupied) continue;
    const set = sweeps.get(bed.id);
    if (!set) continue;
    for (const [kind, colour] of [['ecg', '#35e07a'], ['pleth', '#35c8f0'], ['resp', '#b388ff']]) {
      const sw = set[kind];
      sw.acc += dt;
      // Guard the loop: a long tab suspension must not try to catch up with
      // thousands of samples in one frame.
      let n = 0;
      while (sw.acc >= step && n++ < 8) {
        sw.push(bed.sample(kind, step), colour);
        sw.acc -= step;
      }
      if (sw.acc > step * 8) sw.acc = 0;
    }
  }
  for (const cv of $$('.waves canvas')) {
    const set = sweeps.get(cv.dataset.bed);
    if (!set) continue;
    const sw = set[cv.dataset.kind];
    if (!sw) continue;
    // 'copy', not 'source-over'. Compositing each frame onto the previous one
    // accumulates the antialiased trace until it saturates into a solid band
    // within about a second. This replaces the pixels instead of blending them.
    const ctx = cv.getContext('2d');
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(sw.cv, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* ----------------------------------------------------------------- boot */

const VIEWS = {
  dashboard: renderDashboard,
  trends: renderTrends,
  ward: renderWard,
  audit: renderAudit,
  standards: renderStandards,
  scope: renderScope,
};

let current = 'dashboard';
let lastFullRender = 0;

function show(view) {
  if (!VIEWS[view]) return;
  current = view;
  settings.view = view;
  saveSettings();
  for (const b of $$('.nav button')) b.setAttribute('aria-selected', String(b.dataset.view === view));
  for (const v of $$('.view')) v.hidden = v.id !== `view-${view}`;
  VIEWS[view]();
  // Re-enter full-screen the sweep buffers so traces resume from a full canvas.
  if (view === 'dashboard') bindWaves();
}

/* ----------------------------------------------------- narrow-screen rail */

function setRail(open) {
  settings.railOpen = open;
  saveSettings();
  const rail = $('#rail');
  const toggle = $('#railToggle');
  if (rail) rail.dataset.open = String(open);
  if (toggle) toggle.setAttribute('aria-expanded', String(open));
}

function wireRail() {
  $('#railToggle').addEventListener('click', () => setRail($('#rail').dataset.open !== 'true'));
  $('#railClose').addEventListener('click', () => setRail(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#rail').dataset.open === 'true') setRail(false);
  });
  setRail(settings.railOpen);
}

/* -------------------------------------------------------- keyboard access */

function wireKeyboard() {
  // Numeric shortcuts follow the visual order of the nav bar, so what the
  // operator sees and what they press agree.
  const VIEWS_KEYS = ['dashboard', 'trends', 'ward', 'audit', 'standards', 'scope'];

  document.addEventListener('keydown', e => {
    // Never steal keys from a control the operator is actually using.
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key >= '1' && e.key <= '6') { show(VIEWS_KEYS[Number(e.key) - 1]); return; }

    if (e.key === 'a' || e.key === 'A') {
      if (store.open.length) { store.acknowledgeAll(); renderRail(); renderDashboard(); }
      return;
    }
  });
}

/* ----------------------------------------------------------------- boot */

document.addEventListener('click', e => {
  const ack = e.target.closest('[data-ack]');
  if (ack) { store.acknowledge(ack.dataset.ack); renderRail(); renderDashboard(); return; }

  const nav = e.target.closest('.nav button');
  if (nav) { show(nav.dataset.view); return; }

  if (e.target.id === 'ackAll') { store.acknowledgeAll(); renderRail(); renderDashboard(); return; }
  if (e.target.id === 'inject') { store.demo('info'); renderRail(); return; }

  const sc = e.target.closest('[data-scenario]');
  if (sc) { store.demo(sc.dataset.scenario); renderRail(); return; }
});

setInterval(() => {
  $('#clock').innerHTML =
    `${new Date().toLocaleTimeString('en-GB')}<small>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</small>`;
}, 1000);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  // Simulate before rendering, and keep the two independent. A rendering
  // fault must never stop the physiology: a frozen vitals trace presented
  // as live is exactly the failure mode this system exists to prevent.
  try {
    store.step(dt);
  } catch (e) {
    console.error('simulation step failed', e);
  }

  try {
    syncAlarmAudio();
    syncPulseTone();
    if (audio.enabled && audio.tick()) renderAudioState();

    if (current === 'dashboard') {
      paintSweeps(dt);
      if (now - lastFullRender > 1000) { renderDashboard(); lastFullRender = now; }
    } else if (current === 'trends' && now - lastFullRender > 2000) {
      renderTrends(); lastFullRender = now;
    } else if (current === 'ward' && now - lastFullRender > 1000) {
      renderWard(); lastFullRender = now;
    } else if (current === 'audit' && now - lastFullRender > 2000) {
      renderAudit(); lastFullRender = now;
    }
  } catch (e) {
    console.error('render failed', e);
  }

  requestAnimationFrame(frame);
}

applySettings();
show(settings.view || 'dashboard');
wireAudio();
wireRail();
wireKeyboard();
requestAnimationFrame(frame);

// Exposed for the demo console and for automated checks.
window.PMS = { store, sweeps, show, audio, settings, saveSettings };
