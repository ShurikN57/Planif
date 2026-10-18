const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {injectEngine,loadRuntime,uiSource:html}=require('./helpers/runtime.cjs');
const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,type:'text',appendChild(){},addEventListener(){}});return elements.get(id);};
const ctx={document:{getElementById:el,createElement:()=>({})},localStorage:{getItem:()=>null,setItem(){}},console};vm.createContext(ctx);
injectEngine(ctx);ctx.E=ctx.__engine;
const E=ctx.E;let checked=0;
for(const vma of [10,12,14,17,20,24])for(const profile of [0,2,4])for(const vol of [180,300,420,540]){
 const st={vma,s1lo:vma*.68,s1hi:vma*.72,s2:vma*.82,vol,runs:5,qualityCount:2,refDist:0,refTime:18000/(vma*.9),ref2Dist:1,ref2Time:null,profile,penalty:false};
 const pred=E.predict(st),unchanged=JSON.stringify(pred);
 for(const dist of [0,2,3])for(const W of [3,8,12,16,20]){
  const v=pred[dist].v,s=E.makeSession('spec',W,2,.7,st,{v,dist,vol});
  for(const c of s.variants){
   assert(c.work>0&&Number.isFinite(c.total));assert.equal(c.capFail.length,0,`cap: ${vma}, ${dist}, ${W}`);
   assert(c.work<=W/v*60+1e-8);assert(Math.abs(c.work-c.parts.reduce((a,p)=>a+p[0],0))<1e-8);
   const S=c.structure;
   if(dist===3){
    assert(c.total<=E.RULES.specOther.marathonLongRun.cap);assert(S.easyMin>=15-1e-8);
    assert(Math.abs(S.distanceKm*(S.reps||1)/v*60-c.work)<1e-8);
    const easy=S.easyMin+S.cooldownMin+(S.reps?(S.reps-1)*S.easyBetweenMin:0);
    assert(Math.abs(c.total-c.work-easy)<1e-8);assert(c.easy>=0);
   }else{
    assert(S.reps>=2&&Number.isInteger(S.reps));
    assert(Math.abs(c.total-(S.reps*S.repDurationMin+(S.reps-1)*S.recoveryMin))<1e-8);
   }
  }
  assert(Math.abs(s.variants[0].work-s.variants[1].work)<=E.TOL(s.variants[0].work)+1e-8);
  if(dist===3)assert.equal(s.variants[0].work,s.variants[1].work);
  checked++;
 }
 for(const dist of [0,1,2,3]){
  const week=E.buildTaperWeek({...st,calDist:dist,calGoal:null},pred,vol*.6),s=week.sessions[0];
  assert(s.variants.every(c=>!c.capFail.length));
  assert(Math.abs(s.variants[0].work-s.variants[1].work)<=E.TOL(s.variants[0].work)+1e-8);
 }
 assert.equal(JSON.stringify(E.predict(st)),unchanged,'prediction unchanged');
}
// Extreme race target still obeys the existing above-105% cap.
const st={vma:12,s1lo:8,s1hi:9,s2:10,vol:300};
for(const dist of [0,2,3]){
 const s=E.makeSession('spec',12,0,0,st,{v:14,dist,vol:300});
 assert(s.variants.every(v=>v.work<=8+1e-9&&!v.capFail.length));
}
console.log(`OK: ${checked} specific sessions across athlete speeds/profiles/volumes, duration caps, equivalent work, marathon totals, taper alternatives and unchanged predictions.`);
