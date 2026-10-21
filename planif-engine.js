/* PlanifEngine: isolated module, browser and Node entry points. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./planif-rules.js'));
  else root.PlanifEngine=factory(root.PlanifRules);
})(globalThis,function(RULES){
function createEngine(context={}){
const stepLookup=(table,d)=>{for(const e of table){if(e.lt!==undefined?d<e.lt:d<=e.max)return e.v==='effort'?d:e.v;}const z=table[table.length-1].v;return z==='effort'?d:z;};
const DIST=[{lab:'5 km',km:5},{lab:'10 km',km:10},{lab:'Semi',km:21.0975},{lab:'Marathon',km:42.195}];
const PROFILES=['Très endurant','Endurant','Équilibré','Rapide','Très rapide'].map((lab,i)=>({lab,step:RULES.prediction.profileSteps[i]}));
const MEASURED=5;
const ZONES={z1:{lab:'EF, sous S1',c:'var(--z1)'},z2:{lab:'Entre S1 et S2',c:'var(--z2)'},z3:{lab:'Autour de S2',c:'var(--z3)'},z4:{lab:'VO₂max',c:'var(--z4)'}};
const num=s=>parseFloat(String(s).replace(',','.'));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const r5=x=>Math.round(x/5)*5;
function parseTime(str){
  if(!str)return null;
  let s=String(str).trim().replace(/\s/g,'').replace(/[h'"″′]/g,':').replace(/:+/g,':').replace(/:$/,'');
  const p=s.split(':').map(Number); if(p.some(isNaN))return null;
  if(p.length===2)return p[0]*60+p[1];
  if(p.length===3)return p[0]*3600+p[1]*60+p[2];
  return null;
}
function parseHM(str){
  let s=String(str).trim().replace(',','.');
  if(/[h:]/i.test(s)){const p=s.toLowerCase().replace('h',':').split(':');return (num(p[0])||0)*60+(num(p[1])||0);}
  const x=num(s); return isNaN(x)?null:x*60;
}
function fmtPace(v){if(!v||v<=0)return '–';let s=Math.round(3600/v);const m=Math.floor(s/60);s%=60;return `${m}'${String(s).padStart(2,'0')}`;}
const paceRange=(vlo,vhi)=>vlo===vhi?`${fmtPace(vhi)}/km`:`${fmtPace(Math.max(vlo,vhi))} à ${fmtPace(Math.min(vlo,vhi))}/km`;
const fmtSpd=v=>v.toFixed(1).replace('.',',');
function fmtFootDur(min){const center=Math.round(min);return `${Math.max(0,center-5)}–${Math.min(RULES.recovery.adaptiveFootings.absoluteMax,center+5)}′`;}
function fmtDur(min){min=Math.round(min);const h=Math.floor(min/60),m=min%60;return h?`${h}h${String(m).padStart(2,'0')}`:`${m}'`;}
function fmtTime(sec){sec=Math.round(sec);const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${h}h${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}`:`${m}'${String(s).padStart(2,'0')}`;}
function fmtMin(x){const m=Math.floor(x),s=Math.round((x-m)*60);return s?`${m}'${String(s).padStart(2,'0')}`:`${m}'`;}
const fmtKm=k=>(Math.round(k*10)/10).toString().replace('.',',');
function snapshotPlan(C){return JSON.parse(JSON.stringify(C));}
function planDateKey(v){
  const d=v instanceof Date?v:new Date(v);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function preservePastSessions(C){
  const activePlan=context.getActivePlan?.();
  if(!activePlan||!activePlan.plan||!activePlan.plan.weeks)return C;
  const old=new Map();
  activePlan.plan.weeks.forEach(w=>(w.days||[]).forEach(d=>old.set(planDateKey(d.date),d)));
  const today=new Date(),cut=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const completed=new Set(context.getCompletedIds?.()||[]);
  C.weeks.forEach(w=>(w.days||[]).forEach(d=>{
    const prev=old.get(planDateKey(d.date));
    if(!prev||!Array.isArray(prev.items))return;
    if(d.date<=cut){d.items=JSON.parse(JSON.stringify(prev.items));return;}
    // Completed activities remain untouched even when moved to a future date.
    for(const item of prev.items){
      if(!completed.has(item.planifId))continue;
      d.items=d.items.filter(x=>x.planifId!==item.planifId);
      d.items.push(JSON.parse(JSON.stringify(item)));
    }
  }));
  return C;
}
/* Reference updates are deliberately non-structural: retain the saved plan and
   copy only intensities of equivalent sessions, never regenerate a workout. */
function applyReferenceIntensities(saved,candidate,completedIds=[],today=new Date()){
 const result=JSON.parse(JSON.stringify(saved));
 const completed=new Set(completedIds),cutoff=planDateKey(today);
 const fresh=new Map();
 for(const w of candidate.weeks||[])for(const d of w.days||[])for(const it of d.items||[])
   if(it.planifId)fresh.set(it.planifId,it);
 // Index by stable format key across the entire regenerated plan: session order
 // and training week may differ without changing the prescribed workout.
 const byVariantKey=new Map();
 for(const w of candidate.weeks||[])for(const d of w.days||[])for(const it of d.items||[]){
   if(it.kind!=='q')continue;
   for(const v of it.s?.variants||[]){
     if(!byVariantKey.has(v.key))byVariantKey.set(v.key,[]);
     byVariantKey.get(v.key).push(v);
   }
 }
 function sameFormat(a,b){
   if(!a||!b||a.sector!==b.sector||a.kind!==b.kind||a.key!==b.key)return false;
   const sa=a.structure||{},sb=b.structure||{};
   return sa.type===sb.type&&sa.distanceM===sb.distanceM&&sa.durationMin===sb.durationMin
     &&JSON.stringify((sa.segments||[]).map(x=>[x.distanceM,x.durationMin]))===JSON.stringify((sb.segments||[]).map(x=>[x.distanceM,x.durationMin]));
 }
 function nearestFormat(oldV){
   const pool=(byVariantKey.get(oldV.key)||[]).filter(v=>sameFormat(oldV,v));
   if(!pool.length)return null;
   return pool.reduce((best,v)=>Math.abs((v.work||0)-(oldV.work||0))<Math.abs((best.work||0)-(oldV.work||0))?v:best);
 }
 function copyVariantIntensity(oldV,newV){
   if(!oldV||!newV||oldV.sector!==newV.sector||oldV.kind!==newV.kind)return false;
   // Only compatible formats are updated: repetitions, distance, time and recovery stay untouched.
   if(oldV.structure?.type!==newV.structure?.type)return false;
   if(oldV.structure?.distanceM!==newV.structure?.distanceM)return false;
   // Distance-based repetition duration naturally changes with the new speed.
   // Mixed-session segment targets may change while their original timing is preserved.
   if(newV.intensity)oldV.intensity=JSON.parse(JSON.stringify(newV.intensity));
   if(Array.isArray(oldV.parts)&&Array.isArray(newV.parts)&&oldV.parts.length===newV.parts.length){
     oldV.parts.forEach((p,i)=>{if(Array.isArray(p)&&Array.isArray(newV.parts[i])&&typeof p[1]==='number'&&typeof newV.parts[i][1]==='number')p[1]=newV.parts[i][1];});
   }
   return true;
 }
 let updated=0,eligible=0,updatedSessions=0;
 for(const w of result.weeks||[])for(const d of w.days||[]){
   if(planDateKey(d.date)<cutoff)continue;
   for(const it of d.items||[]){
     if(!it.planifId||completed.has(it.planifId))continue;
     if(it.kind==='q')eligible++;
     let sessionChanged=false;
     const next=fresh.get(it.planifId);
     if(it.kind!=='q'||!it.s)continue;
     {
       const source=new Map((next?.kind==='q'&&next.s?.fam===it.s.fam?(next.s.variants||[]):[]).map(v=>[v.key,v]));
       for(const v of it.s.variants||[]){
         const match=source.get(v.key);
         if(copyVariantIntensity(v,match)||copyVariantIntensity(v,nearestFormat(v))){updated++;sessionChanged=true;}
       }
       // Preserve the week-level references used by the session detail view.
       const original=(w.sessions||[]).find(x=>x===it.s||x.variants?.some(v=>it.s.variants?.some(t=>t.key===v.key)));
       if(original&&original!==it.s){for(const v of original.variants||[])copyVariantIntensity(v,source.get(v.key))||copyVariantIntensity(v,nearestFormat(v));}
     }
     if(sessionChanged)updatedSessions++;
   }
 }
 result.referenceIntensityUpdates=updated;
 result.referenceIntensitySessionsUpdated=updatedSessions;
 result.referenceIntensitySessionsEligible=eligible;
 return result;
}
function ensurePlanifSessionIds(C){
  (C.weeks||[]).forEach((w,wi)=>{
    const used={q:new Set(),foot:new Set()},counts={};
    (w.days||[]).forEach(d=>(d.items||[]).forEach(it=>{
      let index=counts[it.kind]||0;counts[it.kind]=index+1;
      const pool=it.kind==='q'?w.sessions:it.kind==='foot'?w.foot:null,value=it.kind==='q'?it.s:it.f;
      if(pool){const found=pool.findIndex((v,i)=>!used[it.kind].has(i)&&(v===value||JSON.stringify(v)===JSON.stringify(value)));if(found>=0)index=found;used[it.kind].add(index);}
      if(!it.planifId)it.planifId=`w${wi}-${it.kind}${index}`;
    }));
  });
}
function findPlanifSession(C,id){
  for(const [wi,w]of (C?.weeks||[]).entries())for(const [di,day]of (w.days||[]).entries()){
    const ii=(day.items||[]).findIndex(it=>it.planifId===id);if(ii>=0)return {w,day,it:day.items[ii],ref:{w:wi,d:di,i:ii}};
  }
  return null;
}
function applyPlanifMoves(C,moves={},previous=null,st=null){
  for(const [id,move]of Object.entries(moves)){
    const current=findPlanifSession(C,id),saved=findPlanifSession(previous,id),source=current||saved;
    if(!source)continue;
    // The week comes from the generated plan, including when only the saved item remains.
    const w=C.weeks[source.ref.w],day=w?.days.find(d=>planDateKey(d.date)===move.to);if(!day)continue;
    if(st&&current){try{planifMoveCheck(C,id,move.to,st);}catch(error){(C.moveWarnings||(C.moveWarnings={}))[id]=error.message;continue;}}
    const preserved=saved&&planDateKey(saved.day.date)===move.to&&parseDate(move.to)<new Date(new Date().setHours(0,0,0,0));
    const it=preserved||!current?JSON.parse(JSON.stringify(saved.it)):current.it;
    for(const week of C.weeks)for(const d of week.days)d.items=d.items.filter(x=>x.planifId!==id);
    day.items.push(it);
  }
  return C;
}
function planifMoveCheck(C,id,date,st){
  const source=findPlanifSession(C,id);if(!source)throw Error('Séance introuvable.');
  const day=source.w.days.find(d=>planDateKey(d.date)===date);
  if(!day)throw Error('Choisis une date dans la même semaine.');
  const it=source.it;if(['race','veille'].includes(it.kind))throw Error('Cette séance reste fixée à sa date avant la course.');
  const beforeRace=dayDiff(day.date,parseDate(st.calRace));
  if(source.w.raceWeek){
    if(beforeRace<=0||beforeRace===2)throw Error('La course et le repos à J−2 restent protégés.');
    if(it.kind==='q'&&!RULES.calendar.taper.reminderDaysBefore.includes(beforeRace))throw Error('Le rappel doit rester à J−3 ou J−4.');
  }
  const long=it.kind==='sl'||it.kind==='q'&&it.s.isLong,minutes=it.kind==='sl'?source.w.sl:it.s?.total;
  const guard=RULES.calendar.longRun10k;
  if(st.calDist===1&&long&&beforeRace<=guard.preRaceDays&&minutes>guard.preRaceCapMinutes)throw Error('Cette sortie longue dépasse le plafond à l’approche du 10 km.');
  const warnings=[];
  if(day.items.some(x=>x.planifId!==id))warnings.push('Ce jour contient déjà une séance. Les deux séances seront conservées.');
  if(!st.avail[wd(day.date)])warnings.push('Ce jour était prévu comme indisponible ou au repos.');
  if(it.kind==='q'||long)for(const w of C.weeks)for(const d of w.days){
    if(Math.abs(dayDiff(day.date,d.date))<RULES.calendar.placement.minDaysBetweenQualities&&d.items.some(x=>x.planifId!==id&&(x.kind==='q'||x.kind==='sl')))warnings.push('Une autre séance exigeante ou sortie longue est proche de cette date.');
  }
  return {source,day,warnings:[...new Set(warnings)]};
}
function referenceErrors(st){
  const errors=[];
  for(const [key,label] of [['s1lo','S1 bas'],['s1hi','S1 haut'],['s2','S2'],['vma','VMA']])if(!Number.isFinite(st[key])||st[key]<=0)errors.push(label+' doit être une vitesse positive.');
  if(errors.length)return errors;
  if(st.s1lo>st.s1hi)errors.push('S1 bas ne doit pas dépasser S1 haut.');
  if(st.s1hi>st.s2)errors.push('S1 haut ne doit pas dépasser S2.');
  if(st.s2>st.vma)errors.push('S2 ne doit pas dépasser la VMA.');
  return errors;
}
function inputErrors(st){const errors=referenceErrors(st);if(!Number.isFinite(st.vol)||st.vol<=0)errors.push('Le volume hebdomadaire doit être positif.');return errors;}
function maxQualityForRuns(runs){const M=RULES.organization.qualityFrequency.minRuns;return runs>=M[3]?3:runs>=M[2]?2:1;}

/* ---------- prédiction ---------- */
function predict(st){
  if(!st.refTime)return null;
  const ir=st.refDist,vr=DIST[ir].km/(st.refTime/3600),step=stepFor(st);
  return DIST.map((d,i)=>{
    let v=vr-step*(i-ir);
    const MP=RULES.prediction.marathonPenalty;if(st.penalty){if(i===3&&ir<3)v-=MP;if(ir===3&&i<3)v+=MP;}
    return{...d,v,t:d.km/v*3600,isRef:i===ir};
  });
}
function stepFor(st){if(st.profile!==MEASURED)return PROFILES[st.profile].step;const s=suggestProfile(st),P=RULES.prediction;return s?clamp(s.step,P.measuredStepClamp[0],P.measuredStepClamp[1]):P.measuredFallbackStep;}
function profileLabel(st){if(st.profile!==MEASURED)return PROFILES[st.profile].lab.toLowerCase();return suggestProfile(st)?`mesuré (${stepFor(st).toFixed(2).replace('.',',')} km/h)`:'mesuré, 2ᵉ perf manquante : équilibré par défaut';}
function suggestProfile(st){
  if(!st.refTime||!st.ref2Time||st.ref2Dist===st.refDist)return null;
  let a=st.refDist,b=st.ref2Dist,ta=st.refTime,tb=st.ref2Time;
  if(a>b){[a,b]=[b,a];[ta,tb]=[tb,ta];}
  const va=DIST[a].km/(ta/3600),vb=DIST[b].km/(tb/3600);
  let diff=va-vb; if(st.penalty&&b===3&&a<3)diff-=RULES.prediction.marathonPenalty;
  const step=diff/(b-a); let best=0;  PROFILES.forEach((p,i)=>{if(Math.abs(p.step-step)<Math.abs(PROFILES[best].step-step))best=i;});
  return{step,best};
}

/* ---------- familles de séances ---------- */
/* Règle d'équivalence : la 1re option fixe le volume de travail cible, la 2e doit tomber à ±5 % ou ±2' de cette cible. */
const TOL=t=>Math.max(RULES.library.equivalence.relative*t,RULES.library.equivalence.absolute);
function pickBest(cands,target){
  const tol=TOL(target);
  return cands.find(c=>Math.abs(c.work-target)<=tol)||cands.reduce((a,b)=>Math.abs(b.work-target)<Math.abs(a.work-target)?b:a);
}
const byProgress=(list,t)=>list.map((x,i)=>({x,d:Math.abs(i-t*(list.length-1))+i*0.001})).sort((a,b)=>a.d-b.d).map(o=>o.x);
const fmtPct=x=>String(x).replace('.',',');

/* ===================== Bibliothèque paramétrique (v5) =====================
   calendrier → bloc → stimulus → bibliothèque → séance.
   La forme ne définit pas la physiologie : un 1000 m peut être du S1, du S2 ou du VO₂ selon
   allure + volume + récupération + densité. Chaque famille porte des RÈGLES (formats, bornes de
   répétitions, récupération, intensité, pertinence selon la phase du bloc) ; le moteur génère les
   candidats, calcule leur charge, applique les garde-fous, puis retient deux options comparables. */

const SECTOR_INFO={
  s1:{rpe:'contrôlé, soutenu mais confortable',hrRole:'secondary'},
  s2:{rpe:'difficile mais maîtrisé',hrRole:'secondary'},
  vo2:{rpe:'difficile à très difficile',hrRole:'secondary'},
  spec10k:{rpe:'difficile, rythme de course maîtrisé',hrRole:'secondary'}
};
const fmtRec=m=>{const sec=Math.round(m*60/5)*5;return sec<60?`${sec}"`:fmtMin(sec/60);};
const r15=m=>Math.max(0.25,Math.round(m*4)/4);
const fmtRep=m=>m*60<59.5?`${Math.round(m*60)}"`:fmtTime(m*60);
const kmh=(a,b)=>`${paceRange(a,b)} (${a===b?fmtSpd(a):fmtSpd(Math.min(a,b))+' à '+fmtSpd(Math.max(a,b))} km/h)`;
function paceHtml(text){
  return String(text).replace(/(\d+'\d{2}(?:\s+à\s+\d+'\d{2})?\s*\/km)/g,'<strong>$1</strong>').replace(/\(([^()]*km\/h)\)/g,'<span class="paceSpeed">($1)</span>');
}

/* ----- Intensité ----- */
/* S2 : jusqu'à 3' en % du repère S2 ; au-delà, marge selon durée et volume total. */
const s2Group=d=>RULES.s2.paceBands.find(g=>d<=g.max)||RULES.s2.paceBands[RULES.s2.paceBands.length-1];
function s2Range(group,work,st){
  if(group.pct)return group.pct.map(p=>Math.round(st.s2*p*100)/100);
  const rng=Array.isArray(group)?group:group.r;
  const B=RULES.s2.band,pos=clamp((B.workAtBottom-work)/(B.workAtBottom-B.workAtTop),0,1),w=(rng[1]-rng[0])/2;
  const lo=Math.round((rng[0]+pos*(rng[1]-rng[0]-w))*10)/10,hi=Math.round((lo+w)*10)/10;
  return[st.s2+lo,st.s2+hi];
}
/* S1 : marge au-dessus du LT1 estimé selon durée de fraction + volume total.
   Les deux entrées LT1 représentent une incertitude ; le centre sert d'ancre de prescription. */
const lt1Ref=st=>(st.s1lo+st.s1hi)/2;
function efPctBand(type){
  if(type==='active')return RULES.organization.activeEndurance.intensityPctLT1;
  return [RULES.recovery.footing.rec.intensityPctLT1[0],RULES.recovery.footing.std.intensityPctLT1[1]];
}
function efBand(type,st){
  const p=efPctBand(type),v=lt1Ref(st);
  return[v*p[0],v*p[1]];
}
function efBandText(type,st){
  const v=efBand(type,st);
  return kmh(...v);
}
const footColor=type=>type==='active'?'var(--ef-active)':'var(--ef-std)';
function s1Margin(repMin){return RULES.s1.band.durationMargins.find(x=>repMin<=x.max).r;}
function s1Band(repMin,work,st){
  const B=RULES.s1.band,r=s1Margin(repMin),pos=clamp((B.workAtBottom-work)/(B.workAtBottom-B.workAtTop),0,1);
  const w=(r[1]-r[0])/2,loOff=r[0]+pos*(r[1]-r[0]-w),base=lt1Ref(st);
  return[Math.round((base+loOff)*20)/20,Math.round((base+loOff+w)*20)/20];
}
/* VO₂ : plage %VMA selon la durée de fraction (interpolée), position selon le volume (10' haut, 18' bas) */
function vo2Pct(d){
  const T=RULES.vo2.pctByDuration;if(d<=T[0][0])return[T[0][1],T[0][2]];if(d>=T[T.length-1][0])return[T[T.length-1][1],T[T.length-1][2]];
  for(let i=1;i<T.length;i++)if(d<=T[i][0]){const f=(d-T[i-1][0])/(T[i][0]-T[i-1][0]);return[T[i-1][1]+f*(T[i][1]-T[i-1][1]),T[i-1][2]+f*(T[i][2]-T[i-1][2])];}
}
function vo2WorkRange(d){
  const T=RULES.vo2.band.workByDuration;if(d<=T[0][0])return[T[0][1],T[0][2]];if(d>=T[T.length-1][0])return[T[T.length-1][1],T[T.length-1][2]];
  for(let i=1;i<T.length;i++)if(d<=T[i][0]){const f=(d-T[i-1][0])/(T[i][0]-T[i-1][0]);return[T[i-1][1]+f*(T[i][1]-T[i-1][1]),T[i-1][2]+f*(T[i][2]-T[i-1][2])];}
}
function vo2Band(repMin,work,st){
  const B=RULES.vo2.band,[l,h]=vo2Pct(repMin),[wMin,wMax]=vo2WorkRange(repMin);
  const width=repMin<B.shortBelow?B.widthShort:B.widthLong,pos=clamp((wMax-work)/(wMax-wMin),0,1);
  const usable=Math.max(0,h-l-width),lo=Math.round((l+pos*usable)*2)/2,hi=Math.min(h,lo+width);
  return[st.vma*lo/100,st.vma*hi/100,lo,hi];
}

