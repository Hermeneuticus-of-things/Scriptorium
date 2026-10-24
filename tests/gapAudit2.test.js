// @vitest-environment jsdom
// Second gap-audit round (docs/GAP-AUDIT.md): back-links, [[New title]], footnote number
// formats, corkboard card look, Preserve Formatting blocks.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { resolveWikiLink } from '../src/editor/writing.js';
import { addBacklinks, addedLinks, docLinks, incomingLinks, insertLinkedDoc } from '../src/lib/backlinks.js';
import { corkClass } from '../src/components/Corkboard.jsx';
import { DEFAULT_SETTINGS } from '../src/lib/settingsDefaults.js';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');

let ed;
afterEach(() => ed?.destroy());
const typeText = (editor, text) => {
  for (const ch of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp('handleTextInput', (f) => f(editor.view, from, to, ch));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(ch, from, to));
  }
};

const tree = () => [
  { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
    { id: 'c1', type: 'folder', title: 'Cap', children: [{ id: 'a', type: 'text', title: 'Ana' }, { id: 'b', type: 'text', title: 'Barbu' }] },
  ] },
  { id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [{ id: 'r', type: 'text', title: 'Fișă' }] },
];
const find = (t, id) => { let f = null; const w = (ns) => ns.forEach((n) => { if (n.id === id) f = n; if (n.children) w(n.children); }); w(t); return f; };

describe('automatic back-links', () => {
  const link = (id) => `<a href="scribner://doc/${id}" class="internal-link">x</a>`;
  it('finds document links in HTML', () => {
    expect(docLinks(`<p>${link('a')} ${link('b')} ${link('a')}</p>`)).toEqual(['a', 'b']);
    expect(docLinks('<p><a href="https://x.ro">x</a></p>')).toEqual([]);
  });
  it('reports only newly added links', () => {
    expect(addedLinks(`<p>${link('a')}</p>`, `<p>${link('a')}${link('b')}</p>`)).toEqual(['b']);
    expect(addedLinks(`<p>${link('a')}</p>`, '<p>fără</p>')).toEqual([]);
  });
  it('adds the source to the target bookmarks once, never to itself or missing docs', () => {
    const t1 = addBacklinks(tree(), 'a', ['b', 'a', 'zzz']);
    expect(find(t1, 'b').bookmarks).toEqual([{ id: 'a' }]);
    expect(find(t1, 'a').bookmarks).toBeUndefined();
    const t2 = addBacklinks(t1, 'a', ['b']);
    expect(t2).toBe(t1);
  });
  it('lists the documents linking to a document', () => {
    expect(incomingLinks({ a: `<p>${link('b')}</p>`, r: `<p>${link('b')}</p>`, b: `<p>${link('b')}</p>` }, 'b')).toEqual(['a', 'r']);
  });
  it('is off by default', () => {
    expect(DEFAULT_SETTINGS.autoBacklinks).toBe(false);
  });
});

describe('[[New title]] creates a document', () => {
  it('places the new document after the current one, or in the chosen folder', () => {
    const n = { id: 'n', type: 'text', title: 'Nou' };
    expect(find(insertLinkedDoc(tree(), 'a', '', n), 'c1').children.map((x) => x.id)).toEqual(['a', 'n', 'b']);
    expect(find(insertLinkedDoc(tree(), 'a', 'research', n), 'research').children.map((x) => x.id)).toEqual(['r', 'n']);
    expect(insertLinkedDoc(tree(), 'zz', '', n)[0].children.map((x) => x.id)).toEqual(['c1', 'n']);
  });
  it('offers creation when no title matches, then links the typed text', async () => {
    const onMissing = vi.fn();
    ed = new Editor({ extensions: buildExtensions({ getLinkTargets: () => [{ id: 'a', title: 'Ana' }], onMissingLink: onMissing }), content: '<p>Vezi</p>' });
    ed.commands.setTextSelection(ed.state.doc.content.size - 1);
    typeText(ed, ' [[Titlu nou]]');
    await new Promise((r) => setTimeout(r, 5));
    expect(onMissing).toHaveBeenCalledWith('Titlu nou', 6);
    expect(ed.getText()).toBe('Vezi [[Titlu nou]]');
    expect(resolveWikiLink(ed, 6, 'Titlu nou', 'n1')).toBe(true);
    expect(ed.getHTML()).toMatch(/<a [^>]*href="scribner:\/\/doc\/n1"[^>]*>Titlu nou<\/a>/);
    expect(ed.getText()).toBe('Vezi Titlu nou');
  });
  it('leaves the text alone when it changed meanwhile (undo, Esc)', () => {
    ed = new Editor({ extensions: buildExtensions(), content: '<p>Vezi [[Altceva]]</p>' });
    expect(resolveWikiLink(ed, 5, 'Titlu nou', 'n1')).toBe(false);
    expect(ed.getText()).toBe('Vezi [[Altceva]]');
  });
});

