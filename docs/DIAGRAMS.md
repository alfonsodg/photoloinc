# PhotoLoinc — Diagrams

Architecture and data flow. The code is the source of truth; these diagrams
summarize `photoloinc/` for the demo and the Devpost write-up.

## Hybrid inference flow

How a photo becomes a coded report, and where the honesty badge comes from.

```mermaid
flowchart TD
    A[Drop a lab report photo] --> B{Firebase configured?}
    B -- No --> S[Replay recorded transcript<br/>badge: sample · no inference ran]
    B -- Yes --> C{On-device model ready?}
    C -- "Forced or unavailable" --> D[Confirm dialog:<br/>name, ID, physician leave the device]
    D -- Decline --> X[Abort: photo never left]
    D -- Accept --> E[generateContent in cloud<br/>badge: cloud fallback]
    C -- Available --> F[generateContent on-device<br/>badge: on-device]
    E --> G[parseModelJson: strict, fenced, or balanced]
    F --> G
    S --> G
    G --> H[code.mjs: resolve - convert - plausibility]
    H --> I[Rejected rows listed with reason]
    H --> J[Coded table + FHIR R4 + JSON/CSV/text]
```

Key files: `app.mjs` (lifecycle, badge), `src/ai.mjs` (`PREFER_ON_DEVICE`,
`inferenceSource`), `src/prompt.mjs` (schema, tolerant parsing),
`src/code.mjs` + `src/catalog.mjs` + `src/units.mjs` (deterministic coding),
`src/pipeline.mjs` (report), `ui-*.mjs` (intake, render, exports, status).

## Deterministic coding gates (per row)

The model transcribes; it never assigns a code. Each row passes three gates;
a rejection is a first-class result that reaches the UI.

```mermaid
flowchart LR
    R[Row: name, value, unit] --> N{Name resolves to exactly one entry?}
    N -- No --> R1[rejected:<br/>analyte not in catalog]
    N -- Yes --> U{Unit converts by<br/>declared factor?}
    U -- No --> R2[rejected:<br/>unrecognized / no conversion]
    U -- Yes --> P{Value physiologically<br/>plausible?}
    P -- No --> R3[rejected:<br/>implausible, decimal slip?]
    P -- Yes --> O[Observation + FHIR]
    O --> BP{Systolic + diastolic<br/>both coded?}
    BP -- Yes --> PNL[Panel 85354-9<br/>two components]
    BP -- No --> T[Table, CSV, JSON, text]
```

Notes:

- Urea mass (3091-6) and urea nitrogen (3094-0) are separate entries: urea
  mg/dL = BUN mg/dL x 2.14, never 1:1.
- Molar mass-to-substance conversion exists only for the six declared
  analytes; anything else is rejected, not guessed.
- Vitals carry the `vital-signs` category; chemistry keeps `laboratory`.
- No subject is passed, so the FHIR output carries no Patient reference.
