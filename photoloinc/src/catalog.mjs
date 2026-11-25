/**
 * LOINC coding: catalog indexes, alias resolution and molar conversions.
 *
 * The data lives in `loinc-data.mjs` and the unit factors in `units.mjs`; this
 * module is the logic that uses them. Every code in the data file was verified
 * against the NLM Clinical Tables LOINC service before being committed — nothing
 * is written from memory, because a wrong code silently mislabels a result.
 *
 * The model never emits a LOINC code. It extracts analyte, value and unit as text
 * and this layer does the coding deterministically. That split is the project: a
 * 1B-parameter on-device model reads a photographed table well and remembers
 * medical terminology badly, and it fails confidently.
 */

import { CATALOG } from "./loinc-data.mjs";

export { CATALOG };
export {
  UNIT_FACTORS,
  MASS_CONC,
  SUBST_CONC,
  ENZYME,
  HORMONE,
  CELLS,
  RATIO,
  RATE,
  CLEARANCE,
  PRESSURE,
  TEMP,
  TIME,
  PERCENT,
} from "./units.mjs";

/**
 * Cross-family factors for analytes where mass ↔ substance conversion is a fixed,
 * standard molar constant.
 *
 * `massPerSubstance` is how many mass units one substance unit is worth: 1 mmol/L
 * of glucose is 18.0182 mg/dL. To go the other way, divide.
 *
 * Kept deliberately short. Anything absent stays inside its own family, and a unit
 * that cannot be reconciled is rejected with a reason instead of guessed.
 */
export const MOLAR_CONVERSIONS = {
  glucose: { mass: "mg/dL", substance: "mmol/L", massPerSubstance: 18.0182 },
  creatinine: { mass: "mg/dL", substance: "µmol/L", massPerSubstance: 0.0113122 },
  cholesterol: { mass: "mg/dL", substance: "mmol/L", massPerSubstance: 38.67 },
  triglycerides: { mass: "mg/dL", substance: "mmol/L", massPerSubstance: 88.57 },
  bilirubin_total: { mass: "mg/dL", substance: "µmol/L", massPerSubstance: 0.05847 },
  bun: { mass: "mg/dL", substance: "mmol/L", massPerSubstance: 2.801 },
};

/** Lookup index: LOINC code -> entry. */
export const BY_CODE = new Map(CATALOG.map((e) => [e.code, e]));

/** Lookup index: internal key -> entry. */
export const BY_KEY = new Map(CATALOG.map((e) => [e.key, e]));

/**
 * Aliases must resolve to exactly one entry. A collision collapses deterministic
 * coding, so it is reported here rather than silently resolved at runtime.
 */
export function aliasIndex() {
  const idx = new Map();
  const collisions = [];
  for (const entry of CATALOG) {
    for (const alias of [entry.key, entry.display, ...entry.aliases]) {
      const norm = normalizeName(alias);
      if (!norm) continue;
      const prev = idx.get(norm);
      if (prev && prev.key !== entry.key) {
        collisions.push({ alias: norm, keys: [prev.key, entry.key] });
        continue;
      }
      idx.set(norm, entry);
    }
  }
  return { idx, collisions };
}

/** Fold case and accents, collapse whitespace, strip separator punctuation. */
export function normalizeName(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[()[\]{}]/g, " ")
    .replace(/[.:;,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