/* ----- Récupérations : fourchettes affichées, milieu utilisé pour les calculs de durée/charge ----- */
const rangeLookup=(T,d)=>T.find(x=>d<=x.max).r;
const rangeMid=r=>(r[0]+r[1])/2;
const recS1Range=d=>rangeLookup(RULES.s1.recovery.byFractionDuration,d);
const recS1=d=>rangeMid(recS1Range(d));
const recS2Range=d=>rangeLookup(RULES.s2.recovery.byFractionDuration,d);
const recS2=d=>rangeMid(recS2Range(d));
const recVO2Range=d=>rangeLookup(RULES.vo2.recovery.byFractionDuration,d);
const recVO2=d=>rangeMid(recVO2Range(d));

/* ----- Construction d'un candidat à fractions ----- */
function seriesSplit(n,setMax){if(!setMax||n<=setMax)return null;const sets=Math.ceil(n/setMax),per=Math.round(n/sets);return{sets,per};}
function cand(o){
  /* o : sector, fam, kind, key, size, text, chips, parts, rec, recEach, work */
  return Object.assign({total:o.work+(o.rec||0)},o);
}

/* ======== Familles S1 ======== */
/* S1 : fraction minimale 1000 m en distance, 4' en durée (le S1 reste un travail suffisamment continu) */
function s1Dist(W,st){return Object.entries(RULES.s1.formats.distances).map(([d,[a,b]])=>{d=+d;
  let rm=d/1000/(lt1Ref(st)+0.3)*60,n=clamp(Math.round(W/rm),a,b),work=n*rm,[lo,hi]=s1Band(rm,work,st),v=(lo+hi)/2;
  rm=d/1000/v*60;work=n*rm;[lo,hi]=s1Band(rm,work,st);v=(lo+hi)/2;rm=d/1000/v*60;work=n*rm;
  const rr=recS1Range(rm),rec=rangeMid(rr);
  return cand({sector:'s1',fam:'s1.dist',kind:'dist',key:`s1:dist:${d}`,size:`d${d}`,structure:{type:'intervals',reps:n,distanceM:d,repDurationMin:rm,recoveryMin:rec,recoveryRangeMin:rr,recoveryType:'free'},intensity:{type:'speed_range',minKmh:lo,maxKmh:hi},parts:[[work,v]],rec:(n-1)*rec,recEach:rec,work});});}
function s1Time(table,fam){return(W,st)=>Object.entries(table).map(([d,[a,b]])=>{d=+d;
  const n=clamp(Math.round(W/d),a,b),work=n*d,[lo,hi]=s1Band(d,work,st),rr=recS1Range(d),rec=rangeMid(rr);
  return cand({sector:'s1',fam,kind:'time',key:`s1:${fam}:${d}`,size:`t${d}`,structure:{type:'intervals',reps:n,durationMin:d,recoveryMin:rec,recoveryRangeMin:rr,recoveryType:'free'},intensity:{type:'speed_range',minKmh:lo,maxKmh:hi},parts:[[work,(lo+hi)/2]],rec:(n-1)*rec,recEach:rec,work});});}
function s1Cont(W,st){const work=clamp(r5(W),RULES.s1.formats.continuous.min,RULES.s1.formats.continuous.max),[lo,hi]=s1Band(work,work,st);
  return[cand({sector:'s1',fam:'s1.cont',kind:'cont',key:`s1:cont`,size:'cont',structure:{type:'continuous',durationMin:work},intensity:{type:'speed_range',minKmh:lo,maxKmh:hi},parts:[[work,(lo+hi)/2]],rec:0,work})];}
function s1ProgCont(W,st){const work=clamp(r5(W),RULES.s1.formats.progressiveContinuous.min,RULES.s1.formats.progressiveContinuous.max),[lo,hi]=s1Band(work,work,st),mid=(lo+hi)/2;
  return[cand({sector:'s1',fam:'s1.progCont',kind:'cont',key:`s1:progCont`,size:'cont',structure:{type:'continuous',durationMin:work,progression:'thirds'},intensity:{type:'progression',speedsKmh:[lo,mid,hi]},parts:[[work/3,lo],[work/3,mid],[work/3,hi]],rec:0,work})];}
function s1ProgFrac(W,st){return Object.entries(RULES.s1.formats.progressive).map(([d,[a,b]])=>{d=+d;const n=clamp(Math.round(W/d),a,b),work=n*d,[lo,hi]=s1Band(d,work,st),rr=recS1Range(d),rec=rangeMid(rr);
  const parts=[];for(let i=0;i<n;i++)parts.push([d,lo+(hi-lo)*i/Math.max(1,n-1)]);
  return cand({sector:'s1',fam:'s1.progFrac',kind:'shape',key:`s1:progFrac:${d}`,size:`t${d}`,structure:{type:'intervals',reps:n,durationMin:d,recoveryMin:rec,recoveryRangeMin:rr,recoveryType:'free',progression:'increasing'},intensity:{type:'progression_range',fromKmh:lo,toKmh:hi},parts,rec:(n-1)*rec,recEach:rec,work});});}
function s1Shape(list,fam,name,accel){return(W,st)=>list.map(L=>{const work=L.reduce((x,y)=>x+y,0),bands=L.map(d=>s1Band(d,work,st));
  let rec=0;for(let i=0;i<L.length-1;i++)rec+=recS1(L[i]);
  const lo=Math.min(...bands.map(x=>x[0])),hi=Math.max(...bands.map(x=>x[1]));
  const parts=L.map((d,i)=>{const b=bands[i];return[d,accel?b[0]+(b[1]-b[0])*i/Math.max(1,L.length-1):(b[0]+b[1])/2];});
  const rr=L.slice(0,-1).map(recS1Range),rlo=Math.min(...rr.map(x=>x[0])),rhi=Math.max(...rr.map(x=>x[1]));
  return cand({sector:'s1',fam,kind:'shape',key:`s1:${fam}:${L.join('-')}`,size:fam,structure:{type:'ladder',shape:fam==='s1.pyr'?'pyramid':'descending',durationsMin:L,recoveryType:'free',recoveryRangeMin:[rlo,rhi]},intensity:accel?{type:'progression_range',fromKmh:lo,toKmh:hi,when:'shortening'}:{type:'speed_range',minKmh:lo,maxKmh:hi},parts,rec,recEach:rec/Math.max(1,L.length-1),work});});}
function s1Mix(W,st){const R=RULES.s1.recovery.mixed;return RULES.s1.formats.mixed.map(([n,x,y])=>{const work=n*(x+y),[lo,hi]=s1Band((x+y)/2,work,st),rf=rangeMid(R.betweenFractions),rs=rangeMid(R.betweenSets),rec=n*rf+(n-1)*rs;
  return cand({sector:'s1',fam:'s1.mix',kind:'shape',key:`s1:mix:${n}-${x}-${y}`,size:'mix',structure:{type:'sets',sets:n,durationsMin:[x,y],recoveryBetweenFractionsMin:rf,recoveryBetweenFractionsRangeMin:R.betweenFractions,recoveryBetweenSetsMin:rs,recoveryBetweenSetsRangeMin:R.betweenSets,recoveryType:'free'},intensity:{type:'speed_range',minKmh:lo,maxKmh:hi},parts:[[work,(lo+hi)/2]],rec,recEach:rec/(2*n-1),work});});}

/* ======== Familles S2 ======== */
function s2Dist(table,fam,dense){return(W,st)=>Object.entries(table).map(([d,[a,b]])=>{d=+d;
  let rm=d/1000/(st.s2+(dense?RULES.s2.densePaceOffsetForDuration:0))*60;const n=clamp(Math.round(W/rm),a,b);
  const[lo,hi]=s2Range(dense?RULES.s2.densePaceBand:s2Group(rm),n*rm,st),v=(lo+hi)/2;rm=d/1000/v*60;
  const rr=dense?null:recS2Range(rm),rec=dense?stepLookup(RULES.s2.recovery.denseByDistance,d):rangeMid(rr),work=n*rm;
  return cand({sector:'s2',fam,kind:'dist',key:`s2:${fam}:${d}`,size:`d${d}`,structure:{type:'intervals',reps:n,distanceM:d,repDurationMin:rm,recoveryMin:rec,recoveryRangeMin:rr||[rec,rec],recoveryType:'free'},intensity:{type:'speed_range',minKmh:lo,maxKmh:hi},cues:dense?['s2_dense']:[],parts:[[work,v]],rec:(n-1)*rec,recEach:rec,work});});}
function s2Time(table,fam){return(W,st)=>Object.entries(table).map(([d,[a,b]])=>{d=+d;
  const n=clamp(Math.round(W/d),a,b),work=n*d,[lo,hi]=s2Range(s2Group(d),work,st),rr=recS2Range(d),rec=rangeMid(rr);
  return cand({sector:'s2',fam,kind:'time',key:`s2:${fam}:${d}`,size:`t${d}`,structure:{type:'intervals',reps:n,durationMin:d,recoveryMin:rec,recoveryRangeMin:rr,recoveryType:'free'},intensity:{type:'speed_range',minKmh:lo,maxKmh:hi},parts:[[work,(lo+hi)/2]],rec:(n-1)*rec,recEach:rec,work});});}
function s2Mixed(durs,shape,fam,key,st,sets){
  const work=durs.reduce((x,y)=>x+y,0);let rec=0;
  const RB=RULES.s2.recovery.blocs;if(sets)rec=sets*rangeMid(RB.betweenFractions)+(sets-1)*rangeMid(RB.betweenSets);else for(let i=0;i<durs.length-1;i++)rec+=recS2(durs[i]);
  const groups=[...new Set(durs.map(s2Group))];
  const bands=groups.map(g=>{const ds=[...new Set(durs.filter(d=>s2Group(d)===g))].sort((x,y)=>x-y),[lo,hi]=s2Range(g,work,st);return{durationsMin:ds,minKmh:lo,maxKmh:hi};});
  const parts=durs.map(d=>{const[lo,hi]=s2Range(s2Group(d),work,st);return[d,(lo+hi)/2];});
  const rrs=durs.slice(0,-1).map(recS2Range),rlo=rrs.length?Math.min(...rrs.map(x=>x[0])):0,rhi=rrs.length?Math.max(...rrs.map(x=>x[1])):0;
  const structure=sets?{type:'sets',sets,durationsMin:durs.slice(0,2),recoveryBetweenFractionsMin:rangeMid(RB.betweenFractions),recoveryBetweenFractionsRangeMin:RB.betweenFractions,recoveryBetweenSetsMin:rangeMid(RB.betweenSets),recoveryBetweenSetsRangeMin:RB.betweenSets,recoveryType:'free'}
    :{type:'ladder',shape,durationsMin:durs,recoveryType:'free',recoveryRangeMin:[rlo,rhi]};
  return cand({sector:'s2',fam,kind:'shape',key,size:fam,structure,intensity:{type:'by_duration',bands},parts,rec,recEach:rec/Math.max(1,durs.length-1),work});
}
const s2Shape=(list,fam,shape)=>(W,st)=>list.map(L=>s2Mixed(L,shape,fam,`s2:${fam}:${L.join('-')}`,st));
const s2Blocs=(W,st)=>RULES.s2.formats.blocs.map(([n,x,y])=>{const durs=[];for(let i=0;i<n;i++)durs.push(x,y);
  return s2Mixed(durs,null,'s2.blocs',`s2:blocs:${n}-${x}-${y}`,st,n);});

/* ======== Familles VO₂ ======== */
function vo2Int(W,st){return Object.entries(RULES.vo2.formats.intermittent).map(([d,c])=>{d=+d;
  let n=clamp(Math.round(W/d),c.n[0],c.n[1]);const sp=seriesSplit(n,c.set);if(sp)n=sp.sets*sp.per;
  const work=n*d,[vlo,vhi,lo,hi]=vo2Band(d,work,st),rr=recVO2Range(d),ri=rangeMid(rr),bsr=RULES.vo2.recovery.betweenSets,bs=rangeMid(bsr),sets=sp?sp.sets:1;
  const rec=(n-sets)*ri+(sets-1)*bs;
  return cand({sector:'vo2',fam:'vo2.int',kind:'int',key:`vo2:int:${d}`,size:`t${d}`,structure:{type:'intermittent',reps:n,workMin:d,recoveryMin:ri,recoveryRangeMin:rr,recoveryType:'free',sets:sp?sp.sets:0,perSet:sp?sp.per:0,recoveryBetweenSetsMin:bs,recoveryBetweenSetsRangeMin:bsr},intensity:{type:'pct_vma_range',minPct:lo,maxPct:hi,minKmh:vlo,maxKmh:vhi},parts:[[work,(vlo+vhi)/2]],rec,recEach:ri,work});});}
function vo2Dist(table,fam){return(W,st)=>Object.entries(table).map(([d,[a,b]])=>{d=+d;
  let rm=d/1000/st.vma*60;for(let i=0;i<2;i++){const[p1,p2]=vo2Pct(rm);rm=d/1000/(st.vma*(p1+p2)/200)*60;}
  const SS=RULES.vo2.formats.shortDistanceSeries;let n=clamp(Math.round(W/rm),a,b);const sp=seriesSplit(n,d<=SS.maxDistance?SS.perSet:0);if(sp)n=sp.sets*sp.per;
  const[vlo,vhi,lo,hi]=vo2Band(rm,n*rm,st),v=(vlo+vhi)/2;rm=d/1000/v*60;const rr=recVO2Range(rm),rec=rangeMid(rr),bsr=RULES.vo2.recovery.betweenSets,bs=rangeMid(bsr),work=n*rm,sets=sp?sp.sets:1;
  return cand({sector:'vo2',fam,kind:'dist',key:`vo2:${fam}:${d}`,size:`d${d}`,structure:{type:'intervals',reps:n,distanceM:d,repDurationMin:rm,recoveryMin:rec,recoveryRangeMin:rr,recoveryType:'free',sets:sp?sp.sets:0,perSet:sp?sp.per:0,recoveryBetweenSetsMin:bs,recoveryBetweenSetsRangeMin:bsr},intensity:{type:'pct_vma_range',minPct:lo,maxPct:hi,minKmh:vlo,maxKmh:vhi},parts:[[work,v]],rec:(n-sets)*rec+(sets-1)*bs,recEach:rec,work});});}
function vo2Time(table,fam){return(W,st)=>Object.entries(table).map(([d,[a,b]])=>{d=+d;
  const n=clamp(Math.round(W/d),a,b),work=n*d,[vlo,vhi,lo,hi]=vo2Band(d,work,st),rr=recVO2Range(d),rec=rangeMid(rr),m=Math.round((vlo+vhi)/2*d/60*100)*10;
  return cand({sector:'vo2',fam,kind:'time',key:`vo2:${fam}:${d}`,size:`t${d}`,structure:{type:'intervals',reps:n,durationMin:d,recoveryMin:rec,recoveryRangeMin:rr,recoveryType:'free'},intensity:{type:'pct_vma_range',minPct:lo,maxPct:hi,minKmh:vlo,maxKmh:vhi},parts:[[work,(vlo+vhi)/2]],rec:(n-1)*rec,recEach:rec,work});});}
function vo2Pyr(W,st){return RULES.vo2.formats.pyramids.map(L=>{const work=L.reduce((x,y)=>x+y,0);let rec=0;for(let i=0;i<L.length-1;i++)rec+=recVO2(L[i]);
  const parts=L.map(d=>{const[vlo,vhi]=vo2Band(d,work,st);return[d,(vlo+vhi)/2];});
  const[a1,b1]=vo2Band(Math.min(...L),work,st),[a2,b2]=vo2Band(Math.max(...L),work,st),rr=L.slice(0,-1).map(recVO2Range),rlo=Math.min(...rr.map(x=>x[0])),rhi=Math.max(...rr.map(x=>x[1]));
  return cand({sector:'vo2',fam:'vo2.pyr',kind:'shape',key:`vo2:pyr:${L.join('-')}`,size:'pyr',structure:{type:'ladder',shape:'pyramid',durationsMin:L,recoveryType:'free',recoveryRangeMin:[rlo,rhi]},intensity:{type:'pct_by_duration',shortest:{durationMin:Math.min(...L),maxKmh:b1},longest:{durationMin:Math.max(...L),minKmh:a2}},parts,rec,recEach:rec/(L.length-1),work});});}


/* ======== Spécifique 10 km : l'allure 10 km est l'ancre ; structure et récupération décident comment on la travaille ======== */
/* Bande d'intensité autour de l'allure 10 km selon la durée de fraction :
   courtes (≤ 2'30) un peu plus vite, moyennes autour, longues un peu moins vite. */
const p10Band=(rm,v)=>{const b=RULES.spec10k.paceBands.find(x=>rm<=x.max).r;return[v*(1+b[0]),v*(1+b[1])];};
const rec10=rm=>stepLookup(RULES.spec10k.recovery.byFractionDuration,rm);
const sgnPct=x=>{const r=Math.round(x*1000)/10;return(r>0?'+':r<0?'−':'')+String(Math.abs(r)).replace('.',',');};
const lab10=(lo,hi,v)=>`Allure 10 km ${sgnPct(lo/v-1)} à ${sgnPct(hi/v-1)} %`;
const fmtM=m=>m>=1000&&m%500===0?`${fmtKm(m/1000)} km`:`${m} m`;
function p10Dist(table,fam){return(W,st,ctx)=>Object.entries(table).map(([d,[a,b]])=>{d=+d;const v0=ctx.v;
  let rm=d/1000/v0*60;const n=clamp(Math.round(W/rm),a,b),[lo,hi]=p10Band(rm,v0),v=(lo+hi)/2;rm=d/1000/v*60;const rec=rec10(rm),work=n*rm;
  return cand({sector:'spec10k',fam,kind:'dist',key:`p10:${fam}:${d}`,size:`d${d}`,structure:{type:'intervals',reps:n,distanceM:d,repDurationMin:rm,recoveryMin:rec,recoveryType:'trot'},intensity:{type:'race_pace_band',race:'10 km',refKmh:v0,minKmh:lo,maxKmh:hi},parts:[[work,v]],rec:(n-1)*rec,recEach:rec,work});});}
function p10Time(W,st,ctx){return Object.entries(RULES.spec10k.formats.times).map(([d,[a,b]])=>{d=+d;const v0=ctx.v,n=clamp(Math.round(W/d),a,b),[lo,hi]=p10Band(d,v0),rec=rec10(d),work=n*d;
  return cand({sector:'spec10k',fam:'p10.time',kind:'time',key:`p10:time:${d}`,size:`t${d}`,structure:{type:'intervals',reps:n,durationMin:d,recoveryMin:rec,recoveryType:'trot'},intensity:{type:'race_pace_band',race:'10 km',refKmh:v0,minKmh:lo,maxKmh:hi},parts:[[work,(lo+hi)/2]],rec:(n-1)*rec,recEach:rec,work});});}
function p10Seq(list,fam,name){return(W,st,ctx)=>list.map(L=>{const v0=ctx.v;let rec=0,work=0;const parts=[];
  L.forEach((m,i)=>{const rm0=m/1000/v0*60,[lo,hi]=p10Band(rm0,v0),v=(lo+hi)/2,rm=m/1000/v*60;parts.push([rm,v]);work+=rm;if(i<L.length-1)rec+=rec10(rm);});
  return cand({sector:'spec10k',fam,kind:'shape',key:`p10:${fam}:${L.join('-')}`,size:fam,structure:{type:'ladder',shape:{'p10.pyr':'pyramid','p10.prog':'progressive','p10.deg':'descending'}[fam],distancesM:L,recoveryType:'trot',recoveryRangeMin:[1,3]},intensity:{type:'race_pace_by_length',race:'10 km',refKmh:v0},parts,rec,recEach:rec/Math.max(1,L.length-1),work});});}
function p10Blocs(W,st,ctx){return RULES.spec10k.formats.blocs.map(([n,a,b])=>{const v0=ctx.v,parts=[];let work=0;
  for(let i=0;i<n;i++)[a,b].forEach(m=>{const[lo,hi]=p10Band(m/1000/v0*60,v0),v=(lo+hi)/2,rm=m/1000/v*60;parts.push([rm,v]);work+=rm;});
  const RB=RULES.spec10k.recovery.blocs,rec=n*RB.betweenFractions+(n-1)*RB.betweenSets;
  return cand({sector:'spec10k',fam:'p10.blocs',kind:'shape',key:`p10:blocs:${n}-${a}-${b}`,size:'blocs',structure:{type:'sets',sets:n,distancesM:[a,b],recoveryBetweenFractionsMin:RB.betweenFractions,recoveryBetweenSetsMin:RB.betweenSets},intensity:{type:'race_pace',race:'10 km',refKmh:v0},parts,rec,recEach:rec/(2*n-1),work});});}
function p10Mix(W,st,ctx){const v0=ctx.v;if(v0<st.s2+RULES.spec10k.formats.mixedS2MinGap)return[];
  return RULES.spec10k.formats.mixedS2.map(([n,a,b])=>{const vs=st.s2,ra=a/1000/vs*60,rb=b/1000/v0*60,MB=RULES.spec10k.recovery.mixedBetweenSets,work=n*(ra+rb),rec=(n-1)*MB;
    return cand({sector:'spec10k',fam:'p10.mix',kind:'mix',key:`p10:mix:${n}-${a}-${b}`,size:'mix',structure:{type:'sets',sets:n,segments:[{distanceM:a,target:'s2'},{distanceM:b,target:'race'}],linked:true,recoveryBetweenSetsMin:MB},intensity:{type:'mixed',s2Kmh:vs,raceKmh:v0},cues:['s2_to_race_no_recovery'],parts:[[n*ra,vs],[n*rb,v0]],rec,recEach:MB,work});});}

