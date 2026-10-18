const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {injectEngine,loadRuntime,uiSource:html}=require('./helpers/runtime.cjs');
const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,type:'text',appendChild(){},addEventListener(){}});return elements.get(id);};
const context={document:{getElementById:el,createElement:()=>({})},localStorage:{getItem:()=>null,setItem(){}},console};vm.createContext(context);
injectEngine(context);context.E=context.__engine;
const E=context.E,base={mode:'bloc',calStart:'2026-10-19',calRace:'2027-01-10',calDist:1,calGoal:null,avail:[false,true,true,false,true,true,true],q1Day:'1',q2Day:'4',q3Day:'',slDay:'6',vma:17,s2:14,s1lo:11.5,s1hi:12,refDist:0,refTime:1165,profile:1,penalty:false,ref2Dist:1,ref2Time:null,block:'s2',specDist:1,specGoal:null,N:4,vol:300,runs:5,qualityCount:2,assimQ2:false};
const build=st=>E.buildPlan(st,E.predict(st));
const checkWeek=(w,st)=>{
 assert.equal(w.sessions.length+w.foot.length+(w.sl>0?1:0),st.runs,'do not delete an outing to fit qualities');
 assert(w.sessions.length<=E.maxQualityForRuns(st.runs));
 const minutes=w.sessions.reduce((s,x)=>s+x.total,0)+w.sl+w.foot.reduce((s,f)=>s+f.min,0);
 assert(Math.abs(w.vol-minutes)<1e-7);
 assert(Math.abs(Object.values(w.z).reduce((a,b)=>a+b,0)-w.vol)<1e-7);
 assert(Math.abs(Object.values(w.loadBreakdown).reduce((a,b)=>a+b,0)-w.load)<1e-7);
 assert(Number.isFinite(w.load)&&w.foot.every(f=>f.min<=90&&f.min>0));
 assert(w.foot.filter(f=>f.min>70).length<=2);
 if(Math.abs(w.vol-w.target)>w.target*.05)assert(w.warns.some(x=>['volume_short','weekly_volume_incompatible','volume_deviation'].includes(x.code)));
};
let count=0;
for(const vol of [120,150,180,210,240,300,420,540])for(const runs of [3,4,5,6,7])for(const block of ['s1','s2','vma']){
 const st={...base,vol,runs,block,qualityCount:3};
 for(const w of build(st).weeks){checkWeek(w,st);count++;}
}
const small={...base,vol:150,runs:4},smallPlan=build(small);
assert(smallPlan.weeks.filter(w=>!w.assim).every(w=>w.sessions.length===1));
assert(smallPlan.weeks.some(w=>w.warns.some(x=>x.code==='qualities_reduced')));
assert(smallPlan.weeks.every(w=>w.foot.length+w.sessions.length+1===4));
for(const [vol,warmup,cooldown] of [[150,15,5],[179,15,5],[180,20,8],[239,20,8],[240,24,10],[420,24,10]]){
 for(const activation of [false,true]){
  const session={fam:activation?'vma':'s1',variants:[{total:20,sector:activation?'vo2':'s1'}]};
  const s=E.prepareSession(session,vol);assert.equal(s.wu,Math.max(warmup+(activation?3:0),activation?20:0));assert.equal(s.cd,cooldown);
  const total=s.total;E.prepareSession(s);assert.equal(s.total,total);
 }
}
const large=E.planFootings({R:210,f:3,nQ:1,assim:false,heavy:false,vol:390,runs:5,sl:90,slMin:90,slSoft:90,slMax:90,isMara:false});
assert(large.foot.some(f=>f.min>60),'normal runs may exceed 60 min with 5 outings');
assert(large.foot.filter(f=>f.min>70).length<=2);
const calendar=E.buildCalendar({...base,mode:'cal',vol:420},E.predict(base));
for(const w of calendar.weeks.filter(w=>!w.raceWeek&&w.phase!=='intro')){
 const items=w.days.flatMap(d=>d.items);
 const duration=items.reduce((s,it)=>s+(it.kind==='q'?it.s.total:it.kind==='sl'?w.sl:it.f.min),0);
 assert(Math.abs(duration-w.vol)<1e-7,'placement keeps displayed minutes consistent');
 assert(Math.abs(Object.values(w.loadBreakdown).reduce((a,b)=>a+b,0)-w.load)<1e-7);
 assert(w.sl<=90);
 if(w.assim){assert.equal(w.sessions.length,0);assert(w.foot.some(f=>f.assimilationActive));}
}
for(const vol of [150,180,300,420])for(const runs of [3,4,5,6]){
 const st={...base,mode:'cal',vol,runs,qualityCount:3,avail:[true,true,true,true,true,true,true],q1Day:'',q2Day:'',q3Day:'',slDay:''};
 const plan=E.buildCalendar(st,E.predict(st));
 for(const w of plan.weeks.filter(w=>!w.raceWeek&&w.phase!=='intro')){
  const items=w.days.flatMap(d=>d.items);
  assert.equal(items.length,runs,'calendar preserves all requested outings when all days are available');
  const duration=items.reduce((sum,it)=>sum+(it.kind==='q'?it.s.total:it.kind==='sl'?w.sl:it.f.min),0);
  assert(Math.abs(duration-w.vol)<1e-7);
  assert(Math.abs(Object.values(w.loadBreakdown).reduce((a,b)=>a+b,0)-w.load)<1e-7);
  assert(w.sl<=90);
  for(let i=0;i<w.days.length-1;i++){
   const beforeHard=w.days[i+1].items.some(it=>it.kind==='q'||it.kind==='sl');
   if(beforeHard)for(const it of w.days[i].items.filter(it=>it.kind==='foot'&&it.f.type!=='active'))assert(it.f.min<=45);
  }
 }
}
console.log(`OK: ${count} weeks preserve outings, enforce quality limits, retain finite minutes/load and explain incompatible targets; adaptive preparation and COROS-ready duration fields.`);
