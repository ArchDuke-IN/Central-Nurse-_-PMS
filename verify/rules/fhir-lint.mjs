/**
 * FHIR JSON resource lint.
 *
 * Validates any ```json fenced block whose content parses as a FHIR resource.
 * Catches the failures that matter for this project: a missing required
 * element, a UCUM unit code that does not match its display string, a
 * LOINC code from the banned set, or the wrong version of the observation
 * lifecycle.
 */

export const FHIR_REQUIRED = {
  Observation: ['resourceType', 'status', 'code', 'subject'],
  Patient:     ['resourceType', 'identifier'],
  Encounter:   ['resourceType', 'status', 'class', 'subject'],
  Location:    ['resourceType', 'status'],
  Device:      ['resourceType', 'status'],
};

export const VALID_OBSERVATION_STATUS = [
  'registered', 'preliminary', 'final', 'amended', 'corrected',
  'cancelled', 'entered-in-error', 'unknown'
];

export const VALID_ENCOUNTER_CLASS = ['AMB', 'IMP', 'EMER', 'HH', 'VR', 'OBSENC', 'SS', 'ECT'];

// UCUM display -> canonical code. Detects the classic mistake of writing
// code:"Cel" alongside unit:"°C", which looks right but breaks conformance.
const UCUM_DISPLAY = {
  'mmhg': 'mm[Hg]',
  '%': '%',
  '°c': 'Cel',
  'c': 'Cel',
  '/min': '/min',
  'beats/min': '{beats}/min',
  'breaths/min': '{breaths}/min',
};

export function lintFhir(resource, origin) {
  const out = [];
  const rt = resource.resourceType;
  if (!rt) return out;

  const req = FHIR_REQUIRED[rt];
  if (req) {
    for (const f of req) {
      if (resource[f] === undefined || resource[f] === null) {
        out.push({ level: 'error', file: origin, message: `FHIR ${rt} is missing required element "${f}".` });
      }
    }
  }

  if (rt === 'Observation') {
    if (resource.status && !VALID_OBSERVATION_STATUS.includes(resource.status)) {
      out.push({ level: 'error', file: origin, message: `Observation.status "${resource.status}" is not in the R4 value set.` });
    }

    // Walk code + components for LOINC correctness
    const codes = [];
    if (resource.code?.coding) codes.push(resource.code.coding[0]);
    for (const comp of resource.component || []) {
      if (comp.code?.coding) codes.push(comp.code.coding[0]);
    }
    for (const c of codes) {
      if (c.system === 'http://loinc.org' && ['85026-9', '93000-9'].includes(c.code)) {
        out.push({ level: 'error', file: origin, message: `LOINC ${c.code} is on the banned list (unverified or nonexistent).` });
      }
    }

    // Quantity units
    const quantities = [];
    if (resource.valueQuantity) quantities.push({ q: resource.valueQuantity, where: 'valueQuantity' });
    for (const comp of resource.component || []) {
      if (comp.valueQuantity) quantities.push({ q: comp.valueQuantity, where: `component/${comp.code?.coding?.[0]?.code || '?'}` });
    }
    for (const { q, where } of quantities) {
      if (q.system && q.system !== 'http://unitsofmeasure.org') {
        out.push({ level: 'error', file: origin, message: `${where}.system is "${q.system}"; UCUM requires "http://unitsofmeasure.org".` });
      }
      if (q.code === undefined || q.code === null) {
        out.push({ level: 'warn', file: origin, message: `${where} has no machine-readable UCUM "code". Humans read "unit"; machines read "code".` });
      } else {
        const want = UCUM_DISPLAY[(q.unit || '').toLowerCase()];
        if (want && want !== q.code) {
          out.push({ level: 'error', file: origin, message: `${where} unit "${q.unit}" does not match UCUM code "${q.code}" (expected "${want}").` });
        }
      }
    }
  }

  if (rt === 'Encounter' && resource.class?.code && !VALID_ENCOUNTER_CLASS.includes(resource.class.code)) {
    out.push({ level: 'error', file: origin, message: `Encounter.class.code "${resource.class.code}" is not a valid v3 ActCode (inpatient ward uses "IMP").` });
  }

  // Narrative must be valid XHTML in the correct namespace when generated.
  if (resource.text?.status === 'generated' && typeof resource.text.div === 'string') {
    const d = resource.text.div;
    if (!d.includes('http://www.w3.org/1999/xhtml')) {
      out.push({ level: 'error', file: origin, message: 'text.div is marked "generated" but lacks the http://www.w3.org/1999/xhtml namespace declaration.' });
    }
    if (/<(head|body|iframe)\b/i.test(d)) {
      out.push({ level: 'error', file: origin, message: 'text.div must not contain head, body or iframe elements.' });
    }
  }

  return out;
}

export function extractJsonFences(markdown) {
  const blocks = [];
  const re = /```json\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(markdown)) !== null) blocks.push(m[1]);
  return blocks;
}
