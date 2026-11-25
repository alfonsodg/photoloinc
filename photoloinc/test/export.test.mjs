/**
 * Export builders: what the user downloads is what the table showed.
 *
 * `ui-export.mjs` is DOM-free except for `wireExports`, so the builders are
 * tested here in node. The CSV case carries the issue-#3 regression test:
 * every export path must preserve the inference provenance the badge shows.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReport } from "../src/pipeline.mjs";
import { buildCsv, buildJson, buildFhirBundle, buildText } from "../ui-export.mjs";

function sampleReport(source = "on-device") {
  return buildReport(
    [
      { name: "Glucosa", value: "92", unit: "mg/dL" },
      { name: "Hierro serico", value: "90", unit: "ug/dL" },
    ],
    { inferenceSource: source },
  );
}

test("CSV carries the inference source on every row", () => {
  const lines = buildCsv(sampleReport("cloud-fallback")).split("\n");
  assert.ok(lines[0].includes("inference_source"), "header names the provenance column");
  assert.equal(lines.length, 2, "one coded row plus header (rejections are not rows)");
  assert.ok(lines[1].includes("cloud-fallback"), "row records where the image was processed");
});

test("CSV keeps existing columns in order", () => {
  const header = buildCsv(sampleReport()).split("\n")[0];
  assert.ok(
    header.startsWith('"loinc","display","value","unit","source_name","source_value","source_unit"'),
    `unexpected header: ${header}`,
  );
});

test("JSON export preserves inference and drops embedded FHIR", () => {
  const json = buildJson(sampleReport("on-device"));
  assert.equal(json.inference.source, "on-device");
  assert.equal(json.observations.length, 1);
  assert.equal(json.observations[0].fhir, undefined);
});

test("FHIR bundle wraps each coded observation once", () => {
  const bundle = buildFhirBundle(sampleReport());
  assert.equal(bundle.resourceType, "Bundle");
  assert.equal(bundle.entry.length, 1);
  assert.equal(bundle.entry[0].resource.resourceType, "Observation");
});

test("text export names the inference source and the uncoded rows", () => {
  const text = buildText(sampleReport("sample"));
  assert.match(text, /inference: sample/);
  assert.match(text, /Hierro serico/);
});
