/**
 * Export helpers: JSON, FHIR bundle, CSV, and plain text.
 *
 * Each export is generated from the same `report` object the table renders, so what
 * the user downloads is what the user saw. The FHIR one is the interesting case:
 * it is the reason the whole catalog exists.
 */

import { renderText } from "./src/pipeline.mjs";

export function buildJson(report) {
  return {
    ...report,
    observations: report.observations.map(({ fhir, ...rest }) => rest),
  };
}

/** A FHIR R4 Bundle of Observations, ready for any accepting endpoint. */
export function buildFhirBundle(report) {
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: report.generatedAt,
    entry: report.observations.map((o) => ({ resource: o.fhir })),
  };
}

export function buildCsv(report) {
  const header = ["loinc", "display", "value", "unit", "source_name", "source_value", "source_unit"];
  const rows = report.observations.map((o) => [
    o.loinc,
    o.display,
    o.value,
    o.unit,
    o.source.name,
    o.source.value,
    o.source.unit ?? "",
  ]);
  return [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function buildText(report) {
  return renderText(report);
}

/** Trigger a download without leaving the page. */
export function save(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** A filename-safe timestamp: `2026-11-24-22-31-07`. */
export function stamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/**
 * Wire the four export buttons.
 *
 * `getReport` is called at click time, not at wiring time, so the handlers always
 * see the newest report. A click with no report yet is a no-op rather than a crash.
 *
 * @param {object} opts
 * @param {object} opts.el              element map
 * @param {() => object|null} opts.getReport
 * @param {(button: HTMLElement, text: string) => void} [opts.confirm]  feedback hook
 */
export function wireExports({ el, getReport, confirm = () => {} }) {
  el.exportJson.addEventListener("click", () => {
    const report = getReport();
    if (!report) return;
    save(`photoloinc-${stamp()}.json`, JSON.stringify(buildJson(report), null, 2), "application/json");
  });

  el.exportFhir.addEventListener("click", () => {
    const report = getReport();
    if (!report) return;
    const bundle = buildFhirBundle(report);
    save(`photoloinc-${stamp()}-fhir.json`, JSON.stringify(bundle, null, 2), "application/fhir+json");
  });

  el.exportCsv.addEventListener("click", () => {
    const report = getReport();
    if (!report) return;
    save(`photoloinc-${stamp()}.csv`, buildCsv(report), "text/csv");
  });

  el.copyText.addEventListener("click", async () => {
    const report = getReport();
    if (!report) return;
    try {
      await navigator.clipboard.writeText(buildText(report));
      confirm(el.copyText, "Copied");
    } catch {
      // Clipboard access can be denied; showing the text is better than silence.
      el.rawResponse.textContent = buildText(report);
    }
  });
}
