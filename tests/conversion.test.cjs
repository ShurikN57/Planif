const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../planif-ui.js'),'utf8');
const begin=html.indexOf('function conversionResult(');
const end=html.indexOf('let conversionMode=',begin);
assert(begin>=0&&end>begin,'the converter must remain available in Repères');
const context={};
vm.runInNewContext(html.slice(begin,end)+'\nthis.convert=conversionResult;',context);
const convert=context.convert;

assert.equal(convert('speedToPace','15,00'),'4’00/km');
assert.equal(convert('paceToSpeed','4’00'),'15,00 km/h');
assert.equal(convert('speedToPace','14.00'),'4’17/km');
assert.equal(convert('paceToSpeed',"4'17"),'14,01 km/h');
assert.equal(convert('paceToSpeed','4:15'),'14,12 km/h');
assert.equal(convert('speedToPace','0'),'Saisie invalide');
assert.equal(convert('speedToPace','abc'),'Saisie invalide');
assert.equal(convert('paceToSpeed','4:60'),'Saisie invalide');
assert.equal(convert('paceToSpeed','0:00'),'Saisie invalide');
assert.equal(convert('paceToSpeed',''),'—');
assert.equal(convert('paceToSpeed','4:'),'—');
assert.equal(convert('speedToPace','15,'),'—');
assert(html.indexOf('h+=conversionHtml();')>html.indexOf("refEditHtml('Chronos estimés'"));
assert(html.indexOf('h+=conversionHtml();')<html.indexOf("refHelpHtml('Volume et charge'"));
console.log('OK: bidirectional pace/speed conversion, French decimal input, rounding, invalid values and Repères placement.');
