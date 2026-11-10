// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest';
import {alignHtmlParagraphs,alignmentTargets,justifyDocuments} from '../src/lib/paragraphAlignment.js';
const parse = s => new DOMParser().parseFromString(s,'text/html').body;
describe('alignment only',()=>{
 it('preserves text, headings, fonts, spacing and content marks',()=>{
  const html='<h1 style="text-align:center">I. Titlu</h1><p data-style-name="corp" style="font-size:18px;margin-top:2em;text-align:left"><strong>Text</strong> &amp; <a href="#note" data-comment="observație">link</a><span style="font-family:Georgia;color:red"> românesc</span></p><blockquote><p>Un citat.</p></blockquote>';
  const out=alignHtmlParagraphs(html);const before=parse(html),after=parse(out.html);
  expect(after.textContent).toBe(before.textContent);expect(after.querySelector('h1').outerHTML).toBe(before.querySelector('h1').outerHTML);
  for(const p of after.querySelectorAll('p'))expect(p.style.textAlign).toBe('justify');
  expect(after.querySelector('p').style.fontSize).toBe('18px');expect(after.querySelector('p').style.marginTop).toBe('2em');
  expect(after.querySelector('p').dataset.styleName).toBe('corp');expect(after.querySelector('strong').outerHTML).toBe(before.querySelector('strong').outerHTML);expect(after.querySelector('a').outerHTML).toBe(before.querySelector('a').outerHTML);expect(after.querySelector('span').outerHTML).toBe(before.querySelector('span').outerHTML);
 });
 it('does not touch code or script paragraphs',()=>{const h='<pre><code>x = 1</code></pre><p data-script-element="dialogue" style="text-align:left">Replica</p><p>Proză</p>';const b=parse(alignHtmlParagraphs(h).html);expect(b.querySelector('pre').outerHTML).toBe(parse(h).querySelector('pre').outerHTML);expect(b.querySelector('[data-script-element]').style.textAlign).toBe('left');expect(b.lastChild.style.textAlign).toBe('justify')});
 it('is byte-idempotent when already justified',()=>{const h='<p style="text-align: justify">Text</p>';expect(alignHtmlParagraphs(h)).toMatchObject({html:h,changed:false,changedParagraphs:0})});
 it('creates aligned empty initial paragraph',()=>expect(parse(alignHtmlParagraphs('').html).querySelector('p').style.textAlign).toBe('justify'));
 it('preserves table structure and note anchors',()=>{const h='<table><tbody><tr><td><p>A</p></td></tr></tbody></table><p><sup data-footnote="n1">1</sup></p>';const out=parse(alignHtmlParagraphs(h).html);expect(out.querySelectorAll('td')).toHaveLength(1);expect(out.querySelector('sup').outerHTML).toBe(parse(h).querySelector('sup').outerHTML)});
 it('rejects invalid alignments',()=>expect(()=>alignHtmlParagraphs('<p>X</p>','bogus')).toThrow());
});
const tree=[{id:'draft',root:'draft',children:[{id:'folder',type:'folder',children:[{id:'a',type:'text'},{id:'b',type:'text',locked:true},{id:'s',type:'text',scriptFormat:'screenplay'}]},{id:'c',type:'text'}]},{id:'research',root:'research',children:[{id:'r',type:'text'}]},{id:'trash',root:'trash',children:[{id:'t',type:'text'}]}];
describe('scopes',()=>{
 it('only includes editable manuscript prose',()=>expect(alignmentTargets(tree,'draft').map(n=>n.id)).toEqual(['a','c']));
 it('only targets the selected document',()=>expect(alignmentTargets(tree,'document','a').map(n=>n.id)).toEqual(['a']));
 it('can format a research document explicitly without touching the manuscript',()=>expect(alignmentTargets(tree,'document','r').map(n=>n.id)).toEqual(['r']));
 it.each(['draft','folder','b','s','t','missing'])('rejects noneditable or invalid document %s',id=>expect(alignmentTargets(tree,'document',id)).toEqual([]));
});
function fixture(){const docs={a:'<p>A</p>',b:'<p style="text-align: justify">B</p>',c:'<p>C</p>'},events=[];return {docs,events,opts:{ids:['a','b','c'],read:vi.fn(async id=>docs[id]),snapshot:vi.fn(async id=>events.push('snap:'+id)),write:vi.fn(async(id,h)=>{events.push('write:'+id);docs[id]=h}),onSaved:vi.fn(async id=>events.push('saved:'+id)),onProgress:vi.fn()}}}
describe('safe persistence',()=>{
 it('snapshots before writing, skips unchanged docs, reports actual completed work',async()=>{const {opts,events}=fixture();expect(await justifyDocuments(opts)).toMatchObject({changed:2,completed:3,total:3,cancelled:false});expect(events).toEqual(['snap:a','write:a','saved:a','snap:c','write:c','saved:c']);expect(opts.onProgress).toHaveBeenCalledTimes(3)});
 it('does not write if snapshot fails',async()=>{const {opts}=fixture();opts.snapshot.mockRejectedValue(new Error('backup failed'));await expect(justifyDocuments(opts)).rejects.toThrow('backup failed');expect(opts.write).not.toHaveBeenCalled()});
 it('detects an external change between snapshot and write',async()=>{const {opts,docs}=fixture();opts.snapshot.mockImplementation(async id=>{docs[id]='<p>Nou</p>'});await expect(justifyDocuments(opts)).rejects.toMatchObject({code:'ALIGNMENT_CONFLICT'});expect(opts.write).not.toHaveBeenCalled();expect(docs.a).toBe('<p>Nou</p>')});
 it('stops before any read/write when cancelled',async()=>{const {opts}=fixture();const c=new AbortController();c.abort();expect(await justifyDocuments({...opts,signal:c.signal})).toMatchObject({completed:0,cancelled:true});expect(opts.read).not.toHaveBeenCalled();expect(opts.write).not.toHaveBeenCalled()});
 it('stops safely after snapshot when cancellation arrives',async()=>{const {opts}=fixture();const c=new AbortController();opts.snapshot.mockImplementation(async()=>c.abort());expect(await justifyDocuments({...opts,signal:c.signal})).toMatchObject({completed:0,changed:0,cancelled:true});expect(opts.write).not.toHaveBeenCalled()});
 it('preserves already completed counts on partial write failure',async()=>{const {opts}=fixture();opts.write.mockImplementation(async id=>{if(id==='c')throw new Error('disk unavailable')});await expect(justifyDocuments(opts)).rejects.toMatchObject({alignmentResult:{changed:1,completed:2,total:3}})});
});
