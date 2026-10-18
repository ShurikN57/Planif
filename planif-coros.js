/* COROS : client OAuth public avec PKCE. Les formats sont découverts après connexion.
   La création est limitée à une séance neuve dans le calendrier ou la bibliothèque, après aperçu et confirmation. */
window.PlanifCoros=(()=>{
  'use strict';
  const PROFILE_KEY='planif-coros-profile-v1';
  const getProfile=()=>read(localStorage,PROFILE_KEY)==='guided'?'guided':'manual';
  const setProfile=value=>{if(!['manual','guided'].includes(value))throw new Error('Profil COROS invalide.');write(localStorage,PROFILE_KEY,value);};
  const profileOptions=selected=>`<option value="manual" ${selected==='manual'?'selected':''}>Au ressenti · manuel</option><option value="guided" ${selected==='guided'?'selected':''}>Guidé · chronométré</option>`;
  const KEY='planif-coros-v1',SCOPES='openid offline_access mcp.tools';
  const REGIONS={eu:'https://mcpeu.coros.com',us:'https://mcpus.coros.com',cn:'https://mcpcn.coros.com'};
  let auth=null,catalog=null,verified=false,busy=false,message='',refreshing=null,requestId=0,currentDraft=null,currentDate='';
  const callback=new URL(location.href).searchParams.get('coros_callback')==='1';
  const read=(store,key)=>{try{return JSON.parse(store.getItem(key)||'null');}catch(_){return null;}};
  const write=(store,key,value)=>{store.setItem(key,JSON.stringify(value));};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const emit=()=>document.dispatchEvent(new Event('planif-coros-change'));
  const base64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const random=()=>base64(crypto.getRandomValues(new Uint8Array(32)));
  const redirect=()=>{const u=new URL('./index.html',location.href);u.search='?coros_callback=1';u.hash='';return u.href;};
  const safeIssuer=i=>Object.values(REGIONS).includes(i);
  const fail=t=>{throw new Error(t);};
  async function request(url,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const r=await fetch(url,{...options,signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'});
      if(!r.ok){const e=new Error(r.status===401?'Connexion COROS expirée. Reconnecte ton compte.':`COROS ne peut pas terminer cette étape (HTTP ${r.status}).`);e.status=r.status;throw e;}
      const raw=await r.text();
      if((r.headers.get('content-type')||'').includes('text/event-stream')){
        for(const event of raw.split(/\r?\n\r?\n/)){const data=event.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data){const p=JSON.parse(data);if(p.id!==undefined)return p;}}
        fail('Réponse COROS incomplète. Réessaie la vérification.');
      }
      return JSON.parse(raw);
    }catch(e){if(e instanceof SyntaxError)fail('Réponse COROS illisible. Réessaie la vérification.');if(e.name==='AbortError'||e instanceof TypeError)fail('COROS est momentanément inaccessible. Vérifie la connexion Internet et réessaie.');throw e;}
    finally{clearTimeout(timer);}
  }
  const form=values=>({method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values).toString()});
  function tokenSet(p,clientId,issuer,previous){
    if(typeof p.access_token!=='string'||!p.access_token||!Number.isFinite(+p.expires_in)||+p.expires_in<=0)fail('COROS n’a pas fourni de connexion valide.');
    if(p.token_type&&p.token_type.toLowerCase()!=='bearer')fail('Ce type de connexion COROS n’est pas pris en charge.');
    return{issuer,clientId,accessToken:p.access_token,refreshToken:p.refresh_token||previous?.refreshToken,expiresAt:Date.now()+p.expires_in*1000};
  }
  function saveAuth(value){write(localStorage,KEY+'-auth',value);sessionStorage.removeItem(KEY+'-auth');auth=value;}
  async function connect(region){
    if(busy)return;busy=true;message='Ouverture de COROS…';emit();
    try{
      if(!navigator.onLine)fail('La connexion COROS nécessite Internet.');
      const issuer=REGIONS[region];if(!issuer)fail('Choisis la région de ton compte COROS.');
      const meta=await request(issuer+'/.well-known/oauth-authorization-server');
      if(meta.issuer!==issuer||meta.authorization_endpoint!==issuer+'/oauth2/authorize'||meta.token_endpoint!==issuer+'/oauth2/token'||meta.registration_endpoint!==issuer+'/connect/register'||!meta.code_challenge_methods_supported?.includes('S256')||!meta.token_endpoint_auth_methods_supported?.includes('none'))fail('La connexion COROS a changé. Une mise à jour de Planif est nécessaire.');
      const callbackUrl=redirect(),clientKey=KEY+'-client-'+region;
      let client=read(localStorage,clientKey);
      if(!client||client.redirect!==callbackUrl){
        const registered=await request(meta.registration_endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_name:'Planif',redirect_uris:[callbackUrl],grant_types:['authorization_code','refresh_token'],response_types:['code'],scope:SCOPES,token_endpoint_auth_method:'none'})});
        if(typeof registered.client_id!=='string'||!registered.client_id||registered.token_endpoint_auth_method&&registered.token_endpoint_auth_method!=='none')fail('COROS n’a pas accepté la connexion de Planif.');
        client={id:registered.client_id,redirect:callbackUrl};write(localStorage,clientKey,client);
      }
      const verifier=random(),state=random(),challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
      write(localStorage,KEY+'-pending',{issuer,clientId:client.id,verifier,state,redirect:callbackUrl,created:Date.now()});
      const u=new URL(meta.authorization_endpoint);u.search=new URLSearchParams({response_type:'code',client_id:client.id,redirect_uri:callbackUrl,scope:SCOPES,code_challenge:challenge,code_challenge_method:'S256',resource:issuer+'/mcp',state}).toString();
      location.assign(u.href);
    }catch(e){message=e.message;busy=false;emit();}
  }
  async function finish(){
    const u=new URL(location.href),pending=read(localStorage,KEY+'-pending');
    const code=u.searchParams.get('code'),state=u.searchParams.get('state'),error=u.searchParams.get('error');
    history.replaceState(null,'',new URL('./index.html',location.href).pathname);
    if(!pending||!safeIssuer(pending.issuer)||pending.state!==state||Date.now()-pending.created>15*60*1000||Date.now()<pending.created||pending.redirect!==redirect())fail('La connexion a expiré ou a été ouverte dans un autre navigateur. Relance « Connecter COROS » dans ce navigateur.');
    localStorage.removeItem(KEY+'-pending');
    if(error)fail('La connexion COROS a été annulée ou refusée. Tu peux la relancer.');
    if(!code)fail('Le retour de COROS est incomplet. Relance la connexion.');
    const p=await request(pending.issuer+'/oauth2/token',form({grant_type:'authorization_code',client_id:pending.clientId,code,redirect_uri:pending.redirect,code_verifier:pending.verifier}));
    saveAuth(tokenSet(p,pending.clientId,pending.issuer));
  }
  async function access(){
    if(!auth)fail('Connecte ton compte COROS dans Réglages.');
    if(auth.expiresAt>Date.now()+60000)return auth.accessToken;
    if(!refreshing)refreshing=(async()=>{try{if(!auth.refreshToken)fail('Reconnecte ton compte COROS.');const old=auth,p=await request(old.issuer+'/oauth2/token',form({grant_type:'refresh_token',client_id:old.clientId,refresh_token:old.refreshToken}));if(auth!==old)fail('La connexion COROS a changé.');saveAuth(tokenSet(p,old.clientId,old.issuer,old));return auth.accessToken;}finally{refreshing=null;}})();
    return refreshing;
  }
  async function rpc(method,params,retried=false){
    const token=await access();
    try{
      const p=await request(auth.issuer+'/mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream','Authorization':'Bearer '+token},body:JSON.stringify({jsonrpc:'2.0',id:++requestId,method,params})});
      if(p.error||!p.result)fail('COROS n’a pas accepté la vérification des fonctionnalités.');return p.result;
    }catch(e){if(method!=='tools/call'&&e.status===401&&!retried&&auth?.refreshToken){auth.expiresAt=0;return rpc(method,params,true);}throw e;}
  }
  async function discover(){
    await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'Planif',version:'1.0.0'}});
    const tools=[],seen=new Set();let cursor;
    do{const r=await rpc('tools/list',cursor?{cursor}:{});if(!Array.isArray(r.tools))fail('COROS n’a pas fourni ses formats.');tools.push(...r.tools);cursor=r.nextCursor;if(cursor){if(seen.has(cursor)||seen.size>=20)fail('La liste des fonctionnalités COROS est incomplète.');seen.add(cursor);}}while(cursor);
    catalog=tools.map(({name,description,inputSchema})=>({name,description,inputSchema}));verified=true;
    message=catalog.some(t=>t.name==='createSingleWorkout')?'':'Connexion vérifiée. Ton serveur COROS ne propose pas encore l’envoi de séances.';
  }
  async function verify(){if(busy)return;busy=true;message='Vérification de COROS…';emit();try{await discover();}catch(e){catalog=null;verified=false;message=e.message;}finally{busy=false;emit();}}
  function disconnect(){if(busy)return;auth=null;catalog=null;verified=false;sessionStorage.removeItem(KEY+'-auth');localStorage.removeItem(KEY+'-auth');localStorage.removeItem(KEY+'-pending');message='Compte déconnecté de Planif.';emit();}
  function downloadCatalog(){
    if(!catalog) return;
    const data={format:'planif-coros-capabilities-v1',date:new Date().toISOString(),region:Object.keys(REGIONS).find(k=>REGIONS[k]===auth?.issuer),tools:catalog};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Planif-formats-COROS.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function settingsHtml(){
    return `<div class="card connectionCard"><div class="settingsTitle connectionTitle"><h2>COROS</h2><span class="connectionTag${verified&&auth?.expiresAt>Date.now()?'':auth?' pending':' off'}">${verified&&auth?.expiresAt>Date.now()?'Connecté':auth?'À vérifier':'Déconnecté'}</span></div><label class="sf"><span>Profil COROS favori</span><select data-coros-profile>${profileOptions(getProfile())}</select></label>${auth?'':'<label class="sf"><span>Région du compte COROS</span><select id="corosRegion"><option value="eu">Europe</option><option value="us">États-Unis</option><option value="cn">Chine</option></select></label><button type="button" class="cta ghost" data-coros="connect">Connexion</button>'}${catalog?'<button type="button" class="cta ghost" data-coros="formats">Exporter les formats COROS</button>':''}${auth?'<button type="button" class="cta ghost" data-coros="disconnect">Déconnecter de Planif</button>':''}${message?'<p class="lbl corosStatus" role="status">'+escape(message)+'</p>':''}</div>`;
  }
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v);
  const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const SCHEMA_HASH='d0d0f363f5ad3cc69fd246279a94a8633a0e01b3c1e594376c0c95432f372138';
  const SCHEDULE_SCHEMA_HASH='b4b2ea06b9cf00c821d8e822a6975539cb2fe2a4e28b126112a1d53e99c3f3c5';
  const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function calendarDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('Choisis une date de calendrier valide.');
    const d=new Date(value+'T12:00:00'),today=new Date(),limit=new Date();limit.setDate(limit.getDate()+90);
    if(!Number.isFinite(+d)||localDate(d)!==value||value<localDate(today)||value>localDate(limit))fail('Choisis une date entre aujourd’hui et les 90 prochains jours. COROS vérifie aussi la date selon le fuseau de ton compte.');
    return value.replace(/-/g,'');
  }
  async function checkWriteTool(name){
    if(!catalog)await discover();
    const tool=catalog.find(t=>t.name===name);
    if(!tool||await digest(canonical({description:tool.description,inputSchema:tool.inputSchema}))!==(name==='createScheduledWorkout'?SCHEDULE_SCHEMA_HASH:SCHEMA_HASH))fail('Le format COROS de ton compte a changé. Exporte les formats dans Réglages pour faire vérifier la compatibilité.');
  }
  function sectionLabel(s){
    if(s.intervalGroup)return `${s.repeats} × (${s.sets.map(sectionLabel).join(' + ')})`;
    const names={1:'Échauffement',2:'Travail',3:'Récupération',4:'Retour au calme'};
    let target=s.targetType===4?'libre, bouton Tour':s.targetType===1?`${s.targetValue} m`:typeof s.targetValue==='object'?'durée à choisir':`${Math.floor(s.targetValue/60)} min${s.targetValue%60?' '+s.targetValue%60+' s':''}`;
    if(s.intensityType===2){const pace=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;target+=` · ${pace(s.intensityValueStart)}${s.intensityValueStart===s.intensityValueEnd?'':'–'+pace(s.intensityValueEnd)}/km`;}else target+=' · au ressenti';
    return `${names[s.sectionType]} : ${target}`;
  }
  function preview(snapshot){
    if(busy)return;
    let d=document.getElementById('corosPreview');if(!d){d=document.createElement('dialog');d.id='corosPreview';d.className='corosDialog';document.body.append(d);d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});d.addEventListener('click',e=>{if(e.target.closest('[data-coros-close]')&&!busy)d.close();});d.addEventListener('submit',e=>{e.preventDefault();sendFromPreview(d);});}
    let reason=snapshot.unsupported||'';currentDraft=null;
    try{if(!reason)currentDraft=PlanifCorosAdapter.plan(snapshot);}catch(e){reason=e.message;}
    const draft=currentDraft;currentDate=snapshot.date||localDate(new Date());const limit=new Date();limit.setDate(limit.getDate()+90);
    d.innerHTML=`<h2>Envoyer vers COROS</h2><h3>${escape(draft?.name||snapshot.title)}</h3>${reason?`<p>${escape(reason)}</p>`:`<p class="lbl">Choisis le calendrier pour programmer cette séance à une date, ou la bibliothèque pour conserver un modèle.</p><p class="lbl">${escape(draft.description)}</p><form id="corosSendForm"><label class="sf"><span>Profil pour cet envoi</span><select name="profile">${profileOptions(getProfile())}</select></label><label class="sf"><span>Destination</span><select name="destination"><option value="calendar">Calendrier COROS</option><option value="library">Bibliothèque COROS</option></select></label><label class="sf" id="corosDateField"><span>Date de la séance</span><input name="scheduledDate" type="date" required min="${localDate(new Date())}" max="${localDate(limit)}" value="${escape(currentDate)}"></label><p class="lbl">Une nouvelle séance sera ajoutée. Les entraînements COROS existants sont conservés ; vérifie le jour choisi pour éviter une séance en double.</p>${draft.preparation?.activation?`<label class="sf"><span>Activation : cible en km/h (S2 par défaut, ou légèrement plus lent)</span><input name="activationKmh" type="text" inputmode="decimal" required value="${draft.preparation.s2Kmh}"></label>`:''}${draft.choices.map(c=>`<label class="sf"><span>${escape(c.label)} (${c.min}–${c.max} ${c.unit==='min'?'min':'s'})</span><input name="${c.id}" type="number" inputmode="numeric" required min="${c.min}" max="${c.max}" step="1" value="${c.value}"></label>`).join('')}<details class="info" open><summary>Structure envoyée</summary><ol class="corosSteps" id="corosStepList">${draft.sections.map(s=>`<li>${escape(sectionLabel(s))}</li>`).join('')}</ol></details>${draft.notes.map(note=>`<p class="lbl">${escape(note)}</p>`).join('')}${draft.noIntensity?'<label class="corosConfirm"><input type="checkbox" name="noIntensity" required checked><span>Je conserve les phases sans cible d’allure au ressenti, notamment les lignes droites et les efforts libres éventuels.</span></label>':''}${draft.free&&!draft.preparation?`<label class="corosConfirm"><input type="checkbox" name="free" checked ${draft.preparation?'':'required'}><span>${draft.preparation?'Toutes les récupérations manuelles : lignes droites, fractions, séries et blocs. Décocher pour utiliser les 48 s et les durées Planif ; les transitions restent manuelles.':'Je termine les récupérations libres avec le bouton Tour de la montre.'}</span></label>`:''}<p class="lbl">Ce profil s’applique à cet envoi. Choisis ton favori dans Réglages → COROS pour les prochains envois. Le plan reste inchangé.</p><button type="submit" class="cta" ${auth?'':'disabled'}>Ajouter au calendrier COROS</button>${auth?'':'<p class="lbl">Connecte ton compte COROS dans Réglages pour envoyer cette séance.</p>'}</form>`}<p id="corosSendStatus" class="lbl corosStatus" role="status"></p><button type="button" class="cta ghost" data-coros-close>Fermer</button>`;
    d.addEventListener('input',updatePreviewSteps,{once:true});if(draft)updatePreviewSteps();d.showModal();
  }
  function previewOptions(draft,form){const profile=form.elements.namedItem('profile')?.value||getProfile(),recovery=profile==='manual'?'manual':'auto';return{profile,coreRecovery:recovery,strideRecovery:recovery,activationKmh:form.elements.namedItem('activationKmh')?Number(form.elements.namedItem('activationKmh').value.replace(',','.')):undefined};}
  function previewValues(draft,form){return Object.fromEntries(draft.choices.map(c=>[c.id,form.elements.namedItem(c.id).value]));}
  function updatePreviewSteps(){
    const d=document.getElementById('corosPreview'),form=d?.querySelector('form');if(!form||!currentDraft)return;
    const scheduled=form.elements.namedItem('destination').value==='calendar';form.elements.namedItem('scheduledDate').required=scheduled;form.elements.namedItem('scheduledDate').disabled=!scheduled;d.querySelector('#corosDateField').hidden=!scheduled;d.querySelector('#corosDateField').style.display=scheduled?'':'none';form.querySelector('button[type="submit"]').textContent=scheduled?'Ajouter au calendrier COROS':'Enregistrer dans la bibliothèque COROS';
    try{const c=PlanifCorosAdapter.course(currentDraft,previewValues(currentDraft,form),{noIntensity:true,free:true},previewOptions(currentDraft,form));const labels=PlanifCorosAdapter.labels(currentDraft,previewOptions(currentDraft,form),c.sections);d.querySelector('#corosStepList').innerHTML=c.sections.map((s,i)=>`<li>${labels[i]?'<strong>'+escape(labels[i])+'</strong><br>':''}${escape(sectionLabel(s))}</li>`).join('');}catch(e){d.querySelector('#corosStepList').innerHTML=`<li>${escape(e.message)}</li>`;}
    for(const choice of currentDraft.choices){const field=form.elements.namedItem(choice.id);if(choice.label.startsWith('Récupération')){const manual=previewOptions(currentDraft,form).coreRecovery==='manual';field.disabled=manual;const label=field.closest?.('label');if(label)label.style.display=manual?'none':'';}}
    form.oninput=updatePreviewSteps;
  }
  async function sendFromPreview(dialog){
    if(busy||!currentDraft)return;
    const form=dialog.querySelector('form');if(!form||!form.reportValidity())return;
    const status=dialog.querySelector('#corosSendStatus');let fingerprint=null,started=false;
    const ledgerKey=KEY+'-send-ledger';
    const record=(key,value)=>{const ledger=read(localStorage,ledgerKey)||{};ledger[key]=value;write(localStorage,ledgerKey,ledger);};
    busy=true;form.querySelector('button[type="submit"]').disabled=true;dialog.querySelector('[data-coros-close]').disabled=true;
    try{
      if(!navigator.onLine)fail('L’envoi nécessite Internet.');
      const draft=cloneDraft(currentDraft),course=PlanifCorosAdapter.course(draft,previewValues(draft,form),{noIntensity:form.elements.namedItem('noIntensity')?.checked,free:!!draft.preparation||form.elements.namedItem('free')?.checked},previewOptions(draft,form));
      const scheduled=form.elements.namedItem('destination').value==='calendar',date=scheduled?calendarDate(form.elements.namedItem('scheduledDate').value):null,name=scheduled?'createScheduledWorkout':'createSingleWorkout',args=scheduled?{date,course}:{course};
      for(const field of form.querySelectorAll?.('input,select')||[])field.disabled=true;
      status.textContent='Vérification de COROS…';await checkWriteTool(name);await access();
      fingerprint=await digest(canonical(scheduled?{issuer:auth.issuer,course,date,destination:'calendar'}:{issuer:auth.issuer,course}));
      const previous=(read(localStorage,ledgerKey)||{})[fingerprint];
      if(previous)fail(previous.status==='saved'?'Cette séance a déjà été envoyée depuis ce navigateur. Retrouve-la dans COROS.':'Un envoi de cette séance a déjà été tenté. Vérifie COROS avant toute nouvelle tentative ; Planif évite un doublon.');
      record(fingerprint,{status:'pending',date:new Date().toISOString()});started=true;
      status.textContent='Envoi à COROS…';
      /* Aucun nouvel essai automatique d’écriture, même en cas d’expiration ou de timeout. */
      const result=await rpc('tools/call',{name,arguments:args},true);
      if(result.isError){record(fingerprint,{status:'rejected',date:new Date().toISOString()});fail('COROS a refusé cette séance. Aucun nouvel envoi automatique ne sera tenté.');}
      if(!result.structuredContent&&!result.content?.some(c=>c.type==='text'&&c.text?.trim()))fail('La confirmation COROS est incomplète. Vérifie COROS avant de réessayer.');
      const reply=scheduled?scheduledReply(result,course.courseName):{names:[]};
      record(fingerprint,{status:'saved',date:new Date().toISOString(),...(reply.idInPlan!==undefined?{idInPlan:reply.idInPlan}:{}),...(scheduled?{scheduledDate:date}:{})});
      status.textContent=scheduled?'COROS a confirmé l’ajout au calendrier le '+date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6)+'. Vérifie ce jour dans COROS, y compris les autres séances déjà présentes, puis synchronise la montre.':'COROS a confirmé l’enregistrement. Ouvre la bibliothèque d’entraînements dans COROS pour vérifier la séance et la synchroniser avec la montre.';
      if(reply.names.length)status.textContent+=' Autres séances signalées par COROS : '+reply.names.join(' ; ')+'.';
    }catch(e){status.textContent=started?'L’envoi ne sera pas répété automatiquement. '+e.message:e.message;}
    finally{busy=false;dialog.querySelector('[data-coros-close]').disabled=false;if(!started){for(const field of form.querySelectorAll?.('input,select')||[])field.disabled=false;updatePreviewSteps();form.querySelector('button[type="submit"]').disabled=!auth;}}
  }
  function scheduledReply(result,courseName){
    const names=new Set();let idInPlan;
    const walk=(v,depth=0)=>{if(!v||typeof v!=='object'||depth>12)return;if(typeof v.courseName==='string'&&v.courseName!==courseName)names.add(v.courseName.slice(0,100));if(depth===0&&idInPlan===undefined&&['string','number'].includes(typeof v.idInPlan))idInPlan=v.idInPlan;for(const x of Object.values(v))walk(x,depth+1);};
    walk(result.structuredContent);for(const c of result.content||[])if(c.type==='text'){try{walk(JSON.parse(c.text));}catch(_){}}
    return{names:[...names],idInPlan};
  }
  const cloneDraft=draft=>JSON.parse(JSON.stringify(draft));
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-coros]');if(!b||busy)return;
    const act=b.dataset.coros;if(act==='connect')await connect(document.getElementById('corosRegion')?.value||'eu');else if(act==='verify')await verify();else if(act==='formats')downloadCatalog();else if(act==='disconnect')disconnect();
  });
  async function start(){
    const saved=read(localStorage,KEY+'-auth')||read(sessionStorage,KEY+'-auth');if(saved&&safeIssuer(saved.issuer)&&typeof saved.accessToken==='string'&&typeof saved.clientId==='string'&&Number.isFinite(saved.expiresAt)){auth=saved;saveAuth(saved);}
    if(callback){busy=true;message='Finalisation de la connexion COROS…';emit();try{await finish();await discover();}catch(e){message=e.message;}finally{busy=false;emit();}}else if(auth&&navigator.onLine){try{await discover();emit();}catch(e){verified=false;catalog=null;message=e.message;emit();}}else emit();
  }
  window.addEventListener('storage',e=>{if(e.key===KEY+'-auth'){auth=read(localStorage,KEY+'-auth');catalog=null;verified=false;emit();}});
  document.addEventListener('change',e=>{if(e.target.matches?.('[data-coros-profile]'))setProfile(e.target.value);});
  return{start,settingsHtml,preview,getProfile,setProfile,get busy(){return busy;},get callback(){return callback;}};
})();


