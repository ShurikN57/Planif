const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,type:'text',appendChild(){},addEventListener(){}});return elements.get(id);};
const context={document:{getElementById:el,createElement:()=>({})},localStorage:{getItem:()=>null,setItem(){}},console};vm.createContext(context);
const start=html.indexOf('const RULES='),end=html.indexOf('const CAPLAB=');
vm.runInContext("const $=id=>document.getElementById(id);\n"+html.slice(start,end)+`\nthis.engine={RULES,planPhases,buildCalendar,buildWeek,buildPlan,getBlock,predict,p10Alternating,makeAlternatingSession,maxFractionMinutes,minFractionMinutes,presentVariantRaw,sessionTitle,prepareSession,makeMixedSession,placeWeek,efBand,efBandText,joggTitle};`,context);
const E=context.engine;
const state={mode:'cal',calStart:'2026-10-06',calRace:'2026-12-20',calDist:1,calGoal:null,avail:[false,true,true,false,true,true,true],q1Day:'1',q2Day:'4',q3Day:'',slDay:'6',vma:17,s2:14,s1lo:11.5,s1hi:12,refDist:0,refTime:19*60+25,profile:1,penalty:false,ref2Dist:1,ref2Time:null,block:'spec',specDist:1,specGoal:null,N:4,vol:300,runs:5,qualityCount:2,assimQ2:false};
const pred=E.predict(state);
for(let n=5;n<=24;n++){
 const plan=E.planPhases(n,1);assert.equal(plan.length,n);
 const specific=plan.filter(p=>p.kind==='charge'&&p.block==='spec').length;
 assert([4,5].includes(specific),`N=${n}: ${specific} specific weeks`);
 let consecutive=0;for(const p of plan){if(p.kind==='charge')consecutive++;else consecutive=0;assert(consecutive<=5);}
 // Exhaust all permitted upstream compositions: if four can fit, five must not be selected.
 if(n<=19)assert.equal(specific,4,`Prefer four at N=${n}`);
}
for(let n=1;n<=4;n++)assert.equal(E.planPhases(n,1).length,n);
const c=E.buildCalendar(state,pred);assert(!c.error);assert.equal(c.weeks.length,11);assert.equal(c.plan.filter(p=>p.kind==='charge'&&p.block==='spec').length,4);
for(const w of c.weeks){assert(w.sl<=90);assert(Number.isFinite(w.load));assert(Math.abs(w.qualityMinutes-(w.z.z2+w.z.z3+w.z.z4))<1e-8);for(const s of w.sessions)for(const v of s.variants)assert.equal(v.capFail.length,0);}
const peak=c.weeks.at(-2);assert.equal(peak.sl,60);assert.equal(peak.sessions[1].fam,'alternating');
const alt=peak.sessions[1],v=alt.variants[0];assert.equal(v.structure.sets,10);assert.equal(v.rec,0);assert(Math.abs(v.parts.reduce((a,p)=>a+p[0],0)-v.work)<1e-9);assert(v.raceWork<v.work);assert(E.presentVariantRaw(v).text.includes('sans récupération'));assert(E.sessionTitle(alt));
const exact=E.p10Alternating(36,{...state,s1lo:60/4.9-.5,s1hi:60/4.9-.5},{v:60/4.1});assert.equal(exact.length,3);assert(Math.abs(exact[2].work-36)<1e-9);
// Slow athletes and small quality budgets cannot be forced into a 40+ minute continuous alternation.
assert.equal(E.makeAlternatingSession(20,state,{v:pred[1].v}),null);
assert(E.p10Alternating(36,{...state,s1lo:9,s1hi:9,s2:11},{v:12}).every(v=>v.work<=38));
// Both options of the S2 complement are short when the primary AS10 option is long.
for(let k=0;k<5;k++){
 const st={...state,mode:'bloc',specGoal:2491},b=E.getBlock(st,pred),w=E.buildWeek(b,st,{k,N:5,t:k/4,assim:false,vol:330,memory:{},block:'spec',specDist:1});
 if(w.sessions[0].variants.some(v=>E.maxFractionMinutes(v)>=6)&&w.sessions[1]?.fam==='s2')assert(w.sessions[1].variants.every(v=>E.maxFractionMinutes(v)<=4));
 assert(w.sl<=90);
}
// Calendar date, not a fixed Sunday, governs J-7 cap; all other distances retain their existing limit.
const weekday=E.buildCalendar({...state,calRace:'2026-12-18',slDay:'4'},pred);assert.equal(weekday.weeks.at(-2).sl,60);
const five=E.buildCalendar({...state,calDist:0},pred);assert(five.weeks.some(w=>w.sl>90));


