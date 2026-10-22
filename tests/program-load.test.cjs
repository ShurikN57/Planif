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
// Screenshot regression: a restored distance-based S2 session is absent from the
// stale sessions list/quality counter, but is present in the visible calendar.
const s1=session([[35,E.lt1Ref(st)]],5),s2=session([[4.5*257/60,st.s2]],5);
s1.total=74;s2.total=60;
s2.variants.forEach(v=>{v.structure={type:'intervals',reps:15,distanceM:300,repDurationMin:300/1000*257/60};});
const screenshot={weeks:[{sessions:[clone(s1)],foot:[],sl:65,slS1:0,vol:250,qualityMinutes:35,pct:14,load:999,targetVolume:250,days:[
 {date:'2026-10-06',items:[{kind:'q',planifId:'done-s1',s:s1}]},
 {date:'2026-10-08',items:[{kind:'q',planifId:'done-s2',s:s2}]},
 {date:'2026-10-10',items:[{kind:'foot',planifId:'done-jogg',f:{min:35,type:'std'}}]},
 {date:'2026-10-11',items:[{kind:'sl',planifId:'done-sl'}]}]}]};
const reconciled=E.recalculatePlanSummary(clone(screenshot),st),rw=reconciled.weeks[0];
close(rw.qualityMinutes,35+4.5*257/60);close(rw.vol,74+60+35+65);close(rw.pct,rw.qualityMinutes/rw.vol*100);
close(rw.load,rw.days.flatMap(d=>d.items).reduce((n,it)=>n+(it.s?.load??it.f?.load??it.load),0));
assert.equal(rw.sessions.length,1,'reconciliation does not regenerate or replace workout lists');
assert.deepEqual(clone(E.recalculatePlanSummary(clone(reconciled),st)),clone(reconciled),'saved summary reconciliation is idempotent');
const mixedWeek={weeks:[{sessions:[mixed],foot:[],sl:0}]};
close(E.recalculatePlanSummary(clone(mixedWeek),st).weeks[0].qualityMinutes,17);
const legacy=clone(plan);delete legacy.loadModel;legacy.weeks.forEach(w=>{delete w.loadModel;w.load=w.safetyLoad.load;});
const done=legacy.weeks[3].days.flatMap(d=>d.items).find(it=>it.kind==='q').planifId;
const protectedPlan=E.recalculatePlanLoads(clone(legacy),st,{preserve:true,today:new Date(2026,9,21),completedIds:[done]});
assert.deepEqual(protectedPlan.weeks[0],legacy.weeks[0],'entire started week remains byte-equivalent');assert.deepEqual(protectedPlan.weeks[3],legacy.weeks[3],'future completed session protects its full week');assert.equal(protectedPlan.weeks[2].loadModel,'personal-v1');
const source=fs.readFileSync(require.resolve('../planif-ui.js'),'utf8'),data=new Map(),record={id:'test-load-plan',structure:{},plan:legacy},saved=JSON.stringify(record);data.set('active',saved);data.set('planif-strava-records-v1:athlete:test-load-plan',JSON.stringify({[done]:{status:'realized'}}));
const calendarSource=source.slice(source.indexOf('function appCalendarWeeks('),source.indexOf('function appBlockWeeks('));
assert(calendarSource.includes('${fmtDur(w.vol)}<small>${pts(w.load)}</small>'),'weekly header retains volume and points');
assert(!calendarSource.includes('Charge estimée :'),'weekly footer does not duplicate header points');
assert(!calendarSource.includes('Qualité : travail cumulé'),'weekly footer stays concise');
assert(calendarSource.includes('Qualité ${Math.round(w.qualityMinutes)}')&&calendarSource.includes('Cible ${fmtDur(w.targetVolume)}'),'quality and target remain visible');
const noteContext={};vm.createContext(noteContext);
vm.runInContext(source.slice(source.indexOf('function loadAccountingNote('),source.indexOf('const activeRangeText=')),noteContext);
assert.equal(noteContext.loadAccountingNote({}), '','no empty explanatory paragraph');
assert.equal(noteContext.loadAccountingNote({loadNotices:['Références incohérentes.']}),'<p class="lbl">Références incohérentes.</p>','model warnings remain visible');
assert(!source.includes('Charge estimée du programme · mêmes coefficients'),'generic accounting explanation removed');
assert(source.includes('class="sessionCharge"'),'workout detail exposes points without opening an info panel');
assert(!source.slice(source.indexOf('function tileHtml('),source.indexOf('const refOf=')).includes('Charge estimée'),'calendar tiles stay concise');
let failActive=false,alerts=0;
const context={...E,activePlan:clone(record),planHistory:[],STORE:{active:'active',history:'history'},recoveryState:null,refPlanPending:false,structureEditing:false,globalThis:null,readState:()=>st,validSavedPlan:p=>!!p?.plan?.weeks,getJson:(k,f)=>JSON.parse(data.get(k)||'null')||f,inputErrors:()=>[],console:{error(){}},alert:()=>alerts++,localStorage:{get length(){return data.size;},key:i=>[...data.keys()][i],setItem:(k,v)=>{if(k==='active'&&failActive)throw Error('quota');data.set(k,v);}}};delete context.globalThis;
// Use the real date revival and migration code with an explicit fixed date for repeatability.
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function reviveSavedPlan('),source.indexOf('function recoveryHtml()')),context);
const migration=source.slice(source.indexOf('function loadProtectedIds()'),source.indexOf('function render(){',source.indexOf('function loadProtectedIds()'))).replace('preserve:true,completedIds:loadProtectedIds()','preserve:true,today:new Date(2026,9,21),completedIds:loadProtectedIds()');
vm.runInContext(migration,context);vm.runInContext('migrateProgramLoads(readState())',context);
assert.equal(context.activePlan.plan.loadModel,'personal-v1');assert.equal(context.activePlan.plan.summaryVersion,2);assert.equal(context.planHistory.length,1);assert.deepEqual(clone(context.planHistory[0].plan),legacy,'backup contains unmodified old plan');
// Reconcile reporting for past/completed weeks too, without editing the workouts.
const withoutAccounting=x=>{if(Array.isArray(x))return x.map(withoutAccounting);if(!x||typeof x!=='object')return x;return Object.fromEntries(Object.entries(x).filter(([k])=>!['load','loadMin','loadMax','loadBreakdown','bd','density','workLoad','slLoad','slLoadMin','slLoadMax','loadModel','loadNotices','safetyLoad','vol','volume','qualityMinutes','pct','qualityPct','summaryVersion'].includes(k)).map(([k,v])=>[k,withoutAccounting(v)]));};
assert.deepEqual(withoutAccounting(clone(context.activePlan.plan)),withoutAccounting(legacy),'migration retains every workout, date, pace, identifier and format including completed days');
vm.runInContext('migrateProgramLoads(readState())',context);assert.equal(context.planHistory.length,1,'migration does not repeat');
context.activePlan=clone(record);context.planHistory=[];data.set('active',saved);failActive=true;vm.runInContext('migrateProgramLoads(readState())',context);assert.equal(data.get('active'),saved);assert.deepEqual(context.activePlan,record);assert.equal(alerts,1,'storage failure leaves active plan intact and visible');
console.log('OK: shared personalized coefficients; exact block sums; recoveries without density multipliers; all calendar totals; safety decisions; idempotence; protected weeks; archive-before-migration; cached completion and quota failure.');
