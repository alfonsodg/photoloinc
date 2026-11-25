/**
 * Device capability badge.
 *
 * The probe answers one question before the user uploads anything: will this
 * machine decode the report locally, or will the cloud? That answer is the
 * difference between "your report stays on this laptop" and "your report goes to a
 * datacenter", so it is stated plainly rather than buried in a settings screen.
 *
 * Three states, three colours:
 *   on-device    the local model is installed and ready
 *   cloud        a local model exists but still needs downloading
 *   unavailable  this browser has no local model at all
 */

/** @param {object} el      element map */
/** @param {object} probe   result of `probeDeviceModel()` */
export function paintStatus(el, probe) {
  const dot = el.status.querySelector(".dot");
  const text = el.status.querySelector(".status-text");

  if (probe.promptApi && probe.availability === "available") {
    dot.dataset.state = "on-device";
    text.textContent = "On-device model ready";
    return;
  }

  if (probe.promptApi && (probe.availability === "downloadable" || probe.availability === "downloading")) {
    dot.dataset.state = "cloud";
    text.textContent = `Local model ${probe.availability} — first run downloads it`;
    return;
  }

  // A probe that timed out is not the same as a browser that has no model, but the
  // practical consequence is identical: this run will use the cloud.
  const version = probe.chromeMajor ? `Chrome ${probe.chromeMajor}` : "this browser";
  dot.dataset.state = "unavailable";
  text.textContent =
    probe.availability === "timeout"
      ? "Local model did not answer — this run will use the cloud"
      : `${version} has no local model — every run will use the cloud`;
}
