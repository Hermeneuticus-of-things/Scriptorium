import React,{useEffect,useRef,useState} from 'react';
import {registerDialogSurface} from '../lib/focusDialogs.js';
import {t} from '../lib/i18n.js';
export default function AiWorkspaceWindow({focusEngine,onClose,children}) {
 const ref=useRef(null),drag=useRef(null),closeRef=useRef(onClose);closeRef.current=onClose;
 const [position,setPosition]=useState(null);
 useEffect(()=>{const cleanup=registerDialogSurface(focusEngine,'dialog.aiBook',{modal:false,close:()=>{closeRef.current();return true}});ref.current?.querySelector('select,textarea,button')?.focus({preventScroll:true});return cleanup},[focusEngine]);
 const move=(x,y)=>{const r=ref.current.getBoundingClientRect();setPosition({x:Math.max(0,Math.min(window.innerWidth-r.width,x)),y:Math.max(0,Math.min(window.innerHeight-r.height,y))})};
 const down=e=>{if(e.button!==0||e.target.closest('button'))return;const r=ref.current.getBoundingClientRect();drag.current={x:e.clientX-r.left,y:e.clientY-r.top};e.currentTarget.setPointerCapture(e.pointerId)};
 return <section ref={ref} className="ai-workspace" role="dialog" aria-modal="false" aria-labelledby="ai-workspace-title" onPointerDown={()=>focusEngine.switchFocus('dialog.aiBook')} onFocusCapture={()=>focusEngine.switchFocus('dialog.aiBook')} style={position?{left:position.x,top:position.y,right:'auto'}:undefined}>
  <header className="ai-workspace-head" tabIndex={0} aria-label={t('ui.aiWorkspace.move')} onPointerDown={down} onPointerMove={e=>{if(drag.current)move(e.clientX-drag.current.x,e.clientY-drag.current.y)}} onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onKeyDown={e=>{if(!e.altKey)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();const r=ref.current.getBoundingClientRect(),step=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ctl-lg'))||32;move(r.left+delta[0]*step,r.top+delta[1]*step)}}}>
   <h2 id="ai-workspace-title">{t('ui.aiWorkspace.title')}</h2>
   <button type="button" onClick={onClose} aria-label={t('btn.close')} title={t('btn.close')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2"/></svg></button>
  </header>
  <div className="ai-workspace-body">{children}</div>
 </section>;
}
