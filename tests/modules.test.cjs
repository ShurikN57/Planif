const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),version=require('../planif-version.js');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=source('index.html'),sw=source('sw.js');
const browser={};vm.createContext(browser);
for(const file of ['planif-version.js','planif-rules.js','planif-engine.js','planif-evidence.js'])vm.runInContext(source(file),browser,{filename:file});
assert.equal(browser.PlanifVersion,version);
const state={refTime:1200,refDist:0,profile:2,penalty:false};
assert.equal(JSON.stringify(browser.PlanifEngine.predict(state)),JSON.stringify(require('../planif-engine.js').predict(state)));
assert(!/\b(document|localStorage|sessionStorage)\b/.test(source('planif-engine.js')),'engine remains independent of browser storage and DOM');
const localScripts=[...html.matchAll(/<script\b[^>]*src="\.\/([^"?]+)\?v=([^"]+)"/g)].map(m=>({name:m[1],version:m[2]}));
for(const script of localScripts){assert.equal(script.version,version);assert(fs.existsSync(path.join(root,script.name)));assert(sw.includes(`./${script.name}?v=${version}`));}
const positions=['planif-version.js','planif-rules.js','planif-engine.js','planif-evidence.js','planif-ui.js'].map(name=>localScripts.findIndex(s=>s.name===name));
assert(positions.every((v,i)=>v>=0&&(!i||v>positions[i-1])));
assert(sw.includes(`./planif-studies.json?v=${version}`));
assert(sw.includes(`./planif-strava.js?v=${version}`));
// Missing scientific data must show a usable retry screen without opening plan storage.
(async()=>{
 const nodes={appShell:{innerHTML:''},planifRetry:{addEventListener:(name,fn)=>{assert.equal(name,'click');nodes.retry=fn;}}};
 let storageCalls=0;
 const context={PlanifEvidence:{load:async()=>{throw Error('offline');}},document:{body:{dataset:{}},getElementById:id=>nodes[id]},console:{error(){}},location:{reload(){}},localStorage:{setItem(){storageCalls++;}}};
 vm.createContext(context);await vm.runInContext(source('planif-ui.js'),context);await new Promise(r=>setImmediate(r));
 assert(nodes.appShell.innerHTML.includes('Chargement interrompu'));assert.equal(typeof nodes.retry,'function');assert.equal(storageCalls,0);
 console.log('OK: native/browser engine entry points, versioned script order, offline shell completeness and safe startup failure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
