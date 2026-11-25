/**
 * UI controller.
 *
 * Everything mechanical lives next door: intake in `ui-intake.mjs`, rendering in
 * `ui-render.mjs`, exports in `ui-export.mjs`, and every interesting decision in
 * `src/`. This file owns state, the run lifecycle, and what the user is told while
 * it runs.
 *
 * One honesty rule runs through the whole interface: the badge always says where
 * the answer came from. `on-device` means the image never left the machine,
 * `cloud-fallback` means it did, and `sample` means nothing was inferred at all.
 * An app that blurs those three is not worth the trust it asks for.
 */

import { createAiClient, fileToBase64, probeDeviceModel } from "./src/ai.mjs";
import { parseModelJson } from "./src/prompt.mjs";
import { buildReport } from "./src/pipeline.mjs";
import { renderReport } from "./ui-render.mjs";
import { buildCsv, buildFhirBundle, buildJson, buildText, save, stamp } from "./ui-export.mjs";
import { wireIntake } from "./ui-intake.mjs";
import { paintStatus } from "./ui-status.mjs";
import { SAMPLE, SAMPLE_TRANSCRIPT } from "./sample.mjs";

const $ = (id) => document.getElementById(id);

const el = {
  status: $("device-status"),
  drop: $("drop"),
  file: $("file"),
  pick: $("pick"),
  sample: $("sample"),
  preview: $("preview"),
  previewImg: $("preview-img"),
  previewName: $("preview-name"),
  reset: $("reset"),
  run: $("run"),
  forceCloud: $("force-cloud"),
  progress: $("progress"),
  progressFill: $("progress-fill"),
  progressLabel: $("progress-label"),
  error: $("error"),
  result: $("result"),
  resultTitle: $("result-title"),
  resultMeta: $("result-meta"),
  sourceBadge: $("source-badge"),
  statCoded: $("stat-coded"),
  statRate: $("stat-rate"),
  statLatency: $("stat-latency"),
  codesBody: $("codes-body"),
  rejected: $("rejected"),
  rejectedList: $("rejected-list"),
  rawResponse: $("raw-response"),
  exportJson: $("export-json"),
  exportFhir: $("export-fhir"),
  exportCsv: $("export-csv"),
  copyText: $("copy-text"),
  footerNote: $("footer-note"),
};

const state = {
  file: null,
  imageBase64: null,
  ai: null,
  aiError: null,
  lastReport: null,
  lastRaw: "",
  busy: false,
};

/* ------------------------------------------------------------------ */
/* device capability                                                    */
/* ------------------------------------------------------------------ */

async function initDeviceStatus() {
  paintStatus(el, await probeDeviceModel());

  const config = window.__PHOTOLOINC_CONFIG__;
  if (!config?.firebase) {
    el.footerNote.textContent =
      " Firebase is not configured in this build; use the sample report to review the interface.";
    return;
  }

  try {
    state.ai = await createAiClient(config.firebase, {
      debugAppCheck: Boolean(config.debugAppCheck),
      recaptchaKey: config.recaptchaKey,
    });
  } catch (err) {
    state.aiError = err;
    el.footerNote.textContent = " Firebase failed to initialize; see the console.";
    console.error("AI client failed:", err);
  }
}

/* ------------------------------------------------------------------ */
/* selection                                                            */
/* ------------------------------------------------------------------ */

async function acceptFile(file) {
  hideError();
  state.file = file;
  state.imageBase64 = await fileToBase64(file);
  el.previewImg.src = URL.createObjectURL(file);
  el.previewName.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
  el.preview.hidden = false;
  el.run.disabled = false;
}

async function loadSample() {
  hideError();
  state.file = { name: "sample-report.png", type: "image/png" };
  state.imageBase64 = SAMPLE.base64;
  el.previewImg.src = SAMPLE.dataUrl;
  el.previewName.textContent = "sample-report.png · bundled example";
  el.preview.hidden = false;
  el.run.disabled = false;
}

function clearFile() {
  state.file = null;
  state.imageBase64 = null;
  el.file.value = "";
  el.preview.hidden = true;
  el.run.disabled = true;
  el.result.hidden = true;
  hideError();
}

/* ------------------------------------------------------------------ */
/* run                                                                  */
/* ------------------------------------------------------------------ */

