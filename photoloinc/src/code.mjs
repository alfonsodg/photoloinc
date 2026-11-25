/**
 * Deterministic coding.
 *
 * Input is what the model extracted: a name, a value, a unit — all text. Output
 * is a coded observation or an explicit rejection with a reason.
 *
 * Three gates run before anything is emitted:
 *
 *   1. name    — the analyte must resolve to exactly one catalog entry
 *   2. unit    — the unit must convert into the entry's canonical unit, by a
 *                declared factor and never by a guess
 *   3. range   — the converted value must be physiologically plausible
 *
 * A rejected row is not dropped silently. It travels to the caller with `reason`
 * so the UI can show what could not be coded and why: a lab report where three of
 * twenty rows were skipped is still useful, but only if the user knows which three.
 */

import {
  BY_CODE,
  UNIT_FACTORS,
  MOLAR_CONVERSIONS,
  aliasIndex,
  normalizeName,
} from "./catalog.mjs";

const { idx: ALIASES } = aliasIndex();

/** Unit spellings that normalize to a canonical form before the factor lookup. */
export const UNIT_SYNONYMS = {
  "%": ["%", "percent", "pct", "porcentaje"],
  "g/dL": ["g/dl", "gdl", "gr/dl", "g%", "gramos/dl"],
  "mg/dL": ["mg/dl", "mgdl", "mg%"],
  "g/L": ["g/l", "gl"],
  "mg/L": ["mg/l", "mgl"],
  "ng/mL": ["ng/ml", "ngml"],
  "pg/mL": ["pg/ml", "pgml"],
  "µg/mL": ["ug/ml", "µg/ml", "mcg/ml"],
  "mmol/L": ["mmol/l", "mmol", "mmo/l"],
  "µmol/L": ["umol/l", "µmol/l", "mcmol/l"],
  "mEq/L": ["meq/l", "meq"],
  "U/L": ["u/l", "ul", "ui/l", "iu/l", "u/litro", "unidades/l"],
  // mIU/L and µIU/mL are the same concentration (milli-IU per litre == micro-IU per
  // millilitre), so they share one canonical spelling instead of two.
  "mIU/L": ["miu/l", "mui/l", "uiu/ml", "µui/ml", "µiu/ml", "miu/ml", "ui/ml"],
  "10*3/uL": ["10*3/ul", "10^3/ul", "10e3/ul", "k/ul", "x10^3/ul", "x10*3/ul", "miles/ul", "10^9/l", "10*9/l"],
  "10*6/uL": ["10*6/ul", "10^6/ul", "10e6/ul", "m/ul", "x10^6/ul", "x10*6/ul", "millones/ul", "10^12/l", "10*12/l"],
  "/uL": ["/ul", "cel/ul", "/mm3", "/mm^3"],
  fL: ["fl", "femtolitros"],
  pg: ["pg", "picogramos"],
  "/min": ["/min", "1/min", "lpm", "bpm", "rpm", "por minuto"],
  "mm[Hg]": ["mmhg", "mm[hg]", "mm hg", "mm de hg"],
  Cel: ["cel", "c", "°c", "oc", "celsius", "grados c"],
  s: ["s", "seg", "segundos", "sec"],
};

const UNIT_LOOKUP = (() => {
  const m = new Map();
  for (const [canonical, spellings] of Object.entries(UNIT_SYNONYMS)) {
    for (const sp of spellings) m.set(normalizeName(sp), canonical);
  }
  return m;
})();

/** Turn any printed unit into its canonical spelling, or null if unknown. */
export function normalizeUnit(raw) {
  if (!raw) return null;
  const n = normalizeName(raw);
  if (!n) return null;
  if (UNIT_LOOKUP.has(n)) return UNIT_LOOKUP.get(n);
  // "10*3/uL" normalizes to "10*3/ul" only via the synonym table; anything else
  // that looks like a bare canonical spelling is accepted as-is.
  if (UNIT_FACTORS[raw]) return raw;
  return null;
}

/**
 * Convert a value into the entry's canonical unit.
 *
 * Returns { value, unit } on success or { error } with a human-readable reason.
 * Same-family conversion is a single multiplication. Cross-family conversion is
 * only allowed for analytes listed in MOLAR_CONVERSIONS, and only for the exact
 * mass/substance pair declared there.
 */
export function convert(value, fromUnit, entry) {
  const unit = normalizeUnit(fromUnit);
  if (!unit) return { error: `unrecognized unit "${fromUnit ?? "(none)"}"` };

  const src = UNIT_FACTORS[unit];
  if (!src) return { error: `no conversion factor for unit "${unit}"` };

  if (unit === entry.canonical) return { value, unit };

  const target = UNIT_FACTORS[entry.canonical];
  if (!target) return { error: `catalog entry has no factor for "${entry.canonical}"` };

  if (src.family === target.family) {
    const canonicalValue = value * src.toCanonical;
    return { value: canonicalValue / target.toCanonical, unit: entry.canonical };
  }

  // Cross-family: only the declared mass <-> substance pairs, nothing else.
  const molar = MOLAR_CONVERSIONS[entry.key];
  if (!molar) {
    return { error: `cannot convert ${unit} to ${entry.canonical} for ${entry.key}` };
  }

  const sameFamily = (a, b) => UNIT_FACTORS[a].family === UNIT_FACTORS[b].family;

  // Bring the input into whichever of the two declared units its family matches,
  // then apply the single molar constant. Both declared units are looked up by
  // name so a µmol/L input becomes µmol/L before the factor is applied.
  if (sameFamily(unit, molar.substance) && entry.canonical === molar.mass) {
    const inSubstance = value * src.toCanonical / UNIT_FACTORS[molar.substance].toCanonical;
    return { value: inSubstance * molar.massPerSubstance, unit: entry.canonical };
  }

  if (sameFamily(unit, molar.mass) && entry.canonical === molar.substance) {
    const inMass = value * src.toCanonical / UNIT_FACTORS[molar.mass].toCanonical;
    return { value: inMass / molar.massPerSubstance, unit: entry.canonical };
  }

  return { error: `no molar conversion declared from ${unit} to ${entry.canonical}` };
}

