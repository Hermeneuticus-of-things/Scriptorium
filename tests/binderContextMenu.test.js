import { describe, it, expect, vi } from 'vitest';
import { binderContext, binderContextTitle, buildBinderContextMenu } from '../src/lib/binderContextMenu.js';
import { commandItem, commandGroup, tidyMenuItems } from '../src/lib/commands.js';
import { nativeMenuSpec } from '../src/lib/menuLayout.js';
const tr = (key, args) => key + (args ? JSON.stringify(args) : '');
const project = () => ({ tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [{ id: 'folder', type: 'folder', title: 'Capitol', children: [{ id: 'a', type: 'text', title: 'A' }, { id: 'b', type: 'text', title: 'B' }] }] }, { id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [{ id: 'media', type: 'file', title: 'PDF', media: { mime: 'application/pdf' } }] }, { id: 'trash', root: 'trash', type: 'folder', title: 'Coș', children: [{ id: 'gone', type: 'text', title: 'Șters' }] }], labels: [{ name: '' }, { name: 'Idee' }], statuses: ['', 'Final'], sectionTypes: [{ title: 'Scenă' }] });
function fixture(id, extra = {}) { const callbacks = Object.fromEntries(['add','rename','copy','duplicate','drop','trash','restore','patch','convert','sortChildren','group','copyLink','snapshot','showInExplorer','quickRef','select','setAllCollapsed','emptyTrash','setTemplateFolder','addToCollection','newCollection','removeFromCollection'].map((k) => [k, vi.fn()])); const options = { project: project(), id, selectedIds: new Set([id]), tr, icons: ['x','y'], collections: [{ id:'col', title:'Colecție', ids:[] }], callbacks, ...extra };return { ...options, items: buildBinderContextMenu(options) }; }
const leaves = (items) => items.flatMap((x) => x === '-' ? [] : x.submenu ? leaves(x.submenu) : [x]);
const ids = (items) => leaves(items).map((x) => x.commandId);
const group = (items, id) => items.find((x) => x.groupId === id);

describe('P0/P1 — Binder contexts', () => {
  for (const id of ['a','folder','media','draft','research','trash','gone']) it(`${id}: no impossible actions and <=12 top-level entries`, () => { const f=fixture(id); expect(f.items.filter(x=>x!=='-').length).toBeLessThanOrEqual(12);expect(leaves(f.items).some(x=>x.disabled)).toBe(false); });
  it('properties contain label/status/compile/favorite, not top level',()=>{const f=fixture('a');expect(ids(group(f.items,'binder.properties').submenu)).toEqual(expect.arrayContaining(['setLabel','setStatus','includeInCompile','favorite']));expect(f.items.some(x=>['setLabel','setStatus','includeInCompile','favorite'].includes(x.id))).toBe(false)});
  it('tree operations share one group only for containers',()=>{const f=fixture('folder');expect(ids(group(f.items,'binder.tree').submenu)).toEqual(expect.arrayContaining(['expandAll','collapseAll','sortChildren']));expect(group(fixture('a').items,'binder.tree')).toBeUndefined()});
  it('a folder has one duplicate group and two meaningful payloads',()=>{const f=fixture('folder');const d=group(f.items,'binder.duplicate');expect(d.submenu).toHaveLength(2);expect(d.submenu.map(x=>x.commandId)).toEqual(['duplicate','duplicate']);d.submenu[1].action();expect(f.callbacks.duplicate).toHaveBeenCalledWith('folder',false);d.submenu[0].action();expect(f.callbacks.copy).toHaveBeenCalledWith(['folder'],'folder','after')});
  it('a leaf has one duplicate action, no no-children variant',()=>{const f=fixture('a');expect(leaves(f.items).filter(x=>x.commandId==='duplicate')).toHaveLength(1);expect(group(f.items,'binder.duplicate')).toBeUndefined()});
  it('roots expose neither mutators nor property tools',()=>{for(const id of ['draft','research','trash'])for (const action of ['rename','duplicate','trash','setLabel','favorite','snapshot','quickRef']) expect(ids(fixture(id).items)).not.toContain(action)});
  it('trash item has restore, not mutators; root has empty action',()=>{const f=fixture('gone');expect(ids(f.items)).toContain('restoreTrash');expect(ids(f.items)).not.toContain('trash');expect(group(f.items,'binder.properties')).toBeUndefined();leaves(f.items).find(x=>x.commandId==='restoreTrash').action();expect(f.callbacks.restore).toHaveBeenCalledWith(['gone']);expect(ids(fixture('trash').items)).toContain('emptyTrash')});
  it('empty trash offers no empty action',()=>{const p=project();p.tree[2].children=[];expect(ids(fixture('trash',{project:p}).items)).not.toContain('emptyTrash')});
  it('media exposes no text conversions, snapshot, compile or QuickRef',()=>{const f=fixture('media');for(const id of ['convertFolder','convertText','snapshot','includeInCompile','quickRef'])expect(ids(f.items)).not.toContain(id);expect(ids(f.items)).toContain('openInOtherPane')});
  it('only the applicable conversion is shown',()=>{expect(ids(fixture('a').items)).toContain('convertFolder');expect(ids(fixture('a').items)).not.toContain('convertText');expect(ids(fixture('folder').items)).toContain('convertText');expect(ids(fixture('folder').items)).not.toContain('convertFolder')});
  it('explicit multi-selection stays bound; caption and collection wording distinguish it',()=>{const f=fixture('a',{selectedIds:new Set(['a','b'])});const col=group(f.items,'binder.collections');expect(col.submenu[0].label).toBe('ui.binder.addSelectionCollection');expect(binderContextTitle(binderContext(f),tr)).toContain('selectionCaption');const fav=leaves(f.items).find(x=>x.commandId==='favorite');f.selectedIds.clear();fav.action();expect(f.callbacks.patch).toHaveBeenCalledWith(['a','b'],{favorite:true});expect(ids(f.items)).not.toContain('rename')});
  it('single collection wording names the item',()=>expect(group(fixture('a').items,'binder.collections').submenu[0].label).toBe('ui.binder.addItemCollection'));
  it('templates are inside Add, absent without available templates',()=>{const f=fixture('a');expect(ids(f.items)).not.toContain('newFromTemplate');const g=fixture('a',{templates:[{id:'tpl',title:'Șablon'}],callbacks:{...f.callbacks,newFromTemplate:vi.fn()}});expect(ids(group(g.items,'binder.add').submenu)).toContain('newFromTemplate')});
  it('move destinations exclude selected subtrees and every trash descendant',()=>{const f=fixture('folder');const move=group(f.items,'binder.move');expect(leaves(move.submenu).map(x=>x.payload.targetId)).toEqual(['draft','research'])});
});
describe('P2 — command identity and menu normalization',()=>{
  it('identity does not depend on label',()=>{expect(commandItem('save',{label:'Salvează'}).commandId).toBe(commandItem('save',{label:'Save'}).commandId)});
  it('empty groups, hidden actions and redundant separators disappear',()=>{expect(tidyMenuItems(['-',commandGroup('x','X',[{hidden:true,label:'No'}]),'-',commandItem('save',{label:'Save'}),'-','-']).map(x=>x.id)).toEqual(['save'])});
  it('native scoped actions stay distinct but share the canonical command',()=>{const yes=vi.fn(),no=vi.fn();const result=nativeMenuSpec([{label:'Documente',items:[commandGroup('dup','Duplică',[commandItem('duplicate',{label:'Cu',payload:{includeChildren:true},action:yes}),commandItem('duplicate',{label:'Fără',payload:{includeChildren:false},action:no})])]}]);const children=result.spec[0].items[0].items;expect(children.map(x=>x.commandId)).toEqual(['duplicate','duplicate']);expect(children[0].id).not.toBe(children[1].id);result.actions[children[0].id]();result.actions[children[1].id]();expect(yes).toHaveBeenCalledOnce();expect(no).toHaveBeenCalledOnce()});
});

