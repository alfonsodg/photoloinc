/**
 * Catalog integrity.
 *
 * These tests exist because a wrong LOINC code is the one bug this project cannot
 * tolerate: it silently relabels a clinical result. Structure and uniqueness are
 * checked mechanically; the codes themselves were verified against the NLM
 * Clinical Tables LOINC service at authoring time.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { CATALOG, BY_CODE, aliasIndex, normalizeName, UNIT_FACTORS } from "../src/catalog.mjs";

test("catalog is non-empty and every entry is complete", () => {
  assert.ok(CATALOG.length >= 30, `expected a real catalog, got ${CATALOG.length}`);
  for (const e of CATALOG) {
    assert.match(e.code, /^\d{1,5}-\d$/, `bad LOINC shape: ${e.code}`);
    assert.ok(e.key, "entry missing key");
    assert.ok(e.display, `${e.key} missing display`);
    assert.ok(e.canonical, `${e.key} missing canonical unit`);
    assert.ok(Array.isArray(e.range) && e.range.length === 2, `${e.key} missing range`);
    assert.ok(e.range[0] < e.range[1], `${e.key} has inverted range`);
    assert.ok(Array.isArray(e.aliases) && e.aliases.length > 0, `${e.key} missing aliases`);
  }
});

test("LOINC codes are unique", () => {
  assert.equal(BY_CODE.size, CATALOG.length);
});

test("every catalog key is unique", () => {
  const keys = new Set(CATALOG.map((e) => e.key));
  assert.equal(keys.size, CATALOG.length);
});

test("every canonical unit has a conversion factor", () => {
  const missing = CATALOG.filter((e) => !UNIT_FACTORS[e.canonical]).map((e) => `${e.key}:${e.canonical}`);
  assert.deepEqual(missing, [], `canonical units without a factor: ${missing.join(", ")}`);
});

test("alias index has no collisions", () => {
  const { collisions } = aliasIndex();
  assert.deepEqual(collisions, [], "an alias resolves to more than one analyte");
});

test("normalizeName folds accents, case and punctuation", () => {
  assert.equal(normalizeName("  Glucósa,  EN AYUNAS "), "glucosa en ayunas");
  assert.equal(normalizeName("Hemoglobina (Hb)"), "hemoglobina hb");
  assert.equal(normalizeName("TP."), "tp");
});

test("known codes resolve to the expected analyte", () => {
  const expected = {
    "8480-6": "systolic_bp",
    "8462-4": "diastolic_bp",
    "8867-4": "heart_rate",
    "2345-7": "glucose",
    "3094-0": "bun",
    "3091-6": "urea",
    "2160-0": "creatinine",
    "718-7": "hemoglobin",
    "4548-4": "hba1c",
    "2093-3": "cholesterol",
    "777-3": "platelets",
    "6690-2": "wbc",
  };
  for (const [code, key] of Object.entries(expected)) {
    assert.equal(BY_CODE.get(code)?.key, key, `${code} should be ${key}`);
  }
});