for(const w of c.weeks)for(const session of w.sessions){if(session.isLong)continue;assert.equal(session.wu,session.activation?27:24);assert.equal(session.cd,10);assert(Math.abs(session.total-(session.wu+Math.max(...session.variants.map(v=>v.total))+10))<1e-9);const before=session.total;E.prepareSession(session);assert.equal(session.total,before,'preparation must not be added twice');}
const preparedS1=E.prepareSession({fam:'s1',variants:[{total:25}],wu:20,cd:10});assert.equal(preparedS1.total,59);
const preparedAs10=E.prepareSession({fam:'spec',dist:1,variants:[{total:25}],wu:20,cd:10});assert.equal(preparedAs10.total,62);

// Regression: the October transition used to add 40 min S1 and 18 min S2.
const transition=c.weeks[1].sessions[0];assert.equal(transition.fam,'mixed');
for(const option of transition.variants){const [a,b]=option.structure.components;assert(a.variant.work<=25);assert(b.variant.work<=10);assert(option.work<=35);assert(E.presentVariantRaw(option).chips.every(chip=>/km\/h|km/.test(chip)));}
// Every mixture stays within its component limits and its requested shared envelope.
for(const [key,cfg] of Object.entries(E.RULES.mixed.combinations))for(const role of cfg.contexts)for(const budget of [12,18,25,30,35,50]){
 const [a,b]=key.split('>'),mix=E.makeMixedSession(a,b,60,20,role,1,1,state,{maxMixedWork:budget});
 if(!mix)continue;
 for(const variant of mix.variants){assert(variant.work<=Math.min(cfg.maxWork,budget)+1e-9);assert(variant.structure.components[0].variant.work<=cfg.maxPrimary+1e-9);assert(variant.structure.components[1].variant.work<=cfg.maxSecondary+1e-9);assert.equal(variant.capFail.length,0);const [slow,fast]=variant.structure.components;assert(E.maxFractionMinutes(fast.variant)<E.minFractionMinutes(slow.variant),'faster fractions must be shorter in both options');}
}
assert.equal(E.makeMixedSession('s1','s2',25,10,'transition',1,1,state,{maxMixedWork:12}),null,'no oversized fallback when no format fits');
// Check actual option volumes after replacement, across different athlete volumes and durations.
for(const vol of [180,240,300,360,420])for(const date of ['2026-11-29','2026-12-20','2027-01-17']){
 const plan=E.buildCalendar({...state,vol,calRace:date,assimQ2:true},pred);assert(!plan.error);
 for(const week of plan.weeks){
  if(week.sessions.some(s=>s.fam==='mixed'))assert(week.sessions.reduce((sum,s)=>sum+Math.max(...s.variants.map(v=>v.work)),0)<=week.budget[1]/100*week.target+1e-9);
 }
}
// Regression: normal 50 min Wednesday before rest; recovery 45 min Saturday between VO2 and long run.
const fourth=c.weeks[3],itemOn=(week,day)=>week.days.find(d=>(d.date.getDay()+6)%7===day).items[0];
assert.equal(itemOn(fourth,2).f.type,'std');assert.equal(itemOn(fourth,2).f.min,50);
assert.equal(itemOn(fourth,5).f.type,'rec');assert.equal(itemOn(fourth,5).f.min,45);
assert.equal(itemOn(fourth,3),undefined);assert.equal(itemOn(fourth,6).kind,'sl');
// Repositioned days use the same contextual rule, and redistribution preserves weekly minutes/load.
const q=(fam,load)=>({fam,variants:[{sector:fam==='vmaShort'?'vo2':fam}],loadMax:load,dist:undefined});
const synthetic={sessions:[q('s2',60),q('vmaShort',40)],foot:[{type:'rec',min:40,load:16},{type:'std',min:55,load:22}],sl:80};
const startDate=new Date(2026,9,26),endDate=new Date(2026,10,1),schedule={...state,avail:[true,true,true,true,true,true,false],q1Day:'0',q2Day:'3',slDay:'5'};
const placed=E.placeWeek(synthetic,{start:startDate,end:endDate},schedule);
const footAt=day=>placed.list.find(d=>(d.date.getDay()+6)%7===day).items[0].f;
assert.equal(footAt(1).type,'std');assert.equal(footAt(1).min,50);assert.equal(footAt(4).type,'rec');assert.equal(footAt(4).min,45);
assert.equal(synthetic.foot.reduce((sum,f)=>sum+f.min,0),95);assert.equal(synthetic.foot.reduce((sum,f)=>sum+f.load,0),38);
console.log('OK: mixed component/shared/weekly budgets, actual pace chips, contextual footing placement, conserved volume/load, specific weeks, long-run caps and COROS preparation accounting.');

