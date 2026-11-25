/**
 * Public runtime configuration.
 *
 * The Firebase web config is not a secret: it identifies the project, and access
 * is controlled by App Check plus the API key restrictions, not by hiding it. It
 * still lives in its own file so a fork can drop in its own project without
 * touching any code.
 *
 * When `firebase` is null the app runs in replay mode: the bundled sample is
 * coded through the real pipeline, and the UI labels the run as "sample · no
 * inference ran" rather than pretending a model was called.
 */
window.__PHOTOLOINC_CONFIG__ = {
  firebase: null,

  // App Check: use a debug token locally (safelist it in the console), reCAPTCHA
  // v3 in production.
  debugAppCheck: true,
  recaptchaKey: "",
};