/** Resolve an extracted name to a catalog entry, or null. */
export function resolveAnalyte(name) {
  const n = normalizeName(name);
  if (!n) return null;
  const direct = ALIASES.get(n);
  if (direct) return direct;

  // Reports decorate names: "TGP (ALT)", "Glucosa en ayunas", "Colesterol, total".
  // Drop parentheticals and try each fragment before falling back to a substring
  // scan, so an alias inside brackets still resolves.
  const fragments = [n, ...String(name ?? "").replace(/[()[\]]/g, "|").split("|")];
  for (const fragment of fragments) {
    const f = normalizeName(fragment);
    if (!f || f === n) continue;
    const hit = ALIASES.get(f);
    if (hit) return hit;
  }

  for (const [alias, entry] of ALIASES) {
    if (alias.length >= 3 && n.includes(alias)) return entry;
  }
  return null;
}

/**
 * Code one extracted row.
 *
 * @param {{name: string, value: number|string, unit?: string}} raw
 * @returns {{ok: true, observation: object} | {ok: false, rejected: object}}
 */
export function codeOne(raw, meta = {}) {
  const name = String(raw?.name ?? "").trim();
  const numeric = typeof raw?.value === "number" ? raw.value : Number(String(raw?.value ?? "").replace(",", "."));

  const entry = resolveAnalyte(name);
  if (!entry) {
    return {
      ok: false,
      rejected: { name, value: raw?.value, unit: raw?.unit, reason: "analyte not in catalog" },
    };
  }

  if (!Number.isFinite(numeric)) {
    return {
      ok: false,
      rejected: { name, value: raw?.value, unit: raw?.unit, reason: "value is not numeric" },
    };
  }

  const converted = convert(numeric, raw?.unit, entry);
  if (converted.error) {
    return {
      ok: false,
      rejected: { name, value: raw?.value, unit: raw?.unit, reason: converted.error },
    };
  }

  const [lo, hi] = entry.range;
  if (converted.value < lo || converted.value > hi) {
    return {
      ok: false,
      rejected: {
        name,
        value: raw?.value,
        unit: raw?.unit,
        reason: `implausible: ${round(converted.value)} ${converted.unit} outside ${lo}..${hi}`,
      },
    };
  }

  return {
    ok: true,
    observation: {
      analyte: entry.key,
      loinc: entry.code,
      display: entry.display,
      value: round(converted.value),
      unit: converted.unit,
      source: {
        name,
        value: raw?.value,
        unit: raw?.unit ?? null,
        converted: converted.unit !== normalizeUnit(raw?.unit) ? true : false,
      },
      ...meta,
    },
  };
}

/** Code a whole extracted report. Rejections are returned alongside, never hidden. */
export function codeReport(rows, meta = {}) {
  const observations = [];
  const rejected = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const r = codeOne(row, meta);
    if (r.ok) observations.push(r.observation);
    else rejected.push(r.rejected);
  }
  return { observations, rejected };
}

/**
 * Shape one coded observation as an FHIR R4 Observation.
 *
 * Minimal on purpose: unknown fields are rejected by strict gateways and ignored
 * by lenient ones, so the shape stays inside what both accept. The id is derived
 * from subject + code + second so a retry does not duplicate a reading.
 */
export function toFhir(obs, opts = {}) {
  const subject = opts.subject ?? "anonymous";
  const when = opts.at ?? new Date();
  const at = when instanceof Date ? when.toISOString() : String(when);
  const id = [subject, obs.loinc, at.slice(0, 19)]
    .join("-")
    .replace(/[^A-Za-z0-9.-]/g, "-")
    .slice(0, 64);

  return {
    resourceType: "Observation",
    id,
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: {
      coding: [{ system: "http://loinc.org", code: obs.loinc, display: obs.display }],
      text: obs.display,
    },
    subject: { reference: `Patient/${subject}` },
    effectiveDateTime: at,
    valueQuantity: {
      value: obs.value,
      unit: obs.unit,
      system: "http://unitsofmeasure.org",
      code: obs.unit,
    },
    device: { display: opts.device ?? "on-device model" },
  };
}

/** Everything the pipeline can code, for prompting the model with real vocabulary. */
export function vocabulary() {
  return [...new Set([...BY_CODE.values()].map((e) => e.display))].sort();
}

function round(v) {
  if (!Number.isFinite(v)) return v;
  const abs = Math.abs(v);
  if (abs >= 100) return Math.round(v);
  if (abs >= 10) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}