/* Alternance clé : toute la durée est du travail, y compris les portions S1. */
function p10Alternating(W,st,ctx){
  const A=RULES.alternating10k,v=ctx.v,vs=lt1Ref(st)+A.s1OffsetKmh;
  if(!v||vs>=st.s2||vs>=v)return[];
  const slow=A.distanceM/1000/vs*60,fast=A.distanceM/1000/v*60;
  return Array.from({length:A.reps[1]-A.reps[0]+1},(_,i)=>A.reps[0]+i).map(n=>cand({
    sector:'spec10k',fam:'p10.alternating',kind:'alternating',key:`p10:alternating:${n}`,size:'alternating',
    structure:{type:'sets',sets:n,segments:[{distanceM:A.distanceM,target:'s1'},{distanceM:A.distanceM,target:'race'}],linked:true,recoveryBetweenSetsMin:0},
    intensity:{type:'mixed',s1Kmh:vs,raceKmh:v,refKmh:v,race:'10 km'},
    parts:[[n*slow,vs],[n*fast,v]],work:n*(slow+fast),raceWork:n*fast,rec:0,recEach:0
  })).filter(c=>c.work<=A.maxMinutes);
}
function makeAlternatingSession(target,st,ctx){
  const pool=p10Alternating(target,st,ctx).filter(c=>c.work<=target+RULES.safeguards.capTolerance&&!capsFor('spec10k',c,st).length);
  if(!pool.length)return null;
  const c=pool.sort((a,b)=>b.work-a.work)[0];c.ruleRefs=variantRuleRefs(c,'spec10k');
  const [wu,cd]=RULES.organization.warmup.spec;
  return withSafetyLoad({fam:'alternating',dist:1,zone:zoneForSpeed(ctx.v,st),variants:[c,{...c}],work:c.work,total:r5(wu+c.total+cd),wu,cd,libSector:'spec10k'},st);
}
/* Durée maximale réelle d'une fraction, y compris les options B et les pyramides. */
function maxFractionMinutes(c){
  const S=c.structure||{},I=c.intensity||{},v=I.refKmh||I.minKmh||I.bands?.[0]?.minKmh;
  if(S.components)return Math.max(...S.components.map(x=>maxFractionMinutes(x.variant)));
  const durations=S.durationsMin||[];
  const distances=S.distancesM||S.segments?.map(x=>x.distanceM)||[];
  return Math.max(S.repDurationMin||0,S.durationMin||S.workMin||0,...durations,
    ...(v?[S.distanceM||0,...distances].map(m=>m/1000/v*60):[0]));
}

/* Compare actual fraction durations, including ladders and continuous first blocks. */
function minFractionMinutes(c){
  const S=c.structure||{};
  const values=[S.repDurationMin,S.durationMin,S.workMin,...(S.durationsMin||[])].filter(x=>Number.isFinite(x)&&x>0);
  return values.length?Math.min(...values):0;
}

/* ======== Catalogue : familles et pertinence par phase [début, milieu, fin, assimilation] ======== */
const SESSION_LIBRARY={
  s1:[
    {id:'s1.dist',w:RULES.library.phaseWeights['s1.dist'],gen:s1Dist},
    {id:'s1.time',w:RULES.library.phaseWeights['s1.time'],gen:s1Time(RULES.s1.formats.times,'s1.time')},
    {id:'s1.long',w:RULES.library.phaseWeights['s1.long'],gen:s1Time(RULES.s1.formats.long,'s1.long')},
    {id:'s1.cont',w:RULES.library.phaseWeights['s1.cont'],gen:s1Cont},
    {id:'s1.progCont',w:RULES.library.phaseWeights['s1.progCont'],gen:s1ProgCont},
    {id:'s1.progFrac',w:RULES.library.phaseWeights['s1.progFrac'],gen:s1ProgFrac},
    {id:'s1.pyr',w:RULES.library.phaseWeights['s1.pyr'],gen:s1Shape(RULES.s1.formats.pyramids,'s1.pyr','Pyramide',false)},
    {id:'s1.desc',w:RULES.library.phaseWeights['s1.desc'],gen:s1Shape(RULES.s1.formats.descending,'s1.desc','Dégressif',true)},
    {id:'s1.mix',w:RULES.library.phaseWeights['s1.mix'],gen:s1Mix}
  ],
  s2:[
    {id:'s2.dense',w:RULES.library.phaseWeights['s2.dense'],gen:s2Dist(RULES.s2.formats.dense,'s2.dense',true)},
    {id:'s2.dist',w:RULES.library.phaseWeights['s2.dist'],gen:s2Dist(RULES.s2.formats.distances,'s2.dist',false)},
    {id:'s2.longDist',w:RULES.library.phaseWeights['s2.longDist'],gen:s2Dist(RULES.s2.formats.longDistances,'s2.longDist',false)},
    {id:'s2.time',w:RULES.library.phaseWeights['s2.time'],gen:s2Time(RULES.s2.formats.times,'s2.time')},
    {id:'s2.longTime',w:RULES.library.phaseWeights['s2.longTime'],gen:s2Time(RULES.s2.formats.longTimes,'s2.longTime')},
    {id:'s2.pyr',w:RULES.library.phaseWeights['s2.pyr'],gen:s2Shape(RULES.s2.formats.pyramids,'s2.pyr','pyramid')},
    {id:'s2.deg',w:RULES.library.phaseWeights['s2.deg'],gen:s2Shape(RULES.s2.formats.descending,'s2.deg','descending')},
    {id:'s2.prog',w:RULES.library.phaseWeights['s2.prog'],gen:s2Shape(RULES.s2.formats.progressive,'s2.prog','progressive')},
    {id:'s2.blocs',w:RULES.library.phaseWeights['s2.blocs'],gen:s2Blocs}
  ],
  vo2:[
    {id:'vo2.int',short:true,w:RULES.library.phaseWeights['vo2.int'],gen:vo2Int},
    {id:'vo2.shortDist',short:true,w:RULES.library.phaseWeights['vo2.shortDist'],gen:vo2Dist(RULES.vo2.formats.distances.short,'vo2.shortDist')},
    {id:'vo2.medDist',w:RULES.library.phaseWeights['vo2.medDist'],gen:vo2Dist(RULES.vo2.formats.distances.medium,'vo2.medDist')},
    {id:'vo2.medTime',w:RULES.library.phaseWeights['vo2.medTime'],gen:vo2Time(RULES.vo2.formats.times.medium,'vo2.medTime')},
    {id:'vo2.longDist',w:RULES.library.phaseWeights['vo2.longDist'],gen:vo2Dist(RULES.vo2.formats.distances.long,'vo2.longDist')},
    {id:'vo2.longTime',w:RULES.library.phaseWeights['vo2.longTime'],gen:vo2Time(RULES.vo2.formats.times.long,'vo2.longTime')},
    {id:'vo2.pyr',w:RULES.library.phaseWeights['vo2.pyr'],gen:vo2Pyr}
  ],
  spec10k:[
    {id:'p10.short',w:RULES.library.phaseWeights['p10.short'],gen:p10Dist(RULES.spec10k.formats.short,'p10.short')},
    {id:'p10.med',w:RULES.library.phaseWeights['p10.med'],gen:p10Dist(RULES.spec10k.formats.medium,'p10.med')},
    {id:'p10.long',w:RULES.library.phaseWeights['p10.long'],gen:p10Dist(RULES.spec10k.formats.long,'p10.long')},
    {id:'p10.xlong',w:RULES.library.phaseWeights['p10.xlong'],gen:p10Dist(RULES.spec10k.formats.exceptional,'p10.xlong')},
    {id:'p10.time',w:RULES.library.phaseWeights['p10.time'],gen:p10Time},
    {id:'p10.pyr',w:RULES.library.phaseWeights['p10.pyr'],gen:p10Seq(RULES.spec10k.formats.pyramids,'p10.pyr','Pyramide')},
    {id:'p10.prog',w:RULES.library.phaseWeights['p10.prog'],gen:p10Seq(RULES.spec10k.formats.progressive,'p10.prog','Progressif')},
    {id:'p10.deg',w:RULES.library.phaseWeights['p10.deg'],gen:p10Seq(RULES.spec10k.formats.descending,'p10.deg','Dégressif')},
    {id:'p10.blocs',w:RULES.library.phaseWeights['p10.blocs'],gen:p10Blocs},
    {id:'p10.alternating',complementOnly:true,w:RULES.library.phaseWeights['p10.alternating'],gen:p10Alternating},
    {id:'p10.mix',w:RULES.library.phaseWeights['p10.mix'],gen:p10Mix}
  ]
};

/* ======== Références de règles (v8.1) : quelles entrées de RULES façonnent chaque famille ======== */
const FAMILY_RULES=(()=>{
  const s1=(f,r)=>['s1.band',`s1.formats.${f}`,`s1.recovery.${r}`],s2=(f,r)=>['s2.paceBands','s2.band',`s2.formats.${f}`,`s2.recovery.${r}`];
  const vo2=(f,r)=>['vo2.pctByDuration','vo2.band',`vo2.formats.${f}`,`vo2.recovery.${r}`],p10=(f,r)=>['spec10k.paceBands',`spec10k.formats.${f}`,`spec10k.recovery.${r}`];
  return{
    's1.dist':s1('distances','byFractionDuration'),'s1.time':s1('times','byFractionDuration'),'s1.long':s1('long','byFractionDuration'),
    's1.cont':['s1.band','s1.formats.continuous'],'s1.progCont':['s1.formats.progressiveContinuous'],'s1.progFrac':['s1.formats.progressive','s1.recovery.byFractionDuration'],
    's1.pyr':s1('pyramids','byFractionDuration'),'s1.desc':s1('descending','byFractionDuration'),'s1.mix':s1('mixed','mixed'),
    's2.dense':['s2.densePaceBand','s2.densePaceOffsetForDuration','s2.band','s2.formats.dense','s2.recovery.denseByDistance'],
    's2.dist':s2('distances','byFractionDuration'),'s2.longDist':s2('longDistances','byFractionDuration'),'s2.time':s2('times','byFractionDuration'),
    's2.longTime':s2('longTimes','byFractionDuration'),'s2.pyr':s2('pyramids','byFractionDuration'),'s2.deg':s2('descending','byFractionDuration'),
    's2.prog':s2('progressive','byFractionDuration'),'s2.blocs':s2('blocs','blocs'),
    'vo2.int':['vo2.pctByDuration','vo2.band','vo2.formats.intermittent','vo2.recovery.betweenSets'],
    'vo2.shortDist':vo2('distances','byFractionDuration').concat(['vo2.formats.shortDistanceSeries','vo2.recovery.betweenSets']),
    'vo2.medDist':vo2('distances','byFractionDuration'),'vo2.longDist':vo2('distances','byFractionDuration'),
    'vo2.medTime':vo2('times','byFractionDuration'),'vo2.longTime':vo2('times','byFractionDuration'),'vo2.pyr':vo2('pyramids','byFractionDuration'),
    'p10.short':p10('short','byFractionDuration'),'p10.med':p10('medium','byFractionDuration'),'p10.long':p10('long','byFractionDuration'),
    'p10.xlong':p10('exceptional','byFractionDuration'),'p10.time':p10('times','byFractionDuration'),'p10.pyr':p10('pyramids','byFractionDuration'),
    'p10.prog':p10('progressive','byFractionDuration'),'p10.deg':p10('descending','byFractionDuration'),'p10.blocs':p10('blocs','blocs'),
    'p10.alternating':['alternating10k','weeklyFormats'],
    'p10.mix':['spec10k.formats.mixedS2','spec10k.formats.mixedS2MinGap','spec10k.recovery.mixedBetweenSets'],
    'hills.short':['hills.short','hills.totalFactor','hills.descentRecoveryFactor','hills.sprintMinutes'],
    'hills.long':['hills.long','hills.totalFactor','hills.descentRecoveryFactor','hills.sprintMinutes'],
    'spec.legacy':['specOther.recoveryByDistance','specOther.minReps'],'spec.marathonLong':['specOther.marathonLongRun'],
    'taper':['calendar.taper']
  };
})();
const CAP_RULE={s1:'safeguards.caps.s1',s2:'safeguards.caps.s2',vo2:'safeguards.caps.vo2',spec10k:'spec10k.workCap'};
/* Format des références : chemin dans RULES, avec [clé] pour une clé contenant un point (library.phaseWeights[s2.time]). */
const variantRuleRefs=(v,sector)=>{const r=(FAMILY_RULES[v.fam]||[]).slice();
  if(sector){r.push(`library.phaseWeights[${v.fam}]`,'library.selection','library.equivalence');if(CAP_RULE[sector])r.push(CAP_RULE[sector]);}
  r.push('load.intensity','load.density');return r;};

/* ======== Générateur : candidats → charge → garde-fous → choix de deux options ======== */
function hash01(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return((h>>>0)%1000)/1000;}
function candLoad(x,st){const d=densityFactor(x);return x.parts.reduce((a,[m,v])=>a+m*loadFactorForSpeed(v,st)*d,0);}
/* Planif preference, not a physiological threshold: compare minutes, including metre-based formats. */
function fractionProgressionPool(candidates,sector,ctx){
  if(!ctx.fractionHistory||!candidates.length)return candidates;
  const R=RULES.progression.fractions,previous=ctx.fractionHistory[sector];
  const limit=previous?Math.max(previous*R.maxRatio,previous+R.maxIncreaseMinutes):R.firstMaxMinutes[sector];
  if(!limit)return candidates;
  const near=candidates.filter(c=>maxFractionMinutes(c)<=limit+1e-9);
  const pool=near.length?near:candidates.filter(c=>maxFractionMinutes(c)===Math.min(...candidates.map(maxFractionMinutes)));
  const target=previous?Math.min(limit,previous+R.preferredIncreaseMinutes):R.firstTargetMinutes[sector];
  for(const c of pool){c.score+=Math.abs(maxFractionMinutes(c)-target)*R.durationWeight;c.ruleRefs=[...new Set(c.ruleRefs.concat('progression.fractions'))];}
  return pool;
}
function rememberFractionDurations(sessions,memory){
  if(!memory)return;
  const values={};
  const visit=v=>{
    if(v.structure?.components){v.structure.components.forEach(c=>visit(c.variant));return;}
    if(!['s1','s2','vo2','spec10k'].includes(v.sector))return;
    const d=maxFractionMinutes(v);if(d>0)(values[v.sector]||(values[v.sector]=[])).push(d);
  };
  sessions.forEach(s=>(s.variants||[]).forEach(visit));
  memory.fractions=memory.fractions||{};
  for(const [sector,ds] of Object.entries(values))memory.fractions[sector]=Math.min(...ds);
}
function generateSession(sector,W,st,ctx){
  const PB=RULES.library.phaseBoundaries,SEL=RULES.library.selection;
  const ph=ctx.assim?3:ctx.t<PB[0]?0:ctx.t<PB[1]?1:2;
  const mem=(ctx.memory&&ctx.memory[sector])||{keys:[],sizes:[],fams:[]};
  const fams=SESSION_LIBRARY[sector].filter(f=>(!ctx.shortOnly||f.short)&&!f.complementOnly);
  let all=[];
  fams.forEach(f=>f.gen(W,st,ctx).forEach(c=>{
    if(ctx.maxFractionMinutes&&maxFractionMinutes(c)>ctx.maxFractionMinutes)return;
    c.famW=f.w[ph];c.load=candLoad(c,st);c.capFail=capsFor(sector,c,st);c.ruleRefs=variantRuleRefs(c,sector);
    let sc=(1-c.famW)*SEL.phaseWeight+Math.abs(c.work-W)/W*SEL.volumeGap;
    if(mem.keys.includes(c.key))sc+=SEL.sameFormat;else if(mem.sizes.includes(c.size))sc+=SEL.sameSize;
    if(mem.fams.includes(c.fam))sc+=SEL.sameFamily;
    c.score=sc+hash01(c.key+'|'+ctx.k)*SEL.tieBreak;all.push(c);
  }));
  if(ctx.mixedComponent){const table=RULES.mixed.componentTimes[sector],gen=sector==='s1'?s1Time:sector==='s2'?s2Time:vo2Time;gen(table,sector+'.time')(W,st).forEach(c=>{c.famW=1;c.load=candLoad(c,st);c.capFail=capsFor(sector,c,st);c.ruleRefs=variantRuleRefs(c,sector);c.score=Math.abs(c.work-W)/W*SEL.volumeGap+hash01(c.key+'|'+ctx.k)*SEL.tieBreak;all.push(c);});}
  if(ctx.maxFractionMinutes)all=all.filter(c=>maxFractionMinutes(c)<=ctx.maxFractionMinutes);
  if(Number.isFinite(ctx.maxWorkMinutes)){all=all.filter(c=>c.work<=ctx.maxWorkMinutes+1e-9&&!c.capFail.length);if(!all.length)return[];}
  const safe=all.filter(c=>!c.capFail.length);if(safe.length)all=safe; /* sinon on garde, et l'alerte garde-fou s'affiche */
  all=fractionProgressionPool(all,sector,ctx);
  const tol=TOL(W);
  let pool=all.filter(c=>Math.abs(c.work-W)<=tol);if(!pool.length)pool=all;
  pool.sort((x,y)=>x.score-y.score);
  const A=pool[0];
  const tolA=TOL(A.work);
  const comparable=all.filter(c=>c.fam!==A.fam&&Math.abs(c.work-A.work)<=tolA&&Math.abs(c.load-A.load)<=SEL.optionBLoadTolerance*A.load)
    .map(c=>({c,s:c.score+(c.kind===A.kind?SEL.optionBSameKind:0)+(c.size===A.size?SEL.optionBSameSize:0)})).sort((x,y)=>x.s-y.s);
  const B=(comparable[0]&&comparable[0].c)||all.filter(c=>c.key!==A.key&&Math.abs(c.work-A.work)<=tolA).sort((x,y)=>x.score-y.score)[0]||A;
  if(ctx.memory){const m=ctx.memory[sector]||(ctx.memory[sector]={keys:[],sizes:[],fams:[]});
    /* mémoire courte : les deux dernières semaines comptent */
    const MW=SEL.memoryWeeks;m.keys=m.keys.slice(-MW).concat([A.key,B.key]);m.sizes=m.sizes.slice(-MW).concat([A.size,B.size]);m.fams=m.fams.slice(-MW).concat([A.fam,B.fam]);}
  return[A,B];
}

/* Allure spécifique */
function recFor(m){return stepLookup(RULES.specOther.recoveryByDistance,m);}
function specVariant(K,rep,v,lab){
  const n=Math.max(RULES.specOther.minReps,Math.round(K*1000/rep)),repMin=rep/1000/v*60,rec=recFor(rep);
  return{rep,fam:'spec.legacy',structure:{type:'intervals',reps:n,distanceM:rep,repDurationMin:repMin,recoveryMin:rec,recoveryType:'trot'},intensity:{type:'race_pace',race:lab,refKmh:v},work:n*repMin,km:n*rep/1000,total:n*repMin+(n-1)*rec,parts:[[n*repMin,v]],rec:(n-1)*rec,recEach:rec};
}

function specificWorkLimit(v,st,exempt=[]){
  const zone=loadZone(v,st),key={z2:'s1',z3:'s2',z4:'vo2'}[zone];
  let limit=key&&!exempt.includes(key)?RULES.safeguards.caps[key]:Infinity;
  if(v>=RULES.safeguards.above105OfVma*st.vma)limit=Math.min(limit,RULES.safeguards.caps.above105);
  return limit;
}
function specificOptions(K,cfg,v,lab,st,t){
  const target=Math.min(K/v*60,specificWorkLimit(v,st));
  const make=rep=>{
    const rm=rep/1000/v*60,n=Math.floor((target+1e-9)/rm);
    if(n<RULES.specOther.minReps)return null;
    return specVariant(n*rep/1000,rep,v,lab);
  };
  const order=[...new Set([...byProgress(cfg.repsA,t),...byProgress(cfg.repsB,t)])];
  let pool=order.map(make).filter(Boolean);
  if(!pool.length)pool=[1000,800,500,400,200,100].map(make).filter(Boolean);
  if(!pool.length)pool=[specVariant(target*v/60,target*v/60*1000/RULES.specOther.minReps,v,lab)];
  const A=pickBest(pool,target);
  const matching=pool.filter(c=>c.rep!==A.rep&&Math.abs(c.work-A.work)<=TOL(A.work));
  let B=matching.length?pickBest(matching,A.work):null;
  if(!B){
    // Half-distance fractions keep exactly the same work when the normal alternatives cannot match.
    B=specVariant(A.km,A.rep/2,v,lab);
  }
  for(const option of [A,B])option.ruleRefs=['specOther.durationAndEquivalence','specOther.recoveryByDistance','specOther.minReps'];
  return[A,B];
}
function marathonOptions(K,v,st,vol){
  const ML=RULES.specOther.marathonLongRun,step=RULES.specOther.durationAndEquivalence.marathonDistanceStepKm,n=K>=ML.threeBlocksFromKm?3:2;
  const easySpeed=rangeMid(efBand('std',st)),between=(n-1)/easySpeed*60;
  const overhead=Math.max(ML.minOverWork,ML.minEasy+ML.cooldown+between);
  const limit=Math.min(specificWorkLimit(v,st,['s1']),ML.cap-overhead);
  const per=Math.floor((Math.min(K,limit*v/60)/n+1e-9)/step)*step;
  const distance=n*per,work=distance/v*60;
  const total=Math.min(ML.cap,Math.max(r5(vol*ML.shareOfWeek),work+overhead));
  const shared={fam:'spec.marathonLong',intensity:{type:'race_pace',race:'marathon',refKmh:v},work,total,parts:[[work,v]],easy:total-work,rec:0,ruleRefs:['specOther.marathonLongRun','specOther.durationAndEquivalence']};
  return[
    {...shared,structure:{type:'long_run',easyMin:total-work-ML.cooldown,distanceKm:distance,cooldownMin:ML.cooldown}},
    {...shared,structure:{type:'long_run',easyMin:total-work-between-ML.cooldown,reps:n,distanceKm:per,easyBetweenKm:1,easyBetweenMin:between/(n-1),cooldownMin:ML.cooldown}}
  ];
}

