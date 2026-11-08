/* PlanifBackup: export and import of locally stored Planif data. Pure functions, no DOM or storage. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./planif-engine.js'));
  else root.PlanifBackup=factory(root.PlanifEngine);
})(globalThis,function(engine){
  'use strict';
  const FORMAT='planif-backup',SCHEMA=1,MAX_BYTES=8*1024*1024,MAX_HISTORY=200;
  // Exported keys and the shape of their raw storage value. Device-specific data (COROS and
  // Strava sessions, send tracking, recovery copies, pending flags) is never exported.
  const KEYS={
    'planif-global-v1':'object',
    'planif-block-draft-v1':'object',
    'planif-calendar-draft-v1':'object',
    'planif-active-plan-v1':'plan',
    'planif-plan-history-v1':'history',
    'planif-mode-v1':['cal','bloc'],
    'planif-weekly-balance-v2':['saved'],
    'planif-theme':['light','dark'],
    'planif-speed-unit':['kmh','pace'],
    'calc-allures-ui':['app','expert'],
    'calc-allures-tab':['today','cal','ref','calc','study','set'],
    'calc-allures-calview':['cal','weeks','details'],
    'planif-coros-profile-v1':['"manual"','"guided"']
  };
  const ACTIVE='planif-active-plan-v1',HISTORY='planif-plan-history-v1';
  const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  const FORBIDDEN_KEYS=new Set(['__proto__','constructor','prototype']);
  const fail=message=>{throw new Error(message);};
  const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const isoDate=v=>typeof v==='string'&&ISO.test(v)&&Number.isFinite(Date.parse(v));
  const id=v=>typeof v==='string'&&/^[\w.:-]{1,100}$/.test(v)&&!FORBIDDEN_KEYS.has(v);
  const distance=v=>Number.isInteger(v)&&v>=0&&v<engine.DIST.length;

  function checkVariant(v){
    if(!isObject(v)||typeof v.fam!=='string'||!isObject(v.structure)
      ||(v.cues!==undefined&&!Array.isArray(v.cues))
      ||(v.parts!==undefined&&(!Array.isArray(v.parts)||!v.parts.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))))return false;
    const components=v.structure.components;
    if(components!==undefined&&(!Array.isArray(components)||!components.every(c=>isObject(c)&&typeof c.fam==='string'&&checkVariant(c.variant))))return false;
    try{return typeof engine.presentVariantRaw(v).text==='string';}catch(_){return false;}
  }
  const quality=s=>isObject(s)&&Object.hasOwn(engine.ZONES,s.zone)
    &&(!['spec','taper'].includes(s.fam)||distance(s.dist))&&typeof engine.sessionTitle(s)==='string'
    &&Number.isFinite(s.total)&&Array.isArray(s.variants)&&s.variants.length===2&&s.variants.every(checkVariant);
  const race=s=>isObject(s)&&s.fam==='race'&&distance(s.dist)
    &&engine.DIST.some(d=>Math.abs(d.km-s.distance)<0.01)&&Number.isFinite(s.targetTime)&&Number.isFinite(s.targetPace);
  const foot=f=>isObject(f)&&Object.hasOwn(engine.FOOT,f.type)&&Number.isFinite(f.min)
    &&(f.type!=='active'||Array.isArray(f.activeRange));
  function checkItem(it){
    if(!isObject(it)||(it.planifId!==undefined&&!id(it.planifId)))return false;
    if(it.kind==='q')return quality(it.s);
    if(it.kind==='race')return race(it.s);
    if(it.kind==='foot')return foot(it.f);
    if(it.kind==='veille')return Number.isFinite(it.min);
    return it.kind==='sl';
  }

  function createBackup(values,{version='',exportedAt=new Date().toISOString(),timeZone=''}={}){
    const out={};
    for(const key of Object.keys(KEYS))if(typeof values?.[key]==='string')out[key]=values[key];
    return {format:FORMAT,schema:SCHEMA,app:'Planif',version,exportedAt,timeZone,values:out};
  }
  const backupFileName=(exportedAt=new Date().toISOString())=>`planif-sauvegarde-${String(exportedAt).slice(0,10)}.json`;

  // Templates insert saved text into HTML: '<' could open a tag, so it is refused anywhere in an
  // imported file (Planif never writes it). Prototype keys are refused as well.
  function scan(value,path,depth=0){
    if(depth>64)fail('Fichier refusé : structure trop profonde.');
    if(typeof value==='string'){if(value.includes('<'))fail(`Fichier refusé : contenu inattendu (${path}).`);return;}
    if(value===null||typeof value==='number'||typeof value==='boolean'){if(typeof value==='number'&&!Number.isFinite(value))fail(`Fichier refusé : nombre invalide (${path}).`);return;}
    if(Array.isArray(value)){value.forEach((v,i)=>scan(v,`${path}[${i}]`,depth+1));return;}
    if(isObject(value)){
      for(const [k,v] of Object.entries(value)){
        if(FORBIDDEN_KEYS.has(k)||k.includes('<'))fail(`Fichier refusé : clé interdite (${path}).`);
        scan(v,`${path}.${k}`,depth+1);
      }
      return;
    }
    fail(`Fichier refusé : valeur invalide (${path}).`);
  }
  function checkPlan(record,label){
    if(!isObject(record))fail(`${label} : plan invalide.`);
    if(!id(record.id))fail(`${label} : identifiant invalide.`);
    if(record.title!==undefined&&(typeof record.title!=='string'||record.title.length>200))fail(`${label} : titre invalide.`);
    if(!isObject(record.structure))fail(`${label} : structure manquante.`);
    if(record.dateZone!==undefined&&(typeof record.dateZone!=='string'||!/^[A-Za-z0-9_+\/-]{1,64}$/.test(record.dateZone)))fail(`${label} : fuseau invalide.`);
    for(const k of ['createdAt','updatedAt','archivedAt'])if(record[k]!==undefined&&!isoDate(record[k]))fail(`${label} : date ${k} invalide.`);
    const plan=record.plan;
    if(!isObject(plan)||!isObject(plan.race)||!isoDate(plan.race.date)||!isoDate(plan.start))fail(`${label} : dates de course manquantes.`);
    if(!distance(plan.race.distance))fail(`${label} : distance de course invalide.`);
    if(!Array.isArray(plan.weeks)||!plan.weeks.length||plan.weeks.length>200)fail(`${label} : semaines invalides.`);
    for(const [i,w] of plan.weeks.entries()){
      if(!isObject(w)||w.index!==i||!isoDate(w.startDate)||!isoDate(w.endDate)
        ||!Object.hasOwn(engine.PHASE_LAB,w.phase)||!Array.isArray(w.days)||!w.days.length||w.days.length>7
        ||!Array.isArray(w.sessions)||!w.sessions.every(quality)||!Array.isArray(w.foot)||!w.foot.every(foot)
        ||(w.race!=null&&!race(w.race)))fail(`${label} : semaine ${i+1} invalide.`);
      for(const d of w.days)if(!isObject(d)||!isoDate(d.date)||!Array.isArray(d.items)||d.items.length>40||!d.items.every(checkItem))fail(`${label} : jour ou séance invalide en semaine ${i+1}.`);
    }
  }
  function checkValue(key,raw){
    const rule=KEYS[key];
    if(typeof raw!=='string')fail(`Fichier refusé : valeur ${key} invalide.`);
    if(Array.isArray(rule)){if(!rule.includes(raw))fail(`Fichier refusé : valeur ${key} inconnue.`);return null;}
    let parsed;try{parsed=JSON.parse(raw);}catch(_){fail(`Fichier refusé : ${key} illisible.`);}
    scan(parsed,key);
    if(rule==='object'){
      if(!isObject(parsed)||!Object.values(parsed).every(v=>v===null||['string','number','boolean'].includes(typeof v)))fail(`Fichier refusé : ${key} invalide.`);
    }else if(rule==='plan'){if(parsed!==null)checkPlan(parsed,'Plan actif');}
    else if(rule==='history'){
      if(!Array.isArray(parsed)||parsed.length>MAX_HISTORY)fail('Fichier refusé : historique invalide.');
      parsed.forEach((p,i)=>checkPlan(p,`Plan archivé ${i+1}`));
    }
    return parsed;
  }

  function parseBackup(text){
    if(typeof text!=='string')fail('Fichier illisible.');
    if(text.length>MAX_BYTES)fail('Fichier trop volumineux pour une sauvegarde Planif.');
    let data;try{data=JSON.parse(text);}catch(_){fail('Ce fichier n’est pas une sauvegarde Planif (JSON illisible).');}
    if(!isObject(data)||data.format!==FORMAT)fail('Ce fichier n’est pas une sauvegarde Planif.');
    if(data.schema!==SCHEMA)fail('Version de sauvegarde non prise en charge. Mets Planif à jour puis réessaie.');
    if(!isObject(data.values))fail('Sauvegarde vide ou endommagée.');
    const values={},parsed={};
    for(const [key,raw] of Object.entries(data.values)){
      if(!Object.prototype.hasOwnProperty.call(KEYS,key))fail(`Fichier refusé : clé inconnue (${String(key).slice(0,60)}).`);
      parsed[key]=checkValue(key,raw);values[key]=raw;
    }
    const active=parsed[ACTIVE]||null,history=parsed[HISTORY]||[];
    if(!active&&!history.length)fail('Cette sauvegarde ne contient aucun plan.');
    return {values,summary:{
      version:typeof data.version==='string'?data.version.slice(0,20):'',
      exportedAt:isoDate(data.exportedAt)?data.exportedAt:null,
      activeTitle:active?(active.title||'Plan de course'):null,
      historyCount:history.length
    }};
  }

  // Values to write: imported keys replace the current ones. The current active plan, when there
  // is one, is archived ahead of the current history, after the imported history; identical
  // records are kept once. Keys absent from the file are left untouched. Each record keeps its own
  // dateZone: plan dates are re-expressed in the device zone only when the app reads them.
  function planImport(current,imported,{now=new Date().toISOString()}={}){
    const read=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback;}catch(_){return fallback;}};
    const next={...imported.values};
    const importedHistory=read(imported.values[HISTORY],[]);
    const currentActive=read(current[ACTIVE],null),currentHistory=read(current[HISTORY],[]);
    const replacesActive=Object.hasOwn(imported.values,ACTIVE);
    const merged=[...importedHistory];
    if(replacesActive&&isObject(currentActive)&&currentActive.plan)merged.push({...currentActive,archivedAt:now,archiveReason:'avant import d’une sauvegarde'});
    if(Array.isArray(currentHistory))merged.push(...currentHistory);
    const seen=new Set(),history=[];
    for(const record of merged){
      if(!isObject(record))continue;
      const key=JSON.stringify(record);
      if(seen.has(key))continue;seen.add(key);history.push(record);
    }
    if(history.length>MAX_HISTORY)fail('Import impossible : historique fusionné trop volumineux. Rien n’a été modifié.');
    next[HISTORY]=JSON.stringify(history);
    return next;
  }

  return {FORMAT,SCHEMA,KEYS:Object.freeze({...KEYS}),MAX_BYTES,createBackup,backupFileName,parseBackup,planImport};
});
