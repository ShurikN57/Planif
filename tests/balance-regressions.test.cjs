// Weekly balance rules of the engine: 35%/50% quality limits, consistent totals, adaptive jogs.
const assert = require('node:assert/strict'),
  {test} = require('node:test');
const E = require('../planif-engine.js');
const A = E.RULES.recovery.adaptiveFootings;
const base = {
  ...require('./fixtures/plans-before-modules.json')[0].st,
  mode: 'cal',
  calStart: '2026-10-19',
  calRace: '2027-01-10',
  calDist: 1,
  calGoal: null,
  vol: 300,
  runs: 3,
  qualityCount: 1,
  avail: [false, true, false, true, false, false, true],
  q1Day: '1',
  q2Day: '',
  q3Day: '',
  slDay: '6'
};
const build = st => E.buildCalendar(st, E.predict(st));
const charge = plan => plan.weeks.filter(w => !w.assim && !w.raceWeek && w.phase !== 'intro');
const check = w => {
  const q = w.sessions.filter(s => !s.isLong),
    minutes = Math.min(w.targetVolume ?? w.target, w.vol);
  assert(
    q.every(s => s.total <= minutes * 0.35 + 1e-7),
    'each whole quality fits 35%'
  );
  assert(q.reduce((n, s) => n + s.total, 0) <= minutes * 0.5 + 1e-7, 'whole qualities fit 50%');
  assert(
    Math.abs(
      w.vol - w.sl - w.foot.reduce((n, f) => n + f.min, 0) - w.sessions.reduce((n, s) => n + s.total, 0)
    ) < 1e-7
  );
  assert(Math.abs(w.vol - Object.values(w.z).reduce((a, b) => a + b, 0)) < 1e-7);
  assert(Math.abs(w.load - Object.values(w.loadBreakdown).reduce((a, b) => a + b, 0)) < 1e-7);
  for (const s of w.sessions) {
    const [a, b] = s.variants;
    assert(Math.abs(a.work - b.work) <= E.TOL(a.work) + 1e-7);
  }
};

test('an isolated jog absorbs missing volume up to 90 minutes and the shortfall is explained', () => {
  const isolated = charge(build(base));
  assert(
    isolated.some(w => w.foot.some(f => f.min === 90)),
    'Thursday can reach 90 minutes after Tuesday quality'
  );
  for (const w of isolated) {
    check(w);
    assert(w.foot.every(f => f.min <= 90));
    assert(
      w.warns.some(x => x.code === 'volume_short'),
      '5h remains incompatible and explained'
    );
  }
});

test('jogs on protected days stay within 45 minutes', () => {
  for (const avail of [
    [false, true, true, false, false, false, true],
    [false, true, false, false, false, true, true]
  ]) {
    const weeks = charge(build({...base, avail}));
    for (const w of weeks) {
      check(w);
      for (const f of w.foot.filter(f => f.contextProtected)) assert(f.min <= 45);
    }
  }
});

test('quality limits and totals hold across block and calendar plans', () => {
  let weeks = 0;
  for (const vol of [130, 150, 180, 230, 300, 420, 540])
    for (const runs of [3, 4, 5, 6, 7])
      for (const block of ['s1', 's2', 'vma', 'spec']) {
        const st = {...base, mode: 'bloc', vol, runs, block, qualityCount: 3, N: 4, specDist: 2};
        for (const w of E.buildPlan(st, E.predict(st)).weeks.filter(w => !w.assim)) {
          check(w);
          weeks++;
        }
      }
  for (const vol of [130, 230, 420])
    for (const runs of [3, 4, 7])
      for (const dist of [0, 1, 2, 3]) {
        const st = {
          ...base,
          vol,
          runs,
          calDist: dist,
          qualityCount: 3,
          avail: Array(7).fill(true),
          q1Day: '',
          q2Day: '',
          slDay: ''
        };
        for (const w of charge(build(st))) {
          check(w);
          weeks++;
        }
      }
  assert(weeks > 800, `${weeks} weeks checked`);
});

// The retired capacity preview used the prolongation limits in its estimate. Check the actual
// scheduled jogs after placement, when day constraints have been applied.
test('at most two jogs per week are extended beyond the normal maximum', () => {
  const avails = [
    [false, true, true, false, true, true, true],
    [false, true, true, false, false, false, true],
    Array(7).fill(true),
    [false, true, false, false, false, true, true]
  ];
  let weeks = 0,
    reached = false;
  for (const vol of [130, 230, 300, 420, 540, 660])
    for (const runs of [3, 5, 7])
      for (const qualityCount of [1, 2])
        for (const avail of avails)
          for (const w of charge(build({...base, vol, runs, qualityCount, avail}))) {
            const extended = w.foot.filter(f => !f.unplaced && f.min > A.normalMax).length;
            assert(extended <= A.maxProlonged, `${extended} extended jogs (vol ${vol}, ${runs} runs)`);
            reached ||= extended === A.maxProlonged;
            weeks++;
          }
  assert(weeks > 500 && reached, 'the limit is checked and actually reached');
});