/* Côtes */
function hillStruct(rep,W,long,st){
  const H=RULES.hills,n=long?clamp(Math.round(W/rep),H.long.n[0],H.long.n[1]):clamp(Math.round(W/rep),H.short.n[0],H.short.n[1]);
  return long
    ?{fam:'hills.long',structure:{type:'hill_reps',reps:n,durationMin:rep,gradePct:[4,6],recovery:'descent_trot',sprints:{reps:6,seconds:10}},intensity:{type:'effort',reference:'pace10k'},cues:['effort_pace10k','relaxed_top'],work:n*rep,total:n*rep*H.totalFactor+H.sprintMinutes,parts:[[n*rep,st.v10||st.s2+H.longEffortAboveS2],[1,st.vma*H.sprintSpeedOfVma]],rec:n*rep*H.descentRecoveryFactor,recEach:rep*H.descentRecoveryFactor}
    :{fam:'hills.short',structure:{type:'hill_reps',reps:n,durationMin:rep,gradePct:[6,8],recovery:'descent_trot',sprints:{reps:6,seconds:10}},intensity:{type:'effort',reference:'vma'},cues:['effort_vma','dynamic_stride'],work:n*rep,total:n*rep*H.totalFactor+H.sprintMinutes,parts:[[n*rep,st.vma],[1,st.vma*H.sprintSpeedOfVma]],rec:n*rep*H.descentRecoveryFactor,recEach:rep*H.descentRecoveryFactor};
}
function hillsSession(W,k,st){
  const S=RULES.hills.short.reps,L=RULES.hills.long.reps;
  const A=pickBest((k%2?[S[1],S[0]]:S).map(r=>hillStruct(r,W,false,st)),W);
  return[A,pickBest((k%2?[L[1],L[0]]:L).map(r=>hillStruct(r,A.work,true,st)),A.work)];
}

function fartlekSession(W,k,st){
  const d=W<=10?1:W<=14?1.5:W<=18?2:W<=21?3:4;
  const n=Math.max(4,Math.round(W/d)),work=r5(n*d),recEach=Math.max(0.75,Math.min(2,d*0.75)),rec=r5((n-1)*recEach);
  const feel=d<=1?'vif mais relâché':d<=2?'soutenu, maîtrisé':d<=3?'soutenu et contrôlé':'contrôlé, sans forcer le rythme';
  /* Vitesse interne uniquement pour estimer la charge : elle n'est jamais prescrite ni affichée. */
  const loadSpeed=(st.s1hi+st.s2)/2;
  const structured={
    fam:'fartlek.structured',
    structure:{type:'fartlek_structured',reps:n,durationMin:d,recoveryMin:recEach,recoveryType:'easy_jog'},
    intensity:{type:'feel',target:feel,paceTarget:false},
    work,total:r5(work+rec),parts:[[work,loadSpeed]],rec,recEach
  };
  const freeRec=r5(work*0.65);
  const free={
    fam:'fartlek.free',
    structure:{type:'fartlek_free',workMin:work,rangeSec:[30,240],recoveryType:'easy_jog',terrain:true},
    intensity:{type:'feel',target:'variable selon la durée : vif sur court, contrôlé sur long',paceTarget:false},
    work,total:r5(work+freeRec),parts:[[work,loadSpeed]],rec:freeRec,recEach:1
  };
  return[structured,free];
}

function zoneForSpeed(v,st){const Z=RULES.load.sessionZone;if(v>=Z.z4OfVma*st.vma)return'z4';if(v>=st.s2-Z.z3BelowS2)return'z3';if(v>=st.s1hi)return'z2';return'z1';}

function makeSessionCore(fam,W,k,t,st,ctx){
  let zone,variants;
  switch(fam){
    case'vma':zone='z4';variants=generateSession('vo2',W,st,{...ctx,k,t});break;
    case'vmaShort':zone='z4';variants=generateSession('vo2',W,st,{...ctx,k,t,shortOnly:true,memory:ctx.calendar?ctx.memory:null});break;
    case's2':zone='z3';variants=generateSession('s2',W,st,{...ctx,k,t});break;
    case's1':zone='z2';variants=generateSession('s1',W,st,{...ctx,k,t});break;
    case'fartlek':zone='z3';variants=fartlekSession(W,k,st);break;
    case'hills':zone='z4';variants=hillsSession(W,k,st);break;
    case'spec':{
      const d=ctx.dist,lab=DIST[d].lab;zone=zoneForSpeed(ctx.v,st);
      if(d===3){
        const variants=marathonOptions(W,ctx.v,st,ctx.vol),work=variants[0].work;
        return{fam,dist:d,zone,variants,work,total:variants[0].total,wu:0,cd:0,isLong:true};
      }
      if(d===1){const r=generateSession('spec10k',Math.min(W/ctx.v*60,RULES.spec10k.workCap),st,{...ctx,k,t});
        const core=Math.max(...r.map(x=>x.total));
        const[wu,cd]=RULES.organization.warmup.spec;return{fam,dist:d,zone,variants:r,work:r[0].work,gap:0,total:r5(wu+core+cd),wu,cd,libSector:'spec10k'};}
      variants=specificOptions(W,SPEC[d],ctx.v,lab,st,t);break;}
  }
  const [wu,cd]=RULES.organization.warmup[fam];
  const core=Math.max(...variants.map(x=>x.total));
  const work=variants[0].work,gap=Math.abs(variants[1].work-work);
  return{fam,...(fam==='spec'?{dist:ctx.dist}:{}),zone,variants,work,gap:gap>TOL(work)?gap:0,total:r5(wu+core+cd),wu,cd};
}

/* ---------- charge pondérée : indice interne et comparatif, pas une mesure physiologique ---------- */
/* Coefficients d'intensité (S2 = 1,00). Tous les réglages sont ici. */
/* Densité : correctif secondaire (l'intensité fait l'essentiel), selon le ratio récupération / effort, interpolé.
   C'est un bonus de continuité métabolique : continu ou très dense 1,05 ; dense 1,03 ; normal 1,00 ; très discontinu 0,95.
   Une récup courte par fraction (< 1'30) n'est jamais comptée comme confortable. */
/* Semaine chargée : points de travail qualitatif (S1, S2, VO₂+) par minute de course à partir desquels
   le deuxième footing devient aussi un footing récupération. */
/* Modulation du volume de travail ciblé par le volume hebdomadaire moyen (référence 5h).
   Ce n'est pas un niveau d'athlète : simple modulateur, plus faible quand l'intensité monte.
   down = réduction maximale atteinte à 3h30 et moins ; up = hausse maximale atteinte à 7h et plus. */
const SECTOR_OF={s1:'s1',s2:'s2',vma:'vo2',vmaShort:'vo2',spec10k:'spec10k'};
function volumeFactor(fam,volMin){
  const sec=SECTOR_OF[fam];if(!sec)return 1; /* spécifique et côtes : pas encore modulés */
  const h=volMin/60,a=RULES.volume.weeklyFactor.amp[sec];
  return h<=RULES.volume.weeklyFactor.ref?1-a.down*clamp((RULES.volume.weeklyFactor.ref-h)/(RULES.volume.weeklyFactor.ref-RULES.volume.weeklyFactor.low),0,1):1+a.up*clamp((h-RULES.volume.weeklyFactor.ref)/(RULES.volume.weeklyFactor.high-RULES.volume.weeklyFactor.ref),0,1);
}
const capFor=fam=>({s1:RULES.safeguards.caps.s1,s2:RULES.safeguards.caps.s2,vo2:RULES.safeguards.caps.vo2})[SECTOR_OF[fam]]||Infinity;
/* Garde-fous par intensité, en minutes de travail par séance. La charge pondérée ne les contourne jamais. */
/* AS10 : zone principale 20–30', 30–35' en fin de bloc, 35' au maximum */
/* Le spécifique a son propre plafond de travail : les plafonds S2 / VO₂ ne s'appliquent pas à l'allure de course elle-même */
function capsFor(sector,c,st){if(sector==='spec10k'){const f=checkCaps(c,st,['s1','s2','vo2']);if((c.raceWork??c.work)>RULES.spec10k.workCap+RULES.safeguards.capTolerance)f.push('spec10k');return f;}return checkCaps(c,st,[]);}
// Shared personalized accounting; scheduling safeguards use the historical scale.
function loadDurationFactor(minutes){
 if(!Number.isFinite(minutes)||minutes<6||minutes>240)return null;
 const [a,b,fa,fb]=minutes<=60?[6,60,1,.6]:[60,240,.6,.3];
 return fa+(fb-fa)*Math.log(minutes/a)/Math.log(b/a);
}
function loadPersonalModel(refs){
 if(!refs)return null;
 const {st,p}=refs,jogg=st.s1lo*RULES.load.anchors.easyOfS1Low;
 const anchors=[{key:'jogg',label:'Jogg’',speed:jogg,factor:.2,time:null},{key:'s1',label:'S1',speed:lt1Ref(st),factor:.3,time:240},{key:'s2',label:'S2',speed:st.s2,factor:.6,time:60},{key:'vma100',label:'100 % VMA',speed:st.vma,factor:1,time:6},{key:'vma105',label:'105 % VMA',speed:st.vma*1.05,factor:1.2,time:null},{key:'vma110',label:'110 % VMA',speed:st.vma*1.1,factor:1.5,time:null}];
 const races=(p||[]).map((r,i)=>({key:['as5','as10','as21','as42'][i],label:['AS5','AS10','AS21','AS42'][i],speed:r.v,time:r.t/60,factor:loadDurationFactor(r.t/60),race:true})).filter(r=>Number.isFinite(r.speed)&&r.speed>0&&Number.isFinite(r.time)&&r.time>0);
 const issues=[];
 races.forEach(r=>{if(r.factor===null)issues.push(`${r.label} : chrono hors de la plage 6 min–4 h ; coefficient non extrapolé.`);});
 const points=[...anchors,...races],curve=points.filter(r=>r.factor!==null).sort((a,b)=>a.speed-b.speed);
 const conflicts=[];
 for(let i=1;i<curve.length;i++){const a=curve[i-1],b=curve[i];if(b.factor<a.factor-1e-8||Math.abs(b.speed-a.speed)<1e-8&&Math.abs(b.factor-a.factor)>1e-8)conflicts.push(`${a.label} / ${b.label} : allures et durées de maintien incohérentes. Vérifie les repères et les chronos.`);}
 return{points,curve,issues:[...issues,...conflicts],conflicts,vma:st.vma,referenceState:st};
}
function loadPersonalFactor(speed,model){
 if(!model||model.conflicts.length||!Number.isFinite(speed)||speed<=0)return null;
 const P=model.curve;if(speed>P.at(-1).speed+1e-8)return null;
 if(speed<=P[0].speed)return P[0].factor;
 for(let i=1;i<P.length;i++)if(speed<=P[i].speed){const a=P[i-1],b=P[i];return a.factor+(b.factor-a.factor)*(speed-a.speed)/(b.speed-a.speed);}
 return P.at(-1).factor;
}
function loadPoints(st){
  const K=RULES.load.intensity,A=RULES.load.anchors,M=A.insertMargin;
  const P=[[st.s1lo*A.recoveryOfS1Low,K.recovery],[st.s1lo*A.easyOfS1Low,K.easy],[st.s1lo*A.easyHighOfS1Low,K.easyHigh],[(st.s1lo+st.s1hi)/2,K.s1],[(st.s1hi+st.s2)/2,K.between],[st.s2,K.s2]];
  const v3=A.pace3kOfVma*st.vma;let last=st.s2;
  /* allures 10 km et 5 km insérées seulement si elles tombent bien entre S2 et ~95 % VMA (pas de zone artificielle) */
  if(st.v10&&st.v10>last+M&&st.v10<v3-M){P.push([st.v10,K.pace10k]);last=st.v10;}
  if(st.v5&&st.v5>last+M&&st.v5<v3-M)P.push([st.v5,K.pace5k]);
  P.push([v3,K.pace3k],[st.vma,K.vma100],[A.vma105*st.vma,K.vma105],[A.vma110*st.vma,K.vma110]);
  return P;
}
function loadFactorForSpeed(v,st){
  const P=st._lp||(st._lp=loadPoints(st));
  if(v<=P[0][0])return P[0][1];
  for(let i=1;i<P.length;i++)if(v<=P[i][0]){const[a,fa]=P[i-1],[b,fb]=P[i];return fa+(fb-fa)*(v-a)/(b-a);}
  const[a,fa]=P[P.length-2],[b,fb]=P[P.length-1];return Math.min(RULES.load.intensity.max,fb+(fb-fa)*(v-b)/(b-a));
}
function densityFactor(x){
  if(!x.rec)return RULES.load.density[0][1];
  const r=x.rec/x.work,D=RULES.load.density;let f;
  if(r<=D[0][0])f=D[0][1];else if(r>=D[D.length-1][0])f=D[D.length-1][1];
  else for(let i=1;i<D.length;i++)if(r<=D[i][0]){const[a,fa]=D[i-1],[b,fb]=D[i];f=fa+(fb-fa)*(r-a)/(b-a);break;}
  const SR=RULES.load.densityShortRecovery;if(x.recEach!==undefined&&x.recEach<SR.recEachBelow)f=Math.max(f,SR.floor);
  return f;
}
function loadZone(v,st){const Z=RULES.load.zones;if(v>=Z.z4OfVma*st.vma)return'z4';if(v>=st.s2-Z.z3BelowS2)return'z3';if(v>=st.s1lo-Z.z2BelowS1Low)return'z2';return'z1';}
const emptyBd=()=>({z1:0,z2:0,z3:0,z4:0});
const sumBd=bd=>bd.z1+bd.z2+bd.z3+bd.z4;
function preparationActivation(v,s={}){
  const S=v.structure||{},I=v.intensity||{};
  if(['vma','vmaShort','fartlek'].includes(s.fam)||v.sector==='vo2'||v.sector==='spec10k'||S.type==='fartlek_structured')return true;
  if(['spec','taper'].includes(s.fam)&&[0,1].includes(s.dist))return true;
  if(['5 km','10 km'].includes(I.race))return true;
  return (S.components||[]).some(c=>preparationActivation(c.variant));
}
function prepareSession(s,weeklyMinutes=s.weeklyMinutes??Infinity){
  if(s.isLong||!s.variants?.length)return s;
  s.activation=s.variants.some(v=>preparationActivation(v,s));
  const prep=RULES.organization.preparationByVolume.find(p=>weeklyMinutes<p.below)||RULES.organization.preparationByVolume.at(-1);
  const vo2=s.variants.some(v=>v.sector==='vo2'||(v.structure?.components||[]).some(c=>c.fam==='vo2'))||['vma','vmaShort','fartlek'].includes(s.fam);
  s.weeklyMinutes=Number.isFinite(weeklyMinutes)?weeklyMinutes:undefined;s.wu=Math.max(prep.warmup+(s.activation?3:0),vo2?RULES.organization.vo2MinimumWarmup:0);s.cd=prep.cooldown;
  s.total=s.wu+Math.max(...s.variants.map(v=>v.total))+s.cd;
  return s;
}
function variantSafetyLoad(x,s,st){
  const bd=emptyBd(),d=densityFactor(x);
  (x.parts||[]).forEach(([m,v])=>{bd[loadZone(v,st)]+=m*loadFactorForSpeed(v,st)*d;});
  bd.z1+=(s.wu+s.cd)*RULES.load.intensity.easy+(x.rec||0)*RULES.load.intensity.activeRec+(x.easy||0)*RULES.load.intensity.easy;
  return{load:sumBd(bd),bd,density:d};
}
function checkCaps(x,st,exempt){
  const m={s1:0,s2:0,vo2:0,above105:0};
  (x.parts||[]).forEach(([min,v])=>{const z=loadZone(v,st);if(z==='z2')m.s1+=min;if(z==='z3')m.s2+=min;if(z==='z4')m.vo2+=min;if(v>=RULES.safeguards.above105OfVma*st.vma)m.above105+=min;});
  return Object.keys(RULES.safeguards.caps).filter(k=>!exempt.includes(k)&&m[k]>RULES.safeguards.caps[k]+RULES.safeguards.capTolerance);
}
function withSafetyLoad(s,st){
  prepareSession(s,st.vol);
  s.variants.forEach(x=>{if(!x.ruleRefs)x.ruleRefs=variantRuleRefs(x,null);});
  s.ruleRefs=[...new Set(s.variants.flatMap(x=>x.ruleRefs).concat(['organization.warmup','organization.preparationByVolume'],s.wu===RULES.organization.vo2MinimumWarmup?['organization.vo2MinimumWarmup']:[]))];
  s.variants.forEach(x=>{Object.assign(x,variantSafetyLoad(x,s,st));x.capFail=s.libSector?capsFor(s.libSector,x,st):checkCaps(x,st,s.isLong?['s1']:[]);});
  const L=s.variants.map(x=>x.load);s.loadMin=Math.min(...L);s.loadMax=Math.max(...L);
  s.load=(s.loadMin+s.loadMax)/2; /* valeur centrale, utilisée seulement pour la répartition */
  s.loadBreakdown=emptyBd();['z1','z2','z3','z4'].forEach(z=>{s.loadBreakdown[z]=(s.variants[0].bd[z]+s.variants[1].bd[z])/2;});
  s.duration=s.total;s.workDuration=s.work;s.intensityFamily=s.fam;
  const sec=s.libSector||{vma:'vo2',vmaShort:'vo2',s1:'s1',s2:'s2'}[s.fam];if(sec){s.sector=sec;s.rpe=SECTOR_INFO[sec].rpe;s.hrRole=SECTOR_INFO[sec].hrRole;}
  return s;
}
/* identité d'une séance, sérialisable (utilisée pour les références croisées : footing du lendemain, alertes) */
const sessionKey=x=>({fam:x.fam,dist:x.dist,isLong:!!x.isLong});
function makeSession(fam,W,k,t,st,ctx){return withSafetyLoad(makeSessionCore(fam,W,k,t,st,ctx),st);}

/* ---------- séances mixtes : uniquement transition / rappel / assimilation ---------- */
const mixedSector=fam=>fam==='vma'||fam==='vmaShort'?'vo2':fam;
const mixedKey=(a,b)=>`${mixedSector(a)}>${mixedSector(b)}`;
const mixedCfg=(a,b,role)=>{
  const c=RULES.mixed.combinations[mixedKey(a,b)];
  return c&&c.contexts.includes(role)?c:null;
};
function mixedCandidates(fam,W,st,ctx,shortOnly){
  const sec=mixedSector(fam);
  return generateSession(sec,W,st,{...ctx,mixedComponent:true,maxWorkMinutes:W,shortOnly:!!shortOnly,memory:null});
}
function mixedComponentLabel(fam){return fam==='s1'?'S1':fam==='s2'?'S2':'VO₂';}
function makeMixedSession(primaryFam,secondaryFam,primaryW,secondaryW,role,k,t,st,ctx){
  const cfg=mixedCfg(primaryFam,secondaryFam,role);if(!cfg)return null;
  const budget=Math.min(cfg.maxWork,ctx.maxMixedWork??Infinity);if(budget<=0)return null;
  secondaryW=Math.min(secondaryW,cfg.maxSecondary);
  primaryW=Math.min(primaryW,cfg.maxPrimary,budget-secondaryW);if(primaryW<=0||secondaryW<=0)return null;
  const p=mixedCandidates(primaryFam,primaryW,st,{...ctx,k,t},false);
  if(!p.length)return null;
  const pairs=p.map((a,i)=>{
    const maxFraction=RULES.mixed.fasterFractionsShorter?minFractionMinutes(a)-1e-6:undefined;
    if(maxFraction!==undefined&&maxFraction<=0)return null;
    const q=mixedCandidates(secondaryFam,secondaryW,st,{...ctx,k:k+1,t,maxFractionMinutes:maxFraction},mixedSector(secondaryFam)==='vo2'&&role!=='transition');
    return q.length?{a,b:q[Math.min(i,q.length-1)]}:null;
  }).filter(Boolean);
  if(!pairs.length)return null;
  const br=RULES.mixed.betweenBlocks,bm=rangeMid(br);
  const first=pairs[0],reference=first.a.work+first.b.work;
  const equivalent=pairs.find((pair,i)=>i>0&&Math.abs(pair.a.work+pair.b.work-reference)<=TOL(reference)+1e-9)||first;
  const variants=[first,equivalent].map(({a,b})=>{
    const refs=[...(a.ruleRefs||[]),...(b.ruleRefs||[]),'mixed.allowedContexts','mixed.maxQualities','mixed.betweenBlocks','mixed.combinations','mixed.componentTimes','mixed.fasterFractionsShorter'];
    return cand({
      sector:'mixed',fam:`mixed.${mixedKey(primaryFam,secondaryFam)}`,kind:'mixed',key:`mixed:${role}:${a.key}>${b.key}`,size:'mixed',
      structure:{type:'mixed_zones',role,recoveryType:'free',recoveryBetweenBlocksMin:bm,recoveryBetweenBlocksRangeMin:br,
        components:[{fam:mixedSector(primaryFam),variant:a},{fam:mixedSector(secondaryFam),variant:b}]},
      intensity:{type:'mixed_progressive',from:mixedSector(primaryFam),to:mixedSector(secondaryFam)},
      parts:[...(a.parts||[]),...(b.parts||[])],rec:(a.rec||0)+(b.rec||0)+bm,recEach:Math.min(a.recEach??bm,b.recEach??bm),
      work:a.work+b.work,total:a.total+b.total+bm,ruleRefs:[...new Set(refs)]
    });
  });
  const [wu,cd]=RULES.organization.warmup.mixed,core=Math.max(...variants.map(x=>x.total));
  const hi=mixedSector(secondaryFam)==='vo2'?'z4':mixedSector(secondaryFam)==='s2'?'z3':'z2';
  return withSafetyLoad({fam:'mixed',mixedRole:role,mixedFrom:mixedSector(primaryFam),mixedTo:mixedSector(secondaryFam),zone:hi,variants,
    mixedTargets:{primaryW,secondaryW},work:variants[0].work,gap:Math.abs(variants[1].work-variants[0].work),total:r5(wu+core+cd),wu,cd},st);
}