describe('Preserve Formatting block (editor)', () => {
  it('round-trips and toggles', () => {
    ed = new Editor({ extensions: buildExtensions(), content: '<div data-preserve-format="true"><p>  "verbatim" -- text</p></div><p>normal</p>' });
    expect(ed.getHTML()).toContain('<div data-preserve-format="true" class="preserve-format"><p>');
    ed.commands.setTextSelection(ed.state.doc.content.size - 2);
    ed.commands.togglePreserveFormat();
    expect((ed.getHTML().match(/data-preserve-format/g) || []).length).toBe(2);
    ed.commands.togglePreserveFormat();
    expect((ed.getHTML().match(/data-preserve-format/g) || []).length).toBe(1);
  });
});

describe('corkboard card look', () => {
  it('maps options to board classes', () => {
    expect(corkClass({})).toBe('corkboard cards-rounded');
    expect(corkClass({ shape: 'square', ruled: true, labelFill: true })).toBe('corkboard cards-square cards-ruled cards-label-fill');
  });
});

// --- Compile ----------------------------------------------------------------------------
const project = () => ({
  title: 'Carte',
  author: 'A',
  tree: [
    { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
      { id: 'c1', type: 'folder', title: 'Unu', includeInCompile: true, children: [{ id: 's1', type: 'text', title: 'S1', includeInCompile: true }] },
      { id: 'c2', type: 'folder', title: 'Doi', includeInCompile: true, children: [{ id: 's2', type: 'text', title: 'S2', includeInCompile: true }] },
    ] },
    { id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [] },
  ],
});
const fn = (t) => `<span data-footnote="${t}" class="footnote"></span>`;
const DOCS = { c1: '', c2: '', s1: `<p>A${fn('n1')} B${fn('n2')}</p>`, s2: `<p>C${fn('n3')}</p>` };
const read = (id) => DOCS[id] || '';
const fmt = (transforms = {}, id = 'manuscris') => {
  const f = JSON.parse(JSON.stringify(F.PRESETS.find((p) => p.id === id)));
  f.transforms = { ...f.transforms, ...transforms };
  return f;
};
const refs = (html) => [...html.matchAll(/<sup><a [^>]*id="(?:fn|en)ref\d+"[^>]*>([^<]*)<\/a><\/sup>/g)].map((m) => m[1]);

