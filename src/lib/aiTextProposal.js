import {diffWordsWithSpace} from 'diff';
import {closeHistory} from '@tiptap/pm/history';
/** Apply textual corrections without replacing styled HTML/paragraph nodes. */
export function applyTextProposal(editor,range,text) {
 if(!editor||editor.isDestroyed||!editor.isEditable)throw new Error('AI_READ_ONLY');
 const state=editor.state,before=state.doc.textBetween(range.from,range.to,'\n\n');
 if(before!==range.before)throw new Error('AI_STALE_TARGET');
 text=String(text||'');
 if(text===before)return false;
 if(before.length>100000||text.length>100000)throw new Error('AI_SHORTER_RANGE');
 const pieces=diffWordsWithSpace(before,text);
 if(pieces.filter(x=>!x.added).map(x=>x.value).join('')!==before||pieces.filter(x=>!x.removed).map(x=>x.value).join('')!==text)throw new Error('AI_UNSAFE_STRUCTURE');
 const positions=[];let cursor=0;
 state.doc.nodesBetween(range.from,range.to,(node,pos)=>{
  if(!node.isText)return;
  const start=Math.max(range.from,pos),end=Math.min(range.to,pos+node.nodeSize),value=node.text.slice(start-pos,end-pos);
  const at=before.indexOf(value,cursor);
  if(at<0||!/^(\n\n)*$/.test(before.slice(cursor,at)))throw new Error('AI_UNSAFE_STRUCTURE');
  for(let i=0;i<value.length;i++)positions[at+i]=start+i;
  cursor=at+value.length;
 });
 if(!/^(\n\n)*$/.test(before.slice(cursor)))throw new Error('AI_UNSAFE_STRUCTURE');
 const edits=[];let offset=0,current=null;
 const flush=()=>{if(current){edits.push(current);current=null}};
 for(const part of pieces){if(!part.added&&!part.removed){flush();offset+=part.value.length;continue;}if(!current)current={start:offset,end:offset,text:''};if(part.removed){current.end+=part.value.length;offset+=part.value.length}else current.text+=part.value;}flush();
 const mapped=edits.map(edit=>{
  if(edit.text.includes('\n')||before.slice(edit.start,edit.end).includes('\n'))throw new Error('AI_UNSAFE_STRUCTURE');
  const from=positions[edit.start]??(edit.start===before.length?positions[before.length-1]+1:undefined);
  const to=edit.end===edit.start?from:positions[edit.end-1]+1;
  if(!Number.isFinite(from)||!Number.isFinite(to))throw new Error('AI_UNSAFE_STRUCTURE');
  state.doc.nodesBetween(from,to,node=>{if(node.isInline&&node.isAtom&&!node.isText)throw new Error('AI_UNSAFE_STRUCTURE')});
  return {from,to,text:edit.text};
 });
 let tr=closeHistory(state.tr);
 for(const edit of mapped.slice().reverse())tr=tr.insertText(edit.text,edit.from,edit.to);
 editor.view.dispatch(tr);
 return true;
}