const mixedText=E.presentVariantRaw(transition.variants[0]).text.split(', ')[0];
assert.equal(mixedText,"S1 : 5 × 5' — S2 : 3 × 3'");
assert(!E.presentVariantRaw(transition.variants[0]).text.includes('Transition'));
assert.equal(transition.variants[0].work,34);
for(const option of transition.variants){const [slow,fast]=option.structure.components;assert(E.maxFractionMinutes(fast.variant)<E.minFractionMinutes(slow.variant));}
// A 4-min S1 ladder cannot be followed by a 4- or 5-min S2 fraction.
assert.equal(E.minFractionMinutes({structure:{type:'ladder',durationsMin:[4,6,8,6,4]}}),4);
assert.equal(E.minFractionMinutes({structure:{type:'continuous',durationMin:25}}),25);
console.log('OK: complete mixed summary, shorter faster fractions in both options, shared caps and preserved calendar rules.');

// Jogg: one visible category and no imposed easy pace, including LD titles.
for(const type of ['rec','std','pro']){
 assert.equal(E.joggTitle({type}),'Jogg’');
 assert.equal(E.joggTitle({type,ld:'strides'}),'Jogg + LD');
 assert.equal(E.efBandText(type,state),E.efBandText('std',state));
 assert(E.efBandText(type,state).includes('/km ('));
 assert.deepEqual(Array.from(E.efBand(type,state)),Array.from(E.efBand('std',state)));
}
// Assimilation is an easy week regardless of the obsolete two-quality setting.
for(const block of ['aero','s1','s2','vma','eco','spec'])for(const runs of [3,4,5,6])for(const vol of [180,240,300,420])for(const specDist of [0,1,2,3]){
 const st={...state,block,specDist,runs,vol,assimQ2:true},b=E.getBlock(st,pred);
 const w=E.buildWeek(b,st,{k:4,N:4,t:1,assim:true,vol,memory:{},block,specDist});
 assert.equal(w.sessions.length,0);assert.equal(w.qualityMinutes,0);
 const active=w.foot.filter(f=>f.assimilationActive);assert.equal(active.length,1);
 const f=active[0];assert([10,15,20].includes(f.activeRange[0]));assert.equal(f.activeRange[0],f.activeRange[1]);
 assert(f.wu>=10);assert.equal(f.wu+f.activeRange[0]+f.cd,f.min);
 assert.equal(w.vol,w.sl+w.foot.reduce((sum,f)=>sum+f.min,0));assert(Number.isFinite(w.load));
 assert.equal(w.z.z1,w.vol);assert(w.foot.length+1<=runs);
}
for(const w of c.weeks.filter(w=>w.assimilation)){
 assert.equal(w.sessions.length,0);
 const active=w.days.flatMap(d=>d.items.map(it=>({d,it}))).find(x=>x.it.kind==='foot'&&x.it.f.assimilationActive);
 assert(active);assert.equal((active.d.date.getDay()+6)%7,+state.q1Day);
}
for(const [vol,minutes] of [[130,10],[140,15],[150,20]]){
 const st={...state,runs:3},b=E.getBlock(st,pred),w=E.buildWeek(b,st,{k:4,N:4,t:1,assim:true,vol,block:'spec',specDist:1});
 assert.equal(w.foot.find(f=>f.assimilationActive).activeRange[0],minutes);
}
console.log('OK: Jogg/LD labels, shared easy guidance, assimilation without quality, 10/15/20-minute active blocks, preferred quality day and conserved minutes.');

// Render the real tile and detail functions, including block-mode links.
context.state=state;context.plan=c;
vm.runInContext(`let lastSt=state,lastPlan=plan,appSession=null,appOpt=0;const blockLabel=()=> 'Spécifique';const pts=x=>Math.round(x)+' pts',ptsRange=(a,b)=>pts(a)+' à '+pts(b);const vText=v=>presentVariantRaw(v).text,vChips=v=>presentVariantRaw(v).chips;`+
 html.slice(html.indexOf('const activeRangeText='),html.indexOf('function renderWeeks('))+
 html.slice(html.indexOf('function itemColor('),html.indexOf('/* Résumé de case'))+
 html.slice(html.indexOf('function tileHtml('),html.indexOf('const refOf='))+
 html.slice(html.indexOf('const splitRec='),html.indexOf('const LIB_SECTORS='))+
 html.slice(html.indexOf('function sessionScreenHtml('),html.indexOf('function openSession('))+
 `\nthis.ui={tileHtml,itemShort,qualityScheduleHtml,sessionRecoveryRows,show:r=>{appSession=r;return sessionScreenHtml();}};`,context);
