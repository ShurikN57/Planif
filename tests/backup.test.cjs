// Export / import of local data (audit DAT-1, issue #4).
const assert=require('node:assert/strict'),{test}=require('node:test');
const B=require('../planif-backup.js');
const engine=require('../planif-engine.js');
const E=engine.createEngine();
const st={mode:'cal',calStart:'2026-11-09',calRace:'2027-01-31',calDist:1,calGoal:null,avail:[false,true,true,false,true,true,true],q1Day:'1',q2Day:'4',q3Day:'',slDay:'6',vma:17,s2:14,s1lo:11.5,s1hi:12,refDist:0,refTime:1165,profile:1,penalty:false,ref2Dist:1,ref2Time:null,vol:300,runs:5,qualityCount:2,assimQ2:false};
const C=E.buildCalendar(st,E.predict(st));E.ensurePlanifSessionIds(C);
const plan=(id,extra={})=>({id,title:'10 km · 2027-01-31',createdAt:'2026-11-01T10:00:00.000Z',updatedAt:'2026-11-02T10:00:00.000Z',structure:{calStart:st.calStart,calRace:st.calRace,calDist:'1',vol:'5h00'},plan:JSON.parse(JSON.stringify(C)),moves:[],...extra});
const storage=()=>({
 'planif-global-v1':JSON.stringify({vma:'17',s2:'14',refTime:'19:25',calGoal:'39\'30"'}),
 'planif-active-plan-v1':E.serializeSavedPlans(plan('plan-a')),
 'planif-plan-history-v1':E.serializeSavedPlans([plan('plan-old',{archivedAt:'2026-10-01T12:00:00.000Z',archiveReason:'remplacé'})]),
 'planif-mode-v1':'cal','planif-theme':'dark','planif-speed-unit':'pace','calc-allures-tab':'cal',
 'planif-coros-profile-v1':'"guided"',
 // Device-specific values that must never leave the device.
 'planif-coros-v1':'{"clientId":"x"}','planif-strava-auth-v1':'{"token":"secret"}','planif-recovery-state-v1':'{"id":"plan-a"}'
});
const text=values=>JSON.stringify(B.createBackup(values,{version:'2026.11.08.01',exportedAt:'2026-11-08T10:00:00.000Z',timeZone:'Europe/Paris'}));
const withValue=(key,value)=>{const b=JSON.parse(text(storage()));b.values[key]=value;return JSON.stringify(b);};

test('export keeps exactly the planning data and preferences',()=>{
 const backup=B.createBackup(storage(),{version:'v',exportedAt:'2026-11-08T10:00:00.000Z'});
 assert.equal(backup.format,'planif-backup');assert.equal(backup.schema,1);
 assert.deepEqual(Object.keys(backup.values).sort(),['calc-allures-tab','planif-active-plan-v1','planif-coros-profile-v1','planif-global-v1','planif-mode-v1','planif-plan-history-v1','planif-speed-unit','planif-theme']);
 assert.equal(backup.values['planif-active-plan-v1'],storage()['planif-active-plan-v1'],'raw values are kept byte for byte');
 assert(!JSON.stringify(backup).includes('secret'));
 assert.equal(B.backupFileName('2026-11-08T10:00:00.000Z'),'planif-sauvegarde-2026-11-08.json');
});

test('a valid backup round-trips with a readable summary',()=>{
 const parsed=B.parseBackup(text(storage()));
 assert.deepEqual(parsed.summary,{version:'2026.11.08.01',exportedAt:'2026-11-08T10:00:00.000Z',activeTitle:'10 km · 2027-01-31',historyCount:1});
 assert.equal(parsed.values['planif-global-v1'],storage()['planif-global-v1'],'user text with quotes is accepted');
});

test('malformed or foreign files are refused with a clear message',()=>{
 const cases=[
  ['not json',/JSON illisible/],
  [JSON.stringify({format:'other'}),/pas une sauvegarde Planif/],
  [JSON.stringify({format:'planif-backup',schema:2,values:{}}),/non prise en charge/],
  [JSON.stringify({format:'planif-backup',schema:1}),/vide ou endommagée/],
  [JSON.stringify({format:'planif-backup',schema:1,values:{'planif-mode-v1':'cal'}}),/aucun plan/],
  [withValue('planif-strava-auth-v1','{}'),/clé inconnue/],
  [withValue('planif-mode-v1','calendar'),/inconnue/],
  [withValue('calc-allures-tab','<b>'),/inconnue/],
  [withValue('calc-allures-tab','not-a-tab'),/inconnue/],
  [withValue('planif-global-v1','{"vma":{"nested":1}}'),/invalide/],
  [withValue('planif-global-v1','{oops'),/illisible/],
  [withValue('planif-active-plan-v1','{"id":"x"}'),/structure manquante/],
  [withValue('planif-active-plan-v1',JSON.stringify({...plan('x'),plan:{...plan('x').plan,start:'demain'}})),/dates de course/],
  [withValue('planif-active-plan-v1',JSON.stringify({...plan('x'),dateZone:'Europe/Paris;x'})),/fuseau invalide/],
  [withValue('planif-plan-history-v1',JSON.stringify(Array.from({length:201},(_,i)=>{const p=plan('p'+i);p.plan.weeks=p.plan.weeks.slice(0,1);return p;}))),/historique invalide/],
  ['x'.repeat(B.MAX_BYTES+1),/trop volumineux/]
 ];
 for(const [input,message] of cases)assert.throws(()=>B.parseBackup(input),message,String(input).slice(0,80));
});

