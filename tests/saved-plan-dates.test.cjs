// Saved plans keep their calendar days whatever the device time zone (audit lot L3, issue #3).
// CI runs this file under Europe/Paris, America/Los_Angeles and Pacific/Auckland.
const assert=require('node:assert/strict'),vm=require('node:vm'),{test}=require('node:test');
const engine=require('../planif-engine.js');
const {loadRuntime,uiSource}=require('./helpers/runtime.cjs');
const {parisJson}=require('./helpers/paris-dates.cjs');
const E=engine.createEngine();
const st={mode:'cal',calStart:'2026-10-05',calRace:'2026-12-20',calDist:1,calGoal:null,avail:[false,true,true,false,true,true,true],q1Day:'1',q2Day:'4',q3Day:'',slDay:'6',vma:17,s2:14,s1lo:11.5,s1hi:12,refDist:0,refTime:1165,profile:1,penalty:false,ref2Dist:1,ref2Time:null,block:'spec',specDist:1,specGoal:null,N:4,vol:300,runs:5,qualityCount:2,assimQ2:false};
const C=E.buildCalendar(st,E.predict(st));
const dayKeys=plan=>[E.planDateKey(plan.start),E.planDateKey(plan.race.date),...plan.weeks.flatMap(w=>[w.startDate,w.endDate,...w.days.map(d=>d.date)].map(E.planDateKey))];
const expected=dayKeys(C);
// As stored by a device in Paris (DST change on 25 October included).
const writtenInParis=JSON.parse(parisJson({id:'p',structure:{},plan:C}));

test('a recorded zone gives the exact calendar day',()=>{
 assert.equal(E.savedCalendarDay('2026-10-18T22:00:00.000Z','Europe/Paris'),'2026-10-19');
 assert.equal(E.savedCalendarDay('2026-10-25T23:00:00.000Z','Europe/Paris'),'2026-10-26');
 assert.equal(E.savedCalendarDay('2026-10-19T07:00:00.000Z','America/Los_Angeles'),'2026-10-19');
 assert.equal(E.savedCalendarDay('2026-12-19T11:00:00.000Z','Pacific/Auckland'),'2026-12-20');
 assert.equal(E.savedCalendarDay('2026-12-19T10:00:00.000Z','Pacific/Kiritimati'),'2026-12-20');
 assert.equal(E.savedCalendarDay('not a date','Europe/Paris'),null);
});

test('plans saved before the zone was recorded keep their Paris days',()=>{
 for(const iso of ['2026-10-18T22:00:00.000Z','2026-10-25T23:00:00.000Z','2027-03-27T23:00:00.000Z','2027-03-28T22:00:00.000Z'])
  assert.equal(E.savedCalendarDay(iso,''),new Date(Date.parse(iso)+3*3600000).toISOString().slice(0,10),iso);
 // An unknown zone falls back to the same rule.
 assert.equal(E.savedCalendarDay('2026-10-18T22:00:00.000Z','Nowhere/Invalid'),'2026-10-19');
});

test('a plan written in Paris keeps every day in the current zone',()=>{
 for(const record of [writtenInParis,{...writtenInParis,dateZone:'Europe/Paris'}]){
  const local=E.localizeSavedPlan(record);
  assert.equal('dateZone' in local,false,'dateZone exists only in storage');
  assert.deepEqual(dayKeys(local.plan),expected);
  assert.equal(local.plan.weeks[0].days[0].date,C.weeks[0].days[0].date.toISOString(),'local midnight of the same day');
 }
 assert.deepEqual(writtenInParis,JSON.parse(parisJson({id:'p',structure:{},plan:C})),'stored record is not mutated');
});

test('a plan written in Auckland or Los Angeles keeps its days',()=>{
 for(const zone of ['Pacific/Auckland','America/Los_Angeles']){
  // Rewrite each day as the instant of midnight in that zone.
  const plan=JSON.parse(JSON.stringify(writtenInParis.plan),(key,value)=>['date','start','startDate','endDate'].includes(key)&&typeof value==='string'?zoneMidnight(E.savedCalendarDay(value,'Europe/Paris'),zone):value);
  const local=E.localizeSavedPlan({id:'z',plan,dateZone:zone});
  assert.deepEqual(dayKeys(local.plan),expected,zone);
 }
});