/* Transcription de séances Planif vers le schéma COROS vérifié sur le compte utilisateur.
   Unités COROS : secondes, mètres, secondes/km. Aucune règle du moteur n'est modifiée. */
window.PlanifCorosAdapter=(()=>{
  'use strict';
  const fail=t=>{throw new Error(t);};
  const sec=m=>Math.round(m*60);
  const clone=v=>JSON.parse(JSON.stringify(v));
  function pace(band){
    if(!Array.isArray(band)||band.length!==2||band.some(v=>!Number.isFinite(v)||v<=0))fail('Cette plage d’allure ne peut pas être envoyée.');
    const values=band.map(v=>Math.round(3600/v)).sort((a,b)=>a-b);
    if(values.some(v=>v<120||v>1499))fail('Cette allure sort des limites acceptées par COROS.');
    return{intensityType:2,intensityValueStart:values[0],intensityValueEnd:values[1]};
  }
  // Titre court construit à partir du contenu réel, identique pour les deux profils.
  function shortTitle(x){
    const duration=m=>{const t=Math.round(m*60),min=Math.floor(t/60),seconds=t%60;return seconds?min?`${min}’${String(seconds).padStart(2,'0')}”`:`${seconds}”`:`${min}’`;};
    const distance=m=>`${m}m`;
    const prefix=v=>{
      const S=v.structure||{},I=v.intensity||{},fam=v.fam||'',sector=v.sector||fam.split('.')[0];
      if(S.components||S.segments&&new Set(S.segments.map(p=>p.target)).size>1)return 'MX';
      if(S.progression||S.shape==='progressive'||I.type==='progression'||fam==='s2.prog')return 'PR';
      if(sector==='s1')return 'S1';if(sector==='s2')return 'S2';
      if(sector==='vo2'||I.type==='pct_vma_range'||I.type==='pct_by_duration')return 'VO';
      if(sector==='spec10k'||I.race==='10 km')return 'AS10';
      if(I.race)return 'AS'+I.race.replace(/\s*km/g,'').replace(/\s/g,'');
      if(S.type==='hill_reps')return 'Côtes';
      if((S.type||'').startsWith('fartlek'))return 'Fartlek';
      return null;
    };
    const format=v=>{
      const S=v.structure||{};
      if(S.components)return S.components.map(c=>`${prefix(c.variant)||c.fam.toUpperCase()}:${format(c.variant)}`).join('+');
      if(S.type==='continuous')return duration(S.durationMin);
      if(S.type==='fartlek_free')return duration(S.workMin);
      if(S.type==='long_run')return S.reps?`${S.reps}x${S.distanceKm}km`:`${S.distanceKm}km`;
      if(S.type==='ladder')return (S.durationsMin||S.distancesM||[]).map(n=>S.durationsMin?duration(n):distance(n)).join('+');
      if(S.type==='sets'){
        const list=S.durationsMin||S.distancesM||S.segments||[];
        const content=list.map(n=>S.durationsMin?duration(n):S.segments?`${(n.target||'').toUpperCase()}:${distance(n.distanceM)}`:distance(n)).join('+');
        return `${S.sets}x(${content})`;
      }
      const rep=S.distanceM?distance(S.distanceM):duration(S.durationMin??S.workMin);
      return S.sets?`${S.sets}x(${S.perSet}x${rep})`:`${S.reps}x${rep}`;
    };
    if(x.kind==='quality'){
      const tag=prefix(x.variant),content=tag&&format(x.variant);
      return tag&&content?`${tag}-${content}`:x.title;
    }
    if(x.kind==='foot'){
      const f=x.foot,active=f.activeBlocks||f.activeRange&&Array(f.activeReps||1).fill((f.activeRange[0]+f.activeRange[1])/2);
      return `EF-${duration(f.min)}${active?.length?'('+active.map(duration).join('+')+'EA)':''}${f.ld?'+LD':''}`;
    }
    if(x.kind==='long')return `EF-${duration(x.long.totalMin)}(SL)`;
    return x.title;
  }
  function plan(snapshot){
    const x=clone(snapshot),draft={name:shortTitle(x),description:x.description,choices:[],sections:[],notes:[],noIntensity:false,free:false};
    if(!x.title||!x.description)fail('La séance affichée est incomplète.');
    if(x.kind==='quality'&&x.preparation){draft.preparation={activation:!!x.activation,s2Kmh:x.s2Kmh,easyBand:x.easyBand,easyMinutes:(x.warmupMin??(x.activation?27:24))-(x.activation?7:4),cooldownMinutes:x.cooldownMin??10};if(x.activation&&(!Number.isFinite(x.s2Kmh)||x.s2Kmh<=0))fail('Renseigne le second seuil avant d’envoyer cette préparation.');draft.free=true;draft.noIntensity=true;draft.notes.push(`Préparation personnelle COROS : ${draft.preparation.easyMinutes} min faciles, 3 lignes droites de 12 s, puis le cœur de séance et un retour au calme comptabilisé à ${draft.preparation.cooldownMinutes} min dans Planif. Les lignes droites restent au ressenti.`);if(x.activation)draft.notes.push('Après les lignes droites : 1 min 45 au second seuil ou légèrement plus lent, sans dépasser S2. En mode guidé : 45 s avant et 1 min 30 après.');}
    const choice=(label,range,value,unit='s')=>{
      const r=range.map(Math.round);if(r.length!==2||r.some(v=>!Number.isFinite(v)||v<=0)||r[0]>r[1])fail('Une durée proposée est invalide.');
      if(r[0]===r[1])return r[0];
      const id='c'+draft.choices.length;draft.choices.push({id,label,min:r[0],max:r[1],value:Math.min(r[1],Math.max(r[0],Math.round(value))),unit});return{choice:id};
    };
    const time=(type,minutes,band)=>plain(type,2,sec(minutes),band);
    function plain(type,targetType,value,band){
      const out={sectionType:type,targetType};if(targetType!==4)out.targetValue=value;else draft.free=true;
      if(band)Object.assign(out,pace(band));else draft.noIntensity=true;
      return out;
    }
    const rec=(minutes,range,label='Récupération')=>plain(3,2,range?choice(label,range.map(sec),sec(minutes)):sec(minutes));
    const pushRecovery=(minutes,range,label)=>{if(minutes>0||range?.[1]>0)draft.sections.push(rec(minutes,range,label));};
    const repeat=(n,work,recovery,tailRecovery=false)=>{
      if(!Number.isInteger(n)||n<1||n>100)fail('Nombre de répétitions non pris en charge.');
      if(!recovery){for(let i=0;i<n;i++)draft.sections.push(clone(work));return;}
      let pairs=tailRecovery?n:n-1;while(pairs>0){const count=Math.min(20,pairs);draft.sections.push({intervalGroup:true,repeats:count,sets:[clone(work),clone(recovery)]});pairs-=count;}
      if(!tailRecovery)draft.sections.push(clone(work));
    };
    const bandsFor=(v,duration,index)=>{
      const I=v.intensity||{};
      if(I.paceTarget===false||I.type==='feel'||I.type==='effort')return null;
      if(v.corosBands)return v.corosBands[index];
      if(I.minKmh&&I.maxKmh)return[I.minKmh,I.maxKmh];
      if(I.refKmh)return[I.refKmh,I.refKmh];
      if(I.type==='by_duration'){const b=I.bands.find(b=>b.durationsMin.includes(duration));if(b)return[b.minKmh,b.maxKmh];}
      fail('Les allures de ce format ne sont pas encore transcrites fidèlement. Choisis un autre format.');
    };
    function variant(v){
      const S=v.structure||{},I=v.intensity||{};
      if(S.type==='fartlek_free')fail('Le fartlek libre dépend du terrain et du ressenti. Il ne peut pas être envoyé comme une suite de fractions fixes. Choisis l’option structurée.');
      if(S.type==='continuous'){
        if(S.progression==='thirds'){
          if(!I.speedsKmh||I.speedsKmh.length!==3)fail('Progression non prise en charge.');
          const total=sec(S.durationMin),first=Math.round(total/3);I.speedsKmh.forEach((speed,i)=>draft.sections.push(plain(2,2,i===2?total-2*first:first,[speed,speed])));
        }else draft.sections.push(time(2,S.durationMin,bandsFor(v,S.durationMin,0)));
      }else if(['intervals','intermittent','fartlek_structured'].includes(S.type)){
        const n=S.reps,d=S.durationMin??S.workMin,band=bandsFor(v,d,0),work=S.distanceM?plain(2,1,Math.round(S.distanceM),band):time(2,d,band);
        const recovery=n>1?rec(S.recoveryMin,S.recoveryRangeMin):null;
        if(S.progression==='increasing'){
          if(!v.corosBands||v.corosBands.length!==n)fail('Progression non prise en charge.');
          for(let i=0;i<n;i++){draft.sections.push(time(2,d,v.corosBands[i]));if(i<n-1&&recovery)draft.sections.push(clone(recovery));}
        }else if(S.sets){
          if(!Number.isInteger(S.perSet)||S.sets*S.perSet!==n)fail('Cette répartition en séries est incomplète.');
          for(let i=0;i<S.sets;i++){repeat(S.perSet,work,recovery);if(i<S.sets-1)pushRecovery(S.recoveryBetweenSetsMin,S.recoveryBetweenSetsRangeMin,'Récupération entre séries');}
        }else repeat(n,work,recovery);
      }else if(S.type==='ladder'){
        const L=S.durationsMin||S.distancesM;if(!L?.length)fail('Pyramide incomplète.');
        const recovery=L.length>1?rec(v.recEach,S.recoveryRangeMin):null;
        L.forEach((value,i)=>{draft.sections.push(S.durationsMin?time(2,value,bandsFor(v,value,i)):plain(2,1,Math.round(value),bandsFor(v,null,i)));if(i<L.length-1&&recovery)draft.sections.push(clone(recovery));});
      }else if(S.type==='sets'){
        const L=S.durationsMin||S.distancesM||S.segments;if(!L?.length||!Number.isInteger(S.sets))fail('Blocs incomplets.');
        for(let i=0;i<S.sets;i++){
          L.forEach((value,j)=>{
            const targetKmh=S.segments?(value.target==='s1'?I.s1Kmh:value.target==='s2'?I.s2Kmh:I.raceKmh):null;
            const band=S.segments?[targetKmh,targetKmh]:bandsFor(v,S.durationsMin?value:null,j);
            draft.sections.push(S.durationsMin?time(2,value,band):plain(2,1,Math.round(S.segments?value.distanceM:value),band));
            if(j<L.length-1&&!S.linked)pushRecovery(S.recoveryBetweenFractionsMin,S.recoveryBetweenFractionsRangeMin,'Récupération entre fractions');
          });
          if(i<S.sets-1)pushRecovery(S.recoveryBetweenSetsMin,S.recoveryBetweenSetsRangeMin,'Récupération entre blocs');
        }
      }else if(S.type==='mixed_zones'){
        S.components.forEach((c,i)=>{variant(c.variant);if(i<S.components.length-1)pushRecovery(S.recoveryBetweenBlocksMin,S.recoveryBetweenBlocksRangeMin,'Récupération entre qualités');});
      }else if(S.type==='hill_reps'){
        repeat(S.reps,time(2,S.durationMin),plain(3,4),true);
        if(S.sprints?.reps)repeat(S.sprints.reps,plain(2,2,S.sprints.seconds),plain(3,4));
        draft.notes.push('Côtes au ressenti, récupération en descente et récupération complète entre sprints : termine chaque récupération avec le bouton Tour.');
      }else if(S.type==='long_run'&&!S.reps&&S.cooldownMin!==undefined){
        draft.sections.push(time(2,S.easyMin,x.easyBand),plain(2,1,Math.round(S.distanceKm*1000),bandsFor(v,null,0)),time(4,S.cooldownMin));
      }else fail('Ce format n’est pas encore exportable sans modifier sa structure. Aucune séance ne sera envoyée.');
    }
    if(x.kind==='quality'){
      if(x.warmupMin>0)draft.sections.push(time(1,x.warmupMin));variant(x.variant);if(x.cooldownMin>0)draft.sections.push(time(4,x.cooldownMin));
    }else if(x.kind==='foot'){
      if(x.foot.ld||x.foot.shortHills)fail('Ce footing comporte des lignes droites ou des côtes à choisir librement. L’envoi de ce format complet n’est pas encore disponible.');
      if(x.foot.type==='active'){
        const block=choice('Bloc actif',x.foot.activeRange,(x.foot.activeRange[0]+x.foot.activeRange[1])/2,'min');
        draft.sections.push(time(1,x.foot.wu),plain(2,2,{minutes:block},x.activeBand),time(4,x.foot.cd));draft.notes.push('Le bloc actif est envoyé en continu. '+x.hrCue);
      }else{
        const center=Math.round(x.foot.min),value=choice('Durée du footing',[Math.max(1,center-5),Math.min(x.foot.maxMinutes??Infinity,center+5)],center,'min');draft.sections.push(plain(2,2,{minutes:value},x.footBand));
      }
    }else if(x.kind==='long'){
      if(x.long.active)fail('Cette sortie longue comprend un bloc actif de durée libre. L’envoi de ce format complet n’est pas encore disponible.');
      if(x.long.s1Min){draft.sections.push(time(2,x.long.totalMin-x.long.s1Min,x.easyBand),time(2,x.long.s1Min,x.s1Band));}
      else draft.sections.push(time(2,x.long.totalMin,x.easyBand));
    }else if(x.kind==='race'){
      if(x.race.wu>0)draft.sections.push(time(1,x.race.wu));draft.sections.push(plain(2,1,Math.round(x.race.distance*1000),[x.race.targetPace,x.race.targetPace]));if(x.race.cd>0)draft.sections.push(time(4,x.race.cd));
    }else fail('Cette séance n’est pas encore exportable.');
    if(!draft.sections.length||draft.sections.length>200)fail('Cette séance dépasse la structure prise en charge par Planif pour COROS.');
    return draft;
  }
  function course(draft,values={},consent={},options={}){
    if(draft.noIntensity&&!consent.noIntensity)fail('Confirme les phases au ressenti, sans alerte d’allure.');
    if(draft.free&&!consent.free)fail('Confirme les récupérations libres terminées avec le bouton Tour.');
    const resolve=v=>{
      if(v&&typeof v==='object'){
        if(v.minutes!==undefined)return Math.round(resolve(v.minutes)*60);
        if(v.choice){const c=draft.choices.find(c=>c.id===v.choice),number=Number(values[v.choice]);if(!c||!Number.isInteger(number)||number<c.min||number>c.max)fail('Choisis une valeur dans chaque plage proposée.');return number;}
      }return v;
    };
    if(options.profile&&!['manual','guided'].includes(options.profile))fail('Choisis un profil COROS valide.');
    const manualProfile=options.profile==='manual',manualCore=manualProfile||options.coreRecovery==='manual';
    let sections=clone(draft.sections);
    if(draft.preparation){
      if(!['auto','manual'].includes(options.coreRecovery||'auto')||!['auto','manual'].includes(options.strideRecovery||'auto'))fail('Choisis un mode de récupération valide.');
      const core=sections.filter((s,i)=>!(i===0&&s.sectionType===1)&&!(i===sections.length-1&&s.sectionType===4));
      const recovery=seconds=>manualProfile?{sectionType:3,targetType:4}:{sectionType:3,targetType:2,targetValue:seconds};
      const stride=()=>({sectionType:2,targetType:2,targetValue:12});
      const easy=options.profile==='guided'&&draft.preparation.easyBand?pace(draft.preparation.easyBand):{};
      sections=[{sectionType:1,targetType:2,targetValue:Math.round((draft.preparation.easyMinutes??20)*60),...easy},recovery(48),{intervalGroup:true,repeats:2,sets:[stride(),options.strideRecovery==='manual'?{sectionType:3,targetType:4}:recovery(48)]},stride(),recovery(draft.preparation.activation?45:60)];
      if(draft.preparation.activation){const speed=options.activationKmh??draft.preparation.s2Kmh;if(!Number.isFinite(speed)||speed<=0||speed>draft.preparation.s2Kmh)fail('La cible d’activation doit être au second seuil ou plus lente.');sections.push({sectionType:2,targetType:2,targetValue:105,...pace([speed,speed])},recovery(90));}
      sections.push(...core);
      if(manualProfile)sections.push(recovery(0));
      sections.push(manualProfile?{sectionType:4,targetType:4}:{sectionType:4,targetType:2,targetValue:Math.round((draft.preparation.cooldownMinutes??10)*60),...easy});
    }
    const applyProfile=s=>{if(s.intervalGroup){s.sets.forEach(applyProfile);return;}if((s.sectionType===3&&manualCore)||(s.sectionType===4&&manualProfile)){s.targetType=4;delete s.targetValue;}if(manualProfile){delete s.intensityType;delete s.intensityValueStart;delete s.intensityValueEnd;}};
    sections.forEach(applyProfile);
    if(manualProfile){
      const compact=[],isRecovery=s=>s?.sectionType===3&&s.targetType===4;
      const endsWithRecovery=s=>isRecovery(s)||s?.intervalGroup&&isRecovery(s.sets.at(-1));
      for(let i=0;i<sections.length;i++){
        const s=sections[i],work=sections[i+1],recovery=sections[i+2];
        // Une récupération manuelle finale sert aussi de transition vers le bloc suivant.
        if(s.intervalGroup&&s.sets.length===2&&isRecovery(s.sets[1])&&
          work?.sectionType===2&&isRecovery(recovery)&&JSON.stringify(s.sets[0])===JSON.stringify(work)){
          if(s.repeats<20)s.repeats++;
          else{compact.push(s);compact.push({intervalGroup:true,repeats:1,sets:[work,recovery]});i+=2;continue;}
          compact.push(s);i+=2;continue;
        }
        if(isRecovery(s)&&endsWithRecovery(compact.at(-1)))continue;
        compact.push(s);
      }
      sections=compact;
    }
    const walk=s=>{
      if(s.intervalGroup){if(!Number.isInteger(s.repeats)||s.repeats<1||s.repeats>20||!s.sets?.length)fail('Groupe de répétitions invalide.');s.sets.forEach(walk);return;}
      if(s.targetType!==4){s.targetValue=resolve(s.targetValue);if(!Number.isInteger(s.targetValue)||s.targetValue<=0)fail('Durée ou distance invalide.');}
      if(![1,2,3,4].includes(s.sectionType)||![1,2,4].includes(s.targetType))fail('Section invalide.');
    };sections.forEach(walk);
    const choices=draft.choices.filter(c=>!(manualCore&&c.label.startsWith('Récupération'))).map(c=>`${c.label} : ${values[c.id]} ${c.unit==='min'?'min':'s'}.`).join(' ');
    const cooldownMinutes=draft.preparation?.cooldownMinutes??10;
    const description=[draft.description,manualProfile?`Profil au ressenti : aucune cible d’allure. Toutes les récupérations et le retour au calme sont manuels, bouton Tour. Le retour au calme reste estimé à ${cooldownMinutes} min dans Planif.`:`Profil guidé : allures prévues, récupérations chronométrées et retour au calme de ${cooldownMinutes} min. Les lignes droites restent au ressenti.`,choices,...draft.notes].filter(Boolean).join(' ');
    return{sportType:1,courseName:draft.name.slice(0,100),courseDescription:description,sections};
  }
  function labels(draft,options={},sentSections){
    if(!draft.preparation)return[];
    if(options.profile==='manual'){
      const sections=sentSections||course(draft,Object.fromEntries(draft.choices.map(c=>[c.id,c.value])),{noIntensity:true,free:true},options).sections;
      return sections.map((s,i)=>{
        if(i===0)return 'Échauffement';
        if(i===1)return 'Récupération avant les lignes droites';
        if(i===2)return '3 lignes droites avec récupérations manuelles';
        if(draft.preparation.activation&&i===3)return 'Activation au S2 ou légèrement plus lent';
        if(draft.preparation.activation&&i===4)return 'Récupération avant le cœur de séance';
        if(s.sectionType===4)return 'Retour au calme';
        return null;
      });
    }
    const labels=['Échauffement','Récupération avant les lignes droites','Lignes droites 1 et 2 avec récupérations','Ligne droite 3','Récupération après les lignes droites'];
    if(draft.preparation.activation)labels.push('Activation au S2 ou légèrement plus lent','Récupération avant le cœur de séance');
    const core=draft.sections.filter((s,i)=>!(i===0&&s.sectionType===1)&&!(i===draft.sections.length-1&&s.sectionType===4));
    labels.push(...core.map(()=>null));if(options.profile==='manual')labels.push('Transition après le cœur de séance');labels.push('Retour au calme');return labels;
  }
  return{plan,course,pace,labels,shortTitle};
})();
