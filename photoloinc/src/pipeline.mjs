/**
 * Pipeline: extracted rows in, coded observations out, with provenance.
 *
 * The whole project is this function plus the two deterministic modules it calls.
 * Keeping it free of browser APIs is what lets it run under `node --test` and lets
 * the UI stay a thin shell around it.
 */

import { codeReport, toFhir } from "./code.mjs";

/**
 * @param {Array<{name:string, value:string, unit?:string}>} rows
 * @param {object} [meta]
 * @param {"on-device"|"cloud-fallback"|"unknown"} [meta.inferenceSource]
 * @param {string} [meta.model]
 * @param {number} [meta.latencyMs]
 * @param {string} [meta.subject]
 */
export function buildReport(rows, meta = {}) {
  const at = meta.at ?? new Date().toISOString();
  const coded = codeReport(rows, {
    inference: {
      source: meta.inferenceSource ?? "unknown",
      model: meta.model ?? null,
      latencyMs: meta.latencyMs ?? null,
    },
  });

  const observations = coded.observations.map((o) => ({
    ...o,
    fhir: toFhir(o, { subject: meta.subject, at, device: describeDevice(meta) }),
  }));

  const total = observations.length + coded.rejected.length;

  return {
    generatedAt: at,
    inference: {
      source: meta.inferenceSource ?? "unknown",
      model: meta.model ?? null,
      latencyMs: meta.latencyMs ?? null,
    },
    summary: {
      extracted: total,
      coded: observations.length,
      rejected: coded.rejected.length,
      codingRate: total === 0 ? 0 : Math.round((observations.length / total) * 1000) / 10,
    },
    observations,
    rejected: coded.rejected,
  };
}

function describeDevice(meta) {
  if (meta.inferenceSource === "on-device") return "on-device model";
  if (meta.inferenceSource === "cloud-fallback") return "cloud model (fallback)";
  return "model";
}

/**
 * A compact text rendering of a report.
 *
 * This is what the user can copy into another system, and what the demo video
 * shows scrolling. It is intentionally not the JSON: a clinician reads a table,
 * not braces.
 */
export function renderText(report) {
  const lines = [];
  lines.push(`PhotoLoinc — ${report.summary.coded}/${report.summary.extracted} coded (${report.summary.codingRate}%)`);
  lines.push(`inference: ${report.inference.source}${report.inference.model ? ` · ${report.inference.model}` : ""}`);
  lines.push("");
  lines.push("LOINC    VALUE  UNIT        ANALYTE");
  for (const o of report.observations) {
    lines.push(
      [
        o.loinc.padEnd(8),
        String(o.value).padStart(6),
        o.unit.padEnd(11),
        o.display,
      ].join(" "),
    );
  }
  if (report.rejected.length) {
    lines.push("");
    lines.push("not coded:");
    for (const r of report.rejected) {
      lines.push(`  ${r.name} ${r.value}${r.unit ? " " + r.unit : ""} — ${r.reason}`);
    }
  }
  return lines.join("\n");
}
