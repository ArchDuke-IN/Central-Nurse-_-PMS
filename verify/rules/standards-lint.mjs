/**
 * Standards linter for the PMS assignment.
 *
 * Each rule is checked per-line across the report markdown and db SQL files
 * listed in build/manifest.json.
 * A rule may declare `allowContext`: if that regex matches the same line,
 * the line is treated as legitimate historical/qualified usage and the
 * finding is downgraded to INFO instead of ERROR/WARN.
 *
 * Rationale: the assignment brief and the popular secondary literature it
 * draws on contain several factual errors. These rules make the verifier
 * catch regressions rather than relying on a human re-read.
 */

export const BANNED = [
  // --- Terminology codes that do not exist ---
  {
    id: 'loinc-85026-9',
    severity: 'error',
    pattern: /\b85026-9\b/,
    message: 'LOINC 85026-9 returns HTTP 404 on loinc.org and zero NLM hits. The canonical blood-pressure panel is 85354-9.',
    fix: 'Use 85354-9 "Blood pressure panel with all children optional".'
  },
  {
    id: 'loinc-93000-9',
    severity: 'error',
    pattern: /\b93000-9\b/,
    message: 'LOINC 93000-9 returned zero hits during verification. It may exist outside the curated NLM subset but is unverified.',
    fix: 'Use the verified ECG study code 11524-6.'
  },

  // --- Dead ABDM endpoints ---
  {
    id: 'abdm-legacy-v01',
    severity: 'error',
    pattern: /\/v0\.1\/health-id|\/v1\/health-id\/registry/,
    message: 'Legacy ABDM v0.1/v1 health-id routes are dead. Live HTTP probe 2026-10-19 returned 503/404.',
    fix: 'Build against /api/hiecm/*/v3 and /abha/api/v3 only.'
  },
  {
    id: 'abdm-legacy-authtoken',
    severity: 'error',
    pattern: /\/auth\/token\b/,
    message: 'ABDM has no /auth/token route (404 RESTEASY003210). OAuth2 client_credentials lives on the gateway.',
    fix: 'POST /api/hiecm/gateway/v3/sessions with grantType=client_credentials.'
  },
  {
    id: 'abdm-hisp',
    severity: 'error',
    pattern: /\bHISP\b/,
    message: 'HISP is retired ABDM terminology. Current roles are HIP, HIU and HRP.',
    fix: 'Use HIP (Health Information Provider) for a hospital PMS.'
  },

  // --- Superseded standard numbers ---
  {
    id: 'std-60601-2-30',
    severity: 'error',
    pattern: /IEC 60601-2-30/i,
    allowContext: /renumber|legacy|supersed|cancel|replac|withdrawn|no longer|histor/i,
    message: 'IEC 60601-2-30 was renumbered to IEC 80601-2-30:2018. The 60601 number no longer exists.',
    fix: 'Cite IEC 80601-2-30:2018 (Ed. 2.0).'
  },
  {
    id: 'std-60601-2-24',
    severity: 'error',
    pattern: /60601-2-24/,
    allowContext: /replac|legacy|histor|renumber|ISO 9919/i,
    message: 'IEC 60601-2-24 is superseded. The renumbering went via ISO 9919:2005 to ISO 80601-2-61.',
    fix: 'Cite ISO 80601-2-61, noting the 60601-2-24 -> ISO 9919 -> 80601-2-61 lineage only in a history note.'
  },
  {
    id: 'std-oximetry-2017',
    severity: 'warn',
    pattern: /80601-2-61:2017|80601-2-61\(2017\)/,
    allowContext: /withdrawn|supersed|replac|ed\.? ?2|edition 2/i,
    message: 'ISO 80601-2-61:2017 was withdrawn 2026-04-10 and replaced by ISO 80601-2-61:2026 (Ed. 3.0).',
    fix: 'Cite ISO 80601-2-61:2026; mention :2017 only as the withdrawn predecessor.'
  },

  // --- Misapplied standards (right number, wrong scope) ---
  {
    id: 'std-60601-2-25-misuse',
    severity: 'warn',
    pattern: /60601-2-25/,
    allowContext: /diagnostic|12-lead|electrocardiograph for|report/i,
    message: 'IEC 60601-2-25 covers electrocardiographs producing diagnostic ECG reports and explicitly excludes cardiac monitors under 60601-2-27. Bedside monitoring must cite 60601-2-27.',
    fix: 'Cite 60601-2-27 for bedside ECG monitoring; 60601-2-25 only for a diagnostic 12-lead machine.'
  },
  {
    id: 'std-60601-1-11-misuse',
    severity: 'warn',
    pattern: /60601-1-11/,
    allowContext: /home|not applicable|out of scope|does not apply|origin|tier|environment/i,
    message: 'IEC 60601-1-11 is triggered by a home-healthcare intended use. A staffed ward is a professional healthcare facility environment under 60601-1-2.',
    fix: 'Present 1-11 as the origin of the environment taxonomy, or as out of scope for this project.'
  },
  {
    id: 'fhir-waveform-resource',
    severity: 'error',
    pattern: /\bWaveform\b/,
    allowContext: /no such|does not exist|not exist|no `Waveform`|proposed|absent|never|avoid|instead|waveform data|full-disclosure|does not belong|waveform storage|waveform chunk/i,
    message: 'There is no Waveform resource in FHIR R4 or R5 core. It was proposed from STU3 and not carried forward.',
    fix: 'Use Observation.valueSampledData, or Binary + DocumentReference for full-fidelity waveforms.'
  },

  // --- Engineering claims that are design values, not standard limits ---
  {
    id: 'ecg-gain-halfstandard',
    severity: 'warn',
    pattern: /5\s?mm\/mV/,
    allowContext: /half.standard|10\s?mm\/mV|not the standard|half-standardisation|half standard/i,
    message: '5 mm/mV is half-standardisation, not the standard ECG gain. AAMI EC11 requires fixed gains of 20, 10 and 5 mm/mV with the full standard being 10 mm/mV.',
    fix: 'State 10 mm/mV as standard and label 5 mm/mV explicitly as half-standardisation.'
  },
  {
    id: 'nibp-deflation-rate',
    severity: 'warn',
    pattern: /40\s?[-–]\s?60\s?mmHg\/s/,
    allowContext: /inflat/i,
    message: '40-60 mmHg/s is plausible as an INFLATION rate. The measurement-phase deflation rate is typically 2-4 mmHg/s (5-10 mmHg/s in stat mode).',
    fix: 'Separate inflation rate from deflation rate.'
  },
  {
    id: 'temp-plus01-standard',
    severity: 'warn',
    pattern: /80601-2-56[^.\n]{0,60}±\s?0\.1\s?°C/,
    message: 'ISO 80601-2-56 / ASTM E1965 specify laboratory error within +/-0.3 C against a blackbody. +/-0.1 C is the sensor element tolerance, not the standard limit.',
    fix: 'Cite +/-0.3 C as the system laboratory accuracy; +/-0.1 C as sensor element tolerance at 37 C.'
  },

  // --- Brief typos that must be explicitly addressed ---
  {
    id: 'de-health-typo',
    severity: 'warn',
    pattern: /[Dd]e-?[Hh]ealth/,
    allowContext: /no such|not a standard|no standard|typo|probabl|interpre|means .de-?identification/i,
    message: '"De-health" is not a recognised standard or specification name.',
    fix: 'State explicitly that no such standard exists, and resolve the term (most likely "Digital health", or de-identification).'
  }
];

export const REQUIRED = [
  { id: 'das',       pattern: /[Dd]istributed [Aa]larm [Ss]ystem/,           why: 'A bedside monitor routing alarms to a nurse station is the canonical DAS under IEC 60601-1-8.' },
  { id: '80601-2-49',pattern: /80601-2-49/,                                  why: 'Multifunction patient monitoring equipment - the most relevant particular standard for a PMS.' },
  { id: '60601-2-27',pattern: /60601-2-27/,                                  why: 'ECG monitoring standard.' },
  { id: 'luhn',      pattern: /Luhn/,                                         why: 'ABHA check digit.' },
  { id: 'granted',   pattern: /\bGRANTED\b/,                                  why: 'ABDM consent success state is GRANTED, not ACTIVE.' },
  { id: 'wellness',  pattern: /WellnessRecord/,                               why: 'ABDM record type covering vitals - the primary profile for a PMS.' },
  { id: 'cdc',       pattern: /\bCDC\b|change data capture|transactional outbox/i, why: 'SQL to MongoDB sync pattern required by milestone G3.' },
  { id: 'derivedfrom', pattern: /derivedFrom/,                               why: 'Provenance for computed vitals such as MAP.' }
];
