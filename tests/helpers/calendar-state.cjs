// Calendar settings shared by unit and browser tests (10 km, 12 weeks). No browser dependency.
const STATE = {
  mode: 'cal',
  calStart: '2026-11-09',
  calRace: '2027-01-31',
  calDist: 1,
  calGoal: null,
  avail: [false, true, true, false, true, true, true],
  q1Day: '1',
  q2Day: '4',
  q3Day: '',
  slDay: '6',
  vma: 17,
  s2: 14,
  s1lo: 11.5,
  s1hi: 12,
  refDist: 0,
  refTime: 1165,
  profile: 1,
  penalty: false,
  ref2Dist: 1,
  ref2Time: null,
  vol: 300,
  runs: 5,
  qualityCount: 2,
  assimQ2: false
};
module.exports = {STATE};
