const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script>\s*(\/\* COROS :[\s\S]*?)<\/script>/)[1];
const issuer='https://mcpeu.coros.com';
const storage=()=>{const data=new Map();return{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};};
function env({url='https://shurikn57.github.io/Planif/',local=storage(),session=storage(),online=true,responder}={}){
 const handlers={},calls=[],events=[],assigned=[];
 const context={URL,URLSearchParams,TextEncoder,Uint8Array,crypto:webcrypto,btoa:s=>Buffer.from(s,'binary').toString('base64'),AbortController,Blob,Event,Date,Error,TypeError,SyntaxError,Number,String,Array,JSON,Map,Set,Promise,console,
 setTimeout,clearTimeout,sessionStorage:session,localStorage:local,navigator:{onLine:online},history:{replaceState:(a,b,p)=>context.location.href='https://shurikn57.github.io'+p},location:{href:url,assign:u=>assigned.push(u)},document:{addEventListener:(name,f)=>handlers[name]=f,dispatchEvent:e=>events.push(e.type),getElementById:()=>({value:'eu'})},fetch:async(u,opts)=>{calls.push({u,opts});const result=responder?await responder(u,opts):respond(u,opts);return{ok:result.status===undefined||result.status===200,status:result.status||200,headers:{get:()=>result.sse?'text/event-stream':'application/json'},text:async()=>result.sse||JSON.stringify(result.body)};}};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);
 const click=async act=>handlers.click({target:{closest:()=>({dataset:{coros:act}})}});
 return{api:context.PlanifCoros,calls,context,assigned,click,local,session};
}
function respond(u,opts){
 if(u.endsWith('/.well-known/oauth-authorization-server'))return{body:{issuer,authorization_endpoint:issuer+'/oauth2/authorize',token_endpoint:issuer+'/oauth2/token',registration_endpoint:issuer+'/connect/register',code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none']}};
 if(u.endsWith('/connect/register')){const p=JSON.parse(opts.body);assert.equal(p.token_endpoint_auth_method,'none');assert.equal(p.redirect_uris[0],'https://shurikn57.github.io/Planif/index.html?coros_callback=1');return{body:{client_id:'test-public-client'}};}
 if(u.endsWith('/oauth2/token'))return{body:{access_token:'PRIVATE_ACCESS',refresh_token:'PRIVATE_REFRESH',token_type:'Bearer',expires_in:3600}};
 const p=JSON.parse(opts.body);assert(!opts.body.includes('PRIVATE'));assert.equal(opts.headers.Authorization,'Bearer PRIVATE_ACCESS');
 if(p.method==='initialize')return{body:{jsonrpc:'2.0',id:p.id,result:{protocolVersion:'2025-06-18'}}};
 assert.equal(p.method,'tools/list');
 return p.params.cursor?{sse:`event: message\ndata: ${JSON.stringify({jsonrpc:'2.0',id:p.id,result:{tools:[{name:'createScheduledWorkout',inputSchema:{type:'object'}}]}})}\n\n`}:{body:{jsonrpc:'2.0',id:p.id,result:{tools:[{name:'createSingleWorkout',description:'Test schema',inputSchema:{type:'object'}}],nextCursor:'page2'}}};
}

function fakeDialog(context){
 const nodes={status:{textContent:''},close:{disabled:false},submit:{disabled:false},steps:{innerHTML:''},date:{style:{}}};
 const fields={};let content='';
 const form={elements:{namedItem:k=>fields[k]},reportValidity:()=>true,querySelector:()=>nodes.submit};
 const handlers={};
 const dialog={id:'',className:'',addEventListener:(n,f)=>handlers[n]=f,showModal:()=>{},close:()=>{},querySelector:s=>s==='form'?form:s==='#corosSendStatus'?nodes.status:s==='#corosStepList'?nodes.steps:s==='#corosDateField'?nodes.date:nodes.close};
 Object.defineProperty(dialog,'innerHTML',{get:()=>content,set:s=>{content=s;for(const k of Object.keys(fields))delete fields[k];for(const m of s.matchAll(/<input name="([^"]+)"[^>]*value="([^"]+)"/g))fields[m[1]]={value:m[2]};for(const m of s.matchAll(/<select name="([^"]+)"[^>]*><option value="([^"]+)"/g))fields[m[1]]={value:m[2]};fields.destination={value:'calendar'};fields.scheduledDate={value:new Date().toISOString().slice(0,10)};for(const m of s.matchAll(/<input type="checkbox" name="([^"]+)"([^>]*)>/g))fields[m[1]]={checked:/\bchecked\b/.test(m[2])};}});
 const document=context.document;document.createElement=()=>dialog;document.body={append:()=>{}};document.getElementById=id=>id==='corosPreview'?(dialog.id?dialog:null):{value:'eu'};
 return{dialog,nodes,fields,submit:()=>handlers.submit({preventDefault:()=>{}})};
}
async function finishSend(e){for(let i=0;i<300&&e.api.busy;i++)await new Promise(r=>setTimeout(r,2));assert(!e.api.busy,'send did not finish');}
async function sendCase(outcome,changedSchema=false,destination='library',invalidDate=false,prepared=false,manual=false){
 const fixture=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,destination==='calendar'?'fixtures/coros-scheduled-tool.json':'fixtures/coros-workout-tool.json'),'utf8'));
 if(changedSchema)fixture.description+=' changed';
 const session=storage();session.setItem('planif-coros-v1-auth',JSON.stringify({issuer,clientId:'test-public-client',accessToken:'PRIVATE_ACCESS',refreshToken:'PRIVATE_REFRESH',expiresAt:Date.now()+3600000}));
 const e=env({session,responder:async(u,opts)=>{
  const p=JSON.parse(opts.body);
  if(p.method==='initialize')return{body:{result:{protocolVersion:'2025-06-18'}}};
  if(p.method==='tools/list')return{body:{result:{tools:[fixture]}}};
  assert.equal(p.method,'tools/call');assert.equal(p.params.name,destination==='calendar'?'createScheduledWorkout':'createSingleWorkout');if(destination==='calendar')assert.equal(p.params.arguments.date,new Date().toISOString().slice(0,10).replace(/-/g,''));else assert.equal(p.params.arguments.date,undefined);
  assert.equal(p.params.arguments.course.sections[0].targetValue,1200);if(prepared){const rows=p.params.arguments.course.sections.flatMap(s=>s.intervalGroup?Array.from({length:s.repeats},()=>s.sets).flat():[s]);assert.equal(rows.filter(s=>s.targetValue===12&&s.sectionType===2).length,3);assert.equal(rows.filter(s=>s.targetValue===105&&s.sectionType===2).length,1);assert.equal(rows[2].intensityValueStart,257);if(manual)assert(rows.filter(s=>s.sectionType===3).every(s=>s.targetType===4));else assert.equal(rows.filter(s=>s.targetValue===48&&s.sectionType===3).length,2);}
  if(outcome==='timeout')throw new TypeError('network unavailable PRIVATE_ACCESS');
  if(outcome==='401')return{status:401};
  if(outcome==='reject')return{body:{result:{isError:true,content:[{type:'text',text:'rejected internal id 123'}]}}};
  return{body:{result:{isError:false,structuredContent:destination==='calendar'?{idInPlan:'123',otherWorkouts:[{courseName:'Vélo facile',idInPlan:'other-private'}]}:undefined,content:[{type:'text',text:'saved internal id 123'}]}}};
 }});
 await e.api.start();const ui=fakeDialog(e.context);
 const snapshot={title:'Test S1',description:'7 × 5 minutes',kind:'quality',warmupMin:20,cooldownMin:10,variant:{structure:{type:'intervals',reps:7,durationMin:5,recoveryMin:1.25,recoveryRangeMin:[1,1.5]},intensity:{minKmh:12,maxKmh:12.5}}};
 if(prepared){snapshot.preparation=true;snapshot.activation=true;snapshot.s2Kmh=14;}
 e.api.preview(snapshot);ui.fields.destination.value=destination;if(prepared){assert.equal(ui.fields.destination.value,destination);assert(ui.fields.free.checked&&ui.fields.noIntensity.checked,'both default checkboxes must be checked');assert(ui.nodes.steps.innerHTML.includes('bouton Tour'));assert(!ui.nodes.steps.innerHTML.includes('0 min 48 s'),'default recoveries must all be manual');ui.fields.free.checked=manual;ui.dialog.querySelector('form').oninput();assert.equal(ui.fields.c0.disabled,manual);}if(invalidDate)ui.fields.scheduledDate.value='2026-02-30';ui.submit();ui.submit();await finishSend(e);
 const writes=()=>e.calls.filter(c=>JSON.parse(c.opts.body).method==='tools/call').length;
 assert.equal(writes(),changedSchema||invalidDate?0:1);assert(!ui.nodes.status.textContent.includes('PRIVATE'));assert(!ui.nodes.status.textContent.includes('123'));
 if(destination==='calendar'&&outcome==='saved'&&!changedSchema&&!invalidDate){assert(ui.nodes.status.textContent.includes('Vélo facile'));assert(!ui.nodes.status.textContent.includes('other-private'));}
 if(!changedSchema&&!invalidDate){assert(e.local.getItem('planif-coros-v1-send-ledger'));e.api.preview(snapshot);ui.fields.destination.value=destination;if(prepared){ui.fields.free.checked=manual;ui.dialog.querySelector('form').oninput();}ui.submit();await finishSend(e);assert.equal(writes(),1,'duplicate write');}
 if(outcome==='saved'&&!changedSchema&&!invalidDate)assert(ui.nodes.status.textContent.includes('déjà été envoyée'));
 if(outcome==='401')assert.equal(e.calls.filter(c=>c.u.endsWith('/oauth2/token')).length,0,'write automatically retried after auth failure');
 if(changedSchema)assert(ui.nodes.status.textContent.includes('format COROS'));
}

(async()=>{
 const a=env();assert(a.api.settingsHtml().includes('À connecter'));
 await a.click('connect');assert.equal(a.assigned.length,1);const u=new URL(a.assigned[0]),p=JSON.parse(a.local.getItem('planif-coros-v1-pending'));
 assert.equal(u.searchParams.get('state'),p.state);assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('resource'),issuer+'/mcp');assert.equal(u.searchParams.get('code_challenge'),Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(p.verifier))).toString('base64url'));
 assert(!u.href.includes(p.verifier));
 const b=env({url:p.redirect+'&code=PRIVATE_CODE&state='+p.state,local:a.local});await b.api.start();
 assert.equal(b.context.location.href,'https://shurikn57.github.io/Planif/index.html');assert.equal(b.local.getItem('planif-coros-v1-pending'),null);assert(b.api.settingsHtml().includes('Connexion vérifiée'));assert(b.api.settingsHtml().includes('Exporter les formats'));assert(!b.api.settingsHtml().includes('PRIVATE'));
 assert(b.session.getItem('planif-coros-v1-auth'));assert(![...b.local.data.values()].some(v=>v.includes('PRIVATE')));
 assert.equal(b.calls.filter(c=>c.u.endsWith('/mcp')).length,3);assert(b.calls.every(c=>c.opts.credentials==='omit'&&c.opts.cache==='no-store'));
 await b.click('disconnect');assert(!b.session.getItem('planif-coros-v1-auth'));assert(b.api.settingsHtml().includes('À connecter'));
 const badLocal=storage();badLocal.setItem('planif-coros-v1-pending',JSON.stringify(p));const bad=env({url:p.redirect+'&code=PRIVATE_CODE&state=evil',local:badLocal});await bad.api.start();assert.equal(bad.calls.length,0);assert(bad.api.settingsHtml().includes('Relance'));
 const off=env({online:false});await off.click('connect');assert.equal(off.calls.length,0);assert(off.api.settingsHtml().includes('Internet'));
 const expiredSession=storage();expiredSession.setItem('planif-coros-v1-auth',JSON.stringify({issuer,clientId:'test-public-client',accessToken:'PRIVATE_ACCESS',refreshToken:'PRIVATE_REFRESH',expiresAt:0}));const expired=env({session:expiredSession});await expired.api.start();await expired.click('verify');assert.equal(expired.calls.filter(c=>c.u.endsWith('/oauth2/token')).length,1);assert(expired.api.settingsHtml().includes('Connexion vérifiée'));
 const denied=env({responder:()=>({status:400})});await denied.click('connect');assert.equal(denied.assigned.length,0);assert(denied.api.settingsHtml().includes('HTTP 400'));
 assert(a.calls.concat(b.calls).every(c=>!c.opts.body||!c.opts.body.includes('tools/call')));assert(!source.includes('client_secret'));
 for(const outcome of ['saved','timeout','401','reject'])await sendCase(outcome);await sendCase('saved',true);for(const outcome of ['saved','timeout','401','reject'])await sendCase(outcome,false,'calendar');await sendCase('saved',true,'calendar');await sendCase('saved',false,'calendar',true);await sendCase('saved',false,'calendar',false,true);await sendCase('saved',false,'calendar',false,true,true);
 console.log('OK : OAuth PKCE, retour/state, nettoyage URL, jetons limités à la session, découverte paginée/SSE, refresh, refus et hors connexion ; aucune écriture lors de la connexion ; envoi simulé, double clic, doublon, schéma changé et erreur sans répétition automatique.');
})();