describe('footnote number formats', () => {
  it('labels numbers in every format', () => {
    expect(compile.NOTE_FORMATS).toEqual(['arabic', 'roman', 'alpha', 'symbols']);
    expect([1, 4, 9, 14].map((n) => compile.noteLabel(n, 'roman'))).toEqual(['i', 'iv', 'ix', 'xiv']);
    expect([1, 2, 26, 27].map((n) => compile.noteLabel(n, 'alpha'))).toEqual(['a', 'b', 'z', 'aa']);
    expect([1, 2, 3, 4, 7].map((n) => compile.noteLabel(n, 'symbols'))).toEqual(['*', '†', '‡', '§', '**']);
    expect(compile.noteLabel(3)).toBe('3');
  });
  for (const [format, want] of [['arabic', ['1', '2', '3']], ['roman', ['i', 'ii', 'iii']], ['alpha', ['a', 'b', 'c']], ['symbols', ['*', '†', '‡']]]) {
    it(`HTML/PDF footnotes: ${format}`, () => {
      const html = compile.compileHtml(project(), read, { format: fmt({ noteNumbering: format }) });
      expect(refs(html)).toEqual(want);
      if (format !== 'arabic') expect(html).toContain(`<span class="note-label">${want[2]}</span>`);
    });
  }
  it('restarts the count in every chapter', () => {
    const html = compile.compileHtml(project(), read, { format: fmt({ noteNumbering: 'alpha', noteRestart: true }) });
    expect(refs(html)).toEqual(['a', 'b', 'a']);
    // ids stay unique
    expect(new Set([...html.matchAll(/id="fnref(\d+)"/g)].map((m) => m[1])).size).toBe(3);
  });
  it('endnotes use the format too', () => {
    const html = compile.compileHtml(project(), read, { format: fmt({ notes: 'endnotes-book', noteNumbering: 'roman' }) });
    expect(refs(html)).toEqual(['i', 'ii', 'iii']);
    expect(html).toContain('<span class="note-label">iii</span>');
  });
  it('EPUB footnotes use the format', async () => {
    const buf = await compile.compileEpub(project(), read, { format: fmt({ noteNumbering: 'symbols' }, 'ebook') });
    const zip = await JSZip.loadAsync(buf);
    const files = Object.keys(zip.files).filter((f) => /OEBPS\/.*\.xhtml$/.test(f));
    const all = (await Promise.all(files.map((f) => zip.file(f).async('string')))).join('');
    expect(all).toContain('>†</a></sup>');
  });
  for (const [format, numFmt] of [['roman', 'lowerRoman'], ['alpha', 'lowerLetter'], ['symbols', 'chicago']]) {
    it(`DOCX w:numFmt for ${format}`, async () => {
      const buf = await compile.compileDocx(project(), read, { format: fmt({ noteNumbering: format }) });
      const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
      expect(xml).toMatch(new RegExp(`<w:footnotePr><w:numFmt w:val="${numFmt}"`));
    });
  }
  it('DOCX arabic without restart keeps the plain section', async () => {
    const buf = await compile.compileDocx(project(), read, { format: fmt() });
    const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
    expect(xml).not.toContain('w:footnotePr');
  });
  it('DOCX restart per chapter: one section per chapter with w:numRestart eachSect', async () => {
    // title page section + one per chapter
    const buf = await compile.compileDocx(project(), read, { format: fmt({ noteRestart: true }) });
    const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
    expect((xml.match(/<w:sectPr/g) || []).length).toBe(3);
    expect((xml.match(/<w:numRestart w:val="eachSect"\/>/g) || []).length).toBe(3);
    expect(xml).not.toContain('w:pageBreakBefore');
  });
  it('ODT note citations carry the label', async () => {
    const buf = await compile.compileOdt(project(), read, { format: fmt({ noteNumbering: 'alpha' }) });
    const xml = await (await JSZip.loadAsync(buf)).file('content.xml').async('string');
    expect(xml).toContain('<text:note-citation text:label="b">b</text:note-citation>');
  });
  it('RTF sets the document footnote format', async () => {
    const rtf = String(await compile.compileRtf(project(), read, { format: fmt({ noteNumbering: 'roman' }) }));
    expect(rtf).toContain('\\ftnnrlc');
  });
});

describe('Preserve Formatting in Compile', () => {
  const pf = '<div data-preserve-format="true" class="preserve-format"><p><span style="font-family: Courier New; font-size: 10pt">"Așa" -- scris</span></p></div><p>"Normal" -- text</p>';
  const p = () => ({ ...project(), tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'M', children: [{ id: 'x', type: 'text', title: 'X', includeInCompile: true }] }] });
  const f = () => fmt({ smartQuotes: true, dashes: true });
  it('HTML keeps the block text verbatim and outside the compile indent', () => {
    const html = compile.compileHtml(p(), () => pf, { format: f() });
    expect(html).toContain('<span style="font-family: Courier New; font-size: 10pt">"Așa" -- scris</span>');
    expect(html).toContain('data-preserve-format');
    expect(html).toContain('div[data-preserve-format] p{text-indent:0');
    expect(html).toContain('„Normal” — text'); // the normal paragraph is still transformed
  });
  it('marks parsed blocks and keeps their font', () => {
    const blocks = compile.parseBlocks(pf);
    expect(blocks[0].preserve).toBe(true);
    expect(blocks[0].runs[0]).toMatchObject({ font: 'Courier New', sizePt: 10 });
    expect(blocks[1].preserve).toBeUndefined();
    expect(blocks[1].runs[0].font).toBeUndefined();
  });
  it('DOCX: no first-line indent, own font and size', async () => {
    const buf = await compile.compileDocx(p(), () => pf, { format: f() });
    const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
    const para = xml.split('<w:p>').find((x) => x.includes('scris'));
    expect(para).toBeTruthy();
    expect(para).not.toContain('w:firstLine');
    expect(para).toContain('w:ascii="Courier New"');
    expect(para).toContain('<w:sz w:val="20"/>');
    expect(para).toMatch(/(&quot;|")Așa(&quot;|") -- scris/);
  });
});
