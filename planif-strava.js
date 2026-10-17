/* Liaison au Firebase existant. Les validations sont explicites et réversibles. */
window.PlanifStrava=(()=>{
  'use strict';
  const ctx=window.PlanifStravaContext;
  const ORIGIN='https://strava-mobile-2f93f.web.app';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(storage,key,fallback)=>{try{return JSON.parse(storage.getItem(key)||'null')||fallback;}catch{return fallback;}};
  // Firebase Auth conserve et renouvelle la session propre à cette origine (Planif).
  let firebaseAuth=null,auth=null,verified=false,records={},activities={},message='',busy=false,showLogin=false,loadedPlan=null,generation=0;
  const ready=()=>verified&&!!firebaseAuth?.currentUser&&auth?.uid===firebaseAuth.currentUser.uid&&auth.expiresAt>Date.now();
  const cacheKey=(planId,uid=auth.uid)=>'planif-strava-records-v1:'+uid+':'+planId;
  function redraw(){ctx.redraw();}
  async function token(force=false){
    const user=firebaseAuth?.currentUser;if(!user||auth?.uid!==user.uid)throw Error('Reconnecte ton compte athlète pour actualiser les données.');
    const result=await user.getIdTokenResult(force);
    if(firebaseAuth.currentUser!==user)throw Error('Le compte a changé. Réessaie.');
    auth.expiresAt=Date.parse(result.expirationTime)||0;
    return result.token;
  }
  async function api(path,options={}){
    const uid=auth?.uid,seq=generation;
    const send=async force=>fetch(ORIGIN+'/api/'+path,{...options,headers:{'Content-Type':'application/json','Authorization':'Bearer '+await token(force),...options.headers}});
    let response=await send(false);
    if(response.status===401&&generation===seq&&auth?.uid===uid)response=await send(true);
    if(generation!==seq||auth?.uid!==uid)throw Error('Le compte a changé. Réessaie.');
    const data=await response.json();if(!response.ok){if(response.status===401){verified=false;redraw();}throw Error(data.error||'Connexion indisponible.');}return data;
  }
  async function restore(user){
    const seq=++generation;
    if(!user){auth=null;verified=false;records={};activities={};loadedPlan=null;redraw();return;}
    auth={uid:user.uid,name:user.displayName||user.email||'Athlète',expiresAt:0};verified=false;
    records={};activities={};loadedPlan=null;redraw();
    try{
      await token();const me=await api('me');
      if(generation!==seq||me.uid!==user.uid||!me.profile)throw Error('Compte athlète introuvable.');
      auth.name=me.profile.displayName||auth.name;verified=true;
      message='';
      await refresh();
    }catch(e){if(generation===seq){verified=false;message='Connexion à vérifier : '+e.message;}}
    if(generation===seq)redraw();
  }
  try{
    if(window.firebase){
      const app=window.firebase.apps?.length?window.firebase.app():window.firebase.initializeApp({apiKey:'AIzaSyBe6x-D-jJuOmygqRbQBW34g6PwMFQbEuA',authDomain:'strava-mobile-2f93f.firebaseapp.com',projectId:'strava-mobile-2f93f'});
      firebaseAuth=app.auth();
      firebaseAuth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).then(()=>{firebaseAuth.onAuthStateChanged(restore,e=>{verified=false;message='Session Firebase indisponible : '+e.message;redraw();});firebaseAuth.onIdTokenChanged?.(async user=>{if(user&&auth?.uid===user.uid&&verified){try{const result=await user.getIdTokenResult();if(firebaseAuth.currentUser===user&&auth?.uid===user.uid){auth.expiresAt=Date.parse(result.expirationTime)||0;redraw();}}catch{verified=false;redraw();}}});}).catch(e=>{message='Session Firebase indisponible : '+e.message;redraw();});
    }else message='Connexion Firebase indisponible. Vérifie la connexion Internet.';
  }catch(e){message='Connexion Firebase indisponible : '+e.message;}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&firebaseAuth?.currentUser&&!verified)restore(firebaseAuth.currentUser);});
  function connect(){if(auth)return;showLogin=true;message='Saisis une seule fois les identifiants de ton compte Flow Strava.';redraw();}
  async function login(form){
    const email=form.elements.email.value.trim(),password=form.elements.password.value;
    try{
      if(!firebaseAuth)throw Error('Connexion Firebase indisponible.');
      await firebaseAuth.signInWithEmailAndPassword(email,password);showLogin=false;
    }catch(e){throw Error('Connexion impossible. Vérifie les identifiants de ton application Strava.');}
    finally{form.elements.password.value='';}
  }
  async function refresh(){
    if(!auth||!ctx.activePlan)return;
    const planId=ctx.activePlan.id,uid=auth.uid;
    records=read(localStorage,cacheKey(planId),{});loadedPlan=planId;
    const data=await api('planif/plans/'+encodeURIComponent(planId));
    if(auth?.uid!==uid||ctx.activePlan?.id!==planId)return;
    records=Object.fromEntries(data.sessions.map(r=>[r.id,r]));localStorage.setItem(cacheKey(planId),JSON.stringify(records));redraw();
  }
  const currentRecords=info=>auth&&info&&info.planId===loadedPlan?records:{};
  const statusLabel=status=>({realized:'Réalisée',adapted:'Adaptée',missed:'Non réalisée',planned:'Prévue'}[status]||'Prévue');
  const finalized=record=>['realized','adapted','missed'].includes(record?.status);
  const todayKey=()=>{const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');};
  function badge(info){const record=currentRecords(info)[info?.id];return record&&record.status!=='planned'?`<span class="inPlan">${record.status==='missed'?'':'✓ '}${statusLabel(record.status)}</span>`:'';}
  function settingsHtml(){return `<div class="card connectionCard"><div class="settingsTitle connectionTitle"><h2>Liaison Strava</h2><span class="connectionTag${ready()?'':auth?' pending':' off'}">${ready()?'Connecté':auth?'À vérifier':'Déconnecté'}</span></div>${auth?'<p class="lbl">Compte : '+esc(auth.name)+'</p>':''}${auth?'<button type="button" class="cta ghost" data-strava="refresh">Actualiser les validations</button><button type="button" class="cta ghost" data-strava="disconnect">Déconnecter Planif</button>':'<button type="button" class="cta ghost" data-strava="connect" aria-expanded="'+showLogin+'">Connexion</button>'}${showLogin&&!auth?'<form data-strava-login><label class="sf"><span>Email</span><input name="email" type="email" autocomplete="username" required></label><label class="sf"><span>Mot de passe</span><input name="password" type="password" autocomplete="current-password" required></label><button class="cta" type="submit">Se connecter</button></form>':''}${message?'<p class="lbl" role="status">'+esc(message)+'</p>':''}</div>`;}
  const candidateKey=info=>info.planId+':'+info.id+':'+info.date;
  const offset=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  function rank(list,info){return list.map(a=>({...a,score:Math.abs(Date.parse(a.date)-Date.parse(info.date))/86400000*3+Math.abs(a.durationSec/60-info.minutes)/Math.max(1,info.minutes)})).sort((a,b)=>a.score-b.score);}
  async function search(info){
    if(!info||info.date>todayKey())throw Error('La recherche est disponible à partir du jour prévu pour la séance.');
    const key=candidateKey(info),uid=auth?.uid;
    const data=await api(`planif/activities?from=${offset(info.date,-7)}&to=${offset(info.date,7)}`);
    if(auth?.uid!==uid||ctx.activePlan?.id!==info.planId)return;
    activities[key]={list:rank(data.activities,info),truncated:data.truncated};
    message=data.activities.length?'Sélectionne la sortie puis confirme son association.':'Aucune sortie trouvée autour de cette date. Synchronise ton application Strava puis actualise.';redraw();
  }
  function sessionHtml(info){
    if(!info)return '';
    const record=currentRecords(info)[info.id],results=activities[candidateKey(info)],used=new Set(Object.values(currentRecords(info)).filter(r=>r.id!==info.id&&r.activityId).map(r=>r.activityId));
    const completed=['realized','adapted'].includes(record?.status);
    let h=`<div class="card"${completed?' data-coros-completed':''}><h2>Suivi de la séance</h2><div class="sessionStatus"><b>${!record?.activityId&&(!record||record.status==='planned')&&results?.list.length?'Activité trouvée · à confirmer':statusLabel(record?.status)}</b>${auth&&finalized(record)?`<button type="button" class="stravaUndo" data-strava="undo" ${busy?'disabled':''}><span aria-hidden="true">×</span> Annuler la validation</button>`:''}</div>`;
    if(record?.activity){const a=record.activity;h+=`<p>${esc(a.name)} · ${esc(a.date)} · ${Math.round(a.durationSec/60)}’ · ${Number(a.distanceKm).toFixed(2)} km</p><p class="lbl">Activité associée ; le respect des fractions et des allures n’est pas évalué automatiquement.</p>`;}
    if(!auth)h+='<button type="button" class="cta ghost" data-strava="settings">Lier mon compte Strava</button>';
    else if(finalized(record)){
      if(record.activity)h+=`<a class="cta ghost stravaActivity" href="https://www.strava.com/activities/${encodeURIComponent(record.activity.id)}" target="_blank" rel="noopener">Voir l’activité Strava</a>`;
      h+=`<p class="lbl" role="status">${esc(message)}</p>`;
    }else if(info.date<=todayKey()){
      h+=`<button type="button" class="cta ghost" data-strava="search" ${busy?'disabled':''}>${results?'Actualiser les sorties':'Rechercher une activité'}</button>`;
      const list=results?.list.filter(a=>!used.has(a.id))||[];
      if(list.length)h+=`<form data-strava-associate><label class="sf"><span>Activité à associer</span><select name="activityId">${list.map(a=>`<option value="${esc(a.id)}">${esc(a.date)} · ${esc(a.name)} · ${Math.round(a.durationSec/60)}’ · ${Number(a.distanceKm).toFixed(2)} km</option>`).join('')}</select></label><label class="sf"><span>Résultat</span><select name="status"><option value="realized">Réalisée</option><option value="adapted">Adaptée · contenu modifié</option></select></label><button type="submit" class="cta" ${busy?'disabled':''}>Confirmer l’association</button></form>`;
      if(results?.truncated)h+='<p class="lbl">La liste a atteint sa limite de 200 activités.</p>';
      if(info.date<=todayKey())h+=`<button type="button" class="cta ghost" data-strava="missed" ${busy?'disabled':''}>Marquer non réalisée</button>`;
      h+=`<p class="lbl" role="status">${esc(message)}</p>`;
    }
    return h+(completed?'':'<button type="button" class="cta ghost" data-coros-preview>Envoyer vers COROS</button>')+'</div>';
  }
  async function save(info,status,activityId=null){
    const prior=currentRecords(info)[info.id],uid=auth?.uid;
    if(status==='missed'&&info.date>todayKey())throw Error('Une séance future ne peut pas être marquée non réalisée.');
    if(status!=='planned'&&finalized(prior))throw Error('Annule la validation avant de modifier le résultat.');
    const record=await api(`planif/plans/${encodeURIComponent(info.planId)}/sessions/${encodeURIComponent(info.id)}`,{method:'PUT',body:JSON.stringify({status,activityId,revision:prior?.revision||0,plannedAt:info.date,plannedMinutes:info.minutes,title:info.title,planTitle:ctx.activePlan.title,option:ctx.appOpt})});
    if(auth?.uid!==uid||ctx.activePlan?.id!==info.planId){const cached=read(localStorage,cacheKey(info.planId,uid),{});cached[info.id]=record;localStorage.setItem(cacheKey(info.planId,uid),JSON.stringify(cached));return;}
    records[info.id]=record;localStorage.setItem(cacheKey(info.planId),JSON.stringify(records));message=status==='planned'?'Validation annulée.':statusLabel(status)+' : enregistré.';redraw();
  }
  function onSession(info){
    if(!info||!auth||!firebaseAuth?.currentUser||busy||activities[candidateKey(info)]||finalized(currentRecords(info)[info.id])||info.date>todayKey())return;
    const uid=auth.uid,key=candidateKey(info);activities[key]={list:[],pending:true};
    setTimeout(()=>{if(auth?.uid===uid&&ctx.activePlan?.id===info.planId)perform(()=>search(info));},0);
  }
  async function perform(action){if(busy)return;busy=true;try{await action();}catch(e){message=e.message;}finally{busy=false;redraw();}}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-strava]');if(!b)return;
    const action=b.dataset.strava;
    if(action==='settings'){ctx.settings();return;}
    if(action==='connect'){connect();return;}
    if(action==='disconnect'){const previous=firebaseAuth?.currentUser;try{sessionStorage.removeItem('planif-strava-auth-v1');}catch{};++generation;verified=false;auth=null;showLogin=false;records={};activities={};loadedPlan=null;message='Déconnexion en cours…';redraw();perform(async()=>{try{await firebaseAuth?.signOut();message='Planif déconnecté. Les validations restent enregistrées pour ton compte.';}catch(e){if(previous)await restore(previous);throw Error('La déconnexion n’a pas abouti. Réessaie.');}});return;}
    if(action==='refresh'){perform(refresh);return;}
    const info=ctx.sessionInfo();if(!info)return;
    if(action==='search')perform(()=>search(info));
    if(action==='missed')perform(()=>save(info,'missed'));
    if(action==='undo')perform(()=>save(info,'planned'));
  });
  document.addEventListener('submit',e=>{
    if(e.target.matches('[data-strava-login]')){e.preventDefault();perform(()=>login(e.target));}
    if(e.target.matches('[data-strava-associate]')){e.preventDefault();const info=ctx.sessionInfo();if(info)perform(()=>save(info,e.target.elements.status.value,e.target.elements.activityId.value));}
  });
  function onPlan(){if(firebaseAuth?.currentUser&&auth&&ctx.activePlan&&loadedPlan!==ctx.activePlan.id){loadedPlan=ctx.activePlan.id;records=read(localStorage,cacheKey(loadedPlan),{});perform(refresh);}}
  document.addEventListener('planif-plan-change',onPlan);
  setTimeout(()=>{onPlan();redraw();},0);
  return {settingsHtml,sessionHtml,onSession,badge,rank,statusLabel};
})();
