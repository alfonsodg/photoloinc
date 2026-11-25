/**
 * What the model is asked to do, and what shape the answer must have.
 *
 * The instruction is deliberately narrow. The model reads the image and returns
 * rows of text; it is never asked for a LOINC code, never asked to convert a unit,
 * and never asked whether a value is normal. Those three jobs belong to
 * `catalog.mjs` and `code.mjs`, which are deterministic and testable.
 *
 * That split is what makes a 1B-parameter on-device model usable here. Asking it
 * to transcribe is a task it can do offline in under a second. Asking it to
 * remember LOINC terminology is a task it would fail confidently.
 */

/**
 * Vocabulary hint handed to the model so it prefers names the catalog knows.
 * Listing display names is not the same as asking it to code: the string is only
 * a nudge toward a spelling the deterministic matcher understands.
 */
export const SYSTEM_INSTRUCTION = [
  "You read photographs of laboratory reports and extract measurements.",
  "Return every measurement you can read. Do not interpret, do not diagnose, do not judge whether a value is normal.",
  "For each row return the analyte name exactly as printed, the numeric value as a string, and the unit as printed.",
  "If a unit is missing from the report, return an empty string for the unit instead of inventing one.",
  "If an analyte name is unreadable, skip that row rather than guessing.",
  "Normalize decimal commas to decimal points in the value.",
].join(" ");

/** The JSON shape requested from the model. Enums are avoided on purpose. */
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "string" },
          unit: { type: "string" },
        },
        required: ["name", "value"],
      },
    },
    reportLanguage: { type: "string" },
    notes: { type: "string" },
  },
  required: ["rows"],
};

/**
 * The user prompt. Kept short because on-device context is small and every token
 * competes with the image.
 */
export function buildPrompt() {
  return [
    "Extract every measurement from this laboratory report.",
    'Return JSON matching: {"rows":[{"name":"...","value":"...","unit":"..."}],"reportLanguage":"...","notes":"..."}',
    "Use the analyte names as printed. Keep the units as printed.",
  ].join("\n");
}

/**
 * Parse whatever the model returned into rows.
 *
 * On-device models occasionally wrap JSON in a code fence or add a sentence
 * before it. Neither is a reason to fail the whole extraction, so the parse
 * degrades: strict JSON first, then the first balanced object literal, then
 * nothing.
 */
export function parseModelJson(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return { ok: false, error: "empty response" };

  const direct = tryParse(raw);
  if (direct.ok) return direct;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const inner = tryParse(fenced[1].trim());
    if (inner.ok) return inner;
  }

  const braced = extractBalanced(raw);
  if (braced) {
    const inner = tryParse(braced);
    if (inner.ok) return inner;
  }

  return { ok: false, error: "no JSON object found in the model response" };
}

function tryParse(s) {
  try {
    const value = JSON.parse(s);
    return normalizeParsed(value);
  } catch {
    return { ok: false };
  }
}

function normalizeParsed(value) {
  const rows = Array.isArray(value?.rows) ? value.rows : Array.isArray(value) ? value : null;
  if (!rows) return { ok: false };
  const cleaned = rows
    .map((r) => ({
      name: String(r?.name ?? "").trim(),
      value: r?.value === undefined || r?.value === null ? "" : String(r.value).trim(),
      unit: String(r?.unit ?? "").trim(),
    }))
    .filter((r) => r.name && r.value);
  return {
    ok: true,
    rows: cleaned,
    reportLanguage: typeof value?.reportLanguage === "string" ? value.reportLanguage : undefined,
    notes: typeof value?.notes === "string" ? value.notes : undefined,
  };
}

function extractBalanced(s) {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
