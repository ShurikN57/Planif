// Weekly capacity estimate and advice for Volume et charge (decision 0008).
const assert = require('node:assert/strict'),
  {test} = require('node:test');
const E = require('../planif-engine.js');
const AF = E.RULES.recovery.adaptiveFootings;
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
  q1Day: '1',
  q2Day: '',
  q3Day: '',
  slDay: '6'
};
const build = st => E.buildCalendar(st, E.predict(st));
const isCharge = w =>
  !w.assim && !w.assimilation && !w.raceWeek && w.phase !== 'intro' && w.phase !== 'taper';
const firstCharge = C => C.weeks.find(isCharge);
const total = w => w.sessions.reduce((n, s) => n + s.total, 0);

test('known synthetic weeks: only normal jogs on unprotected days can still grow', () => {
  // 3 normal jogs at 60: two may reach 90, one 70 -> +30 +30 +10. Protected, recovery and active
  // jogs and an unplaced jog add nothing.
  const week = {
    vol: 300,
    targetVolume: 300,
    foot: [
      {type: 'std', min: 60},
      {type: 'std', min: 60},
      {type: 'std', min: 60},
      {type: 'rec', min: 40},
      {type: 'active', min: 35},
      {type: 'std', min: 40, contextProtected: true},
      {type: 'std', min: 50, unplaced: true}
    ]
  };
  assert.equal(E.weeklyCapacity(week), 370);
  // An already extended jog keeps one of the two long slots: 90-85 + 90-60 + 70-60.
  assert.equal(
    E.weeklyCapacity({
      ...week,
      foot: [
        {type: 'pro', min: 85},
        {type: 'std', min: 60},
        {type: 'std', min: 60}
      ]
    }),
    345
  );
  // A week the engine left under its target (beyond 2.5%) is at its maximum: its built volume.
  assert.equal(E.weeklyCapacity({...week, vol: 250}), 250);
  // Within the tolerance it is not considered short.
  assert.equal(E.weeklyCapacity({...week, vol: 295}), 365);
  assert.equal(E.weeklyCapacity({vol: NaN}), null);
});

test('known engine weeks: capped jog at 90, recovery jog and protected jog at 45', () => {
  const cases = [
    // Tuesday quality, Thursday jog, Sunday long run: the Thursday jog reaches absoluteMax.
    {avail: [false, true, false, true, false, false, true], jog: {min: AF.absoluteMax, protected: false}},
    // Wednesday jog after the Tuesday quality: a recovery jog, kept at 45.
    {avail: [false, true, true, false, false, false, true], jog: {min: 45, type: 'rec', protected: false}},
    // Saturday jog before the Sunday long run: protected day, capped at protectedMax.
    {avail: [false, true, false, false, false, true, true], jog: {min: AF.protectedMax, protected: true}}
  ];
  for (const {avail, jog} of cases) {
    const w = firstCharge(build({...base, avail}));
    assert.equal(w.foot.length, 1);
    const [f] = w.foot;
    assert.equal(f.min, jog.min, avail.join());
    assert.equal(!!f.contextProtected, jog.protected, avail.join());
    if (jog.type) assert.equal(f.type, jog.type);
    // The target (295) is out of reach: the estimate is exactly quality + long run + capped jog.
    assert(w.vol < (w.targetVolume ?? w.target) * 0.975);
    assert(Math.abs(E.weeklyCapacity(w) - (total(w) + w.sl + jog.min)) < 1e-9, avail.join());
  }
});

test('the estimate never exceeds what the engine builds for a short week, nor falls below a built week', () => {
  const avails = [
    [false, true, false, true, false, false, true],
    [false, true, true, false, true, true, true],
    Array(7).fill(true),
    [false, true, false, false, false, true, true]
  ];
  let weeks = 0,
    short = 0;
  for (const vol of [130, 230, 300, 420, 540, 660])
    for (const runs of [3, 5, 7])
      for (const qualityCount of [1, 2])
        for (const avail of avails) {
          const st = {...base, vol, runs, qualityCount, avail, q1Day: '', slDay: ''};
          if (E.inputErrors(st).length) continue;
          const C = build(st);
          if (C.error) continue;
          for (const w of C.weeks.filter(isCharge)) {
            const capacity = E.weeklyCapacity(w),
              target = w.targetVolume ?? w.target;
            assert(capacity >= w.vol - 1e-9, 'built volume <= capacity');
            if (w.vol < target * 0.975) {
              assert.equal(capacity, w.vol, 'short week: capacity = built volume');
              short++;
            }
            weeks++;
          }
        }
  assert(weeks > 500 && short > 50, `${weeks} weeks, ${short} short`);
});

test('averages use the same charge weeks and their own targets', () => {
  const st = {...base, avail: [false, true, false, true, false, false, true]};
  const C = build(st),
    weeks = C.weeks.filter(isCharge);
  const summary = E.capacitySummary(C);
  const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
  assert.equal(summary.weeks, weeks.length);
  assert(weeks.length < C.weeks.length, 'assimilation and race weeks are excluded');
  assert(Math.abs(summary.target - mean(weeks.map(w => w.targetVolume ?? w.target))) < 1e-9);
  assert(Math.abs(summary.capacity - mean(weeks.map(E.weeklyCapacity))) < 1e-9);
  assert.notEqual(summary.target, st.vol, 'charge-week targets, not the settings value');
  // Block plans have no placed days.
  const block = {...base, mode: 'bloc', block: 's1', N: 4};
  assert.equal(E.capacitySummary(E.buildPlan(block, E.predict(block))), null);
});

test('advice: none when reachable, extra outing only when admissible and useful', () => {
  const advice = st => E.capacityAdvice(st, build(st));
  // Reachable target: no message.
  assert.equal(
    advice({...base, vol: 240, runs: 4, avail: [false, true, true, true, false, true, true]}),
    null
  );
  // Out of reach with no free day: reduce the target only.
  const noDay = advice({...base, avail: [false, true, false, true, false, false, true]});
  assert(noDay && noDay.capacity < noDay.target && noDay.extraRun === false);
  // Free days and a fourth outing that can be placed and raises the estimate.
  const freeDays = advice({...base, avail: [false, true, true, true, true, true, true]});
  assert(freeDays && freeDays.extraRun === true);
  // A free day exists, the sixth outing is placed, but the estimate does not increase: no suggestion.
  const useless = advice({
    ...base,
    vol: 600,
    runs: 5,
    qualityCount: 2,
    q1Day: '',
    slDay: '',
    avail: [false, true, true, true, true, true, true]
  });
  assert(useless && useless.extraRun === false);
  // Seven outings: nothing to add.
  const seven = {
    ...base,
    vol: 900,
    runs: 7,
    qualityCount: 2,
    q1Day: '',
    slDay: '',
    avail: Array(7).fill(true)
  };
  if (!E.inputErrors(seven).length) assert.notEqual(advice(seven)?.extraRun, true);
});

test('advice leaves the plan and its targets untouched', () => {
  const st = {...base, avail: [false, true, true, true, true, true, true]},
    C = build(st),
    before = JSON.stringify(C),
    settings = JSON.stringify(st);
  E.capacityAdvice(st, C);
  assert.equal(JSON.stringify(C), before);
  assert.equal(JSON.stringify(st), settings);
});
