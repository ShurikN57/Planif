const assert=require('node:assert/strict'),crypto=require('node:crypto');
const engine=require('../planif-engine.js');
const baseline=require('./fixtures/plans-before-modules.json');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
for(const [i,row] of baseline.entries()){
 const e=engine.createEngine(),st={...row.st},pred=e.predict(st);
 assert.equal(hash(pred),row.prediction,`prediction ${i}`);
 assert.equal(hash(e.buildPlan({...st},pred)),row.block,`block ${i}`);
 assert.equal(hash(e.buildCalendar({...st,mode:'cal'},pred)),row.calendar,`calendar ${i}`);
}
const studies=require('../planif-studies.json');
const evidence=require('../planif-evidence.js').createEvidence(studies);
assert(studies.SOURCES.length>20&&studies.FINDINGS.length>0);
assert(evidence.auditIntegrity([]).every(x=>!x.includes('source inconnue')&&!x.includes('résultat inconnu')));
console.log(`OK: ${baseline.length*2} plans and all prediction fingerprints unchanged after module extraction; studies load as JSON.`);
