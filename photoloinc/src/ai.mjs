/**
 * Hybrid inference via Firebase AI Logic.
 *
 * One `GenerativeModel` with `PREFER_ON_DEVICE` does all the work: when a local
 * model is available the prompt never leaves the device, and when it is not the
 * SDK falls back to the cloud without the caller changing anything.
 *
 * Two details matter and are easy to get wrong:
 *
 *   1. `initializeDeviceModel()` must run after a user gesture and before the
 *      first query. The model download is hundreds of megabytes; starting it on
 *      page load is both blocked by the browser and hostile to the user.
 *   2. The response carries `inferenceSource`, and the UI must show it. An app
 *      that claims to be private while silently falling back to the cloud is
 *      lying to its user; this one reports which way each request went.
 */

import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from "firebase/app-check";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
} from "firebase/ai";

import { buildPrompt, SYSTEM_INSTRUCTION, RESPONSE_SCHEMA } from "./prompt.mjs";

export const FIREBASE_VERSION = "13.4.0";

/**
 * @param {object} config Firebase web config
 * @param {object} [opts]
 * @param {boolean} [opts.debugAppCheck]  use an App Check debug token (local dev)
 * @param {string}  [opts.recaptchaKey]   reCAPTCHA v3 site key
 */
export async function createAiClient(config, opts = {}) {
  if (!config?.apiKey || !config?.projectId) {
    throw new Error("Firebase config is required (apiKey and projectId at minimum)");
  }

  const app = initializeApp(config);

  // App Check is mandatory for Firebase AI Logic. A debug token is accepted but
  // must be safelisted in the console; production uses reCAPTCHA v3.
  if (opts.debugAppCheck) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  try {
    initializeAppCheck(app, {
      provider: opts.recaptchaKey
        ? new ReCaptchaV3Provider(opts.recaptchaKey)
        : new CustomProvider({ getToken: async () => ({ token: "debug-mode", expireTimeMillis: Date.now() + 3_600_000 }) }),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // App Check failing is a configuration problem worth surfacing, not hiding.
    console.warn("App Check initialization failed:", err?.message ?? err);
  }

  const ai = getAI(app, { backend: new GoogleAIBackend() });

  const baseConfig = {
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  };

  const model = getGenerativeModel(ai, {
    ...baseConfig,
    mode: InferenceMode.PREFER_ON_DEVICE,
  });

  // A second handle that refuses the on-device path. It exists so the demo can show
  // the difference side by side without editing code, and so a user who wants the
  // cloud explicitly is never silently given the local model.
  const cloudOnly = getGenerativeModel(ai, {
    ...baseConfig,
    mode: InferenceMode.ONLY_IN_CLOUD,
  });

  return {
    app,
    model,

    /**
     * Start (or check) the on-device model. Safe to call more than once; the SDK
     * deduplicates the download.
     *
     * @param {(progress:number)=>void} [onProgress] 0..1
     * @returns {Promise<{available:boolean}>}
     */
    async prepare(onProgress) {
      try {
        await model.initializeDeviceModel?.(onProgress);
        return { available: true };
      } catch (err) {
        // No local model is not a failure: the whole point of hybrid inference is
        // that the cloud path still works.
        return { available: false, reason: err?.message ?? String(err) };
      }
    },

    /**
     * Run one extraction.
     *
     * @param {{base64:string, mimeType:string}} image
     * @param {{forceCloud?: boolean}} [opts]
     * @returns {Promise<{text:string, source:"on-device"|"cloud-fallback"|"unknown", model:string|null, latencyMs:number}>}
     */
    async extract(image, opts = {}) {
      const runner = opts.forceCloud ? cloudOnly : model;
      const started = performance.now();
      const result = await runner.generateContent([
        buildPrompt(),
        { inlineData: { data: image.base64, mimeType: image.mimeType } },
      ]);

      const response = result.response;
      const latencyMs = Math.round(performance.now() - started);
      const source = mapSource(response);

      return {
        text: response.text(),
        source,
        model: response.modelVersion ?? null,
        latencyMs,
      };
    },
  };
}

/** Translate the SDK's inference source into something the UI can branch on. */
export function mapSource(response) {
  const raw = response?.inferenceSource;
  if (raw === InferenceSource.ON_DEVICE) return "on-device";
  if (raw === InferenceSource.IN_CLOUD) return "cloud-fallback";
  if (raw === "ON_DEVICE") return "on-device";
  if (raw === "IN_CLOUD") return "cloud-fallback";
  return "unknown";
}

/**
 * Probe what this browser can actually do, without downloading anything.
 *
 * Shown in the UI before the user commits to an upload, because the answer is the
 * difference between "your report stays on this laptop" and "your report goes to
 * a datacenter".
 *
 * `LanguageModel.availability()` can hang indefinitely on a browser where the
 * model component is present but not installed, so the probe is raced against a
 * timeout. A probe that never answers must not leave the UI saying "checking…"
 * forever.
 */
export async function probeDeviceModel({ timeoutMs = 4000 } = {}) {
  const out = { promptApi: false, availability: "unavailable", chromeMajor: null };
  if (typeof LanguageModel === "undefined") {
    const m = navigator.userAgent.match(/Chrome\/(\d+)/);
    out.chromeMajor = m ? Number(m[1]) : null;
    return out;
  }
  out.promptApi = true;
  try {
    out.availability = await Promise.race([
      LanguageModel.availability(),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), timeoutMs)),
    ]);
  } catch (err) {
    out.availability = `error: ${err?.message ?? err}`;
  }
  return out;
}

/** Read a File into base64 without the data: prefix the SDK does not want. */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("could not read file"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}
