# PhotoLoinc

Lab report photo → LOINC-coded FHIR observations, decoded on your device.

**Firebase #BuildHybridAI 2026** entry. See [../PROJECT.md](../PROJECT.md) for the
design rationale and the submission plan, and [../RULES.md](../RULES.md) for the
hackathon rules.

## The idea in one line

The model transcribes the photo; deterministic code assigns the LOINC code, converts
the unit and emits FHIR. Hybrid inference decides *where the reading happens*, and the
UI reports that choice on every run.

## Why the split

A 1B on-device model reads a photographed lab table well and remembers medical
terminology badly — and it fails confidently. Clinical coding has no room for a
confident wrong answer, so:

| layer | responsibility |
|---|---|
| Gemini Nano 4 | read the image, transcribe name / value / unit |
| `src/catalog.mjs` | 41 LOINC-verified analytes, alias index, unit families |
| `src/code.mjs` | resolve → convert → plausibility gate → FHIR |

Every code was verified against the NLM Clinical Tables LOINC service before being
committed. Nothing is written from memory.

## Run

```bash
node --test                    # 33 tests, zero dependencies
python3 -m http.server 8080
# open http://localhost:8080/index.html
# or http://localhost:8080/index.html?demo=1 for the bundled sample
```

No build step. Firebase comes from the CDN through an import map, so the source that
runs in development is the source that runs in production.

## Live inference

Edit `config.js`:

```js
window.__PHOTOLOINC_CONFIG__ = {
  firebase: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    appId: "...",
  },
  debugAppCheck: true,   // safelist the debug token in the Firebase console
  recaptchaKey: "",      // set for production App Check
};
```

Then, in the Firebase console: enable **AI Logic**, turn on **App Check** (register
the debug token first), and make sure the project's billing is set up if you plan to
use the cloud fallback beyond the free tier.

With `firebase: null` the app replays a recorded extraction of the bundled sample and
labels the run `sample · no inference ran`. It never pretends a model was called.

## Layout

```
index.html        shell + import map
app.mjs           UI controller (thin: all decisions live in src/)
styles.css
config.js         Firebase config, not a secret
sample.mjs        generated: base64 PNG + recorded transcript
public/
  sample-report.png
src/
  ai.mjs          Firebase AI Logic client, InferenceMode, inferenceSource mapping
  prompt.mjs      system instruction, response schema, tolerant JSON parsing
  loinc-data.mjs  the 41 verified analytes
  units.mjs       unit families and SI conversion factors
  catalog.mjs     indexes, alias resolution, molar conversions
  code.mjs        resolve / convert / plausibility / FHIR
  pipeline.mjs    rows in, report out
test/             node:test suites
scripts/
  make-sample.py  renders the sample lab report
```

## Two details that are easy to get wrong

**`initializeDeviceModel()` must follow a user gesture.** The local model is hundreds
of megabytes; starting that download on page load is blocked by the browser and
hostile to the user. The app waits for the click.

**`inferenceSource` must reach the UI.** A hybrid app that does not say which path ran
is claiming privacy it may not have. The badge is the product's honesty.

## Scope

Not a medical device. No diagnosis, no abnormality flagging. The reference ranges on
the sample are printed text the app deliberately ignores; the plausibility gates are
typo guards, not clinical intervals. Rows outside the 41-analyte catalog are listed as
not coded, with the reason, rather than approximated.

## License

Apache-2.0
