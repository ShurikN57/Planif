const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../planif-strava.js'),'utf8');
const version=html.match(/const APP_VERSION='([^']+)'/)[1];
assert(html.includes(`./planif-strava.js?v=${version}`));
assert(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8').includes(`./planif-strava.js?v=${version}`));
assert(html.includes('firebase-auth-compat.js'));
const data=new Map(),localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
let popupUrl,listener,redraws=0,fetches=[],user=null,loginCount=0,logoutCount=0,forced=0,failOnce=false,popup;
const makeUser=uid=>({uid,email:uid+'@example.test',displayName:uid,getIdTokenResult:async(force)=>{if(force)forced++;return {token:'token-'+uid+(force?'-forced':''),expirationTime:new Date(Date.now()+3600000).toISOString()}}});
const auth={get currentUser(){return user;},setPersistence:async mode=>assert.equal(mode,'local'),onAuthStateChanged(fn){listener=fn;fn(user);},async signOut(){logoutCount++;user=null;listener(null);},async signInWithEmailAndPassword(email){loginCount++;user=makeUser(email.split('@')[0]);listener(user);},async signInWithCustomToken(value){assert.equal(value,'CUSTOM');user=makeUser('lucas');listener(user);}};
const firebase={apps:[],initializeApp:()=>({auth:()=>auth}),auth:Object.assign(()=>auth,{Auth:{Persistence:{LOCAL:'local'}}})};
const delay=()=>new Promise(r=>setImmediate(r));
function env(){
 const documentHandlers={},windowHandlers={};
 const context={window:{firebase,addEventListener:(k,fn)=>windowHandlers[k]=fn,open:url=>{popupUrl=url;return popup={close(){}}}},firebase,sessionStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},localStorage,
 document:{addEventListener:(k,fn)=>documentHandlers[k]=fn},Date,JSON,crypto:require('node:crypto').webcrypto,Uint8Array,setTimeout:fn=>setImmediate(fn),console,
 fetch:async(url,opt)=>{fetches.push({url,opt});if(failOnce){failOnce=false;return{ok:false,status:401,json:async()=>({error:'expired'})};}let body={};if(url.endsWith('/api/me'))body={uid:user.uid,profile:{displayName:user.displayName}};else if(url.includes('/plans/'))body=opt?.method==='PUT'?{id:'w0-q0',status:'planned',revision:1}:{sessions:[]};else if(url.includes('activities?'))body={activities:[],truncated:false};return{ok:true,status:200,json:async()=>body};}};
 context.window.PlanifStravaContext={get activePlan(){return{id:'plan-1',title:'10 km'};},get appOpt(){return 0;},sessionInfo:()=>null,redraw:()=>redraws++,settings:()=>{}};
 vm.createContext(context);vm.runInContext(source.replace('return {settingsHtml,sessionHtml,onSession,badge,rank,statusLabel};','return {settingsHtml,sessionHtml,onSession,badge,rank,statusLabel,search};'),context);
 return{link:context.window.PlanifStrava,documentHandlers,windowHandlers,context};
}
(async()=>{
 const one=env();await delay();await delay();assert(one.link.settingsHtml().includes('Déconnecté'));
 // Connexion email : le SDK garde le compte et fournit un jeton valide à chaque requête.
 const form={elements:{email:{value:'flo@example.test'},password:{value:'secret'}}};
 one.documentHandlers.submit({target:{matches:s=>s==='[data-strava-login]',elements:form.elements},preventDefault(){}});
 await delay();await delay();assert.equal(loginCount,1);assert.equal(form.elements.password.value,'');
 assert(one.link.settingsHtml().includes('Connecté'));assert(fetches.some(x=>x.url.endsWith('/api/me')&&x.opt.headers.Authorization==='Bearer token-flo'));
 const two=env();await delay();await delay();assert(two.link.settingsHtml().includes('Connecté'),'session restored after reopening');
 // Changement de compte par jeton dédié à la fenêtre, sans accepter une autre origine.
 two.documentHandlers.click({target:{closest:()=>({dataset:{strava:'connect'}})}});
 await two.windowHandlers.message({origin:'https://attacker.example',data:{type:'planif-strava-auth',nonce:'x',customToken:'CUSTOM'}});
 assert.equal(auth.currentUser.uid,'flo');
 failOnce=true;await two.link.search({planId:'plan-1',id:'w0-q0',date:'2026-10-10',minutes:60});assert.equal(forced,1,'401 retries with a fresh Firebase ID token');
 const nonce=new URL(popupUrl).hash.slice(7);
 await two.windowHandlers.message({origin:'https://strava-mobile-2f93f.web.app',source:popup,data:{type:'planif-strava-auth',nonce,customToken:'CUSTOM'}});
 await delay();await delay();assert.equal(auth.currentUser.uid,'lucas');assert(two.link.settingsHtml().includes('lucas'));
 // La déconnexion annule immédiatement le contexte et est conservée par le SDK.
 two.documentHandlers.click({target:{closest:()=>({dataset:{strava:'disconnect'}})}});
 await delay();assert.equal(logoutCount,1);assert(two.link.settingsHtml().includes('Déconnecté'));
 const three=env();await delay();assert(three.link.settingsHtml().includes('Déconnecté'));
 assert(redraws>0);
 console.log('OK: SDK Firebase persistant, restauration, jeton API renouvelable, déconnexion explicite et origine de la liaison.');
})().catch(e=>{console.error(e);process.exitCode=1});
