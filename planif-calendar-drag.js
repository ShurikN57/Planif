/* Pointer Events : la poignée seule bloque le défilement tactile. */
window.PlanifCalendarDrag=({root,getSession,check,move,say})=>{
  let drag=null,suppressUntil=0;
  function cleanup(){
    const d=drag;drag=null;if(!d)return;
    cancelAnimationFrame(d.frame);d.ghost?.remove();d.tile.classList.remove('calDragging');d.target?.classList.remove('calDropTarget');
    try{d.grip.releasePointerCapture(d.pointerId);}catch{}
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
  root.addEventListener('pointerdown',e=>{
    const grip=e.target.closest('[data-move-grip]');if(!grip||drag||e.button!==0||e.isPrimary===false)return;
    const source=getSession(grip.dataset.moveGrip);if(!source)return;
    const tile=grip.closest('[data-open]'),rect=tile.getBoundingClientRect();
    drag={id:grip.dataset.moveGrip,source,tile,grip,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,width:rect.width,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top};
    try{grip.setPointerCapture(e.pointerId);}catch{}
  });
  document.addEventListener('pointermove',e=>{
    const d=drag;if(!d||e.pointerId!==d.pointerId)return;
    if(!d.ghost){
      if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<8)return;
      d.ghost=d.tile.cloneNode(true);d.ghost.classList.add('calDragGhost');d.ghost.setAttribute('aria-hidden','true');d.ghost.style.width=d.width+'px';document.body.append(d.ghost);d.tile.classList.add('calDragging');
      say('Relâche sur un jour de la même semaine.');d.frame=requestAnimationFrame(scroll);
    }
    e.preventDefault();position(e.clientX,e.clientY);
  },{passive:false});
  document.addEventListener('pointerup',e=>{
    const d=drag;if(!d||e.pointerId!==d.pointerId)return;
    if(!d.ghost){cleanup();return;}
    e.preventDefault();targetAt(e.clientX,e.clientY);suppressUntil=Date.now()+600;
    const date=d.target?.dataset.moveDate;cleanup();
    if(!date){say('Déplacement annulé : choisis un jour autorisé de la même semaine.');return;}
    try{const result=check(d.id,date);if(+result.day.date===+d.source.day.date){say('Date conservée.');return;}
      say(move(date,d.source.ref)?'Séance déplacée.':'Déplacement annulé.');
    }catch(error){say(error.message);}
  });
  const cancel=()=>{if(drag?.ghost){suppressUntil=Date.now()+600;say('Déplacement annulé.');}cleanup();};
  document.addEventListener('pointercancel',e=>{if(e.pointerId===drag?.pointerId)cancel();});
  document.addEventListener('lostpointercapture',e=>{if(e.pointerId===drag?.pointerId)cancel();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)cancel();});window.addEventListener('blur',cancel);
  root.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopPropagation();}},{capture:true});
  return {cancel};
};
