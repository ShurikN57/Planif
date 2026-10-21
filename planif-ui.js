/* Interface and local plan persistence; calculations are provided by PlanifEngine. */
globalThis.PlanifEvidence.load('./planif-studies.json?v=2026.10.21.09').then(function(evidence){
(function(){
const $=id=>document.getElementById(id);
$('f').addEventListener('submit',e=>e.preventDefault());
const {DIST,PROFILES,MEASURED,ZONES,num,clamp,r5,parseTime,parseHM,fmtPace,paceRange,fmtSpd,fmtFootDur,fmtDur,fmtTime,fmtMin,fmtKm,snapshotPlan,planDateKey,preservePastSessions,applyReferenceIntensities,ensurePlanifSessionIds,findPlanifSession,applyPlanifMoves,planifMoveCheck,referenceErrors,inputErrors,maxQualityForRuns,predict,stepFor,profileLabel,suggestProfile,TOL,pickBest,byProgress,fmtPct,SECTOR_INFO,fmtRec,r15,fmtRep,kmh,paceHtml,s2Group,s2Range,lt1Ref,efPctBand,efBand,efBandText,footColor,s1Margin,s1Band,vo2Pct,vo2WorkRange,vo2Band,rangeLookup,rangeMid,recS1Range,recS1,recS2Range,recS2,recVO2Range,recVO2,seriesSplit,cand,s1Dist,s1Time,s1Cont,s1ProgCont,s1ProgFrac,s1Shape,s1Mix,s2Dist,s2Time,s2Mixed,s2Shape,s2Blocs,vo2Int,vo2Dist,vo2Time,vo2Pyr,p10Band,rec10,sgnPct,lab10,fmtM,p10Dist,p10Time,p10Seq,p10Blocs,p10Mix,p10Alternating,makeAlternatingSession,maxFractionMinutes,minFractionMinutes,SESSION_LIBRARY,FAMILY_RULES,CAP_RULE,variantRuleRefs,hash01,candLoad,fractionProgressionPool,rememberFractionDurations,generateSession,recFor,specVariant,specificWorkLimit,specificOptions,marathonOptions,hillStruct,hillsSession,fartlekSession,zoneForSpeed,makeSessionCore,SECTOR_OF,volumeFactor,capFor,capsFor,loadDurationFactor,loadPersonalModel,loadPersonalFactor,programLoadFactor,recalculatePlanLoads,recalculatePlanSummary,loadPoints,loadFactorForSpeed,densityFactor,loadZone,emptyBd,sumBd,preparationActivation,prepareSession,variantLoad,checkCaps,withLoad,sessionKey,makeSession,mixedSector,mixedKey,mixedCfg,mixedCandidates,mixedComponentLabel,makeMixedSession,FOOT,activeBlockLabel,joggTitle,planFootings,activeEnduranceRange,canUseActiveEndurance,applyActiveEndurance,BLOCKS,SPEC,getBlock,volumes,roundW,buildWeek,buildAssimilationWeek,buildPlan,DAY,parseDate,addDays,dayDiff,wd,fmtD,fmtDs,PHASE_LAB,PHASE_C,phaseLab,phaseTypes,tiePref,countWeeks,layoutSegments,planPhases,calendarVolumes,raceSpeed,buildTaperWeek,buildIntroWeek,placeWeek,buildCalendar,SHAPE_NAME,REC_TYPE,CUE_TEXT,minLab,presentVariantRaw,SESSION_TITLE,sessionTitle,PURPOSE,sessionPurpose,RULES}=globalThis.PlanifEngine.createEngine({getActivePlan:()=>activePlan,hasSameStructure:s=>sameStructure(calendarStructure(),s),getCompletedIds:()=>globalThis.PlanifStrava?.completedIds?.()||[]});
const {EVIDENCE_ENUMS,QUESTIONS,SOURCES,CONTEXT_SOURCE_IDS,sourceScope,scopeLabel,FINDINGS,RULE_META,TECHNICAL_RULES,refPathExists,auditIntegrity}=evidence;
PROFILES.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.lab;if(i===2)o.selected=true;$('profile').appendChild(o);});
{const o=document.createElement('option');o.value=MEASURED;o.textContent='Mesuré';$('profile').appendChild(o);}
/* ---------- état ---------- */
const IDS=['vma','s2','s1lo','s1hi','lt1Hr','hrMin','lt2Hr','hrMax','refDist','refTime','profile','penalty','ref2Dist','ref2Time','block','specDist','specGoal','weeks','vol','runs','qualityCount','assimQ2','modeBloc','modeCal','calStart','calRace','calDist','calGoal','av0','av1','av2','av3','av4','av5','av6','q1Day','q2Day','q3Day','slDay'];
const isCheck=el=>el.type==='checkbox'||el.type==='radio';
/* jours (sélecteurs) et dates par défaut : début aujourd'hui, course un dimanche environ 12 semaines plus tard */
['q1Day','q2Day','q3Day','slDay'].forEach(id=>{const sel=$(id);[['','Auto'],...['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map((x,i)=>[String(i),x])].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;sel.appendChild(o);});});
{const t=new Date(),iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const r=new Date(t.getFullYear(),t.getMonth(),t.getDate()+83);while(r.getDay()!==0)r.setDate(r.getDate()+1);$('calStart').value=iso(t);$('calRace').value=iso(r);}
const KEY='calc-allures-v7'; /* migration historique */
const STORE={
  global:'planif-global-v1',
  block:'planif-block-draft-v1',
  calendar:'planif-calendar-draft-v1',
  active:'planif-active-plan-v1',
  history:'planif-plan-history-v1',
  mode:'planif-mode-v1'
};
const GLOBAL_IDS=['vma','s2','s1lo','s1hi','lt1Hr','hrMin','lt2Hr','hrMax','refDist','refTime','profile','penalty','ref2Dist','ref2Time'];
const BLOCK_IDS=['block','specDist','specGoal','weeks','vol','runs','qualityCount','assimQ2'];
const CAL_IDS=['calStart','calRace','calDist','calGoal','vol','runs','qualityCount','av0','av1','av2','av3','av4','av5','av6','q1Day','q2Day','q3Day','slDay'];
const STRUCT_IDS=['calDist','calRace','calStart','runs','vol','qualityCount','q1Day','q2Day','q3Day','slDay','av0','av1','av2','av3','av4','av5','av6'];
const DEFAULTS={};
IDS.forEach(id=>{const el=$(id);DEFAULTS[id]=isCheck(el)?el.checked:el.value;});
const getJson=(k,f=null)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f;}catch(_){return f;}};
const putJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(error){
  console.warn('Planif : enregistrement local impossible.',error?.name||'Erreur');
  let notice=$('storageIssue');if(!notice&&document.body?.append){notice=document.createElement('p');notice.id='storageIssue';notice.className='card';notice.setAttribute('role','alert');document.body.prepend(notice);}
  if(notice)notice.textContent='Enregistrement local indisponible. Garde cette page ouverte et copie ton plan avant de la fermer.';
  return false;
}};
const captureIds=ids=>{const d={};ids.forEach(id=>{const el=$(id);d[id]=isCheck(el)?el.checked:el.value;});return d;};
const applyIds=(d,ids)=>{if(!d)return;ids.forEach(id=>{if(d[id]===undefined)return;const el=$(id);if(isCheck(el))el.checked=!!d[id];else el.value=d[id];});};
let CURRENT_MODE='bloc',activePlan=null,planHistory=[],structureEditing=false;

const RECOVERY_BACKUP='planif-recovery-before-2026101706';
const RECOVERY_STATE='planif-recovery-state-v1';
let recoveryState=null;
function validSavedPlan(p){return !!(p?.id&&p.structure&&p.plan?.race&&p.plan?.weeks?.length&&p.plan.weeks.every(w=>Array.isArray(w.days)));}
function protectPlanRecovery(){
  const existing=getJson(STORE.active);
  if(!validSavedPlan(existing))return;
  // Keep the original storage strings, once only, before load/render can write.
  if(!localStorage.getItem(RECOVERY_BACKUP)){
    const backup={savedAt:new Date().toISOString(),values:{}};
    for(const key of Object.values(STORE))backup.values[key]=localStorage.getItem(key);
    localStorage.setItem(RECOVERY_BACKUP,JSON.stringify(backup));
  }
  const savedRecovery=getJson(RECOVERY_STATE);
  recoveryState=savedRecovery?.id===existing.id&&['pending','restored'].includes(savedRecovery.status)?savedRecovery:null;
  const globals=getJson(STORE.global,{});
  const reset=GLOBAL_IDS.every(id=>String(globals[id]??'')===String(DEFAULTS[id]??''));
  if(!recoveryState&&reset&&!(savedRecovery?.id===existing.id&&savedRecovery.status==='resumed')){recoveryState={id:existing.id,status:'pending'};localStorage.setItem(RECOVERY_STATE,JSON.stringify(recoveryState));}
}
function reviveSavedPlan(plan){
  return JSON.parse(JSON.stringify(plan),(key,value)=>['date','start','startDate','endDate'].includes(key)&&typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)?new Date(value):value);
}
function recoveryHtml(){
  if(!recoveryState)return '';
  return '<div class="card"><h2>'+ (recoveryState.status==='pending'?'Plan sauvegardé retrouvé':'Plan récupéré · séances conservées')+'</h2><p>Une copie de sécurité a été conservée sur cet appareil. Les séances enregistrées ne sont pas recalculées.</p><p>Les valeurs de physiologie et les chronos actuels peuvent différer de ceux de ce plan. Vérifie-les dans Repères avant de reprendre les calculs. Les allures complémentaires dépendant de ces valeurs restent à vérifier.</p>'+
    (recoveryState.status==='pending'?'<button type="button" class="cta" data-recovery="restore">Récupérer mon plan sauvegardé</button>':'<button type="button" class="cta ghost" data-goto="ref">Vérifier mes repères</button><button type="button" class="cta ghost" data-recovery="resume">Reprendre les calculs avec mes repères</button>')+'</div>';
}
function recoverSavedPlan(){
  if(!validSavedPlan(activePlan))return;
  recoveryState={id:activePlan.id,status:'restored'};
  localStorage.setItem(RECOVERY_STATE,JSON.stringify(recoveryState));
  restoreActiveStructure();$('calGoal').value=activePlan.plan.race.goal?fmtTime(activePlan.plan.race.goal):'';CURRENT_MODE='cal';$('modeCal').checked=true;$('modeBloc').checked=false;
  localStorage.setItem(STORE.mode,'cal');
  render();setBuilt=false;appTab='cal';renderApp();
}
function loadModeState(mode){
  applyIds(getJson(mode==='cal'?STORE.calendar:STORE.block,null),mode==='cal'?CAL_IDS:BLOCK_IDS);
}
function saveModeState(mode){
  putJson(mode==='cal'?STORE.calendar:STORE.block,captureIds(mode==='cal'?CAL_IDS:BLOCK_IDS));
}
function switchModeState(mode){
  if(mode===CURRENT_MODE){$('modeCal').checked=mode==='cal';$('modeBloc').checked=mode==='bloc';return;}
  saveModeState(CURRENT_MODE);
  CURRENT_MODE=mode;
  $('modeCal').checked=mode==='cal';$('modeBloc').checked=mode==='bloc';
  loadModeState(mode);
  try{localStorage.setItem(STORE.mode,mode);}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}
  syncQualityPrereqs();
}
function load(){
  protectPlanRecovery();
  const legacy=getJson(KEY,null);
  if(legacy&&!getJson(STORE.global,null)){
    applyIds(legacy,IDS);
    putJson(STORE.global,captureIds(GLOBAL_IDS));
    putJson(STORE.block,captureIds(BLOCK_IDS));
    putJson(STORE.calendar,captureIds(CAL_IDS));
    try{localStorage.setItem(STORE.mode,legacy.modeCal?'cal':'bloc');}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}
  }
  applyIds(getJson(STORE.global,null),GLOBAL_IDS);
  CURRENT_MODE=localStorage.getItem(STORE.mode)||'bloc';
  $('modeCal').checked=CURRENT_MODE==='cal';$('modeBloc').checked=CURRENT_MODE==='bloc';
  loadModeState(CURRENT_MODE);
  activePlan=getJson(STORE.active,null);
  refPlanPending=refPendingLoad();
  planHistory=getJson(STORE.history,[])||[];
  const migrationKey='planif-weekly-balance-v2';
  if(validSavedPlan(activePlan)&&!localStorage.getItem(migrationKey)){
    const archived={...snapshotPlan(activePlan),archivedAt:new Date().toISOString(),archiveReason:'avant ajustement du volume hebdomadaire'};
    localStorage.setItem(STORE.history,JSON.stringify([archived,...planHistory]));
    planHistory=[archived,...planHistory];localStorage.setItem(migrationKey,'saved');
  }
}
function save(){
  if(refDraft)return;
  if(recoveryState?.status==='pending'||inputErrors(readState()).length)return;
  putJson(STORE.global,captureIds(GLOBAL_IDS));
  saveModeState(CURRENT_MODE);
  try{localStorage.setItem(STORE.mode,CURRENT_MODE);}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}
}
function calendarStructure(){
  return captureIds(STRUCT_IDS);
}
function sameStructure(a,b){return JSON.stringify(a||{})===JSON.stringify(b||{});}
function planTitle(st){return `${DIST[st.calDist].lab} · ${st.calRace||'sans date'}`;}



function archiveActivePlan(reason){
  if(!activePlan)return;
  planHistory.unshift({...activePlan,archivedAt:new Date().toISOString(),archiveReason:reason||'remplacé'});
  planHistory=planHistory.slice(0,20);
  putJson(STORE.history,planHistory);
}
/* Identifiants de séance indépendants des allures et de l'option choisie. */




function saveActivePlan(st,C,forceNew=false){
  if(recoveryState||!C||C.error||st.mode!=='cal'||inputErrors(st).length)return;
  ensurePlanifSessionIds(C);
  const structure=calendarStructure();
  if(!activePlan||forceNew){
    activePlan={id:'plan-'+Date.now(),title:planTitle(st),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),structure,plan:snapshotPlan(C)};
  }else{
    activePlan={...activePlan,title:planTitle(st),updatedAt:new Date().toISOString(),structure:activePlan.structure||structure,plan:snapshotPlan(C)};
  }
  putJson(STORE.active,activePlan);
  document.dispatchEvent?.(new CustomEvent('planif-plan-change'));
}
function restoreActiveStructure(){
  if(activePlan&&activePlan.structure){applyIds(activePlan.structure,STRUCT_IDS);saveModeState('cal');}
}
$('modeBloc').addEventListener('change',()=>{if($('modeBloc').checked)switchModeState('bloc');});
$('modeCal').addEventListener('change',()=>{if($('modeCal').checked)switchModeState('cal');});



function inputErrorHtml(){
  const errors=inputErrors(readState());if(!errors.length)return '';
  return '<div class="card" role="alert"><h2>Paramètres à corriger</h2><p>'+errors.join('<br>')+'</p><p>Le recalcul est suspendu. Le dernier plan valide reste conservé.</p><button type="button" class="cta ghost" data-goto="ref">Ouvrir les repères</button><button type="button" class="cta ghost" data-goto="set">Ouvrir les réglages</button></div>';
}
function readState(){
  return{mode:$('modeCal').checked?'cal':'bloc',calStart:$('calStart').value,calRace:$('calRace').value,calDist:+$('calDist').value,calGoal:parseTime($('calGoal').value),
    avail:[0,1,2,3,4,5,6].map(i=>$('av'+i).checked),q1Day:$('q1Day').value,q2Day:$('q2Day').value,q3Day:$('q3Day').value,slDay:$('slDay').value,vma:num($('vma').value),s2:num($('s2').value),s1lo:num($('s1lo').value),s1hi:num($('s1hi').value),lt1Hr:globalThis.PlanifStrava?.heartRateZones?.()?.z1Max??num($('lt1Hr').value),lt2Hr:globalThis.PlanifStrava?.heartRateZones?.()?.z4Max??num($('lt2Hr').value),
    refDist:+$('refDist').value,refTime:parseTime($('refTime').value),profile:+$('profile').value,penalty:$('penalty').checked,
    ref2Dist:+$('ref2Dist').value,ref2Time:parseTime($('ref2Time').value),
    block:$('block').value,specDist:+$('specDist').value,specGoal:parseTime($('specGoal').value),
    N:+$('weeks').value,vol:parseHM($('vol').value),runs:+$('runs').value,qualityCount:+$('qualityCount').value,assimQ2:$('assimQ2').checked};
}


function qualityAdvice(runs,q){
  const R=RULES.organization.qualityFrequency;
  if(q===3)return runs>=R.recommendedRuns[3]?'3 qualités : possible avec 6 sorties ou plus ; la 3e reste allégée.':'3 qualités nécessitent au moins 6 sorties par semaine.';
  if(q===2)return runs>=R.recommendedRuns[2]?'2 qualités : format recommandé à ce niveau de fréquence.':runs>=R.minRuns[2]?'2 qualités : possible avec 4 sorties, mais plus exigeant.':'2 qualités nécessitent au moins 4 sorties par semaine.';
  return'1 qualité : compatible avec 3 sorties ou plus.';
}
function syncQualityPrereqs(){
  const runs=+$('runs').value,sel=$('qualityCount'),max=maxQualityForRuns(runs);
  [...sel.options].forEach(o=>{o.disabled=+o.value>max;});
  if(+sel.value>max)sel.value=String(max);
  const h=$('qualityHint');if(h)h.textContent=qualityAdvice(runs,+sel.value);
}

const CAPLAB={s1:`${RULES.safeguards.caps.s1}' au S1`,s2:`${RULES.safeguards.caps.s2}' au S2`,vo2:`${RULES.safeguards.caps.vo2}' en VO₂max`,above105:`${RULES.safeguards.caps.above105}' au-dessus de ${Math.round(RULES.safeguards.above105OfVma*100)} % VMA`,spec10k:`${RULES.spec10k.workCap}' de travail à allure 10 km`};
const WARN_TEXT={
  volume_short:p=>`Il manque environ ${p.minutes}' pour atteindre le volume visé sans footing trop long : ajoute une sortie, ou accepte une semaine un peu plus courte.`,
  weekly_volume_incompatible:p=>`Volume incompatible avec ces contraintes : environ ${fmtDur(p.minimum)} sont nécessaires pour conserver les sorties, contre ${fmtDur(p.target)} demandées. Réduis le nombre de qualités ou augmente le temps disponible.`,
  qualities_reduced:p=>`${p.actual} qualité au lieu de ${p.requested} pour conserver les autres sorties dans le temps disponible.`,
  quality_work_reduced:()=>`Travail des qualités réduit pour conserver les autres sorties dans le volume demandé.`,
  protected_footing_shortfall:p=>`Environ ${p.minutes}' n’ont pas pu être réparties : les footings proches des séances exigeantes restent courts. Ajoute une sortie ou réduis la cible.`,
  quality_exceeds_volume:()=>'Les séances de qualité et la sortie longue dépassent déjà le volume visé : augmente le volume moyen ou réduis la durée du bloc.',
  footings_removed:p=>`Volume trop faible pour ${p.runs} sorties : ${p.removed} footing${p.removed>1?'s':''} retiré${p.removed>1?'s':''}. Une semaine à ${p.runs-p.removed} sorties est plus logique.`,
  assimilation_mixed_unavailable:()=>`Aucun format mixte ne respecte les durées et récupérations disponibles ; une qualité simple réduite est retenue si le volume le permet.`,
  assimilation_active_unavailable:()=>`Le temps disponible ne permet pas d’ajouter 10 minutes d’endurance active avec un échauffement et un retour au calme ; les sorties sont conservées.`,
  budget_too_small:()=>'Le volume hebdomadaire est trop faible pour loger la qualité minimale de ce bloc sans dépasser le budget. Augmente le volume ou choisis un autre bloc.',
  cap_exceeded:p=>`Garde-fou : l'option ${p.option} de « ${sessionTitle(p.session)} » dépasse ${p.caps.map(c=>CAPLAB[c]).join(' et ')}. Elle ne doit pas être utilisée telle quelle.`,
  volume_deviation:p=>`Volume réel ${fmtDur(p.volume)} pour une cible de ${fmtDur(p.target)} : écart supérieur à ${Math.round(RULES.volume.deviationAlert*100)} %.`,
  no_day_taper_reminder:()=>'Aucun jour disponible à J−3 ou J−4 pour le rappel d\'allure.',
  no_day_taper_eve:()=>'Le footing d’activation de J−1 n’a pas pu être placé : rends ce jour disponible si tu veux conserver la routine standard.',
  no_day_footing:()=>'Pas assez de jours disponibles : un footing n\'a pas de place.',
  no_day_session:p=>`Aucun jour disponible pour « ${sessionTitle(p.session)} ».`,
  qualities_consecutive:()=>'Deux séances de qualité sont trop rapprochées : garde au moins 48 h entre elles si possible.',
  quality_next_to_long_run:()=>'Une qualité est collée à la sortie longue : décale-la si tu peux, ou garde la sortie longue très facile.',
  no_day_footing_reduce:()=>'Pas assez de jours disponibles : un footing n\'a pas de place, réduis le nombre de sorties.',
  dates_missing:()=>'Renseigne la date de début et la date de la course.',
  race_before_start:()=>'La course doit tomber après le début de préparation.',
  race_pace_missing:()=>'Saisis une perf de référence ou un objectif pour fixer l\'allure de course.',
  no_available_day:()=>'Coche au moins un jour disponible.'
};
const warnText=w=>WARN_TEXT[w.code](w.params||{});
const LD='Lignes droites : 5 à 8 × 10 à 15" (ou 60 à 100 m), récup complète, une fois dans la semaine en fin de footing';
const LD_SUFFIX={strides:' + lignes droites',strides_optional:' + lignes droites (facultatif)',strides_load:' + lignes droites (selon la charge)',strides_light:' + lignes droites légères'};
const BLOCK_LABEL={vma:'VO₂max / puissance aérobie',s1:'Premier seuil',s2:'Second seuil',eco:'Économie de course / côtes',aero:'Développement aérobie'};
const blockLabel=B=>B.id==='spec'?`Allure spécifique ${DIST[B.dist].lab}`:BLOCK_LABEL[B.id];
const EVAL_TEXT={vma:'test VMA6 ou demi-Cooper, pour recaler la VMA.',
  s1:'séance étalon sous-maximale, par exemple 30\' à allure S1 fixe, en comparant la fréquence cardiaque et les sensations au début du bloc.',
  s2:'test de 20 à 30\' à fond, ou une course de 5 à 10 km.',eco:'refaire une séance repère de côtes du début du bloc et comparer chronos et sensations.',
  aero:'séance étalon en EF ou au S1 à allure fixe, en comparant la fréquence cardiaque au début du bloc.',
  spec:['un 5 km en course ou en test.','un 5 ou 10 km en course.','séance de contrôle (par exemple 2 × 5 km à allure semi) ou course.','pas de test, priorité à la récupération.']};
const REMINDER_TEXT={
  strides:()=>LD,
  strides_load:()=>LD+', selon la charge',
  strides_light:()=>'Lignes droites légères : 5 × 10", une fois au maximum dans la semaine',
  strides_optional_fast_work:()=>'Lignes droites facultatives : le travail rapide est déjà important cette semaine',
  strides_optional_week:()=>'Lignes droites facultatives, une fois dans la semaine',
  long_run_easy:()=>'Sortie longue entièrement en EF',
  s2_long_run_s1_end:()=>`Les semaines avec rappel VO₂, la sortie longue se termine par ${RULES.blocks.s2.longRunS1EndMinutes}' au S1 (intégré au plan et à la charge)`,
  drills:()=>'Gammes éducatives 10\' avant chaque qualité (montées de genoux, talons-fesses, foulées bondissantes)',
  strength:()=>'Renforcement et pliométrie : 2 × 20\' hors course (facultatif)',
  aero_long_run_first:()=>'Quand le volume monte, allonger d’abord la sortie longue',
  aero_low_intensity:()=>'Développement aérobie : la majorité du volume reste en basse intensité ; l’endurance active reste sous LT1',
  aero_neuromuscular:()=>'Travail neuromusculaire léger : alterner lignes droites et côtes courtes, sans en faire une séance de qualité',
  evaluation:p=>`Évaluation facultative : ${p.block==='spec'?EVAL_TEXT.spec[p.dist]:EVAL_TEXT[p.block]}`,
  taper_eve:p=>`La veille : ${p.minutes}' très facile + ${p.strides[0]} à ${p.strides[1]} lignes droites de ${p.seconds[0]} à ${p.seconds[1]}"`,
  taper_jminus2:()=>'Avant-veille (J−2) : repos complet',
  taper_no_long_run:()=>'Pas de sortie longue cette semaine',
  intro_partial:()=>'Semaine partielle : footings faciles avant le premier bloc'
};
const reminderText=r=>REMINDER_TEXT[r.code](r.params||{});
const _pv=new WeakMap();
function presentVariant(v){let r=_pv.get(v);if(!r){r=presentVariantRaw(v);_pv.set(v,r);}return r;}
const vText=v=>presentVariant(v).text,vChips=v=>presentVariant(v).chips;