/* ---------- footings : catégories et volume cible à ±2,5 % ---------- */
const FOOT={rec:{lab:'Jogg’',r:RULES.recovery.footing.rec.range,d:RULES.recovery.footing.rec.default},std:{lab:'Jogg’',r:RULES.recovery.footing.std.range,d:RULES.recovery.footing.std.default},pro:{lab:'Jogg’',r:RULES.recovery.footing.pro.range},active:{lab:'Jogg’ + endurance active'}};
function activeBlockLabel(f){
  if(Array.isArray(f.activeBlocks)&&f.activeBlocks.length){
    const blocks=f.activeBlocks;
    return blocks.every(m=>m===blocks[0])?`${blocks.length>1?blocks.length+'x':''}${blocks[0]}’`:blocks.map(m=>`${m}’`).join(' + ');
  }
  const r=f.activeRange;if(!r)return '';
  return `${f.activeReps>1?f.activeReps+'x':''}${Math.round(r[0])}${r[0]===r[1]?'':'–'+Math.round(r[1])}’`;
}
const joggTitle=f=>f.type==='active'?`Jogg’ + ${activeBlockLabel(f)} endurance active${f.ld?' + LD':''}`:f.ld?'Jogg + LD':'Jogg’';
function planFootings(o){
  const warns=[];let sl=o.sl,converted=false;
  /* 1 footing récupération après la séance la plus coûteuse ; un 2e si la semaine est chargée ; tous en assimilation */
  const recN=o.contextFreeFooting?0:o.assim?o.f:Math.min(o.f,o.nQ?(o.heavy?Math.min(RULES.recovery.secondRecoveryFootingWhenHeavy,o.nQ):1):0);
  const foot=[];for(let i=0;i<o.f;i++)foot.push(i<recN?{type:'rec',min:FOOT.rec.d}:{type:'std',min:FOOT.std.d});
  const PA=RULES.recovery.prolongedAllowed,ST=RULES.volume.footingStep,A=RULES.recovery.adaptiveFootings;
  const normalCount=foot.filter(f=>f.type==='std').length;
  const required=normalCount?Math.max(0,(o.R-foot.filter(f=>f.type==='rec').reduce((s,f)=>s+f.min,0))/normalCount):0;
  const normalMax=required>A.normalFrom?A.normalMax:FOOT.std.r[1];
  const prolongedMax=required>A.prolongedMax?A.absoluteMax:required>A.prolongedFrom?A.prolongedMax:FOOT.pro.r[1];
  const allowPro=required>A.prolongedFrom||o.vol>=PA.weeklyMinutesFrom||o.runs<=PA.runsUpTo,tol=RULES.volume.weekTolerance*o.vol,target=o.R+o.sl;
  const sum=()=>foot.reduce((a,x)=>a+x.min,0)+sl;
  for(let g=0;g<300&&Math.abs(target-sum())>tol;g++){
    const diff=target-sum();
    if(diff>0){
      const std=foot.filter(x=>x.type==='std'&&x.min<normalMax).sort((a,b)=>a.min-b.min)[0];if(std){std.min+=ST;continue;}
      const rec=foot.filter(x=>x.type==='rec'&&x.min<FOOT.rec.r[1]).sort((a,b)=>a.min-b.min)[0];if(rec){rec.min+=ST;continue;}
      if(!o.isMara&&sl<o.slSoft){sl+=ST;continue;}
      /* un footing récupération peut devenir standard s'il en manque (lendemain de journée facile) */
      /* le footing récupération garanti après la séance la plus coûteuse n'est jamais converti */
      if(!converted&&!o.heavy&&!o.assim){const recs=foot.filter(x=>x.type==='rec');if(recs.length>(o.nQ?1:0)){recs.pop().type='std';converted=true;continue;}}
      if(!o.isMara&&sl<o.slMax){sl+=ST;continue;}
      if(allowPro){const extended=foot.filter(x=>x.type==='pro').length;const pro=foot.filter(x=>(x.type==='pro'||x.type==='std'&&extended<A.maxProlonged)&&x.min<prolongedMax).sort((a,b)=>a.min-b.min)[0];if(pro){pro.min+=ST;pro.type='pro';continue;}}
      warns.push({code:'volume_short',params:{minutes:Math.round(diff)}});break;
    }else{
      const std=foot.filter(x=>(x.type==='std'||x.type==='pro')&&x.min>FOOT.std.r[0]).sort((a,b)=>b.min-a.min)[0];
      if(std){std.min-=ST;if(std.type==='pro'&&std.min<=FOOT.pro.r[0])std.type='std';continue;}
      const rec=foot.filter(x=>x.type==='rec'&&x.min>FOOT.rec.r[0]).sort((a,b)=>b.min-a.min)[0];if(rec){rec.min-=ST;continue;}
      if(!o.isMara&&sl>Math.max(o.slMin,Math.min(o.sl,o.slSoft))){sl-=ST;continue;}
      if(!o.isMara&&sl>o.slMin){sl-=ST;continue;}
      // Preserve the requested outings; feasibility is resolved by reducing quality work upstream.
      if(foot.length){warns.push({code:'weekly_volume_incompatible',params:{minimum:Math.round(sum()-target+o.vol),target:Math.round(o.vol)}});break;}
      warns.push({code:'quality_exceeds_volume'});break;
    }
  }
  foot.forEach(x=>{x.load=x.min*RULES.load.intensity.easy;});
  /* les footings de récupération viennent en premier : ils se placent le lendemain des qualités */
  foot.sort((a,b)=>(a.type==='rec'?0:1)-(b.type==='rec'?0:1));
  return{foot,sl,warns};
}
function activeEnduranceRange(total){
  const A=RULES.organization.activeEndurance,max=Math.min(A.work[1],total-A.warmup-A.cooldown);
  return max>=A.work[0]?[A.work[0],max]:null;
}
function canUseActiveEndurance(st,sessionCount,context){
  const A=RULES.organization.activeEndurance;
  if(st.runs<A.minRuns||st.runs>A.maxRuns||!A.allowedContexts.includes(context))return false;
  if(A.blockWhenFourRunsAndTwoQualities&&st.runs===4&&sessionCount>=2)return false;
  return true;
}
function applyActiveEndurance(st,foot,sl,sessionCount,context){
  if(!canUseActiveEndurance(st,sessionCount,context))return{slEA:null};
  if(context==='assimilation'){
    if(st.qualityCount<2)return{slEA:null};
    const A=RULES.organization.assimilationActive;
    const host=foot.slice().sort((a,b)=>b.min-a.min)[0];
    if(host){
      const minWork=A.blockMinutes[0];
      const warmup=Math.max(A.minEasy,Math.min(A.preferredWarmup,host.min-minWork-A.cooldown));
      const work=Math.min(30,host.min-warmup-A.cooldown);
      if(work>=minWork){
        host.type='active';host.assimilationActive=true;host.activeRange=[minWork,work];
        host.wu=warmup;host.cd=A.cooldown;
        const intensity=RULES.organization.activeEndurance.intensityPctLT1;
        const extra=loadFactorForSpeed(lt1Ref(st)*(intensity[0]+intensity[1])/2,st)-RULES.load.intensity.easy;
        host.loadMin=host.min*RULES.load.intensity.easy+minWork*extra;
        host.loadMax=host.min*RULES.load.intensity.easy+work*extra;
        host.load=(host.loadMin+host.loadMax)/2;
        foot.sort((a,b)=>Number(!!b.assimilationActive)-Number(!!a.assimilationActive));
      }
    }
    return{slEA:null};
  }
  const cand=foot.filter(x=>x.type==='std'||x.type==='pro').sort((a,b)=>b.min-a.min)[0];
  if(cand){
    const r=activeEnduranceRange(cand.min);
    if(r){cand.type='active';cand.activeRange=r;cand.wu=RULES.organization.activeEndurance.warmup;cand.cd=RULES.organization.activeEndurance.cooldown;return{slEA:null};}
  }
  const r=activeEnduranceRange(sl);
  return{slEA:r?{range:r,wu:RULES.organization.activeEndurance.warmup,cd:RULES.organization.activeEndurance.cooldown}:null};
}

/* ---------- blocs ---------- */
/* Blocs : paramètres dans RULES.blocks ; ici seulement l'identité et les codes de rappels (texte dans les présentateurs) */
const BLOCKS={
  vma:{id:'vma',...RULES.blocks.vma,ld:'strides_optional',reminders:['strides_optional_fast_work','long_run_easy']},
  s1:{id:'s1',...RULES.blocks.s1,ld:'strides',reminders:['strides']},
  s2:{id:'s2',...RULES.blocks.s2,
    /* Séquence explicite des séances complémentaires (préparation de la matrice bloc × semaine) :
       S1, rappel VO₂, S1, rappel VO₂ plus léger en dernière semaine de charge ; rien par défaut en assimilation. */
    seq:(k,N)=>{const Q=RULES.blocks.s2.sequence;return k%2===0?Q.even:(k===N-1?{...Q.odd,W:Q.oddLastW}:Q.odd);},ld:'strides',slS1:(k,N,assim)=>!assim&&k%2===1?RULES.blocks.s2.longRunS1EndMinutes:0,reminders:['strides','s2_long_run_s1_end']},
  eco:{id:'eco',...RULES.blocks.eco,reminders:['drills','strength']},
  aero:{id:'aero',...RULES.blocks.aero,ld:'strides',reminders:['aero_low_intensity','aero_long_run_first','aero_neuromuscular']}
};
const SPEC=RULES.blocks.spec;
function getBlock(st,pred){
  if(st.block!=='spec')return BLOCKS[st.block];
  const d=st.specDist,cfg=SPEC[d];
  const goal=!!st.specGoal,v=goal?DIST[d].km/(st.specGoal/3600):(pred?pred[d].v:null);
  return{id:'spec',budget:cfg.budget,v,goal,dist:d,A:{fam:'spec',W:cfg.K,min:cfg.min,assimW:cfg.assimK},B:cfg.B,
    ld:d<2?'strides_load':'strides_light',reminders:d<2?['strides_load']:['strides_light']};
}

function volumes(avg,N,ramp){
  const r=RULES.volume.assimilationFactor,d=avg*ramp/(N-1);
  const a=((N+1)*avg-d*N*(N-1)/2-r*d*(N-1))/(N+r);
  const w=[];for(let k=0;k<N;k++)w.push(r5(a+d*k));
  w.push(r5((N+1)*avg-w.reduce((s,x)=>s+x,0)));
  return w;
}
function roundW(fam,W){if(fam==='s1')return Math.max(5,r5(W));if(fam==='spec')return W>=5?Math.round(W*2)/2:Math.round(W*5)/5;return Math.round(W);}
// Organizational limits count the whole quality session. A marathon long run remains a long run.
function qualityDurationExceeded(sessions,minutes){
  const F=RULES.organization.weeklyFeasibility,q=sessions.filter(s=>!s.isLong);
  return q.some(s=>s.total>minutes*F.singleQualityShare+1e-7)||q.reduce((sum,s)=>sum+s.total,0)>minutes*F.combinedQualityShare+1e-7;
}

/* Construction d'UNE semaine d'un bloc : partagée par le mode Bloc et par le calendrier.
   o = {k, N, t, assim, vol, memory, block, specDist} ; k et N sont locaux au bloc. */
function buildSafetyWeek(B,st,o){
  // Retain one fewer quality in assimilation, with a minimum of one when requested.
  const{k,N,t,assim,vol,memory}=o,warns=[];
  if(assim)st={...st,vol:Math.min(st.vol,vol)};
  const initialMemory=memory?JSON.parse(JSON.stringify(memory)):null;
  const allowedQualities=Math.min(st.qualityCount,maxQualityForRuns(st.runs),o.qualityLimit??Infinity);
  const isMara=o.block==='spec'&&o.specDist===3&&allowedQualities>0;
  const LR=RULES.organization.longRun,tenK=o.calendar&&o.specDist===1||o.block==='spec'&&o.specDist===1,
    slCap=Math.min(o.block==='spec'?LR.cap.spec[o.specDist]:o.block==='aero'?LR.cap.aero:LR.cap.default,tenK?RULES.calendar.longRun10k.capMinutes:Infinity,o.longRunCap??Infinity);
    const lerp=W=>W[0]+(W[1]-W[0])*t;
    const toMin=(fam,W)=>fam==='spec'?W/B.v*60:W, fromMin=(fam,m)=>fam==='spec'?m*B.v/60:m;
    const normalQualities=Math.min(st.qualityCount,maxQualityForRuns(st.runs),B.id==='aero'?1:Infinity);
    const retainedQualities=Math.max(normalQualities>0?1:0,normalQualities-1);
    const AS=RULES.blocks.assimilation,QF=RULES.organization.qualityFrequency;
    const qN=assim?Math.min(allowedQualities,retainedQualities):B.id==='aero'?Math.min(1,allowedQualities):allowedQualities;
    let aW=assim?(B.A.assimW||B.A.W[0]*AS.mainOfFirstWeek):lerp(B.A.W);
    const bDef=B.seq?B.seq(k,N):B.B[k%B.B.length];
    const altDefs=(B.B||[]).filter(x=>x.fam!==bDef.fam),cDef=altDefs[0]||bDef;
    let bW=assim&&normalQualities>=2&&qN>0?bDef.W[0]*AS.secondOfFirstWeek:qN>=2?lerp(bDef.W):0;
    let cW=!assim&&qN>=3?lerp(cDef.W)*QF.thirdQualityFactor:0;
    /* volume de base × facteur volume hebdo × progression du bloc, puis plafond du secteur (le budget qualité suit) */
    const fA=volumeFactor(B.A.fam==='spec'&&B.dist===1?'spec10k':B.A.fam,st.vol),fB=volumeFactor(bDef.fam,st.vol),fC=volumeFactor(cDef.fam,st.vol);
    aW=Math.min(aW*fA,capFor(B.A.fam));if(bW)bW=Math.min(bW*fB,capFor(bDef.fam));if(cW)cW=Math.min(cW*fC,capFor(cDef.fam));
    // budget qualité : la 3e séance est la première réduite si le budget hebdomadaire est dépassé
    const max=B.budget[1]/100*vol;let qa=toMin(B.A.fam,aW),qb=bW,qc=cW;
    if(qa+qb+qc>max){
      let over=qa+qb+qc-max;
      if(qc){const cut=Math.min(over,qc);qc-=cut;over-=cut;}
      if(over>0&&qb){const bmin=bDef.min,cut=Math.max(0,Math.min(over,qb-bmin));qb-=cut;over-=cut;}
      if(over>0)qa=Math.max(toMin(B.A.fam,B.A.min),qa-over);
      if(qa+qb+qc>max+1)warns.push({code:'budget_too_small'});
    }
    aW=roundW(B.A.fam,fromMin(B.A.fam,qa));bW=bW?roundW(bDef.fam,qb):0;cW=qc?roundW(cDef.fam,qc):0;
    const workScale=o.workScale??1;
    aW*=workScale;bW*=workScale;cW*=workScale;
    const ctx={v:B.v,dist:B.dist,vol,assim,memory,fractionHistory:{...(memory?.fractions||{})},calendar:!!o.calendar};
    let sessions=[makeSession(B.A.fam,aW,k,t,st,ctx)],mixedRole=null;
    /* Assimilation : si une 2e qualité est demandée, les deux stimuli sont regroupés dans UNE séance mixte allégée. */
    if(assim&&qN===1&&bW>0){
      // In an S2 block, the supported combination is S1 > S2, not S2 > S1.
      const reverse=!mixedCfg(B.A.fam,bDef.fam,'assimilation')&&!!mixedCfg(bDef.fam,B.A.fam,'assimilation');
      const firstFam=reverse?bDef.fam:B.A.fam,secondFam=reverse?B.A.fam:bDef.fam;
      const C=mixedCfg(firstFam,secondFam,'assimilation');
      if(C){
        const primary=reverse?bW:aW,secondary=reverse?aW:bW;
        const m=makeMixedSession(firstFam,secondFam,Math.max(3,primary*C.assimPrimaryFactor),Math.max(3,secondary*C.assimSecondaryFactor),'assimilation',k,t,st,ctx);
        if(m){sessions=[m];mixedRole='assimilation';}
        else warns.push({code:'assimilation_mixed_unavailable'});
      }
    }
    /* Transition : dernière semaine de charge, le stimulus principal prépare la qualité du bloc suivant. */
    if(B.id!=='aero'&&!assim&&o.nextBlock&&k===N-1&&!mixedRole){
      const nextFam=o.nextBlock==='vma'?'vma':o.nextBlock;
      const C=mixedCfg(B.A.fam,nextFam,'transition');
      if(C){
        const sec=(C.transitionSecondaryMin[0]+C.transitionSecondaryMin[1])/2;
        const m=makeMixedSession(B.A.fam,nextFam,Math.max(B.A.min,aW*C.transitionPrimaryFactor),sec,'transition',k,t,st,ctx);
        if(m){sessions[0]=m;mixedRole='transition';}
      }
    }
    /* Rappel : ponctuel, en fin de bloc seulement ; on garde la qualité principale et on remplace le rappel VO₂ isolé. */
    if(!assim&&!mixedRole&&bW>0&&bDef.fam==='vmaShort'&&k===N-1){
      const C=mixedCfg(B.A.fam,bDef.fam,'reminder');
      if(C){
        const prim=(C.reminderPrimaryMin[0]+C.reminderPrimaryMin[1])/2,sec=Math.max(3,bW*C.reminderSecondaryFactor);
        const m=makeMixedSession(B.A.fam,bDef.fam,prim,sec,'reminder',k+1,t,st,ctx);
        if(m){sessions.push(m);mixedRole='reminder';}
      }
    }
    const longMain=B.id==='spec'&&B.dist===1&&sessions[0].variants.some(c=>maxFractionMinutes(c)>=RULES.weeklyFormats.longFractionMinutes);
    const secondCtx=longMain&&bDef.fam==='s2'?{...ctx,maxFractionMinutes:RULES.weeklyFormats.complementMaxFractionMinutes}:ctx;
    if(!assim&&!mixedRole&&B.id==='spec'&&B.dist===1&&bW>0&&bDef.fam==='s2'&&t>=RULES.alternating10k.fromProgress){
      const A=RULES.alternating10k,target=A.targetMinutes[0]+(A.targetMinutes[1]-A.targetMinutes[0])*t;
      const remaining=max-sessions[0].work-cW;
      const alt=makeAlternatingSession(Math.min(A.maxMinutes,remaining,target+2),st,ctx);
      if(alt){sessions.push(alt);mixedRole='alternating';}
    }
    if((!assim||qN>=2)&&bW>0&&sessions.length===1&&!mixedRole)sessions.push(makeSession(bDef.fam,bW,k+1,t,st,secondCtx));
    else if(!assim&&bW>0&&sessions.length===1&&mixedRole==='transition')sessions.push(makeSession(bDef.fam,bW,k+1,t,st,ctx));
    if(cW>0&&sessions.length<3)sessions.push(makeSession(cDef.fam,cW,k+2,t,st,{...ctx,memory:null}));
    for(let i=0;i<sessions.length;i++){
      const mix=sessions[i];if(mix.fam!=='mixed')continue;
      const other=sessions.reduce((sum,x,j)=>sum+(j===i?0:Math.max(...x.variants.map(v=>v.work))),0),remaining=max-other;
      if(Math.max(...mix.variants.map(v=>v.work))<=remaining+1e-9)continue;
      const reduced=makeMixedSession(mix.mixedFrom,mix.mixedTo,mix.mixedTargets.primaryW,mix.mixedTargets.secondaryW,mix.mixedRole,k,t,st,{...ctx,maxMixedWork:remaining});
      if(reduced)sessions[i]=reduced;
      else{const choices=mixedCandidates(mix.mixedFrom,Math.max(0,remaining),st,ctx,false);if(choices.length){const replacement={fam:mix.mixedFrom==='vo2'?'vmaShort':mix.mixedFrom,zone:zoneForSpeed(choices[0].parts[0][1],st),variants:choices,work:choices[0].work,wu:24,cd:10};sessions[i]=withSafetyLoad(replacement,st);}else{sessions.splice(i--,1);warns.push({code:'budget_too_small'});}}
    }
    /* règles de bloc et de volume qui ont fixé le volume de travail de chaque séance */
    const addRefs=(x,refs)=>{x.ruleRefs=[...new Set(x.ruleRefs.concat(refs.filter(Boolean)))];};
    const bp=B.id==='spec'?`blocks.spec.${B.dist}`:`blocks.${B.id}`;
    const blockRefs=[`${bp}.budget`,'volume.weeklyFactor',assim?'blocks.assimilation':null];
    if(qN===0)sessions=[];
    if(sessions[0])addRefs(sessions[0],[B.id==='spec'?`${bp}.K`:`${bp}.A`,mixedRole?'mixed.allowedContexts':null,mixedRole?'mixed.combinations':null,...blockRefs]);
    if(sessions[1])addRefs(sessions[1],[B.seq?`${bp}.sequence`:`${bp}.B`,sessions[1].fam==='mixed'?'mixed.allowedContexts':null,sessions[1].fam==='mixed'?'mixed.combinations':null,...blockRefs]);
    if(sessions[2])addRefs(sessions[2],[`${bp}.B`,'organization.qualityFrequency',...blockRefs]);
    // sortie longue
    let sl=isMara?0:clamp(r5(vol*LR.share),LR.minMinutes,slCap);
    const qTot=sessions.reduce((s,x)=>s+x.total,0);
    const f=Math.max(0,st.runs-sessions.length-(isMara?0:1));
    const minLong=isMara?0:Math.min(slCap,LR.minMinutes),reservedEasy=f*FOOT.std.r[0]+minLong;
    const retryFit=(durationBudget,allowZero=false)=>{
      const F=RULES.organization.weeklyFeasibility,attempt=o.fitAttempt||0;
      let retry=null;
      if(attempt<F.maxAttempts&&workScale>F.minimumWorkScale+1e-9)retry={...o,durationBudget,fitAttempt:attempt+1,workScale:Math.max(F.minimumWorkScale,workScale-F.scaleStep)};
      else if(qN>1||qN>0&&allowZero)retry={...o,durationBudget,qualityLimit:qN-1,fitAttempt:0,workScale:1};
      if(retry){if(memory){for(const key of Object.keys(memory))delete memory[key];Object.assign(memory,initialMemory);}return buildSafetyWeek(B,st,retry);}
      return null;
    };
    if(qTot+reservedEasy>vol+RULES.volume.weekTolerance*vol||qualityDurationExceeded(sessions,Math.min(vol,o.durationBudget??Infinity))){
      const fitted=retryFit(Math.min(vol,o.durationBudget??Infinity),qualityDurationExceeded(sessions,Math.min(vol,o.durationBudget??Infinity)));if(fitted)return fitted;
      warns.push({code:'weekly_volume_incompatible',params:{minimum:Math.ceil(qTot+reservedEasy),target:Math.round(vol)}});
    }
    const requestedQualities=assim?retainedQualities:st.qualityCount;
    if(sessions.length<requestedQualities)warns.push({code:'qualities_reduced',params:{requested:requestedQualities,actual:sessions.length}});
    else if(workScale<1)warns.push({code:'quality_work_reduced'});
    const workLoad=sessions.reduce((a,x)=>a+x.loadBreakdown.z2+x.loadBreakdown.z3+x.loadBreakdown.z4,0);
    const heavy=!assim&&workLoad/vol>=RULES.load.heavyWeek;
    const costly=sessions.slice().sort((a,b)=>b.loadMax-a.loadMax)[0];
    const fp=planFootings({contextFreeFooting:!o.calendar&&f===1,R:vol-qTot-sl,f,nQ:sessions.length,assim,heavy,vol,runs:st.runs,sl,slMin:Math.min(slCap,Math.max(LR.minMinutes,r5(vol*LR.minShare))),slSoft:Math.min(slCap,r5(vol*LR.softShare)),slMax:Math.min(slCap,r5(vol*LR.maxShare)),isMara});
    sl=fp.sl;const foot=fp.foot;warns.push(...fp.warns);
    // Calendar placement can extend a conservatively sized recovery run; check its final volume there.
    const actual=qTot+sl+foot.reduce((sum,x)=>sum+x.min,0);
    if(!o.calendar&&qualityDurationExceeded(sessions,Math.min(vol,actual))){const fitted=retryFit(Math.min(vol,actual),true);if(fitted)return fitted;}
    const aeContext=assim?'assimilation':B.id==='aero'?'aero':null;
    const ae=aeContext?applyActiveEndurance(st,foot,sl,sessions.length,aeContext):{slEA:null};
    const slEA=ae.slEA;
    if(assim&&st.qualityCount>=2&&st.runs>=4&&st.runs<=6&&!foot.some(f=>f.assimilationActive))warns.push({code:'assimilation_active_unavailable'});
    if(!assim&&costly){const r=foot.find(x=>x.type==='rec');if(r)r.after=sessionKey(costly);}
    if(B.id==='aero'&&!assim){
      const easy=foot.filter(x=>x.type==='std'||x.type==='pro');
      const tgt=easy[0];
      if(tgt){
        if(k%2===1)tgt.shortHills={...B.shortHills};
        else tgt.ld='strides';
      }
    }else if(B.ld){
      const tgt=foot.find(x=>x.type!=='rec')||foot[foot.length-1];
      if(tgt)tgt.ld=assim?'strides_optional':B.ld;
    }
    // sortie longue décomposée par intensité
    const slS1=isMara?0:((B.slS1&&B.slS1(k,N,assim))||0);
    const vS1=(st.s1lo+st.s1hi)/2;
    const slBd=emptyBd();slBd.z1=(sl-slS1)*RULES.load.intensity.easy;slBd.z2=slS1*loadFactorForSpeed(vS1,st);
    // garde-fous
    sessions.forEach(s=>s.variants.forEach((x,i)=>{if(x.capFail.length)warns.push({code:'cap_exceeded',params:{option:i+1,session:sessionKey(s),caps:x.capFail.slice()}});}));
    // minutes par zone, qualité, charge
    const z={z1:0,z2:0,z3:0,z4:0};sessions.forEach(sess=>{
      if(sess.fam==='mixed'||sess.fam==='alternating'){
        /* une séance mixte conserve les minutes de chaque qualité dans leur vraie zone */
        (sess.variants[0].parts||[]).forEach(([m,v])=>{z[loadZone(v,st)]+=m;});
      }else z[sess.zone]+=sess.work;
    });z.z2+=slS1;
    const volume=qTot+sl+foot.reduce((a,x)=>a+x.min,0);
    const qWork=z.z2+z.z3+z.z4;z.z1=Math.max(0,volume-qWork);
    const pct=qWork/volume*100;
    const bd=emptyBd();
    sessions.forEach(s=>['z1','z2','z3','z4'].forEach(q=>{bd[q]+=s.loadBreakdown[q];}));
    ['z1','z2'].forEach(q=>{bd[q]+=slBd[q];});foot.forEach(x=>{bd.z1+=x.load;});
    const load=sumBd(bd);
    const spread=sessions.reduce((a,x)=>a+(x.loadMax-x.load),0)+foot.reduce((a,f)=>a+(f.assimilationActive?f.loadMax-f.load:0),0);
    const loadMin=load-spread,loadMax=load+spread;
    if(Math.abs(volume-vol)>RULES.volume.deviationAlert*vol)warns.push({code:'volume_deviation',params:{volume,target:vol}});
    const reminders=(assim?['strides_optional_week','evaluation']:B.reminders).map(code=>({code,params:{block:B.id,dist:B.dist}}));
  const ruleRefs=[...(tenK?['calendar.longRun10k']:[]),...(longMain?['weeklyFormats']:[]),'organization.longRun','organization.weeklyFeasibility','recovery.footing','recovery.adaptiveFootings','recovery.prolongedAllowed','recovery.secondRecoveryFootingWhenHeavy','volume.weekTolerance','volume.deviationAlert','load.heavyWeek'];
  rememberFractionDurations(sessions,memory);
  return{k,assim,target:vol,vol:volume,volume,ruleRefs:sessions.some(()=>true)?ruleRefs.concat(aeContext?['organization.activeEndurance']:[]):ruleRefs,sessions,sl,slS1,slEA,slLoad:sumBd(slBd),foot,z,pct,qualityMinutes:qWork,qualityPct:pct,load,loadMin,loadMax,heavy,workLoad,loadBreakdown:bd,warns,reminders,budget:B.budget,costly:costly&&sessionKey(costly)};
}
// Compatibility entry point; assimilation uses the same guards as every other week.
function buildAssimilationWeek(B,st,o){return buildWeek(B,st,{...o,assim:true});}
function buildSafetyPlan(st,pred){
  const B=getBlock(st,pred),N=st.N;
  const BR=RULES.volume.blockRamp,ramp=Math.min(BR.base+BR.perWeek*(N-2),BR.max)+(B.ramp||0);
  const vols=volumes(st.vol,N,ramp);
  const weeks=[],memory={};
  for(let k=0;k<=N;k++){const w=buildSafetyWeek(B,st,{k,N,t:N>1?k/(N-1):1,assim:k===N,vol:vols[k],memory,block:st.block,specDist:st.specDist,nextBlock:null});
    w.ruleRefs=w.ruleRefs.concat(['volume.blockRamp','volume.assimilationFactor']);weeks.push(w);}
  return{B,weeks,vols};
}

