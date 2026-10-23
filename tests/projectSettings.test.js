import { describe, it, expect } from 'vitest';
import {
  NONE, renameLabel, deleteLabel, renameStatus, deleteStatus, renameCustomField, deleteCustomField,
  renameSectionType, deleteSectionType, makeDraft, applyProjectSettings, validateDraft, moveItem, walkTree,
} from '../src/lib/projectSettings.js';

const make = () => ({
  title: 'Carte',
  labels: [{ name: NONE, color: '' }, { name: 'Idee', color: '#e8b04a' }, { name: 'Loc', color: '#70ad47' }],
  statuses: [NONE, 'Ciornă', 'Final'],
  customFields: [
    { id: 'f1', title: 'POV', type: 'text', options: [], default: '', wraps: false },
    { id: 'f2', title: 'Gata', type: 'checkbox', options: [], default: false, wraps: false },
  ],
  sectionTypes: [{ id: 's1', title: 'Capitol' }, { id: 's2', title: 'Scenă' }],
  sectionTypeLevels: { folders: 's1', containers: null, files: 's2' },
  tree: [
    { id: 'draft', children: [
      { id: 'a', label: 'Idee', status: 'Ciornă', custom: { POV: 'Ana', Gata: true }, sectionType: 'Capitol', children: [
        { id: 'a1', label: 'Idee', status: 'Final', custom: { POV: 'Ion' }, sectionType: 'Scenă' },
      ] },
      { id: 'b', label: 'Loc', status: 'Final' },
    ] },
  ],
});
const nodes = (p) => { const out = {}; walkTree(p.tree, (n) => { out[n.id] = n; }); return out; };

describe('individual helpers', () => {
  it('renameLabel propagates into nested children and does not mutate', () => {
    const p = make();
    const q = renameLabel(p, 'Idee', 'Gând');
    expect(nodes(q).a.label).toBe('Gând');
    expect(nodes(q).a1.label).toBe('Gând');
    expect(q.labels[1]).toEqual({ name: 'Gând', color: '#e8b04a' });
    expect(nodes(p).a1.label).toBe('Idee');
  });
  it('deleteLabel resets nodes to Fără; Fără is protected', () => {
    const q = deleteLabel(make(), 'Idee');
    expect(nodes(q).a1.label).toBe(NONE);
    expect(q.labels.map((l) => l.name)).toEqual([NONE, 'Loc']);
    expect(deleteLabel(make(), NONE).labels[0].name).toBe(NONE);
    expect(renameLabel(make(), NONE, 'X').labels[0].name).toBe(NONE);
  });
  it('status rename/delete', () => {
    expect(nodes(renameStatus(make(), 'Final', 'Gata')).a1.status).toBe('Gata');
    const q = deleteStatus(make(), 'Final');
    expect(nodes(q).b.status).toBe(NONE);
    expect(q.statuses).toEqual([NONE, 'Ciornă']);
    expect(deleteStatus(make(), NONE).statuses[0]).toBe(NONE);
  });
  it('custom field rename/delete', () => {
    const q = renameCustomField(make(), 'POV', 'Narator');
    expect(nodes(q).a.custom).toEqual({ Narator: 'Ana', Gata: true });
    expect(nodes(q).a1.custom).toEqual({ Narator: 'Ion' });
    const r = deleteCustomField(make(), 'POV');
    expect(nodes(r).a1.custom).toEqual({});
    expect(r.customFields.map((f) => f.id)).toEqual(['f2']);
  });
  it('section type rename/delete clears levels', () => {
    expect(nodes(renameSectionType(make(), 'Scenă', 'Fragment')).a1.sectionType).toBe('Fragment');
    const q = deleteSectionType(make(), 'Capitol');
    expect('sectionType' in nodes(q).a).toBe(false);
    expect(q.sectionTypeLevels.folders).toBe(null);
    expect(q.sectionTypeLevels.files).toBe('s2');
  });
});

