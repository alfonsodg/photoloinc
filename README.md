# PhotoLoinc

Lab report photo → LOINC-coded FHIR observations, decoded on your device.

Firebase #BuildHybridAI 2026 entry — Best Web/Chrome App track. See
[PROJECT.md](./PROJECT.md) for the design rationale and submission plan.

## The app

```bash
cd photoloinc
node --test                    # 34 tests, no dependencies
python3 -m http.server 8080    # then open http://localhost:8080/index.html
```

Open `index.html?demo=1` to drive the bundled sample end to end. Full docs in
[photoloinc/README.md](./photoloinc/README.md).

## License

Apache-2.0 — see [photoloinc/LICENSE](./photoloinc/LICENSE).
