// Writes tests/fixtures/plans-week-signatures.json from the current engine, only after checking
// that every reviewed full fingerprint (plans-after-personal-load.json) is reproduced exactly.
// Run it after an intentional, reviewed planning change has updated the full fingerprints.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const engine = require('../planif-engine.js');
const {parisHash} = require('../tests/helpers/paris-dates.cjs');
const {planSignature} = require('../tests/helpers/plan-signatures.cjs');
const rows = require('../tests/fixtures/plans-before-modules.json');
const reviewed = require('../tests/fixtures/plans-after-personal-load.json');
const plans = rows.map((row, i) => {
  const e = engine.createEngine(),
    st = {...row.st},
    pred = e.predict(st),
    block = e.buildPlan({...st}, pred),
    calendar = e.buildCalendar({...st, mode: 'cal'}, pred);
  assert.equal(parisHash(pred), row.prediction, `prediction ${i}`);
  assert.equal(parisHash(block), reviewed.plans[i].block, `block ${i}: reviewed fingerprint not reproduced`);
  assert.equal(
    parisHash(calendar),
    reviewed.plans[i].calendar,
    `calendar ${i}: reviewed fingerprint not reproduced`
  );
  return {block: planSignature(block), calendar: planSignature(calendar)};
});
const out = {reviewed: 'plans-after-personal-load.json', version: reviewed.version, plans};
fs.writeFileSync(path.join(root, 'tests/fixtures/plans-week-signatures.json'), JSON.stringify(out) + '\n');
console.log(
  `Signatures written for ${plans.length} scenarios (${plans.reduce((n, p) => n + p.block.weeks.length + p.calendar.weeks.length, 0)} weeks).`
);
