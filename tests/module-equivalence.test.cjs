const assert=require('node:assert/strict'),crypto=require('node:crypto');
const engine=require('../planif-engine.js');
const baseline=require('./fixtures/plans-before-modules.json');
const updated=require('./fixtures/plans-after-assimilation.json').plans;
assert.equal(updated.length,baseline.length,'every historical scenario remains covered');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
for(const [i,row] of baseline.entries()){
 const e=engine.createEngine(),st={...row.st},pred=e.predict(st);
 assert.equal(hash(pred),row.prediction,`prediction ${i}`);
 assert.equal(hash(e.buildPlan({...st},pred)),updated[i].block,`block ${i}`);
 assert.equal(hash(e.buildCalendar({...st,mode:'cal'},pred)),updated[i].calendar,`calendar ${i}`);
}
const studies=require('../planif-studies.json');
const evidence=require('../planif-evidence.js').createEvidence(studies);
assert(studies.SOURCES.length>20&&studies.FINDINGS.length>0);
assert(evidence.auditIntegrity([]).every(x=>!x.includes('source inconnue')&&!x.includes('résultat inconnu')));
console.log(`OK: ${baseline.length*2} reviewed planning fingerprints; original prediction fingerprints remain unchanged; studies load as JSON.`);