/* ---------- rendu ---------- */
let lastPlan=null,lastPred=null,lastSt=null;
function loadProtectedIds(){
 const ids=new Set(globalThis.PlanifStrava?.completedIds?.()||[]);
 // Cached validations are available before the asynchronous Strava connection.
 for(let i=0;i<(localStorage.length||0);i++){const key=localStorage.key(i);if(!key?.startsWith('planif-strava-records-v1:')||!key.endsWith(':'+activePlan?.id))continue;for(const [id,r] of Object.entries(getJson(key,{})||{}))if(['realized','adapted'].includes(r?.status))ids.add(id);}
 return [...ids];
}
function migrateProgramLoads(st){
 if(st.mode!=='cal'||!validSavedPlan(activePlan)||activePlan.plan.summaryVersion===2||recoveryState||refPlanPending||structureEditing||inputErrors(st).length)return;
 const previous=activePlan,plan=recalculatePlanSummary(reviveSavedPlan(previous.plan),st);
 const archive={...snapshotPlan(previous),archivedAt:new Date().toISOString(),archiveReason:'avant réconciliation des statistiques hebdomadaires'},history=[archive,...planHistory],next={...previous,plan:snapshotPlan(plan)};
 try{localStorage.setItem(STORE.history,JSON.stringify(history));localStorage.setItem(STORE.active,JSON.stringify(next));activePlan=next;planHistory=history;}
 catch(error){console.error('Migration des charges non enregistrée',error);alert('Les nouvelles charges n’ont pas pu être enregistrées. Ton programme précédent est conservé.');}
}
function render(){
  if(refDraft)return;
  if(recoveryState){
    lastCalError=null;
    if(recoveryState.status==='restored'){
      restoreActiveStructure();CURRENT_MODE='cal';$('modeCal').checked=true;$('modeBloc').checked=false;
      save();lastPlan=reviveSavedPlan(activePlan.plan);lastSt={...readState(),mode:'cal',calGoal:lastPlan.race.goal,calDist:lastPlan.race.distance};lastPred=null;
    }else{lastPlan=null;lastSt=null;}
    return;
  }
  const st=readState();
  migrateProgramLoads(st);
  if(refPlanPending&&activePlan&&st.mode==='cal'&&!structureEditing){
    if(inputErrors(st).length){$('predSec').innerHTML=inputErrorHtml();return;}
    const pred=predict(st);renderPred(st,pred);lastPlan=reviveSavedPlan(activePlan.plan);lastSt=st;lastPred=pred;
    renderCalHeader(st,lastPlan);renderCalBody(st,lastPlan);return;
  }
  if(activePlan?.referenceIntensityLock&&st.mode==='cal'&&!structureEditing&&sameStructure(calendarStructure(),activePlan.structure)){
    if(inputErrors(st).length){$('predSec').innerHTML=inputErrorHtml();return;}
    const pred=predict(st);renderPred(st,pred);lastPlan=reviveSavedPlan(activePlan.plan);lastSt=st;lastPred=pred;
    renderCalHeader(st,lastPlan);renderCalBody(st,lastPlan);return;
  }
  if(inputErrors(st).length){$('predSec').innerHTML=inputErrorHtml();return;}
  save();
  $('specRow').style.display=st.block==='spec'?'':'none';
  const pred=predict(st);
  st.v10=pred?pred[1].v:null;st.v5=pred?pred[0].v:null;
  const sug=suggestProfile(st);
  $('profileHint').className='hint'+(sug?' ok':'');
  $('profileHint').textContent=sug?`Profil le plus proche : ${PROFILES[sug.best].lab}.`:'';
  renderPred(st,pred);
  const cal=st.mode==='cal';
  $('calFs').style.display=cal?'':'none';['blockRow','weeksLab'].forEach(id=>{$(id).style.display=cal?'none':'';});
  $('blocLegend').textContent=cal?'Volume':'Bloc';$('blocHint').textContent=cal?'Le volume moyen vaut pour toute la préparation, semaines d\'assimilation et de course comprises.':'Le volume moyen inclut la semaine d\'assimilation (environ −22 % par rapport à la dernière semaine de charge).';
  if(cal){$('specRow').style.display='none';
    $('calDistHint').textContent=st.calDist===1?'':'Seul le spécifique 10 km utilise déjà la nouvelle bibliothèque ; cette distance garde son générateur actuel.';
    let C=buildCalendar(st,pred);
    if(!C.error&&!structureEditing&&activePlan&&sameStructure(calendarStructure(),activePlan.structure)){
      ensurePlanifSessionIds(C);C=preservePastSessions(C);C=applyPlanifMoves(C,activePlan.moves,activePlan.plan,st);
      C=recalculatePlanLoads(C,st,{preserve:true,previous:activePlan.plan,completedIds:loadProtectedIds()});
    }
    if(!C.error)recalculatePlanSummary(C,st);
    lastCalError=C.error||null;
    if(C.error){$('overview').innerHTML=`<h2>Calendrier à compléter</h2><p>${warnText(C.error)}</p>`;$('weeksSec').innerHTML='';lastPlan=null;return;}
    lastPlan=C;lastPred=pred;lastSt=st;
    if(!structureEditing){
      if(activePlan&&activePlan.structure&&!sameStructure(calendarStructure(),activePlan.structure)){
        restoreActiveStructure();
      }else if(!refPlanPending)saveActivePlan(st,C,false);
    }
    if(calSel){const w=C.weeks[calSel.w],dd=w&&w.days[calSel.d];if(!dd||!dd.items[calSel.i])calSel=null;}
    renderCalHeader(st,C);renderCalBody(st,C);return;}
  if(st.block==='spec'&&!pred&&!st.specGoal){$('overview').innerHTML='<h2>Allure spécifique à définir</h2><p>Saisis une perf de référence ou un chrono objectif pour la distance visée.</p>';$('weeksSec').innerHTML='';return;}
  const plan=recalculatePlanSummary(buildPlan(st,pred),st);
  renderOverview(st,plan);renderWeeks(st,plan);
  lastPlan=plan;lastPred=pred;lastSt=st;
}
const pts=x=>`≈ ${Math.round(x)} pts`;
const ptsRange=(a,b)=>Math.round(a)===Math.round(b)?pts(a):`${Math.round(a)} à ${Math.round(b)} pts`;
const LZ={z1:'facile',z2:'S1',z3:'S2',z4:'VO₂+'};
function renderPred(st,pred){
  const pill=(lab,v,extra)=>`<div class="ref-pill"><span>${lab}</span><b>${fmtPace(v)}/km</b> <span>(${fmtSpd(v)} km/h)${extra?', '+extra:''}</span></div>`;
  let h='<h2>Repères et estimations de chronos</h2><div class="refs">'+
    pill('VMA',st.vma)+pill('Second seuil',st.s2)+
    `<div class="ref-pill"><span>Premier seuil</span>${paceHtml(kmh(st.s1lo,st.s1hi))}</div>`+
    `<div class="ref-pill"><span>EF</span>plus lent que ${paceHtml(kmh(st.s1lo,st.s1lo))}</div></div>`;
  if(!pred){h+='<p class="note">Saisis une perf de référence pour obtenir les estimations.</p>';$('predSec').innerHTML=h;return;}
  h+=`<div class="scroll"><table><thead><tr><th>Distance</th><th class="num">Estimation</th><th class="num">Allure</th></tr></thead><tbody>`;
  pred.forEach(p=>{h+=`<tr class="${p.isRef?'ref':''}"><td>${p.lab}${p.isRef?' (réf.)':''}</td><td class="num">${fmtTime(p.t)}</td><td class="num">${paceHtml(kmh(p.v,p.v))}</td></tr>`;});
  h+=`</tbody></table></div><p class="note">Estimation empirique, profil ${profileLabel(st)} : écart de vitesse constant par palier entre distances. C'est un repère de terrain, pas un modèle physiologique.</p>`;
  $('predSec').innerHTML=h;
}
function zoneBar(z,vol,scale){
  return`<div class="bar" style="width:${scale}%">`+['z1','z2','z3','z4'].map(k=>`<i style="width:${z[k]/vol*100}%;background:${ZONES[k].c}" title="${ZONES[k].lab} : ${Math.round(z[k])}'"></i>`).join('')+'</div>';
}
function renderOverview(st,plan){
  const vols=plan.weeks.map(w=>w.vol),mx=Math.max(...vols);
  const avg=vols.reduce((s,x)=>s+x,0)/vols.length;
  let h=`<h2>${blockLabel(plan.B)}, ${st.N} + 1 semaines</h2>`;
  if(plan.B.v)h+=`<p class="note">Allure spécifique utilisée : ${paceHtml(kmh(plan.B.v,plan.B.v))}, ${plan.B.goal?'issue de ton objectif':'issue de l\'estimation'}.</p>`;
  h+='<div class="lanes">';
  plan.weeks.forEach(w=>{
    h+=`<div class="lane"><div class="lane-name">Sem. ${w.k+1}<small>${w.assim?'assimilation':'charge'}</small></div><div>${zoneBar(w.z,w.vol,w.vol/mx*100)}</div><div class="lane-vol">${fmtDur(w.vol)}<small>${pts(w.load)}</small></div></div>`;
  });
  h+='</div><div class="legend">'+Object.values(ZONES).map(z=>`<span style="--c:${z.c}">${z.lab}</span>`).join('')+`</div><p class="note">Moyenne réelle du bloc : ${fmtDur(avg)} par semaine, pour une cible de ${fmtDur(st.vol)}. Budget qualité visé : ${plan.B.budget[0]} à ${plan.B.budget[1]} % du temps. La charge (pts) est un indice interne pour comparer les semaines : minutes × coefficient personnalisé, récupérations courues à 0,20 point/min. Elle est donnée au centre de la plage possible selon les options choisies.</p>`;
  $('overview').innerHTML=h;
}
function renderSession(s,role){
  const c=ZONES[s.zone].c;
  let h=`<div class="sess" style="--c:${c}"><div class="sess-title"><h4>${role} : ${sessionTitle(s)}</h4><span class="dur">${Math.round(s.work)}' de travail ciblé, ≈ ${fmtDur(s.total)} au total, charge ${ptsRange(s.loadMin,s.loadMax)}</span></div><p class="purpose">${sessionPurpose(s)}${s.rpe?` Ressenti attendu : ${s.rpe} ; la fréquence cardiaque sert seulement de contrôle.`:''}</p><div class="variants">`;
  s.variants.forEach((v,i)=>{h+=`<div class="variant"><div class="opt">Option ${i+1}, ${Math.round(v.work)}' de travail, ${pts(v.load)}</div>${qualityScheduleHtml(v,s,lastSt)}</div>`;});
  h+='</div>';
  if(s.gap)h+=`<div class="warn">Les deux options diffèrent de ${Math.round(s.gap)}' de travail : choisis plutôt l'option 1 pour respecter la cible.</div>`;
  return h+'</div>';
}
function loadAccountingNote(w){return `<p class="lbl">Charge estimée du programme · mêmes coefficients que le calculateur. Les validations ne remplacent pas les durées et intensités prévues par les valeurs réellement courues.${(w.loadNotices||[]).length?' '+w.loadNotices.join(' '):''}</p>`;}
const activeRangeText=x=>x&&x.activeRange?`${activeBlockLabel(x)} EA`:'';
const footLabel=x=>`${joggTitle(x)} ${fmtFootDur(x.min)}${x.type==='active'?` (${activeRangeText(x)})`:''}${x.shortHills?' + côtes courtes':''}`;
function renderWeeks(st,plan){
  let h='<h2>Détail semaine par semaine</h2>';
  plan.weeks.forEach(w=>{
    const inB=w.assim||(w.pct>=w.budget[0]-0.5&&w.pct<=w.budget[1]+0.5);
    const tot=w.load||1;
    h+=`<article class="week"><div class="week-head"><h3>Semaine ${w.k+1}, ${w.assim?'assimilation':'charge'}</h3><div class="meta"><b>${fmtDur(w.vol)}</b> (cible ${fmtDur(w.target)}), qualité <b>${Math.round(w.qualityMinutes)}' soit ${Math.round(w.pct)} %</b>${inB?'':' (hors cible)'}, charge <b>${pts(w.load)}</b>${Math.round(w.loadMin)!==Math.round(w.loadMax)?` (${Math.round(w.loadMin)} à ${Math.round(w.loadMax)} selon les options)`:''}${w.heavy?', semaine chargée':''}</div></div><div class="week-body">`;
    h+=loadAccountingNote(w);w.sessions.forEach((s,i)=>{h+=renderSession(s,i===0?'Qualité 1':'Qualité 2');});
    h+='<div class="easy">';
    if(w.sl)h+=`<div><b>Sortie longue, ${fmtDur(w.sl)}, ${pts(w.slLoad)}</b><span>${w.slS1?`${fmtDur(w.sl-w.slS1)} en EF puis ${w.slS1}' au S1 (${paceHtml(kmh(st.s1lo,st.s1hi))}).`:w.slEA?`20' faciles, puis ${Math.round(w.slEA.range[0])} à ${Math.round(w.slEA.range[1])}' d’endurance active au choix (continu ou blocs), puis au moins 10' faciles. FC ≤ LT1${st.lt1Hr?' ('+Math.round(st.lt1Hr)+' bpm)':''}.`:`En EF, plus lent que ${paceHtml(kmh(st.s1lo,st.s1lo))}.`}</span></div>`;
    if(w.foot.length)h+=`<div><b>${w.foot.map(footLabel).join(', ')}</b><span>${w.heavy?'Semaine chargée : adapte tes Jogg’ à ta fatigue.':'Les Jogg’ se courent faciles au ressenti, sans allure imposée.'}</span></div>`;
    h+='</div>';
    h+=`<div><b>Rappels</b><ul class="rap">${w.reminders.map(r=>`<li>${reminderText(r)}</li>`).join('')}</ul></div>`;
    h+='<div class="zline"><span>Minutes :</span>'+['z1','z2','z3','z4'].map(k=>`<span>${ZONES[k].lab} <b>${Math.round(w.z[k])}'</b></span>`).join('')+'</div>';
    h+='<div class="zline"><span>Répartition de la charge :</span>'+['z1','z2','z3','z4'].map(k=>`<span>${LZ[k]} <b>${Math.round(w.loadBreakdown[k]/tot*100)} %</b></span>`).join('')+'</div>';
    w.warns.forEach(x=>{h+=`<div class="warn">${warnText(x)}</div>`;});
    h+='</div></article>';
  });
  $('weeksSec').innerHTML=h;
}