/* ===================== Calendrier course (v7) =====================
   CALENDRIER choisit QUAND et QUOI travailler ; BLOC définit la progression du stimulus ;
   BIBLIOTHÈQUE choisit COMMENT. Le calendrier ne génère jamais lui-même une séance de qualité :
   il appelle buildSafetyWeek() avec le bloc, la position dans le bloc (t) et l'enveloppe de volume. */
const DAY=864e5;
const parseDate=x=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(x||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null;};
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const dayDiff=(a,b)=>Math.round((b-a)/DAY);
const wd=d=>(d.getDay()+6)%7; /* 0 = lundi */
const fmtD=d=>d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
const fmtDs=d=>d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
const PHASE_LAB={aero:'Développement aérobie',vma:'VO₂max',s1:'Premier seuil',s2:'Second seuil',eco:'Économie / côtes',spec:'Spécifique',assim:'Assimilation',taper:'Affûtage et course',intro:'Mise en route'};
const PHASE_C={aero:'var(--z1)',intro:'var(--z1)',s1:'var(--z2)',s2:'var(--z3)',vma:'var(--z4)',eco:'var(--z4)',spec:'var(--accent)',assim:'var(--line)',taper:'var(--muted)'};
const phaseLab=(p,dist)=>p==='spec'?`Spécifique ${DIST[dist].lab}`:PHASE_LAB[p];

/* Séquence de blocs (de la plus ancienne à la course) selon le nombre de semaines. Règles de départ, déterministes. */
/* 10 km : 4 sem. spécifique ; 5–7 S2 → spécifique ; 8–15 S1 → S2 → spécifique ; 16–19 aérobie → S1 → S2 → spécifique ;
   20 et plus aérobie → VO₂ → S1 → S2 → spécifique. Avant 16 semaines, les rappels intégrés aux blocs suffisent. */
function phaseTypes(N){return RULES.calendar.phaseSequence.find(x=>N<=x.upTo).blocks.slice();}
/* Départage à coût égal : de 12 à 15 semaines, on allonge d'abord le S1, puis le S2, puis le spécifique
   (12 : 3-3-3, 13 : 4-3-3, 14 : 4-4-3, 15 : 4-4-4). Ailleurs, on allonge d'abord le spécifique, puis le S2. */
function tiePref(types,N){const n=types.length,w=types.map(()=>0),T=RULES.calendar.tieBreak,E=T.earlyFirst;
  if(N>=E.fromWeeks&&N<=E.toWeeks&&n===E.blocks){E.weights.forEach((x,i)=>{w[i]=x;});}else{w[n-1]=T.default.last;if(n>1)w[n-2]=T.default.beforeLast;}return w;}
/* Une assimilation s'insère avant un bloc dès que l'enchaînement de charge précédent atteint 3 semaines.
   Pas d'assimilation avant l'affûtage : la semaine de course joue ce rôle. */
function countWeeks(len,opt={}){const AF=RULES.calendar.assimilationAfterLoadWeeks;let run=0,tot=0,maxRun=0;const ass=[];len.forEach((L,i)=>{if(i>0&&(run>=AF||(opt.exactLast&&opt.maxRun&&run+L>opt.maxRun)||(opt.assimBeforeSpecific&&i===len.length-1))){tot++;run=0;ass[i]=true;}run+=L;tot+=L;maxRun=Math.max(maxRun,run);});return{tot,ass,maxRun};}
/* Recherche exhaustive (petite) de la répartition la plus proche de 3 semaines par bloc qui remplit exactement le temps disponible.
   À égalité, on favorise un spécifique puis un S2 plus longs. */
/* opt.minLast : durée minimale du dernier bloc (spécifique) ; opt.maxRun : semaines de charge consécutives au maximum */
function layoutSegments(types,Nb,pref,opt){
  const n=types.length,SG=RULES.calendar.segment,TD=RULES.calendar.tieBreak.default;opt=opt||{};pref=pref||types.map((_,i)=>i===n-1?TD.last:i===n-2?TD.beforeLast:0);
  for(const[MIN,MAX]of SG.lengthTiers){
    let best=null;const len=[];
    const rec=i=>{if(i===n){const c=countWeeks(len,opt);if(c.tot!==Nb)return;
        if(opt.exactLast&&len[n-1]!==opt.exactLast)return;
        if(opt.minLast&&len[n-1]<opt.minLast)return;if(opt.maxRun&&c.maxRun>opt.maxRun)return;
        const cost=len.reduce((a,L,j)=>a+Math.abs(L-SG.preferredWeeks)-pref[j]*L,0);
        if(!best||cost<best.cost-1e-9)best={len:len.slice(),ass:c.ass,cost};return;}
      for(let L=MIN;L<=MAX;L++){len[i]=L;rec(i+1);}};
    rec(0);if(best)return best;
  }
  return null;
}
function planPhases(N,dist){
  const Nb=N-1,list=[];
  /* 10 km : quatre semaines spécifiques prioritaires, cinq en repli.
     Autres distances : minimum historique ; limite de cinq semaines de charge consécutives. */
  const CR=RULES.calendar,opt={minLast:N>=CR.minSpecificWeeks.fromWeeks?CR.minSpecificWeeks.weeks:0,maxRun:CR.maxConsecutiveLoadWeeks};
  if(Nb>0){let types=phaseTypes(N),lay=null;
    if(dist===1&&Nb>=CR.specific10k.preferredWeeks){
      const original=types.slice(),choices=[original];
      // Compress upstream phases when time is short; extend upstream phases when time is long.
      for(let cut=1;cut<original.length;cut++)choices.push(original.slice(cut));
      for(let extra=1;extra+original.length<=CR.segment.maxBlocksWhenExtending;extra++)choices.push([...Array(extra).fill('aero'),...original]);
      for(const L of [CR.specific10k.preferredWeeks,CR.specific10k.fallbackWeeks]){
        for(const candidate of choices){
          for(const assimBeforeSpecific of [false,true]){const fit=layoutSegments(candidate,Nb,tiePref(candidate,N),{exactLast:L,maxRun:CR.maxConsecutiveLoadWeeks,assimBeforeSpecific});
            if(fit){types=candidate;lay=fit;break;}}
          if(lay)break;}
        if(lay)break;
      }
    }
    if(!lay){lay=layoutSegments(types,Nb,tiePref(types,N),opt)||layoutSegments(types,Nb,tiePref(types,N));
      while(!lay&&types.length<CR.segment.maxBlocksWhenExtending){types=['aero',...types];lay=layoutSegments(types,Nb,tiePref(types,N),opt)||layoutSegments(types,Nb,tiePref(types,N));}}
    if(!lay)throw new Error('Durée de préparation incompatible avec les blocs disponibles.');
    types.forEach((b,i)=>{
      if(lay.ass[i])list.push({kind:'assim',block:types[i-1],segLen:lay.len[i-1]});
      for(let k=0;k<lay.len[i];k++)list.push({kind:'charge',block:b,k,segLen:lay.len[i],t:lay.len[i]>1?k/(lay.len[i]-1):1});
    });}
  list.push({kind:'taper',block:'taper'});
  return list;
}
/* Enveloppe de volume globale : les semaines de charge suivent une seule ligne montante (−8 % → +8 %) à travers tous les blocs,
   l'assimilation retire ~22 % à la semaine précédente, l'affûtage vaut ~62 % ; le tout est recalé pour que la moyenne
   (semaines partielles comptées au prorata) soit le volume saisi. */
function calendarVolumes(plan,V,wins){
  const C=plan.filter(w=>w.kind==='charge').length;let c=0,prev=V;
  const frac=wins.map(w=>(dayDiff(w.start,w.end)+1)/7);
  const raw=plan.map((w,i)=>{let v;
    const EN=RULES.calendar.envelope;
    if(w.kind==='charge'){v=V*(EN.loadStart+EN.loadSpan*(C>1?c/(C-1):1));c++;prev=v;}
    else if(w.kind==='assim')v=prev*EN.assimilation;else if(w.kind==='taper')v=V*EN.taper;else v=V*EN.intro;
    return v*frac[i];});
  const scale=V*frac.reduce((a,x)=>a+x,0)/raw.reduce((a,x)=>a+x,0);
  /* plafond : aucune semaine au-delà de +10 % du volume saisi (la moyenne réelle peut alors passer sous la cible) */
  return raw.map((x,i)=>r5(Math.min(x*scale,RULES.calendar.envelope.peakCap*V*frac[i])));
}
function raceSpeed(st,pred){const d=st.calDist;return st.calGoal?DIST[d].km/(st.calGoal/3600):(pred?pred[d].v:null);}

/* Semaine de course : volume fortement réduit, un rappel d'allure, la veille légère, la course. */
function buildSafetyTaperWeek(st,pred,vol){
  const d=st.calDist,v=raceSpeed(st,pred),km=DIST[d].km,raceMin=km/v*60,warns=[];
  const rm=1/v*60;
  const TP=RULES.calendar.taper,RA=TP.reminderA,RB=TP.reminderB;
  const reminderMinutes=Math.min(RA.reps*RA.minutes,specificWorkLimit(v,st)),aMinutes=reminderMinutes/RA.reps;
  const stepM=RULES.specOther.durationAndEquivalence.taperDistanceStepM;
  const bMeters=Math.max(stepM,Math.floor(reminderMinutes/RB.reps*v/60*1000/stepM)*stepM),rmB=bMeters/1000/v*60;
  const A=cand({sector:'race',fam:'taper',kind:'time',key:'taper:2min',size:'t2',structure:{type:'intervals',reps:RA.reps,durationMin:aMinutes,recoveryMin:RA.recovery,recoveryType:'trot'},intensity:{type:'race_pace',race:DIST[d].lab,refKmh:v},parts:[[reminderMinutes,v]],rec:(RA.reps-1)*RA.recovery,recEach:RA.recovery,work:reminderMinutes});
  const Bv=cand({sector:'race',fam:'taper',kind:'dist',key:'taper:distance',size:'d'+bMeters,structure:{type:'intervals',reps:RB.reps,distanceM:bMeters,repDurationMin:rmB,recoveryMin:RB.recovery,recoveryType:'trot'},intensity:{type:'race_pace',race:DIST[d].lab,refKmh:v},parts:[[RB.reps*rmB,v]],rec:(RB.reps-1)*RB.recovery,recEach:RB.recovery,work:RB.reps*rmB});
  const rappel=withSafetyLoad({fam:'taper',dist:d,zone:zoneForSpeed(v,st),variants:[A,Bv],work:A.work,gap:0,wu:TP.warmup,cd:TP.cooldown,total:r5(TP.warmup+Math.max(A.total,Bv.total)+TP.cooldown)},st);
  const rbd=emptyBd();rbd.z1=(TP.raceWarmup+TP.raceCooldown)*RULES.load.intensity.easy;rbd[loadZone(v,st)]+=raceMin*loadFactorForSpeed(v,st)*RULES.load.density[0][1];
  const race={type:'race',fam:'race',dist:d,distance:km,targetPace:v,targetTime:raceMin*60,goal:!!st.calGoal,zone:zoneForSpeed(v,st),
    wu:TP.raceWarmup,cd:TP.raceCooldown,work:raceMin,duration:r5(raceMin+TP.raceWarmup+TP.raceCooldown),total:r5(raceMin+TP.raceWarmup+TP.raceCooldown),load:sumBd(rbd),loadMin:sumBd(rbd),loadMax:sumBd(rbd),loadBreakdown:rbd};
  const veille=st.runs>=TP.eveFromRuns?TP.eveMinutes:0;
  const n=Math.max(0,st.runs-2-(veille?1:0)),rest=vol-rappel.total-race.total-veille;
  const foot=[];for(let i=0;i<n;i++)foot.push({type:'rec',min:clamp(r5(rest/n),TP.footing[0],TP.footing[1])});
  foot.forEach(x=>{x.load=x.min*RULES.load.intensity.easy;});
  const volume=rappel.total+race.total+veille+foot.reduce((a,x)=>a+x.min,0);
  const z={z1:0,z2:0,z3:0,z4:0};z[rappel.zone]+=rappel.work;z[race.zone]+=raceMin;
  const qWork=z.z2+z.z3+z.z4;z.z1=Math.max(0,volume-qWork);
  const bd=emptyBd();['z1','z2','z3','z4'].forEach(q=>{bd[q]=rappel.loadBreakdown[q]+rbd[q];});bd.z1+=(veille+foot.reduce((a,x)=>a+x.min,0))*RULES.load.intensity.easy;
  const load=sumBd(bd);
  return{assim:false,target:vol,vol:volume,volume,sessions:[rappel],race,veille,foot,sl:0,slS1:0,z,pct:qWork/volume*100,qualityMinutes:qWork,qualityPct:qWork/volume*100,
    load,loadMin:load-(rappel.loadMax-rappel.load),loadMax:load+(rappel.loadMax-rappel.load),loadBreakdown:bd,warns,
    reminders:[{code:'taper_jminus2'},{code:'taper_eve',params:{minutes:TP.eveMinutes,strides:TP.eveStrides,seconds:TP.eveStrideSeconds}},{code:'taper_no_long_run'}],budget:[0,100]};
}
/* Semaine d'entrée partielle (moins de 4 jours) : footings faciles uniquement. */
function buildSafetyIntroWeek(st,vol,win){
  const days=dayDiff(win.start,win.end)+1,n=Math.max(1,Math.min(st.runs,days-1));
  const foot=[];for(let i=0;i<n;i++)foot.push({type:'std',min:clamp(r5(vol/n),RULES.calendar.introFooting[0],RULES.calendar.introFooting[1])});foot.forEach(x=>{x.load=x.min*RULES.load.intensity.easy;});
  const volume=foot.reduce((a,x)=>a+x.min,0),bd=emptyBd();bd.z1=volume*RULES.load.intensity.easy;
  return{assim:false,target:vol,vol:volume,volume,sessions:[],foot,sl:0,slS1:0,z:{z1:volume,z2:0,z3:0,z4:0},pct:0,qualityMinutes:0,qualityPct:0,load:bd.z1,loadMin:bd.z1,loadMax:bd.z1,loadBreakdown:bd,warns:[],reminders:[{code:'intro_partial'}],budget:[0,100]};
}

