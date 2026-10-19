# Planif development

The application remains a static PWA hosted by GitHub Pages. It has no build step or runtime package dependency.

| File | Responsibility |
| --- | --- |
| `index.html` | Markup, styles, theme bootstrap and script order |
| `planif-version.js` | Application version |
| `planif-rules.js` | Planning parameters |
| `planif-engine.js` | Prediction, workout generation, calendars, placement and pure presentation helpers |
| `planif-studies.json` | Scientific sources and extracted findings |
| `planif-evidence.js` | Questions, rule metadata and integrity audit |
| `planif-ui.js` | User interface, local persistence, recovery and archived plans |
| `planif-coros.js` | COROS connection, workout preview and export adapter |
| `planif-strava.js` | Athlete connection and activity association |
| `planif-calendar-drag.js` | Calendar pointer interaction |
| `sw.js` | Versioned offline application cache |

## Engine entry point

`require('./planif-engine.js').createEngine()` creates an independent engine instance in Node. The browser uses the same file through `globalThis.PlanifEngine`. The engine does not access the DOM or local storage.

The optional `getActivePlan` and `hasSameStructure` callbacks supply the active calendar when regenerating a saved plan. The UI owns this state. Tests can supply a saved plan without simulating the application form.

Scientific data are loaded before UI initialization. Strava initializes after its UI context is available. All required scripts and the scientific JSON are included in the service-worker shell.

## Verification

```sh
node scripts/check-syntax.cjs
TZ=Europe/Paris node --test tests/*.test.cjs
node scripts/verify-live.cjs
```

`module-equivalence.test.cjs` retains the original prediction fingerprints from version 2026.10.18.01. Planning fingerprints in `plans-after-balance.json` reflect the intentional 2026.10.18.03 corrections: contextual jog durations, whole-quality duration limits, minimum VO₂ preparation, equivalent mixed options and explicit placement context. The pre-extraction fixture remains available. `plans-after-assimilation.json` records the reviewed 2026.10.19.44 assimilation rules; both earlier fixtures are retained. Run `TZ=Europe/Paris node scripts/audit-planning-baseline.cjs` from a full Git checkout to reconstruct the historical engine, verify all old hashes, compare structures and prove that other-week differences originate only from assimilation history. See `AUDIT-2026-10-19.md`. Fixtures should change only for an intentional planning-rule change, with its expected differences reviewed.

Whole quality sessions (including preparation, recovery and cooldown) are limited to 35% individually and 50% combined, against both the target and actual charge-week volume. Marathon long runs and race/taper weeks retain their own rules. An isolated normal jog may absorb missing volume after calendar placement, up to 90 minutes, with at most two prolonged jogs. The settings screen displays a live capacity estimate for the current sessions and days, not a universal maximum by outing count.

The CSP permits a SHA-256 hash for the inline theme bootstrap; any change to that script requires updating its hash in the HTML policy. Firebase SDK tags pin version 10.14.1 with SHA-384 integrity hashes (verified against the published SDK bytes). Preserve COROS regional endpoints and Firebase Auth endpoints when adjusting the policy. Storage preference failures are logged; failed plan writes also show a visible warning.

Engine tests import the actual module. UI persistence integration is isolated in `tests/helpers/runtime.cjs`.

For a release, update `planif-version.js`, versioned script URLs in `index.html`, the scientific JSON URL in `planif-ui.js`, and the service-worker shell/version. Verify that all public files match the commit after deployment. Changes affecting future sessions must preserve the existing plan and archive it before recalculation. Organizational thresholds remain identified as Planif heuristics in rule metadata.