test('HTML and prototype keys are refused anywhere in an imported plan',()=>{
 const p=plan('x');p.title='<img src=x>';
 assert.throws(()=>B.parseBackup(withValue('planif-active-plan-v1',JSON.stringify(p))),/contenu inattendu/);
 const q=plan('y');q.plan.weeks[0].days[0].items.push({kind:'q',s:{note:'<script>'}});
 assert.throws(()=>B.parseBackup(withValue('planif-active-plan-v1',JSON.stringify(q))),/contenu inattendu/);
 const r=JSON.stringify(plan('z')).replace('"structure":{','"structure":{"__proto__":{"polluted":true},');
 assert.throws(()=>B.parseBackup(withValue('planif-active-plan-v1',r)),/clé interdite/);
 assert.equal({}.polluted,undefined);
});

test('import archives the current plan, keeps every distinct record and leaves other keys alone',()=>{
 const current=storage(),incoming=B.parseBackup(withValue('planif-active-plan-v1',E.serializeSavedPlans(plan('plan-new'))));
 const next=B.planImport(current,incoming,{now:'2026-11-08T12:00:00.000Z'});
 assert.equal(next['planif-active-plan-v1'],incoming.values['planif-active-plan-v1']);
 const history=JSON.parse(next['planif-plan-history-v1']);
 // Imported history (plan-old), then the current active plan archived; the current history equals plan-old and is kept once.
 assert.deepEqual(history.map(r=>r.id),['plan-old','plan-a']);
 assert.equal(history[1].archivedAt,'2026-11-08T12:00:00.000Z');assert.match(history[1].archiveReason,/avant import/);
 assert.equal(history[1].dateZone,JSON.parse(current['planif-active-plan-v1']).dateZone,'each record keeps its own zone');
 assert.equal('planif-coros-v1' in next,false);assert.equal('planif-strava-auth-v1' in next,false);
});

test('an imported plan keeps its calendar days and sessions in any zone',()=>{
 const incoming=B.parseBackup(text(storage()));
 const record=E.localizeSavedPlan(JSON.parse(incoming.values['planif-active-plan-v1']));
 const days=p=>p.weeks.flatMap(w=>w.days.map(d=>E.planDateKey(d.date)));
 assert.deepEqual(days(record.plan),days(C));
 assert.deepEqual(record.plan.weeks.flatMap(w=>w.days.flatMap(d=>d.items.map(it=>it.planifId))),C.weeks.flatMap(w=>w.days.flatMap(d=>d.items.map(it=>it.planifId))));
});

test('rejects missing workout data and attribute-breaking session IDs',()=>{
 for(const item of [{kind:'q'},{kind:'foot'}, {kind:'race'}, {kind:'unknown'},
   {kind:'sl',planifId:'x" data-act="import'}]){
  const p=plan('invalid');p.plan.weeks[0].days[0].items.push(item);
  assert.throws(()=>B.parseBackup(withValue('planif-active-plan-v1',JSON.stringify(p))),/jour ou séance invalide/);
 }
});

test('import keeps the exact plan for recovery and rolls back earlier writes on failure',()=>{
 const vm=require('node:vm'),{uiSource}=require('./helpers/runtime.cjs');
 const current=storage(),incoming=B.parseBackup(withValue('planif-active-plan-v1',E.serializeSavedPlans(plan('plan-new'))));
 const data=new Map(Object.entries(current)),active='planif-active-plan-v1',history='planif-plan-history-v1',recovery='recovery',pending='pending';
 data.set(pending,'true');
 let failHistory=true;
 const ctx={refDraft:null,structureEditing:false,PlanifBackup:B,STORE:{active,history},RECOVERY_STATE:recovery,REF_PLAN_PENDING_KEY:pending,
  localStorage:{getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k),setItem:(k,v)=>{
   if(k===history&&failHistory){failHistory=false;throw Error('quota');}data.set(k,v);
  }}};
 vm.createContext(ctx);
 vm.runInContext(require('./helpers/source.cjs').between(uiSource,'BACKUP_SAFETY_KEY','importBackup'),ctx);
 assert.throws(()=>ctx.applyBackupImport(incoming),/Tes données actuelles sont conservées/);
 for(const [key,value] of Object.entries(current))assert.equal(data.get(key),value,key);
 assert.equal(data.get(pending),'true');assert.equal(data.has(recovery),false);
 const safety=JSON.parse(data.get('planif-before-import-latest'));
 assert.equal(safety.values[active],current[active]);
 ctx.applyBackupImport(incoming);
 assert.equal(data.get(active),incoming.values[active],'import does not recalculate workouts');
 assert.deepEqual(JSON.parse(data.get(recovery)),{id:'plan-new',status:'restored'});
 assert.equal(data.has(pending),false);
});
