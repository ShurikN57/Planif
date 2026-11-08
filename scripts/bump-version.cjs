// Single entry point for application versions.
//
//   node scripts/bump-version.cjs                 next version for today (AAAA.MM.JJ.NN)
//   node scripts/bump-version.cjs 2026.11.08.01   explicit version
//   node scripts/bump-version.cjs --label dates   also rename the service-worker cache label
//   node scripts/bump-version.cjs --check         verify that every location agrees (no write)
//
// Locations: planif-version.js, the ?v= script URLs in index.html, the scientific JSON URL
// in planif-ui.js, and sw.js (cache name and offline shell). planif-strava.js is loaded with
// APP_VERSION at runtime and needs no literal.
const fs = require('node:fs'),
  path = require('node:path');

const VERSION_RE = /^\d{4}\.\d{2}\.\d{2}\.\d{2}$/;
const ANY_VERSION = /\b\d{4}\.\d{2}\.\d{2}\.\d{2}\b/g;
const FILES = ['planif-version.js', 'index.html', 'planif-ui.js', 'sw.js'];
const CACHE_RE = /const CACHE\s*=\s*'planif-v(\d+)-([a-z0-9-]+?)-(\d{8})-(\d{2})'\s*;/;

function validVersion(value) {
  if (!VERSION_RE.test(value) || value.endsWith('.00')) return false;
  const iso = value.slice(0, 10).replaceAll('.', '-');
  const date = new Date(iso + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

function readVersion(root) {
  const match = fs
    .readFileSync(path.join(root, 'planif-version.js'), 'utf8')
    .match(/APP_VERSION\s*=\s*'([^']+)'/);
  if (!match || !validVersion(match[1]))
    throw Error('planif-version.js: APP_VERSION introuvable ou mal formée.');
  return match[1];
}
const compact = version => {
  const [y, m, d, n] = version.split('.');
  return {date: y + m + d, n};
};

function check(root) {
  const version = readVersion(root),
    problems = [];
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  for (const name of FILES) {
    const others = [...new Set((read(name).match(ANY_VERSION) || []).filter(v => v !== version))];
    if (others.length) problems.push(`${name} : version(s) différente(s) ${others.join(', ')}`);
  }
  const html = read('index.html'),
    sw = read('sw.js'),
    ui = read('planif-ui.js');
  const scripts = [...html.matchAll(/<script\b[^>]*src="\.\/([^"?]+)(?:\?v=([^"]*))?"/g)];
  if (!scripts.length) problems.push('index.html : aucun script local trouvé');
  for (const [, name, v] of scripts) {
    if (v !== version) problems.push(`index.html : ${name} sans ?v=${version}`);
    if (!sw.includes(`./${name}?v=${version}`))
      problems.push(`sw.js : ${name}?v=${version} absent du shell hors ligne`);
  }
  for (const name of ['planif-studies.json', 'planif-strava.js'])
    if (!sw.includes(`./${name}?v=${version}`))
      problems.push(`sw.js : ${name}?v=${version} absent du shell hors ligne`);
  if (!ui.includes(`'./planif-studies.json?v=${version}'`))
    problems.push('planif-ui.js : URL du JSON scientifique non versionnée');
  const cache = sw.match(CACHE_RE),
    {date, n} = compact(version);
  if (!cache) problems.push('sw.js : nom de cache au format inattendu');
  else if (cache[3] !== date || cache[4] !== n)
    problems.push(`sw.js : cache ${cache[3]}-${cache[4]} au lieu de ${date}-${n}`);
  return {version, problems};
}

function nextVersion(current, now = new Date()) {
  const pad = x => String(x).padStart(2, '0');
  const today = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
  // A version dated later than today (other timezone, manual choice) is incremented, never undercut.
  if (current.slice(0, 10) < today) return today + '.01';
  const n = Number(current.slice(-2)) + 1;
  if (n > 99) throw Error('Plus de 99 versions pour cette date : choisis une version explicite.');
  return current.slice(0, 10) + '.' + pad(n);
}

function bump(root, {version, label} = {}) {
  const before = check(root);
  if (before.problems.length)
    throw Error('Versions incohérentes avant la montée :\n- ' + before.problems.join('\n- '));
  const current = before.version,
    next = version || nextVersion(current);
  if (!validVersion(next))
    throw Error(`Version invalide : ${next} (date valide et numéro de 01 à 99 attendus).`);
  if (next <= current) throw Error(`La nouvelle version ${next} doit être postérieure à ${current}.`);
  if (label !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label))
    throw Error('Le label du cache doit contenir des minuscules, chiffres et tirets.');
  const updates = new Map();
  for (const name of FILES) {
    const text = fs.readFileSync(path.join(root, name), 'utf8');
    let out = text.split(current).join(next);
    if (name === 'sw.js') {
      const {date, n} = compact(next);
      out = out.replace(
        CACHE_RE,
        (m, gen, oldLabel) => `const CACHE = 'planif-v${gen}-${label || oldLabel}-${date}-${n}';`
      );
    }
    updates.set(name, out);
  }
  // Write only once every file has been prepared.
  for (const [name, out] of updates) fs.writeFileSync(path.join(root, name), out);
  const after = check(root);
  if (after.problems.length)
    throw Error('Versions incohérentes après la montée :\n- ' + after.problems.join('\n- '));
  return {from: current, to: next};
}

module.exports = {check, bump, nextVersion, readVersion};

if (require.main === module) {
  const args = process.argv.slice(2),
    root = path.join(__dirname, '..');
  try {
    if (args.length === 1 && args[0] === '--check') {
      const {version, problems} = check(root);
      if (problems.length) {
        console.error('Versions incohérentes :\n- ' + problems.join('\n- '));
        process.exitCode = 1;
      } else console.log(`Version ${version} cohérente dans ${FILES.join(', ')}.`);
    } else {
      let version, label;
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--label' && label === undefined && args[i + 1] && !args[i + 1].startsWith('-'))
          label = args[++i];
        else if (!arg.startsWith('-') && version === undefined) version = arg;
        else throw Error(`Argument invalide ou incomplet : ${arg}.`);
      }
      const {from, to} = bump(root, {version, label});
      console.log(`Version ${from} → ${to} (${FILES.join(', ')}).`);
      console.log(
        'Ensuite : npm test, commit "chore: release ' +
          to +
          '", PR vers main. Le tag v' +
          to +
          ' et la release GitHub sont créés automatiquement après la fusion.'
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
