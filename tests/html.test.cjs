// A single HTML escaping function is shared by every module (audit SEC-1, issue #4).
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  {test} = require('node:test');
const root = path.join(__dirname, '..');
const {escapeHtml} = require('../planif-html.js');
const {hasCode} = require('./helpers/source.cjs');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
const modules = fs.readdirSync(root).filter(n => /^planif-.*\.js$/.test(n));

test('escapeHtml neutralizes every HTML-significant character', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="a('b')"> & co`),
    '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt; &amp; co'
  );
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(12.5), '12.5');
  assert.equal(escapeHtml('Sortie longue · 1h30’'), 'Sortie longue · 1h30’');
});

test('no module carries its own escaping implementation', () => {
  for (const name of modules.filter(n => n !== 'planif-html.js'))
    assert(
      !/\.replace\(\/\[&<>"'\]\/g/.test(source(name)) && !/&amp;/.test(source(name)),
      `${name} must use PlanifHtml.escapeHtml`
    );
  for (const name of ['planif-ui.js', 'planif-coros.js', 'planif-strava.js'])
    assert(source(name).includes('PlanifHtml.escapeHtml'), name);
});

test('shared escaping loads before every module that uses it', () => {
  const html = source('index.html'),
    sw = source('sw.js');
  const order = [...html.matchAll(/<script\b[^>]*src="\.\/([^"?]+)/g)].map(m => m[1]);
  const first = order.indexOf('planif-html.js');
  assert(
    first >= 0 && ['planif-coros.js', 'planif-ui.js', 'planif-backup.js'].every(n => order.indexOf(n) > first)
  );
  // Strava is appended by planif-ui.js at runtime, after every static script.
  assert(sw.includes('./planif-html.js?v=') && sw.includes('./planif-backup.js?v='));
});

test('saved plan titles are escaped where they are displayed', () => {
  const ui = source('planif-ui.js');
  assert(hasCode(ui, '${escapeHtml(activePlan.title)}'));
  assert(hasCode(ui, "${escapeHtml(p.title||'Plan de course')}"));
  assert(!/\$\{activePlan\.title\}/.test(ui));
});
