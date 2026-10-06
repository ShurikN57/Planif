const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,type:'text',appendChild(){},addEventListener(){}});return elements.get(id);};
const context={document:{getElementById:el,createElement:()=>({})},localStorage:{getItem:()=>null,setItem(){}},console};vm.createContext(context);
const start=html.indexOf('const RULES='),end=html.indexOf('const CAPLAB=');
vm.runInContext("const $=id=>document.getElementById(id);\n"+html.slice(start,end)+`\nthis.engine={RULES,planPhases,buildCalendar,buildWeek,getBlock,predict,p10Alternating,makeAlternatingSession,maxFractionMinutes,presentVariantRaw,sessionTitle};`,context);
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
console.log('OK: 4-week priority, short plans, exact calendar coverage, long-run caps, continuous alternation, zone/load accounting, complementary formats and other distances.');