test('a legacy calendar opened after travel uses its race date to disambiguate writer offsets',()=>{
 const plan=structuredClone(C);
 E.ensurePlanifSessionIds(plan);
 const structure={calStart:st.calStart,calRace:st.calRace};
 const ref=plan.weeks.flatMap(w=>w.days).find(d=>d.items.some(i=>i.kind==='q'));
 const item=ref.items.find(i=>i.kind==='q');
 const moves={[item.planifId]:{from:'2026-10-05',to:E.planDateKey(ref.date)}};
 for(const zone of ['Pacific/Kiritimati','Pacific/Auckland','America/Los_Angeles']){
  const raw=JSON.parse(JSON.stringify(plan),function(key,value){
   return this[key] instanceof Date?zoneMidnight(E.planDateKey(this[key]),zone):value;
  });
  const record={id:'legacy',structure,plan:raw,moves,createdAt:'2026-10-01T12:00:00Z'};
  const snapshot=JSON.stringify(record);
  const local=E.localizeSavedPlan(record);
  assert.deepEqual(dayKeys(local.plan),expected,zone);
  assert.deepEqual(local.plan,E.snapshotPlan(plan),'dates and complete workout contents are unchanged after reloading');
  assert.deepEqual(local.moves,moves);
  assert.equal(local.createdAt,record.createdAt);
  assert.equal(JSON.stringify(record),snapshot);
  const saved=JSON.parse(E.serializeSavedPlans(local));
  assert.deepEqual(E.localizeSavedPlan(saved),local);
 }
});

test('the current zone is a no-op and other values are untouched',()=>{
 const zone=E.currentTimeZone();assert(zone);
 const stored={id:'p',plan:JSON.parse(JSON.stringify(C)),dateZone:zone};
 const local=E.localizeSavedPlan(stored);
 assert.equal(JSON.stringify(local.plan),JSON.stringify(stored.plan));assert.equal('dateZone' in local,false);
 for(const value of [null,undefined,'x',{id:'no-plan'},[1]])assert.equal(E.localizeSavedPlan(value),value);
});

test('storage records the zone on plans and plan lists only',()=>{
 const zone=E.currentTimeZone();
 assert.equal(JSON.parse(E.serializeSavedPlans({id:'p',plan:{weeks:[]}})).dateZone,zone);
 assert.deepEqual(JSON.parse(E.serializeSavedPlans([{id:'a',plan:{}},{id:'b'}])).map(r=>r.dateZone),[zone,undefined]);
 assert.equal(E.serializeSavedPlans(null),'null');
});

test('the application loads and saves plans with their zone',()=>{
 const elements=new Map(),data=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,type:id.startsWith('mode')?'radio':'text',appendChild(){},addEventListener(){}});return elements.get(id);};
 const ctx={document:{getElementById:el,createElement:()=>({})},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},console};
 vm.createContext(ctx);loadRuntime(ctx);
 vm.runInContext(require('./helpers/source.cjs').functionSource(uiSource,'refPendingLoad'),ctx);
 vm.runInContext('this.api={load,putJson,keys:STORE,defaults:()=>({...DEFAULTS}),active:()=>activePlan,history:()=>planHistory};',ctx);
 const {api}=ctx;
 const stored={...writtenInParis,id:'paris-plan',dateZone:'Europe/Paris'};
 data.set(api.keys.active,JSON.stringify(stored));
 data.set(api.keys.history,JSON.stringify([{...writtenInParis,id:'old-plan',archivedAt:'2026-10-01T12:00:00Z'}]));
 data.set(api.keys.global,JSON.stringify(api.defaults()));data.set(api.keys.mode,'cal');
 api.load();
 assert.deepEqual(dayKeys(api.active().plan),expected);
 assert.deepEqual(dayKeys(api.history()[0].plan),expected);
 assert(api.putJson(api.keys.active,api.active()));
 const rewritten=JSON.parse(data.get(api.keys.active));
 assert.equal(rewritten.dateZone,E.currentTimeZone());
 assert.deepEqual(dayKeys(E.localizeSavedPlan(rewritten).plan),expected);
 // load() archives the active plan once (weekly-balance migration): written history records carry the zone.
 const history=JSON.parse(data.get(api.keys.history));
 assert.deepEqual(history.map(r=>r.id),['paris-plan','old-plan']);
 for(const record of history){assert.equal(record.dateZone,E.currentTimeZone());assert.deepEqual(dayKeys(E.localizeSavedPlan(record).plan),expected);}
});

function zoneMidnight(day,zone){
 const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'longOffset'});
 const offset=t=>{const m=/GMT([+-])(\d{2}):(\d{2})/.exec(fmt.formatToParts(new Date(t)).find(p=>p.type==='timeZoneName').value);return m?(m[1]==='+'?1:-1)*(+m[2]*60+ +m[3]):0;};
 const [y,mo,d]=day.split('-').map(Number),base=Date.UTC(y,mo-1,d);
 let t=base-offset(base)*60000;t=base-offset(t)*60000;return new Date(t).toISOString();
}
