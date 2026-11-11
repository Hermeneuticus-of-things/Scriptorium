import React,{useEffect,useRef,useState} from 'react';
import {textToHtml} from '../lib/text.js';
import {insertable} from '../lib/inlineInsert.js';
import {actionKind,diffParts,noChange,providerText,sessionHistory} from '../lib/aiSession.js';
import {applyTextProposal} from '../lib/aiTextProposal.js';
import '../ai.css';
import {t as tr,uiLocale} from '../lib/i18n.js';
const ACTIONS=()=>[
 ['proofread',tr('ui.aiPanel.corectura'),tr('ui.aiPanel.corecteaza_ortografia_gramatica_si_punctuatia')],
 ['feedback',tr('ui.aiPanel.critica'),tr('ui.aiPanel.feedback_editorial')],
 ['consistency',tr('ui.aiPanel.consistenta'),tr('ui.aiPanel.verifica_textul_fata_de_notele')],
 ['revise',tr('ui.aiWorkspace.revise'),tr('ui.aiWorkspace.reviseHelp')],
 ['summarize',tr('ui.advancedSearchDialog.sinopsis'),tr('ui.aiPanel.sinopsis_de_2_3_propozitii')],
 ['continue',tr('ui.aiPanel.continua'),tr('ui.aiPanel.continua_textul_in_aceeasi_voce')],
 ['research',tr('ui.aiPanel.cercetare'),tr('ui.aiPanel.cercetare_tip')],
 ['define',tr('ui.aiPanel.explica'),tr('ui.aiPanel.explica_tip')],
 ['translate',tr('ui.aiPanel.traduce'),tr('ui.aiPanel.traduce_tip')],
];
const label=action=>Object.fromEntries([...ACTIONS().map(([id,l])=>[id,l]),['ask',tr('ui.aiPanel.intrebare')]])[action];
function captureRange(handle,scope='auto') {
 const ed=handle?.editor;if(!ed||ed.isDestroyed)return null;
 const {from,to}=ed.state.selection;
 if(scope==='selection'&&from===to)return null;
 const whole=scope==='document'||from===to;
 const range=whole?{from:0,to:ed.state.doc.content.size,whole:true,caret:to}:{from,to,whole:false,caret:to};
 return {...range,before:ed.state.doc.textBetween(range.from,range.to,'\n\n'),beforeJson:JSON.stringify(ed.state.doc.cut(range.from,range.to).toJSON())};
}
function stillThere(ed,range) {
 if(!ed||ed.isDestroyed||!range||range.to>ed.state.doc.content.size)return false;
 return ed.state.doc.textBetween(range.from,range.to,'\n\n')===range.before&&JSON.stringify(ed.state.doc.cut(range.from,range.to).toJSON())===range.beforeJson;
}
export default function AiPanel({api,hasKey,node,getText,hasSelection,getContext,getHandle,onInsert,onReplace,onReplaceAll,onSynopsis,onOpenSettings,onOpenProjectSettings,onOpenFormatting,aiLabel='',aiModel='',translateTo='',request=null,onRequestHandled,projectDir=null,projectTitle=''}) {
 const [task,setTask]=useState('proofread'),[scope,setScope]=useState('auto'),[instructions,setInstructions]=useState(''),[question,setQuestion]=useState('');
 const [busy,setBusy]=useState(null),[applying,setApplying]=useState(false),[live,setLive]=useState(''),[elapsed,setElapsed]=useState(0),[result,setResult]=useState(null),[error,setError]=useState(null),[usedBy,setUsedBy]=useState('');
 const [history,setHistory]=useState(()=>sessionHistory.list()),[contextInfo,setContextInfo]=useState(null);
 const runIdRef=useRef(''),mounted=useRef(true),runRef=useRef(null);
 const cancel=()=>{runIdRef.current='';setBusy(null);setLive('');api.cancelAi?.().catch(()=>{})};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(runIdRef.current){runIdRef.current='';api.cancelAi?.().catch(()=>{})}}},[api]);
 useEffect(()=>{if(runIdRef.current)cancel();setResult(null);setError(null);setUsedBy('');setContextInfo(null);setHistory(sessionHistory.list())},[node?.id,projectDir]);
 useEffect(()=>api.onAiDelta?.(p=>{if(p?.runId===runIdRef.current)setLive(s=>s+p.delta)}),[api]);
 useEffect(()=>{if(!busy)return;const timer=setInterval(()=>setElapsed(Math.round((Date.now()-busy.started)/1000)),500);return()=>clearInterval(timer)},[busy]);
 useEffect(()=>{if(request?.action){runRef.current?.(request.action);onRequestHandled?.()}},[request?.n]);
 const run=async(action,basis=null)=>{
  if(busy||applying)return;
  if(!hasKey){setError({message:tr('ui.aiWorkspace.configure'),settings:true});return}
  if(action==='ask'&&!question.trim())return;
  const handle=basis?.handle||(getHandle?getHandle():null);
  const range=basis?.range||captureRange(handle,scope);
  if(basis&&(basis.docId!==node.id||basis.projectDir!==projectDir||!stillThere(handle?.editor,range))){setError({message:tr('ui.aiWorkspace.stale')});return}
  if(scope==='selection'&&!range){setError({message:tr('ui.aiWorkspace.selectText')});return}
  const text=basis?.before??range?.before??getText();
  if(!String(text).trim()&&action!=='ask'){setError({message:tr('ui.aiPanel.documentul_e_gol_scrie_ceva')});return}
  const selection=range?!range.whole:hasSelection();
  const context=basis?.contextSnapshot||((action==='consistency'||action==='ask'||action==='revise')?getContext({text,question,documentId:node.id}):'');
  const contextText=typeof context==='string'?context:context?.text||'';setContextInfo(typeof context==='object'?context:null);
  const runId=`r${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;runIdRef.current=runId;
  setTask(action==='ask'?task:action);setBusy({action,started:Date.now()});setElapsed(0);setLive('');setError(null);setResult(null);
  try{
   const res=await api.runAi({action,text,question:action==='ask'?question:instructions,analysis:basis?.text||'',runId,context:contextText,lang:action==='translate'?translateTo:undefined,dir: projectDir || undefined,projectTitle,documentTitle:node.title,textScope:selection?'selection':'document'});
   if(!mounted.current||runIdRef.current!==runId)return;
   const entry=sessionHistory.add({action,text:res.text,before:range?.before||text,question:action==='ask'?question:'',docId:node.id,docTitle:node.title,projectDir,projectTitle,provider:res.provider||aiLabel,model:res.model||aiModel});
   setHistory(sessionHistory.list());setUsedBy(providerText(res.provider,res.model));setResult({...entry,selection,range,handle,contextSnapshot:context});
  }catch(e){if(mounted.current&&runIdRef.current===runId)setError({message:e.message,action})}
  finally{if(mounted.current&&runIdRef.current===runId){runIdRef.current='';setBusy(null)}}
 };
 runRef.current=run;
 const accept=async(forceKind)=>{
  const r=result;if(!r||applying)return;
  const ed=r.handle?.editor,kind=forceKind||actionKind(r.action);
  if(r.docId!==node.id||r.projectDir!==projectDir||(ed&&!stillThere(ed,r.range))){setError({message:tr('ui.aiWorkspace.stale')});return}
  if(ed&&!ed.isEditable){setError({message:tr('ui.aiWorkspace.readOnly')});return}
  setApplying(true);setError(null);
  try{
   if(ed&&r.range){
    if(kind==='replace'||kind==='insert')await api.takeSnapshot?.(projectDir,r.docId,tr('ui.aiWorkspace.snapshot'));
    if(!stillThere(ed,r.range))throw new Error('AI_STALE_TARGET');
    if(kind==='replace')applyTextProposal(ed,r.range,r.text);
    else if(kind==='synopsis')onSynopsis(r.text);
    else ed.chain().focus().insertContentAt(r.range.whole?r.range.caret:r.range.to,insertable(r.text)).run();
   }else if(kind==='replace'){
    if(Boolean(hasSelection())!==Boolean(r.selection)||getText()!==r.before)throw new Error('AI_STALE_TARGET');
    if(r.selection)onReplace(r.text);else onReplaceAll(r.text);
   }else if(kind==='synopsis')onSynopsis(r.text);
   else throw new Error('AI_STALE_TARGET');
   setResult(null);
  }catch(e){const key={AI_STALE_TARGET:'stale',AI_READ_ONLY:'readOnly',AI_SHORTER_RANGE:'shorter',AI_UNSAFE_STRUCTURE:'structure'}[e.message];setError({message:key?tr('ui.aiWorkspace.'+key):e.message})}
  finally{setApplying(false)}
 };
 const onKeyDown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run(e.target.dataset.aiQuestion?'ask':task)}else if(e.key==='Escape'&&(busy||result)){e.preventDefault();e.stopPropagation();if(busy)cancel();else setResult(null)}};
 const kind=result?actionKind(result.action):'',parts=result&&kind==='replace'?diffParts(result.before,result.text):null;
 const localHistory=history.filter(h=>h.projectDir===projectDir);
 return <aside className="ai-panel" onKeyDown={onKeyDown} aria-busy={Boolean(busy||applying)}>
  <div className="ai-book-context"><strong>{tr('ui.aiWorkspace.book',{title:projectTitle})}</strong><span>{tr('ui.aiWorkspace.document',{title:node.title})}</span></div>
  <p className="muted small ai-provider">{tr('ui.aiWorkspace.model')}: {usedBy||providerText(aiLabel,aiModel)}</p>
  <details className="ai-config"><summary>{tr('ui.aiWorkspace.configuration')}</summary><button type="button" onClick={()=>onOpenSettings('ai')}>{tr('ui.aiWorkspace.programSettings')}</button>{onOpenProjectSettings&&<button type="button" onClick={onOpenProjectSettings}>{tr('ui.aiWorkspace.bookRules')}</button>}{onOpenFormatting&&<button type="button" onClick={onOpenFormatting}>{tr('ui.aiWorkspace.formatting')}</button>}</details>
  {!hasKey&&<div className="ai-setup" role="note"><p>{tr('ui.aiWorkspace.configure')}</p><button type="button" onClick={()=>onOpenSettings('ai')}>{tr('ui.aiPanel.deschide_setari_ai')}</button></div>}
  <div className="ai-taskbar"><label>{tr('ui.aiWorkspace.task')}<select aria-label={tr('ui.aiWorkspace.task')} value={task} disabled={Boolean(busy||applying)} onChange={e=>setTask(e.target.value)}>{ACTIONS().map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label><label>{tr('ui.aiWorkspace.scope')}<select aria-label={tr('ui.aiWorkspace.scope')} value={scope} disabled={Boolean(busy||applying)} onChange={e=>setScope(e.target.value)}><option value="auto">{tr('ui.aiWorkspace.autoScope')}</option><option value="selection" disabled={!hasSelection()}>{tr('ui.aiPanel.textul_selectat')}</option><option value="document">{tr('ui.aiWorkspace.wholeDocument')}</option></select></label></div>
  <p className="muted small">{ACTIONS().find(x=>x[0]===task)?.[2]}</p>
  <textarea rows={2} aria-label={tr('ui.aiWorkspace.instructions')} placeholder={tr('ui.aiWorkspace.instructions')} value={instructions} onChange={e=>setInstructions(e.target.value)}/>
  <button type="button" className="primary ai-run" disabled={Boolean(busy||applying)||!hasKey} onClick={()=>run(task)}>{tr('ui.aiWorkspace.generate')}</button>
  <p className="muted small">{tr('ui.aiWorkspace.target',{target:scope==='document'||!hasSelection()?node.title:tr('ui.aiPanel.textul_selectat')})} · Ctrl+Enter / Esc</p>
  {contextInfo?.sources?.length>0&&<details className="ai-context-sources"><summary>{tr('ui.aiWorkspace.sources',{count:contextInfo.sources.length})}</summary><ul>{contextInfo.sources.map(s=><li key={s.id}>{s.title}</li>)}</ul></details>}
  <details className="ai-question"><summary>{tr('ui.aiWorkspace.ask')}</summary><textarea rows={2} data-ai-question="true" aria-label={tr('ui.aiPanel.intrebare_pentru_ai')} value={question} onChange={e=>setQuestion(e.target.value)}/><button type="button" disabled={Boolean(busy||applying)||!question.trim()||!hasKey} onClick={()=>run('ask')}>{tr('ui.aiPanel.intreaba')}</button></details>
  {busy&&<div className="ai-live" aria-live="polite"><p>{label(busy.action)} · {elapsed}s <button type="button" className="link" onClick={cancel}>{tr('ui.aiPanel.anuleaza_esc')}</button></p>{live&&<pre className="ai-stream">{live}</pre>}</div>}
  {error&&<div className="ai-error" role="alert"><span>{error.message}</span>{error.settings?<button type="button" className="link" onClick={()=>onOpenSettings('ai')}>{tr('ui.aiPanel.setari_ai')}</button>:error.action&&<button type="button" className="link" onClick={()=>run(error.action)}>{tr('ui.aiPanel.reincearca')}</button>}</div>}
  {result&&<div className="ai-result"><h3>{tr(kind==='read'?'ui.aiWorkspace.analysis':'ui.aiWorkspace.proposal')} — {label(result.action)}</h3><p className="muted small">{tr('ui.aiWorkspace.resultTarget',{title:result.docTitle,scope:result.selection?tr('ui.aiPanel.textul_selectat'):tr('ui.aiWorkspace.wholeDocument')})}</p>
   {parts?(noChange(parts)?<p className="ok">{tr('ui.aiPanel.nicio_corectura_necesara')}</p>:<div className="ai-diff" aria-label={tr('ui.aiPanel.diferente_inainte_dupa')}>{parts.map((p,i)=>p.added?<ins key={i}>{p.value}</ins>:p.removed?<del key={i}>{p.value}</del>:<span key={i}>{p.value}</span>)}</div>):<pre className="ai-stream">{result.text}</pre>}
   <div className="ai-actions">
    {['feedback','consistency'].includes(result.action)&&<button type="button" className="primary" disabled={Boolean(busy||applying)} onClick={()=>run('revise',result)}>{tr('ui.aiWorkspace.proposeRepair')}</button>}
    {kind==='replace'&&parts&&!noChange(parts)&&<button type="button" className="primary" disabled={applying} onClick={()=>accept()}>{tr('ui.aiWorkspace.apply')}</button>}
    {kind==='insert'&&<button type="button" className="primary" disabled={applying} onClick={()=>accept()}>{tr('ui.aiPanel.insereaza')}</button>}
    {kind==='synopsis'&&<button type="button" className="primary" disabled={applying} onClick={()=>accept('synopsis')}>{tr('ui.aiPanel.pune_ca_sinopsis_in_inspector')}</button>}
    {result.action==='ask'&&<button type="button" disabled={applying} onClick={()=>accept('insert')}>{tr('ui.aiPanel.insereaza_la_cursor')}</button>}
    <button type="button" onClick={()=>navigator.clipboard?.writeText(result.text)}>{tr('ui.aiPanel.copiaza')}</button><button type="button" disabled={applying} onClick={()=>setResult(null)}>{tr('ui.aiWorkspace.reject')}</button>
   </div></div>}
  {localHistory.length>0&&<details className="ai-history"><summary>{tr('ui.aiWorkspace.history')} ({localHistory.length})</summary><ul>{localHistory.map(h=><li key={h.id}><div className="small muted">{label(h.action)} · {h.docTitle} · {new Date(h.at).toLocaleTimeString(uiLocale(),{hour:'2-digit',minute:'2-digit'})}</div><div className="ai-history-text">{h.text.slice(0,160)}{h.text.length>160?'…':''}</div><button type="button" className="link" onClick={()=>navigator.clipboard?.writeText(h.text)}>{tr('ui.aiPanel.copiaza')}</button><button type="button" className="link" onClick={()=>onInsert(h.text)}>{tr('ui.aiWorkspace.insertCurrent')}</button></li>)}</ul><button type="button" className="link" onClick={()=>{sessionHistory.clear();setHistory([])}}>{tr('ui.aiPanel.goleste_istoricul')}</button></details>}
 </aside>;
}
