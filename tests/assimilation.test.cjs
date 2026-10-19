const assert=require('node:assert/strict');
const E=require('../planif-engine.js').createEngine();
const base={...require('./fixtures/plans-before-modules.json')[0].st,N:4,vma:17,s2:14,s1lo:11.5,s1hi:12,refDist:0,refTime:1165,profile:1,
 calStart:'2026-10-19',calRace:'2027-01-10',calDist:1,calGoal:null,specGoal:null,
 avail:[true,true,true,true,true,true,true],q1Day:'0',q2Day:'2',q3Day:'4',slDay:'6'};
let checked=0;
function check(w,st){
 const expected=Math.max(1,(w.block||st.block)==='aero'?0:st.qualityCount-1),active=w.foot.filter(f=>f.assimilationActive);
 assert.equal(w.sessions.length+w.foot.length+Number(w.sl>0),st.runs,'all outings survive');
 assert(w.sessions.length<=expected,'assimilation removes exactly one quality when feasible');
 if(w.sessions.length<expected)assert(w.warns.some(x=>x.code==='qualities_reduced'&&x.params.requested===expected&&x.params.actual===w.sessions.length),'no silent quality removal');
 assert.equal(active.length,st.qualityCount>=2?1:0);
 assert.equal(w.slEA,null,'replacement stays in a footing');
 for(const f of active){
  assert(f.activeRange[0]>=10&&f.activeRange[1]<=30);
  assert(f.wu>=10&&f.cd>=10&&f.wu+f.activeRange[1]+f.cd<=f.min+1e-9);
  const speed=E.lt1Ref(st)*.95,extra=E.loadFactorForSpeed(speed,st)-E.RULES.load.intensity.easy;
  assert(Math.abs(f.load-(f.min*E.RULES.load.intensity.easy+(f.activeRange[0]+f.activeRange[1])/2*extra))<1e-7,'active work contributes to load');
 }
 const total=w.sl+w.sessions.reduce((n,s)=>n+s.total,0)+w.foot.reduce((n,f)=>n+f.min,0);
 assert(Math.abs(total-w.vol)<1e-7);
 const load=w.slLoad+w.sessions.reduce((n,s)=>n+s.load,0)+w.foot.reduce((n,f)=>n+f.load,0);
 assert(Math.abs(load-w.load)<1e-7,'displayed session loads sum to week load');
 assert(w.loadMin<=w.load+1e-7&&w.loadMax>=w.load-1e-7);
 const qualities=w.sessions.filter(s=>!s.isLong),budget=Math.min(w.target,w.vol);
 assert(qualities.every(s=>s.total<=budget*.35+1e-7),'individual quality stays under 35%');
 assert(qualities.reduce((sum,s)=>sum+s.total,0)<=budget*.5+1e-7,'combined qualities stay under 50%');
 for(const s of w.sessions){if(!s.isLong)assert(s.wu>0&&s.cd>0);for(const v of s.variants)assert.equal(v.capFail.length,0);}
 checked++;
}
for(const [runs,qualityCount] of [[3,1],[4,2],[5,2],[6,2],[6,3]])for(const vol of [180,240,300,420,540])for(const block of ['aero','s1','s2','vma','eco','spec'])for(const specDist of block==='spec'?[0,1,2,3]:[1]){
 const st={...base,runs,qualityCount,vol,block,specDist},pred=E.predict(st),plan=E.buildPlan(st,pred),w=plan.weeks.at(-1);
 check(w,st);
 const normal=plan.weeks.slice(0,-1);
 if(normal.every(n=>n.sessions.length===qualityCount)&&w.sessions.length===Math.max(1,qualityCount-1)){
  assert(w.vol<normal.at(-1).vol,'assimilation reduces volume');
  assert(w.load<normal.at(-1).load,'assimilation reduces load');
 }
}
for(const qualityCount of [1,2,3]){
 const st={...base,mode:'cal',runs:6,qualityCount,vol:420,block:'s2',specDist:1};
 const plan=E.buildCalendar(st,E.predict(st));
 for(const w of plan.weeks.filter(w=>w.assimilation)){
  check(w,st);
  assert.equal(w.days.flatMap(d=>d.items).length,st.runs);
  for(const s of w.sessions)assert(w.days.some(d=>d.items.some(it=>it.s===s)));
  const active=w.days.find(d=>d.items.some(it=>it.f?.assimilationActive));
  if(active)assert.equal(E.wd(active.date),+(qualityCount===3?st.q3Day:st.q2Day),'replacement uses the removed quality day');
 }
}
// The legacy public entry point must not restore the obsolete zero-quality engine.
const st={...base,block:'s2',runs:6,qualityCount:3,vol:420},B=E.getBlock(st,E.predict(st));
const w=E.buildAssimilationWeek(B,st,{k:4,N:4,t:1,vol:350,block:'s2',specDist:1,memory:{}});
assert.equal(w.sessions.length,2);check(w,st);
console.log(`OK: ${checked} assimilation weeks, retained qualities, active minutes/load, outing count, duration caps, calendar placement and explicit infeasibility warnings.`);
