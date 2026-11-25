/**
 * Unit families and conversion factors.
 *
 * A value converts to the canonical unit of its own family by a pure SI factor.
 * Crossing families (mass ↔ substance) needs a molar mass, which is declared per
 * analyte in `catalog.mjs` and never inferred.
 */

export const MASS_CONC = "mass/volume";
export const SUBST_CONC = "substance/volume";
export const ENZYME = "enzyme activity/volume";
export const HORMONE = "units/volume";
export const CELLS = "cells/volume";
export const RATIO = "ratio";
export const RATE = "rate";
export const CLEARANCE = "clearance";
export const PRESSURE = "pressure";
export const TEMP = "temperature";
export const TIME = "time";
export const PERCENT = "fraction";

export const UNIT_FACTORS = {
  // mass/volume -> mg/dL
  "mg/dL": { family: MASS_CONC, toCanonical: 1 },
  "mg/L": { family: MASS_CONC, toCanonical: 0.1 },
  "g/dL": { family: MASS_CONC, toCanonical: 1000 },
  "g/L": { family: MASS_CONC, toCanonical: 100 },
  "ng/mL": { family: MASS_CONC, toCanonical: 0.0001 },
  "pg/mL": { family: MASS_CONC, toCanonical: 1e-7 },
  "µg/mL": { family: MASS_CONC, toCanonical: 0.1 },
  "ug/mL": { family: MASS_CONC, toCanonical: 0.1 },

  // substance/volume -> mmol/L
  "mmol/L": { family: SUBST_CONC, toCanonical: 1 },
  "µmol/L": { family: SUBST_CONC, toCanonical: 0.001 },
  "umol/L": { family: SUBST_CONC, toCanonical: 0.001 },
  "mEq/L": { family: SUBST_CONC, toCanonical: 1 },

  // enzyme activity -> U/L
  "U/L": { family: ENZYME, toCanonical: 1 },

  // hormone concentration -> mIU/L
  "mIU/L": { family: HORMONE, toCanonical: 1 },
  "µIU/mL": { family: HORMONE, toCanonical: 1 },

  // cells -> 10*3/uL
  "10*3/uL": { family: CELLS, toCanonical: 1 },
  "10^3/uL": { family: CELLS, toCanonical: 1 },
  "K/uL": { family: CELLS, toCanonical: 1 },
  "/uL": { family: CELLS, toCanonical: 0.001 },
  "10*6/uL": { family: CELLS, toCanonical: 1000 },
  "10^6/uL": { family: CELLS, toCanonical: 1000 },
  "M/uL": { family: CELLS, toCanonical: 1000 },

  // misc
  "%": { family: PERCENT, toCanonical: 1 },
  ratio: { family: RATIO, toCanonical: 1 },
  fL: { family: RATIO, toCanonical: 1 },
  pg: { family: RATIO, toCanonical: 1 },
  "/min": { family: RATE, toCanonical: 1 },
  "mL/min/{1.73_m2}": { family: CLEARANCE, toCanonical: 1 },
  "mm[Hg]": { family: PRESSURE, toCanonical: 1 },
  Cel: { family: TEMP, toCanonical: 1 },
  s: { family: TIME, toCanonical: 1 },
};
