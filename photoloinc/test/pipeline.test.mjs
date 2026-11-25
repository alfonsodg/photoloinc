/**
 * Prompt parsing and the pipeline report.
 *
 * The parse tests exist because on-device models do not always return clean JSON:
 * they wrap it in fences, prepend a sentence, or emit a bare object with no
 * wrapper. Failing the extraction over that would be a self-inflicted bug.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPrompt, parseModelJson, RESPONSE_SCHEMA, SYSTEM_INSTRUCTION } from "../src/prompt.mjs";
import { buildReport, renderText } from "../src/pipeline.mjs";

test("parses bare JSON", () => {
  const r = parseModelJson('{"rows":[{"name":"Glucosa","value":"92","unit":"mg/dL"}]}');
  assert.equal(r.ok, true);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].name, "Glucosa");
});

test("parses JSON inside a code fence with prose around it", () => {
  const raw = 'Sure, here you go:\n```json\n{"rows":[{"name":"Hemoglobina","value":"14.2","unit":"g/dL"}]}\n```\nHope that helps.';
  const r = parseModelJson(raw);
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].name, "Hemoglobina");
});

test("parses a bare object with prose before it", () => {
  const raw = 'Result: {"rows":[{"name":"Creatinina","value":"1.1","unit":"mg/dL"}],"notes":"ok"}';
  const r = parseModelJson(raw);
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].value, "1.1");
  assert.equal(r.notes, "ok");
});

test("accepts a top-level array of rows", () => {
  const r = parseModelJson('[{"name":"Glucosa","value":"92","unit":"mg/dL"}]');
  assert.equal(r.ok, true);
  assert.equal(r.rows.length, 1);
});

test("drops rows without a name or a value instead of coding empties", () => {
  const r = parseModelJson('{"rows":[{"name":"","value":"5"},{"name":"Glucosa","value":""},{"name":"Glucosa","value":"92"}]}');
  assert.equal(r.ok, true);
  assert.equal(r.rows.length, 1);
});

test("fails cleanly when there is no JSON at all", () => {
  const r = parseModelJson("I could not read this image.");
  assert.equal(r.ok, false);
  assert.match(r.error, /no JSON/);
});

test("fails cleanly on an empty response", () => {
  assert.equal(parseModelJson("").ok, false);
  assert.equal(parseModelJson(null).ok, false);
});

test("the prompt never asks the model for a LOINC code", () => {
  const joined = `${SYSTEM_INSTRUCTION}\n${buildPrompt()}`.toLowerCase();
  assert.ok(!joined.includes("loinc"), "the model must not be asked to emit LOINC codes");
  assert.ok(!joined.includes("icd"), "the model must not be asked to emit diagnoses");
});

test("the response schema requires a rows array", () => {
  assert.equal(RESPONSE_SCHEMA.type, "object");
  assert.equal(RESPONSE_SCHEMA.properties.rows.type, "array");
  assert.deepEqual(RESPONSE_SCHEMA.required, ["rows"]);
});

test("buildReport records the inference source and the coding rate", () => {
  const report = buildReport(
    [
      { name: "Glucosa", value: "92", unit: "mg/dL" },
      { name: "Hemoglobina", value: "14.2", unit: "g/dL" },
      { name: "Hierro serico", value: "90", unit: "ug/dL" },
    ],
    { inferenceSource: "on-device", model: "gemini-nano-4", latencyMs: 812, subject: "p1" },
  );
  assert.equal(report.inference.source, "on-device");
  assert.equal(report.summary.extracted, 3);
  assert.equal(report.summary.coded, 2);
  assert.equal(report.summary.rejected, 1);
  assert.equal(report.summary.codingRate, 66.7);
  assert.equal(report.observations.length, 2);
  assert.equal(report.rejected.length, 1);
});

test("every coded observation carries FHIR ready to send", () => {
  const report = buildReport([{ name: "Glucosa", value: "92", unit: "mg/dL" }], {
    inferenceSource: "cloud-fallback",
  });
  const fhir = report.observations[0].fhir;
  assert.equal(fhir.resourceType, "Observation");
  assert.equal(fhir.valueQuantity.value, 92);
});

test("renderText shows what could not be coded", () => {
  const report = buildReport(
    [
      { name: "Glucosa", value: "92", unit: "mg/dL" },
      { name: "Hierro serico", value: "90", unit: "ug/dL" },
    ],
    { inferenceSource: "on-device" },
  );
  const text = renderText(report);
  assert.match(text, /2345-7/);
  assert.match(text, /not coded/);
  assert.match(text, /Hierro serico/);
});

test("an empty extraction report is well formed, not a crash", () => {
  const report = buildReport([], { inferenceSource: "on-device" });
  assert.equal(report.summary.extracted, 0);
  assert.equal(report.summary.codingRate, 0);
  assert.deepEqual(report.observations, []);
  assert.ok(renderText(report).includes("0/0"));
});
