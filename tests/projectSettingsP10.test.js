// P10: Project Settings and Inspector in depth (defaults for new documents, number fields,
// section types per level, publishing details, icons, template placeholders, export/import).
import { describe, it, expect } from 'vitest';
import {
  NONE, makeDraft, applyProjectSettings, newNodeDefaults, sectionTypeIdFor, resolveTemplatePlaceholders, nodeFromTemplate,
  defaultTemplateFor, synopsisFromText, compareCustomValues, parseNumberField, exportMetaSettings, importMetaSettings,
  customIconOf, deleteCustomIcon, cleanDefaultFormatting, formatDraft, moveTo, renameLabel, deleteStatus,
} from '../src/lib/projectSettings.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');

const base = () => ({
  title: 'Carte',
  labels: [{ name: NONE, color: '' }, { name: 'Idee', color: '#e8b04a' }, { name: 'Loc', color: '#70ad47' }],
  statuses: [NONE, 'De făcut', 'Final'],
  customFields: [{ id: 'f1', title: 'Capitol', type: 'number', options: [], default: 3 }, { id: 'f2', title: 'Gata', type: 'checkbox', default: true }],
  sectionTypes: [{ id: 'st1', title: 'Capitol' }, { id: 'st2', title: 'Scenă' }],
  sectionTypeLevels: { folders: 'st1', containers: null, files: 'st2' },
  tree: [
    { id: 'draft', root: 'draft', type: 'folder', children: [
      { id: 'a', type: 'folder', label: 'Idee', icon: 'icon:ic1', children: [{ id: 'b', type: 'text', label: NONE }] },
    ] },
    { id: 'tpl', type: 'folder', title: 'Șabloane', children: [{ id: 't1', type: 'text', title: 'Scena <$n>', synopsis: 'Scrisă la <$date>', label: 'Loc', status: 'De făcut', keywords: ['k'], custom: { Capitol: 2 } }] },
  ],
  templateFolder: 'tpl',
  customIcons: [{ id: 'ic1', name: 'Stea', file: 'x.png' }],
});

describe('defaults for new documents', () => {
  it('default label/status survive the dialog and follow renames', () => {
    const p = base();
    const d = makeDraft(p);
    d.defaultLabel = 'Idee';
    d.defaultStatus = 'De făcut';
    d.labels[1].name = 'Idei'; // renamed in the same session
    const out = applyProjectSettings(p, d);
    expect(out.defaultLabel).toBe('Idei');
    expect(out.defaultStatus).toBe('De făcut');
    expect(renameLabel(out, 'Idei', 'Gânduri').defaultLabel).toBe('Gânduri');
    expect(deleteStatus(out, 'De făcut').defaultStatus).toBe(NONE);
  });
  it('newNodeDefaults gives label, status and custom defaults; store.newNode applies them', () => {
    const p = { ...base(), defaultLabel: 'Loc', defaultStatus: 'Final' };
    expect(newNodeDefaults(p)).toEqual({ label: 'Loc', status: 'Final', custom: { Capitol: 3, Gata: true } });
    const n = store.newNode('text', 'X', p);
    expect(n.label).toBe('Loc');
    expect(n.status).toBe('Final');
    expect(n.custom.Capitol).toBe(3);
    expect(store.newNode('text', 'Y').label).toBe(NONE);
    expect(newNodeDefaults({ ...p, defaultLabel: 'Nu există' }).label).toBeUndefined();
  });
});

describe('custom metadata: number type, alignment', () => {
  it('keeps align and converts number defaults', () => {
    const p = base();
    const d = makeDraft(p);
    expect(d.customFields[0].align).toBe('right');
    d.customFields[0].default = '7,5';
    d.customFields[1].align = 'center';
    const out = applyProjectSettings(p, d);
    expect(out.customFields[0]).toMatchObject({ type: 'number', default: 7.5, align: 'right' });
    expect(out.customFields[1].align).toBe('center');
  });
  it('sorts numbers numerically and parses typed numbers', () => {
    const f = { type: 'number' };
    expect([10, 2, '', 1].sort((a, b) => compareCustomValues(f, a, b))).toEqual([1, 2, 10, '']);
    expect(parseNumberField(' 12 ')).toBe(12);
    expect(parseNumberField('abc')).toBe('');
  });
});

describe('section types per level and kind', () => {
  it('saves per-depth rules and falls back to the general rule', () => {
    const p = base();
    const d = makeDraft(p);
    d.sectionTypeDepths[0].folders = 'st2';
    d.sectionTypeDepths[1].containers = 'st1';
    const out = applyProjectSettings(p, d);
    expect(out.sectionTypeDepths).toHaveLength(2);
    expect(sectionTypeIdFor(out, { type: 'folder' }, 1)).toBe('st2');
    expect(sectionTypeIdFor(out, { type: 'folder' }, 3)).toBe('st1');
    expect(sectionTypeIdFor(out, { type: 'text', children: [{}] }, 2)).toBe('st1');
    expect(sectionTypeIdFor(out, { type: 'text' }, 2)).toBe('st2');
  });
  it('a deleted section type is cleared from the per-depth rules', () => {
    const p = { ...base(), sectionTypeDepths: [{ folders: 'st2', containers: null, files: null }] };
    const d = makeDraft(p);
    d.sectionTypes = d.sectionTypes.filter((t) => t.id !== 'st2');
    const out = applyProjectSettings(p, d);
    expect(out.sectionTypeDepths).toEqual([]);
  });
});

