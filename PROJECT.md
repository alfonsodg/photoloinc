# PhotoLoinc — lab report photo → LOINC-coded FHIR, on your device

Firebase #BuildHybridAI 2026 · Best Web/Chrome App track

- **Event**: Firebase #BuildHybridAI 2026 → [RULES.md](./RULES.md)
- **Deadline**: 30 Nov 2026, 14:00 PST
- **Target prize**: Best Web/Chrome App, $3,000 (and Grand Prize if the demo lands)
- **Platform**: Web / Chrome — hybrid inference with Firebase AI Logic
- **Code**: `./photoloinc`

---

## The one-sentence pitch

A photograph of a lab report comes out as LOINC-coded FHIR observations, decoded on
the laptop by Gemini Nano — and the app tells you, every single time, whether that
happened locally or in the cloud.

## Why this idea, specifically for this hackathon

The rules reward two things above all: that hybrid inference is **structurally
necessary** rather than bolted on, and that the problem is **real for a real
audience**. Most hybrid-inference demos are note summarizers, because summarization
is the easiest thing to hand to any model.

Health records are the opposite of that: they are the one category of document where
sending the image to a datacenter is a genuine, defensible objection. A patient
photographing a lab printout has no idea where it goes. So the hybrid split is not
decoration here — it is the product's whole argument.

And the second half of the product — turning "Glucosa 92 mg/dL" into a correct LOINC
code with the right unit and a FHIR resource — is the part that everyone gets wrong
and no chatbot does reliably.

## What it does

1. **Photograph** — user drops or selects a photo of a lab report (JPEG/PNG).
2. **Extract** — the on-device model transcribes every measurement it can read:
   analyte name as printed, value, unit as printed. It is asked for nothing else.
3. **Code** — a deterministic engine resolves the name against a verified LOINC
   catalog, converts the unit by declared factors only, sanity-checks physiological
   plausibility, and emits FHIR R4 `Observation` resources.
4. **Report** — the table shows the LOINC code, the coded value and unit, and the
   source text side by side, plus an explicit list of rows that could **not** be
   coded and why.
5. **Export** — JSON, FHIR bundle, CSV, or clipboard text.

## The architectural decision that makes it work

> The model transcribes. It never assigns a code.

A 1B-parameter on-device model is genuinely good at reading a photographed table and
genuinely bad at remembering terminology — and it fails confidently, which in a
clinical context is worse than failing visibly. So the responsibilities split:

| layer | does | never does |
|---|---|---|
| Gemini Nano 4 | read the image, transcribe name/value/unit | emit a LOINC code, convert a unit, judge normality |
| `catalog.mjs` | 42 verified analytes, alias index, unit families | touch the image |
| `code.mjs` | resolve → convert → plausibility gate → FHIR | guess a conversion it has no factor for |

Every LOINC code in the catalog was verified against the NLM Clinical Tables LOINC
service before being committed. A wrong code silently mislabels a clinical result;
nothing is written from memory.

Three gates run per row, and a rejection is a first-class result that reaches the UI:

1. **name** — must resolve to exactly one catalog entry
2. **unit** — must convert by a declared factor; `mg/dL → mmol/L` is only allowed for
   the six analytes with a standard molar constant, never inferred
3. **range** — the converted value must be physiologically plausible (a hemoglobin of
   140 g/dL is a decimal slip, not a patient)

The result: 22 of 23 rows coded on the bundled sample, with the one miss named
(`Hierro serico — analyte not in catalog`) rather than dropped.

## Hybrid inference, honestly implemented

`InferenceMode.PREFER_ON_DEVICE` on a single `GenerativeModel`. The SDK runs locally
when a local model exists and falls back to the cloud when it does not — no branching
in application code.

What matters is that the fallback is **visible**:

- The header status reports the device's actual capability before any upload.
- The result badge reads `on-device · image stayed here` or
  `cloud fallback · image left the device`.
- The `?demo=1` replay path, used when a build has no credentials, labels itself
  `sample · no inference ran`.

An app that claims privacy while silently falling back is lying. This one prints
which way each request went.

