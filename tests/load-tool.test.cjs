const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const engine=require('../planif-engine.js').createEngine();
const source=fs.readFileSync(require.resolve('../planif-ui.js'),'utf8');
let state={vma:18,s1lo:12,s1hi:12.5,s2:14.5,refDist:1,refTime:2400,profile:2,penalty:false};
const listeners={},total={},duration={},message={},rows=[{dataset:{loadResult:'0'}}],chart={clientWidth:320};let renders=0;
const tool={querySelector:s=>({'[data-load-total]':total,'[data-load-duration]':duration}[s]||message),querySelectorAll:()=>rows};
const root={querySelector:s=>s==='[data-load-curve]'?chart:tool,addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn)};
const ctx={...engine,$:()=>root,readState:()=>state,renderApp:()=>renders++,toolAttr:x=>String(x).replaceAll('"','&quot;')};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('// Independent scratch calculator:'),source.indexOf('function syncedHrZonesHtml()')),ctx);
const run=s=>vm.runInContext(s,ctx);
const edit=(type,index,field,value)=>listeners[type].forEach(fn=>fn({target:{dataset:{loadIndex:String(index),loadField:field},value}}));
const click=(selector,dataset={})=>listeners.click.forEach(fn=>fn({target:{closest:s=>s===selector?{dataset}:null}}));
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
run('updateLoadToolUi()');assert.equal(total.textContent,'6,0 pts','30 min jog = 6 points with the current program model');
const snapshot=JSON.stringify(state);
for(const [preset,factor] of [['jogg',.2],['s1',.3],['s2',.6],['vma100',1],['vma105',1.2],['vma110',1.5]]){
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
run('updateLoadToolUi()');assert.equal(total.textContent,'21,0 pts','25 S2 + 20 jog + 10 jog');assert.equal(duration.textContent,'55,0 min au total');
for(const invalid of ['0','-10','','Infinity','abc']){edit('input',1,'minutes',invalid);assert.equal(total.textContent,'—','never show a partial sum as full session load');}
edit('input',1,'minutes','20');click('[data-load-remove]',{loadRemove:'1'});run('updateLoadToolUi()');assert.equal(total.textContent,'17,0 pts');
click('[data-load-remove]',{loadRemove:'1'});click('[data-load-remove]',{loadRemove:'0'});assert.equal(run('loadToolState.blocks.length'),1);
edit('change',0,'pace','s2');run('updateLoadToolUi()');assert.equal(total.textContent,'15,0 pts');
state={...state,s2:14};run('updateLoadToolUi()');assert.equal(total.textContent,'15,0 pts','refs are reloaded without a stale coefficient cache');
state={...state,refTime:0};edit('change',0,'pace','as10');run('updateLoadToolUi()');assert.equal(total.textContent,'—','race pace needs reference performance');
edit('change',0,'pace','s2');run('updateLoadToolUi()');assert.equal(total.textContent,'15,0 pts','thresholds do not require performance prediction');
state={...state,vma:0};run('updateLoadToolUi()');assert.equal(total.textContent,'—');assert(message.textContent.includes('Repères'));
state=JSON.parse(snapshot);assert.equal(JSON.stringify(state),snapshot);assert(!('_lp' in state),'engine cache never mutates athlete state');
assert.equal(run('LOAD_PRESETS.length'),12);assert(run('loadToolHtml()').includes('data-load-add'));assert(renders>0);
assert(source.includes('+criticalToolHtml()+loadToolHtml()'),'calculator is in Calcul');
const html=run('loadToolHtml()');assert(html.includes('Charge totale'));assert(!html.includes('Zone Daniels'));assert(!html.includes('Total ancien Planif'));assert(!html.includes('data-load-daniels'));assert.equal((html.match(/data-load-total/g)||[]).length,1);
assert.equal(JSON.stringify(state),snapshot,'calculator never changes athlete references');
// Personalized model: agreed anchors, logarithmic durations, continuous speed interpolation.
for(const [time,factor] of [[6,1],[60,.6],[240,.3]])close(run(`loadDurationFactor(${time})`),factor);
close(run('loadDurationFactor(Math.sqrt(6*60))'),.8);close(run('loadDurationFactor(120)'),.45);
for(const invalid of ['NaN','Infinity','0','5.9','240.1'])assert.equal(run(`loadDurationFactor(${invalid})`),null);
edit('input',0,'minutes','10');edit('change',0,'pace','vma100');run('updateLoadToolUi()');assert.equal(total.textContent,'10,0 pts');
for(const [pct,factor] of [[100,1],[102.5,1.1],[105,1.2],[107.5,1.35],[110,1.5]]){
 close(run(`loadPersonalFactor(${pct}/100*18,loadPersonalModel(loadToolReferences()))`),factor);
}
assert.equal(run('loadPersonalFactor(18*1.101,loadPersonalModel(loadToolReferences()))'),null);
for(const [pace,factor] of [['jogg',.2],['s1',.3],['s2',.6],['vma105',1.2],['vma110',1.5]]){
 edit('change',0,'pace',pace);run('updateLoadToolUi()');close(run('loadToolResults().blocks[0].factor'),factor);
}
for(const [pace,index] of [['as5',0],['as10',1],['as21',2],['as42',3]]){
 edit('change',0,'pace',pace);run('updateLoadToolUi()');
 close(run('loadToolResults().blocks[0].factor'),run(`loadDurationFactor(predict(readState())[${index}].t/60)`));
 // Entering precisely the same speed manually must give precisely the same score.
 const speed=engine.predict(state)[index].v;edit('change',0,'pace','manual');edit('change',0,'unit','speed');edit('input',0,'manual',String(speed));
 close(run('loadToolResults().blocks[0].factor'),run(`loadDurationFactor(predict(readState())[${index}].t/60)`));
}
edit('change',0,'pace','s2');edit('input',0,'minutes','25');click('[data-load-add]');edit('input',1,'minutes','30');run('updateLoadToolUi()');assert.equal(total.textContent,'21,0 pts','25 S2 + 30 jog = 21 personalized points');
edit('input',1,'minutes','');assert.equal(total.textContent,'—','no partial personalized sum');click('[data-load-remove]',{loadRemove:'1'});
const baseState={...state};state={...baseState,s2:16.5};run('updateLoadToolUi()');assert.equal(total.textContent,'15,0 pts','contradictory race refs use the fixed S2 anchor');assert(message.textContent.includes('repli'));
state={...baseState,refTime:0};edit('change',0,'pace','s2');run('updateLoadToolUi()');assert.equal(total.textContent,'15,0 pts','fixed anchors remain usable without estimated races');
state={...baseState,vma:14,s1lo:8,s1hi:8.5,s2:10.5,refTime:3600};edit('change',0,'pace','as42');run('updateLoadToolUi()');assert.notEqual(total.textContent,'—','out-of-duration race uses explicit speed-anchor fallback');assert(message.textContent.includes('repli'));assert(run('loadPersonalModel(loadToolReferences()).issues.some(x=>x.includes("hors de la plage"))'));
state={...baseState};
for(const width of [280,320,390,560,900])for(const kind of ['duration','factor']){
 const svg=run(`loadCurveChart(loadPersonalModel(loadToolReferences()),'${kind}',${width})`);assert(!/NaN|Infinity/.test(svg));assert(svg.includes('role="img"'));assert(svg.includes(`viewBox="0 0 ${width} 260"`));
}
click('[data-load-point]',{loadPoint:'as10'});assert.equal(run('loadCurveState.selected'),'as10');assert(chart.innerHTML.includes('AS10 ·'));assert(chart.innerHTML.includes('40,0 min de maintien'));assert(chart.innerHTML.includes('aria-pressed="true">AS10'));
state={...baseState,refTime:2300};run('updateLoadCurveUi()');assert(!chart.innerHTML.includes('40,0 min de maintien'),'curve refreshes with changed performance');state=baseState;
assert.equal(JSON.stringify(state),snapshot);
// Reproduce the reported screenshot: 30 min S1 + 10 min Jogg = 11, not 23.5 old points.
edit('change',0,'pace','s1');edit('input',0,'minutes','30');click('[data-load-add]');edit('input',1,'minutes','10');run('updateLoadToolUi()');assert.equal(total.textContent,'11,0 pts');assert(rows[0].textContent.includes('× 0,30 = 9,0 pts'));
click('[data-load-remove]',{loadRemove:'1'});edit('change',0,'pace','manual');edit('change',0,'unit','speed');edit('input',0,'manual','21.6');assert(message.textContent.includes('prudence'),'supra-110 fallback is explicitly identified');
console.log('OK: one current-program score only; no historical comparisons or zone selector; new fixed/personalized coefficients; manual units; complete sums; invalid values and preserved athlete references.');
console.log('OK: personalized anchors, log-duration interpolation, exact 100/105/110% and intermediate factors, race/manual agreement, conflicts, bounds, complete sums, responsive SVG and interactive point selection.');
