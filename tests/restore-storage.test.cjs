// Restoring a saved plan must not fill the browser storage, and earlier full copies are compacted
// without losing a plan (storage quota exceeded on iPhone, 2026-11-09).
const assert = require('node:assert/strict'),
  vm = require('node:vm'),
  {test} = require('node:test');
const {loadRuntime, uiSource: html} = require('./helpers/runtime.cjs');
const {between, functionSource} = require('./helpers/source.cjs');
const engine = require('../planif-engine.js');
const {STATE} = require('./e2e/helpers.cjs');

const plan = (id, extra = {}) => {
  const C = engine.buildCalendar(STATE, engine.predict(STATE));
  engine.ensurePlanifSessionIds(C);
  return {
    id,
    title: `Plan ${id}`,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
    structure: {calDist: '1', calRace: STATE.calRace, calStart: STATE.calStart},
    plan: JSON.parse(JSON.stringify(C)),
    ...extra
  };
};

// localStorage with a size limit counted like Safari (UTF-16: two bytes per character).
function app({quotaBytes = Infinity, stored = {}} = {}) {
  const data = new Map(Object.entries(stored));
  const size = () => [...data].reduce((n, [k, v]) => n + (k.length + String(v).length) * 2, 0);
  const elements = new Map();
  const el = id => {
    if (!elements.has(id))
      elements.set(id, {
        value: '',
        checked: false,
        type: id.startsWith('mode') ? 'radio' : 'text',
        appendChild() {},
        addEventListener() {}
      });
    return elements.get(id);
  };
  const localStorage = {
    get length() {
      return data.size;
    },
    key: i => [...data.keys()][i] ?? null,
    getItem: k => data.get(k) ?? null,
    removeItem: k => data.delete(k),
    setItem: (k, v) => {
      const previous = data.get(k);
      data.set(k, String(v));
      if (size() > quotaBytes) {
        if (previous === undefined) data.delete(k);
        else data.set(k, previous);
        const error = new Error('The quota has been exceeded.');
        error.name = 'QuotaExceededError';
        throw error;
      }
    }
  };
  const ctx = {document: {getElementById: el, createElement: () => ({})}, localStorage, console};
  vm.createContext(ctx);
  loadRuntime(ctx);
  vm.runInContext(functionSource(html, 'refPendingLoad'), ctx);
  vm.runInContext(
    between(html, 'savedPlanEntries', 'themeButtonText') +
      `
this.api={load,restore:restoreSavedPlanRecord,keys:STORE,defaults:()=>({...DEFAULTS}),
  active:()=>activePlan,history:()=>planHistory,recovery:()=>recoveryState};`,
    ctx
  );
  return {api: ctx.api, data, size};
}

const seed = (data, api, active, history) => {
  data.set(api.keys.active, engine.serializeSavedPlans(active));
  data.set(api.keys.history, engine.serializeSavedPlans(history));
  data.set(api.keys.global, JSON.stringify({...api.defaults(), vma: '17', refTime: '19:25'}));
  data.set(api.keys.mode, 'cal');
  data.set('planif-weekly-balance-v2', 'saved');
};
const restoreCopies = data => [...data.keys()].filter(k => k.startsWith('planif-before-restore-'));

test('repeated restorations write no extra copy and keep the storage bounded', () => {
  const {api, data, size} = app();
  seed(data, api, plan('a'), [plan('b', {archivedAt: '2026-10-05T10:00:00.000Z'})]);
  api.load();
  const sizes = [];
  for (const id of ['b', 'a', 'b', 'a', 'b']) {
    const record = api.history().find(p => p.id === id);
    api.restore(record);
    assert.equal(api.active().id, id);
    sizes.push(size());
  }
  assert.deepEqual(restoreCopies(data), []);
  // Each restoration archives the replaced plan once more; the storage grows by about one plan,
  // never by a copy of the whole history.
  const growth = sizes.slice(1).map((s, i) => s - sizes[i]);
  const onePlan = engine.serializeSavedPlans(plan('x')).length * 2;
  assert(
    growth.every(g => g < onePlan * 1.2),
    `growth per restoration ${growth} vs one plan ${onePlan}`
  );
});

test('restoring still works when the storage was nearly full of old copies', () => {
  const active = plan('a'),
    history = [plan('b', {archivedAt: '2026-10-05T10:00:00.000Z'})];
  const copy = JSON.stringify({
    savedAt: '2026-11-01T10:00:00.000Z',
    values: {
      'planif-active-plan-v1': engine.serializeSavedPlans(active),
      'planif-plan-history-v1': engine.serializeSavedPlans(history)
    }
  });
  const onePlan = engine.serializeSavedPlans(active).length * 2;
  // Room for the plans and three old copies, but not for a fourth copy.
  const quotaBytes = onePlan * 2 + copy.length * 2 * 3 + onePlan * 1.5;
  const {api, data} = app({quotaBytes});
  seed(data, api, active, history);
  for (let i = 1; i <= 3; i++) data.set(`planif-before-restore-170000000000${i}`, copy);
  api.load();
  assert.deepEqual(restoreCopies(data), [], 'copies whose plans all exist are removed');
  assert.deepEqual(
    Array.from(api.history(), p => p.id),
    ['b'],
    'nothing is duplicated'
  );
  api.restore(api.history()[0]);
  assert.equal(api.active().id, 'b');
  assert.equal(api.recovery().status, 'restored');
});

test('a plan found only in an old copy is added to the history before the copy is removed', () => {
  const {api, data} = app();
  seed(data, api, plan('a'), []);
  data.set(
    'planif-before-restore-1700000000001',
    JSON.stringify({
      values: {
        'planif-active-plan-v1': engine.serializeSavedPlans(plan('lost')),
        'planif-plan-history-v1': engine.serializeSavedPlans([plan('a')])
      }
    })
  );
  api.load();
  assert.deepEqual(restoreCopies(data), []);
  const lost = api.history().find(p => p.id === 'lost');
  assert(lost, 'the unique plan is kept in the history');
  assert.match(lost.archiveReason, /copie de sécurité/);
  assert(JSON.parse(data.get(api.keys.history)).some(p => p.id === 'lost'));
});

test('old copies are kept if their unique plans cannot be saved', () => {
  const active = plan('a');
  const copy = JSON.stringify({values: {'planif-active-plan-v1': engine.serializeSavedPlans(plan('lost'))}});
  const onePlan = engine.serializeSavedPlans(active).length * 2;
  // The copy fits, but not an extra plan in the history.
  const {api, data} = app({quotaBytes: onePlan + copy.length * 2 + onePlan * 0.5});
  seed(data, api, active, []);
  data.set('planif-before-restore-1700000000001', copy);
  api.load();
  assert.deepEqual(restoreCopies(data), ['planif-before-restore-1700000000001']);
  assert(!api.history().some(p => p.id === 'lost'));
});

test('a full storage gives a clear message and leaves the current plan unchanged', () => {
  const active = plan('a'),
    history = [plan('b', {archivedAt: '2026-10-05T10:00:00.000Z'})];
  const onePlan = engine.serializeSavedPlans(active).length * 2;
  // Enough for the current data, not for archiving the active plan as well.
  const {api, data} = app({quotaBytes: onePlan * 2.4});
  seed(data, api, active, history);
  api.load();
  const before = new Map(data);
  assert.throws(() => api.restore(api.history()[0]), /stockage de Planif sur cet appareil est plein/);
  assert.equal(api.active().id, 'a');
  assert.deepEqual(new Map(data), before, 'storage is left exactly as it was');
});
