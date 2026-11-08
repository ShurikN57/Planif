// Runs the full suite under every CI timezone, even when one fails, prints each result,
// then applies the CI rule: every zone marked blocking must pass (all three since #3).
const {spawnSync} = require('node:child_process');
const fs = require('node:fs'),
  path = require('node:path');
const root = path.join(__dirname, '..');
const tests = fs
  .readdirSync(path.join(root, 'tests'))
  .filter(n => n.endsWith('.test.cjs'))
  .sort()
  .map(n => path.join('tests', n));
const zones = [
  {tz: 'Europe/Paris', blocking: true},
  {tz: 'America/Los_Angeles', blocking: true},
  {tz: 'Pacific/Auckland', blocking: true}
];
const results = zones.map(({tz, blocking}) => {
  console.log(`\n== ${tz} (${blocking ? 'bloquant' : 'informatif'})`);
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...tests], {
    cwd: root,
    env: {...process.env, TZ: tz},
    encoding: 'utf8'
  });
  const output = (run.stdout || '') + (run.stderr || '');
  const failed = [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map(m => m[1]);
  const count = key => Number(output.match(new RegExp('^# ' + key + ' (\\d+)$', 'm'))?.[1] ?? NaN);
  const ok = run.status === 0;
  console.log(
    `${ok ? 'OK' : 'ÉCHEC'} : ${count('pass')} réussi(s), ${count('fail')} échoué(s)` +
      (failed.length ? ` — ${failed.join(', ')}` : '')
  );
  if (run.error) console.log('Erreur : ' + run.error.message);
  return {tz, blocking, ok};
});
console.log('\n== Résumé');
for (const r of results) console.log(`${r.ok ? '✔' : '✘'} ${r.tz}${r.blocking ? '' : ' (informatif)'}`);
const blockingFailure = results.some(r => r.blocking && !r.ok);
console.log(
  blockingFailure
    ? 'Résultat : ÉCHEC (fuseau bloquant en échec).'
    : 'Résultat : OK (aucun fuseau bloquant en échec).'
);
process.exitCode = blockingFailure ? 1 : 0;