async function runPipeline() {
  if (state.busy || !state.imageBase64) return;
  state.busy = true;
  setBusy(true);
  hideError();
  el.result.hidden = true;

  try {
    const { text, source, model, latencyMs } = await extract();
    const parsed = parseModelJson(text);
    if (!parsed.ok) {
      throw new Error(`The model did not return usable JSON: ${parsed.error}`);
    }

    state.lastRaw = text;
    // No subject is passed: the app has no identity concept, and the FHIR
    // output must not fabricate a Patient reference (issue #4).
    const report = buildReport(parsed.rows, {
      inferenceSource: source,
      model,
      latencyMs,
    });

    state.lastReport = report;
    renderReport(report, parsed, source, el, state.lastRaw);
    el.result.hidden = false;
    el.result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(err?.message ?? String(err));
    console.error(err);
  } finally {
    state.busy = false;
    setBusy(false);
    el.progress.hidden = true;
  }
}

/**
 * Produce the raw model response, or the recorded transcript when this build has no
 * Firebase config. The replay path exists so the interface can be reviewed and
 * recorded without credentials — and it is labelled, so a transcript is never
 * mistaken for a live inference.
 */
async function extract() {
  const config = window.__PHOTOLOINC_CONFIG__;

  if (!config?.firebase) {
    showProgress(1, "No Firebase config — replaying a recorded extraction");
    await delay(420);
    return { text: SAMPLE_TRANSCRIPT, source: "sample", model: "recorded transcript", latencyMs: null };
  }

  if (!state.ai) {
    if (state.aiError) throw state.aiError;
    state.ai = await createAiClient(config.firebase, {
      debugAppCheck: Boolean(config.debugAppCheck),
      recaptchaKey: config.recaptchaKey,
    });
  }

  const forceCloud = el.forceCloud.checked;

  // Downloading the local model and then ignoring it would be the worst of both
  // worlds: hundreds of megabytes spent to prove a point.
  if (forceCloud) {
    showProgress(0.15, "Cloud fallback forced — the on-device model is bypassed");
  } else {
    showProgress(null, "Preparing the on-device model…");
    const prepared = await state.ai.prepare((p) => {
      const pct = typeof p === "number" && p <= 1 ? p * 100 : p;
      showProgress(pct / 100, `Downloading the local model… ${Math.round(pct)}%`);
    });
    if (!prepared.available) {
      showProgress(0.15, "No local model on this device — the cloud will do the work");
    }
  }

  showProgress(0.45, "Reading the report…");
  const result = await state.ai.extract(
    { base64: state.imageBase64, mimeType: state.file.type },
    { forceCloud },
  );
  showProgress(1, "Coding against the LOINC catalog…");

  return { text: result.text, source: result.source, model: result.model, latencyMs: result.latencyMs };
}

function setBusy(busy) {
  el.run.disabled = busy;
  el.run.textContent = busy ? "Working…" : "Extract and code";
}

function showProgress(fraction, label) {
  el.progress.hidden = false;
  el.progressFill.style.width =
    fraction === null ? "8%" : `${Math.max(4, Math.min(100, fraction * 100))}%`;
  el.progressLabel.textContent = label;
}

/* ------------------------------------------------------------------ */
/* misc                                                                 */
/* ------------------------------------------------------------------ */

function showError(message) {
  el.error.textContent = message;
  el.error.hidden = false;
}

function hideError() {
  el.error.hidden = true;
  el.error.textContent = "";
}

function flash(button, text) {
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, 1400);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ------------------------------------------------------------------ */
/* boot                                                                 */
/* ------------------------------------------------------------------ */

wireIntake({
  el,
  onFile: acceptFile,
  onClear: clearFile,
  onSample: loadSample,
  onReject: showError,
});

wireExports({
  el,
  getReport: () => state.lastReport,
  confirm: flash,
});

el.run.addEventListener("click", runPipeline);

initDeviceStatus();

/**
 * `?demo=1` loads the bundled sample and runs it.
 *
 * This exists for the submission video and for screenshots: it drives the same
 * code path a click does, so what the recording shows is what the app does. It is
 * the only piece of test-shaped behaviour in the UI, and it is honest about
 * itself — the badge still reports where the answer came from.
 */
if (new URLSearchParams(location.search).get("demo") === "1") {
  loadSample().then(() => runPipeline());
}