/* ---------- rendu calendrier ---------- */
function phaseGroups(C){const g=[];C.weeks.forEach((w,i)=>{const last=g[g.length-1];if(last&&last.phase===w.phase&&w.phase!=='assim'){last.to=i;}else g.push({phase:w.phase,from:i,to:i});});return g;}
/* En-tête du calendrier (toujours visible) : titre, course, sélecteur de vue, phases, alertes récurrentes */
function renderCalHeader(st,C){
  const N=C.weeks.length,d=C.race.distance;
  const t=fmtTime(DIST[d].km/C.race.speed*3600);
  let h=`<h2>Préparation ${DIST[d].lab} : ${N} semaine${N>1?'s':''}, du ${fmtDs(C.start)} au ${fmtDs(C.race.date)}</h2>`;
  const avgR=C.weeks.reduce((a,w)=>a+w.vol,0)/N;
  h+=`<p class="note">Course le ${fmtD(C.race.date)} : ${C.race.goal?'objectif':'estimation'} ${t} (${paceHtml(kmh(C.race.speed,C.race.speed))}). Cible moyenne <b>${fmtDur(st.vol)}</b> par semaine, moyenne réelle <b>${fmtDur(avgR)}</b>.</p>`;
  h+='<div class="views" role="group" aria-label="Vue">'+[['cal','Calendrier'],['weeks','Semaines'],['details','Détails']].map(([v,l])=>`<button type="button" data-view="${v}" aria-pressed="${calView===v}">${l}</button>`).join('')+'</div>';
  h+='<div class="phases">';
  phaseGroups(C).forEach(g=>{h+=`<div class="wk">S${g.from+1}${g.to>g.from?`–S${g.to+1}`:''}</div><div class="ph"><i style="--c:${PHASE_C[g.phase]}"></i>${phaseLab(g.phase,d)}</div>`;});
  h+='</div>';
  const cnt={};C.weeks.forEach(w=>[...new Set(w.warns.map(warnText))].forEach(x=>{cnt[x]=(cnt[x]||0)+1;}));
  C.recurring=Object.keys(cnt).filter(x=>cnt[x]>=3);
  h+=C.recurring.map(x=>`<div class="warn">${x} (${cnt[x]} semaines concernées)</div>`).join('');
  $('overview').innerHTML=h;
}
/* Vue « Semaines » : synthèse des volumes et charges (inchangée) */
function calLanesHtml(st,C){
  const N=C.weeks.length,d=C.race.distance,vols=C.weeks.map(w=>w.vol),mx=Math.max(...vols);
  let h='<h2>Semaines</h2><div class="lanes">';
  C.weeks.forEach(w=>{h+=`<div class="lane"><div class="lane-name">Sem. ${w.index+1}<small>${phaseLab(w.phase,d)}</small></div><div>${zoneBar(w.z,w.vol,w.vol/mx*100)}</div><div class="lane-vol">${fmtDur(w.vol)}<small>${pts(w.load)}</small></div></div>`;});
  const avg=vols.reduce((a,x)=>a+x,0)/N;
  h+='</div><div class="legend">'+Object.values(ZONES).map(z=>`<span style="--c:${z.c}">${z.lab}</span>`).join('')+`</div><p class="note">Moyenne réelle : ${fmtDur(avg)} par semaine pour une cible de ${fmtDur(st.vol)} (semaines partielles comprises). Le calendrier choisit les blocs et l'enveloppe de volume ; les séances viennent des mêmes moteurs que le mode Bloc.</p>`;
  return h;
}
/* ---------- vue « Calendrier » : grille jour par jour, lue directement dans w.days ---------- */
let calView='cal',calChunk='all',calSel=null;
try{calView=localStorage.getItem('calc-allures-calview')||'cal';}catch(e){console.warn('Planif : préférence ou stockage local indisponible.',e?.name||'Erreur');}
const SECT_SHORT={s1:'S1',s2:'S2',vo2:'VO₂',spec10k:'AS10'};
function itemColor(it,w){
  if(it.kind==='race')return'var(--z4)';
  if(it.kind==='q'){const s=it.s;if(s.libSector==='spec10k'||s.fam==='spec'||s.fam==='taper')return'var(--accent)';return ZONES[s.zone].c;}
  if(it.kind==='foot')return footColor(it.f.type);
  if(it.kind==='sl')return w.slEA?'var(--ef-active)':'var(--ef-std)';
  if(it.kind==='veille')return'var(--ef-rec)';
  return'var(--ef-std)';
}
function itemShort(it,w){
  if(it.kind==='race'){const r=it.s;return{k:'Course',s:DIST[C_dist(r)].lab,t:fmtTime(r.targetTime)};}
  if(it.kind==='q'){const s=it.s,k=s.fam==='alternating'?'S1 / AS10':s.fam==='taper'?(C_dist2(s)?'Rappel AS10':'Rappel d\'allure'):s.isLong?'SL spécifique':SECT_SHORT[s.sector]||(s.fam==='hills'?'Côtes':s.fam==='spec'?'Spécifique':sessionTitle(s));
    return{k,s:compactTxt(vText(s.variants[0])),t:`≈ ${fmtDur(s.total)}`};}
  if(it.kind==='sl')return{k:'Sortie longue',s:fmtDur(w.sl),t:w.slS1?`dont ${w.slS1}' S1`:w.slEA?`${Math.round(w.slEA.range[0])}–${Math.round(w.slEA.range[1])}' actif`:(lastSt?efBandText('std',lastSt):'EF')};
  if(it.kind==='veille')return{k:'Jogg + LD',s:`${it.min}'`,t:'Veille de course, très facile'};
  if(it.kind==='foot'){const f=it.f;return{k:joggTitle(f),s:fmtFootDur(f.min),t:f.type==='active'?activeRangeText(f):(lastSt?efBandText(f.type,lastSt):'Facile, au ressenti')};}
  return{k:'',s:'',t:''};
}
/* Résumé de case : la structure seule, raccourcie pour les formes longues (pyramides, mixtes…) */
function compactTxt(t){
  let x=t.split(', ')[0];
  const m=/^(Pyramide|Dégressif|Progressif) : (.+)$/.exec(x);
  if(m){const p=m[2].split(' – ');x=m[1]==='Pyramide'?`Pyramide ${p[0]} → ${p[Math.floor(p.length/2)]}`:`${m[1]} ${p[0]} → ${p[p.length-1]}`;}
  x=x.replace(/ à S2 enchaînés avec /,' S2 + ').replace(/ à allure 10 km\)/,' AS10)').replace(/ à allure (5 km|Semi|Marathon)/,'');
  x=x.replace(/^Sortie longue : /,'');
  return x;
}
const C_dist=r=>DIST.findIndex(x=>Math.abs(x.km-r.distance)<0.01);
const C_dist2=s=>s.dist===1?'10':'';
function calWeekHtml(w,st,C){
  const d=C.race.distance,i=w.index;
  const cls=['calWeek',w.assimilation?'assim':'',w.raceWeek?'raceWk':''].join(' ');
  const pos=w.phase!=='assim'&&w.segLen?` (${w.segK+1}/${w.segLen})`:'';
  let h=`<section class="${cls}" aria-label="Semaine ${i+1}"><div class="calHead"><h3>Semaine ${i+1}</h3><span class="ph"><i style="--c:${PHASE_C[w.phase]}"></i>${phaseLab(w.phase,d)}${pos}</span>`+
    (w.assimilation?'<span class="tag a">Assimilation</span>':'')+(w.raceWeek?'<span class="tag r">Semaine de course</span>':'')+
    `<span class="meta">${fmtDs(w.startDate)} – ${fmtDs(w.endDate)}, volume <b>${fmtDur(w.vol)}</b>, charge <b>${pts(w.load)}</b></span></div>`;
  h+='<div class="calScroll"><div class="calRow">';
  /* première semaine partielle : jours hors préparation grisés, sans séance */
  const missing=6-dayDiff(w.startDate,w.endDate);
  for(let m=missing;m>0;m--){const dd=addDays(w.startDate,-m);h+=`<div class="day out" aria-hidden="true"><div class="dlab">${dd.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</div><span class="rest">Hors préparation</span></div>`;}
  w.days.forEach((x,di)=>{
    h+=`<div class="day"><div class="dlab"><b>${x.date.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</b> ${x.date.toLocaleDateString('fr-FR',{month:'short'})}</div>`;
    if(!x.items.length)h+='<span class="rest">Repos</span>';
    x.items.forEach((it,ii)=>{const c=itemShort(it,w),sel=calSel&&calSel.w===i&&calSel.d===di&&calSel.i===ii;      h+=`<button type="button" class="item${it.kind==='race'?' raceIt':''}" style="--c:${itemColor(it,w)}" data-w="${i}" data-d="${di}" data-i="${ii}" aria-pressed="${!!sel}"><span class="k">${c.k}</span><span class="s">${c.s}</span>${it.kind==='foot'||it.kind==='sl'?'':`<span class="t">${paceHtml(c.t)}</span>`}</button>`;});
    h+='</div>';});
  h+=`</div></div><div class="calDetail" id="cd-${i}"${calSel&&calSel.w===i?'':' hidden'}>${calSel&&calSel.w===i?renderCalendarDayDetail(st,C,calSel):''}</div></section>`;
  return h;
}
/* Détail d'une case : reprend le rendu complet existant pour les qualités */
function renderCalendarDayDetail(st,C,sel){
  const w=C.weeks[sel.w],day=w.days[sel.d],it=day&&day.items[sel.i];if(!it)return'';
  const when=fmtD(day.date);
  if(it.kind==='q'){const s=it.s;return`<h4>${when}</h4>`+renderSession(s,s.fam==='taper'?'Rappel':s.isLong?'Sortie longue':w.sessions.indexOf(s)===0?'Qualité 1':'Qualité 2');}
  if(it.kind==='race'){const r=it.s;return`<h4>${when} : ${sessionTitle(r)}</h4><p class="purpose">${r.goal?'Objectif':'Estimation'} ${fmtTime(r.targetTime)}, ${paceHtml(kmh(r.targetPace,r.targetPace))}. Échauffement 20' avec quelques accélérations progressives, retour au calme 10'. Durée totale ≈ ${fmtDur(r.total)}, charge ${pts(r.load)}.</p>`;}
  if(it.kind==='sl')return`<h4>${when} : Sortie longue, ${fmtDur(w.sl)}</h4><p class="purpose">${w.slS1?`${fmtDur(w.sl-w.slS1)} en EF (plus lent que ${paceHtml(kmh(st.s1lo,st.s1lo))}), puis ${w.slS1}' au S1 (${paceHtml(kmh(st.s1lo,st.s1hi))}).`:w.slEA?`20' faciles, puis ${Math.round(w.slEA.range[0])} à ${Math.round(w.slEA.range[1])}' d’endurance active au choix, en continu ou en blocs, puis au moins 10' faciles. Ne pas dépasser la FC LT1${st.lt1Hr?' ('+Math.round(st.lt1Hr)+' bpm)':''}.`:`Entièrement en EF, plus lent que ${paceHtml(kmh(st.s1lo,st.s1lo))}.`} Charge ${pts(w.slLoad)}.</p>`;
  if(it.kind==='veille')return`<h4>${when} : Jogg + LD, ${it.min}'</h4><p class="purpose">Très facile, puis ${it.strides?it.strides[0]+' à '+it.strides[1]:'3 à 5'} lignes droites de ${it.seconds?it.seconds[0]+' à '+it.seconds[1]:'10 à 15'}" avec récupération complète.</p>`;
  if(it.kind==='foot'){const f=it.f;if(f.type==='active')return`<h4>${when} : ${joggTitle(f)}, ${fmtFootDur(f.min)}</h4><p class="purpose">${paceHtml(efBandText('active',st))}. ${f.wu}' faciles, puis ${activeRangeText(f)}${f.assimilationActive?' en un bloc':' au choix, en continu ou en blocs'}, puis ${f.cd}' faciles. Critère principal : ne pas dépasser la FC LT1${st.lt1Hr?' ('+Math.round(st.lt1Hr)+' bpm)':''}. Ce n’est pas une séance de qualité. Charge ${pts(f.load)}.</p>`;const lab=joggTitle(f);
    return`<h4>${when} : ${lab}</h4><p class="purpose">${fmtFootDur(f.min)} en EF, ${paceHtml(efBandText(f.type,st))}${f.after?`, le lendemain de « ${sessionTitle(f.after)} »`:''}.${f.ld?` En fin de footing : ${LD.split(' : ')[1]}.`:''}${f.shortHills?` En fin de footing : ${f.shortHills.reps[0]} à ${f.shortHills.reps[1]} × ${f.shortHills.seconds[0]} à ${f.shortHills.seconds[1]}" en côte à ${f.shortHills.gradePct[0]}–${f.shortHills.gradePct[1]} %, récupération complète. Travail neuromusculaire, pas une séance de qualité.`:''} Charge ${pts(f.load)}.</p>`;}
  return'';
}
function renderCalendarGrid(st,C){
  const N=C.weeks.length;let h='<h2>Calendrier</h2>';
  let from=0,to=N-1;
  if(N>8){const chunks=[];for(let a=0;a<N;a+=4)chunks.push([a,Math.min(N-1,a+3)]);
    if(calChunk!=='all'&&!chunks.some(c=>String(c[0])===calChunk))calChunk='all';
    h+='<div class="chunks" role="group" aria-label="Semaines affichées"><button type="button" data-chunk="all" aria-pressed="'+(calChunk==='all')+'">Tout</button>'+chunks.map(c=>`<button type="button" data-chunk="${c[0]}" aria-pressed="${calChunk===String(c[0])}">S${c[0]+1}–S${c[1]+1}</button>`).join('')+'</div>';
    if(calChunk!=='all'){from=+calChunk;to=Math.min(N-1,from+3);}}
  /* en-tête des jours, seulement si toutes les semaines commencent le même jour (course un dimanche : lundi → dimanche) */
  const full=C.weeks.filter(w=>dayDiff(w.startDate,w.endDate)===6);
  if(full.length&&full.every(w=>wd(w.startDate)===wd(full[0].startDate)))
    h+='<div class="dowHead" aria-hidden="true">'+[0,1,2,3,4,5,6].map(k=>`<span>${addDays(full[0].startDate,k).toLocaleDateString('fr-FR',{weekday:'long'})}</span>`).join('')+'</div>';
  for(let i=from;i<=to;i++)h+=calWeekHtml(C.weeks[i],st,C);
  h+='<p class="note">Touche une séance pour afficher son détail sous la semaine : options 1 et 2, allures, récupérations et charge.</p>';
  return h;
}
function renderCalBody(st,C){
  if(calView==='weeks')$('weeksSec').innerHTML=calLanesHtml(st,C);
  else if(calView==='details')renderCalWeeks(st,C);
  else $('weeksSec').innerHTML=renderCalendarGrid(st,C);
}
/* interactions : changement de vue, plage de semaines, sélection d'une case (aucun recalcul du plan) */
$('overview').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(!b||!lastPlan||!lastSt||lastSt.mode!=='cal')return;
  calView=b.dataset.view;try{localStorage.setItem('calc-allures-calview',calView);}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}
  document.querySelectorAll('#overview button[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCalBody(lastSt,lastPlan);});
$('weeksSec').addEventListener('click',e=>{if(!lastPlan||!lastSt||lastSt.mode!=='cal')return;
  const c=e.target.closest('button[data-chunk]');if(c){calChunk=c.dataset.chunk;renderCalBody(lastSt,lastPlan);return;}
  const b=e.target.closest('button.item[data-w]');if(!b)return;
  calSel={w:+b.dataset.w,d:+b.dataset.d,i:+b.dataset.i};
  document.querySelectorAll('#weeksSec button.item').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  document.querySelectorAll('#weeksSec .calDetail').forEach(x=>{x.hidden=true;x.innerHTML='';});
  const box=$('cd-'+calSel.w);if(box){box.innerHTML=renderCalendarDayDetail(lastSt,lastPlan,calSel);box.hidden=false;}});
function agendaItem(it,w,st){
  if(it.kind==='race')return`<span class="race">${sessionTitle(it.s)} : ${C_goalTxt(it.s)}</span>`;
  if(it.kind==='q')return`<b>${sessionTitle(it.s)}</b> : ${vText(it.s.variants[0]).split(', récup')[0]} <span class="rest">ou</span> ${vText(it.s.variants[1]).split(', récup')[0]}`;
  if(it.kind==='sl')return`Sortie longue ${fmtDur(w.sl)}${w.slS1?`, dont ${w.slS1}' au S1 en fin`:''}`;
  if(it.kind==='veille')return`Jogg + LD ${it.min}' très facile + ${it.strides?it.strides[0]+' à '+it.strides[1]:'3 à 5'} lignes droites`;
  if(it.kind==='foot')return footLabel(it.f);
  return'';
}
const C_goalTxt=r=>`${fmtTime(r.targetTime)} visé, ${paceHtml(kmh(r.targetPace,r.targetPace))}`;
function renderCalWeeks(st,C){
  let h='<h2>Semaine par semaine</h2>';const d=C.race.distance;
  C.weeks.forEach(w=>{
    const tot=w.load||1,pos=w.phase!=='assim'&&w.segLen?` (${w.segK+1}/${w.segLen})`:'';
    h+=`<article class="week"><div class="week-head"><h3>Semaine ${w.index+1}, ${fmtDs(w.startDate)} – ${fmtDs(w.endDate)}</h3><div class="meta">Phase : <b>${phaseLab(w.phase,d)}${pos}</b>, volume <b>${fmtDur(w.vol)}</b> (cible ${fmtDur(w.targetVolume)}), charge <b>${pts(w.load)}</b></div></div><div class="week-body">`;
    h+='<div class="agenda">'+w.days.map(x=>`<div class="d">${fmtD(x.date)}</div><div class="it">${x.items.length?x.items.map(it=>agendaItem(it,w,st)).join('<br>'):'<span class="rest">Repos</span>'}</div>`).join('')+'</div>';
    w.sessions.filter(s=>!s.unplaced).forEach((s,i)=>{h+=renderSession(s,w.taper?'Rappel':i===0?'Qualité 1':'Qualité 2');});
    if(w.race){const r=w.race;h+=`<div class="raceCard"><h4>${sessionTitle(r)}, ${fmtD(w.endDate)}</h4><p class="purpose">${fmtTime(r.targetTime)} visé, ${paceHtml(kmh(r.targetPace,r.targetPace))}. Échauffement 20' avec quelques accélérations, retour au calme 10'. Charge ${pts(r.load)}.</p></div>`;}
    h+='<div class="easy">';
    if(w.sl)h+=`<div><b>Sortie longue, ${fmtDur(w.sl)}, ${pts(w.slLoad)}</b><span>${w.slS1?`${fmtDur(w.sl-w.slS1)} en EF puis ${w.slS1}' au S1.`:`En EF, plus lent que ${paceHtml(kmh(st.s1lo,st.s1lo))}.`}</span></div>`;
    const fp=w.foot.filter(f=>!f.unplaced);if(fp.length)h+=`<div><b>${fp.map(footLabel).join(', ')}</b><span>En EF.</span></div>`;
    h+='</div>';
    if(w.reminders&&w.reminders.length)h+=`<div><b>Rappels</b><ul class="rap">${w.reminders.map(r=>`<li>${reminderText(r)}</li>`).join('')}</ul></div>`;
    h+='<div class="zline"><span>Répartition de la charge :</span>'+['z1','z2','z3','z4'].map(k=>`<span>${LZ[k]} <b>${Math.round(w.loadBreakdown[k]/tot*100)} %</b></span>`).join('')+'</div>';
    [...new Set(w.warns.map(warnText))].filter(x=>!(C.recurring||[]).includes(x)).forEach(x=>{h+=`<div class="warn">${x}</div>`;});
    h+='</div></article>';
  });
  $('weeksSec').innerHTML=h;
}
function calText(){
  const C=lastPlan,st=lastSt,d=C.race.distance,L=[];
  L.push(`Préparation ${DIST[d].lab}, ${C.weeks.length} semaines, du ${fmtDs(C.start)} au ${fmtDs(C.race.date)}`);
  phaseGroups(C).forEach(g=>L.push(`  S${g.from+1}${g.to>g.from?`–S${g.to+1}`:''} : ${phaseLab(g.phase,d)}`));
  C.weeks.forEach(w=>{L.push('');L.push(`Semaine ${w.index+1} (${fmtDs(w.startDate)} – ${fmtDs(w.endDate)}), ${phaseLab(w.phase,d)} : ${fmtDur(w.vol)}, charge ${pts(w.load)}`);
    w.days.forEach(x=>L.push(`  ${fmtD(x.date)} : ${x.items.length?x.items.map(it=>agendaItem(it,w,st).replace(/<[^>]+>/g,'')).join(' + '):'repos'}`));});
  return L.join('\n');
}

/* ---------- export texte ---------- */
function planText(){
  if(!lastPlan)return'';
  if(lastSt&&lastSt.mode==='cal')return calText();
  const st=lastSt,p=lastPlan,L=[];
  L.push(`${blockLabel(p.B)}, ${st.N} + 1 semaines, cible ${fmtDur(st.vol)} par semaine`);
  L.push(`VMA ${kmh(st.vma,st.vma)}, S2 ${kmh(st.s2,st.s2)}, S1 ${kmh(st.s1lo,st.s1hi)}`);
  if(p.B.v)L.push(`Allure spécifique : ${kmh(p.B.v,p.B.v)}`);
  p.weeks.forEach(w=>{
    L.push('');L.push(`Semaine ${w.k+1} (${w.assim?'assimilation':'charge'}) : ${fmtDur(w.vol)}, qualité ${Math.round(w.qualityMinutes)}' (${Math.round(w.pct)} %), charge ${pts(w.load)} (${Math.round(w.loadMin)} à ${Math.round(w.loadMax)})`);
    w.sessions.forEach((s,i)=>{L.push(`  Qualité ${i+1} : ${sessionTitle(s)} (≈ ${fmtDur(s.total)}, ${ptsRange(s.loadMin,s.loadMax)})`);s.variants.forEach((v,j)=>L.push(`    Option ${j+1} : ${vText(v)} [${vChips(v).join(', ')}]`));});
    if(w.sl)L.push(`  Sortie longue : ${fmtDur(w.sl)}${w.slS1?` dont ${w.slS1}' au S1 en fin`:' EF'}`);
    if(w.foot.length)L.push(`  ${w.foot.map(footLabel).join(', ')}`);
    w.reminders.forEach(r=>L.push(`  Rappel : ${reminderText(r)}`));
  });
  return L.join('\n');
}
$('copyBtn').addEventListener('click',async()=>{
  const t=planText(),b=$('copyBtn');
  try{await navigator.clipboard.writeText(t);b.textContent='Plan copié';}
  catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');b.textContent='Plan copié';}catch(_){b.textContent='Copie impossible';}ta.remove();}
  setTimeout(()=>{b.textContent='Copier le plan';},1800);
});
$('f').addEventListener('input',()=>{if(activePlan?.referenceIntensityLock&&!refDraft){activePlan={...activePlan,referenceIntensityLock:false};putJson(STORE.active,activePlan);}render();});$('f').addEventListener('change',render);
$('f').addEventListener('input',()=>{syncQualityPrereqs();if(!$('auditSec').hidden)renderAudit();});

/* ---------- audit des règles (interne, v8.2) : lecture seule du socle scientifique ---------- */
const STATE_LAB={not_evaluated:'non évaluée',strong_science:'science solide',partial_science:'science partielle',consensus:'consensus',internal_heuristic:'heuristique Planif',product_choice:'choix de produit',high:'élevée',moderate:'modérée',low:'faible',very_low:'très faible',keep:'conserver',modify:'modifier',monitor:'surveiller'};
const KIND_LAB={physiological:'physiologique',organizational:'organisation',estimation:'estimation'};
function planRefCounts(){
  const c={};if(!lastPlan||!lastPlan.weeks)return c;
  lastPlan.weeks.forEach(w=>{(w.ruleRefs||[]).forEach(r=>{c[r]=(c[r]||0);});(w.sessions||[]).forEach(s=>(s.ruleRefs||[]).forEach(r=>{c[r]=(c[r]||0)+1;}));});
  return c;
}
function ruleEvidenceHtml(m){
  let h=`<p>${m.reviewSummary||'Aucune revue documentée.'}</p>`;
  if(!m.findings.length)return h+`<p>${m.origin==='not_evaluated'?'Non évaluée.':'Choix interne ou de produit ; aucune validation scientifique externe revendiquée.'}</p>`;
  return h+m.findings.map(id=>{const f=FINDINGS.find(x=>x.id===id);if(!f)return '';const src=SOURCES.find(x=>x.id===f.sourceId);
    return `<p><b>${id} · ${src.id} (${scopeLabel(src.id)})</b> · <a href="${src.url}" target="_blank" rel="noopener">${src.authors[0]}, ${src.year}</a><br>${f.statement}<br><b>Portée :</b> ${f.directness.population} ${f.directness.outcome}</p>`;
  }).join('');
}
function renderAudit(){
  const counts=planRefCounts(),used=Object.keys(counts),P=auditIntegrity(used);
  const byQ={};Object.entries(RULE_META).forEach(([id,m])=>{(byQ[m.questionId]=byQ[m.questionId]||[]).push([id,m]);});
  let h=`<h2>Audit des règles</h2><p class="note">${Object.keys(RULE_META).length} règles, ${Object.keys(QUESTIONS).length} questions, ${SOURCES.length} source, ${FINDINGS.length} résultat extrait. Les liens aux résultats documentent la revue ; un lien indirect ou descriptif ne valide pas les valeurs exactes du moteur. La confiance porte sur la prescription Planif ; les valeurs exactes peuvent rester heuristiques malgré un principe scientifique soutenu. Les choix internes n’ont pas besoin d’un résultat inventé. Les règles sans revue restent « non évaluée ». La dernière colonne compte les séances du plan affiché qui utilisent la règle.</p>`;
  h+=P.length?`<div class="warn">Contrôle d'intégrité : ${P.length} problème(s)<br>${P.join('<br>')}</div>`:'<p class="note">Contrôle d\'intégrité : aucun problème (références, questions, couverture de RULES, absence de conclusion).</p>';
  h+='<div class="scroll"><table><thead><tr><th>Règle</th><th>Nature</th><th>Origine</th><th>Confiance</th><th>Décision</th><th class="num">Séances</th></tr></thead><tbody>';
  Object.keys(QUESTIONS).forEach(q=>{const rows=byQ[q]||[];if(!rows.length)return;
    h+=`<tr class="q"><td colspan="6">${QUESTIONS[q].text} <code>${q}</code></td></tr>`;
    rows.forEach(([id,m])=>{h+=`<tr><td><code>${id}</code><details class="info"><summary>Justification et sources</summary>${ruleEvidenceHtml(m)}</details></td><td>${KIND_LAB[m.kind]}</td><td>${STATE_LAB[m.origin]||m.origin}</td><td>${STATE_LAB[m.confidence]||m.confidence}</td><td>${STATE_LAB[m.decision]||m.decision}</td><td class="num">${id in counts?counts[id]:'–'}</td></tr>`;});});
  h+='<tr class="q"><td colspan="6">Entrées techniques ou de produit, exclues de la revue scientifique</td></tr>';
  Object.entries(TECHNICAL_RULES).forEach(([id,why])=>{h+=`<tr><td><code>${id}</code></td><td colspan="4">${why}</td><td class="num">${id in counts?counts[id]:'–'}</td></tr>`;});
  h+='</tbody></table></div><div class="actions" style="margin-top:.8rem"><button type="button" class="ghost" id="auditCopy">Copier l\'audit</button></div>';
  $('auditSec').innerHTML=h;
}
function auditText(){
  const counts=planRefCounts(),L=['Audit des règles'];
  Object.keys(QUESTIONS).forEach(q=>{const rows=Object.entries(RULE_META).filter(([,m])=>m.questionId===q);if(!rows.length)return;
    L.push('',`${q} : ${QUESTIONS[q].text}`);rows.forEach(([id,m])=>{L.push(`  ${id} | ${KIND_LAB[m.kind]} | origine ${STATE_LAB[m.origin]||m.origin} | confiance ${STATE_LAB[m.confidence]||m.confidence} | décision ${STATE_LAB[m.decision]||m.decision} | séances ${id in counts?counts[id]:'–'}`,`    Revue ${m.lastReview||'non datée'} : ${m.reviewSummary||'Non évaluée.'}`);m.findings.forEach(fid=>{const f=FINDINGS.find(x=>x.id===fid),src=SOURCES.find(x=>x.id===f.sourceId);L.push(`    ${fid} | ${src.id} | ${src.title} | DOI ${src.doi} | ${src.url}`,`    ${f.statement}`,`    Portée : ${f.directness.population} ${f.directness.outcome}`);});});});
  L.push('','Entrées techniques :');Object.entries(TECHNICAL_RULES).forEach(([id,why])=>L.push(`  ${id} : ${why}`));
  return L.join('\n');
}
$('auditBtn').addEventListener('click',()=>{const sec=$('auditSec'),open=sec.hidden;sec.hidden=!open;$('auditBtn').setAttribute('aria-expanded',String(open));if(open)renderAudit();});
$('auditSec').addEventListener('click',async e=>{if(!e.target.closest('#auditCopy'))return;const b=e.target.closest('#auditCopy'),t=auditText();
  try{await navigator.clipboard.writeText(t);b.textContent='Audit copié';}catch(_){b.textContent='Copie impossible';}setTimeout(()=>{b.textContent='Copier l\'audit';},1800);});

/* ===================== Application mobile (v9.0a) : lecture seule des données déjà calculées ===================== */
const APP_VERSION=globalThis.PlanifVersion;
const TABS={today:'Accueil',cal:'Calendrier',ref:'Repères',study:'Études',set:'Réglages'};
let appTab='today';
let calendarMoveMessage='';
try{appTab=localStorage.getItem('calc-allures-tab')||'today';document.body.dataset.ui=localStorage.getItem('calc-allures-ui')||'app';}catch(e){console.warn('Planif : préférence ou stockage local indisponible.',e?.name||'Erreur');}
const today0=()=>{const t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate());};
function tileHtml(it,w,ref,opt={}){const c=itemShort(it,w),compact=!!opt.calendar&&(it.kind==='foot'||it.kind==='sl'),cls=`tile${it.kind==='race'?' raceT':''}${it.kind==='foot'?' footT':''}${compact?' calCompact':''}`,st=`--c:${itemColor(it,w)}`,inner=`<span class="tileTop"><span class="k">${c.k}</span>${globalThis.PlanifStrava?.badge(planifSessionInfo(ref))||''}</span><span class="tileContent"><span class="s">${c.s}</span>${compact?'':`<span class="t">${paceHtml(c.t)}</span>`}</span>`;
  const movable=opt.calendar&&it.planifId&&!['race','veille'].includes(it.kind)?` data-move-session="${it.planifId}"`:'';
  return ref?`<button type="button" class="${cls}" style="${st}"${movable} data-open="${ref.q!==undefined?`${ref.w},q,${ref.q}`:ref.f!==undefined?`${ref.w},f,${ref.f}`:ref.sl?`${ref.w},sl,0`:`${ref.w},${ref.d},${ref.i}`}">${opt.calendar?'':'<span class="go" aria-hidden="true">›</span>'}${inner}</button>`:`<div class="${cls}" style="${st}">${inner}</div>`;}
const refOf=(w,x,i)=>({w:w.index,d:w.days.indexOf(x),i});
/* Illustrations SVG décoratives : parcours fictif, piste et récupération. */
/* Fonds SVG décoratifs propres à chaque rubrique, disponibles hors connexion. */
function panelArt(kind){
  const open='<svg class="panelArt" viewBox="0 0 300 190" preserveAspectRatio="xMaxYMin meet" aria-hidden="true" focusable="false">';
  if(kind==='plan')return open+'<path d="M138 0h162v190H100c40-30-10-65 12-99s50-44 26-91" fill="#DDECDD"/><path d="m135 171 29-40 34 12 26-39 55-5" fill="none" stroke="#A6A6D2" stroke-width="5" stroke-dasharray="7 8" stroke-linecap="round"/><g transform="rotate(9 212 68)"><rect x="147" y="19" width="116" height="98" rx="13" fill="#F4F1FA" stroke="#A3A0D0" stroke-width="3"/><path d="M147 47h116" stroke="#A3A0D0" stroke-width="3"/><path d="M173 10v19m62-19v19" stroke="#8885BD" stroke-width="6" stroke-linecap="round"/><g fill="#C7C3E6"><rect x="162" y="59" width="20" height="15" rx="4"/><rect x="191" y="59" width="20" height="15" rx="4"/><rect x="220" y="59" width="20" height="15" rx="4"/><rect x="162" y="84" width="20" height="15" rx="4"/></g><path d="m194 91 6 6 13-16" fill="none" stroke="#7CA88F" stroke-width="5" stroke-linecap="round"/></g></svg>';
  if(kind==='science')return open+'<path d="M120 0h180v190h-98c-39-32-91-31-72-76s-35-48-10-114" fill="#E4EBF4"/><circle cx="244" cy="55" r="48" fill="#D9EBDD"/><g transform="rotate(-9 203 98)"><rect x="138" y="30" width="105" height="135" rx="9" fill="#E3DFF1"/><rect x="154" y="17" width="108" height="133" rx="9" fill="#FAF8FC" stroke="#AAA5CD" stroke-width="3"/><path d="M173 39h64m-64 13h48" stroke="#B4AFD4" stroke-width="4" stroke-linecap="round"/><path d="M175 112V76m0 36h64" fill="none" stroke="#B8B5D2" stroke-width="2"/><path d="m184 99 15-10 14 5 17-23" fill="none" stroke="#8CAF9E" stroke-width="4" stroke-linecap="round"/><path d="M173 130h62" stroke="#D5CDAF" stroke-width="4" stroke-linecap="round"/></g></svg>';
  if(kind==='calculator')return open+'<path d="M124 0h176v190H206c-47-35-61-73-99-89s34-57 17-101" fill="#E8E4F3"/><path d="M234 0h66v127c-34-7-53-39-80-40s-4-54 14-87" fill="#DFEDDF"/><g stroke="#AAA3CF" stroke-linecap="round" stroke-linejoin="round"><rect x="114" y="14" width="66" height="90" rx="9" fill="#F8F6FC" stroke-width="4"/><rect x="125" y="25" width="44" height="19" rx="3" fill="#DFEDDF" stroke-width="2"/><path d="M150 35h10" fill="none" stroke="#9087BB" stroke-width="3"/><g fill="#C7C3E6" stroke="none"><rect x="125" y="53" width="10" height="10" rx="2"/><rect x="142" y="53" width="10" height="10" rx="2"/><rect x="159" y="53" width="10" height="10" rx="2"/><rect x="125" y="69" width="10" height="10" rx="2"/><rect x="142" y="69" width="10" height="10" rx="2"/><rect x="125" y="85" width="10" height="10" rx="2"/><rect x="142" y="85" width="10" height="10" rx="2"/><rect x="159" y="69" width="10" height="26" rx="2" fill="#BDD6C6"/></g></g><path d="m225 127 38 0m-54 14h62m-35 14h36" stroke="#BDD6C6" stroke-width="4" stroke-linecap="round"/></svg>';
  return open+'<path d="M124 0h176v190H206c-47-35-61-73-99-89s34-57 17-101" fill="#E8E4F3"/><path d="M234 0h66v127c-34-7-53-39-80-40s-4-54 14-87" fill="#DFEDDF"/><g transform="translate(-35 -12)" fill="none" stroke="#AAA3CF" stroke-linecap="round" stroke-linejoin="round"><circle cx="182" cy="70" r="35" fill="#F8F6FC" stroke-width="4"/><path d="M175 21h14m-7 0v14m25 8 8-8m-3-3 6 6" stroke-width="5"/><path d="M182 70V49m0 21 18 11" stroke="#9087BB" stroke-width="4"/></g><path d="m225 127 38 0m-54 14h62m-35 14h36" stroke="#BDD6C6" stroke-width="4" stroke-linecap="round"/></svg>';
}
function homeArt(kind){
  const open='<svg class="homeArt" viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">';
  if(kind==='track')return open+'<path fill="#C5DEC9" d="M0 0h300v190H0z"/><g transform="rotate(-23 150 95)" fill="none"><rect x="-25" y="16" width="365" height="165" rx="82" stroke="#ABB6CE" stroke-width="35"/><rect x="-15" y="31" width="345" height="135" rx="67" stroke="#D8C5B9" stroke-width="19"/><rect x="-9" y="42" width="333" height="112" rx="56" stroke="#E6D3AD" stroke-width="9"/><rect x="-4" y="52" width="323" height="92" rx="46" stroke="#C9ADBD" stroke-width="7"/><path d="M130 55v84m-20-84v84m40-84v84" stroke="white" stroke-width="2" opacity=".7"/></g></svg>';
  return open+'<path fill="#EFF0E9" d="M0 0h300v190H0z"/><path fill="#C9DFC6" d="m182 0 75 0-10 65-59 19-26-33zm-62 115 62-18 85 57-18 36H101z"/><g fill="none" stroke="#FFFFFF" stroke-width="6"><path d="m-10 27 310 77M20-15l78 220M109-15l94 210M230-15l-79 210M-10 150l310-118"/></g><path d="m106 45 27-25 47 38-17 22 59 38-25 37-57-16-14-41-50-23z" fill="none" stroke="#797AC0" stroke-width="5" stroke-linejoin="round"/><path d="M105 47V13" stroke="#323444" stroke-width="4"/><path d="M107 13h26v18h-26z" fill="#FFFFFF"/><path d="M107 13h8v9h9v9h9v-9h-9v-9z" fill="#323444"/></svg>';
}
function homeRestArt(){return '<svg viewBox="0 0 140 115" aria-hidden="true" focusable="false"><path d="M16 92C0 65 23 10 66 8s71 39 57 84" fill="#D9EFF0"/><path d="M11 102h122" stroke="#6E986C" stroke-width="3"/><g fill="#BDD88E" stroke="#7C9B6A" stroke-width="2"><ellipse cx="24" cy="70" rx="14" ry="20"/><ellipse cx="114" cy="56" rx="18" ry="25"/></g><path d="M24 69v34m90-48v47" stroke="#7C9B6A" stroke-width="2"/><circle cx="71" cy="37" r="9" fill="#EDC8A7"/><path d="m60 50 21-2 7 28-29 1z" fill="#DB9B82"/><path d="m64 77-8 27m22-26 14 25" fill="none" stroke="#768EB6" stroke-width="10"/><path d="m62 51-7-17 14-19m11 37 12 13-16 3" fill="none" stroke="#C68E70" stroke-width="6" stroke-linecap="round"/><path d="m66 14 13-1m-27 94h10m26-1h12" stroke="#4B5967" stroke-width="4" stroke-linecap="round"/></svg>';}
function homeSessionHtml(it,w,ref){return tileHtml(it,w,ref).replace('class="tile','class="tile homeSession').replace('</button>',homeArt('track')+'</button>');}
function appTodayHtml(){
  if(recoveryState?.status==='pending')return recoveryHtml();
  const C=lastPlan,st=lastSt;
  if(!C||!st||(st.mode==='cal'&&lastCalError))return`<div class="card"><h2>Plan à compléter</h2><p class="lbl">${st&&st.mode==='cal'&&lastCalError?warnText(lastCalError):'Complète tes repères et les paramètres du plan.'}</p><button type="button" class="cta" data-goto="ref">Ouvrir les repères</button><button type="button" class="cta ghost" data-goto="set">Ouvrir les réglages</button></div>`;
  if(st.mode!=='cal'||!C.weeks||!C.weeks[0].days)return`<div class="card"><h2>Pas encore de calendrier</h2><p class="lbl">Le mode Bloc n'a pas de dates. Crée un calendrier course pour voir ta séance du jour.</p><button type="button" class="cta" data-goto="set">Ouvrir les réglages</button></div>`;
  const t=today0(),days=C.weeks.flatMap(w=>w.days.map(x=>({w,x})));
  let h='';
  const cur=days.find(o=>+o.x.date===+t),first=days[0],last=days[days.length-1];
  const dleft=dayDiff(t,C.race.date);
  // The home race estimate follows current athlete references, even when
  // the saved training schedule remains locked pending separate approval.
  const racePrediction=!C.race.goal?predict(readState())?.[Number(C.race.distance)]:null;
  const homeRaceSpeed=racePrediction&&Number.isFinite(racePrediction.v)&&racePrediction.v>0?racePrediction.v:C.race.speed;
  if(dleft>=0)h+=`<div class="card todayCountdown">${homeArt('map')}<div class="homeCountdownHeader"><div class="lbl">Course ${DIST[C.race.distance].lab}, ${fmtD(C.race.date)}</div>${activePlan&&!structureEditing?'<span class="homeLock"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>Structure verrouillée</span>':''}</div><div class="homeCopy"><div class="big">J−${dleft}</div><p class="lbl">${C.race.goal?'Objectif':'Estimation'} ${fmtTime(DIST[C.race.distance].km/homeRaceSpeed*3600)}, ${paceHtml(kmh(homeRaceSpeed,homeRaceSpeed))}</p></div></div>`;
  if(cur){const it=cur.x.items;h+=`<div class="card homeDay"><div class="lbl">${fmtD(t)}</div>${it.length?it.map((i,k)=>tileHtml(i,cur.w,refOf(cur.w,cur.x,k))).join(''):`<div class="homeRest"><div class="big">Repos</div>${homeRestArt()}</div>`}</div>`;}
  else if(t<first.x.date)h+=`<div class="card"><div class="lbl">Avant le début</div><div class="big">J−${dayDiff(t,first.x.date)}</div><p class="lbl">La préparation commence le ${fmtD(first.x.date)}.</p></div>`;
  else if(t>last.x.date)h+='<div class="card"><h2>Préparation terminée</h2><p class="lbl">Crée un nouveau calendrier dans les réglages.</p></div>';
  const next=days.find(o=>o.x.date>t&&o.x.items.some(i=>i.kind==='q'||i.kind==='race'));
  if(next){const k=next.x.items.findIndex(i=>i.kind==='q'||i.kind==='race');h+=`<div class="card homeKey"><div class="lbl">Prochaine séance clé, ${fmtD(next.x.date)}</div>${homeSessionHtml(next.x.items[k],next.w,refOf(next.w,next.x,k))}</div>`;}
  const w=(cur&&cur.w)||(t<first.x.date?first.w:null);
  if(w){const pos=w.phase!=='assim'&&w.segLen?` (${w.segK+1}/${w.segLen})`:'';
    const progress=(w.index+1)/C.weeks.length,loads=C.weeks.map(x=>Math.max(0,x.load||0)),maxLoad=Math.max(1,...loads);
    const bars=loads.map((v,i)=>{const height=4+v/maxLoad*22;return `<rect x="${i*64/loads.length}" y="${27-height}" width="${Math.max(1,64/loads.length-2)}" height="${height}" rx="1" fill="currentColor" opacity="${i===w.index?1:.25}"/>`;}).join('');
    h+=`<div class="card homeWeek"><div class="lbl">Semaine ${w.index+1} sur ${C.weeks.length}</div><div class="homeWeekHead"><h2>${phaseLab(w.phase,C.race.distance)}${pos}</h2><svg class="homeProgress" viewBox="0 0 56 56" role="img" aria-label="Semaine ${w.index+1} sur ${C.weeks.length}"><circle cx="28" cy="28" r="21"/><circle cx="28" cy="28" r="21" stroke-dasharray="${progress*132} 132"/></svg></div><div class="kv"><span>Volume prévu</span><span class="v">${fmtDur(w.vol)}</span><span>Charge${w.loadModel==='personal-v1'?'':' conservée'}</span><span class="v homeLoad"><svg viewBox="0 0 64 27" aria-hidden="true">${bars}</svg>${pts(w.load)}</span></div></div>`;}
  return h;
}
/* ---------- Calendrier mobile (v9.1) : semaines repliables, lecture directe de w.days ---------- */
let calOpen=null,calendarTimelineOpen=false;
function appCalHtml(){
  if(recoveryState?.status==='pending')return recoveryHtml();
  const C=lastPlan,st=lastSt;if(!C||!C.weeks||(st&&st.mode==='cal'&&lastCalError))return`<div class="card"><h2>Plan à compléter</h2><p class="lbl">${lastCalError?warnText(lastCalError):'Aucun plan.'}</p><button type="button" class="cta" data-goto="set">Ouvrir les réglages</button></div>`;
  const isCal=st.mode==='cal'&&C.weeks[0]&&C.weeks[0].days;
  return recoveryHtml()+(isCal?appCalendarWeeks(C,st):appBlockWeeks(C,st));
}
function appCalendarWeeks(C,st){
  const t=today0(),d=C.race.distance;
  const curIdx=C.weeks.findIndex(w=>w.startDate<=t&&t<=w.endDate);
  if(calOpen===null)calOpen=new Set([curIdx>=0?curIdx:0]);
  let h=`<div class="card calHero">${homeArt('map')}<div class="lbl">${DIST[d].lab}, ${fmtDs(C.start)} → ${fmtDs(C.race.date)}</div><div class="calHeroTitle"><h2>${C.weeks.length} semaines</h2><button type="button" class="calTimelineBtn" data-timeline="1" aria-expanded="${calendarTimelineOpen}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14M3 10h14M3 16h14"/><circle cx="7" cy="4" r="2" fill="var(--surface-2)"/><circle cx="13" cy="10" r="2" fill="var(--surface-2)"/><circle cx="8" cy="16" r="2" fill="var(--surface-2)"/></svg>${calendarTimelineOpen?'Masquer la chronologie':'Chronologie'}</button></div>`;
  if(calendarTimelineOpen){
    h+='<div class="phaseList" style="margin-top:.7rem">';
    phaseGroups(C).forEach(g=>{h+=`<b>S${g.from+1}${g.to>g.from?`–S${g.to+1}`:''}</b><span><i style="--c:${PHASE_C[g.phase]}"></i>${phaseLab(g.phase,d)}</span>`;});
    h+='</div>';
    h+=volumeChargeHtml(st,C);
  }
  h+='</div>';
  h+=`<p class="lbl">Appui long sur une séance, puis glisse-la vers un jour de la même semaine.</p><p class="lbl" id="calMoveStatus" role="status" aria-live="polite">${calendarMoveMessage.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</p>`;
  C.weeks.forEach((w,i)=>{
    const open=calOpen.has(i),pos=w.phase!=='assim'&&w.segLen?` ${w.segK+1}/${w.segLen}`:'';
    h+=`<div class="cw${i===curIdx?' nowW':''}${w.assimilation?' assimW':''}${w.raceWeek?' raceW':''}"><button type="button" class="cwHead" data-week="${i}" aria-expanded="${open}"><i style="--c:${PHASE_C[w.phase]}"></i>`+
      `<div><div class="cwTitle"><b>Semaine ${i+1}</b>${i===curIdx?'<span class="calNow">En cours</span>':''}</div><small>${phaseLab(w.phase,d)}${pos}, ${fmtDs(w.startDate)} – ${fmtDs(w.endDate)}</small></div><div class="v">${fmtDur(w.vol)}<small>${pts(w.load)}</small></div></button>`;
    if(!open){
      const missing=6-dayDiff(w.startDate,w.endDate);
      h+='<div class="strip" aria-hidden="true">'+Array(missing).fill('<span class="out"></span>').join('')+w.days.map(x=>{
        const it=x.items.find(i=>i.kind==='race')||x.items.find(i=>i.kind==='q')||x.items.find(i=>i.kind==='sl')||x.items[0];
        const lab=x.date.toLocaleDateString('fr-FR',{weekday:'narrow'});
        if(!it)return`<span>${lab}</span>`;
        return`<span class="on${it.kind==='race'?' raceS':''}" style="--c:${itemColor(it,w)}">${lab}</span>`;}).join('')+'</div>';
    }else{
      h+='<div class="cwBody">'+loadAccountingNote(w)+w.days.map((x,di)=>`<div class="dayRow" data-move-week="${i}" data-move-date="${planDateKey(x.date)}"><div class="dl"><b>${x.date.toLocaleDateString('fr-FR',{weekday:'short'})}</b>${x.date.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</div><div>`+
        (x.items.length?x.items.map((it,ii)=>tileHtml(it,w,{w:i,d:di,i:ii},{calendar:true})).join(''):'<div class="rest3">Repos</div>')+'</div></div>').join('');
      h+=`<div class="cwFoot"><span>Qualité ${Math.round(w.qualityMinutes)}' (${Math.round(w.pct)} %)</span><span>Cible ${fmtDur(w.targetVolume)}</span><strong class="weekLoad">Charge estimée : ${pts(w.load)}</strong></div><p class="lbl">Qualité : travail cumulé, hors échauffements et récupérations. Option A utilisée pour les séances à choix.</p></div>`;
    }
    h+='</div>';});
  return h;
}
/* mode Bloc : pas de dates, les séances de chaque semaine s'ouvrent quand même */
function appBlockWeeks(C,st){
  if(calOpen===null)calOpen=new Set([0]);
  let h=`<div class="card"><div class="lbl">Bloc sans dates</div><h2 style="margin:.2rem 0 0">${blockLabel(C.B)}, ${C.weeks.length} semaines</h2></div>`;
  C.weeks.forEach((w,i)=>{const open=calOpen.has(i);
    h+=`<div class="cw${w.assim?' assimW':''}"><button type="button" class="cwHead" data-week="${i}" aria-expanded="${open}"><i style="--c:${w.assim?PHASE_C.assim:PHASE_C[C.B.id==='spec'?'spec':C.B.id]||'var(--line)'}"></i><div><b>Semaine ${i+1}</b><small>${w.assim?'Assimilation':'Charge'}</small></div><div class="v">${fmtDur(w.vol)}<small>${pts(w.load)}</small></div></button>`;
    if(open){h+='<div class="cwBody">'+loadAccountingNote(w)+w.sessions.map((s,qi)=>tileHtml({kind:'q',s},w,{w:i,q:qi})).join('')+
      (w.sl?tileHtml({kind:'sl'},w,{w:i,sl:true}):'')+w.foot.map((f,fi)=>tileHtml({kind:'foot',f},w,{w:i,f:fi})).join('')+'</div>';}
    h+='</div>';});
  return h;
}
function refHelpHtml(title,body){return `<details class="refHelp"><summary><h2>${title}</h2><span class="refInfoIcon" aria-hidden="true">ⓘ</span><span class="srOnly"> — afficher les explications</span></summary><div class="refHelpBody">${body}</div></details>`;}
const refEditorOpen={physio:false,chrono:false};
let refDraft=null;
let refPlanPending=false;
let refApplyRequested=false;
const REF_PLAN_PENDING_KEY='planif-reference-plan-pending-v1';
function refSnapshot(){return Object.fromEntries(GLOBAL_IDS.map(id=>[id,isCheck($(id))?$(id).checked:$(id).value]));}
function refRestore(snapshot){for(const [id,value] of Object.entries(snapshot)){if(!$(id))continue;if(isCheck($(id)))$(id).checked=!!value;else $(id).value=value;}}
function refPendingLoad(){try{return !!(activePlan&&JSON.parse(localStorage.getItem(REF_PLAN_PENDING_KEY)||'null')?.id===activePlan.id);}catch{return false;}}
function refPendingSet(value){refPlanPending=!!value;try{if(value&&activePlan)localStorage.setItem(REF_PLAN_PENDING_KEY,JSON.stringify({id:activePlan.id}));else localStorage.removeItem(REF_PLAN_PENDING_KEY);}catch(error){console.warn('Statut des références non sauvegardé',error?.name);}}
function refreshSavedPlanStructure(){
 if(recoveryState||structureEditing||refDraft||refPlanPending||!activePlan?.plan){alert('Termine d’abord les modifications en attente du programme.');return false;}
 const st=readState();
 if(st.mode!=='cal'||!sameStructure(calendarStructure(),activePlan.structure)){alert('La structure du plan actif ne correspond pas aux paramètres affichés.');return false;}
 const errors=inputErrors(st);if(errors.length){alert(errors.join('\\n'));return false;}
 const candidate=buildCalendar(st,predict(st));
 if(candidate.error){alert('Recalcul impossible : '+warnText(candidate.error));return false;}
 ensurePlanifSessionIds(candidate);
 const now=new Date(),cut=planDateKey(now),completed=new Set(globalThis.PlanifStrava?.completedIds?.()||[]);
 const old=reviveSavedPlan(activePlan.plan);
 const oldDays=new Map(old.weeks.flatMap(w=>(w.days||[]).map(d=>[planDateKey(d.date),d])));
 const protectedItems=new Map();
 for(const w of old.weeks)for(const d of w.days||[])for(const it of d.items||[]){
   if(completed.has(it.planifId))protectedItems.set(it.planifId,{item:it,date:planDateKey(d.date)});
 }
 let futureDays=0,protectedDays=0;
 for(const w of candidate.weeks)for(const d of w.days||[]){
   const date=planDateKey(d.date),prev=oldDays.get(date);
   if(date<=cut){if(prev){d.items=JSON.parse(JSON.stringify(prev.items||[]));protectedDays++;}else d.items=[];continue;}
   futureDays++;
   d.items=(d.items||[]).filter(it=>!protectedItems.has(it.planifId));
   for(const [id,record] of protectedItems){if(record.date===date&&!d.items.some(it=>it.planifId===id))d.items.push(JSON.parse(JSON.stringify(record.item)));}
 }
 // Completed sessions on a moved date must remain on that date, even when
 // the new engine places a different workout there.
 const candidateDates=new Set(candidate.weeks.flatMap(w=>(w.days||[]).map(d=>planDateKey(d.date))));
 const outOfRange=[...protectedItems.values()].filter(v=>!candidateDates.has(v.date));
 if(outOfRange.length){alert('Le nouveau calendrier ne couvre pas toutes les séances déjà réalisées. Le plan est conservé.');return false;}
 if(!futureDays){alert('Aucune journée future à actualiser.');return false;}
 if(!confirm('Mettre à jour la structure des séances futures avec le moteur actuel ?\\n\\nLes séances passées et celles déjà réalisées seront conservées. Une sauvegarde du plan actuel sera créée dans les archives.'))return false;
 archiveActivePlan('avant mise à jour du moteur');
 recalculatePlanLoads(candidate,st,{preserve:true,previous:old,completedIds:[...completed]});
 activePlan={...activePlan,updatedAt:new Date().toISOString(),plan:snapshotPlan(candidate),referenceIntensityLock:true,moves:[]};
 putJson(STORE.active,activePlan);
 document.dispatchEvent?.(new CustomEvent('planif-plan-change'));
 lastPlan=reviveSavedPlan(activePlan.plan);lastSt=st;lastPred=predict(st);
 calSel=null;appSession=null;setBuilt=false;render();renderApp();
 alert('Programme mis à jour : '+futureDays+' journée(s) future(s) recalculée(s), '+protectedDays+' journée(s) passée(s) conservée(s). Les séances déjà réalisées restent protégées.');
 return true;
}
function applyReferencesToSavedPlan(){
 if(!activePlan||!activePlan.plan)return false;
 const st=readState(),pred=predict(st),candidate=buildCalendar(st,pred);
 if(candidate.error){alert('Le programme ne peut pas être mis à jour : vérifie les références et les dates.');return false;}
 ensurePlanifSessionIds(candidate);
 const previous=activePlan.plan;
 const revised=applyReferenceIntensities(previous,candidate,globalThis.PlanifStrava?.completedIds?.()||[]);
 recalculatePlanLoads(revised,st,{preserve:true,completedIds:loadProtectedIds()});
 if(!revised.referenceIntensityUpdates){alert('Aucune allure compatible n’a été actualisée. Le plan est conservé sans changement.');return false;}
 activePlan={...activePlan,updatedAt:new Date().toISOString(),referenceIntensityLock:true,plan:revised};
 putJson(STORE.active,activePlan);
 document.dispatchEvent?.(new CustomEvent('planif-plan-change'));
 refPendingSet(false);
 const changed=revised.referenceIntensitySessionsUpdated||0,total=revised.referenceIntensitySessionsEligible||0;
 alert('Mise à jour des références : '+changed+' séance(s) de qualité actualisée(s) sur '+total+' séance(s) future(s) non réalisée(s).'+(total>changed?'\n'+(total-changed)+' séance(s) conservée(s) : format non compatible avec le recalcul.':''));
 return true;
}
// Reference validation applies only to authoritative Repères, never the Calcul simulator.
const REFERENCE_MAX_SPEED_GAIN=0.20;
// Men's ratified road benchmarks (October 2026); not used for training predictions.
const ROAD_WORLD_RECORD_SECONDS=[12*60+49,26*60+31,57*60+20,1*3600+59*60+30];
function referenceChangeErrors(before,after){
 const errors=[];
 const oldSpeed=(dist,time)=>{const t=parseTime(time);return t>0?DIST[Number(dist)]?.km*3600/t:NaN;};
 for(const [key,label] of [['s1lo','S1 basse'],['s1hi','S1 haute'],['s2','Second seuil'],['vma','VMA']]){
   const previous=num(before[key]),next=num(after[key]);
   if(Number.isFinite(previous)&&previous>0&&Number.isFinite(next)&&next>previous*(1+REFERENCE_MAX_SPEED_GAIN+1e-9))
     errors.push(label+': progression maximale autorisée de +20 % en km/h (ancienne valeur '+fmtSpd(previous)+' km/h, limite '+fmtSpd(previous*1.2)+' km/h).');
 }
 for(const [distanceId,timeId,label] of [['refDist','refTime','Chrono de référence'],['ref2Dist','ref2Time','Deuxième chrono de référence']]){
   const distance=Number(after[distanceId]),time=parseTime(after[timeId]);
   if(!Number.isInteger(distance)||distance<0||distance>=DIST.length||!Number.isFinite(time)||time<=0)continue;
   if(time<ROAD_WORLD_RECORD_SECONDS[distance])errors.push('À moins que tu t\'appelles Yann Schrub, tu ne feras jamais ce chrono !');
   const previous=oldSpeed(before[distanceId],before[timeId]),next=oldSpeed(distance,after[timeId]);
   if(Number.isFinite(previous)&&previous>0&&Number.isFinite(next)&&next>previous*1.2+1e-9)
     errors.push(label+': progression de '+((next/previous-1)*100).toFixed(1).replace('.',',')+' % en km/h, maximum autorisé +20 %.');
 }
 return errors;
}
function refFinishEdit(saveChanges){
 if(!refDraft)return;
 const before=refDraft,after=refSnapshot();
 if(saveChanges){
   const changes=referenceChangeErrors(before,after);
   const worldRecordWarning='À moins que tu t\'appelles Yann Schrub, tu ne feras jamais ce chrono !';
   if(changes.includes(worldRecordWarning)){alert(worldRecordWarning);return;}
   const errors=[...referenceErrors(readState()),...changes];if(errors.length){alert(errors.join('\n'));return;}
   if(!confirm('Enregistrer ces nouvelles références ? Cette validation ne modifie pas le programme existant.'))return;
 }else refRestore(before);
 refDraft=null;refEditorOpen.physio=false;refEditorOpen.chrono=false;
 if(saveChanges){save();if(activePlan){refPendingSet(true);if(confirm('Appliquer maintenant les nouvelles références aux séances futures non réalisées ? Les séances passées et réalisées seront conservées.'))applyReferencesToSavedPlan();}}
 render();renderApp();
}

function refEditHtml(title,key,body){return `<details class="refHelp refEditor" data-ref-section="${key}"${refEditorOpen[key]?' open':''}><summary><h2>${title}</h2><span class="refInfoIcon refEditIcon" aria-hidden="true">✎</span><span class="srOnly"> — modifier ${key==='physio'?'la physiologie':'les chronos de référence'}</span></summary><div class="refHelpBody settingsContent">${body}<div class="refEditActions"><button type="button" class="cta ghost" data-ref-cancel>Annuler</button><button type="button" class="cta" data-ref-save>Enregistrer</button></div></div></details>`;}
function conversionResult(mode,raw){
  const value=String(raw).trim();if(!value)return '—';
  if(mode==='speedToPace'){
    if(/^\d+[.,]$/.test(value))return '—';
    if(!/^\d+(?:[.,]\d+)?$/.test(value))return 'Saisie invalide';
    const speed=Number(value.replace(',','.'));if(!Number.isFinite(speed)||speed<=0)return 'Saisie invalide';
    const seconds=Math.round(3600/speed);if(!Number.isFinite(seconds))return 'Saisie invalide';
    return `${Math.floor(seconds/60)}’${String(seconds%60).padStart(2,'0')}/km`;
  }
  if(mode==='paceToSpeed'){
    if(/^\d+(?:[:'’]\d?)?$/.test(value))return '—';
    const match=/^(\d+)[:'’](\d{2})$/.exec(value);
    if(!match||+match[2]>=60||(+match[1]===0&&+match[2]===0))return 'Saisie invalide';
    return (3600/(+match[1]*60+(+match[2]))).toFixed(2).replace('.',',')+' km/h';
  }
  return 'Saisie invalide';
}
let conversionMode='paceToSpeed';
const conversionInputs={paceToSpeed:'4:00',speedToPace:'15,00'};
function conversionHtml(){return `<div class="card conversionCard panelCard chronoPanel"><h2 class="calcTitle"><span class="calcIcon calcIcon-calculator" aria-hidden="true"><svg viewBox="0 0 80 90" aria-hidden="true"><rect x="15" y="5" width="50" height="80" rx="6" fill="#f7f5ff" stroke="#746bb9" stroke-width="4"/><rect x="22" y="13" width="36" height="24" rx="3" fill="#fff" stroke="#8c82c9" stroke-width="2"/><path d="m27 31 7-10 7 4 8-10m-7 0h7v7" stroke="#756cbb" stroke-width="2.5" fill="none" stroke-linecap="round"/><g fill="#8b81c9"><rect x="22" y="45" width="9" height="9" rx="2"/><rect x="35" y="45" width="9" height="9" rx="2"/><rect x="48" y="45" width="9" height="9" rx="2"/><rect x="22" y="58" width="9" height="9" rx="2"/><rect x="35" y="58" width="9" height="9" rx="2"/><rect x="48" y="58" width="9" height="9" rx="2"/><rect x="22" y="71" width="9" height="9" rx="2"/><rect x="35" y="71" width="9" height="9" rx="2"/><rect x="48" y="71" width="9" height="9" rx="2"/></g></svg></span>Calculatrice d’allure</h2><div class="optSeg" role="group" aria-label="Unité saisie"><button type="button" data-conversion-mode="paceToSpeed" aria-pressed="${conversionMode==='paceToSpeed'}">min/km</button><button type="button" data-conversion-mode="speedToPace" aria-pressed="${conversionMode==='speedToPace'}">km/h</button></div><div class="conversionGrid"><label class="sf"><span data-conversion-label></span><input data-conversion-input autocomplete="off"></label><div class="conversionResult"><span>Résultat</span><strong data-conversion-output role="status" aria-live="polite">—</strong></div></div></div>`;}
function updateConversionUi(){
  const root=$('scr-calc'),input=root.querySelector('[data-conversion-input]');if(!input)return;
  const pace=conversionMode==='paceToSpeed';
  root.querySelector('[data-conversion-label]').textContent=pace?'Allure (min/km)':'Vitesse (km/h)';
  input.value=conversionInputs[conversionMode];input.placeholder=pace?'4’00':'15,00';input.inputMode=pace?'text':'decimal';
  root.querySelector('[data-conversion-output]').textContent=conversionResult(conversionMode,input.value);
}
function volumeChargeHtml(st,C){let h='';const valid=referenceErrors(st).length===0;
  if(valid&&Number.isFinite(st.vol)&&st.vol>0&&C&&C.weeks){const vols=C.weeks.map(w=>w.vol),mx=Math.max(...vols),avg=vols.reduce((a,x)=>a+x,0)/vols.length;
    h+=`<section class="calVolume" aria-label="Volume et charge"><h3>Volume et charge</h3><div class="kv" style="margin-bottom:.7rem"><span>Cible moyenne</span><span class="v">${fmtDur(st.vol)}</span><span>Moyenne réelle</span><span class="v">${fmtDur(avg)}</span></div><div class="vbars">`+
      C.weeks.map((w,i)=>`<div class="vbar"><span>S${i+1}</span>${zoneBar(w.z,w.vol,w.vol/mx*100)}<span class="v">${fmtDur(w.vol)}</span></div>`).join('')+
      '</div><div class="legend">'+Object.values(ZONES).map(z=>`<span style="--c:${z.c}">${z.lab}</span>`).join('')+'</div></section>';}
  return h;
}

const CHRONO_DISTANCES={fractions:[['100','100 m'],['200','200 m'],['300','300 m'],['400','400 m'],['500','500 m'],['600','600 m'],['800','800 m'],['1200','1200 m'],['1600','1600 m'],['2000','2000 m']],official:[['1500','1500 m'],['1609.344','Mile'],['3000','3000 m'],['5000','5000 m'],['10000','10 km'],['21097.5','Semi-marathon'],['42195','Marathon']]};
const chronoState={category:'fractions',distance:'400',free:'7,5',pace:'4:00',time:'40:00',mode:'pace'};
const enduranceState={distance:'10000',time:'41:00',vma:'',references:[{distance:'5000',scope:'endurance2',active:false},{distance:'21097.5',scope:'endurance3',active:false},{distance:'42195',scope:'endurance4',active:false}]};
function chronoSeconds(raw){const m=/^(\d+)[:'’](\d{2})$/.exec(String(raw).trim());return m&&+m[2]<60&&(+m[1]*60+(+m[2]))>0?+m[1]*60+(+m[2]):NaN;}
function chronoTime(seconds,hundredths=false){if(!Number.isFinite(seconds)||seconds<=0)return '—';const cs=Math.round(seconds*100);if(hundredths&&cs<6000)return Math.floor(cs/100)+'″'+String(cs%100).padStart(2,'0');const n=Math.round(seconds),h=Math.floor(n/3600),m=Math.floor(n%3600/60),sec=n%60;return(h?h+'h ':'')+(h?String(m).padStart(2,'0'):m)+'’'+String(sec).padStart(2,'0');}
function chronoMeters(){return chronoState.category==='free'?Number(chronoState.free.replace(',','.'))*1000:Number(chronoState.distance);}
function chronoTargetHtml(){const meters=chronoMeters();return Number.isFinite(meters)&&meters>0&&meters<=1000000?wheelPicker('chrono',String(meters),meters,''):'<span class="lbl">Renseigne une distance valide.</span>';}
function refreshChronoTarget(){const target=$('scr-calc').querySelector('[data-chrono-target]');if(target)target.innerHTML=chronoTargetHtml();}
function toolAttr(value){return String(value).replace(/[&"<>]/g,ch=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[ch]));}

const wheelSaved={chrono:{},endurance:{},endurance2:{},endurance3:{},endurance4:{},critical:{}};
function wheelSeconds(scope,key,meters,initial){const k=String(key);if(!Object.prototype.hasOwnProperty.call(wheelSaved[scope],k)){const t=initial?enduranceSeconds(initial):NaN;wheelSaved[scope][k]=Number.isFinite(t)&&t>0?t:meters===21097.5?3600:meters===42195?7200:0;}return wheelSaved[scope][k];}
function wheelDisplay(t,meters){const n=Math.round(t*100),h=Math.floor(n/360000),m=Math.floor(n%360000/6000),sec=Math.floor(n%6000/100),cs=n%100;return meters<=200?String(sec)+(cs?','+String(cs).padStart(2,'0'):'')+' s':meters<=5000?String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0'):String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
function wheelPicker(scope,key,meters,initial){
 const t=wheelSeconds(scope,key,meters,initial),cs=Math.round(t*100),short=meters>200&&meters<=5000;
 const values={h:Math.floor(cs/360000),m:Math.floor((short?cs:cs%360000)/6000),s:Math.floor(cs%6000/100),c:cs%100};
 const units=meters<=200?['s','c']:short?['m','s']:['h','m','s'];
 return '<div class="timeWheel simWheel" data-wheel-scope="'+scope+'" data-wheel-key="'+key+'" data-wheel-meters="'+meters+'">'+units.map(u=>{const max=u==='h'?23:u==='c'||u==='m'&&short?99:59;return '<label>'+{h:'h',m:'min',s:'sec',c:'cent.'}[u]+'<select data-wheel-unit-input="'+u+'" aria-label="'+{h:'Heures',m:'Minutes',s:'Secondes',c:'Centièmes'}[u]+'">'+Array.from({length:max+1},(_,i)=>'<option value="'+i+'"'+(i===values[u]?' selected':'')+'>'+String(i).padStart(2,'0')+'</option>').join('')+'</select></label>';}).join('')+'</div>';
}
function wheelSet(box,unit,value){
 const scope=box.dataset.wheelScope,key=box.dataset.wheelKey,meters=Number(box.dataset.wheelMeters),short=meters>200&&meters<=5000,max=unit==='h'?23:unit==='c'||unit==='m'&&short?99:59,n=Number(value);
 if(!Number.isInteger(n)||n<0||n>max)return;
 const cs=Math.round(wheelSeconds(scope,key,meters)*100),p={h:meters>5000?Math.floor(cs/360000):0,m:meters<=200?0:Math.floor((short?cs:cs%360000)/6000),s:Math.floor(cs%6000/100),c:meters<=200?cs%100:0};
 p[unit]=n;wheelSaved[scope][key]=p.h*3600+p.m*60+p.s+p.c/100;
 box.querySelectorAll('[data-wheel-unit-input]').forEach(select=>{select.value=String(p[select.dataset.wheelUnitInput]);});updateToolsUi();
}
function chronoToolHtml(){const c=chronoState;const options=CHRONO_DISTANCES[c.category]||[];const reverse=c.mode==='time';return `<div class="card chronoPanel" data-chrono-tool><h2 class="calcTitle"><span class="calcIcon calcIcon-chrono" aria-hidden="true"><svg viewBox="0 0 90 90" aria-hidden="true"><path d="M9 38h13M5 48h15M10 58h12" stroke="#a398d9" stroke-width="4" stroke-linecap="round"/><path d="M39 9h20M49 9v11" stroke="#7167ba" stroke-width="5" stroke-linecap="round"/><circle cx="49" cy="51" r="30" fill="none" stroke="#766bc1" stroke-width="4"/><path d="M49 51V31m0 20 12 8" stroke="#8176c8" stroke-width="4" fill="none" stroke-linecap="round"/></svg></span>Chrono</h2><div class="optSeg" role="group" aria-label="Sens du calcul"><button type="button" data-chrono-mode="pace" aria-pressed="${!reverse}">Allure</button><button type="button" data-chrono-mode="time" aria-pressed="${reverse}">Temps</button></div><div class="sf2"><label class="sf"><span>Distance</span><select data-chrono-category><option value="fractions"${c.category==='fractions'?' selected':''}>Fractions</option><option value="official"${c.category==='official'?' selected':''}>Officielles</option><option value="free"${c.category==='free'?' selected':''}>Libre</option></select></label><label class="sf"><span>${c.category==='free'?'Distance (km)':'Distance'}</span>${c.category==='free'?`<input data-chrono-free inputmode="decimal" value="${toolAttr(c.free)}">`:`<select data-chrono-distance>${options.map(([v,l])=>`<option value="${v}"${v===c.distance?' selected':''}>${l}</option>`).join('')}</select>`}</label></div><div class="sf2 calcResultRow">${reverse?`<div class="sf"><div data-chrono-target>${chronoTargetHtml()}</div></div>`:`<label class="sf"><span>Allure (min/km)</span><input data-chrono-pace inputmode="text" placeholder="4:00" value="${toolAttr(c.pace)}"></label>`}<div class="conversionResult"><span>${reverse?'Allure nécessaire':'Temps estimé'}</span><strong data-chrono-output role="status">—</strong><span class="lbl" data-chrono-speed></span></div></div><button type="button" class="cta ghost" data-chrono-to-endurance>Utiliser ce chrono pour l’indice d’endurance</button></div>`;}
const ENDURANCE_DISTANCES=[['5000','5 km'],['10000','10 km'],['21097.5','Semi-marathon'],['42195','Marathon']];
function enduranceDistanceOptions(distance){return ENDURANCE_DISTANCES.map(([v,l])=>`<option value="${v}"${distance===v?' selected':''}>${l}</option>`).join('');}
function enduranceReference(reference=null){const e=enduranceState,distance=reference?reference.distance:e.distance,meters=Number(distance),secs=wheelSeconds(reference?reference.scope:'endurance',distance,meters),v=Number((e.vma||String(readState().vma)).replace(',','.')),pct=meters/secs*3.6/v*100,ie=(pct-100)/Math.log(secs/360);return {distance,secs,ie:v>0&&Number.isFinite(secs)&&secs>360&&Number.isFinite(ie)?ie:null};}
function enduranceIndexText(r){return r.ie===null?'—':r.ie.toFixed(2).replace('.',',');}
function enduranceResultsHtml(){return [null,...enduranceState.references.filter(r=>r.active)].map(reference=>{const r=enduranceReference(reference),label=ENDURANCE_DISTANCES.find(([v])=>v===r.distance)?.[1]||'—';return `<span>${label} · ${chronoTime(r.secs)}</span><span class="v">IE : ${enduranceIndexText(r)}</span>`;}).join('');}
function enduranceExtraHtml(){let number=1;return enduranceState.references.map((r,i)=>r.active?`<div class="simSecond"><div class="settingsTitle"><b>${['Deuxième','Troisième','Quatrième'][number++-1]} chrono</b><button type="button" class="ghost" data-ie-remove="${i}">Supprimer</button></div><div class="sf2 calcResultRow"><label class="sf"><span>Performance</span><select data-ie-extra-distance="${i}">${enduranceDistanceOptions(r.distance)}</select></label><div class="sf">${wheelPicker(r.scope,r.distance,Number(r.distance),"")}</div></div></div>`:'').join('');}
function updateEnduranceUi(root){const e=root.querySelector('[data-endurance-tool]');if(!e)return;const output=e.querySelector('[data-ie-output]'),comparison=e.querySelector('[data-ie-comparison]');if(output)output.textContent=enduranceIndexText(enduranceReference());if(comparison)comparison.innerHTML=enduranceResultsHtml();}
function enduranceToolHtml(){const e=enduranceState,hasExtra=e.references.some(r=>r.active),canAdd=e.references.some(r=>!r.active);return `<div class="card chronoPanel" data-endurance-tool><h2 class="calcTitle"><span class="calcIcon calcIcon-endurance" aria-hidden="true"><svg viewBox="0 0 90 90" aria-hidden="true"><path d="M10 8v70h72" stroke="#897bce" stroke-width="4" fill="none" stroke-linecap="round"/><path d="m18 64 18-22 18 8 19-28" stroke="#8577c8" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g fill="#897bce"><circle cx="36" cy="42" r="6"/><circle cx="54" cy="50" r="6"/><circle cx="73" cy="22" r="6"/></g></svg></span>Indice d’endurance</h2><div class="sf2"><label class="sf"><span>VMA (km/h)</span><input data-ie-vma inputmode="decimal" value="${toolAttr(e.vma)}"></label><label class="sf"><span>Performance</span><select data-ie-distance>${enduranceDistanceOptions(e.distance)}</select></label></div>${hasExtra?`<div class="sf">${wheelPicker("endurance",e.distance,Number(e.distance),"")}</div>${enduranceExtraHtml()}<div class="kv" data-ie-comparison role="status" aria-live="polite">${enduranceResultsHtml()}</div>`:`<div class="sf2 calcResultRow"><div class="sf">${wheelPicker("endurance",e.distance,Number(e.distance),"")}</div><div class="conversionResult"><span>Indice d’endurance</span><strong data-ie-output role="status">—</strong></div></div>`}${canAdd?'<button type="button" class="addRef" data-ie-add>+ Ajouter un autre chrono de référence</button>':''}</div>`;}

const criticalState={mode:'free',count:2,free:[{d:'900',t:'3:00'},{d:'1650',t:'6:00'},{d:'3050',t:'12:00'}],fixed:['900','3050']};
function criticalToolHtml(){const c=criticalState,fixed=c.mode==='fixed';return `<div class="card chronoPanel" data-critical-tool><h2 class="calcTitle"><span class="calcIcon calcIcon-critical" aria-hidden="true"><svg viewBox="0 0 90 90" aria-hidden="true"><path d="M19 61c9-4 17-12 23-23l8-18c2-4 6-5 9-2l16 16c4 4 3 9-1 13L45 75c-4 4-9 6-15 6H15c-6 0-9-5-6-10l10-10Z" fill="#f9f8ff" stroke="#756bc0" stroke-width="4" stroke-linejoin="round"/><path d="m48 25 14 14M40 38l9 7m-14 0 9 7m-15 0 9 7M15 72h29c4 0 7-1 10-4l18-18" fill="none" stroke="#8f83cd" stroke-width="3" stroke-linecap="round"/><path d="M5 47h18M3 55h15M7 63h10" stroke="#9e92dc" stroke-width="4" stroke-linecap="round"/></svg></span>Vitesse critique</h2><div class="optSeg" role="group" aria-label="Protocole de vitesse critique"><button type="button" data-critical-mode="free" aria-pressed="${!fixed}">Libre</button><button type="button" data-critical-mode="fixed" aria-pressed="${fixed}">3’ / 12’</button></div>${fixed?`<div class="sf2">`+[180,720].map((t,i)=>`<label class="sf"><span>Distance en ${t/60} min (m)</span><input data-critical-fixed="${i}" inputmode="decimal" value="${toolAttr(c.fixed[i])}" placeholder="Distance en mètres"></label>`).join('')+`</div>`:`<label class="sf"><span>Nombre de tests</span><select data-critical-count><option value="2"${c.count===2?' selected':''}>2 tests</option><option value="3"${c.count===3?' selected':''}>3 tests</option></select></label>`+c.free.slice(0,c.count).map((v,i)=>`<div class="sf2"><label class="sf"><span>Test ${i+1} · distance (m)</span><input data-critical-distance="${i}" inputmode="decimal" value="${toolAttr(v.d)}"></label><div class="sf">${wheelPicker("critical",String(i),5000,v.t)}</div></div>`).join('')}<div class="sf2 calcResultRow"><div class="conversionResult"><span>Vitesse critique</span><strong data-critical-pace role="status">—</strong><span class="lbl" data-critical-vc>—</span></div><div class="conversionResult"><span>D′ (réserve de distance)</span><strong data-critical-dprime role="status">—</strong></div></div></div>`;}
function criticalCalculate(){const c=criticalState,parseDistance=x=>Number(String(x).trim().replace(',','.'));const p=c.mode==='fixed'?c.fixed.map((d,i)=>({d:parseDistance(d),t:i===0?180:720})):c.free.slice(0,c.count).map(x=>({d:parseDistance(x.d),t:wheelSeconds('critical',String(c.free.indexOf(x)),5000,x.t)}));if(p.some(x=>!Number.isFinite(x.d)||x.d<=0||!Number.isFinite(x.t)||x.t<=0)||new Set(p.map(x=>x.t)).size!==p.length)return null;const mt=p.reduce((a,x)=>a+x.t,0)/p.length,md=p.reduce((a,x)=>a+x.d,0)/p.length,den=p.reduce((a,x)=>a+(x.t-mt)**2,0);if(den<=0)return null;const vc=p.reduce((a,x)=>a+(x.t-mt)*(x.d-md),0)/den,dp=md-vc*mt;return vc>0&&dp>0&&Number.isFinite(vc)&&Number.isFinite(dp)?{vc,dp}:null;}
function updateCriticalUi(){const t=$('scr-calc').querySelector('[data-critical-tool]');if(!t)return;const r=criticalCalculate();t.querySelector('[data-critical-vc]').textContent=r?(r.vc*3.6).toFixed(2).replace('.',',')+' km/h':'—';t.querySelector('[data-critical-pace]').textContent=r?chronoTime(1000/r.vc)+' /km':'—';t.querySelector('[data-critical-dprime]').textContent=r?Math.round(r.dp)+' m':'—';}
function enduranceSeconds(value){const parts=String(value).trim().split(':');if(parts.length!==2&&parts.length!==3||parts.some(x=>!/^\d+$/.test(x)))return NaN;const p=parts.map(Number);if(parts.length===2&&p[1]>=60||parts.length===3&&(p[1]>=60||p[2]>=60))return NaN;return parts.length===2?p[0]*60+p[1]:p[0]*3600+p[1]*60+p[2];}
function updateToolsUi(){updateCriticalUi();const root=$('scr-calc');const t=root.querySelector('[data-chrono-tool]');if(t){const meters=chronoMeters(),reverse=chronoState.mode==='time',pace=reverse?NaN:chronoSeconds(chronoState.pace),secs=reverse?wheelSeconds('chrono',String(meters),meters):meters*pace/1000;const valid=Number.isFinite(meters)&&meters>0&&meters<=1000000&&Number.isFinite(secs)&&secs>0;const paceSeconds=valid?secs*1000/meters:NaN;t.querySelector('[data-chrono-output]').textContent=valid?(reverse?chronoTime(paceSeconds)+' /km':chronoTime(secs,true)):'—';t.querySelector('[data-chrono-speed]').textContent=valid&&reverse?(3600/paceSeconds).toFixed(2).replace('.',',')+' km/h':'';t.querySelector('[data-chrono-to-endurance]').disabled=!valid||!['5000','10000','21097.5','42195'].includes(String(meters));}updateEnduranceUi(root);}
$('scr-calc').addEventListener('input',e=>{if(e.target.matches('[data-wheel-unit-input]')){wheelSet(e.target.closest('[data-wheel-scope]'),e.target.dataset.wheelUnitInput,e.target.value);return;}const d=e.target.dataset;if(d.chronoPace!==undefined)chronoState.pace=e.target.value;else if(d.chronoTime!==undefined)chronoState.time=e.target.value;else if(d.chronoFree!==undefined){chronoState.free=e.target.value;refreshChronoTarget();}else if(d.ieVma!==undefined)enduranceState.vma=e.target.value;else if(d.ieTime!==undefined)enduranceState.time=e.target.value;else if(d.criticalFixed!==undefined)criticalState.fixed[Number(d.criticalFixed)]=e.target.value;else if(d.criticalDistance!==undefined)criticalState.free[Number(d.criticalDistance)].d=e.target.value;else if(d.criticalTime!==undefined)criticalState.free[Number(d.criticalTime)].t=e.target.value;else return;updateToolsUi();});
$('scr-calc').addEventListener('change',e=>{const d=e.target.dataset;if(d.wheelUnitInput!==undefined){wheelSet(e.target.closest('[data-wheel-scope]'),d.wheelUnitInput,e.target.value);return;}if(d.chronoCategory!==undefined){chronoState.category=e.target.value;chronoState.distance=e.target.value==='official'?'5000':'400';renderApp();}else if(d.chronoDistance!==undefined){chronoState.distance=e.target.value;renderApp();}else if(d.ieDistance!==undefined){enduranceState.distance=e.target.value;renderApp();}else if(d.ieExtraDistance!==undefined){const r=enduranceState.references[Number(d.ieExtraDistance)];if(r)r.distance=e.target.value;renderApp();}else if(d.criticalCount!==undefined){criticalState.count=Number(e.target.value);renderApp();}});
$('scr-calc').addEventListener('click',e=>{if(e.target.closest('[data-ie-add]')){const r=enduranceState.references.find(r=>!r.active);if(r){const used=[enduranceState.distance,...enduranceState.references.filter(r=>r.active).map(r=>r.distance)];if(used.includes(r.distance))r.distance=ENDURANCE_DISTANCES.find(([d])=>!used.includes(d))?.[0]||r.distance;r.active=true;}renderApp();return;}const removeIe=e.target.closest('[data-ie-remove]');if(removeIe){const r=enduranceState.references[Number(removeIe.dataset.ieRemove)];if(r)r.active=false;renderApp();return;}const criticalButton=e.target.closest('[data-critical-mode]');if(criticalButton){criticalState.mode=criticalButton.dataset.criticalMode;renderApp();return;}const modeButton=e.target.closest('[data-chrono-mode]');if(modeButton){chronoState.mode=modeButton.dataset.chronoMode;renderApp();return;}if(!e.target.closest('[data-chrono-to-endurance]'))return;const meters=chronoMeters(),secs=chronoState.mode==='time'?wheelSeconds('chrono',String(meters),meters):meters*chronoSeconds(chronoState.pace)/1000;if(!['5000','10000','21097.5','42195'].includes(String(meters))||!Number.isFinite(secs))return;enduranceState.distance=String(meters);{const n=Math.round(secs),hh=Math.floor(n/3600),mm=Math.floor(n%3600/60),ss=n%60;enduranceState.time=hh?`${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`:`${mm}:${String(ss).padStart(2,'0')}`;wheelSaved.endurance[String(meters)]=n;}renderApp();});

// Independent scratch calculator: never writes to plans or athlete references.
const LOAD_PRESETS=[['jogg','Jogg’'],['ea','EA'],['s1','Seuil 1'],['s2','Seuil 2'],['as42','AS42'],['as21','AS21'],['as10','AS10'],['as5','AS5'],['vma100','100 % VMA'],['vma105','105 % VMA'],['vma110','110 % VMA'],['manual','Allure manuelle']];
const loadToolState={blocks:[{minutes:'30',pace:'jogg',manual:'5:00',unit:'pace'}]};
const loadCurveState={selected:'s2'};
function loadCurveChart(model,kind,width){
 if(!model)return '';
 const duration=kind==='duration',points=model.points.filter(p=>!duration||p.time!==null),w=Math.max(280,width||560),h=260,L=48,R=16,T=20,B=48;
 const xs=points.map(p=>duration?p.time:p.speed/model.vma*100),ys=points.map(p=>duration?p.speed/model.vma*100:p.factor).filter(Number.isFinite);
 const xmin=duration?Math.min(6,...xs):Math.floor(Math.min(...xs)/10)*10,xmax=duration?Math.max(240,...xs):Math.max(110,Math.ceil(Math.max(...xs)/10)*10),ymin=duration?Math.floor(Math.min(...ys)/10)*10:0,ymax=duration?Math.ceil(Math.max(...ys)/10)*10:Math.max(1.6,...ys);
 const X=x=>L+(duration?Math.log(x/xmin)/Math.log(xmax/xmin):(x-xmin)/(xmax-xmin))*(w-L-R),Y=y=>h-B-(y-ymin)/(ymax-ymin)*(h-T-B);
 const tx=duration?[6,30,60,240]:[xmin,80,100,110].filter((v,i,a)=>v>=xmin&&a.indexOf(v)===i),ty=duration?[ymin,(ymin+ymax)/2,ymax]:[0,.6,1,1.5];
 const grid=tx.map(v=>`<path d="M${X(v)} ${T}V${h-B}"/><text x="${X(v)}" y="${h-B+18}" text-anchor="${v===xmax?'end':'middle'}">${v}</text>`).join('')+ty.map(v=>`<path d="M${L} ${Y(v)}H${w-R}"/><text x="${L-7}" y="${Y(v)+4}" text-anchor="end">${String(Math.round(v*100)/100).replace('.',',')}</text>`).join('');
 const line=duration?model.points.filter(p=>['s1','s2','vma100'].includes(p.key)).sort((a,b)=>a.time-b.time):model.curve;
 const path=line.map((p,i)=>`${i?'L':'M'}${X(duration?p.time:p.speed/model.vma*100)} ${Y(duration?p.speed/model.vma*100:p.factor)}`).join(' ');
 const marks=points.filter(p=>duration||p.factor!==null).map(p=>`<${p.race?'circle':'rect'} ${p.race?`cx="${X(duration?p.time:p.speed/model.vma*100)}" cy="${Y(duration?p.speed/model.vma*100:p.factor)}" r="${p.key===loadCurveState.selected?6:4}"`:`x="${X(duration?p.time:p.speed/model.vma*100)-4}" y="${Y(duration?p.speed/model.vma*100:p.factor)-4}" width="8" height="8"`} class="${p.race?'loadRaceMark':'loadAnchorMark'}"><title>${p.label}</title></${p.race?'circle':'rect'}>`).join('');
 return `<svg class="loadCurveSvg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${duration?'Allure en pourcentage de VMA selon la durée de maintien, échelle logarithmique':'Coefficient personnalisé selon le pourcentage de VMA'}"><g class="loadChartGrid">${grid}</g><path class="loadChartLine" d="${path}"/>${marks}${points.filter(p=>p.key===loadCurveState.selected&&(duration||p.factor!==null)).map(p=>`<circle class="loadSelectedMark" cx="${X(duration?p.time:p.speed/model.vma*100)}" cy="${Y(duration?p.speed/model.vma*100:p.factor)}" r="9"/><text x="${Math.min(w-R-36,Math.max(L+18,X(duration?p.time:p.speed/model.vma*100)))}" y="${Math.min(h-B-8,Math.max(T+16,Y(duration?p.speed/model.vma*100:p.factor)-14))}" text-anchor="middle">${p.label}</text>`).join('')}<text x="${L}" y="13">${duration?'Allure (% VMA)':'Coefficient (point/min)'}</text><text x="${(L+w-R)/2}" y="${h-5}" text-anchor="middle">${duration?'Maintien (min) · échelle logarithmique':'Allure (% VMA)'}</text></svg>`;
}
function loadCurveHtml(model,width){
 if(!model)return '<p class="lbl">Renseigne tes repères pour afficher les courbes.</p>';
 const points=model.points.map(p=>({...p,factor:programLoadFactor(p.speed,model.referenceState,model)}));model={...model,points,curve:(model.conflicts.length?points.filter(p=>!p.race):points).sort((a,b)=>a.speed-b.speed)};
 const selected=model.points.find(p=>p.key===loadCurveState.selected)||model.points[0];
 return `<h3>Allure et durée de maintien</h3>${loadCurveChart(model,'duration',width)}<h3>Coefficient de charge personnalisé</h3>${loadCurveChart(model,'factor',width)}<p class="lbl">Carrés : hypothèses fixes · ronds : chronos estimés.</p><div class="loadCurveChoices" role="group" aria-label="Repère à examiner">${model.points.map(p=>`<button type="button" class="ghost" data-load-point="${p.key}" aria-pressed="${p.key===selected.key}">${p.label}</button>`).join('')}</div><p class="lbl" role="status">${selected.label} · ${fmtPace(selected.speed)}/km · ${(selected.speed/model.vma*100).toFixed(1).replace('.',',')} % VMA · ${selected.time===null?'maintien non défini':loadToolNumber(selected.time)+' min de maintien'} · ${selected.factor===null?'coefficient hors modèle':'coefficient '+selected.factor.toFixed(2).replace('.',',')}</p>${model.issues.map(s=>`<p class="lbl" role="alert">${s}</p>`).join('')}<details><summary>Valeurs de tous les repères</summary><div class="loadCurveTable"><table><thead><tr><th>Allure</th><th>min/km</th><th>Maintien (min)</th><th>Coeff.</th></tr></thead><tbody>${model.points.map(p=>`<tr><th>${p.label}</th><td>${fmtPace(p.speed)}</td><td>${p.time===null?'—':loadToolNumber(p.time)}</td><td>${p.factor===null?'—':p.factor.toFixed(2).replace('.',',')}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function loadToolReferences(){
 const st={...readState()};
 if(![st.vma,st.s1lo,st.s1hi,st.s2].every(v=>Number.isFinite(v)&&v>0)||st.s1lo>st.s1hi||st.s1hi>=st.s2||st.s2>=st.vma)return null;
 const p=predict(st);st.v5=p?.[0]?.v;st.v10=p?.[1]?.v;return{st,p};
}
function loadToolBlock(block,refs){
 const minutes=Number(String(block.minutes).trim().replace(',','.'));
 if(!refs||!Number.isFinite(minutes)||minutes<=0)return null;
 const {st,p}=refs;let speed;
 if(block.pace==='manual'){
  if(block.unit==='speed')speed=Number(String(block.manual).trim().replace(',','.'));
  else {const m=/^(\d+):([0-5]\d)$/.exec(String(block.manual).trim());speed=m?3600/(Number(m[1])*60+Number(m[2])):NaN;}
 }else if(block.pace==='jogg')speed=st.s1lo*RULES.load.anchors.easyOfS1Low;
 else if(block.pace==='ea'){const b=efBand('active',st);speed=(b[0]+b[1])/2;}
 else if(block.pace==='s1')speed=lt1Ref(st);
 else if(block.pace==='s2')speed=st.s2;
 else if(block.pace.startsWith('as'))speed=p?.[{as42:3,as21:2,as10:1,as5:0}[block.pace]]?.v;
 else if(['vma100','vma105','vma110'].includes(block.pace))speed=st.vma*Number(block.pace.slice(3))/100;
 if(!Number.isFinite(speed)||speed<=0)return null;
 const factor=programLoadFactor(speed,st,loadPersonalModel(refs)),points=minutes*factor;
 return Number.isFinite(points)?{minutes,speed,factor,points}:null;
}
const loadToolNumber=n=>n.toFixed(1).replace('.',',');
function loadToolResults(){
 const refs=loadToolReferences(),model=loadPersonalModel(refs),blocks=loadToolState.blocks.map(b=>loadToolBlock(b,refs));
 return{refs,model,blocks,total:blocks.every(Boolean)?blocks.reduce((sum,b)=>sum+b.points,0):null,minutes:blocks.every(Boolean)?blocks.reduce((sum,b)=>sum+b.minutes,0):null};
}
function updateLoadCurveUi(){const el=$('scr-calc').querySelector('[data-load-curve]');if(el){const restore=globalThis.document?.activeElement?.dataset?.loadPoint;el.innerHTML=loadCurveHtml(loadPersonalModel(loadToolReferences()),el.clientWidth);if(restore)el.querySelector?.('[aria-pressed="true"]')?.focus();}}
globalThis.addEventListener?.('resize',()=>{if(appTab==='calc')updateLoadCurveUi();});
$('scr-calc').addEventListener('toggle',e=>{if(e.target.open&&e.target.querySelector?.('[data-load-curve]'))updateLoadCurveUi();},true);
function updateLoadToolUi(){
 const root=$('scr-calc').querySelector('[data-load-tool]');if(!root)return;
 const r=loadToolResults();
 root.querySelector('[data-load-total]').textContent=r.total===null?'—':loadToolNumber(r.total)+' pts';
 root.querySelector('[data-load-duration]').textContent=r.minutes===null?'':loadToolNumber(r.minutes)+' min au total';
 root.querySelector('[data-load-message]').textContent=!r.refs?'Renseigne des repères VMA, S1 et S2 cohérents dans Repères.':r.total===null?'Renseigne une durée et une allure valides pour chaque bloc.':r.model.issues.length?'Repères spécifiques incompatibles ou hors plage : repli sur les ancrages S1/S2/VMA.':r.blocks.some(b=>b.speed>r.refs.st.vma*1.1+1e-8)?'Au-delà de 110 % VMA : coefficient historique de prudence, hors de la courbe personnalisée.':'Même calcul de charge que le programme.';
 root.querySelectorAll('[data-load-result]').forEach(el=>{const b=r.blocks[Number(el.dataset.loadResult)];el.textContent=b?`${fmtPace(b.speed)} /km · × ${b.factor.toFixed(2).replace('.',',')} = ${loadToolNumber(b.points)} pts`:'Renseigne une durée et une allure valides.';});
}
function loadToolHtml(){return `<div class="card chronoPanel" data-load-tool><h2 class="calcTitle">Charge d’entraînement</h2><p class="lbl">Construis ta séance bloc par bloc, échauffement et retour au calme compris.</p>${loadToolState.blocks.map((b,i)=>`<div class="loadToolBlock"><div class="settingsTitle"><b>Bloc ${i+1}</b>${loadToolState.blocks.length>1?`<button type="button" class="ghost" data-load-remove="${i}" aria-label="Supprimer le bloc ${i+1}">Supprimer</button>`:''}</div><div class="sf2"><label class="sf"><span>Durée (min)</span><input data-load-index="${i}" data-load-field="minutes" inputmode="decimal" value="${toolAttr(b.minutes)}" placeholder="30"></label><label class="sf"><span>Allure</span><select data-load-index="${i}" data-load-field="pace">${LOAD_PRESETS.map(([v,l])=>`<option value="${v}"${b.pace===v?' selected':''}>${l}</option>`).join('')}</select></label></div>${b.pace==='manual'?`<div class="sf2"><label class="sf"><span>Unité</span><select data-load-index="${i}" data-load-field="unit"><option value="pace"${b.unit==='pace'?' selected':''}>min/km</option><option value="speed"${b.unit==='speed'?' selected':''}>km/h</option></select></label><label class="sf"><span>${b.unit==='speed'?'Vitesse (km/h)':'Allure (mm:ss/km)'}</span><input data-load-index="${i}" data-load-field="manual" inputmode="${b.unit==='speed'?'decimal':'text'}" value="${toolAttr(b.manual)}" placeholder="${b.unit==='speed'?'12':'5:00'}"></label></div>`:''}<p class="lbl loadBlockResult" data-load-result="${i}" role="status">—</p></div>`).join('')}<button type="button" class="addRef" data-load-add>+ Ajouter un bloc</button><div class="conversionResult"><span>Charge totale</span><strong data-load-total role="status" aria-live="polite">—</strong></div><p class="lbl" data-load-duration></p><p class="lbl" data-load-message></p><details class="loadMethod" open><summary>Courbes personnalisées</summary><div data-load-curve></div></details><details class="loadMethod"><summary>Comprendre le calcul</summary><p class="lbl">Modèle personnalisé, hypothèses Planif : Jogg’ 0,20 ; S1 240 min et 0,30 ; S2 60 min et 0,60 ; 100 % VMA 6 min et 1,00. Les coefficients spécifiques sont interpolés selon le logarithme du chrono estimé, entre 6 min, 60 min et 240 min. Hors de cette plage, aucun coefficient n’est extrapolé dans le temps : repli explicite sur les ancrages en vitesse.</p><p class="lbl">À 105 % VMA : 1,20 ; à 110 % : 1,50, avec interpolation linéaire entre 100, 105 et 110 %. Pour EA et l’allure manuelle, interpolation en vitesse entre les points personnalisés ; sous Jogg’, plancher 0,20 ; au-delà de 110 %, coefficient historique de prudence, hors de la courbe personnalisée. En cas de contradiction, le programme et ce calculateur utilisent les seuls ancrages S1/S2/VMA, avec un avertissement.</p><p class="lbl">Le maintien est une hypothèse d’effort continu, distincte des minutes réellement courues dans le bloc. Au-dessus de 100 % VMA, aucun maintien n’est déduit. Les points ne comportent pas de majoration liée à la densité du fractionné. Ces choix ne sont pas une formule validée de Daniels.</p><p class="lbl">Chaque bloc vaut sa durée en minutes multipliée par son coefficient. Les récupérations courues, l’échauffement et le retour au calme sont comptés comme des blocs faciles à 0,20 point/minute.</p><p class="lbl">Compte aussi l’échauffement, les récupérations courues et le retour au calme. Ces points sont des repères de suivi, pas une mesure physiologique ni une équivalence exacte de fatigue. Le programme utilise le modèle personnalisé. L’ancienne charge reste un indicateur interne de sécurité pour les formats et la récupération.</p><p class="lbl">Source : Jack Daniels, <a href="https://www.human-kinetics.co.uk/9781718203662/daniels-running-formula/" target="_blank" rel="noopener noreferrer">Daniels’ Running Formula, 4e édition</a>, chapitre 4.</p></details></div>`;}
$('scr-calc').addEventListener('input',e=>{const {loadIndex,loadField}=e.target.dataset;if(!['minutes','manual'].includes(loadField))return;const b=loadToolState.blocks[Number(loadIndex)];if(!b)return;b[loadField]=e.target.value;updateLoadToolUi();});
$('scr-calc').addEventListener('change',e=>{const {loadIndex,loadField}=e.target.dataset;if(!['pace','unit'].includes(loadField))return;const b=loadToolState.blocks[Number(loadIndex)];if(!b)return;if(loadField==='pace'&&!LOAD_PRESETS.some(([key])=>key===e.target.value))return;if(loadField==='unit'){if(!['pace','speed'].includes(e.target.value))return;const speed=loadToolBlock({...b,minutes:'1'},loadToolReferences())?.speed;const seconds=speed?Math.round(3600/speed):0;b.manual=speed?(e.target.value==='speed'?String(Math.round(speed*100)/100):`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`):'';}b[loadField]=e.target.value;renderApp();});
$('scr-calc').addEventListener('click',e=>{const point=e.target.closest('[data-load-point]');if(point){loadCurveState.selected=point.dataset.loadPoint;updateLoadCurveUi();return;}if(e.target.closest('[data-load-add]')){loadToolState.blocks.push({minutes:'10',pace:'jogg',manual:'5:00',unit:'pace'});renderApp();return;}const remove=e.target.closest('[data-load-remove]');if(remove&&loadToolState.blocks.length>1){const i=Number(remove.dataset.loadRemove);if(Number.isInteger(i)&&i>=0&&i<loadToolState.blocks.length){loadToolState.blocks.splice(i,1);renderApp();}}});

function syncedHrZonesHtml(){return '';}
function heartRatePanelHtml(){
  const z=globalThis.PlanifStrava?.heartRateZones?.();
  const rows=z?[['Z1','0–'+z.z1Max],['Z2',(z.z1Max+1)+'–'+z.z2Max],['Z3',(z.z2Max+1)+'–'+z.z3Max],['Z4',(z.z3Max+1)+'–'+z.z4Max],['Z5','≥ '+(z.z4Max+1)]]:[];
  const box=(name,value)=>`<label class="sf"><span>${name}</span><input type="text" value="${value??'—'}" disabled aria-label="${name} synchronisée depuis Flow Strava"></label>`;
  return `<div class="hrStravaPanel"><h3>Zones de FC</h3><p class="lbl">${z?'Synchronisées depuis Flow Strava · lecture seule.':'Connecte Flow Strava pour récupérer les zones de FC.'}</p><div class="physioHr">${fText('FC repos','hrMin','numeric')}${fText('FC max','hrMax','numeric')}${box('Z1 max',z?.z1Max)}${box('Z2 max',z?.z2Max)}${box('Z3 max',z?.z3Max)}${box('Z4 max',z?.z4Max)}</div>${rows.length?`<div class="hrStravaRows">${rows.map(([name,range])=>`<div><strong>${name}</strong><span>${range} bpm</span></div>`).join('')}</div><p class="lbl">Z2 : endurance active · Z3 : S1/tempo · Z4 : S2 · Z5 : au-dessus du S2.</p>`:`<p class="lbl">En attendant la connexion, les plafonds locaux restent utilisés pour les séances.</p><div class="physioHr">${fText('Plafond EF','lt1Hr','numeric')}${fText('Plafond S2','lt2Hr','numeric')}</div>`}</div>`;
}
function appRefHtml(){
  const st=readState(),C=lastPlan,valid=referenceErrors(st).length===0,pred=valid?predict(st):null;
  const c=(lab,v,sub)=>`<div class="card"><div class="lbl">${lab}</div><div class="big"><strong>${fmtPace(v)}/km</strong></div><div class="lbl">(${sub||fmtSpd(v)+' km/h'})</div></div>`;
  let h=`<div class="refOverview">${refEditHtml('Repères et zones','physio',physioFieldsHtml())}${valid?`<div class="refgrid">${c('Premier seuil',(st.s1lo+st.s1hi)/2,`${fmtSpd(st.s1lo)} à ${fmtSpd(st.s1hi)} km/h`)}${c('Second seuil',st.s2)}${c('VMA',st.vma)}</div>`:'<p class="lbl">Complète S1, S2 et VMA avec le crayon pour afficher tes zones.</p>'}</div>`;
  if(refPlanPending&&activePlan)h+='<div class="card" role="status"><p>Les références sont enregistrées, mais le programme existant est conservé.</p><button type="button" class="cta" data-ref-apply>Appliquer aux séances futures non réalisées</button></div>';
  h+=`<div class="card chronoCard panelCard chronoPanel">${panelArt('chrono')}${refEditHtml('Chronos estimés','chrono',chronoFieldsHtml())}${pred?'<div class="kv">'+pred.map(p=>`<span class="${p.isRef?'predRef predRefLabel':''}">${p.lab}${p.isRef?' (réf.)':''}</span><span class="v${p.isRef?' predRef predRefValue':''}">${fmtTime(p.t)}, ${paceHtml(kmh(p.v,p.v))}</span>`).join('')+'</div>':'<p class="lbl">Complète ton chrono de référence pour afficher les estimations.</p>'}</div>`;
  
  h+=`<button type="button" class="libEntry libVisual" data-openlib="1" style="margin-top:.8rem">${homeArt('track')}<span class="libCopy">Bibliothèque de séances<small>Tous les formats par qualité et par type, calculés avec tes repères</small></span><span class="libArrow" aria-hidden="true">›</span></button>`;
  return h;
}
const sim={dist:'1',time:'41:00',profile:'1',penalty:true,ref2Open:false,ref2Dist:'0',ref2Time:'20:00'};
function simWheel(key,dist){const sec=parseTime(sim[key])||0,long=Number(dist)>=2,h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),ss=Math.floor(sec%60),range=(max,v)=>Array.from({length:max+1},(_,i)=>'<option value="'+i+'"'+(i===v?' selected':'')+'>'+String(i).padStart(2,'0')+'</option>').join('');return '<div class="timeWheel simWheel" data-sim-wheel="'+key+'">'+(long?'<label>h<select data-sim-part="h">'+range(9,h)+'</select></label>':'')+'<label>min<select data-sim-part="m">'+range(long?59:99,m)+'</select></label><label>sec<select data-sim-part="s">'+range(59,ss)+'</select></label></div>';}
function simPred(){const st=readState(),sec=parseTime(sim.time),sec2=sim.ref2Open?parseTime(sim.ref2Time):0;if(!Number.isFinite(sec)||sec<=0)return null;return predict({...st,refDist:Number(sim.dist),refTime:sec,profile:Number(sim.profile),penalty:sim.penalty,ref2Dist:Number(sim.ref2Dist),ref2Time:sec2});}
function simResults(){const p=simPred();return p?p.map(x=>'<span>'+x.lab+(x.isRef?' (réf.)':'')+'</span><span class="v">'+fmtTime(x.t)+', '+paceHtml(kmh(x.v,x.v))+'</span>').join(''):'<span>Chrono invalide</span>';}
function appCalcHtml(){const options=(current)=>[['0','5 km'],['1','10 km'],['2','Semi-marathon'],['3','Marathon']].map(([v,l])=>'<option value="'+v+'"'+(current===v?' selected':'')+'>'+l+'</option>').join('');return '<div class="card chronoCard simCard"><h2 class="calcTitle"><span class="calcIcon calcIcon-sim" aria-hidden="true"><svg viewBox="0 0 90 90" aria-hidden="true"><path d="M8 74 31 50 46 60 79 15M61 15h18v18" stroke="#6f65b8" stroke-width="6" fill="none" stroke-linejoin="round"/><circle cx="21" cy="25" r="13" fill="none" stroke="#8075c3" stroke-width="3"/><path d="M21 25V16m0 9 7 4M15 7h12" stroke="#8075c3" stroke-width="3" fill="none"/><circle cx="62" cy="67" r="13" fill="none" stroke="#8075c3" stroke-width="3"/><path d="M62 67V58m0 9 6 4M56 49h12" stroke="#8075c3" stroke-width="3" fill="none"/></svg></span>Simulateur de chronos</h2><div class="chronoRefRow"><label class="sf"><span>Distance</span><select data-sim-dist>'+options(sim.dist)+'</select></label><label class="sf"><span>Profil</span><select data-sim-profile>'+PROFILES.map((p,i)=>'<option value="'+i+'"'+(sim.profile===String(i)?' selected':'')+'>'+p.lab+'</option>').join('')+'<option value="5"'+(sim.profile==='5'?' selected':'')+'>Mesuré</option></select></label></div>'+simWheel('time',sim.dist)+'<label class="sw simPenalty"><input type="checkbox" data-sim-penalty'+(sim.penalty?' checked':'')+'><span>Palier semi vers marathon pénalisé</span></label>'+(sim.ref2Open?'<div class="simSecond"><div class="settingsTitle"><b>Deuxième chrono</b><button type="button" class="ghost" data-sim-remove>Supprimer</button></div><label class="sf"><span>Distance</span><select data-sim-dist2>'+options(sim.ref2Dist)+'</select></label>'+simWheel('ref2Time',sim.ref2Dist)+'</div>':'<button type="button" class="addRef" data-sim-add>+ Ajouter un autre chrono de référence</button>')+'<div class="kv" data-sim-result>'+simResults()+'</div></div>'+conversionHtml()+chronoToolHtml()+enduranceToolHtml()+criticalToolHtml()+loadToolHtml();}
/* ---------- Études : bibliothèque scientifique ---------- */
let studyFilter='Toutes',studyScope='engine';
function studyEvidenceHtml(sourceId){
  const findings=FINDINGS.filter(f=>f.sourceId===sourceId);
  if(!findings.length)return '';
  return '<p><b>Résultats et liens Planif</b></p>'+findings.map(f=>{
    const rules=Object.entries(RULE_META).filter(([,m])=>m.findings.includes(f.id)).map(([id])=>id);
    return `<p><b>${f.id} · ${QUESTIONS[f.questionId].text}</b><br>${f.statement}</p><p><b>Portée :</b> ${f.directness.population} ${f.directness.outcome}</p><p><b>Règles liées :</b> ${rules.length?rules.map(id=>`<code style="overflow-wrap:anywhere">${id}</code>`).join(', '):'Question documentée, sans règle correspondante dans le moteur.'}</p>`;
  }).join('');
}
function appStudyHtml(){
  const scoped=SOURCES.filter(x=>studyScope==='all'||sourceScope(x.id)===studyScope);
  const themes=['Toutes',...Array.from(new Set(scoped.flatMap(x=>x.themes||[]))).sort()];
  const rows=studyFilter==='Toutes'?scoped:scoped.filter(x=>(x.themes||[]).includes(studyFilter));
  let h='<div class="card panelCard studyIntro">'+panelArt('science')+'<div class="big" style="font-size:1.65rem">'+SOURCES.length+' publications</div><p class="lbl">Références vérifiées utilisées pour documenter ou challenger les règles de Planif. Les choix purement heuristiques restent identifiés comme tels dans l’audit.</p></div>';
  h+='<div class="studyFilters" role="group" aria-label="Portée des publications">'+[['engine','Moteur'],['context','Contexte'],['all','Toutes']].map(([v,label])=>`<button type="button" data-studyscope="${v}" aria-pressed="${v===studyScope}">${label} (${v==='all'?SOURCES.length:SOURCES.filter(x=>sourceScope(x.id)===v).length})</button>`).join('')+'</div><p class="lbl">Contexte : connaissances complémentaires, sans prescription correspondante dans le moteur. Les liens éventuels restent indirects.</p>';
  h+='<div class="studyFilters">'+themes.map(t=>`<button type="button" data-studyfilter="${t}" aria-pressed="${t===studyFilter}">${t}</button>`).join('')+'</div>';
  h+=rows.map(x=>`<article class="card studyCard"><div class="lbl">${x.authors[0]} et al., ${x.year}</div><h2>${x.title}</h2><div class="studyMeta"><span>${scopeLabel(x.id)}</span><span>${x.studyType}</span><span>${x.journal}</span>${x.population&&x.population.n?'<span>n = '+x.population.n+'</span>':''}</div><p><b>Ce qu’on retient :</b> ${x.result}</p><details class="info"><summary>ⓘ Limites et référence</summary><p>${x.limitations}</p>${studyEvidenceHtml(x.id)}<p>DOI : ${x.doi}</p><p><a href="${x.url}" target="_blank" rel="noopener">Ouvrir la publication</a></p></details></article>`).join('');
  return h;
}

/* ---------- Réglages (v9.2) : contrôles reliés aux champs existants, une seule source de vérité ---------- */
let setBuilt=false,lastCalError=null,ref2Open=!!$('ref2Time').value;
const escA=v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const fText=(lab,id,mode)=>`<label class="sf"><span>${lab}</span><input data-bind="${id}" value="${escA($(id).value)}" inputmode="${mode||'text'}" autocomplete="off"></label>`;
const fDate=(lab,id)=>`<label class="sf"><span>${lab}</span><input type="date" data-bind="${id}" value="${escA($(id).value)}"></label>`;
const fSel=(lab,id)=>`<label class="sf"><span>${lab}</span><select data-bind="${id}">${$(id).innerHTML}</select></label>`;
const fSw=(lab,id)=>`<label class="sw"><input type="checkbox" data-bind="${id}"${$(id).checked?' checked':''}><span>${lab}</span></label>`;
const info=(t,body)=>`<details class="info"><summary>ⓘ ${t}</summary>${body.map(p=>`<p>${p}</p>`).join('')}</details>`;
const opt=(v,cur)=>`<option value="${v}"${v===cur?' selected':''}>${String(v).padStart(2,'0')}</option>`;
function timeWheelHtml(target,dist){
  const sec=parseTime($(target).value)||0,h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),ss=Math.floor(sec%60),long=+dist>=2;
  const range=(a,b,cur)=>Array.from({length:b-a+1},(_,i)=>opt(a+i,cur)).join('');
  return `<div class="timeWheel" data-time-target="${target}" data-time-long="${long?'1':'0'}">`+
    (long?`<label>h<select data-timepart="h">${range(0,9,h)}</select></label>`:'')+
    `<label>min<select data-timepart="m">${range(0,long?59:99,m)}</select></label><label>sec<select data-timepart="s">${range(0,59,ss)}</select></label></div>`;
}
/* Conversion de saisie uniquement : le moteur conserve ses repères en km/h. */
let speedUnit='kmh';try{if(localStorage.getItem('planif-speed-unit')==='pace')speedUnit='pace';}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}
function speedInputValue(id){
  const ids=id==='s1'?['s1lo','s1hi']:[id];
  return ids.map(key=>{const v=num($(key).value);if(!Number.isFinite(v)||v<=0)return '';
    if(speedUnit==='kmh')return String(Math.round(v*1000)/1000).replace('.',',');
    const seconds=Math.round(3600/v);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  }).join('–');
}
function parseSpeedValue(text,unit){
  const value=String(text).trim();
  if(unit==='kmh'){if(!/^\d+(?:[.,]\d+)?$/.test(value))return null;const v=num(value);return v>0&&Number.isFinite(v)?v:null;}
  const m=/^(\d+)[:'’](\d{2})$/.exec(value);if(!m||+m[2]>=60)return null;
  const seconds=+m[1]*60+(+m[2]);return seconds>0?3600/seconds:null;
}
function speedField(label,id){return `<label class="sf"><span>${label}</span><input data-speed="${id}" value="${escA(speedInputValue(id))}" inputmode="${speedUnit==='kmh'&&id!=='s1'?'decimal':'text'}" autocomplete="off" aria-label="${label}, ${speedUnit==='pace'?'min/km':'km/h'}"></label>`;}
function commitSpeedInput(input){
  const id=input.dataset.speed,parts=input.value.trim().split(/\s*(?:–|—|-|à)\s*/);
  const values=parts.map(x=>parseSpeedValue(x,speedUnit)),valid=(id==='s1'?parts.length<=2:parts.length===1)&&values.every(v=>v!==null);
  input.setCustomValidity(valid?'':speedUnit==='pace'?'Saisis une allure min:sec, par exemple 5:13.':'Saisis une vitesse positive en km/h.');
  if(!valid)return false;
  if(id==='s1'){const low=Math.min(...values),high=Math.max(...values);$('s1lo').value=String(low);$('s1hi').value=String(high);}else $(id).value=String(values[0]);
  $('f').dispatchEvent(new Event('input'));return true;
}
function syncSpeedInputs(){document.querySelectorAll('#scr-ref [data-speed]').forEach(input=>{input.value=speedInputValue(input.dataset.speed);input.setCustomValidity('');input.setAttribute('inputmode',speedUnit==='kmh'&&input.dataset.speed!=='s1'?'decimal':'text');input.setAttribute('aria-label',`${input.dataset.speed==='s1'?'S1':input.dataset.speed==='s2'?'S2':'VMA'}, ${speedUnit==='pace'?'min/km':'km/h'}`);});}
function chronoFieldsHtml(){
  let h=`<div class="chronoRefRow">${fSel('Distance','refDist')}${fSel('Profil','profile')}</div>${timeWheelHtml('refTime',$('refDist').value)}${fSw('Palier semi vers marathon pénalisé','penalty')}`;
  if(!ref2Open)h+=`<button type="button" class="addRef" data-act="add-ref2">+ Ajouter un autre chrono de référence</button>`;
  else h+=`<div style="border-top:1px solid var(--line);padding-top:.8rem;margin-top:.4rem"><div class="settingsTitle"><b>Deuxième chrono</b><button type="button" class="ghost" data-act="remove-ref2">Supprimer</button></div>${fSel('Distance','ref2Dist')}${timeWheelHtml('ref2Time',$('ref2Dist').value)}</div>`;
  return h+`<p class="lbl" id="setProfileHint"></p>`;
}
function physioFieldsHtml(){return `<p class="sectionHint">Ces valeurs restent modifiables pendant le plan. Seules les séances futures sont recalculées.</p><label class="sf speedUnit"><span>Unité de vitesse</span><select data-speed-unit><option value="kmh"${speedUnit==='kmh'?' selected':''}>km/h</option><option value="pace"${speedUnit==='pace'?' selected':''}>min/km</option></select></label><div class="physioSpeeds">${speedField('S1','s1')}${speedField('S2','s2')}${speedField('VMA','vma')}</div><p class="lbl s1Hint">S1 : borne basse–haute, ou une seule valeur. En min/km : 5:13–5:00.</p>${heartRatePanelHtml()}`;}
function appSetHtml(){
  const cal=$('modeCal').checked,locked=cal&&!!activePlan&&!structureEditing;
  let h=recoveryHtml();

  h+=`<div class="card"><div class="settingsTitle"><h2>Type de plan</h2></div><div class="optSeg" role="group" aria-label="Mode"><button type="button" data-mode="bloc" aria-pressed="${!cal}">Bloc</button><button type="button" data-mode="cal" aria-pressed="${cal}">Calendrier course</button></div></div>`;

  if(cal&&activePlan){
    h+=`<div class="card panelCard activePlanCard">${panelArt('plan')}<div class="settingsTitle"><h2>Plan actif</h2><span class="lockTag">${structureEditing?'Modification':'Verrouillé'}</span></div><div class="big" style="font-size:1.35rem">${activePlan.title}</div><div class="lbl">Sauvegarde automatique · ${planHistory.length} plan${planHistory.length>1?'s':''} dans l’historique</div>${!structureEditing?'<button type="button" class="cta ghost" data-act="refresh-program">Mettre à jour le programme</button>':''}<button type="button" class="cta ghost" data-act="${structureEditing?'commit-structure':'edit-structure'}">${structureEditing?'Valider les changements':'Modifier la structure'}</button>${structureEditing?'<button type="button" class="cta ghost" data-act="cancel-structure">Annuler</button>':''}</div>`;
  }

  if(!recoveryState&&cal&&(!activePlan||structureEditing)){
    h+=`<div class="card"><div class="settingsTitle"><h2>1. Course</h2></div>${fSel('Distance à préparer','calDist')}<div class="sf2">${fDate('Date de la course','calRace')}${fDate('Début du plan','calStart')}</div>${fText('Objectif (facultatif)','calGoal')}</div>`;

    h+=`<div class="card"><div class="settingsTitle"><h2>2. Structure</h2></div><div class="sf2">${fSel('Sorties par semaine','runs')}${fText('Heures par semaine','vol')}</div><div class="sf2">${fSel('Jours de qualité','qualityCount')}<span></span></div><p class="lbl" id="setQualityHint"></p>`;
    h+=`<div class="sf2">${fSel('Jour qualité 1','q1Day')}${+$('qualityCount').value>=2?fSel('Jour qualité 2','q2Day'):'<span></span>'}</div>`;
    if(+$('qualityCount').value>=3)h+=`<div class="sf2">${fSel('Jour qualité 3','q3Day')}<span></span></div>`;
    h+=`<div class="sf2">${fSel('Jour sortie longue','slDay')}<span></span></div><div class="sfLab">Jours disponibles</div><div class="pills">${['L','M','M','J','V','S','D'].map((d,i)=>`<label><input type="checkbox" data-bind="av${i}"${$('av'+i).checked?' checked':''}><span>${d}</span></label>`).join('')}</div></div>`;
  }else if(!cal){
    h+=`<div class="card"><div class="settingsTitle"><h2>Bloc</h2></div>${fSel('Qualité développée','block')}<div data-when="spec" class="sf2">${fSel('Distance visée','specDist')}${fText('Objectif (facultatif)','specGoal')}</div><div class="sf2">${fSel('Semaines de charge','weeks')}${fText('Heures par semaine','vol')}</div><div class="sf2">${fSel('Sorties par semaine','runs')}${fSel('Qualités par semaine','qualityCount')}</div><p class="lbl">Assimilation : un Jogg’ avec 10, 15 ou 20’ d’endurance active remplace la qualité.</p></div>`;
  }

  h+=PlanifCoros.settingsHtml();
  h+=globalThis.PlanifStrava?.settingsHtml()||'';

  h+=`<div class="card toolsCard"><h2>Outils</h2><div class="lbl" style="margin-bottom:.7rem">Version ${APP_VERSION}</div><button type="button" class="cta ghost" data-act="theme">${themeButtonText()}</button><button type="button" class="cta updateBtn" data-act="update">MAJ</button><p class="lbl" id="updateStatus"></p><button type="button" class="cta ghost" data-act="copy">Copier le plan</button><button type="button" class="cta ghost" data-act="plans">Mes plans</button><button type="button" class="cta ghost" data-act="audit">Audit des règles</button><button type="button" class="cta ghost" data-goto="expert">Vue experte</button></div>`;
  return h;
}
function savedPlanEntries(){
  const entries=[];
  if(validSavedPlan(activePlan))entries.push({kind:'active',label:'Plan actif',record:snapshotPlan(activePlan)});
  for(const p of planHistory)if(validSavedPlan(p))entries.push({kind:'archive',label:'Plan archivé',record:snapshotPlan(p)});
  const backup=getJson(RECOVERY_BACKUP);
  try{const p=JSON.parse(backup?.values?.[STORE.active]||'null');if(validSavedPlan(p))entries.push({kind:'backup',label:'Copie de sécurité',record:p});}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}
  return entries;
}
const savedPlanEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function savedPlanDate(value){const d=new Date(value);return value&&!Number.isNaN(+d)?d.toLocaleDateString('fr-FR'):'Date inconnue';}
function savedPlanSummary(entry){
  const p=entry.record,C=p.plan;
  return `<span class="lbl">${entry.label}</span><h3>${savedPlanEscape(p.title||'Plan de course')}</h3><p class="lbl">${DIST[C.race.distance]?.lab||'Course'} · ${savedPlanDate(C.start)} → ${savedPlanDate(C.race.date)}<br>${C.weeks.length} semaines${p.archivedAt?' · Archivé le '+savedPlanDate(p.archivedAt):p.updatedAt?' · Enregistré le '+savedPlanDate(p.updatedAt):''}</p>`;
}
function savedPlanDetail(entry){
  const C=reviveSavedPlan(entry.record.plan);
  let h=savedPlanSummary(entry)+'<p class="lbl">Consultation seule : le plan actif reste inchangé.</p>';
  for(const [i,w] of C.weeks.entries()){
    h+=`<details class="savedPlanWeek"><summary>Semaine ${i+1} · ${savedPlanDate(w.startDate)} — ${fmtDur(w.vol)}</summary>`;
    for(const day of w.days){
      h+=`<div class="savedPlanDay"><b>${fmtD(day.date)}</b>`;
      if(!day.items.length)h+='<p class="lbl">Repos</p>';
      for(const it of day.items){
        if(it.kind==='q'){
          h+=`<p><strong>${savedPlanEscape(sessionTitle(it.s))}</strong> · ${fmtDur(it.s.total)}</p>`;
          for(const [j,v] of it.s.variants.entries())h+=`<p class="lbl">Option ${j+1} : ${savedPlanEscape(vText(v))}<br>${vChips(v).map(savedPlanEscape).join(' · ')}</p>`;
        }else h+='<p>'+agendaItem(it,w,null)+'</p>';
      }
      h+='</div>';
    }
    h+='</details>';
  }
  return h;
}
function restoreSavedPlanRecord(record){
  if(!validSavedPlan(record))throw Error('Ce plan ne peut pas être restauré.');
  // A complete backup is written before replacing any key; memory changes only after storage succeeds.
  const before={};for(const key of [STORE.active,STORE.history,STORE.mode,RECOVERY_STATE])before[key]=localStorage.getItem(key);
  const backupKey='planif-before-restore-'+Date.now();
  localStorage.setItem(backupKey,JSON.stringify({savedAt:new Date().toISOString(),values:before}));
  const restored=snapshotPlan(record);delete restored.archivedAt;delete restored.archiveReason;
  const history=planHistory.slice();
  if(validSavedPlan(activePlan))history.unshift({...snapshotPlan(activePlan),archivedAt:new Date().toISOString(),archiveReason:'restauration d’un autre plan'});
  const state={id:restored.id,status:'restored'};
  try{
    localStorage.setItem(STORE.history,JSON.stringify(history));
    localStorage.setItem(RECOVERY_STATE,JSON.stringify(state));
    localStorage.setItem(STORE.mode,'cal');
    localStorage.setItem(STORE.active,JSON.stringify(restored));
  }catch(error){
    for(const [key,value] of Object.entries(before)){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');} }
    throw Error('Restauration interrompue : impossible d’enregistrer le plan. La copie de sécurité est conservée.');
  }
  activePlan=restored;planHistory=history;recoveryState=state;structureEditing=false;
  return restored;
}
function openSavedPlans(){
  let dialog=$('savedPlansDialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='savedPlansDialog';dialog.className='corosDialog savedPlansDialog';dialog.setAttribute('aria-labelledby','savedPlansTitle');document.body.append(dialog);}
  const entries=savedPlanEntries();
  const list=()=>{dialog.innerHTML='<div class="settingsTitle"><h2 id="savedPlansTitle">Mes plans</h2><button type="button" class="ghost" data-plans-close>Fermer</button></div>'+(entries.length?entries.map((entry,i)=>`<div class="card">${savedPlanSummary(entry)}<button type="button" class="cta ghost" data-plans-view="${i}">Consulter</button></div>`).join(''):'<p>Aucun plan sauvegardé pour le moment.</p>');dialog.scrollTop=0;};
  dialog.onclick=e=>{
    if(e.target.closest('[data-plans-close]')){dialog.close();return;}
    if(e.target.closest('[data-plans-back]')){list();return;}
    const view=e.target.closest('[data-plans-view]');
    if(view){const index=Number(view.dataset.plansView),entry=entries[index];if(!entry)return;
      dialog.innerHTML='<div class="settingsTitle"><h2 id="savedPlansTitle">Plan sauvegardé</h2><button type="button" class="ghost" data-plans-close>Fermer</button></div><button type="button" class="cta ghost" data-plans-back>Retour à mes plans</button>'+savedPlanDetail(entry)+(entry.kind!=='active'?`<button type="button" class="cta" data-plans-restore="${index}">Restaurer ce plan</button>`:'')+'<p role="status" data-plans-status></p>';dialog.scrollTop=0;return;}
    const restore=e.target.closest('[data-plans-restore]');
    if(restore){const entry=entries[Number(restore.dataset.plansRestore)];if(!entry||entry.kind==='active')return;
      if(!confirm('Restaurer ce plan ? Le plan actif sera d’abord archivé. Les séances sauvegardées seront conservées sans recalcul ; tu pourras vérifier tes repères avant de reprendre les calculs.'))return;
      try{restoreSavedPlanRecord(entry.record);dialog.close();recoverSavedPlan();document.dispatchEvent(new CustomEvent('planif-plan-change'));}
      catch(error){dialog.querySelector('[data-plans-status]').textContent=error.message;}
    }
  };
  list();dialog.showModal();
}
function themeButtonText(){return document.documentElement.dataset.theme==='dark'?'Passer en mode clair':'Passer en mode sombre';}
function toggleTheme(){
  const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem('planif-theme',theme);}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}
  document.querySelector('meta[name="theme-color"]').setAttribute('content',theme==='dark'?'#0F1720':'#FFFFFF');
  const button=document.querySelector('#scr-set [data-act="theme"]');if(button)button.textContent=themeButtonText();
}
function initBindings(screen){screen.querySelectorAll('select[data-bind]').forEach(x=>{x.value=$(x.dataset.bind).value;});}
function initSet(){initBindings($('scr-set'));}
function initRef(){initBindings($('scr-ref'));const ph=$('setProfileHint');if(ph)ph.textContent=$('profileHint').textContent;}
function updateSet(){
  const st=lastSt||readState(),cal=$('modeCal').checked,locked=cal&&!!activePlan&&!structureEditing;
  document.querySelectorAll('#scr-set [data-when]').forEach(el=>{const w=el.dataset.when;el.hidden=w==='cal'?!cal:w==='bloc'?cal:w==='spec'?$('block').value!=='spec':false;});
  document.querySelectorAll('#scr-set [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='cal')===cal)));
  STRUCT_IDS.forEach(id=>{const el=document.querySelector('#scr-set [data-bind="'+id+'"]');if(el)el.disabled=locked;});
  const q3=document.querySelector('#scr-set [data-bind="q3Day"]');if(q3){const lab=q3.closest('label');if(lab)lab.hidden=+$('qualityCount').value<3;}
  const q2=document.querySelector('#scr-set [data-bind="q2Day"]');if(q2){const lab=q2.closest('label');if(lab)lab.hidden=+$('qualityCount').value<2;}
  const qh=$('setQualityHint');if(qh)qh.textContent=qualityAdvice(+$('runs').value,+$('qualityCount').value);
}
function weeklyBalanceHtml(){
  if(recoveryState||inputErrors(readState()).length||!lastPlan?.weeks)return '';
  const st=readState(),A=RULES.recovery.adaptiveFootings;
  const capacities=lastPlan.weeks.filter(w=>!w.assim&&!w.assimilation&&!w.raceWeek&&w.phase!=='intro').map(w=>{
    const q=w.sessions.reduce((sum,s)=>sum+s.total,0);
    const types=w.foot.filter(f=>!f.unplaced).map(f=>f.contextProtected?'rec':f.type);
    const normal=types.filter(type=>type!=='rec').length;
    return q+w.sl+types.filter(type=>type==='rec').length*A.protectedMax+Math.min(normal,A.maxProlonged)*A.absoluteMax+Math.max(0,normal-A.maxProlonged)*A.normalMax;
  });
  const capacity=capacities.length?Math.floor(Math.max(...capacities)/5)*5:null;
  const capacityHtml=capacity?'<p class="lbl" data-volume-capacity>Avec les séances et les jours actuels : jusqu’à environ '+fmtDur(capacity)+' par semaine ('+st.runs+' sorties).'+(st.vol>capacity?' Pour atteindre '+fmtDur(st.vol)+', ajoute une sortie ou réduis la cible.':' Cette estimation varie selon les semaines et les qualités.')+'</p>':'';
  const rows=lastPlan.weeks.flatMap((w,i)=>{
    if(w.raceWeek||w.phase==='intro')return [];
    const messages=(w.warns||[]).filter(x=>['weekly_volume_incompatible','qualities_reduced','quality_work_reduced','assimilation_mixed_unavailable','assimilation_active_unavailable','volume_short','protected_footing_shortfall','no_day_footing_reduce'].includes(x.code)).map(warnText);
    if(!messages.length)return [];
    return [`S${i+1} : ${fmtDur(w.vol)} construites pour ${fmtDur(w.targetVolume??w.target)} visées. ${[...new Set(messages)].join(' ')}`];
  });
  if(!capacityHtml&&!rows.length)return '';
  return '<div class="card" role="status"><h2>Compatibilité du volume</h2>'+capacityHtml+rows.slice(0,3).map(row=>'<p class="lbl">'+row+'</p>').join('')+(rows.length>3?'<p class="lbl">Les autres ajustements sont indiqués dans les semaines concernées.</p>':'')+'</div>';
}
$('scr-ref').addEventListener('toggle',e=>{const key=e.target.dataset.refSection;if(!(key in refEditorOpen))return;refEditorOpen[key]=e.target.open;if(e.target.open&&!refDraft)refDraft=refSnapshot();if(!e.target.open&&refDraft&&!Object.values(refEditorOpen).some(Boolean))refFinishEdit(false);},true);
$('scr-ref').addEventListener('click',e=>{if(e.target.closest('[data-ref-save]')){refFinishEdit(true);return;}if(e.target.closest('[data-ref-cancel]')){refFinishEdit(false);return;}if(e.target.closest('[data-ref-apply]')&&refPlanPending&&confirm('Mettre à jour uniquement les intensités des séances futures non réalisées ?')){if(applyReferencesToSavedPlan()){render();renderApp();}}});
$('scr-calc').addEventListener('input',e=>{if(!e.target.matches('[data-conversion-input]'))return;conversionInputs[conversionMode]=e.target.value;$('scr-calc').querySelector('[data-conversion-output]').textContent=conversionResult(conversionMode,e.target.value);});
$('scr-calc').addEventListener('click',e=>{const btn=e.target.closest('button[data-conversion-mode]');if(!btn)return;conversionMode=btn.dataset.conversionMode;const group=btn.closest('.optSeg');group.querySelectorAll('button[data-conversion-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));updateConversionUi();});
$('appShell').addEventListener('input',e=>{
  if(!e.target.closest('#scr-set, #scr-ref'))return;
  const speed=e.target.closest('[data-speed]');if(speed){commitSpeedInput(speed);return;}
  const tp=e.target.closest('[data-timepart]');if(tp){
    const box=tp.closest('[data-time-target]'),target=$(box.dataset.timeTarget),long=box.dataset.timeLong==='1';
    const h=long?+(box.querySelector('[data-timepart="h"]').value):0,m=+(box.querySelector('[data-timepart="m"]').value),ss=+(box.querySelector('[data-timepart="s"]').value);
    target.value=long?`${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`:`${m}:${String(ss).padStart(2,'0')}`;
    $('f').dispatchEvent(new Event('input'));return;
  }
  const el=e.target.closest('[data-bind]');if(!el)return;const src=$(el.dataset.bind);
  if(isCheck(src))src.checked=el.checked;else src.value=el.value;if(['hrMin','hrMax'].includes(el.dataset.bind)){save();return;}$('f').dispatchEvent(new Event('input'));
});
$('appShell').addEventListener('change',e=>{
  if(!e.target.closest('#scr-set, #scr-ref'))return;
  const unit=e.target.closest('[data-speed-unit]');if(unit){speedUnit=unit.value==='pace'?'pace':'kmh';try{localStorage.setItem('planif-speed-unit',speedUnit);}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}syncSpeedInputs();return;}
  const speed=e.target.closest('[data-speed]');if(speed){if(!commitSpeedInput(speed))speed.reportValidity();else if(appTab==='ref'&&!refDraft)renderApp();return;}
  const tp=e.target.closest('[data-timepart]');if(tp){tp.dispatchEvent(new Event('input',{bubbles:true}));if(appTab==='ref'&&!refDraft)renderApp();return;}
  const el=e.target.closest('[data-bind]');if(!el)return;const src=$(el.dataset.bind);
  if(isCheck(src))src.checked=el.checked;else src.value=el.value;
  if(['hrMin','hrMax'].includes(el.dataset.bind)){save();if(appTab==='ref')renderApp();return;}
  $('f').dispatchEvent(new Event('input'));
  if((appTab==='ref'&&!refDraft)||(!refDraft&&['refDist','ref2Dist','qualityCount'].includes(el.dataset.bind))){setBuilt=false;renderApp();}
});
async function updateApp(btn){
  const status=$('updateStatus');
  const setStatus=t=>{if(status)status.textContent=t;};
  btn.disabled=true;btn.textContent='Vérification…';setStatus('');
  try{
    /* Force la récupération du document le plus récent, indépendamment d'un changement de sw.js. */
    const url=new URL('./index.html',location.href);
    url.searchParams.set('_maj',Date.now());
    const res=await fetch(url.toString(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!res.ok)throw new Error('index fetch failed');
    const html=await res.text();

    /* Met aussi à jour le cache applicatif actif pour que Safari/PWA ne ressorte pas l'ancien index. */
    if('caches' in window){
      const keys=await caches.keys();
      const planifKeys=keys.filter(k=>k.startsWith('planif-'));
      await Promise.all(planifKeys.map(async k=>{
        const c=await caches.open(k);
        await c.put('./index.html',new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}));
        await c.put('./',new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}));
      }));
    }

    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.getRegistration('./')||await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      await reg.update();
      if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
    }

    setStatus('Mise à jour chargée…');
    setTimeout(()=>location.replace('./index.html?updated='+Date.now()),300);
  }catch(err){
    setStatus('Vérification impossible. Réessaie avec une connexion internet.');
    btn.disabled=false;btn.textContent='MAJ';
  }
}
$('appShell').addEventListener('click',e=>{
  const recovery=e.target.closest('[data-recovery]');
  if(recovery){
    if(recovery.dataset.recovery==='restore')recoverSavedPlan();
    else if(recovery.dataset.recovery==='resume'&&inputErrors(readState()).length){alert(inputErrors(readState()).join('\n'));}
    else if(recovery.dataset.recovery==='resume'&&confirm('As-tu vérifié ta physiologie et tes chronos dans Repères ? Les séances futures seront recalculées. La copie de sécurité restera conservée.')){
      localStorage.setItem(RECOVERY_STATE,JSON.stringify({id:activePlan.id,status:'resumed'}));recoveryState=null;restoreActiveStructure();
      CURRENT_MODE='cal';$('modeCal').checked=true;$('modeBloc').checked=false;
      render();setBuilt=false;renderApp();
    }
    return;
  }
  if(!e.target.closest('#scr-set, #scr-ref'))return;
  const m=e.target.closest('[data-mode]');if(m){if(recoveryState){if(m.dataset.mode==='cal')recoverSavedPlan();return;}switchModeState(m.dataset.mode);setBuilt=false;calOpen=null;render();renderApp();return;}
  const a=e.target.closest('[data-act]');if(!a)return;
  if(a.dataset.act==='plans'){openSavedPlans();return;}
  if(a.dataset.act==='theme'){toggleTheme();return;}
  if(a.dataset.act==='update'){updateApp(a);return;}
  if(a.dataset.act==='add-ref2'){ref2Open=true;setBuilt=false;renderApp();return;}
  if(a.dataset.act==='remove-ref2'){ref2Open=false;$('ref2Time').value='';save();render();setBuilt=false;renderApp();return;}
  if(a.dataset.act==='refresh-program'){refreshSavedPlanStructure();return;}
  if(a.dataset.act==='edit-structure'&&recoveryState){alert('Vérifie tes repères puis reprends les calculs avant de modifier la structure.');return;}
  if(a.dataset.act==='edit-structure'){structureEditing=true;setBuilt=false;renderApp();return;}
  if(a.dataset.act==='cancel-structure'){structureEditing=false;restoreActiveStructure();render();setBuilt=false;calOpen=null;renderApp();return;}
  if(a.dataset.act==='commit-structure'){
    if(inputErrors(readState()).length){alert(inputErrors(readState()).join('\n'));return;}
    if(!confirm('Modifier la structure va archiver le plan actif et créer un nouveau plan avec ces paramètres. Continuer ?'))return;
    archiveActivePlan('structure modifiée');
    activePlan=null;structureEditing=false;
    render();if(lastPlan&&lastSt&&lastSt.mode==='cal')saveActivePlan(lastSt,lastPlan,true);
    setBuilt=false;calOpen=null;renderApp();return;
  }
  if(a.dataset.act==='copy')$('copyBtn').click(),a.textContent='Plan copié',setTimeout(()=>{a.textContent='Copier le plan';},1800);
  if(a.dataset.act==='audit'){setUi('expert');if($('auditSec').hidden)$('auditBtn').click();$('auditSec').scrollIntoView();}
});

/* ---------- écran Séance (v9.0b) : lecture des objets déjà placés dans w.days ---------- */
let appSession=null,appOpt=0;
const splitRec=t=>{const i=t.indexOf(', récup');return i<0?[t,'']:[t.slice(0,i),t.slice(i+2)];};
/* Les récupérations viennent des objets du moteur, pas du texte de présentation. */
function sessionRecoveryRows(v){
  const S=v.structure||{},rec=[],blocks=[];
  const duration=(m,r)=>r&&r[0]!==r[1]?`${fmtRec(r[0])} à ${fmtRec(r[1])}`:fmtRec(r?r[0]:m);
  const add=(list,label,m,r)=>{if((r&&r[1]>0)||m>0)list.push(`${label}${duration(m,r)}${S.recoveryType?' '+(REC_TYPE[S.recoveryType]||S.recoveryType):''}`);};
  if(S.type==='mixed_zones'){
    S.components.forEach(c=>{const rows=sessionRecoveryRows(c.variant),prefix=mixedComponentLabel(c.fam)+' : ';rec.push(...rows.rec.map(x=>prefix+x));blocks.push(...rows.blocks.map(x=>prefix+x));});
    add(blocks,'',S.recoveryBetweenBlocksMin,S.recoveryBetweenBlocksRangeMin);
  }else if(S.type==='hill_reps'){
    rec.push('Descente au trot entre les côtes');if(S.sprints?.reps)rec.push('Récupération complète entre les sprints');
  }else{
    const repeats=S.reps||(S.durationsMin||S.distancesM||S.segments||[]).length;
    if(repeats>1){
      if(S.recoveryBetweenFractionsMin!==undefined||S.recoveryBetweenFractionsRangeMin)add(rec,'',S.recoveryBetweenFractionsMin,S.recoveryBetweenFractionsRangeMin);
      else add(rec,'',S.recoveryMin??v.recEach,S.recoveryRangeMin);
    }
    if(S.sets>1)add(blocks,'',S.recoveryBetweenSetsMin,S.recoveryBetweenSetsRangeMin);
    if(S.easyBetweenKm>0)rec.push(`${fmtKm(S.easyBetweenKm)} km en Jogg’ entre les fractions`);
  }
  return{rec,blocks};
}
function thresholdHrText(v,st){
  if(v.structure?.components)return [...new Set(v.structure.components.flatMap(c=>thresholdHrText(c.variant,st)))];
  const sector=v.sector||(v.fam||'').split('.')[0];
  if(!['s1','s2'].includes(sector))return [];
  const z=globalThis.PlanifStrava?.heartRateZones?.();const value=z?(sector==='s1'?z.z3Max:z.z4Max):(sector==='s1'?st?.lt2Hr*0.95:st?.lt2Hr),label=sector==='s1'?'S1':'S2';
  return [z?`${label} : ${sector==='s1'?z.z2Max+1:z.z3Max+1}–${value} bpm (Flow Strava)`:`Plafond FC ${label} : ${value>0?Math.round(value)+' bpm':'à renseigner dans Physiologie (FC S2)'}`];
}
function qualityScheduleHtml(v,s,st){
  const rows=sessionRecoveryRows(v),S=v.structure||{};
  let main=vText(v).split(', ')[0];
  if(S.type==='intermittent')main=S.sets?`${S.sets} × (${S.perSet} × ${fmtRec(S.workMin)})`:`${S.reps} × ${fmtRec(S.workMin)}`;
  if(S.type==='hill_reps'&&S.sprints?.reps)main+=`, puis ${S.sprints.reps} × ${S.sprints.seconds}" de sprint en côte`;
  const row=(label,content)=>`<div class="sessionStep"><b>${label} :</b><div>${content}</div></div>`;
  const warm=s.isLong?(S.easyMin?`${fmtMin(S.easyMin)} en Jogg’`:'Début facile intégré à la sortie'):`${fmtMin(s.wu)} de préparation, dont footing et lignes droites${s.activation?' puis activation au second seuil':''}`;
  const cd=s.isLong?(S.cooldownMin?fmtMin(S.cooldownMin):'Fin facile intégrée à la sortie'):fmtMin(s.cd);
  const chips=vChips(v).map(c=>`<div>${paceHtml(c)}</div>`).join('')+thresholdHrText(v,st).map(t=>`<div>${t}</div>`).join('');
  return`<div class="card sessionSteps">${row('Échauffement',warm)}${row('Travail',`<div class="struct">${main}</div><div class="pace">${chips}</div><span class="lbl">${Math.round(v.work)}’ de travail au total</span>`)}${row('Récup',rows.rec.length?rows.rec.join('<br>'):'Aucune, travail continu')}${rows.blocks.length?row('Récup entre blocs',rows.blocks.join('<br>')):''}${row('Retour au calme',cd)}${row('Durée totale',`≈ ${fmtDur(s.isLong?s.total:s.wu+v.total+s.cd)}`)}</div>`;
}
/* ---------- Bibliothèque de séances (v9.3) : exploration des formats réellement présents dans le moteur ---------- */
const LIB_SECTORS=[{id:'s1',lab:'Premier seuil'},{id:'s2',lab:'Second seuil'},{id:'vo2',lab:'VO₂max'},{id:'spec10k',lab:'Spécifique 10 km'},{id:'hills',lab:'Côtes'}];
const FAM_LAB={'s1.dist':'Distance','s1.time':'Temps','s1.long':'Fractions longues','s1.cont':'Continu','s1.progCont':'Progressif continu','s1.progFrac':'Progressif fractionné','s1.pyr':'Pyramide','s1.desc':'Dégressif','s1.mix':'Blocs mixtes',
  's2.dense':'Dense','s2.dist':'Distance','s2.longDist':'Distance longue','s2.time':'Temps','s2.longTime':'Temps long','s2.pyr':'Pyramide','s2.deg':'Dégressif','s2.prog':'Progressif','s2.blocs':'Blocs',
  'vo2.int':'Intermittent','vo2.shortDist':'Distance courte','vo2.medDist':'Distance moyenne','vo2.medTime':'Temps moyen','vo2.longDist':'Distance longue','vo2.longTime':'Temps long','vo2.pyr':'Pyramide',
  'p10.short':'Distance courte','p10.med':'Distance moyenne','p10.long':'Distance longue','p10.xlong':'Exceptionnel','p10.time':'Temps','p10.pyr':'Pyramide','p10.prog':'Progressif','p10.deg':'Dégressif','p10.blocs':'Blocs','p10.mix':'Mixte S2 + 10 km','p10.alternating':'Alternance continue S1 / AS10',
  'hills.short':'Côtes courtes','hills.long':'Côtes longues'};
const LIB_WARM={s1:'s1',s2:'s2',vo2:'vma',spec10k:'spec',hills:'hills'};
const LIB_PURPOSE={s1:'s1',s2:'s2',vo2:'vma',spec10k:'spec',hills:'hills'};
const PHASE_NAMES=['début','milieu','fin','assimilation'];
let appLib=false,libSector='s2',libFam='all',libVol=1;
const libV10=()=>{const st=lastSt;if(!st)return null;if(st.mode==='cal'&&st.calDist===1&&st.calGoal)return 10/(st.calGoal/3600);if(st.mode!=='cal'&&st.block==='spec'&&st.specDist===1&&st.specGoal)return 10/(st.specGoal/3600);return lastPred?lastPred[1].v:null;};
/* volume de travail de référence : début, milieu et fin de la plage du bloc correspondant (RULES.blocks) */
function libWork(sec){
  const r=sec==='s1'?RULES.blocks.s1.A.W:sec==='s2'?RULES.blocks.s2.A.W:sec==='vo2'?RULES.blocks.vma.A.W:sec==='hills'?RULES.blocks.eco.A.W:null;
  if(r)return[r[0],(r[0]+r[1])/2,r[1]];
  const K=RULES.blocks.spec[1].K,v=libV10();if(!v)return null;
  return[K[0],(K[0]+K[1])/2,K[1]].map(k=>Math.min(k/v*60,RULES.spec10k.workCap));
}
/* Bibliothèque : progression par format, sans modifier la sélection du plan.
   Les plages VO₂ selon la durée de fraction sont des choix existants de Planif. */
function libFormatCandidate(f,c,st,ctx,phase){
  if(c.sector!=='vo2'||!['intervals','intermittent'].includes(c.structure.type))return c;
  const [lo,hi]=vo2WorkRange(maxFractionMinutes(c)),target=lo+(hi-lo)*phase/2;
  let next=f.gen(target,st,ctx).find(v=>v.key===c.key)||c;
  // L'arrondi en séries ne doit pas dépasser le volume propre au format.
  for(let t=target;next.work>hi+1e-9&&t>0;t-=0.25){
    next=f.gen(Math.max(0,t-0.25),st,ctx).find(v=>v.key===c.key)||next;
  }
  return next.work<=hi+1e-9?next:null;
}
function libCandidates(sec,W,phase=libVol){
  const st=lastSt;if(!st)return[];
  if(sec==='hills'){const H=RULES.hills;return[...H.short.reps.map(r=>({c:hillStruct(r,W,false,st),fam:'hills.short'})),...H.long.reps.map(r=>({c:hillStruct(r,W,true,st),fam:'hills.long'}))].map(o=>{o.c.key=`${o.fam}:${o.c.structure.durationMin}`;return o;});}
  const ctx={v:libV10()};const out=[];
  SESSION_LIBRARY[sec].forEach(f=>{f.gen(W,st,ctx).forEach(seed=>{const c=libFormatCandidate(f,seed,st,ctx,phase);if(c&&!capsFor(sec,c,st).length)out.push({c,fam:f.id});});});
  return out;
}
const libFormatCount=sec=>{const Ws=libWork(sec);return Ws?new Set(Ws.flatMap((W,i)=>libCandidates(sec,W,i).map(o=>o.c.key))).size:0;};
function libCandidateLoad(sec,c,st){
  const prep=prepareSession({fam:LIB_WARM[sec],variants:[c],wu:24,cd:10},st.vol);
  return variantLoad(c,prep,st).load;
}
const planKeys=()=>{const m={};if(lastPlan&&lastPlan.weeks)lastPlan.weeks.forEach((w,i)=>(w.sessions||[]).forEach(s=>s.variants.forEach(v=>{if(v.key&&!(v.key in m))m[v.key]=i+1;})));return m;};
const phaseHint=w=>{const p=PHASE_NAMES.filter((n,i)=>i<3&&w[i]>=0.8);return p.length?`plutôt ${p.join(', ')} de bloc`:'peu utilisé';};
function appLibHtml(){
  const st=lastSt;if(!st)return'';
  const secs=LIB_SECTORS.filter(x=>x.id!=='spec10k'||libV10());
  if(!secs.find(x=>x.id===libSector))libSector='s2';
  const Ws=libWork(libSector);
  let h='<div class="chips2" role="group" aria-label="Qualité">'+secs.map(x=>`<button type="button" data-lsec="${x.id}" aria-pressed="${x.id===libSector}">${x.lab} · ${libFormatCount(x.id)}</button>`).join('')+'</div>';
  const fams=libSector==='hills'?['hills.short','hills.long']:SESSION_LIBRARY[libSector].map(f=>f.id);
  if(!fams.includes(libFam))libFam='all';
  h+='<div class="chips2 sub" role="group" aria-label="Type">'+[['all','Tous']].concat(fams.map(f=>[f,FAM_LAB[f]])).map(([f,l])=>`<button type="button" data-lfam="${f}" aria-pressed="${f===libFam}">${l}</button>`).join('')+'</div>';
  h+=`<div class="optSeg three" role="group" aria-label="Période du bloc">${['Début','Milieu','Fin'].map((l,i)=>`<button type="button" data-lvol="${i}" aria-pressed="${i===libVol}">${l} de bloc<small>Volume adapté au format</small></button>`).join('')}</div>`;
  h+=`<div class="card"><p class="lbl" style="margin:0">${libFormatCount(libSector)} formats distincts dans cette catégorie. Le volume de chaque format évolue selon la période choisie, ses bornes et tes repères ; il n’existe pas de durée commune imposée.</p>${info('Bibliothèque',['La progression et la pertinence par phase sont des choix Planif. Certains formats fixes restent identiques entre les périodes.','La charge estimée combine le travail, l’intensité, les récupérations courues, la préparation et le retour au calme. Deux charges proches ne garantissent pas le même stimulus ni la même fatigue.','Un format est compté une seule fois, même si son nombre de répétitions varie entre début, milieu et fin.','« Dans ton plan » signale un format retenu dans le plan affiché ; la pertinence par phase vient des poids de la bibliothèque.'])}</div>`;
  const pk=planKeys(),all=libCandidates(libSector,Ws[libVol]);
  (libFam==='all'?fams:[libFam]).forEach(f=>{
    const list=all.filter(o=>o.fam===f);if(!list.length)return;
    const w=RULES.library.phaseWeights[f];
    h+=`<div class="libFam"><h2>${FAM_LAB[f]} · ${list.length} formats</h2>${w?`<span class="lbl">${phaseHint(w)}</span>`:''}</div>`;
    list.forEach(o=>{const c=o.c,[main,rec]=splitRec(vText(c)),ch=vChips(c),inPlan=c.key in pk;
      h+=`<button type="button" class="tile libT" style="--c:${libColor(libSector)}" data-lib="${libSector}|${encodeURIComponent(c.key)}"><span class="go" aria-hidden="true">›</span>`+
        `<span class="s">${main}</span><span class="t">${paceHtml(ch[0]||'')}</span><span class="t">${rec?rec.charAt(0).toUpperCase()+rec.slice(1)+', ':''}travail ${fmtRep(c.work)} · charge ${pts(libCandidateLoad(libSector,c,st))}</span>${inPlan?`<span class="inPlan">Dans ton plan, semaine ${pk[c.key]}</span>`:''}</button>`;});
  });
  return h;
}
const libColor=sec=>sec==='s1'?ZONES.z2.c:sec==='s2'?ZONES.z3.c:sec==='spec10k'?'var(--accent)':ZONES.z4.c;
function sessionInfoHeaderHtml(label,body){
  return `<details class="footInfo"><summary aria-label="${label}" title="${label}">ⓘ</summary><div class="footInfoBody">${body}</div></details>`;
}
function libSessionHtml(r){
  const st=lastSt,sec=r.sector,Ws=libWork(sec);if(!Ws)return'';
  const o=libCandidates(sec,Ws[libVol]).find(x=>x.c.key===r.key);if(!o)return'<div class="card"><p class="lbl">Ce format n\'existe plus avec les réglages actuels.</p></div>';
  const c=o.c,prep=prepareSession({fam:LIB_WARM[sec],libSector:sec,variants:[c],isLong:c.structure.type==='long_run',wu:RULES.organization.warmup[LIB_WARM[sec]][0],cd:10},st.vol),{wu,cd}=prep,ld=variantLoad(c,prep,st),[main,rec]=splitRec(vText(c));
  const pw=RULES.library.phaseWeights[o.fam],secLab=LIB_SECTORS.find(x=>x.id===sec).lab;
  const rpe=SECTOR_INFO[sec]?SECTOR_INFO[sec].rpe:null;
  let h=`<div class="sHead" style="--c:${libColor(sec)}"><div class="sHeadTitle"><h2>${secLab}</h2>${sessionInfoHeaderHtml('Pourquoi ce format',`<p>${PURPOSE[LIB_PURPOSE[sec]]}</p>${rpe?`<p>Ressenti attendu : ${rpe}. La fréquence cardiaque sert seulement de contrôle.</p>`:''}${pw?`<p>Pertinence dans un bloc : ${PHASE_NAMES.map((n,i)=>`${n} ${Math.round(pw[i]*100)} %`).join(', ')}.</p>`:''}<p>Charge estimée : ${pts(ld.load)}.</p><p>Format de la bibliothèque : le plan ne le propose qu'au moment du bloc où il est pertinent.</p>`)}</div><div class="lbl">Bibliothèque, ${FAM_LAB[o.fam].toLowerCase()}</div></div>`;
  h+=qualityScheduleHtml(c,prep,st);
  return h;
}
/* Copie de la séance affichée : la conversion ne modifie ni le plan ni ses variantes. */
function corosActivation(v,s={}){return preparationActivation(v,s);}
function corosSessionSnapshot(){
  if(inputErrors(readState()).length)throw new Error('Corrige les paramètres dans Repères avant un envoi COROS.');
  if(recoveryState)throw new Error('Vérifie tes repères puis reprends les calculs avant un envoi COROS.');
  const st=lastSt,r=appSession;if(!st||!r)throw new Error('Ouvre une séance pour la préparer.');
  const copy=v=>{
    const out=JSON.parse(JSON.stringify(v)),S=out.structure,I=out.intensity||{};
    if(I.type==='pct_by_duration')out.corosBands=S.durationsMin.map(d=>vo2Band(d,v.work,st).slice(0,2));
    else if(I.type==='race_pace_by_length')out.corosBands=S.distancesM.map(m=>p10Band(m/1000/I.refKmh,I.refKmh));
    else if(I.type==='progression_range')out.corosBands=v.parts.map(part=>[part[1],part[1]]);
    if(S.components)S.components=S.components.map(c=>({...c,variant:copy(c.variant)}));
    return out;
  };
  const root=$('scr-session'),title=root.querySelector('.sHead h2')?.textContent||'Séance';
  const qualityDescription=(root.querySelector('.card')?.innerText||'').replace(/\s+/g,' ').trim();
  const description=Array.from(root.querySelectorAll('.card')).slice(0,2).map(c=>c.innerText).join(' ').replace(/\s+/g,' ').trim();
  const base={title:'Planif · '+title,description,s2Kmh:st.s2,easyBand:efBand('std',st),s1Band:[st.s1lo,st.s1hi],activeBand:efBand('active',st),hrCue:st.lt1Hr?`Ne pas dépasser ${Math.round(st.lt1Hr)} bpm.`:'Ne pas dépasser le premier seuil.'};
  if(r.lib){const o=libCandidates(r.lib.sector,libWork(r.lib.sector)[libVol]).find(o=>o.c.key===r.lib.key);if(!o)throw new Error('Ce format n’est plus disponible.');const prep=prepareSession({variants:[o.c],fam:LIB_WARM[r.lib.sector]},st.vol);return{...base,kind:'quality',variant:copy(o.c),warmupMin:prep.wu,cooldownMin:prep.cd,description:o.c.structure.type==='long_run'?description:qualityDescription,preparation:o.c.structure.type!=='long_run',activation:corosActivation(o.c)};}
  const w=lastPlan?.weeks?.[r.w],day=w?.days?.[r.d];let it=day?.items?.[r.i];if(r.q!==undefined&&w?.sessions?.[r.q])it={kind:'q',s:w.sessions[r.q]};
  if(r.f!==undefined&&w?.foot?.[r.f])it={kind:'foot',f:w.foot[r.f]};
  if(r.sl&&w)it={kind:'sl'};
  if(!it)throw new Error('Cette séance n’est plus disponible.');
  if(day?.date){const d=day.date;base.date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  if(it.kind==='q'){const s=it.s,v=s.variants[appOpt]||s.variants[0];return{...base,title:base.title+' · Option '+String.fromCharCode(65+appOpt),kind:'quality',variant:copy(v),warmupMin:s.wu,cooldownMin:s.cd,description:s.isLong?description:qualityDescription,preparation:!s.isLong,activation:corosActivation(v,s)};}
  if(it.kind==='foot')return{...base,kind:'foot',foot:{...JSON.parse(JSON.stringify(it.f)),maxMinutes:RULES.recovery.adaptiveFootings.absoluteMax},footBand:efBand(it.f.type,st)};
  if(it.kind==='sl')return{...base,kind:'long',long:{totalMin:w.sl,s1Min:w.slS1,active:w.slEA}};
  if(it.kind==='race')return{...base,kind:'race',race:JSON.parse(JSON.stringify(it.s))};
  throw new Error('Ce format libre n’est pas encore exportable sans modifier ses consignes.');
}

function planifSessionInfo(r){
  if(!r||r.lib||lastSt?.mode!=='cal'||!activePlan||!lastPlan?.weeks)return null;
  const w=lastPlan.weeks[r.w];if(!w)return null;
  let day,it,id;
  if(r.q!==undefined)id=`w${r.w}-q${r.q}`;
  else if(r.f!==undefined)id=`w${r.w}-foot${r.f}`;
  else if(r.sl)id=`w${r.w}-sl0`;
  else{day=w.days?.[r.d];it=day?.items?.[r.i];id=it?.planifId;}
  if(!it)for(const d of w.days||[]){const found=d.items?.find(x=>x.planifId===id);if(found){day=d;it=found;break;}}
  if(!it||!id||!day)return null;
  let minutes,title;
  if(it.kind==='q'){const v=it.s.variants[appOpt]||it.s.variants[0];minutes=it.s.wu+v.total+it.s.cd;title=PlanifCorosAdapter.shortTitle({kind:'quality',variant:v,title:sessionTitle(it.s)});}
  else if(it.kind==='foot'){minutes=it.f.min;title=PlanifCorosAdapter.shortTitle({kind:'foot',foot:it.f});}
  else if(it.kind==='sl'){minutes=w.sl;title=`Sortie longue ${Math.round(minutes)}’`;}
  else if(it.kind==='veille'){minutes=it.min;title='Jogg + LD';}
  else if(it.kind==='race'){minutes=(it.s?.duration||it.s?.total||lastPlan.race?.seconds/60);title='Course';}
  if(!(minutes>0))return null;
  return {planId:activePlan.id,id,date:planDateKey(day.date),originalDate:activePlan.moves?.[id]?.from||planDateKey(day.date),minutes,title};
}
function planifMoveNoticeHtml(){
  const info=planifSessionInfo(appSession);if(!info)return '';
  const warning=lastPlan.moveWarnings?.[info.id];
  return (info.originalDate!==info.date?`<p class="lbl">Initialement prévue le ${fmtD(new Date(info.originalDate+'T12:00:00'))}.</p>`:'')+(warning?`<p class="lbl">Déplacement suspendu : ${warning}</p>`:'');
}
function movePlanifSession(date,ref=appSession,keepCalendar=false){
  if(recoveryState){alert('Vérifie tes repères puis reprends les calculs avant de déplacer une séance.');return;}
  const info=planifSessionInfo(ref);if(!info)return false;
  const check=planifMoveCheck(lastPlan,info.id,date,lastSt);if(info.date===date&&!activePlan.moves?.[info.id])return;
  if(check.warnings.length&&!window.confirm(check.warnings.join('\n')+'\nDéplacer quand même ?'))return;
  const moves={...activePlan.moves};if(date===info.originalDate)delete moves[info.id];else moves[info.id]={from:info.originalDate,to:date};
  check.source.day.items.splice(check.source.ref.i,1);check.day.items.push(check.source.it);
  activePlan={...activePlan,moves};saveActivePlan(lastSt,lastPlan);calSel=null;
  render();appSession=keepCalendar?null:findPlanifSession(lastPlan,info.id)?.ref||null;renderApp();return true;
}
function sessionScreenHtml(){
  if(appSession&&appSession.lib)return libSessionHtml(appSession.lib);
  const C=lastPlan,st=lastSt,r=appSession;const w=C&&C.weeks&&C.weeks[r.w];
  let day=w&&w.days&&w.days[r.d],it=day&&day.items[r.i];
  if(r.q!==undefined&&w&&w.sessions[r.q]){it={kind:'q',s:w.sessions[r.q]};day=null;}
  if(r.f!==undefined&&w?.foot?.[r.f]){it={kind:'foot',f:w.foot[r.f]};day=null;}
  if(r.sl&&w){it={kind:'sl'};day=null;}
  if(!it)return'<div class="card"><p class="lbl">Cette séance n\'existe plus dans le plan actuel.</p></div>';
  const when=day?fmtD(day.date):`Semaine ${r.w+1}`,ph=day?`${phaseLab(w.phase,C.race.distance)}, semaine ${w.index+1}`:`${blockLabel(C.B)}${w.assim?', assimilation':''}`,col=itemColor(it,w);
  const load=it.kind==='q'?it.s.variants[appOpt]?.load??it.s.variants[0]?.load:it.kind==='sl'?w.slLoad:it.s?.load??it.f?.load??it.load;
  const head=(t,info='')=>`<div class="sHead" style="--c:${col}"><div class="sHeadTitle"><h2>${t}</h2>${info}</div><div class="lbl">${when}, ${ph}</div>${Number.isFinite(load)?`<div class="sessionCharge">Charge estimée : ${pts(load)}</div>`:''}</div>`;
  if(it.kind==='q'){const s=it.s,v=s.variants[appOpt]||s.variants[0],[main,rec]=splitRec(vText(v));
    let h=head(sessionTitle(s),sessionInfoHeaderHtml('Pourquoi cette séance',`<p>${sessionPurpose(s)}</p>${s.rpe?`<p>Ressenti attendu : ${s.rpe}. La fréquence cardiaque sert seulement de contrôle.</p>`:''}<p>Charge estimée : ${pts(v.load)} pour cette option${s.loadMin!==s.loadMax?` (${ptsRange(s.loadMin,s.loadMax)} selon l'option)`:''}.</p>${s.gap?`<p>Les deux options diffèrent de ${Math.round(s.gap)}' de travail : préfère l'option A.</p>`:''}`));
    h+=`<div class="optSeg" role="group" aria-label="Option">${s.variants.map((x,i)=>`<button type="button" data-opt="${i}" aria-pressed="${i===appOpt}">Option ${'AB'[i]}</button>`).join('')}</div>`;
    h+=qualityScheduleHtml(v,s,st);

    return h;}
  if(it.kind==='race'){const r2=it.s;
    return head(sessionTitle(r2),sessionInfoHeaderHtml('Charge de la course',`<p>Charge estimée : ${pts(r2.load)}.</p>`))+`<div class="card"><div class="lbl">${r2.goal?'Objectif':'Estimation'}</div><div class="big">${fmtTime(r2.targetTime)}</div><div class="kv" style="margin-top:.7rem"><span>Allure</span><span class="v">${paceHtml(kmh(r2.targetPace,r2.targetPace))}</span><span>Échauffement</span><span class="v">${r2.wu}'</span><span>Retour au calme</span><span class="v">${r2.cd}'</span></div></div>`;}
  if(it.kind==='sl')return head('Sortie longue',sessionInfoHeaderHtml('Charge',`<p>Charge estimée : ${pts(w.slLoad)}.</p>`))+`<div class="card"><div class="big">${fmtDur(w.sl)}</div><div class="kv" style="margin-top:.7rem"><span>En EF</span><span class="v">${fmtDur(w.sl-w.slS1)}</span>${w.slS1?`<span>Fin au premier seuil</span><span class="v">${w.slS1}'</span>`:w.slEA?`<span>Endurance active</span><span class="v">${Math.round(w.slEA.range[0])} à ${Math.round(w.slEA.range[1])}'</span><span>Plafond FC</span><span class="v">${st.lt1Hr?Math.round(st.lt1Hr)+' bpm':'LT1'}</span>`:''}<span class="wideLabel">Allure EF</span><span class="v wideVal">${paceHtml(efBandText('std',st))}</span>${w.slS1?`<span>Allure S1</span><span class="v">${paceHtml(kmh(st.s1lo,st.s1hi))}</span>`:''}</div></div>`;
  if(it.kind==='veille')return head('Jogg + LD',sessionInfoHeaderHtml('Pourquoi cette séance','<p>Très facile, puis quelques lignes droites avec récupération complète, avant la course.</p>'))+`<div class="card"><div class="big">${it.min}'</div><p class="lbl">Très facile, puis ${it.strides?it.strides[0]+' à '+it.strides[1]:'3 à 5'} lignes droites de ${it.seconds?it.seconds[0]+' à '+it.seconds[1]:'10 à 15'}", récupération complète.</p></div>`;
  if(it.kind==='foot'){const f=it.f;if(f.type==='active')return head(joggTitle(f),sessionInfoHeaderHtml('Pourquoi ce footing',`<p>Le bloc d’endurance active reste sous le premier seuil, avec un début et une fin faciles.</p><p>Charge estimée : ${pts(f.load)}.</p>`))+`<div class="card"><div class="big">${fmtFootDur(f.min)}</div><div class="kv" style="margin-top:.7rem"><span>Début facile</span><span class="v">${f.wu}'</span><span>Bloc actif</span><span class="v">${activeRangeText(f)}</span><span class="wideLabel">Intensité du bloc</span><span class="v wideVal">${paceHtml(efBandText('active',st))}</span><span>Fin facile</span><span class="v">${f.cd}'</span><span>Plafond FC</span><span class="v">${st.lt1Hr?Math.round(st.lt1Hr)+' bpm':'LT1'}</span></div></div>`;const lab=joggTitle(f);
    const info=`<details class="footInfo"><summary aria-label="Pourquoi ce footing" title="Pourquoi ce footing">ⓘ</summary><div class="footInfoBody"><p>Jogg’ facile au ressenti : adapte l’effort à ta fatigue et au terrain, sans dépasser le premier seuil. La durée tient compte du volume hebdomadaire et des séances voisines.</p><p>Charge estimée : ${pts(f.load)}.</p></div></details>`;
    return head(lab,info)+`<div class="card"><div class="big">${fmtFootDur(f.min)}</div><div class="kv" style="margin-top:.7rem"><span class="wideLabel">Zone proposée</span><span class="v wideVal">${paceHtml(efBandText(f.type,st))}</span></div>${f.ld?`<p class="lbl" style="margin-top:.6rem">En fin de footing : ${LD.split(' : ')[1]}.</p>`:''}${f.shortHills?`<p class="lbl" style="margin-top:.6rem">En fin de footing : ${f.shortHills.reps[0]} à ${f.shortHills.reps[1]} × ${f.shortHills.seconds[0]} à ${f.shortHills.seconds[1]}" en côte (${f.shortHills.gradePct[0]}–${f.shortHills.gradePct[1]} %), récupération complète. Non compté comme qualité.</p>`:''}</div>`;}
  return'';
}
function openSession(ref){appSession=ref;appOpt=0;renderApp();window.scrollTo(0,0);}
function updateInputErrorBanner(){
  for(const id of ['scr-today','scr-cal','scr-ref','scr-set']){
    const screen=$(id);let banner=screen.querySelector('[data-input-errors]');
    if(!banner){banner=document.createElement('div');banner.dataset.inputErrors='';screen.prepend(banner);}
    banner.innerHTML=inputErrorHtml();
  }
}
function renderApp(){
  if(lastPlan?.weeks&&lastSt&&!recoveryState&&!inputErrors(lastSt).length)lastPlan=recalculatePlanSummary(reviveSavedPlan(lastPlan),lastSt);
  updateInputErrorBanner();
  if(appSession){
    $('appBar').hidden=false;$('appTitle').textContent='Séance';$('appBack').hidden=false;
    ['today','cal','ref','calc','study','set'].forEach(k=>{$('scr-'+k).hidden=true;});$('scr-lib').hidden=true;$('scr-session').hidden=false;$('scr-session').innerHTML=sessionScreenHtml()+planifMoveNoticeHtml()+(globalThis.PlanifStrava?.sessionHtml(planifSessionInfo(appSession))||'');globalThis.PlanifStrava?.onSession(planifSessionInfo(appSession));
    if($('scr-session').querySelector('.sHead')&&!$('scr-session').querySelector('[data-coros-preview],[data-coros-completed]'))$('scr-session').insertAdjacentHTML('beforeend','<button type="button" class="cta ghost" data-coros-preview>Envoyer vers COROS</button>');
    document.querySelectorAll('.tabbar button').forEach(b=>{if(b.dataset.tab===appTab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    return;}
  $('scr-session').hidden=true;
  if(appLib){$('appBar').hidden=false;$('appTitle').textContent='Bibliothèque';$('appBack').hidden=false;['today','cal','ref','calc','study','set'].forEach(k=>{$('scr-'+k).hidden=true;});$('scr-lib').hidden=false;$('scr-lib').innerHTML=appLibHtml();
    document.querySelectorAll('.tabbar button').forEach(b=>{if(b.dataset.tab===appTab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});return;}
  $('scr-lib').hidden=true;$('appBack').hidden=true;$('appBar').hidden=true;
  $('appTitle').textContent='';
  document.querySelectorAll('.tabbar button').forEach(b=>{if(b.dataset.tab===appTab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  ['today','cal','ref','calc','study','set'].forEach(k=>{$('scr-'+k).hidden=k!==appTab;});
  if(appTab==='set'){if(!setBuilt){$('scr-set').innerHTML=appSetHtml();initSet();setBuilt=true;}updateSet();updateInputErrorBanner();return;}
  const f={today:appTodayHtml,cal:appCalHtml,ref:appRefHtml,calc:appCalcHtml,study:appStudyHtml}[appTab];
  $('scr-'+appTab).innerHTML=f();
  if(appTab==='ref')initRef();if(appTab==='calc'){updateConversionUi();updateToolsUi();updateLoadToolUi();updateLoadCurveUi();}
  updateInputErrorBanner();
}
const setUi=u=>{document.body.dataset.ui=u;setBuilt=false;try{localStorage.setItem('calc-allures-ui',u);}catch(e){console.warn('Planif : préférence ou stockage local indisponible.',e?.name||'Erreur');}if(u==='app')renderApp();window.scrollTo(0,0);};
$('scr-calc').addEventListener('change',e=>{const d=e.target.dataset;if(d.simDist!==undefined){sim.dist=e.target.value;renderApp();}else if(d.simProfile!==undefined){sim.profile=e.target.value;renderApp();}else if(d.simPenalty!==undefined){sim.penalty=e.target.checked;renderApp();}else if(d.simDist2!==undefined){sim.ref2Dist=e.target.value;renderApp();}else if(d.simPart!==undefined){const box=e.target.closest('[data-sim-wheel]'),key=box.dataset.simWheel,long=Number(key==='time'?sim.dist:sim.ref2Dist)>=2,parts={};box.querySelectorAll('[data-sim-part]').forEach(el=>parts[el.dataset.simPart]=Number(el.value));sim[key]=long?parts.h+':'+String(parts.m).padStart(2,'0')+':'+String(parts.s).padStart(2,'0'):parts.m+':'+String(parts.s).padStart(2,'0');const out=$('scr-calc').querySelector('[data-sim-result]');if(out)out.innerHTML=simResults();}});
$('scr-calc').addEventListener('click',e=>{if(e.target.closest('[data-sim-add]')){sim.ref2Open=true;renderApp();}else if(e.target.closest('[data-sim-remove]')){sim.ref2Open=false;renderApp();}});
document.querySelector('.tabbar').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(!b)return;appSession=null;appLib=false;setBuilt=false;appTab=b.dataset.tab;try{localStorage.setItem('calc-allures-tab',appTab);}catch(_){console.warn('Planif : préférence ou stockage local indisponible.',_?.name||'Erreur');}renderApp();window.scrollTo(0,0);});
$('appShell').addEventListener('click',e=>{
  if(e.target.closest('[data-coros-preview]')){try{PlanifCoros.preview(corosSessionSnapshot());}catch(error){PlanifCoros.preview({title:'Séance',description:'',unsupported:error.message});}return;}
  const ss=e.target.closest('[data-studyscope]');if(ss){studyScope=ss.dataset.studyscope;studyFilter='Toutes';renderApp();return;}
  const sf=e.target.closest('[data-studyfilter]');if(sf){studyFilter=sf.dataset.studyfilter;renderApp();return;}
  const tl=e.target.closest('[data-timeline]');if(tl){calendarTimelineOpen=!calendarTimelineOpen;renderApp();return;}
  const o=e.target.closest('[data-open]');if(o){const p=o.dataset.open.split(',');openSession(p[1]==='q'?{w:+p[0],q:+p[2]}:p[1]==='f'?{w:+p[0],f:+p[2]}:p[1]==='sl'?{w:+p[0],sl:true}:{w:+p[0],d:+p[1],i:+p[2]});return;}
  const wk=e.target.closest('[data-week]');if(wk){const i=+wk.dataset.week;if(calOpen.has(i))calOpen.delete(i);else calOpen.add(i);renderApp();return;}
  const ol=e.target.closest('[data-openlib]');if(ol){if(inputErrors(readState()).length){alert(inputErrors(readState()).join('\n'));return;}appLib=true;renderApp();window.scrollTo(0,0);return;}
  const ls=e.target.closest('[data-lsec]');if(ls){libSector=ls.dataset.lsec;libFam='all';renderApp();return;}
  const lf=e.target.closest('[data-lfam]');if(lf){libFam=lf.dataset.lfam;renderApp();return;}
  const lv=e.target.closest('[data-lvol]');if(lv){libVol=+lv.dataset.lvol;renderApp();return;}
  const lt=e.target.closest('[data-lib]');if(lt){const[sector,k]=lt.dataset.lib.split('|');appSession={lib:{sector,key:decodeURIComponent(k)}};renderApp();window.scrollTo(0,0);return;}
  const op=e.target.closest('[data-opt]');if(op){appOpt=+op.dataset.opt;renderApp();return;}
  const g=e.target.closest('[data-goto]');if(!g)return;if(g.dataset.goto==='expert')setUi('expert');else{appTab=g.dataset.goto;setBuilt=false;renderApp();}});
$('appBack').addEventListener('click',()=>{if(appSession){const fromLib=!!appSession.lib;appSession=null;if(!fromLib)appLib=false;}else appLib=false;renderApp();window.scrollTo(0,0);});
$('toApp').addEventListener('click',()=>setUi('app'));
$('f').addEventListener('input',()=>{calOpen=null;if(appTab==='ref'&&document.activeElement?.closest('#scr-ref')){updateInputErrorBanner();return;}renderApp();});$('f').addEventListener('change',()=>renderApp());
document.addEventListener('planif-coros-change',()=>{if(PlanifCoros.callback){appSession=null;appLib=false;appTab='set';setUi('app');}else{setBuilt=false;if(appTab==='set'&&!appSession&&!appLib)renderApp();}document.querySelectorAll('[data-coros]').forEach(b=>b.disabled=PlanifCoros.busy);});
load();syncQualityPrereqs();render();renderApp();
PlanifCoros.start();
globalThis.PlanifCalendarDrag?.({root:$('scr-cal'),getSession:id=>findPlanifSession(lastPlan,id),check:(id,date)=>planifMoveCheck(lastPlan,id,date,lastSt),move:(date,ref)=>movePlanifSession(date,ref,true),say:message=>{calendarMoveMessage=message;const region=$('calMoveStatus');if(region)region.textContent=message;}});
window.PlanifStravaContext={
  get activePlan(){return activePlan;},
  get appOpt(){return appOpt;},
  sessionInfo(){return planifSessionInfo(appSession);},
  redraw(){setBuilt=false;renderApp();},
  settings(){appSession=null;appLib=false;appTab='set';setBuilt=false;renderApp();}
};
const loadStrava=()=>{const stravaScript=document.createElement('script');stravaScript.src='./planif-strava.js?v='+APP_VERSION;document.body.append(stravaScript);};
if(document.readyState==='complete')loadStrava();else window.addEventListener('load',loadStrava,{once:true});
})();

if ('serviceWorker' in navigator) {
  const register=() => {
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(() => {});
  };
  if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
}

}).catch(function(error){
  console.error('Planif initialization failed',error);
  document.body.dataset.ui='app';
  const host=document.getElementById('appShell')||document.body;
  host.innerHTML='<div class="card" style="margin:1rem"><h2>Chargement interrompu</h2><p>Vérifie ta connexion Internet puis réessaie. Les plans enregistrés sur cet appareil sont conservés.</p><button type="button" id="planifRetry">Réessayer</button></div>';
  document.getElementById('planifRetry').addEventListener('click',()=>location.reload());
});
