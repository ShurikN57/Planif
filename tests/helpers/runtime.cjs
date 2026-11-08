const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..');
const uiSource=fs.readFileSync(path.join(root,'planif-ui.js'),'utf8');
const htmlSource=fs.readFileSync(path.join(root,'planif-html.js'),'utf8');
// Shared escaping is loaded first in the browser; UI and integration slices rely on it.
function loadHtml(context){if(!context.PlanifHtml)vm.runInContext(htmlSource,context);return context.PlanifHtml;}
function injectEngine(context,options){
 loadHtml(context);
 context.__engine=require('../../planif-engine.js').createEngine(options||{getActivePlan:()=>context.activePlan||null});
 vm.runInContext('var {'+Object.keys(context.__engine).join(',')+'}=__engine;',context);
 return context.__engine;
}
function loadRuntime(context){
 injectEngine(context,{getActivePlan:()=>vm.runInContext('activePlan',context),hasSameStructure:s=>context.__structureMatches?.(s)||false});
 // Persistence integration is exercised independently of UI rendering or application boot.
 const start=uiSource.indexOf('const IDS='),end=uiSource.indexOf('const CAPLAB=');
 if(start<0||end<start)throw Error('UI persistence entry points not found');
 vm.runInContext('const $=id=>document.getElementById(id);\nconst escapeHtml=PlanifHtml.escapeHtml;\n'+uiSource.slice(start,end),context);
}
module.exports={htmlSource,loadHtml,injectEngine,loadRuntime,uiSource,version:require('../../planif-version.js')};