describe('project properties and icons', () => {
  it('stores language and publishing details', () => {
    const p = base();
    const d = makeDraft(p);
    Object.assign(d, { language: ' en ', publisher: 'Polirom', isbn: '978-973-0-00000-0', address: 'Iași', rights: '© 2026' });
    const out = applyProjectSettings(p, d);
    expect(out).toMatchObject({ language: 'en', publisher: 'Polirom', isbn: '978-973-0-00000-0', address: 'Iași', rights: '© 2026' });
  });
  it('custom icons: lookup, and deleting one resets the documents that use it', () => {
    const p = base();
    expect(customIconOf(p, 'icon:ic1').name).toBe('Stea');
    expect(customIconOf(p, '⭐')).toBeNull();
    expect(deleteCustomIcon(p, 'ic1').tree[0].children[0].icon).toBeNull();
    const d = makeDraft(p);
    d.customIcons = [];
    const out = applyProjectSettings(p, d);
    expect(out.customIcons).toEqual([]);
    expect(out.tree[0].children[0].icon).toBeNull();
  });
});

describe('template sheets', () => {
  it('resolves placeholders in text and escaped HTML', () => {
    const now = new Date(2026, 9, 25, 9, 5);
    expect(resolveTemplatePlaceholders('Scena <$n> · <$date> <$time> <$year>', { n: 3, now })).toBe('Scena 3 · 2026-10-25 09:05 2026');
    expect(resolveTemplatePlaceholders('<p>&lt;$author&gt;</p>', { author: 'Ana' })).toBe('<p>Ana</p>');
    expect(resolveTemplatePlaceholders('fără', {})).toBe('fără');
  });
  it('copies label, status, keywords, metadata and numbers the title', () => {
    const p = base();
    const tpl = p.tree[1].children[0];
    const { fields } = nodeFromTemplate(tpl, { siblings: [{ fromTemplate: 't1' }], now: new Date(2026, 0, 2) });
    expect(fields).toMatchObject({ title: 'Scena 2', synopsis: 'Scrisă la 2026-01-02', label: 'Loc', status: 'De făcut', keywords: ['k'], custom: { Capitol: 2 }, fromTemplate: 't1' });
    fields.keywords.push('x');
    expect(tpl.keywords).toEqual(['k']);
  });
  it('a folder can name the default template of its new documents', () => {
    const p = base();
    expect(defaultTemplateFor(p, { defaultTemplate: 't1' }).id).toBe('t1');
    expect(defaultTemplateFor(p, { defaultTemplate: 'gone' })).toBeNull();
    expect(defaultTemplateFor({ ...p, templateFolder: null }, { defaultTemplate: 't1' })).toBeNull();
  });
});

describe('synopsis from text', () => {
  it('takes the opening sentences without tags', () => {
    expect(synopsisFromText('<h1>Unu</h1><p>Ana are <b>mere</b>.</p>')).toBe('Unu Ana are mere.');
    const long = `<p>${'Prima frază e aici. '.repeat(30)}</p>`;
    const s = synopsisFromText(long, 60);
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith('.')).toBe(true);
    expect(synopsisFromText(`<p>${'x'.repeat(50)} ${'y'.repeat(50)}</p>`, 60)).toMatch(/…$/);
    expect(synopsisFromText('')).toBe('');
  });
});

describe('export / import of labels, statuses and metadata', () => {
  it('round-trips into another project draft', () => {
    const src = { ...base(), labelTitle: 'Punct de vedere', defaultLabel: 'Loc' };
    const data = JSON.parse(JSON.stringify(exportMetaSettings(src)));
    expect(data.customFields[0].id).toBeUndefined();
    const other = { title: 'Alt', labels: [{ name: NONE }, { name: 'Loc', color: '#000000' }], statuses: [NONE], customFields: [], sectionTypes: [], tree: [] };
    const d = importMetaSettings(makeDraft(other), data);
    expect(d.labelTitle).toBe('Punct de vedere');
    expect(d.labels.map((l) => l.name)).toEqual([NONE, 'Loc', 'Idee']);
    expect(d.labels[1].color).toBe('#70ad47');
    expect(d.statuses.map((s) => s.name)).toEqual([NONE, 'De făcut', 'Final']);
    const out = applyProjectSettings(other, d);
    expect(out.customFields.map((f) => f.title)).toEqual(['Capitol', 'Gata']);
    expect(out.sectionTypes.map((t) => t.title)).toEqual(['Capitol', 'Scenă']);
    expect(out.defaultLabel).toBe('Loc');
    expect(() => importMetaSettings(makeDraft(other), { kind: 'other' })).toThrow('not-meta');
  });
});

describe('default formatting', () => {
  it('"use the global setting" clears the project override; numbers are cleaned', () => {
    const f = formatDraft({ font: 'Georgia, serif', spacing: 0.5 });
    expect(f.spaceAfter).toBe(0.5);
    expect(cleanDefaultFormatting(f, true)).toBeNull();
    const out = cleanDefaultFormatting({ ...f, indentLeft: '1.5', align: 'justify', notesFont: 'Arial, sans-serif', size: 'abc' });
    expect(out).toMatchObject({ font: 'Georgia, serif', indentLeft: 1.5, align: 'justify', notesFont: 'Arial, sans-serif', spaceAfter: 0.5, spacing: 0.5 });
    expect(out.size).toBeUndefined();
    expect(cleanDefaultFormatting(formatDraft(null))).toBeNull();
  });
});

describe('bookmark reordering', () => {
  it('moveTo moves an item to a new index', () => {
    expect(moveTo(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveTo(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveTo(['a'], 0, 5)).toEqual(['a']);
  });
});
