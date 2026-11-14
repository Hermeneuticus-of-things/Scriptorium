// Selective document formatting, not a reset or text rewrite.
const ALIGNS = new Set(['left', 'center', 'right', 'justify']);
const NUMBERS = {size:[8,96],lineHeight:[0.5,4],firstIndent:[-8,32],indentLeft:[0,32],indentRight:[0,32],spaceBefore:[0,32],spaceAfter:[0,32]};
const CSS = {align:'text-align',lineHeight:'line-height',firstIndent:'text-indent',indentLeft:'margin-left',indentRight:'margin-right',spaceBefore:'margin-top',spaceAfter:'margin-bottom'};
export function cleanFormattingPatch(patch) {
  const out = {};
  for (const [key,value] of Object.entries(patch || {})) {
    if (key === 'align') {if (!ALIGNS.has(value)) throw new Error('Invalid paragraph alignment');out.align=value;}
    else if (key === 'font') {if (typeof value !== 'string' || !value.trim() || value.length>240) throw new Error('Invalid font');out.font=value.trim();}
    else if (NUMBERS[key]) {const n=Number(value),[lo,hi]=NUMBERS[key];if (!Number.isFinite(n) || n<lo || n>hi) throw new Error('Invalid formatting value: '+key);out[key]=n;}
    else throw new Error('Unsupported formatting property: '+key);
  }
  return out;
}
export function formatHtmlParagraphs(html, patch) {
  patch=cleanFormattingPatch(patch);
  const input=html||'<p></p>',doc=new DOMParser().parseFromString(input,'text/html'),text=doc.body.textContent;
  let paragraphs=0,changedParagraphs=0;
  for (const p of doc.body.querySelectorAll('p')) {
    if (p.closest('pre,code') || p.hasAttribute('data-script-element')) continue;
    paragraphs++;
    const before=p.outerHTML;
    for (const [key,property] of Object.entries(CSS)) {
      if (!(key in patch)) continue;
      const value=key==='align'||key==='lineHeight'?String(patch[key]):patch[key]+'em';
      if (p.style.getPropertyValue(property)!==value) p.style.setProperty(property,value);
    }
    // Font marks are stored on spans by the editor. A paragraph-only CSS font
    // would disappear on the next save and would not override existing span fonts.
    // Valoarea EFECTIVĂ contează (moștenire pe lanțul de ancestor-i): re-aplicarea
    // aceleiași formatari nu trebuie să rescrie nimic — înainte, învelirea textului din
    // <em>/<strong> într-un span identic vizual era numărată ca „modificat" și fișierele
    // erau rescrise la fiecare aplicare („apare că funcționează, dar nu face nimic").
    if ('font' in patch || 'size' in patch) {
      const walker=doc.createTreeWalker(p,4),texts=[];while(walker.nextNode())texts.push(walker.currentNode);
      for (const node of texts) {
        if (!node.textContent.trim() || node.parentElement.closest('pre,code')) continue;
        const effective=(prop)=>{for(let el=node.parentElement;el&&el!==p.parentElement;el=el.parentElement){const v=el.style&&el.style.getPropertyValue(prop);if(v)return v;}return '';};
        const needFont='font' in patch && effective('font-family')!==patch.font;
        const needSize='size' in patch && effective('font-size')!==patch.size+'px';
        if (!needFont && !needSize) continue;
        let span=node.parentElement;
        if (span.tagName!=='SPAN') {span=doc.createElement('span');node.replaceWith(span);span.appendChild(node);}
        if (needFont && span.style.fontFamily!==patch.font) span.style.fontFamily=patch.font;
        if (needSize && span.style.fontSize!==patch.size+'px') span.style.fontSize=patch.size+'px';
      }
    }
    if (p.outerHTML!==before) changedParagraphs++;
  }
  if (doc.body.textContent!==text) throw new Error('Text changed during formatting');
  return {html:changedParagraphs?doc.body.innerHTML:input,changed:changedParagraphs>0,paragraphs,changedParagraphs};
}
export const alignHtmlParagraphs=(html,align='justify')=>formatHtmlParagraphs(html,{align});
export function alignmentTargets(tree,scope,selectedId) {
  const flat=ns=>ns.flatMap(n=>[n,...flat(n.children||[])]);
  const draft=(tree||[]).find(n=>n.root==='draft');
  const trash=new Set(flat((tree||[]).filter(n=>n.root==='trash')).map(n=>n.id));
  const nodes=scope==='draft'?flat(draft?.children||[]):flat(tree||[]).filter(n=>n.id===selectedId);
  return nodes.filter(n=>!n.root&&n.type==='text'&&!trash.has(n.id)&&!n.locked&&!n.readOnly&&!n.scriptFormat&&!n.script);
}
/** Snapshot failures stop before writing. A modal owns input while running.
 * Re-read after snapshot to detect external edits; retain completed work on abort/error.
 */
export async function formatDocuments({ids,patch,read,snapshot,write,onSaved=()=>{},onProgress=()=>{},signal}) {
  patch=cleanFormattingPatch(patch);
  let changed=0,paragraphs=0,completed=0;
  for (const id of ids) {
    if (signal?.aborted) break;
    try {
      const before=await read(id),result=formatHtmlParagraphs(before,patch);
      paragraphs+=result.paragraphs;
      if (result.changed) {
        await snapshot(id);
        if (signal?.aborted) break;
        if (await read(id)!==before) {const conflict=new Error('ALIGNMENT_CONFLICT');conflict.code='ALIGNMENT_CONFLICT';throw conflict;}
        await write(id,result.html);
        changed++;
        await onSaved(id,result.html);
      }
      completed++;
      onProgress({completed,total:ids.length,changed});
    } catch (error) {error.alignmentResult={changed,completed,total:ids.length};throw error;}
  }
  return {changed,completed,total:ids.length,paragraphs,cancelled:Boolean(signal?.aborted)};
}
export const justifyDocuments=options=>formatDocuments({...options,patch:{align:'justify'}});
