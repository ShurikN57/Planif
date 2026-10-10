const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../planif-calendar-drag.js'),'utf8');
function fixture(){
 const events={},rootEvents={},classes=()=>{const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),has:x=>s.has(x)};};
 let hit=null,moves=0,removed=0,clones=0,captured=false,lastMessage='',scrollTick;
 const tile={classList:classes(),getBoundingClientRect:()=>({left:10,top:100,width:250}),cloneNode:()=>{clones++;return {classList:classes(),style:{},setAttribute(){},remove(){removed++;}};}};
 const grip={dataset:{moveGrip:'w0-q0'},closest:()=>tile,setPointerCapture:()=>captured=true,releasePointerCapture:()=>captured=false};
 const root={addEventListener:(k,fn)=>rootEvents[k]=fn,contains:r=>r.inside!==false};
 const row=(week,date)=>({dataset:{moveWeek:String(week),moveDate:date},classList:classes(),closest(){return this;}});
 const from=new Date(2026,9,16),to=new Date(2026,9,15),target=row(0,'2026-10-15');
 const ctx={window:{innerWidth:400,innerHeight:800,addEventListener:(k,fn)=>events[k]=fn,scrollBy(){}},document:{addEventListener:(k,fn)=>events[k]=fn,elementFromPoint:()=>hit,body:{append(){}}},requestAnimationFrame:fn=>{scrollTick=fn;return 1;},cancelAnimationFrame(){},Date,Math};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 ctx.window.PlanifCalendarDrag({root,getSession:()=>({ref:{w:0,d:4,i:0},day:{date:from}}),check:(id,date)=>{if(date==='blocked')throw Error('Protégée');return {day:{date:date==='2026-10-16'?from:to}};},move:()=>{moves++;return true;},say:s=>lastMessage=s});
 const event=(x=100,y=120)=>({target:{closest:()=>grip},pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
 return {events,rootEvents,target,row,setHit:r=>hit=r,event,state:()=>({moves,removed,clones,captured,lastMessage}),tick:()=>scrollTick?.()};
}
let f=fixture();f.rootEvents.pointerdown(f.event());f.events.pointermove(f.event(103,121));f.events.pointerup(f.event());assert.equal(f.state().moves,0);assert.equal(f.state().clones,0,'tap stays a normal click');
f=fixture();f.rootEvents.pointerdown(f.event());f.setHit(f.target);f.events.pointermove(f.event(120,180));assert(f.target.classList.has('calDropTarget'));f.events.pointerup(f.event(120,180));assert.equal(f.state().moves,1);assert.equal(f.state().removed,1);assert(!f.state().captured);assert.equal(f.state().lastMessage,'Séance déplacée.');let suppressed=false;f.rootEvents.click({preventDefault:()=>suppressed=true,stopPropagation(){}});assert(suppressed,'release must not open the session');
for(const kind of ['other-week','outside','blocked','cancel','escape','same-day']){
 f=fixture();f.rootEvents.pointerdown(f.event());f.setHit(kind==='other-week'?f.row(1,'2026-10-15'):kind==='outside'?null:kind==='blocked'?f.row(0,'blocked'):kind==='same-day'?f.row(0,'2026-10-16'):f.target);
 f.events.pointermove(f.event(130,190));
 if(kind==='cancel')f.events.pointercancel({pointerId:1});else if(kind==='escape')f.events.keydown({key:'Escape'});else f.events.pointerup(f.event(130,190));
 assert.equal(f.state().moves,0,kind);assert.equal(f.state().removed,1,kind);
}
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),version=html.match(/const APP_VERSION='([^']+)'/)[1];
assert(html.includes(`src="./planif-calendar-drag.js?v=${version}"`));assert(sw.includes(`'./planif-calendar-drag.js?v=${version}'`));assert(html.includes('touch-action:none'));assert(html.includes('data-move-week='));
console.log('OK: tap threshold, pointer capture/cleanup, same-week drop, blocked/outside drops, cancellation, click suppression and versioned PWA asset.');
