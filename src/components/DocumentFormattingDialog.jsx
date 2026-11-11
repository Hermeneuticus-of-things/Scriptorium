import React,{useRef,useState} from 'react';
import {t as i18nT} from '../lib/i18n.js';
import {FONTS} from './DefaultFormatPane.jsx';
import {cleanFormattingPatch} from '../lib/paragraphAlignment.js';
const FIELDS=['align','font','size','lineHeight','firstIndent','indentLeft','indentRight','spaceBefore','spaceAfter'];
const RANGES={size:[8,96,1],lineHeight:[0.5,4,0.1],firstIndent:[-8,32,0.25],indentLeft:[0,32,0.25],indentRight:[0,32,0.25],spaceBefore:[0,32,0.1],spaceAfter:[0,32,0.1]};
export default function DocumentFormattingDialog({scope,count,defaults={},onApply,onClose}) {
 const [chosen,setChosen]=useState({align:true});
 const [values,setValues]=useState({align:defaults?.align||'justify',font:defaults?.font||'Georgia, serif',size:defaults?.size||18,lineHeight:defaults?.lineHeight||1.5,firstIndent:defaults?.firstIndent??0,indentLeft:defaults?.indentLeft??0,indentRight:defaults?.indentRight??0,spaceBefore:defaults?.spaceBefore??0,spaceAfter:defaults?.spaceAfter??0});
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState('');const controller=useRef(null);
 const apply=async()=>{
  if(busy)return;setError('');
  let patch;try{patch=cleanFormattingPatch(Object.fromEntries(FIELDS.filter(k=>chosen[k]).map(k=>[k,values[k]])))}catch(e){setError(i18nT('ui.format.invalid'));return}
  if(!Object.keys(patch).length)return;
  controller.current=new AbortController();setBusy(true);
  try{const result=await onApply({patch,signal:controller.current.signal,onProgress:p=>setProgress(p.completed)});if(!result.cancelled)onClose();else setError(t('ui.justify.cancelled',{count:result.completed,total:result.total}))}
  catch(e){setError(i18nT('ui.justify.failed',{count:e.alignmentResult?.completed||0})+' '+(e.code==='ALIGNMENT_CONFLICT'?i18nT('ui.justify.conflict'):e.message))}
  finally{setBusy(false)}
 };
 const control=k=>{const props={'aria-label':i18nT('ui.format.'+k),value:values[k],disabled:busy||!chosen[k],onChange:e=>setValues(v=>({...v,[k]:e.target.value}))};
  if(k==='align')return <select {...props}>{['left','center','right','justify'].map(a=><option key={a} value={a}>{i18nT('ui.dfp.align_'+({left:'stanga',center:'centru',right:'dreapta',justify:'justify'}[a]))}</option>)}</select>;
  if(k==='font')return <select {...props}>{FONTS.filter(Boolean).map(f=><option key={f} value={f}>{f.split(',')[0].replace(/'/g,'')}</option>)}</select>;
  const [min,max,step]=RANGES[k];return <input {...props} type="number" min={min} max={max} step={step}/>;
 };
 return <div className="backdrop" onClick={busy?undefined:onClose}>
  <div className="modal document-formatting-dialog" role="dialog" aria-modal="true" aria-labelledby="document-formatting-title" aria-describedby="document-formatting-description" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(busy)controller.current?.abort();else onClose()}}}>
   <h2 id="document-formatting-title">{i18nT(scope==='draft'?'cmd.formatManuscript':'cmd.formatDocument')}</h2>
   <p id="document-formatting-description">{i18nT('ui.format.description')}</p><p className="muted">{i18nT('ui.justify.scope',{count})}</p>
   <div className="document-formatting-fields">{FIELDS.map(k=><div className="document-formatting-field" key={k}>
    <label><input type="checkbox" autoFocus={k==='align'} checked={Boolean(chosen[k])} disabled={busy} onChange={e=>setChosen(v=>({...v,[k]:e.target.checked}))} aria-label={i18nT('ui.format.select',{field:i18nT('ui.format.'+k)})}/> {i18nT('ui.format.'+k)}</label>
    {control(k)}<span className="muted">{k==='size'?'px':k==='font'||k==='align'||k==='lineHeight'?'':'em'}</span>
   </div>)}</div>
   {scope==='draft'&&<p className="muted">{i18nT('ui.format.default')}</p>}
   {busy&&<div role="status" aria-live="polite"><progress value={progress} max={Math.max(count,1)} aria-label={i18nT('ui.format.progress')}/><span> {progress} / {count}</span></div>}
   {error&&<p role="alert">{error}</p>}
   <div className="actions"><button type="button" onClick={()=>busy?controller.current?.abort():onClose()}>{i18nT(busy?'ui.justify.stop':'btn.cancel')}</button><button type="button" className="primary" disabled={busy||!count||!FIELDS.some(k=>chosen[k])} onClick={apply}>{i18nT('ui.format.apply')}</button></div>
  </div>
 </div>;
}
