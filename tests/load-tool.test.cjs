const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const engine=require('../planif-engine.js').createEngine();
const source=fs.readFileSync(require.resolve('../planif-ui.js'),'utf8');
let state={vma:18,s1lo:12,s1hi:12.5,s2:14.5,refDist:1,refTime:2400,profile:2,penalty:false};
const listeners={},total={},duration={},message={},rows=[{dataset:{loadResult:'0'}}];let renders=0;
const tool={querySelector:s=>s==='[data-load-total]'?total:s==='[data-load-duration]'?duration:message,querySelectorAll:()=>rows};
const root={querySelector:()=>tool,addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn)};
const ctx={...engine,$:()=>root,readState:()=>state,renderApp:()=>renders++,toolAttr:x=>String(x).replaceAll('"','&quot;')};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('// Independent scratch calculator:'),source.indexOf('function syncedHrZonesHtml()')),ctx);
const run=s=>vm.runInContext(s,ctx);
const edit=(type,index,field,value)=>listeners[type].forEach(fn=>fn({target:{dataset:{loadIndex:String(index),loadField:field},value}}));
const click=(selector,dataset={})=>listeners.click.forEach(fn=>fn({target:{closest:s=>s===selector?{dataset}:null}}));
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
run('updateLoadToolUi()');assert.equal(total.textContent,'12,0 pts','30 min jog = 12 points');
const snapshot=JSON.stringify(state);
for(const [preset,factor] of [['jogg',.4],['s1',.65],['s2',1],['vma100',1.4],['vma105',1.6],['vma110',1.8]]){
 close(run(`loadToolBlock({minutes:'20',pace:'${preset}'},loadToolReferences()).points`),20*factor);
}
for(const [preset,index] of [['as5',0],['as10',1],['as21',2],['as42',3]]){
 close(run(`loadToolBlock({minutes:'20',pace:'${preset}'},loadToolReferences()).speed`),engine.predict(state)[index].v);
}
const ea=engine.efBand('active',state);close(run("loadToolBlock({minutes:'20',pace:'ea'},loadToolReferences()).speed"),(ea[0]+ea[1])/2);
edit('change',0,'pace','manual');edit('input',0,'manual','4:00');edit('input',0,'minutes','20,5');
close(run('loadToolResults().blocks[0].speed'),15);close(run('loadToolResults().blocks[0].minutes'),20.5);
edit('change',0,'unit','speed');assert.equal(run('loadToolState.blocks[0].manual'),'15');
edit('input',0,'manual','12,5');edit('change',0,'unit','pace');assert.equal(run('loadToolState.blocks[0].manual'),'4:48');
for(const invalid of ['0:00','4:60','-1:00','abc','', 'Infinity']){
 edit('input',0,'manual',invalid);assert.equal(total.textContent,'—','invalid pace clears whole total');
}
edit('change',0,'pace','s2');edit('input',0,'minutes','25');click('[data-load-add]');
edit('input',1,'minutes','20');click('[data-load-add]');edit('input',2,'minutes','10');
run('updateLoadToolUi()');assert.equal(total.textContent,'37,0 pts','25 S2 + 20 jog + 10 jog');assert.equal(duration.textContent,'55,0 min au total');
for(const invalid of ['0','-10','','Infinity','abc']){edit('input',1,'minutes',invalid);assert.equal(total.textContent,'—','never show a partial sum as full session load');}
edit('input',1,'minutes','20');click('[data-load-remove]',{loadRemove:'1'});run('updateLoadToolUi()');assert.equal(total.textContent,'29,0 pts');
click('[data-load-remove]',{loadRemove:'1'});click('[data-load-remove]',{loadRemove:'0'});assert.equal(run('loadToolState.blocks.length'),1);
edit('change',0,'pace','s2');run('updateLoadToolUi()');assert.equal(total.textContent,'25,0 pts');
state={...state,s2:14};run('updateLoadToolUi()');assert.equal(total.textContent,'25,0 pts','refs are reloaded without a stale coefficient cache');
state={...state,refTime:0};edit('change',0,'pace','as10');run('updateLoadToolUi()');assert.equal(total.textContent,'—','race pace needs reference performance');
edit('change',0,'pace','s2');run('updateLoadToolUi()');assert.equal(total.textContent,'25,0 pts','thresholds do not require performance prediction');
state={...state,vma:0};run('updateLoadToolUi()');assert.equal(total.textContent,'—');assert(message.textContent.includes('Repères'));
state=JSON.parse(snapshot);assert.equal(JSON.stringify(state),snapshot);assert(!('_lp' in state),'engine cache never mutates athlete state');
assert.equal(run('LOAD_PRESETS.length'),12);assert(run('loadToolHtml()').includes('data-load-add'));assert(renders>0);
assert(source.includes('+criticalToolHtml()+loadToolHtml()'),'calculator is in Calcul');
console.log('OK: real engine coefficients, all presets, personalized paces, manual units, multi-block sums, invalid values, current references and UI events.');
