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
| `planif-html.js` | Shared `escapeHtml`, loaded first; every template inserting non-literal data uses it |
| `planif-backup.js` | Pure export/import of local data: backup format, validation and merge |
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

The same commands are available as `npm run check`, `npm test` and `npm run verify-live` (Node.js 22, see `.nvmrc`; `package.json` declares no dependency). CI runs on every branch push and pull request. The suite runs under `Europe/Paris`, `America/Los_Angeles` and `Pacific/Auckland`, all blocking; `npm run test:tz` reproduces this locally: it runs all three suites even when one fails, prints each result, and exits non-zero when any of them fails. Live-file verification runs only after the tests pass on `main`.

### Local storage

All data stays in the browser (`localStorage`, COROS tokens in `sessionStorage`). Settings → Outils offers **Exporter mes données** and **Importer une sauvegarde**; after the first active plan, the app asks for persistent storage (`navigator.storage.persist()`) and shows its state.

| Key | Content | Backup |
| --- | --- | --- |
| `planif-global-v1` | References and physiology (`GLOBAL_IDS`) | yes |
| `planif-block-draft-v1`, `planif-calendar-draft-v1` | Form drafts per mode | yes |
| `planif-active-plan-v1` | Active plan, with `dateZone` | yes |
| `planif-plan-history-v1` | Archived plans, with `dateZone` | yes |
| `planif-mode-v1`, `planif-weekly-balance-v2` | Mode, migration marker | yes |
| `planif-theme`, `planif-speed-unit`, `calc-allures-ui`, `calc-allures-tab`, `calc-allures-calview`, `planif-coros-profile-v1` | Preferences | yes |
| `planif-recovery-before-2026101706`, `planif-recovery-state-v1`, `planif-before-restore-*`, `planif-before-import-*` | Safety copies and recovery state | no |
| `planif-reference-plan-pending-v1` | Pending reference application | no (cleared on import) |
| `planif-coros-v1`, `planif-coros-capabilities-v1`, `planif-strava-auth-v1`, `planif-strava-records-v1:*` | Device and account data | no |
| `calc-allures-v7` | Legacy migration source | no |

The backup file (`format: planif-backup`, `schema: 1`) holds the raw storage strings of the exported keys (`PlanifBackup.KEYS`). Import refuses unknown keys, invalid plans, files over 8 MB, prototype keys and any `<` (Planif never writes one; templates insert saved text into HTML). Before writing, it stores a full copy of the current values under `planif-before-import-<timestamp>`, archives the current active plan after the imported history, keeps each record's `dateZone`, then reloads. A new exported key must be added to `PlanifBackup.KEYS` with its validation rule.

### Time zones

Engine calendars use `Date` objects at local midnight. Saved plans store them as ISO instants, which name a calendar day only together with the zone that wrote them. Since 2026.11.08.01, writes record `dateZone` (IANA name) via `serializeSavedPlans`, and `localizeSavedPlan` restores `date`, `start`, `startDate` and `endDate` to the same calendar days in the current zone. `dateZone` exists only in storage. Older plans can recover the writer offset from the race day in their settings. If that day is missing, the fallback uses matching local midnight or the nearest UTC midnight; without either a zone or a race day, very large offsets can be ambiguous. Day keys (`moves`, Strava links, completed sessions) remain unchanged. Tests compare local calendar days; historical fingerprints use `tests/helpers/paris-dates.cjs` to serialize dates as under Europe/Paris.

`module-equivalence.test.cjs` retains the original prediction fingerprints from version 2026.10.18.01. Planning fingerprints in `plans-after-balance.json` reflect the intentional 2026.10.18.03 corrections: contextual jog durations, whole-quality duration limits, minimum VO₂ preparation, equivalent mixed options and explicit placement context. The pre-extraction fixture remains available. `plans-after-assimilation.json` records the reviewed 2026.10.19.44 assimilation rules; both earlier fixtures are retained. Run `TZ=Europe/Paris node scripts/audit-planning-baseline.cjs` from a full Git checkout to reconstruct the historical engine, verify all old hashes, compare structures and prove that other-week differences originate only from assimilation history. See `AUDIT-2026-10-19.md`. Fixtures should change only for an intentional planning-rule change, with its expected differences reviewed.

