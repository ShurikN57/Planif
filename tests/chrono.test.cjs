// Chrono tool of the Calcul tab: each button is named after the value it computes (time, pace,
// distance), and the distance mode derives a distance from a pace and a duration.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  {test} = require('node:test');
const {factoryBody} = require('./helpers/source.cjs');
const {loadHtml} = require('./helpers/runtime.cjs');
const source = fs.readFileSync(require.resolve('../planif-calcul.js'), 'utf8');

function chrono() {
  const listeners = {},
    output = {textContent: ''},
    speed = {textContent: ''},
    toEndurance = {disabled: false};
  const tool = {
    querySelector: s =>
      ({
        '[data-chrono-output]': output,
        '[data-chrono-speed]': speed,
        '[data-chrono-to-endurance]': toEndurance
      })[s] || null
  };
  const root = {
    addEventListener: (type, fn) => (listeners[type] ??= []).push(fn),
    querySelector: s => (s === '[data-chrono-tool]' ? tool : null)
  };
  const context = {$: () => root, readState: () => ({vma: 17}), renderApp: () => {}};
  vm.createContext(context);
  loadHtml(context);
  context.escapeHtml = context.PlanifHtml.escapeHtml;
  vm.runInContext(factoryBody(source, 'create'), context);
  const run = code => vm.runInContext(code, context);
  const fire = (type, target) =>
    listeners[type].forEach(fn => fn({target: {matches: () => false, ...target}}));
  const wheel = (scope, key, meters, unit, value) =>
    fire('input', {
      dataset: {wheelUnitInput: unit},
      value: String(value),
      matches: s => s === '[data-wheel-unit-input]',
      closest: () => ({
        dataset: {wheelScope: scope, wheelKey: key, wheelMeters: String(meters)},
        querySelectorAll: () => []
      })
    });
  const mode = value =>
    fire('click', {closest: s => (s === '[data-chrono-mode]' ? {dataset: {chronoMode: value}} : null)});
  return {run, fire, wheel, mode, output, speed, toEndurance};
}

test('the three buttons are named after the value they compute, on one line', () => {
  const c = chrono();
  const html = c.run('chronoToolHtml()');
  const buttons = [...html.matchAll(/data-chrono-mode="(\w+)" aria-pressed="(\w+)">([^<]+)</g)].map(m =>
    m.slice(1)
  );
  assert.deepEqual(buttons, [
    ['time', 'true', 'Temps'],
    ['pace', 'false', 'Allure'],
    ['distance', 'false', 'Distance']
  ]);
  assert.match(html, /Temps estimé/);
  assert.match(html, /data-chrono-pace/);
  c.mode('pace');
  const pace = c.run('chronoToolHtml()');
  assert.match(pace, /Allure nécessaire/);
  assert.match(pace, /data-chrono-target/);
  assert.match(pace, /data-chrono-mode="pace" aria-pressed="true">Allure/);
  c.mode('distance');
  const distance = c.run('chronoToolHtml()');
  assert.match(distance, /Distance estimée/);
  assert.match(distance, /data-chrono-pace/);
  assert.match(distance, /data-wheel-scope="chronoDuration"/);
  assert.match(distance, /aria-label="Heures"/);
  assert.doesNotMatch(distance, /data-chrono-category|data-chrono-distance|data-chrono-to-endurance/);
});

test('distance mode: distance from pace and duration', () => {
  const c = chrono();
  c.mode('distance');
  c.run('updateToolsUi()');
  // Defaults: 4:00 /km for 40 minutes.
  assert.equal(c.output.textContent, '10,00 km');
  assert.equal(c.speed.textContent, '15,00 km/h');
  c.fire('input', {dataset: {chronoPace: ''}, value: '5:00'});
  c.wheel('chronoDuration', 'duration', 100000, 'h', 1);
  c.wheel('chronoDuration', 'duration', 100000, 'm', 0);
  assert.equal(c.output.textContent, '12,00 km');
  assert.equal(c.speed.textContent, '12,00 km/h');
  c.fire('input', {dataset: {chronoPace: ''}, value: '4:00'});
  c.wheel('chronoDuration', 'duration', 100000, 'h', 0);
  c.wheel('chronoDuration', 'duration', 100000, 'm', 2);
  assert.equal(c.output.textContent, '500 m', 'under 1 km the distance is in metres');
  c.wheel('chronoDuration', 'duration', 100000, 'm', 4);
  assert.equal(c.output.textContent, '1,00 km', 'exactly 1 km is formatted in kilometres');
  c.wheel('chronoDuration', 'duration', 100000, 'm', 0);
  assert.equal(c.output.textContent, '—', 'a zero duration has no estimate');
  c.wheel('chronoDuration', 'duration', 100000, 'm', 4);
  c.fire('input', {dataset: {chronoPace: ''}, value: 'abc'});
  assert.equal(c.output.textContent, '—');
  assert.equal(c.speed.textContent, '');
});

test('time and pace modes keep their results', () => {
  const c = chrono();
  c.fire('change', {dataset: {chronoCategory: ''}, value: 'official'});
  c.fire('change', {dataset: {chronoDistance: ''}, value: '10000'});
  c.run('updateToolsUi()');
  assert.equal(c.output.textContent, '40’00', 'time from 10 km at 4:00 /km');
  assert.equal(c.toEndurance.disabled, false);
  c.mode('pace');
  c.wheel('chrono', '10000', 10000, 'm', 50);
  assert.equal(c.output.textContent, '5’00 /km', 'pace from 10 km in 50 minutes');
  assert.equal(c.speed.textContent, '12,00 km/h');
});

test('the distance mode never sends a result to the endurance index', () => {
  const c = chrono();
  c.fire('change', {dataset: {chronoCategory: ''}, value: 'official'});
  c.fire('change', {dataset: {chronoDistance: ''}, value: '10000'});
  const before = c.run('JSON.stringify(enduranceState)');
  c.mode('distance');
  c.fire('click', {closest: s => (s === '[data-chrono-to-endurance]' ? {} : null)});
  assert.equal(c.run('JSON.stringify(enduranceState)'), before);
});
