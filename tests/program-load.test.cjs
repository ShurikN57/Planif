const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../planif-engine.js').createEngine(),clone=x=>JSON.parse(JSON.stringify(x));
const st={...require('./fixtures/plans-before-modules.json')[0].st,vma:18,s1lo:12,s1hi:12.5,s2:14.5,refDist:1,refTime:2400,profile:2,penalty:false,mode:'cal',calStart:'2026-10-19',calRace:'2027-01-10',calDist:1,calGoal:null,vol:300,runs:5,qualityCount:2,avail:[true,true,true,true,true,true,true],q1Day:'1',q2Day:'4',q3Day:'',slDay:'6'};
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const session=(parts,rec=0)=>E.withLoad({fam:'s2',variants:[{parts,rec,work:parts.reduce((n,p)=>n+p[0],0),total:parts.reduce((n,p)=>n+p[0],0)+rec,structure:{type:'continuous'},sector:'s2'},{parts:clone(parts),rec,work:parts.reduce((n,p)=>n+p[0],0),total:parts.reduce((n,p)=>n+p[0],0)+rec,structure:{type:'continuous'},sector:'s2'}]},st);
const s=session([[20,st.s2]],3);close(s.load,20*.6+(s.wu+s.cd+3)*.2);assert.equal(s.variants[0].density,1);
const mixed=session([[10,E.lt1Ref(st)],[5,st.s2],[2,st.vma*1.05]],4);
close(mixed.load,10*.3+5*.6+2*1.2+(mixed.wu+mixed.cd+4)*.2);
const dense=session([[20,st.s2]],1),loose=session([[20,st.s2]],5);close(loose.load-dense.load,4*.2);
const refs={st,p:E.predict(st)},model=E.loadPersonalModel(refs);
for(const p of model.points.filter(p=>p.race))close(E.programLoadFactor(p.speed,st),p.factor);
for(const [v,f] of [[100,1],[102.5,1.1],[105,1.2],[107.5,1.35],[110,1.5]])close(E.programLoadFactor(st.vma*v/100,st),f);
const invalid={...st,s2:16.5};assert(E.loadPersonalModel({st:invalid,p:E.predict(invalid)}).conflicts.length);close(E.programLoadFactor(invalid.s2,invalid),.6);
assert(E.programLoadFactor(st.vma*1.15,st)>=1.5,'outside 110% uses conservative historical weighting');
const plan=E.buildCalendar(st,E.predict(st));E.ensurePlanifSessionIds(plan);
for(const w of plan.weeks){
 const sum=w.days.flatMap(d=>d.items).reduce((n,it)=>n+(it.s?.load??it.f?.load??it.load??0),0);close(sum,w.load);close(Object.values(w.loadBreakdown).reduce((a,b)=>a+b,0),w.load);
 assert(w.loadMin<=w.load+1e-7&&w.loadMax>=w.load-1e-7);assert.equal(w.loadModel,'personal-v1');
 assert.equal(w.heavy,w.safetyLoad.heavy);assert.deepEqual(w.costly,w.safetyLoad.costly);
}
const once=clone(plan);E.recalculatePlanLoads(plan,st);assert.deepEqual(clone(plan),once,'re-accounting is idempotent');
const legacy=clone(plan);delete legacy.loadModel;legacy.weeks.forEach(w=>{delete w.loadModel;w.load=w.safetyLoad.load;});
const done=legacy.weeks[3].days.flatMap(d=>d.items).find(it=>it.kind==='q').planifId;
const protectedPlan=E.recalculatePlanLoads(clone(legacy),st,{preserve:true,today:new Date(2026,9,21),completedIds:[done]});
assert.deepEqual(protectedPlan.weeks[0],legacy.weeks[0],'entire started week remains byte-equivalent');assert.deepEqual(protectedPlan.weeks[3],legacy.weeks[3],'future completed session protects its full week');assert.equal(protectedPlan.weeks[2].loadModel,'personal-v1');
const source=fs.readFileSync(require.resolve('../planif-ui.js'),'utf8'),data=new Map(),record={id:'test-load-plan',structure:{},plan:legacy},saved=JSON.stringify(record);data.set('active',saved);data.set('planif-strava-records-v1:athlete:test-load-plan',JSON.stringify({[done]:{status:'realized'}}));
let failActive=false,alerts=0;
const context={...E,activePlan:clone(record),planHistory:[],STORE:{active:'active',history:'history'},recoveryState:null,refPlanPending:false,structureEditing:false,globalThis:null,readState:()=>st,validSavedPlan:p=>!!p?.plan?.weeks,getJson:(k,f)=>JSON.parse(data.get(k)||'null')||f,inputErrors:()=>[],console:{error(){}},alert:()=>alerts++,localStorage:{get length(){return data.size;},key:i=>[...data.keys()][i],setItem:(k,v)=>{if(k==='active'&&failActive)throw Error('quota');data.set(k,v);}}};delete context.globalThis;
// Use the real date revival and migration code with an explicit fixed date for repeatability.
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function reviveSavedPlan('),source.indexOf('function recoveryHtml()')),context);
const migration=source.slice(source.indexOf('function loadProtectedIds()'),source.indexOf('function render(){',source.indexOf('function loadProtectedIds()'))).replace('preserve:true,completedIds:loadProtectedIds()','preserve:true,today:new Date(2026,9,21),completedIds:loadProtectedIds()');
vm.runInContext(migration,context);vm.runInContext('migrateProgramLoads(readState())',context);
assert.equal(context.activePlan.plan.loadModel,'personal-v1');assert.equal(context.planHistory.length,1);assert.deepEqual(clone(context.planHistory[0].plan),legacy,'backup contains unmodified old plan');assert.deepEqual(clone(context.activePlan.plan.weeks[3]),legacy.weeks[3],'cached validation protects session before Strava initializes');
vm.runInContext('migrateProgramLoads(readState())',context);assert.equal(context.planHistory.length,1,'migration does not repeat');
context.activePlan=clone(record);context.planHistory=[];data.set('active',saved);failActive=true;vm.runInContext('migrateProgramLoads(readState())',context);assert.equal(data.get('active'),saved);assert.deepEqual(context.activePlan,record);assert.equal(alerts,1,'storage failure leaves active plan intact and visible');
console.log('OK: shared personalized coefficients; exact block sums; recoveries without density multipliers; all calendar totals; safety decisions; idempotence; protected weeks; archive-before-migration; cached completion and quota failure.');