Whole quality sessions (including preparation, recovery and cooldown) are limited to 35% individually and 50% combined, against both the target and actual charge-week volume. Marathon long runs and race/taper weeks retain their own rules. An isolated normal jog may absorb missing volume after calendar placement, up to 90 minutes, with at most two prolonged jogs. The settings screen displays a live capacity estimate for the current sessions and days, not a universal maximum by outing count.

The CSP permits a SHA-256 hash for the inline theme bootstrap; any change to that script requires updating its hash in the HTML policy. Firebase SDK tags pin version 10.14.1 with SHA-384 integrity hashes (verified against the published SDK bytes). Preserve COROS regional endpoints and Firebase Auth endpoints when adjusting the policy. Storage preference failures are logged; failed plan writes also show a visible warning.

Engine tests import the actual module. UI persistence integration is isolated in `tests/helpers/runtime.cjs`.

For a release, run `npm run version:bump` (next `AAAA.MM.JJ.NN` for today) or `npm run version:bump -- 2026.11.08.01 --label <cache-label>`. The script updates `planif-version.js`, the versioned script URLs in `index.html`, the scientific JSON URL in `planif-ui.js`, and the service-worker cache name and shell, and refuses to write if these locations already disagree or the new version is not later. `npm run version:check` (also enforced by `tests/version.test.cjs`) verifies consistency. Once the version change reaches `main`, `.github/workflows/release.yml` reruns the checks and creates tag `v<version>` with a GitHub Release; it can also be started manually (Actions → Release Planif → Run workflow) and does nothing if the tag exists. Verify that all public files match the commit after deployment. Changes affecting future sessions must preserve the existing plan and archive it before recalculation. Organizational thresholds remain identified as Planif heuristics in rule metadata.

Since 2026.10.21.04, public program loads use the shared personalized calculator model. Historical accounting remains internal to scheduling safety; do not replace its thresholds with the lower public scores. See `AUDIT-PERSONAL-LOAD.md` and run `TZ=Europe/Paris node scripts/audit-personal-load.cjs` before changing the reviewed `plans-after-personal-load.json` fixture.

Since 2026.10.21.06, `recalculatePlanSummary` reconciles reporting against placed calendar items, rather than potentially stale weekly lists/counters. Quality minutes sum the first option's work parts (including distance-based and mixed workouts), excluding warmup/recovery and active endurance; long-run S1 and race work are included. Percentages use placed planned volume. All displayed weeks use current personalized coefficients, including past/completed weeks. The original active plan is archived once before the summary-version-2 migration; dates, IDs, formats, paces and validations remain intact. Subsequent mobile rendering reconciles a revived copy only. The existing preservation-aware accounting API and scheduling guards remain unchanged. Points describe prescribed load, not load measured from linked activities.

Since 2026.10.21.10, `reviewBlockLoads` reviews a detached copy of the placed plan. The primary workout maximizes work specific to the block, averaged across options; its whole-session share and targeted-work share use the same personalized weekly denominator. Mixed components and AS10 mixed/alternating race segments are separated. Blocks expose descriptive progression in Calendar → Chronologie and in the primary workout detail. A >5% fall in targeted points is an advisory Planif heuristic; a block change, partial week, capacity adjustment, assimilation or taper resets normal progression comparisons. Assimilation compares total points to the preceding charge week separately. No workout is enlarged or removed to satisfy a score.

S2 observed bands in `RULES.load.blockReview` come from the reproducible 705-plan synthetic audit: 3 speed levels, 3–7 hours, 3–6 outings, 1–3 qualities, four charge weeks plus assimilation, and 27-week calendars over four race distances. Each calibration cell retains at least eight volume-compatible weeks with requested outings/qualities; intervals are outward-rounded 10th–90th percentiles. Only interpolate between audited volumes of the same outings/quality configuration; never extrapolate or apply these bands to other blocks. These are descriptive engine-calibration hypotheses, not scientific training recommendations. Run `TZ=Europe/Paris node scripts/audit-block-load.cjs`; it verifies every stored calibration cell and that reviewing all 705 plans changes none of their input data. Existing planning fixtures remain untouched.
