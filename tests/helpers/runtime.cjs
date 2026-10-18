const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..');
const uiSource=fs.readFileSync(path.join(root,'planif-ui.js'),'utf8');
function injectEngine(context,options){
 context.__engine=require('../../planif-engine.js').createEngine(options||{getActivePlan:()=>context.activePlan||null});
 vm.runInContext('var {'+Object.keys(context.__engine).join(',')+'}=__engine;',context);
 return context.__engine;
}
function loadRuntime(context){
 injectEngine(context,{getActivePlan:()=>vm.runInContext('activePlan',context),hasSameStructure:s=>context.__structureMatches?.(s)||false});
 // Persistence integration is exercised independently of UI rendering or application boot.
 const start=uiSource.indexOf('const IDS='),end=uiSource.indexOf('const CAPLAB=');
 if(start<0||end<start)throw Error('UI persistence entry points not found');
 vm.runInContext('const $=id=>document.getElementById(id);\n'+uiSource.slice(start,end),context);
}
module.exports={injectEngine,loadRuntime,uiSource,version:require('../../planif-version.js')};
