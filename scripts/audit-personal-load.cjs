// Verify old hashes before accepting changes confined to accounting fields.
const fs = require('node:fs'),
  vm = require('node:vm'),
  cp = require('node:child_process'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
// Both sides are read from Git so that later, intentional engine changes cannot invalidate this
// historical review: before = 2f8765e, after = 5681e48 (2026.10.21.04, the reviewed change).
const revision = '2f8765ed85a0582112f86fa3643ba6a78f2c5cb1',
  reviewedRevision = '5681e48',
  read = (file, at = revision) => cp.execFileSync('git', ['show', at + ':' + file], {encoding: 'utf8'});
const engineAt = at => {
  const rulesContext = {module: {exports: {}}};
  vm.runInNewContext(read('planif-rules.js', at), rulesContext);
  const context = {module: {exports: {}}, require: () => rulesContext.module.exports};
  vm.runInNewContext(read('planif-engine.js', at), context);
  return context.module.exports;
};
const old = engineAt(revision),
  current = engineAt(reviewedRevision),
  reviewed = require('../tests/fixtures/plans-after-personal-load.json').plans,
  rows = require('../tests/fixtures/plans-before-modules.json'),
  previous = require('../tests/fixtures/plans-after-assimilation.json').plans;
const keys = new Set([
  'load',
  'loadMin',
  'loadMax',
  'loadBreakdown',
  'bd',
  'density',
  'workLoad',
  'slLoad',
  'slLoadMin',
  'slLoadMax',
  'loadModel',
  'loadNotices',
  'safetyLoad'
]);
const json = x => JSON.parse(JSON.stringify(x)),
  hash = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function structure(x) {
  if (Array.isArray(x)) return x.map(structure);
  if (x && typeof x === 'object')
    return Object.fromEntries(
      Object.entries(x)
        .filter(([key]) => !keys.has(key))
        .map(([key, value]) => [key, structure(value)])
    );
  return x;
}
let weeks = 0,
  fallbackWeeks = 0;
const plans = [],
  ratios = [];
for (const [i, row] of rows.entries()) {
  const a = old.createEngine(),
    b = current.createEngine(),
    pred = b.predict({...row.st});
  assert.equal(hash(pred), row.prediction);
  const out = {};
  for (const kind of ['block', 'calendar']) {
    const fn = kind === 'block' ? 'buildPlan' : 'buildCalendar',
      st = {...row.st, ...(kind === 'calendar' ? {mode: 'cal'} : {})};
    const before = json(a[fn]({...st}, a.predict(st))),
      after = json(b[fn]({...st}, pred));
    assert.equal(hash(before), previous[i][kind], `old fixture ${i} ${kind}`);
    assert.deepEqual(structure(after), structure(before), `non-accounting change ${i} ${kind}`);
    for (const [j, w] of after.weeks.entries()) {
      assert(Number.isFinite(w.load) && w.load >= 0);
      assert(Math.abs(Object.values(w.loadBreakdown).reduce((x, y) => x + y, 0) - w.load) < 1e-7);
      assert.equal(w.heavy, before.weeks[j].heavy);
      assert.deepEqual(w.costly, before.weeks[j].costly);
      assert.equal(w.safetyLoad.load, before.weeks[j].load);
      weeks++;
      if (w.loadNotices.length) fallbackWeeks++;
      if (before.weeks[j].load) ratios.push(w.load / before.weeks[j].load);
    }
    out[kind] = hash(after);
    assert.equal(out[kind], reviewed[i][kind], `reviewed fixture ${i} ${kind}`);
  }
  plans.push(out);
}
const review = {
  historicalCommit: revision,
  reviewedCommit: reviewedRevision,
  plans: rows.length * 2,
  weeks,
  fallbackWeeks,
  minLoadRatio: Math.min(...ratios),
  maxLoadRatio: Math.max(...ratios),
  unchanged:
    'formats, minutes, paces, recovery, days, warnings, heavy-week classification and most-costly-session selection'
};
console.log(JSON.stringify(review, null, 2));
if (process.argv.includes('--write-reviewed'))
  fs.writeFileSync(
    'tests/fixtures/plans-after-personal-load.json',
    JSON.stringify({version: '2026.10.21.04', review, plans}, null, 2) + '\n'
  );
