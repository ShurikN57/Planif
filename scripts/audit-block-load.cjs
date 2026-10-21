// Reproduce the descriptive calibration and verify analysis is non-mutating.
const assert=require('node:assert/strict'),E=require('../planif-engine.js').createEngine();
const base=require('../tests/fixtures/plans-before-modules.json')[0].st;
const configs=[[3,1],[4,2],[5,2],[6,2],[6,3]],volumes=[180,240,300,360,420],blocks=['s1','s2','vma',0,1,2,3],cells=new Map();
let plans=0,weeks=0;const notes={};
function inspect(plan,st){
 const original=JSON.stringify(plan),report=E.reviewBlockLoads(plan,st);
 assert.equal(JSON.stringify(plan),original,'analysis cannot edit a generated/saved plan');
 plans++;weeks+=report.weeks.length;
 report.weeks.forEach(r=>{
  assert(Number.isFinite(r.total)&&r.total>=0);
  for(const key of ['sessionShare','targetShare'])assert(r[key]===null||Number.isFinite(r[key])&&r[key]>=0&&r[key]<=100+1e-7);
  if(r.target!==null)assert(r.target<=r.session+1e-7,'targeted work is a subset of the primary session');
  r.notes.forEach(n=>notes[n]=(notes[n]||0)+1);
 });
 return report;
}
for(const vma of [12,17,21])for(const[runs,q]of configs)for(const vol of volumes)for(const block of blocks){
 const st={...base,vma,s2:vma*.82,s1lo:vma*.68,s1hi:vma*.72,refDist:1,refTime:10/(vma*.86)*3600,N:4,profile:2,block:typeof block==='number'?'spec':block,specDist:typeof block==='number'?block:1,vol,runs,qualityCount:q};
 const plan=E.recalculatePlanSummary(E.buildPlan(st,E.predict(st)),st),report=inspect(plan,st);
 if(st.block==='s2')for(const r of report.weeks){
  if(r.mode!=='charge'||r.notes.includes('capacity_adjusted')||!r.primaryKey)continue;
  const key=[runs,q,vol].join(':'),cell=cells.get(key)||{session:[],target:[]};cell.session.push(r.sessionShare);cell.target.push(r.targetShare);cells.set(key,cell);
 }
}
const range=a=>{a=a.slice().sort((a,b)=>a-b);return [Math.floor(a[Math.round((a.length-1)*.1)]),Math.ceil(a[Math.round((a.length-1)*.9)])];};
for(const[runs,q,vol,n,session,target]of E.RULES.load.blockReview.s2){
 const cell=cells.get([runs,q,vol].join(':'));assert(cell);assert.equal(cell.session.length,n);assert.deepEqual(range(cell.session),session);assert.deepEqual(range(cell.target),target);
}
for(const vma of [12,17,21])for(const[runs,q]of configs)for(const vol of [240,300,360])for(const dist of [0,1,2,3]){
 const st={...base,mode:'cal',calStart:'2026-10-26',calRace:'2027-05-02',calDist:dist,vma,s2:vma*.82,s1lo:vma*.68,s1hi:vma*.72,refDist:1,refTime:10/(vma*.86)*3600,N:4,profile:2,vol,runs,qualityCount:q};
 const plan=E.buildCalendar(st,E.predict(st));assert(!plan.error);inspect(plan,st);
}
console.log(JSON.stringify({plans,weeks,calibrationCellsVerified:E.RULES.load.blockReview.s2.length,notes,unchanged:'all generated plans byte-identical before/after review; no new workout selection or safety thresholds'},null,2));