describe('applyProjectSettings', () => {
  it('no-op draft keeps project equivalent', () => {
    const p = make();
    const q = applyProjectSettings(p, makeDraft(p));
    expect(q.tree).toEqual(p.tree);
    expect(q.labels).toEqual(p.labels);
    expect(q.statuses).toEqual(p.statuses);
    expect(q.labelTitle).toBe('Etichetă');
    expect(q.statusTitle).toBe('Status');
  });
  it('applies renames, deletes, additions and reorder together', () => {
    const p = make();
    const d = makeDraft(p);
    d.labels[1].name = 'Gând';
    d.labels.splice(2, 1);
    d.labels.push({ name: 'Nou', color: '#112233', orig: null });
    d.statuses = moveItem(d.statuses, 2, -1, true);
    d.statuses.find((s) => s.name === 'Final').name = 'Terminat';
    d.customFields[0].title = 'Narator';
    d.customFields.splice(1, 1);
    d.customFields.push({ id: '', title: 'Loc', type: 'list', options: [{ title: 'Oraș' }], default: '', wraps: false, orig: null });
    d.sectionTypes[0].title = 'Parte';
    d.sectionTypes.splice(1, 1);
    d.sectionTypeLevels.containers = 's1';
    d.templateFolder = 'tpl';
    d.labelTitle = 'Culoare';
    const q = applyProjectSettings(p, d);
    const n = nodes(q);
    expect(q.labels.map((l) => l.name)).toEqual([NONE, 'Gând', 'Nou']);
    expect(n.a1.label).toBe('Gând');
    expect(n.b.label).toBe(NONE);
    expect(q.statuses).toEqual([NONE, 'Terminat', 'Ciornă']);
    expect(n.a1.status).toBe('Terminat');
    expect(n.a.custom).toEqual({ Narator: 'Ana' });
    expect(q.customFields[1].id).toBeTruthy();
    expect(q.customFields[1].options[0].id).toBeTruthy();
    expect(n.a.sectionType).toBe('Parte');
    expect('sectionType' in n.a1).toBe(false);
    expect(q.sectionTypeLevels).toEqual({ folders: 's1', containers: 's1', files: null });
    expect(q.templateFolder).toBe('tpl');
    expect(q.labelTitle).toBe('Culoare');
    expect(nodes(p).a1.label).toBe('Idee');
  });
  it('handles swapped names', () => {
    const p = make();
    const d = makeDraft(p);
    d.labels[1].name = 'Loc';
    d.labels[2].name = 'Idee';
    const n = nodes(applyProjectSettings(p, d));
    expect(n.a.label).toBe('Loc');
    expect(n.b.label).toBe('Idee');
  });
  it('protects Fără even if draft tries to rename or remove it', () => {
    const p = make();
    const d = makeDraft(p);
    d.labels[0].name = 'Altceva';
    d.statuses.shift();
    const q = applyProjectSettings(p, d);
    expect(q.labels[0].name).toBe(NONE);
    expect(q.statuses[0]).toBe(NONE);
  });
  it('makeDraft inserts Fără when missing', () => {
    const d = makeDraft({ labels: [{ name: 'X', color: '' }], statuses: ['Y'], tree: [] });
    expect(d.labels[0].name).toBe(NONE);
    expect(d.statuses[0].name).toBe(NONE);
  });
});

describe('validateDraft / moveItem', () => {
  it('detects duplicates and empty names', () => {
    const d = makeDraft(make());
    d.labels[2].name = 'Idee';
    d.statuses[1].name = ' ';
    expect(validateDraft(d).length).toBe(2);
    expect(validateDraft(makeDraft(make()))).toEqual([]);
  });
  it('moveItem pins first', () => {
    expect(moveItem([1, 2, 3], 1, -1, true)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 1, 1, true)).toEqual([1, 3, 2]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});
