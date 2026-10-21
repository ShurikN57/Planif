const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const engine=require('../planif-engine.js').createEngine();
const source=fs.readFileSync(require.resolve('../planif-ui.js'),'utf8');
let state={vma:18,s1lo:12,s1hi:12.5,s2:14.5,refDist:1,refTime:2400,profile:2,penalty:false};
const listeners={},total={},danielsTotal={},duration={},message={},rows=[{dataset:{loadResult:'0'}}],danielsRows=[{dataset:{loadDanielsResult:'0'}}];let renders=0;
const tool={querySelector:s=>s==='[data-load-total]'?total:s==='[data-load-daniels-total]'?danielsTotal:s==='[data-load-duration]'?duration:message,querySelectorAll:s=>s==='[data-load-daniels-result]'?danielsRows:rows};
const root={querySelector:()=>tool,addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn)};
const ctx={...engine,$:()=>root,readState:()=>state,renderApp:()=>renders++,toolAttr:x=>String(x).replaceAll('"','&quot;')};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('// Independent scratch calculator:'),source.indexOf('function syncedHrZonesHtml()')),ctx);
const run=s=>vm.runInContext(s,ctx);
const edit=(type,index,field,value)=>listeners[type].forEach(fn=>fn({target:{dataset:{loadIndex:String(index),loadField:field},value}}));
const click=(selector,dataset={})=>listeners.click.forEach(fn=>fn({target:{closest:s=>s===selector?{dataset}:null}}));
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
run('updateLoadToolUi()');assert.equal(total.textContent,'12,0 pts','30 min jog = 12 points');
assert.equal(danielsTotal.textContent,'6,0 pts','30 min E = 6 Daniels points');
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
 edit('input',0,'manual',invalid);assert.equal(total.textContent,'—','invalid pace clears whole total');assert.equal(danielsTotal.textContent,'—');
}
edit('change',0,'pace','s2');edit('input',0,'minutes','25');click('[data-load-add]');
edit('input',1,'minutes','20');click('[data-load-add]');edit('input',2,'minutes','10');
run('updateLoadToolUi()');assert.equal(total.textContent,'37,0 pts','25 S2 + 20 jog + 10 jog');assert.equal(duration.textContent,'55,0 min au total');
assert.equal(danielsTotal.textContent,'21,0 pts','25 T + 30 E uses Daniels weights, without a density multiplier');
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
// Verify every published simplified coefficient, not coefficients copied from Planif.
for(const [zone,factor] of [['E',.2],['M',.4],['T',.6],['10K',.8],['I',1],['R',1.5],['FR',2]]){
 edit('change',0,'danielsZone',zone);run('updateLoadToolUi()');
 close(run('loadToolResults().daniels[0].points'),25*factor);
 close(run('loadToolResults().blocks[0].points'),25);
 assert(danielsRows[0].textContent.includes('Daniels '+zone));
}
for(const [pace,minutes,points] of [['jogg','30',6],['s2','25',15],['as42','45',18],['as10','31',24.8]]){
 edit('change',0,'pace',pace);edit('input',0,'minutes',minutes);
 close(run('loadToolResults().danielsTotal'),points);
 assert(run('loadDanielsSelector(loadToolState.blocks[0],0)').includes('Suggestion Planif : '));
}
for(const pace of ['ea','s1','as21','as5','vma100','vma105','vma110','manual']){
 edit('change',0,'pace',pace);if(pace==='manual')edit('input',0,'manual','4:00');
 run('updateLoadToolUi()');assert.equal(danielsTotal.textContent,'—','no invented equivalence for '+pace);
 assert.notEqual(total.textContent,'—','Planif remains available for '+pace);
 assert(message.textContent.includes('zone Daniels'));assert(danielsRows[0].textContent.includes('zone à préciser'));
 edit('change',0,'danielsZone','T');run('updateLoadToolUi()');assert.equal(danielsTotal.textContent,'18,6 pts');
 edit('input',0,'minutes','30');assert.equal(danielsTotal.textContent,'18,0 pts','duration edits keep chosen zone');
 edit('input',0,'minutes','31');
}
edit('change',0,'pace','as21');edit('change',0,'danielsZone','T');
edit('change',0,'danielsZone','unknown');assert.equal(run('loadToolState.blocks[0].danielsZone'),'T','invalid zone event ignored');
edit('change',0,'danielsZone','auto');run('updateLoadToolUi()');assert.equal(danielsTotal.textContent,'—');
click('[data-load-add]');run('updateLoadToolUi()');assert.equal(danielsTotal.textContent,'—','one missing zone blocks full Daniels total');assert.notEqual(total.textContent,'—');
edit('change',0,'danielsZone','M');run('updateLoadToolUi()');assert.equal(danielsTotal.textContent,'14,4 pts');
click('[data-load-remove]',{loadRemove:'0'});run('updateLoadToolUi()');assert.equal(danielsTotal.textContent,'2,0 pts','removing a block preserves remaining zone and total');
edit('change',0,'danielsZone','FR');edit('change',0,'pace','s2');assert.equal(run('loadToolState.blocks[0].danielsZone'),'auto','a new pace clears a stale manual zone');
run('updateLoadToolUi()');assert.equal(danielsTotal.textContent,'6,0 pts');
edit('input',0,'minutes','');assert.equal(danielsTotal.textContent,'—','never display a partial total for invalid durations');
const html=run('loadToolHtml()');assert(html.includes('Total Planif'));assert(html.includes('Total Daniels'));assert(html.includes('Suggestions de correspondance propres à Planif'));assert(html.includes('Daniels’ Running Formula'));
assert.equal(JSON.stringify(state),snapshot,'comparison never changes athlete references');
console.log('OK: Planif engine coefficients; all seven Daniels weights; explicit suggested/manual zones; separate complete totals; invalid values; multi-block edits; unchanged athlete references.');
