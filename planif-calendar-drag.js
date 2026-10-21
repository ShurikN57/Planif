/* Hold anywhere on a workout. Touch scrolling stays native until the hold wins. */
window.PlanifCalendarDrag=({root,getSession,check,move,say})=>{
  let drag=null,suppressUntil=0;
  function cleanup(){
    const d=drag;drag=null;if(!d)return;
    clearTimeout(d.timer);cancelAnimationFrame(d.frame);d.ghost?.remove();d.tile.classList.remove('calDragging');d.target?.classList.remove('calDropTarget');
    if(d.pointerId!==undefined)try{d.tile.releasePointerCapture(d.pointerId);}catch{}
  }
  function targetAt(x,y){
    const d=drag,row=document.elementFromPoint(x,y)?.closest('[data-move-date]');
    d.target?.classList.remove('calDropTarget');d.target=null;
    if(!row||!root.contains(row)||Number(row.dataset.moveWeek)!==d.source.ref.w)return;
    try{check(d.id,row.dataset.moveDate);d.target=row;row.classList.add('calDropTarget');}catch{}
  }
  function position(x,y){
    const d=drag;d.x=x;d.y=y;
    d.ghost.style.left=Math.max(8,Math.min(window.innerWidth-d.width-8,x-d.offsetX))+'px';d.ghost.style.top=(y-d.offsetY)+'px';targetAt(x,y);
  }
  function scroll(){
    const d=drag;if(!d?.ghost)return;
    const delta=d.y<60?-12:d.y>window.innerHeight-60?12:0;
    if(delta){window.scrollBy(0,delta);targetAt(d.x,d.y);}
    d.frame=requestAnimationFrame(scroll);
  }
  function begin(tile,p,identity){
    if(!tile||!root.contains(tile)||drag)return;
    const source=getSession(tile.dataset.moveSession);if(!source)return;
    const rect=tile.getBoundingClientRect();
    const d=drag={id:tile.dataset.moveSession,source,tile,...identity,startX:p.clientX,startY:p.clientY,width:rect.width,offsetX:p.clientX-rect.left,offsetY:p.clientY-rect.top};
    d.timer=setTimeout(()=>{
      if(drag!==d)return;
      if(!root.contains(tile)){cleanup();return;}
      d.ghost=tile.cloneNode(true);d.ghost.classList.add('calDragGhost');d.ghost.setAttribute('aria-hidden','true');d.ghost.style.width=d.width+'px';document.body.append(d.ghost);tile.classList.add('calDragging');
      if(d.pointerId!==undefined)try{tile.setPointerCapture(d.pointerId);}catch{}
      position(d.startX,d.startY);say('Relâche sur un jour de la même semaine.');d.frame=requestAnimationFrame(scroll);
    },450);
  }
  function motion(p,e){
    const d=drag;if(!d)return;
    if(!d.ghost){if(Math.hypot(p.clientX-d.startX,p.clientY-d.startY)>8)cleanup();return;}
    if(e.cancelable===false){cancel();return;}
    e.preventDefault();position(p.clientX,p.clientY);
  }
  function finish(p,e){
    const d=drag;if(!d)return;
    if(!d.ghost){cleanup();return;}
    e.preventDefault();targetAt(p.clientX,p.clientY);suppressUntil=Date.now()+600;
    const date=d.target?.dataset.moveDate;cleanup();
    if(!date){say('Déplacement annulé : choisis un jour autorisé de la même semaine.');return;}
    try{const result=check(d.id,date);if(+result.day.date===+d.source.day.date){say('Date conservée.');return;}
      say(move(date,d.source.ref)?'Séance déplacée.':'Déplacement annulé.');
    }catch(error){say(error.message);}
  }
  const cancel=()=>{if(drag?.ghost){suppressUntil=Date.now()+600;say('Déplacement annulé.');}cleanup();};
  root.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'||e.button!==0||e.isPrimary===false)return;
    begin(e.target.closest('[data-move-session]'),e,{pointerId:e.pointerId});
  });
  document.addEventListener('pointermove',e=>{if(e.pointerId===drag?.pointerId)motion(e,e);},{passive:false});
  document.addEventListener('pointerup',e=>{if(e.pointerId===drag?.pointerId)finish(e,e);});
  // Non-passive touchmove can prevent panning after a stationary long press.
  // Changing touch-action after pointerdown cannot do this reliably on iOS.
  root.addEventListener('touchstart',e=>{
    if(e.touches.length!==1){cancel();return;}
    const p=e.touches[0];begin(e.target.closest('[data-move-session]'),p,{touchId:p.identifier});
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(drag?.touchId===undefined)return;
    if(e.touches.length!==1){cancel();return;}
    const p=Array.from(e.touches).find(p=>p.identifier===drag.touchId);if(p)motion(p,e);
  },{passive:false});
  document.addEventListener('touchend',e=>{if(drag?.touchId===undefined)return;const p=Array.from(e.changedTouches).find(p=>p.identifier===drag.touchId);if(p)finish(p,e);});
  document.addEventListener('touchcancel',()=>{if(drag?.touchId!==undefined)cancel();});
  document.addEventListener('pointercancel',e=>{if(e.pointerId===drag?.pointerId)cancel();});
  document.addEventListener('lostpointercapture',e=>{if(e.pointerId===drag?.pointerId)cancel();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)cancel();});window.addEventListener('blur',cancel);
  root.addEventListener('contextmenu',e=>{if(e.target.closest('[data-move-session]'))e.preventDefault();});
  root.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopPropagation();}},{capture:true});
  return {cancel};
};
