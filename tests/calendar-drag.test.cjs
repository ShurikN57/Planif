const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../planif-calendar-drag.js'),'utf8');
function fixture(){
 const events={},rootEvents={},timers=new Map(),classes=()=>{const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),has:x=>s.has(x)};};
 let hit=null,moves=0,removed=0,clones=0,captured=false,lastMessage='',scrollTick,timerId=0,delay;
 const tile={dataset:{moveSession:'w0-q0'},classList:classes(),getBoundingClientRect:()=>({left:10,top:100,width:250}),setPointerCapture:()=>captured=true,releasePointerCapture:()=>captured=false,cloneNode:()=>{clones++;return {classList:classes(),style:{},setAttribute(){},remove(){removed++;}};}};
 const root={addEventListener:(k,fn)=>rootEvents[k]=fn,contains:r=>r.inside!==false};
 const row=(week,date)=>({dataset:{moveWeek:String(week),moveDate:date},classList:classes(),closest(){return this;}});
 const from=new Date(2026,9,16),to=new Date(2026,9,15),target=row(0,'2026-10-15');
 const ctx={window:{innerWidth:400,innerHeight:800,addEventListener:(k,fn)=>events[k]=fn,scrollBy(){}},document:{addEventListener:(k,fn)=>events[k]=fn,elementFromPoint:()=>hit,body:{append(){}}},setTimeout:(fn,ms)=>{delay=ms;timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{scrollTick=fn;return 1;},cancelAnimationFrame(){},Date,Math};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const controller=ctx.window.PlanifCalendarDrag({root,getSession:()=>({ref:{w:0,d:4,i:0},day:{date:from}}),check:(id,date)=>{if(date==='blocked')throw Error('Protégée');return {day:{date:date==='2026-10-16'?from:to}};},move:()=>{moves++;return true;},say:s=>lastMessage=s});
 const event=(x=100,y=120)=>({target:{closest:()=>tile},pointerId:1,pointerType:'mouse',button:0,isPrimary:true,clientX:x,clientY:y,cancelable:true,preventDefault(){this.prevented=true;},stopPropagation(){}});
 const touch=(x=100,y=120,id=7)=>{const p={clientX:x,clientY:y,identifier:id};return {...event(x,y),touches:[p],changedTouches:[p]};};
 return {events,rootEvents,target,tile,row,controller,setHit:r=>hit=r,event,touch,state:()=>({moves,removed,clones,captured,lastMessage,pending:timers.size,delay}),hold:()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());},tick:()=>scrollTick?.()};
}
let f=fixture();f.rootEvents.pointerdown(f.event());assert.equal(f.state().delay,450);assert(!f.state().captured);f.events.pointermove(f.event(103,121));f.events.pointerup(f.event());f.hold();assert.equal(f.state().moves,0);assert.equal(f.state().clones,0,'tap stays a normal click');
f=fixture();f.rootEvents.pointerdown(f.event());f.events.pointermove(f.event(120,180));f.hold();assert.equal(f.state().clones,0,'motion before the hold cancels activation');
f=fixture();f.rootEvents.pointerdown(f.event());f.hold();f.setHit(f.target);f.events.pointermove(f.event(120,180));assert(f.target.classList.has('calDropTarget'));f.events.pointerup(f.event(120,180));assert.equal(f.state().moves,1);assert.equal(f.state().removed,1);assert(!f.state().captured);assert.equal(f.state().lastMessage,'Séance déplacée.');let suppressed=false;f.rootEvents.click({preventDefault:()=>suppressed=true,stopPropagation(){}});assert(suppressed,'release must not open the session');
for(const kind of ['other-week','outside','blocked','cancel','escape','blur','lost-capture','same-day']){
 f=fixture();f.rootEvents.pointerdown(f.event());f.hold();f.setHit(kind==='other-week'?f.row(1,'2026-10-15'):kind==='outside'?null:kind==='blocked'?f.row(0,'blocked'):kind==='same-day'?f.row(0,'2026-10-16'):f.target);
 f.events.pointermove(f.event(130,190));
 if(kind==='cancel')f.events.pointercancel({pointerId:1});else if(kind==='escape')f.events.keydown({key:'Escape'});else if(kind==='blur')f.events.blur();else if(kind==='lost-capture')f.events.lostpointercapture({pointerId:1});else f.events.pointerup(f.event(130,190));
 assert.equal(f.state().moves,0,kind);assert.equal(f.state().removed,1,kind);assert(!f.state().captured,kind);
}
// iOS path: native scrolling until the hold, then non-passive touchmove.
f=fixture();const tap=f.touch();f.rootEvents.touchstart(tap);f.events.touchend(tap);f.hold();assert(!tap.prevented);assert.equal(f.state().clones,0);
f=fixture();f.rootEvents.touchstart(f.touch());const swipe=f.touch(102,155);f.events.touchmove(swipe);f.hold();assert(!swipe.prevented,'swiping retains native page scrolling');assert.equal(f.state().clones,0);
f=fixture();f.rootEvents.pointerdown({...f.event(),pointerType:'touch'});assert.equal(f.state().pending,0,'touch pointer events cannot start a duplicate drag');f.rootEvents.touchstart(f.touch());f.hold();assert(!f.state().captured);f.setHit(f.target);const drag=f.touch(120,180);f.events.touchmove(drag);assert(drag.prevented,'active touch drag blocks panning');f.events.touchend(drag);assert.equal(f.state().moves,1);assert.equal(f.state().removed,1);
for(const kind of ['touchcancel','multitouch','noncancelable','controller']){
 f=fixture();f.rootEvents.touchstart(f.touch());f.hold();f.setHit(f.target);
 if(kind==='touchcancel')f.events.touchcancel();else if(kind==='multitouch'){const e=f.touch();e.touches.push({...e.touches[0],identifier:8});f.events.touchmove(e);}else if(kind==='noncancelable')f.events.touchmove({...f.touch(),cancelable:false});else f.controller.cancel();
 assert.equal(f.state().moves,0,kind);assert.equal(f.state().removed,1,kind);
}
f=fixture();f.rootEvents.touchstart(f.touch());f.events.touchcancel();f.hold();assert.equal(f.state().clones,0,'pending timer is cancelled');
f=fixture();const menu=f.event();f.rootEvents.contextmenu(menu);assert(menu.prevented);
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),version=require('../planif-version.js'),ui=fs.readFileSync(path.join(__dirname,'../planif-ui.js'),'utf8');
assert(html.includes('src="./planif-calendar-drag.js?v='+version+'"'));assert(sw.includes("'./planif-calendar-drag.js?v="+version+"'"));assert(html.includes('touch-action:pan-y pinch-zoom'));assert(ui.includes('data-move-week='));assert(ui.includes('data-move-session='));assert(!ui.includes('data-move-grip='));assert(!ui.includes('Glisse la poignée'));
console.log('OK: whole-card long press; taps/native scrolling; mouse/touch cancellation; capture cleanup; same-week/blocked drops; click suppression; versioned offline asset.');
