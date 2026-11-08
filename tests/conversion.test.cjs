const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../planif-ui.js'), 'utf8');
const {declaration, functionSource, hasCode} = require('./helpers/source.cjs');
const begin = declaration(html, 'conversionResult');
const end = declaration(html, 'conversionMode', begin);
assert(begin >= 0 && end > begin, 'the converter must remain available');
const context = {};
vm.runInNewContext(html.slice(begin, end) + '\nthis.convert=conversionResult;', context);
const convert = context.convert;

assert.equal(convert('speedToPace', '15,00'), '4’00/km');
assert.equal(convert('paceToSpeed', '4’00'), '15,00 km/h');
assert.equal(convert('speedToPace', '14.00'), '4’17/km');
assert.equal(convert('paceToSpeed', "4'17"), '14,01 km/h');
assert.equal(convert('paceToSpeed', '4:15'), '14,12 km/h');
assert.equal(convert('speedToPace', '0'), 'Saisie invalide');
assert.equal(convert('speedToPace', 'abc'), 'Saisie invalide');
assert.equal(convert('paceToSpeed', '4:60'), 'Saisie invalide');
assert.equal(convert('paceToSpeed', '0:00'), 'Saisie invalide');
assert.equal(convert('paceToSpeed', ''), '—');
assert.equal(convert('paceToSpeed', '4:'), '—');
assert.equal(convert('speedToPace', '15,'), '—');
const calcView = functionSource(html, 'appCalcHtml');
assert(hasCode(calcView, '+conversionHtml()+'), 'converter must be rendered inside Calcul');
console.log(
  'OK: bidirectional pace/speed conversion, French decimal input, rounding, invalid values and Calcul placement.'
);
