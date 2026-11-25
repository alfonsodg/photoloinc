/**
 * DOM rendering for a coded report.
 *
 * Kept apart from the controller so the mapping from a report object to markup is
 * readable in one place, and so nothing here can accidentally touch application
 * state. Every value that reaches the DOM passes through `escapeHtml` or
 * `textContent` — an analyte name comes from a photographed document and is not
 * trusted.
 */

/** Human-readable label for the inference path a run actually took. */
export function labelFor(source) {
  if (source === "on-device") return "on-device · image stayed here";
  if (source === "cloud-fallback") return "cloud fallback · image left the device";
  if (source === "sample") return "sample · no inference ran";
  return "unknown";
}

/**
 * @param {object} report   report from `buildReport`
 * @param {object} parsed   metadata from `parseModelJson` (language, notes)
 * @param {string} source   the inference source string
 * @param {object} el       element map
 * @param {string} rawText  the raw model response, shown in the details pane
 */
export function renderReport(report, parsed, source, el, rawText) {
  el.sourceBadge.dataset.source = source;
  el.sourceBadge.querySelector(".badge-text").textContent = labelFor(source);

  el.resultMeta.textContent = [
    report.inference.model ?? "model unknown",
    parsed.reportLanguage ? `language: ${parsed.reportLanguage}` : null,
    new Date(report.generatedAt).toLocaleString(),
  ]
    .filter(Boolean)
    .join(" · ");

  el.statCoded.textContent = `${report.summary.coded}/${report.summary.extracted}`;
  el.statRate.textContent = `${report.summary.codingRate}%`;
  el.statLatency.textContent =
    report.inference.latencyMs === null ? "—" : `${report.inference.latencyMs} ms`;

  el.codesBody.replaceChildren(...report.observations.map((o) => observationRow(o)));
  renderRejected(report.rejected, el);

  el.rawResponse.textContent = rawText;
  el.resultTitle.textContent =
    source === "sample" ? "Coded report (sample transcript)" : "Coded report";
}

/** One table row: the coded value beside the text it came from. */
function observationRow(o) {
  const tr = document.createElement("tr");
  const cells = [
    { text: o.loinc },
    { text: String(o.value), className: "num" },
    { text: o.unit },
    { text: o.display },
    {
      text: `${o.source.name} ${o.source.value}${o.source.unit ? " " + o.source.unit : ""}`,
      className: "source-text",
    },
  ];
  for (const cell of cells) {
    const td = document.createElement("td");
    if (cell.className) td.className = cell.className;
    td.textContent = cell.text;
    tr.append(td);
  }
  return tr;
}

/** The list of rows that could not be coded, with the reason for each. */
function renderRejected(rejected, el) {
  if (!rejected.length) {
    el.rejected.hidden = true;
    el.rejectedList.replaceChildren();
    return;
  }
  el.rejected.hidden = false;
  el.rejectedList.replaceChildren(
    ...rejected.map((r) => {
      const li = document.createElement("li");
      li.textContent = `${r.name} ${r.value}${r.unit ? " " + r.unit : ""} — ${r.reason}`;
      return li;
    }),
  );
}