describe('AI pe niveluri din meniul contextual (directivă autor 2026-11-10)', () => {
  const run = (id, cbExtra = {}, cbAbsent = false) => {
    const callbacks = Object.fromEntries(['add','rename','copy','duplicate','drop','trash','restore','patch','convert','sortChildren','group','copyLink','snapshot','showInExplorer','quickRef','select','setAllCollapsed','emptyTrash','setTemplateFolder','addToCollection','newCollection','removeFromCollection'].map((k) => [k, vi.fn()]));
    const ai = vi.fn();
    const f = fixture(id, { callbacks: { ...callbacks, ...(cbAbsent ? {} : { ai, ...cbExtra }) } });
    return { f, ai };
  };
  const grp = (f) => group(f.items, 'binder.ai');
  it('document simplu: secțiunea + capitolul + manuscrisul + cartea, în ordine', () => {
    const { f, ai } = run('a');
    const g = grp(f);
    expect(g).toBeTruthy();
    expect(g.submenu.map((x) => x.id)).toEqual(['aiSection', 'aiChapter', 'aiManuscript', 'aiBook']);
    g.submenu[0].action(); expect(ai).toHaveBeenCalledWith({ nodeId: 'a', level: 'section' });
    g.submenu[1].action(); expect(ai).toHaveBeenCalledWith({ nodeId: 'folder', level: 'chapter' });
    g.submenu[2].action(); expect(ai).toHaveBeenCalledWith({ nodeId: 'draft', level: 'manuscript' });
    g.submenu[3].action(); expect(ai).toHaveBeenCalledWith({ nodeId: 'draft', level: 'book' });
  });
  it('dosar: capitolul + manuscrisul + cartea (fără secțiune)', () => {
    const { f, ai } = run('folder');
    expect(grp(f).submenu.map((x) => x.id)).toEqual(['aiChapter', 'aiManuscript', 'aiBook']);
    grp(f).submenu[0].action(); expect(ai).toHaveBeenCalledWith({ nodeId: 'folder', level: 'chapter' });
  });
  it('rădăcina Manuscris: manuscrisul + cartea (fără secțiune/capitol redundante)', () => {
    const { f, ai } = run('draft');
    expect(grp(f).submenu.map((x) => x.id)).toEqual(['aiManuscript', 'aiBook']);
  });
  it('media din Cercetare: manuscrisul + cartea (niveluri de proiect, fără secțiune pe media)', () => {
    const { f, ai } = run('media');
    expect(grp(f).submenu.map((x) => x.id)).toEqual(['aiManuscript', 'aiBook']);
    grp(f).submenu[1].action();
    expect(ai).toHaveBeenCalledWith({ nodeId: 'draft', level: 'book' });
  });
  it('subarborele Coșului rămâne în afara grupului; fără callback (AI off) grupul lipsește', () => {
    expect(grp(run('gone').f)).toBeUndefined();
    expect(grp(run('trash').f)).toBeUndefined();
    expect(grp(run('a', {}, true).f)).toBeUndefined();
  });
});
