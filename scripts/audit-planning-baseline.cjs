// Reconstruct the historical engine and verify every old fingerprint before comparing structures.
// Charge-week differences must be explained entirely by workout/format history from retained assimilation qualities.
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),assert=require('assert/strict'),crypto=require('crypto');
const rev='c3013c5',read=p=>cp.execFileSync('git',['show',rev+':'+p],{encoding:'utf8'});let c={module:{exports:{}}};vm.runInNewContext(read('planif-rules.js'),c);const rules=c.module.exports;c={module:{exports:{}},require:()=>rules};vm.runInNewContext(read('planif-engine.js'),c);const old=c.module.exports,cur=require(process.cwd()+'/planif-engine.js'),rows=require(process.cwd()+'/tests/fixtures/plans-before-modules.json'),fixture=require(process.cwd()+'/tests/fixtures/plans-after-balance.json');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'),json=v=>JSON.parse(JSON.stringify(v));
const diffs=(a,b,p='',out=[])=>{if(JSON.stringify(a)===JSON.stringify(b))return out;if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diffs(a[k],b[k],p?(p+'.'+k):k,out);}else out.push(p);return out;};
let neutralContext={module:{exports:{}},require:()=>require(process.cwd()+'/planif-rules.js'),__legacyAssimilation:old.createEngine().buildAssimilationWeek};
vm.runInNewContext(fs.readFileSync('planif-engine.js','utf8').replace('function buildWeek(B,st,o){','function buildWeek(B,st,o){if(o.assim)return __legacyAssimilation(B,st,o);'),neutralContext);
const historyNeutral=neutralContext.module.exports;
const report=[],plans=[];let unchangedCharge=0,changedCharge=0,changedAssim=0;
for(const [i,row] of rows.entries()){
 const oe=old.createEngine(),ne=cur.createEngine();const st={...row.st},op=oe.predict({...st}),np=ne.predict({...st});assert.equal(hash(op),row.prediction);assert.equal(hash(np),row.prediction);
 const fp={};for(const kind of ['block','calendar']){const method=kind==='block'?'buildPlan':'buildCalendar',state=kind==='block'?st:{...st,mode:'cal'},a=json(oe[method]({...state},op)),b=json(ne[method]({...state},np));assert.equal(hash(a),fixture.plans[i][kind],`historical fixture ${i} ${kind}`);fp[kind]=hash(b);
 const neutral=json(historyNeutral.createEngine()[method]({...state},np));
 assert.deepEqual({...b,weeks:null},{...a,weeks:null},`plan envelope ${i} ${kind}`);
 const changes=[];for(let j=0;j<a.weeks.length;j++){const x=a.weeks[j],y=b.weeks[j],paths=diffs(x,y);if(!x.assim&&!x.assimilation)assert.deepEqual(neutral.weeks[j],x,`unexplained charge-week difference ${i} ${kind} ${j}`);
 if(!paths.length){if(!x.assim&&!x.assimilation)unchangedCharge++;continue;}if(x.assim||x.assimilation)changedAssim++;else changedCharge++;
 changes.push({week:j,assimilation:!!(x.assim||x.assimilation),paths,previous:{qualities:x.sessions.length,volume:x.vol,load:x.load,active:x.foot.filter(f=>f.assimilationActive).length},current:{qualities:y.sessions.length,volume:y.vol,load:y.load,active:y.foot.filter(f=>f.assimilationActive).length}});}
 const top=diffs({...a,weeks:null},{...b,weeks:null});if(changes.length||top.length)report.push({case:i,kind,state:st,top,changes});
 }plans.push(fp);
}
const summary={historicalCommit:rev,cases:rows.length,unchangedCharge,changedCharge,changedAssim};
console.log(JSON.stringify(summary,null,2));
console.log(JSON.stringify({firstChangedWeek:report[0]?.changes[0]},null,2));
if(process.argv.includes('--write-reviewed')){
 fs.writeFileSync('tests/fixtures/plans-after-assimilation.json',JSON.stringify({version:'2026.10.19.44',review:summary,plans},null,2)+'\n');
}
