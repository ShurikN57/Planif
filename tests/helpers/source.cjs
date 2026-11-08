// Source-inspection helpers that do not depend on code formatting (Prettier, audit lot L5).
const fs = require('node:fs'),
  path = require('node:path');
const root = path.join(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Index of the top-level declaration of `name` (function, const, let or var).
function declaration(source, name, from = 0) {
  const re = new RegExp(
    `(?:^|[;}\\s])((?:async\\s+)?function\\s*${escapeRe(name)}\\s*\\(|(?:const|let|var)\\s+${escapeRe(name)}\\s*=)`,
    'g'
  );
  re.lastIndex = from;
  const m = re.exec(source);
  if (!m) throw Error(`Declaration not found: ${name}`);
  return m.index + m[0].indexOf(m[1]);
}
// Source from the declaration of `start` up to (excluding) the declaration of `end`.
function between(source, start, end) {
  const a = declaration(source, start),
    b = declaration(source, end, a + 1);
  return source.slice(a, b);
}
// Index just after the brace block that opens at or after `from` (skips strings, templates,
// comments and regular expressions).
function blockEnd(source, from) {
  let i = source.indexOf('{', from),
    depth = 0;
  const stack = [];
  if (i < 0) throw Error('No block found');
  const regexAllowed = () => {
    let j = i - 1;
    while (j >= 0 && /\s/.test(source[j])) j--;
    return (
      j < 0 ||
      /[(,=:[!&|?{};+\-*%<>~^]/.test(source[j]) ||
      /\b(?:return|typeof|case|in|of)$/.test(source.slice(Math.max(0, j - 6), j + 1))
    );
  };
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i + 2) + 1;
      continue;
    }
    if (c === "'" || c === '"') {
      for (i++; i < source.length && source[i] !== c; i++) if (source[i] === '\\') i++;
      continue;
    }
    if (c === '/' && regexAllowed()) {
      let cls = false;
      for (i++; i < source.length; i++) {
        const d = source[i];
        if (d === '\\') {
          i++;
          continue;
        }
        if (d === '[') cls = true;
        else if (d === ']') cls = false;
        else if (d === '/' && !cls) break;
      }
      continue;
    }
    if (c === '`') {
      stack.push(depth);
      depth = 0;
      i = template(i + 1);
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0 && !stack.length) return i + 1;
    }
  }
  throw Error('Unterminated block');
  function template(k) {
    for (; k < source.length; k++) {
      if (source[k] === '\\') {
        k++;
        continue;
      }
      if (source[k] === '`') {
        depth = stack.pop();
        return k;
      }
      if (source[k] === '$' && source[k + 1] === '{') {
        // Scan the embedded expression until its closing brace at depth 0.
        let d = 1;
        k += 2;
        for (; k < source.length && d > 0; k++) {
          const e = source[k];
          if (e === "'" || e === '"') {
            for (k++; k < source.length && source[k] !== e; k++) if (source[k] === '\\') k++;
          } else if (e === '`') {
            k = templateInner(k + 1);
          } else if (e === '{') d++;
          else if (e === '}') d--;
        }
        k--;
      }
    }
    throw Error('Unterminated template');
  }
  function templateInner(k) {
    for (; k < source.length; k++) {
      if (source[k] === '\\') {
        k++;
        continue;
      }
      if (source[k] === '`') return k;
      if (source[k] === '$' && source[k + 1] === '{') {
        let d = 1;
        k += 2;
        for (; k < source.length && d > 0; k++) {
          const e = source[k];
          if (e === "'" || e === '"') {
            for (k++; k < source.length && source[k] !== e; k++) if (source[k] === '\\') k++;
          } else if (e === '`') k = templateInner(k + 1);
          else if (e === '{') d++;
          else if (e === '}') d--;
        }
        k--;
      }
    }
    throw Error('Unterminated template');
  }
}
// Complete source of the top-level function declaration `name`.
function functionSource(source, name) {
  const start = declaration(source, name);
  const params = source.indexOf(')', start);
  return source.slice(start, blockEnd(source, params));
}
// Whitespace- and quote-insensitive comparison for "the code still contains this" checks.
const compact = s =>
  s
    .replace(/\s+/g, '')
    .replace(/"/g, "'")
    .replace(/;(?=[})\]])/g, '')
    .replace(/,(?=[}\])])/g, '');
const hasCode = (source, snippet) => compact(source).includes(compact(snippet));
// Body of a module factory function, run as a script so that tests can reach its internals.
// The factory's destructuring reads `deps`, provided here as the test context itself; the final
// `return {...}` is dropped.
function factoryBody(source, name) {
  const fn = functionSource(source, name),
    body = fn.slice(fn.indexOf('{') + 1, fn.lastIndexOf('}'));
  const ret = /\n\s*return\s*\{[^{}]*\};?\s*$/;
  if (!ret.test(body)) throw Error(`Factory ${name} must end with return {...}`);
  return 'var deps = globalThis;\n' + body.replace(ret, '\n');
}
module.exports = {root, read, declaration, between, blockEnd, functionSource, factoryBody, compact, hasCode};
