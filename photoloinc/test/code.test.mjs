/**
 * Coding behaviour, with the rejections treated as first-class results.
 *
 * The interesting cases are not the happy path. A lab report with a decimal comma,
 * a value in the wrong unit, or a typo that produces an impossible hemoglobin is
 * where a coding layer either protects the pipeline or corrupts it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { codeOne, codeReport, convert, normalizeUnit, resolveAnalyte, toFhir, UNIT_SYNONYMS } from "../src/code.mjs";

test("resolves Spanish and English analyte names", () => {
  assert.equal(resolveAnalyte("Glucosa")?.key, "glucose");
  assert.equal(resolveAnalyte("GLUCOSA EN AYUNAS")?.key, "glucose");
  assert.equal(resolveAnalyte("Hemoglobina")?.key, "hemoglobin");
  assert.equal(resolveAnalyte("Colesterol LDL")?.key, "ldl");
  assert.equal(resolveAnalyte("TGP")?.key, "alt");
  assert.equal(resolveAnalyte("TGO")?.key, "ast");
  assert.equal(resolveAnalyte("Leucocitos")?.key, "wbc");
  assert.equal(resolveAnalyte("Plaquetas")?.key, "platelets");
  assert.equal(resolveAnalyte("creatinine")?.key, "creatinine");
});

test("unknown analytes resolve to null instead of a guess", () => {
  assert.equal(resolveAnalyte("Hierro serico"), null);
  assert.equal(resolveAnalyte(""), null);
  assert.equal(resolveAnalyte("XYZ123"), null);
});

test("unit spellings normalize to canonical forms", () => {
  assert.equal(normalizeUnit("mg/dl"), "mg/dL");
  assert.equal(normalizeUnit("g/dL"), "g/dL");
  assert.equal(normalizeUnit("MMHG"), "mm[Hg]");
  assert.equal(normalizeUnit("10^3/uL"), "10*3/uL");
  assert.equal(normalizeUnit("K/uL"), "10*3/uL");
  assert.equal(normalizeUnit("UI/L"), "U/L");
  assert.equal(normalizeUnit("bananas"), null);
  assert.equal(normalizeUnit(""), null);
});

test("no unit spelling resolves to two different canonical units", () => {
  // A silent collision here would convert a value with the wrong factor, which is
  // exactly the class of bug that makes a coded value dangerous.
  const seen = new Map();
  const collisions = [];
  for (const [canonical, spellings] of Object.entries(UNIT_SYNONYMS)) {
    for (const sp of spellings) {
      const norm = sp
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      const prev = seen.get(norm);
      if (prev && prev !== canonical) collisions.push(`${norm}: ${prev} vs ${canonical}`);
      seen.set(norm, canonical);
    }
  }
  assert.deepEqual(collisions, []);
});

test("same-family conversion scales correctly", () => {
  const hb = resolveAnalyte("Hemoglobina");
  assert.equal(convert(142, "g/L", hb).value, 14.2);
  const plaq = resolveAnalyte("Plaquetas");
  assert.equal(convert(250_000, "/uL", plaq).value, 250);
});

test("molar conversion handles both directions", () => {
  const glucose = resolveAnalyte("Glucosa");
  assert.ok(Math.abs(convert(5.1, "mmol/L", glucose).value - 91.9) < 0.2);

  const creatinine = resolveAnalyte("Creatinina");
  assert.ok(Math.abs(convert(97, "umol/L", creatinine).value - 1.1) < 0.05);

  const chol = resolveAnalyte("Colesterol total");
  assert.ok(Math.abs(convert(5.2, "mmol/L", chol).value - 201) < 1);
});

test("cross-family conversion is refused when no molar factor is declared", () => {
  const sodium = resolveAnalyte("Sodio");
  const r = convert(140, "mg/dL", sodium);
  assert.ok(r.error, "sodium has no mass<->substance conversion and must not be guessed");
});

test("unknown units are rejected, not assumed", () => {
  const r = codeOne({ name: "Glucosa", value: "92", unit: "bananas" });
  assert.equal(r.ok, false);
  assert.match(r.rejected.reason, /unrecognized unit/);
});

test("decimal comma in the extracted value is accepted", () => {
  const r = codeOne({ name: "Hemoglobina", value: "14,2", unit: "g/dL" });
  assert.equal(r.ok, true);
  assert.equal(r.observation.value, 14.2);
});

test("implausible values are rejected with the reason attached", () => {
  // 140 g/dL hemoglobin is a decimal slip on 14.0
  const r = codeOne({ name: "Hemoglobina", value: "140", unit: "g/dL" });
  assert.equal(r.ok, false);
  assert.match(r.rejected.reason, /implausible/);

  // 250 mg/dL glucose is plausible; 25,000 is not
  const hi = codeOne({ name: "Glucosa", value: "25000", unit: "mg/dL" });
  assert.equal(hi.ok, false);
});

test("coded observation carries both the source spelling and the coded value", () => {
  const r = codeOne({ name: "Glucosa en ayunas", value: "5.1", unit: "mmol/L" });
  assert.equal(r.ok, true);
  assert.equal(r.observation.loinc, "2345-7");
  assert.equal(r.observation.unit, "mg/dL");
  assert.equal(r.observation.source.converted, true);
  assert.equal(r.observation.source.value, "5.1");
});

test("codeReport keeps rejections alongside successes", () => {
  const { observations, rejected } = codeReport([
    { name: "Glucosa", value: "92", unit: "mg/dL" },
    { name: "Hierro serico", value: "90", unit: "ug/dL" },
    { name: "Hemoglobina", value: "14.2", unit: "g/dL" },
  ]);
  assert.equal(observations.length, 2);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].name, "Hierro serico");
});

test("FHIR output is a valid Observation with an id inside the allowed charset", () => {
  const { observations } = codeReport([{ name: "Glucosa", value: "92", unit: "mg/dL" }]);
  const fhir = toFhir(observations[0], { subject: "patient-1", at: new Date("2026-11-24T10:00:00Z") });
  assert.equal(fhir.resourceType, "Observation");
  assert.equal(fhir.status, "final");
  assert.equal(fhir.code.coding[0].system, "http://loinc.org");
  assert.equal(fhir.code.coding[0].code, "2345-7");
  assert.equal(fhir.subject.reference, "Patient/patient-1");
  assert.match(fhir.id, /^[A-Za-z0-9.-]{1,64}$/);
  assert.equal(fhir.valueQuantity.value, 92);
  assert.equal(fhir.valueQuantity.system, "http://unitsofmeasure.org");
});

test("catalog never emits a code it cannot back with a value", () => {
  // Non-numeric values must be rejected rather than coerced to 0 or NaN.
  for (const value of ["", "n/a", "---", "negativo"]) {
    const r = codeOne({ name: "Glucosa", value, unit: "mg/dL" });
    assert.equal(r.ok, false, `value ${JSON.stringify(value)} should be rejected`);
  }
});
