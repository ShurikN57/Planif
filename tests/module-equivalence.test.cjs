// Reviewed planning fingerprints (126 scenarios, block and calendar plans) and original predictions.
// A mismatch names the scenario, the plan kind and the first differing weeks (audit TST-2).
const assert = require('node:assert/strict'),
  {test} = require('node:test');
const engine = require('../planif-engine.js');
const baseline = require('./fixtures/plans-before-modules.json');
// Reviewed by scripts/audit-personal-load.cjs against every prior hash and every non-accounting
// field; previous fixtures remain available.
const updated = require('./fixtures/plans-after-personal-load.json').plans;
// Week-level signatures of the same plans (npm run fixtures:signatures).
const signatures = require('./fixtures/plans-week-signatures.json');
// Dates are serialized as under Europe/Paris, where the fingerprints were recorded.
const {parisHash: hash} = require('./helpers/paris-dates.cjs');
const {planSignature, weekSummary} = require('./helpers/plan-signatures.cjs');

const generated = baseline.map(row => {
  const e = engine.createEngine(),
    st = {...row.st},
    prediction = e.predict(st);
  return {
    st,
    prediction,
    block: e.buildPlan({...st}, prediction),
    calendar: e.buildCalendar({...st, mode: 'cal'}, prediction)
  };
});

const scenarioLabel = st =>
  [
    st.mode === 'cal' ? `calendrier ${st.calStart}→${st.calRace}` : `bloc ${st.block || ''}`,
    `${st.vol} min`,
    `${st.runs} sorties`,
    `${st.qualityCount} qualités`
  ].join(', ');

function explain(i, kind, plan) {
  const expected = signatures.plans[i]?.[kind],
    actual = planSignature(plan),
    lines = [`scénario ${i} (${scenarioLabel(generated[i].st)}), plan ${kind} :`];
  if (!expected) return lines.concat('  pas de signature de semaine enregistrée').join('\n');
  if (actual.top !== expected.top)
    lines.push(
      `  champs hors semaines modifiés (${Object.keys(plan)
        .filter(k => k !== 'weeks')
        .join(', ')})`
    );
  if (actual.weeks.length !== expected.weeks.length)
    lines.push(`  nombre de semaines : ${expected.weeks.length} attendu, ${actual.weeks.length} obtenu`);
  const changed = actual.weeks.map((w, j) => (w !== expected.weeks[j] ? j : -1)).filter(j => j >= 0);
  for (const j of changed.slice(0, 5))
    lines.push(`  semaine ${j + 1} modifiée : ${weekSummary(plan.weeks[j])}`);
  if (changed.length > 5) lines.push(`  … et ${changed.length - 5} autre(s) semaine(s)`);
  if (lines.length === 1)
    lines.push('  empreinte globale différente mais signatures identiques : régénérer les signatures');
  return lines.join('\n');
}

function checkKind(kind) {
  const failures = [];
  for (const [i, g] of generated.entries())
    if (hash(g[kind]) !== updated[i][kind]) failures.push(explain(i, kind, g[kind]));
  assert.equal(
    failures.length,
    0,
    `${failures.length} plan(s) ${kind} différent(s) des empreintes revues :\n${failures.slice(0, 10).join('\n')}` +
      (failures.length > 10 ? `\n… ${failures.length - 10} autre(s)` : '') +
      '\nUn changement voulu des règles se valide avec le script d’audit correspondant, puis npm run fixtures:signatures.'
  );
}

test('every historical scenario remains covered', () => {
  assert.equal(updated.length, baseline.length);
  assert.equal(signatures.plans.length, baseline.length);
  assert.equal(signatures.reviewed, 'plans-after-personal-load.json');
});

test('original prediction fingerprints are unchanged', () => {
  const failures = generated.flatMap((g, i) => (hash(g.prediction) === baseline[i].prediction ? [] : [i]));
  assert.deepEqual(failures, [], `prévisions modifiées pour les scénarios ${failures.join(', ')}`);
});

test('block plans match the reviewed fingerprints', () => checkKind('block'));
test('calendar plans match the reviewed fingerprints', () => checkKind('calendar'));

test('week signatures agree with the reviewed fingerprints', () => {
  // Stale signatures would make the diagnostics above misleading.
  for (const [i, g] of generated.entries())
    for (const kind of ['block', 'calendar'])
      if (hash(g[kind]) === updated[i][kind])
        assert.deepEqual(planSignature(g[kind]), signatures.plans[i][kind], `signatures ${i} ${kind}`);
});

test('scientific studies load as JSON with an intact rule audit', () => {
  const studies = require('../planif-studies.json');
  const evidence = require('../planif-evidence.js').createEvidence(studies);
  assert(studies.SOURCES.length > 20 && studies.FINDINGS.length > 0);
  assert(
    evidence.auditIntegrity([]).every(x => !x.includes('source inconnue') && !x.includes('résultat inconnu'))
  );
});