const aw=c.weeks.find(w=>w.assimilation),af=aw.foot.findIndex(f=>f.assimilationActive);
assert(context.ui.tileHtml({kind:'foot',f:aw.foot[af]},aw,{w:aw.index,f:af}).includes(`data-open="${aw.index},f,${af}"`));
assert(!context.ui.show({w:aw.index,f:af}).includes('Un bloc de 10'));
assert(!context.ui.show({w:aw.index,f:af}).includes('% LT1'));
assert(context.ui.show({w:aw.index,f:af}).includes('<strong>'));
assert.equal(context.ui.itemShort({kind:'foot',f:{type:'std',min:50,ld:'strides'}},aw).k,'Jogg + LD');
console.log('OK: calendar/block tiles, active detail link and LD heading.');

assert.deepEqual(Array.from(E.efBand('std',state)),[11.75*.75,11.75*.91]);
const ordered=['Échauffement :','Travail :','Récup :','Retour au calme :','Durée totale :'];
for(const w of c.weeks)for(const s of w.sessions)for(const v of s.variants){
 const detail=context.ui.qualityScheduleHtml(v,s,state);
 let last=-1;for(const label of ordered){const pos=detail.indexOf(label);assert(pos>last,label+' must follow previous step');last=pos;}
 assert(!detail.includes('NaN'),v.fam+': '+detail);assert(!detail.includes('undefined'),v.fam+': '+detail);
 const rec=context.ui.sessionRecoveryRows(v);
 assert.equal(detail.includes('Récup entre blocs :'),rec.blocks.length>0);
 if(v.intensity?.minKmh)assert(detail.includes('<strong>'));
}
const mixedDetail=context.ui.qualityScheduleHtml(transition.variants[0],transition,state);
assert(mixedDetail.indexOf('Récup entre blocs :')>mixedDetail.indexOf('Récup :'));
assert(mixedDetail.indexOf('Récup entre blocs :')<mixedDetail.indexOf('Retour au calme :'));
assert(mixedDetail.includes('class="paceSpeed"'));
const continuous={fam:'s1.cont',work:20,total:20,structure:{type:'continuous',durationMin:20},intensity:{minKmh:12,maxKmh:12.5}};
assert(!context.ui.qualityScheduleHtml(continuous,{wu:24,cd:10},state).includes('Récup entre blocs :'));
assert(context.ui.show({w:0,q:0}).includes('sessionSteps'));
assert.equal(E.joggTitle({type:'active',activeRange:[20,20]}),'Jogg’ + 20’ endurance active');
assert.equal(E.joggTitle({type:'active',activeRange:[15,15],activeReps:2}),'Jogg’ + 2x15’ endurance active');
assert.equal(E.joggTitle({type:'active',activeBlocks:[15,15]}),'Jogg’ + 2x15’ endurance active');
const hrState={...state,lt1Hr:157,lt2Hr:174};
const threshold=(sector)=>({fam:sector+'.time',sector,work:20,total:23,structure:{type:'intervals',reps:4,durationMin:5,recoveryMin:1,recoveryType:'free'},intensity:{minKmh:12,maxKmh:12.5}});
assert(context.ui.qualityScheduleHtml(threshold('s1'),{wu:24,cd:10},hrState).includes('Plafond FC S1 : 165 bpm'));
assert(context.ui.qualityScheduleHtml(threshold('s2'),{wu:24,cd:10},hrState).includes('Plafond FC S2 : 174 bpm'));
assert(context.ui.qualityScheduleHtml(threshold('s1'),{wu:24,cd:10},state).includes('Physiologie (FC S2)'));
assert(context.ui.qualityScheduleHtml(threshold('s1'),{wu:24,cd:10},{...hrState,lt1Hr:140}).includes('Plafond FC S1 : 165 bpm'));
assert(context.ui.qualityScheduleHtml(threshold('s2'),{wu:24,cd:10},state).includes('à renseigner'));
const mixedHr=context.ui.qualityScheduleHtml(transition.variants[0],transition,hrState);
assert(mixedHr.includes('Plafond FC S1 : 165 bpm'));assert(mixedHr.includes('Plafond FC S2 : 174 bpm'));
const activeHtml=context.ui.show({w:aw.index,f:af});assert(activeHtml.includes('class="paceSpeed"'));
console.log('OK: combined Jogg pace range, chronological quality steps, optional block recovery and pace-first typography.');