/* Placement sur les dates : qualités espacées d'au moins 48 h, sortie longue en fin de semaine,
   footing récupération prioritaire entre qualité et sortie longue, jours choisis respectés s'ils sont saisis. */
function placeWeek(wk,win,st){
  const PL=RULES.calendar.placement;
  const dates=[];for(let d=win.start;d<=win.end;d=addDays(d,1))dates.push(d);
  const avail=dates.filter(d=>st.avail[wd(d)]),slot=new Map(),warns=[];
  const put=(d,item)=>{const k=+d;if(!slot.has(k))slot.set(k,[]);slot.get(k).push(item);};
  const isFree=d=>!slot.has(+d);const free=()=>avail.filter(isFree);
  const byWd=w=>avail.find(d=>wd(d)===+w);
  const idx=d=>dayDiff(win.start,d);
  const spread=(cands)=>{const used=[...slot.keys()].map(k=>idx(new Date(k)));
    return cands.slice().sort((a,b)=>{const g=c=>used.length?Math.min(...used.map(u=>Math.abs(u-idx(c)))):9;return g(b)-g(a);})[0];};
  if(wk.raceWeek){
    put(win.end,{kind:'race',s:wk.race});
    const rp=RULES.calendar.taper.reminderDaysBefore.map(n=>addDays(win.end,-n)).find(d=>d>=win.start&&st.avail[wd(d)]&&isFree(d));
    if(rp)put(rp,{kind:'q',s:wk.sessions[0]});else{wk.sessions[0].unplaced=true;warns.push({code:'no_day_taper_reminder'});}
    const j2=addDays(win.end,-2);
    if(wk.veille){
      const v=addDays(win.end,-1);
      if(v>=win.start&&st.avail[wd(v)]&&isFree(v))put(v,{kind:'veille',min:wk.veille,strides:RULES.calendar.taper.eveStrides,seconds:RULES.calendar.taper.eveStrideSeconds});
      else{wk.veille=0;warns.push({code:'no_day_taper_eve'});}
    }
    wk.foot.forEach(f=>{const c=free().filter(d=>d<win.end&&(!RULES.calendar.taper.jMinus2Rest||+d!==+j2));const d=spread(c);if(d)put(d,{kind:'foot',f});else{f.unplaced=true;warns.push({code:'no_day_footing'});}});
  }else{
    const qs=wk.sessions.filter(x=>!x.isLong),long=wk.sessions.find(x=>x.isLong);
    let slD=null;
    if(wk.sl||long){slD=(st.slDay!==''&&byWd(st.slDay))||avail[avail.length-1];if(slD)put(slD,long?{kind:'q',s:long}:{kind:'sl'});}
    const qDays=[];
    qs.forEach((x,i)=>{const pref=i===0?st.q1Day:i===1?st.q2Day:st.q3Day;let d=pref!==''?byWd(pref):null;if(d&&!isFree(d))d=null;
      if(!d){const gap=c=>{const o=[...qDays.map(q=>q.d),slD].filter(Boolean).map(y=>Math.abs(idx(y)-idx(c)));return o.length?Math.min(...o):9;};
        const cands=free(),good=cands.filter(c=>gap(c)>=PL.minDaysBetweenQualities&&!(i===0&&idx(c)===0&&cands.length>PL.firstDayFreeIfMoreThan));const pool=good.length?good:cands;
        d=i===0?pool[0]:pool.slice().sort((a,b)=>gap(b)-gap(a))[0];}
      if(d){put(d,{kind:'q',s:x});qDays.push({d,s:x});}else warns.push({code:'no_day_session',params:{session:sessionKey(x)}});});
    if(qDays.some((a,i)=>qDays.some((b,j)=>j>i&&Math.abs(idx(a.d)-idx(b.d))<PL.minDaysBetweenQualities)))warns.push({code:'qualities_consecutive'});
    if(slD&&qDays.some(q=>Math.abs(idx(q.d)-idx(slD))<PL.minDaysBetweenQualities))warns.push({code:'quality_next_to_long_run'});
    const C=RULES.recovery.calendarContext;
    const dayKey=d=>+d,qualityAt=d=>qDays.find(q=>dayKey(q.d)===dayKey(d));
    const risk=d=>{
      const prev=qualityAt(addDays(d,-1)),next=qualityAt(addDays(d,1)),beforeLong=slD&&dayKey(addDays(d,1))===dayKey(slD);
      let score=(prev?C.afterQuality:0)+(next?C.beforeQuality:0)+(beforeLong?C.beforeLongRun:0);
      if(prev&&(next||beforeLong))score+=C.bridgePriority;
      if(prev&&preparationActivation(prev.s.variants[0],prev.s))score+=C.vo2Bonus;
      if(prev&&!next&&!beforeLong&&!st.avail[wd(addDays(d,1))])score-=C.beforeRestDiscount;
      return score;
    };
    const afterQ=qDays.map(q=>addDays(q.d,1));
    wk.foot.forEach(f=>{const replacementDay=qs.length>=2?st.q3Day:st.q2Day;let d=f.assimilationActive&&replacementDay!==''?byWd(replacementDay):null;if(d&&!isFree(d))d=null;
      const choices=free(),okAfter=afterQ.filter(x=>x<=win.end&&st.avail[wd(x)]&&isFree(x));
      if(!d&&f.type==='rec')d=choices.slice().sort((a,b)=>risk(b)-risk(a)||((qualityAt(addDays(b,-1))?.s.loadMax||0)-(qualityAt(addDays(a,-1))?.s.loadMax||0)))[0];
      if(!d&&okAfter.length)d=okAfter.slice().sort((a,b)=>risk(a)-risk(b))[0];
      if(!d)d=spread(choices);
      if(d){if(f.type==='rec'){const prev=qualityAt(addDays(d,-1));if(prev)f.after=sessionKey(prev.s);}put(d,{kind:'foot',f});}else{f.unplaced=true;warns.push({code:'no_day_footing_reduce'});}});
    /* Keep weekly minutes unchanged: transfer spare easy minutes to the protected recovery run,
       up to 45 min, rather than extend the normal run before a rest day. */
    const placed=dates.flatMap(d=>(slot.get(+d)||[]).filter(it=>it.kind==='foot').map(it=>({d,f:it.f})));
    for(const entry of placed.filter(x=>x.f.type==='rec'&&risk(x.d)>=C.bridgePriority)){
      let need=Math.max(0,C.recoveryTarget-entry.f.min);
      for(const donor of placed.filter(x=>x.f.type==='std'&&risk(x.d)<C.bridgePriority)){
        const transfer=Math.min(need,Math.max(0,donor.f.min-C.normalTarget));donor.f.min-=transfer;entry.f.min+=transfer;need-=transfer;
      }
    }
    const AF=RULES.recovery.adaptiveFootings;
    const protectedDay=d=>!!(qualityAt(addDays(d,1))||(slD&&+addDays(d,1)===+slD)||qualityAt(addDays(d,-1))&&slot.has(+addDays(d,1)));
    let spare=0;
    for(const {d,f} of placed){
      f.contextProtected=protectedDay(d);
      if(f.type==='active')continue;
      if(!protectedDay(d)&&f.type==='rec'&&!qualityAt(addDays(d,-1)))f.type='std';
      if(protectedDay(d)&&f.min>AF.protectedMax){spare+=f.min-AF.protectedMax;f.min=AF.protectedMax;f.type='rec';}
    }
    for(const {d,f} of placed.filter(x=>!protectedDay(x.d)&&x.f.type!=='rec'&&x.f.type!=='active')){
      const extended=placed.filter(x=>x.f.min>AF.normalMax).length;
      const max=f.min>AF.normalMax||extended<AF.maxProlonged?AF.absoluteMax:AF.normalMax;
      const transfer=Math.min(spare,Math.max(0,max-f.min));f.min+=transfer;spare-=transfer;if(f.min>AF.normalMax)f.type='pro';
    }
    const missing=Number.isFinite(wk.vol)?Math.max(0,(wk.target??wk.targetVolume??wk.vol)-wk.vol):0;
    let added=0;
    // An isolated normal run may absorb previously unallocated minutes, after its date is known.
    for(const {d,f} of placed.filter(x=>!protectedDay(x.d)&&x.f.type!=='rec'&&x.f.type!=='active')){
      const extended=placed.filter(x=>x.f.min>AF.normalMax).length;
      const max=f.min>AF.normalMax||extended<AF.maxProlonged?AF.absoluteMax:AF.normalMax;
      const transfer=Math.min(missing-added,Math.max(0,max-f.min));f.min+=transfer;added+=transfer;if(f.min>AF.normalMax)f.type='pro';
    }
    const delta=added-spare;
    if(delta&&wk.z&&wk.loadBreakdown){
      wk.vol+=delta;wk.volume=wk.vol;wk.z.z1+=delta;
      const load=delta*RULES.load.intensity.easy;
      wk.load+=load;wk.loadMin+=load;wk.loadMax+=load;wk.loadBreakdown.z1+=load;
      wk.pct=wk.qualityPct=wk.qualityMinutes/wk.vol*100;
    }
    if(added){
      wk.warns=wk.warns.filter(w=>!['volume_short','volume_deviation'].includes(w.code));
      const deficit=(wk.target??wk.targetVolume)-wk.vol;
      if(deficit>RULES.volume.weekTolerance*(wk.target??wk.targetVolume))wk.warns.push({code:'volume_short',params:{minutes:Math.round(deficit)}});
      if(Math.abs(deficit)>RULES.volume.deviationAlert*(wk.target??wk.targetVolume))wk.warns.push({code:'volume_deviation',params:{volume:wk.vol,target:wk.target??wk.targetVolume}});
    }
    if(spare>0){
      warns.push({code:'protected_footing_shortfall',params:{minutes:Math.round(spare)}});
    }
    placed.forEach(({f})=>{if(!f.assimilationActive)f.load=f.min*RULES.load.intensity.easy;});

  }
  return{list:dates.map(d=>({date:d,items:slot.get(+d)||[]})),warns};
}

function buildSafetyCalendar(st,pred){
  const activePlan=context.getActivePlan?.();
  const start=parseDate(st.calStart),race=parseDate(st.calRace);
  if(!start||!race)return{error:{code:'dates_missing'}};
  if(race<start)return{error:{code:'race_before_start'}};
  if(!raceSpeed(st,pred))return{error:{code:'race_pace_missing'}};
  if(!st.avail.some(Boolean))return{error:{code:'no_available_day'}};
  /* semaines calées à rebours : la dernière se termine le jour de la course ; la première peut être partielle */
  const Nall=Math.ceil((dayDiff(start,race)+1)/7),wins=[];
  for(let i=0;i<Nall;i++){const end=addDays(race,-7*(Nall-1-i));let a=addDays(end,-6);if(a<start)a=start;wins.push({start:a,end});}
  const intro=Nall>1&&dayDiff(wins[0].start,wins[0].end)+1<RULES.calendar.introWeekMinDays;
  const plan=planPhases(Nall-(intro?1:0),st.calDist);if(intro)plan.unshift({kind:'intro',block:'intro'});
  const vols=calendarVolumes(plan,st.vol,wins);
  const memory={},weeks=[];
  plan.forEach((p,i)=>{const win=wins[i],vol=vols[i],priorFractions={...(memory.fractions||{})},priorMemory=JSON.parse(JSON.stringify(memory));let wk,rebuild;
    if(p.kind==='charge'||p.kind==='assim'){
      const bst={...st,block:p.block,specDist:st.calDist,specGoal:st.calGoal},B=getBlock(bst,pred);
      const nextCharge=plan.slice(i+1).find(x=>x.kind==='charge'),nextBlock=nextCharge?nextCharge.block:null;
      const lrDate=(st.slDay!==''?Array.from({length:dayDiff(win.start,win.end)+1},(_,d)=>addDays(win.start,d)).find(d=>wd(d)===+st.slDay&&st.avail[wd(d)]):null)||Array.from({length:dayDiff(win.start,win.end)+1},(_,d)=>addDays(win.start,d)).filter(d=>st.avail[wd(d)]).pop();
      const longRunCap=st.calDist===1&&lrDate&&dayDiff(lrDate,race)<=RULES.calendar.longRun10k.preRaceDays?RULES.calendar.longRun10k.preRaceCapMinutes:undefined;
      const options={longRunCap,k:p.kind==='assim'?p.segLen:p.k,N:p.segLen,t:p.kind==='assim'?1:p.t,assim:p.kind==='assim',vol,memory,block:p.block,specDist:st.calDist,calendar:true,nextBlock};
      rebuild=extra=>buildSafetyWeek(B,bst,{...options,...extra});wk=rebuild({});
      if(p.kind==='assim')wk.reminders=[{code:'strides_optional_week'}];
    }else if(p.kind==='taper')wk=buildSafetyTaperWeek(st,pred,vol);
    else wk=buildSafetyIntroWeek(st,vol,win);
    Object.assign(wk,{index:i,k:i,startDate:win.start,endDate:win.end,phase:p.kind==='charge'?p.block:p.kind,block:p.block,assimilation:p.kind==='assim',
      taper:p.kind==='taper',raceWeek:i===plan.length-1,targetVolume:vol,segK:p.k,segLen:p.segLen});
    wk.ruleRefs=(wk.ruleRefs||[]).concat(['calendar.phaseSequence','calendar.segment','calendar.assimilationAfterLoadWeeks','calendar.maxConsecutiveLoadWeeks','calendar.minSpecificWeeks',...(st.calDist===1?['calendar.specific10k']:[]),'calendar.envelope','calendar.placement','recovery.calendarContext'],
      p.kind==='taper'?['calendar.taper']:p.kind==='intro'?['calendar.introWeekMinDays','calendar.introFooting']:[]);
    const calendarRefs=wk.ruleRefs.slice();
    const placedVolume=w=>w.vol-w.foot.filter(f=>f.unplaced).reduce((sum,f)=>sum+f.min,0)-w.sessions.filter(s=>s.unplaced).reduce((sum,s)=>sum+s.total,0);
    let pl=placeWeek(wk,win,st);
    if(p.kind==='charge')for(let attempt=0;attempt<8&&qualityDurationExceeded(wk.sessions,Math.min(vol,placedVolume(wk)));attempt++){
      const metadata={index:i,k:i,startDate:win.start,endDate:win.end,phase:p.block,block:p.block,assimilation:false,taper:false,raceWeek:false,targetVolume:vol,segK:p.k,segLen:p.segLen};
      for(const key of Object.keys(memory))delete memory[key];Object.assign(memory,JSON.parse(JSON.stringify(priorMemory)));
      wk=rebuild({durationBudget:Math.min(vol,placedVolume(wk)),...(attempt===7?{qualityLimit:0}:{})});Object.assign(wk,metadata);wk.ruleRefs=[...new Set(wk.ruleRefs.concat(calendarRefs))];pl=placeWeek(wk,win,st);
    }
    wk.days=pl.list;wk.warns=wk.warns.concat(pl.warns);
    if(activePlan&&context.hasSameStructure?.(activePlan.structure)){
      const now=new Date(),cut=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      const savedDays=new Map((activePlan.plan?.weeks||[]).flatMap(w=>w.days||[]).map(d=>[planDateKey(d.date),d]));
      if(win.start<=cut){
        memory.fractions=priorFractions;
        const actual=wk.days.flatMap(d=>(d.date<=cut?savedDays.get(planDateKey(d.date))||d:d).items||[]).filter(it=>it.kind==='q').map(it=>it.s);
        rememberFractionDurations(actual,memory);
      }
    }
    /* le volume réel ne compte que les footings placés */
    const lost=wk.foot.filter(f=>f.unplaced).reduce((a,f)=>a+f.min,0)+wk.sessions.filter(x=>x.unplaced).reduce((a,x)=>a+x.total,0);if(lost){wk.vol-=lost;wk.volume=wk.vol;wk.z.z1=Math.max(0,wk.z.z1-lost);}
    weeks.push(wk);});
  return{race:{date:race,distance:st.calDist,goal:st.calGoal,speed:raceSpeed(st,pred)},start,weeks,plan};
}

/* Public accounting uses personalized points. Assembly above deliberately retains
   the historical safety scale for format choice, heavy-week detection and recovery
   placement. No lower displayed score can relax these established guards. */
const PROGRAM_LOAD_MODEL='personal-v1';
function programLoadModel(st){
 const p=st.refTime&&Number.isInteger(st.refDist)&&Number.isInteger(st.profile)?predict(st):null;
 return loadPersonalModel({st,p});
}
function programLoadFactor(speed,st,model=programLoadModel(st)){
 const factor=loadPersonalFactor(speed,model);if(factor!==null)return factor;
 // Explicit fallback to fixed physiological anchors, never to a mixed scale.
 // Above 110% the unvalidated region retains the higher historical safety factor.
 if(speed>st.vma*1.1+1e-8)return Math.max(1.5,loadFactorForSpeed(speed,{...st}));
 const P=model.points.filter(p=>!p.race).sort((a,b)=>a.speed-b.speed);
 if(speed<=P[0].speed)return .2;
 for(let i=1;i<P.length;i++)if(speed<=P[i].speed){const a=P[i-1],b=P[i];return a.factor+(b.factor-a.factor)*(speed-a.speed)/(b.speed-a.speed);}
 return 1.5;
}
function variantLoad(v,s,st,model=programLoadModel(st)){
 const bd=emptyBd();
 for(const [minutes,speed] of v.parts||[])bd[loadZone(speed,st)]+=minutes*programLoadFactor(speed,st,model);
 bd.z1+=((s.wu||0)+(s.cd||0)+(v.rec||0)+(v.easy||0))*.2;
 return{load:sumBd(bd),bd,density:1};
}
function accountSession(s,st,model){
 if(!s)return;
 if(!s.safetyLoad)s.safetyLoad={load:s.load,loadMin:s.loadMin,loadMax:s.loadMax};
 if(s.variants?.length){
  s.variants.forEach(v=>Object.assign(v,variantLoad(v,s,st,model)));
  const sorted=s.variants.slice().sort((a,b)=>a.load-b.load),a=sorted[0],b=sorted.at(-1);
  s.loadMin=a.load;s.loadMax=b.load;s.load=(a.load+b.load)/2;s.loadBreakdown=emptyBd();
  for(const z of Object.keys(s.loadBreakdown))s.loadBreakdown[z]=(a.bd[z]+b.bd[z])/2;
 }else if(s.fam==='race'||s.type==='race'){
  const bd=emptyBd();bd.z1=((s.wu||0)+(s.cd||0))*.2;bd[loadZone(s.targetPace,st)]+=(s.work||s.targetTime/60)*programLoadFactor(s.targetPace,st,model);
  s.load=s.loadMin=s.loadMax=sumBd(bd);s.loadBreakdown=bd;
 }
 s.loadModel=PROGRAM_LOAD_MODEL;
}
function accountEasy(f,st,model){
 const active=f.activeRange||f.range||[0,0],speed=efBand('active',st).reduce((a,b)=>a+b,0)/2,extra=programLoadFactor(speed,st,model)-.2;
 const a=f.min*.2+active[0]*extra,b=f.min*.2+active[1]*extra;
 f.loadMin=Math.min(a,b);f.loadMax=Math.max(a,b);f.load=(a+b)/2;f.loadModel=PROGRAM_LOAD_MODEL;
}
function recalculatePlanLoads(plan,st,options={}){
 if(!plan?.weeks)return plan;
 const model=programLoadModel(st),protectedIds=new Set(options.completedIds||[]),today=options.today||new Date(),cut=planDateKey(today);
 for(const [wi,w] of plan.weeks.entries()){
  const days=w.days||[],protectedWeek=options.preserve&&days.some(d=>planDateKey(d.date)<=cut||(d.items||[]).some(it=>protectedIds.has(it.planifId)));
  if(protectedWeek){
   const previous=options.previous?.weeks?.find(p=>p.startDate&&w.startDate&&planDateKey(p.startDate)===planDateKey(w.startDate));
   if(previous)plan.weeks[wi]=JSON.parse(JSON.stringify(previous),(key,value)=>['date','startDate','endDate'].includes(key)&&typeof value==='string'?new Date(value):value);
   continue;
  }
  const safety=w.safetyLoad||{load:w.load,loadMin:w.loadMin,loadMax:w.loadMax,workLoad:w.workLoad,heavy:w.heavy,costly:w.costly};w.safetyLoad=safety;
  for(const s of w.sessions||[])accountSession(s,st,model);
  for(const f of w.foot||[])accountEasy(f,st,model);
  accountSession(w.race,st,model);
  const sl={min:w.sl||0,activeRange:w.slEA?.range};accountEasy(sl,st,model);
  if(w.slS1){const extra=w.slS1*(programLoadFactor(lt1Ref(st),st,model)-.2);sl.load+=extra;sl.loadMin+=extra;sl.loadMax+=extra;}
  sl.loadBreakdown=emptyBd();sl.loadBreakdown.z2=(w.slS1||0)*programLoadFactor(lt1Ref(st),st,model);sl.loadBreakdown.z1=sl.load-sl.loadBreakdown.z2;
  w.slLoad=sl.load;w.slLoadMin=sl.loadMin;w.slLoadMax=sl.loadMax;
  let entries=[];
  if(days.length){for(const d of days)for(const it of d.items||[]){
   if(it.kind==='q'||it.kind==='race'){accountSession(it.s,st,model);entries.push(it.s);}
   else if(it.kind==='foot'){accountEasy(it.f,st,model);entries.push(it.f);}
   else if(it.kind==='sl'){Object.assign(it,{load:sl.load,loadMin:sl.loadMin,loadMax:sl.loadMax,loadModel:PROGRAM_LOAD_MODEL});entries.push(sl);}
   else if(it.kind==='veille'){it.load=it.loadMin=it.loadMax=it.min*.2;it.loadModel=PROGRAM_LOAD_MODEL;entries.push(it);}
  }}else entries=[...(w.sessions||[]),...(w.foot||[]),sl,...(w.race?[w.race]:[]),...(w.veille?[{load:w.veille*.2,loadMin:w.veille*.2,loadMax:w.veille*.2}]:[])];
  const bd=emptyBd();for(const e of entries){if(e.loadBreakdown)for(const z of Object.keys(bd))bd[z]+=e.loadBreakdown[z];else bd.z1+=e.load;}
  w.loadBreakdown=bd;w.load=sumBd(bd);w.loadMin=entries.reduce((n,e)=>n+(e.loadMin??e.load),0);w.loadMax=entries.reduce((n,e)=>n+(e.loadMax??e.load),0);
  w.workLoad=bd.z2+bd.z3+bd.z4;w.loadModel=PROGRAM_LOAD_MODEL;
  w.loadNotices=[...model.issues.map(s=>s+' Si nécessaire, coefficient recalculé sur les ancrages S1/S2/VMA.'),...(entries.some(e=>(e.variants||[]).some(v=>(v.parts||[]).some(([,v])=>v>st.vma*1.1+1e-8)))?['Au-delà de 110 % VMA : coefficient historique de prudence, hors modèle personnalisé.']:[])];
 }
 plan.loadModel=PROGRAM_LOAD_MODEL;return plan;
}
/* Reconcile reporting against placed workouts, independently of scheduling guards.
   This changes accounting fields only; callers archive before persisting it. */