## Firebase products used

| product | role |
|---|---|
| **AI Logic (Hybrid Inference)** | Gemini Nano 4 on-device, cloud fallback, `inferenceSource` reported to the UI |
| **App Check** | required by AI Logic; debug token in dev, reCAPTCHA v3 in production |

Deliberately minimal. Firestore and Auth buy nothing for a single-session tool, and
adding them to look thorough is the kind of thing a judge notices.

## Judging criteria, mapped

| criterion | where it shows |
|---|---|
| **Technological Implementation** | hybrid inference is load-bearing; `inferenceSource` drives the UI; deterministic coding layer with 33 tests |
| **Design** | a real product surface: intake, capability badge, coded table with provenance, explicit non-coded list, four export paths, mobile breakpoint |
| **Potential Impact** | health data that stays on the patient's machine; a measured 96% coding rate on a realistic Latin American report; unit conversion and plausibility checks that catch OCR errors |
| **Quality of the Idea** | the split between "the model reads" and "the code codes" is a genuine insight, not a wrapper |

## Demo script (≤ 3 minutes, hard limit)

The rules state that only the first 3 minutes are evaluated. Timing:

| t | beat |
|---|---|
| 0:00–0:20 | "This is a lab report. It has my name, my DNI, my results. Right now, every app that reads it uploads it." Drop the photo. |
| 0:20–0:40 | Status badge: **on-device model ready**. Say the line: the image never left this laptop. |
| 0:40–1:05 | Extraction runs. Real latency on screen. |
| 1:05–1:45 | The coded table. Point at `2345-7 · 92 · mg/dL · Glucose` and the source column showing `Glucosa en ayunas 92 mg/dL`. Explain the split: the model transcribed, the catalog coded. |
| 1:45–2:10 | `Creatinina 1,1` — decimal comma, converted correctly. Then the rejection list: `Hierro serico — analyte not in catalog`. Say why: a wrong code is worse than an honest gap. |
| 2:10–2:35 | Download the FHIR bundle, show the `Observation` resource. One click and it is interoperable. |
| 2:35–2:55 | Open Chrome with the model component removed: badge flips to **cloud fallback · image left the device**. "Same code, one flag, and it tells you the truth." |
| 2:55–3:00 | Close on the split: privacy where it is possible, capability where it is not — and never a lie about which. |

## Submission checklist

- [x] Public repo with license visible in the About section — Apache-2.0
- [x] Firebase AI Logic imported **and called at runtime** (`src/ai.mjs` → `getGenerativeModel` → `generateContent`)
- [x] Works with a debug App Check token (allowed by the rules)
- [x] Text runs in English
- [x] Free, no paywall
- [x] Web/Chrome platform selected
- [ ] Demo video, ≤ 3 min, public on YouTube
- [ ] Deployed URL (strongly recommended)
- [ ] Devpost write-up: how AI Logic was used, feature summary, value proposition
- [ ] Firebase project + `config.js` filled with the real config (root file, loaded by `index.html`; `firebase.json` maps it for hosting)

## What is not claimed

- Not a medical device, not a diagnosis tool, and the UI says so.
- Reference ranges printed on the report are shown as source text; the app does not
  compare against them or flag anything as abnormal.
- 42 analytes is a deliberate scope, not a limitation being hidden: the rejection
  list makes every gap visible.
- The plausibility ranges are typo guards, not clinical reference intervals.

## Why this can win Best Web/Chrome

That prize is a short race: the Grand Prize pool is where the multi-platform,
six-week-polish projects go, while the platform awards often go unclaimed by
comparison. A web app has no emulator, no Mac, no store review — it is the one track
where a well-executed submission in the remaining days is genuinely competitive.

## Run it

```bash
cd photoloinc
node --test                    # 33 tests, no dependencies
python3 -m http.server 8080    # then open http://localhost:8080/index.html
```

Open `index.html?demo=1` to drive the bundled sample end to end. With
`public/config.js` empty the app replays a recorded extraction and labels it as such;
fill in the Firebase config to switch to live hybrid inference.
