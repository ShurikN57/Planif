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
 assert(!source.includes("'tools/call'"));assert(!source.includes('client_secret'));
 console.log('OK : OAuth PKCE, retour/state, nettoyage URL, jetons limités à la session, découverte paginée/SSE, refresh, refus et hors connexion ; aucune écriture COROS.');
})();