function recalculatePlanSummary(plan,st){
 recalculatePlanLoads(plan,st);
 for(const w of plan.weeks||[]){
  const items=w.days?.length?w.days.flatMap(d=>d.items||[]):[
   ...(w.sessions||[]).filter(s=>!s.unplaced).map(s=>({kind:'q',s})),
   ...(w.foot||[]).filter(f=>!f.unplaced).map(f=>({kind:'foot',f})),
   ...(w.sl?[{kind:'sl'}]:[]),...(w.race?[{kind:'race',s:w.race}]:[]),...(w.veille?[{kind:'veille',min:w.veille}]:[])];
  let volume=0,quality=0;
  for(const it of items){
   if(it.kind==='q'||it.kind==='race'){
    const s=it.s,v=s.variants?.[0];
    volume+=s.total??s.duration??((s.wu||0)+(v?.total||0)+(s.cd||0));
    quality+=v?(v.parts?.length?v.parts.reduce((n,[m])=>n+m,0):(v.work||0)):(s.work||0);
   }else if(it.kind==='foot')volume+=it.f.min||0;
   else if(it.kind==='sl'){volume+=w.sl||0;quality+=w.slS1||0;}
   else if(it.kind==='veille')volume+=it.min||0;
  }
  w.vol=w.volume=volume;w.qualityMinutes=quality;w.pct=w.qualityPct=volume?quality/volume*100:0;
  w.summaryVersion=2;
 }
 plan.summaryVersion=2;return plan;
}
function withLoad(s,st){const out=withSafetyLoad(s,st);accountSession(out,st,programLoadModel(st));return out;}
function buildWeek(B,st,o){return recalculatePlanLoads({weeks:[buildSafetyWeek(B,st,o)]},st).weeks[0];}
function buildPlan(st,pred){return recalculatePlanLoads(buildSafetyPlan(st,pred),st);}
function buildCalendar(st,pred){return recalculatePlanLoads(buildSafetyCalendar(st,pred),st);}
function buildTaperWeek(st,pred,vol){return recalculatePlanLoads({weeks:[buildSafetyTaperWeek(st,pred,vol)]},st).weeks[0];}
function buildIntroWeek(st,vol,win){return recalculatePlanLoads({weeks:[buildSafetyIntroWeek(st,vol,win)]},st).weeks[0];}

/* ===================== Présentateurs (v8.1) =====================
   Le moteur décrit les séances en données (structure, intensity, cues) ; le texte est construit ici. */
const SHAPE_NAME={pyramid:'Pyramide',descending:'Dégressif',progressive:'Progressif'};
const REC_TYPE={trot:'trot',active_trot:'trot actif',free:'libre'};
const CUE_TEXT={s2_dense:'S2 dense : la récup courte compte autant que l\'allure',s2_to_race_no_recovery:'Passer de S2 à l\'allure de course sans récupération',
  effort_vma:'Effort ressenti proche de la VMA',effort_pace10k:'Effort ressenti proche de l\'allure 10 km',dynamic_stride:'Foulée dynamique, buste droit',relaxed_top:'Relâché en haut de côte'};
const minLab=d=>d+"'";
function presentVariantRaw(v){
  const S=v.structure,I=v.intensity||{},f=v.fam||'';
  const recVal=S.recoveryRangeMin&&S.recoveryRangeMin[0]!==S.recoveryRangeMin[1]?`${fmtRec(S.recoveryRangeMin[0])}–${fmtRec(S.recoveryRangeMin[1])}`:fmtRec(S.recoveryMin);
  const rec=S.recoveryMin!==undefined&&S.recoveryType?`, récup ${recVal} ${REC_TYPE[S.recoveryType]}`:'';
  const repChip=()=>`${fmtRep(S.repDurationMin)} par fraction`;
  const meters=()=>`≈ ${Math.round((I.minKmh+I.maxKmh)/2*S.durationMin/60*100)*10} m par fraction`;
  const pct=()=>[kmh(I.minKmh,I.maxKmh),`${fmtPct(I.minPct)} à ${fmtPct(I.maxPct)} % VMA`];
  const cues=(v.cues||[]).map(c=>CUE_TEXT[c]);
  const sr=()=>kmh(I.minKmh,I.maxKmh);
  const sec=f.split('.')[0];
  if(f==='spec.legacy'){const d=S.distanceM>=1000?`${fmtKm(S.distanceM/1000)} km`:`${S.distanceM} m`;
    return{text:`${S.reps} × ${d}, récup ${fmtMin(S.recoveryMin)} trot`,chips:[`Allure ${I.race}`,kmh(I.refKmh,I.refKmh),`${fmtTime(S.repDurationMin*60)} par fraction`]};}
  if(f==='spec.marathonLong')return{text:S.reps?`Sortie longue : ${S.easyMin}' EF puis ${S.reps} × ${fmtKm(S.distanceKm)} km à allure marathon, ${S.easyBetweenKm} km EF entre, ${fmtRec(S.cooldownMin)} au calme`
      :`Sortie longue : ${S.easyMin}' EF puis ${fmtKm(S.distanceKm)} km à allure marathon, ${fmtRec(S.cooldownMin)} au calme`,chips:['Allure marathon',kmh(I.refKmh,I.refKmh)]};
  if(sec==='fartlek'){
    if(S.type==='fartlek_structured')return{text:S.reps+' × '+fmtMin(S.durationMin)+' d’accélération au ressenti, récup '+fmtRec(S.recoveryMin)+' en footing facile',chips:['Sans cible d’allure','Ressenti : '+I.target]};
    return{text:'Fartlek libre : environ '+Math.round(S.workMin)+' min d’accélérations cumulées, efforts de '+S.rangeSec[0]+' s à '+Math.round(S.rangeSec[1]/60)+' min selon le terrain, récup en footing facile',chips:['Sans cible d’allure','Ressenti variable : vif sur court, contrôlé sur long']};
  }
  if(sec==='hills')return{text:`${S.reps} × ${fmtRec(S.durationMin)} en côte (${S.gradePct[0]} à ${S.gradePct[1]} %), récup descente au trot, puis ${S.sprints.reps} × ${S.sprints.seconds}" de sprint en côte, récup complète`,chips:cues};
  if(f==='taper')return S.distanceM?{text:`${S.reps} × ${S.distanceM} m à allure ${I.race}, récup ${fmtRec(S.recoveryMin)} trot`,chips:[kmh(I.refKmh,I.refKmh),repChip()]}
      :{text:`${S.reps} × ${fmtMin(S.durationMin)} à allure ${I.race}, récup ${fmtRec(S.recoveryMin)} trot`,chips:[kmh(I.refKmh,I.refKmh)]};
  if(sec==='s1'){
    if(f==='s1.dist')return{text:`${S.reps} × ${S.distanceM} m${rec}`,chips:[sr(),repChip()]};
    if(f==='s1.cont')return{text:`${S.durationMin}' continu au S1`,chips:[sr()]};
    if(f==='s1.progCont'){const[a,b,c]=I.speedsKmh;return{text:`${S.durationMin}' progressif, du S1 bas au S1 haut par tiers`,chips:[`1er tiers : ${kmh(a,a)}`,`2e tiers : ${kmh(b,b)}`,`3e tiers : ${kmh(c,c)}`]};}
    if(f==='s1.progFrac')return{text:`${S.reps} × ${S.durationMin}' de plus en plus vite${rec}`,chips:[`Début : ${kmh(I.fromKmh,I.fromKmh)}`,`Fin : ${kmh(I.toKmh,I.toKmh)}`]};
    if(S.type==='ladder')return{text:`${SHAPE_NAME[S.shape]} : ${S.durationsMin.map(minLab).join(' – ')}, récup libre de ${fmtRec(S.recoveryRangeMin[0])} à ${fmtRec(S.recoveryRangeMin[1])} selon la fraction`,
      chips:I.type==='progression_range'?[`Fractions longues : ${kmh(I.fromKmh,I.fromKmh)}`,`Fractions courtes : ${kmh(I.toKmh,I.toKmh)}`]:[sr()]};
    if(S.type==='sets'){const rf=S.recoveryBetweenFractionsRangeMin||[S.recoveryBetweenFractionsMin,S.recoveryBetweenFractionsMin],rs=S.recoveryBetweenSetsRangeMin||[S.recoveryBetweenSetsMin,S.recoveryBetweenSetsMin];
      return{text:`${S.sets} × (${S.durationsMin[0]}' + ${S.durationsMin[1]}'), récup libre ${fmtRec(rf[0])}–${fmtRec(rf[1])} entre fractions, ${fmtRec(rs[0])}–${fmtRec(rs[1])} entre séries`,chips:[sr()]};}
    return{text:`${S.reps} × ${S.durationMin}'${rec}`,chips:[sr()]};
  }
  if(sec==='s2'){
    const bands=()=>I.bands.length>1?I.bands.map(b=>`${b.durationsMin.map(minLab).join(', ')} : ${kmh(b.minKmh,b.maxKmh)}`):[kmh(I.bands[0].minKmh,I.bands[0].maxKmh)];
    if(S.distanceM)return{text:`${S.reps} × ${S.distanceM} m${rec}`,chips:[sr(),repChip()].concat(cues)};
    if(S.type==='ladder')return{text:`${SHAPE_NAME[S.shape]} : ${S.durationsMin.map(minLab).join(' – ')}, récup libre de ${fmtRec(S.recoveryRangeMin[0])} à ${fmtRec(S.recoveryRangeMin[1])} selon la fraction précédente`,chips:bands()};
    if(S.type==='sets'){const rf=S.recoveryBetweenFractionsRangeMin||[S.recoveryBetweenFractionsMin,S.recoveryBetweenFractionsMin],rs=S.recoveryBetweenSetsRangeMin||[S.recoveryBetweenSetsMin,S.recoveryBetweenSetsMin];
      return{text:`${S.sets} × (${S.durationsMin[0]}' + ${S.durationsMin[1]}'), récup libre ${fmtRec(rf[0])}–${fmtRec(rf[1])} entre fractions, ${fmtRec(rs[0])}–${fmtRec(rs[1])} entre séries`,chips:bands()};}
    return{text:`${S.reps} × ${S.durationMin}'${rec}`,chips:[sr()]};
  }
  if(sec==='vo2'){
    if(S.type==='intermittent'){const rlab=S.recoveryRangeMin?`${fmtRec(S.recoveryRangeMin[0])}–${fmtRec(S.recoveryRangeMin[1])}`:fmtRec(S.recoveryMin),lab=`${fmtRec(S.workMin)}/${rlab}`;
      return{text:S.sets?`${S.sets} × (${S.perSet} × ${lab}), ${fmtRec(S.recoveryBetweenSetsRangeMin?.[0]||S.recoveryBetweenSetsMin)}–${fmtRec(S.recoveryBetweenSetsRangeMin?.[1]||S.recoveryBetweenSetsMin)} libre entre séries`:`${S.reps} × ${lab} libre`,chips:pct()};}
    if(S.type==='ladder')return{text:`Pyramide : ${S.durationsMin.map(minLab).join(' – ')}, récup libre de ${fmtRec(S.recoveryRangeMin[0])} à ${fmtRec(S.recoveryRangeMin[1])}`,
      chips:[`${I.shortest.durationMin}' : ${kmh(I.shortest.maxKmh,I.shortest.maxKmh)}`,`${I.longest.durationMin}' : ${kmh(I.longest.minKmh,I.longest.minKmh)}`]};
    if(S.distanceM){const rr=S.recoveryRangeMin||[S.recoveryMin,S.recoveryMin],rs=S.recoveryBetweenSetsRangeMin||[S.recoveryBetweenSetsMin,S.recoveryBetweenSetsMin];
      return{text:S.sets?`${S.sets} × (${S.perSet} × ${S.distanceM} m), récup libre ${fmtRec(rr[0])}–${fmtRec(rr[1])}, ${fmtRec(rs[0])}–${fmtRec(rs[1])} entre séries`:`${S.reps} × ${S.distanceM} m${rec}`,chips:pct().concat([repChip()])};}
    return{text:`${S.reps} × ${fmtMin(S.durationMin)}${rec}`,chips:pct().concat([meters()])};
  }
  if(sec==='mixed'){
    const blocks=S.components.map(c=>({label:mixedComponentLabel(c.fam),display:presentVariantRaw(c.variant)}));
    const parts=blocks.map(c=>`${c.label} : ${c.display.text.split(', ')[0]}`);
    const details=blocks.map(c=>{const i=c.display.text.indexOf(', ');return i>=0?`${c.label} : ${c.display.text.slice(i+2)}`:null;}).filter(Boolean);
    const rb=S.recoveryBetweenBlocksRangeMin;
    return{text:`${parts.join(' — ')}, récup ${fmtRec(rb[0])}–${fmtRec(rb[1])} libre entre blocs${details.length?'. '+details.join(' ; '):''}`,
      chips:blocks.flatMap(c=>c.display.chips.map(chip=>`${c.label} : ${chip}`))};
  }
  if(sec==='p10'){
    if(f==='p10.alternating')return{text:`${S.sets} × (400 m S1 + 400 m AS10) en continu, sans récupération`,
      chips:[`S1 légèrement au-dessus du LT1 : ${kmh(I.s1Kmh,I.s1Kmh)}`,`AS10 : ${kmh(I.raceKmh,I.raceKmh)}`,`${fmtTime(v.work*60)} de travail continu`]};
    if(f==='p10.mix'){const[a,b]=S.segments;return{text:`${S.sets} × (${fmtM(a.distanceM)} à S2 enchaînés avec ${fmtM(b.distanceM)} à allure 10 km), ${fmtRec(S.recoveryBetweenSetsMin)} trot entre séries`,
      chips:[`S2 : ${kmh(I.s2Kmh,I.s2Kmh)}`,`10 km : ${kmh(I.raceKmh,I.raceKmh)}`].concat(cues)};}
    if(f==='p10.blocs')return{text:`${S.sets} × (${fmtM(S.distancesM[0])} + ${fmtM(S.distancesM[1])}), ${fmtRec(S.recoveryBetweenFractionsMin)} trot entre les deux, ${fmtRec(S.recoveryBetweenSetsMin)} entre séries`,chips:[`Allure 10 km : ${kmh(I.refKmh,I.refKmh)}`]};
    if(S.type==='ladder')return{text:`${SHAPE_NAME[S.shape]} : ${S.distancesM.map(fmtM).join(' – ')}, récup trot de ${fmtRec(S.recoveryRangeMin[0])} à ${fmtRec(S.recoveryRangeMin[1])} selon la fraction précédente`,
      chips:['Allure 10 km : un peu plus vite sur les fractions courtes, un peu moins vite sur les longues',`${kmh(I.refKmh,I.refKmh)} en référence`]};
    if(S.distanceM)return{text:`${S.reps} × ${fmtM(S.distanceM)}${rec}`,chips:[lab10(I.minKmh,I.maxKmh,I.refKmh),sr(),repChip()]};
    return{text:`${S.reps} × ${S.durationMin}'${rec}`,chips:[lab10(I.minKmh,I.maxKmh,I.refKmh),sr(),meters()]};
  }
  return{text:'',chips:[]};
}
const SESSION_TITLE={alternating:'Alternance continue S1 / AS10',vma:'VO₂max, puissance aérobie',vmaShort:'Rappel VO₂ (intermittent court)',s2:'Second seuil',s1:'Premier seuil',fartlek:'Fartlek',mixed:'Séance mixte',hills:'Côtes et économie'};
function sessionTitle(x){
  if(x.fam==='spec')return x.isLong?'Sortie longue spécifique marathon':`Allure spécifique ${DIST[x.dist].lab}`;
  if(x.fam==='taper')return`Rappel d'allure ${DIST[x.dist].lab}`;
  if(x.fam==='race')return`Course ${DIST[x.dist].lab}`;
  return SESSION_TITLE[x.fam];
}
const PURPOSE={
  alternating:'Séance clé continue : alterner 400 m légèrement au-dessus du premier seuil et 400 m à allure 10 km, sans récupération. Toutes les portions comptent dans le travail de qualité.',
  vma:'Puissance aérobie : accumuler du temps près de VO₂max.',
  vmaShort:'Rappel VO₂ en intermittent court, sans grosse fatigue.',
  s2:'Endurance à haute fraction aérobie. La fourchette d\'allure dépend de la durée des fractions et du volume total.',
  s1:'Capacité aérobie : travailler légèrement au-dessus du LT1 pour développer ce secteur par le haut, avec une récupération courte et libre.',
  fartlek:'Qualité du bloc aérobie : varier l’effort au ressenti, sans cible chronométrique, avec récupération en footing facile.',
  mixed:'Combiner deux qualités à volume réduit pour une transition, un rappel ou une semaine d’assimilation.',
  spec:'Rythme, économie et confiance à l\'allure de course.',
  hills:'Force spécifique et économie de course.',
  taper:'Garder le rythme sans créer de fatigue, 2 à 4 jours avant la course.'
};
const sessionPurpose=x=>PURPOSE[x.fam];

return {RULES,DIST,PROFILES,MEASURED,ZONES,num,clamp,r5,parseTime,parseHM,fmtPace,paceRange,fmtSpd,fmtFootDur,fmtDur,fmtTime,fmtMin,fmtKm,snapshotPlan,planDateKey,preservePastSessions,applyReferenceIntensities,ensurePlanifSessionIds,findPlanifSession,applyPlanifMoves,planifMoveCheck,referenceErrors,inputErrors,maxQualityForRuns,predict,stepFor,profileLabel,suggestProfile,TOL,pickBest,byProgress,fmtPct,SECTOR_INFO,fmtRec,r15,fmtRep,kmh,paceHtml,s2Group,s2Range,lt1Ref,efPctBand,efBand,efBandText,footColor,s1Margin,s1Band,vo2Pct,vo2WorkRange,vo2Band,rangeLookup,rangeMid,recS1Range,recS1,recS2Range,recS2,recVO2Range,recVO2,seriesSplit,cand,s1Dist,s1Time,s1Cont,s1ProgCont,s1ProgFrac,s1Shape,s1Mix,s2Dist,s2Time,s2Mixed,s2Shape,s2Blocs,vo2Int,vo2Dist,vo2Time,vo2Pyr,p10Band,rec10,sgnPct,lab10,fmtM,p10Dist,p10Time,p10Seq,p10Blocs,p10Mix,p10Alternating,makeAlternatingSession,maxFractionMinutes,minFractionMinutes,SESSION_LIBRARY,FAMILY_RULES,CAP_RULE,variantRuleRefs,hash01,candLoad,fractionProgressionPool,rememberFractionDurations,generateSession,recFor,specVariant,specificWorkLimit,specificOptions,marathonOptions,hillStruct,hillsSession,fartlekSession,zoneForSpeed,makeSessionCore,SECTOR_OF,volumeFactor,capFor,capsFor,loadDurationFactor,loadPersonalModel,loadPersonalFactor,programLoadFactor,recalculatePlanLoads,recalculatePlanSummary,loadPoints,loadFactorForSpeed,densityFactor,loadZone,emptyBd,sumBd,preparationActivation,prepareSession,variantLoad,checkCaps,withLoad,sessionKey,makeSession,mixedSector,mixedKey,mixedCfg,mixedCandidates,mixedComponentLabel,makeMixedSession,FOOT,activeBlockLabel,joggTitle,planFootings,activeEnduranceRange,canUseActiveEndurance,applyActiveEndurance,BLOCKS,SPEC,getBlock,volumes,roundW,buildWeek,buildAssimilationWeek,buildPlan,DAY,parseDate,addDays,dayDiff,wd,fmtD,fmtDs,PHASE_LAB,PHASE_C,phaseLab,phaseTypes,tiePref,countWeeks,layoutSegments,planPhases,calendarVolumes,raceSpeed,buildTaperWeek,buildIntroWeek,placeWeek,buildCalendar,SHAPE_NAME,REC_TYPE,CUE_TEXT,minLab,presentVariantRaw,SESSION_TITLE,sessionTitle,PURPOSE,sessionPurpose};
}
return {...createEngine(),createEngine};
});
