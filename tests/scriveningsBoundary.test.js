// @vitest-environment jsdom
// Q4 Scrivenings as one continuous text: one ProseMirror document of sections, mapped back
// to the documents on save; edits across sections never merge or drop documents.
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { AllSelection, TextSelection } from '@tiptap/pm/state';
import { buildExtensions } from '../src/editor/extensions.js';
import { buildScriveningsDoc, crossesSections, deleteAcrossSections, replaceSectionContent, sectionAt, sectionRanges, splitScriveningsDoc, structureIntact, unwrapSections } from '../src/editor/scriveningsBoundary.js';
import { findRanges } from '../src/editor/docSearch.js';

let ed;
afterEach(() => ed?.destroy());

const SECTIONS = [
  { id: 'a', title: 'Unu', html: '<p>Primul <strong>text</strong> aici.</p><p>A doua frază<span data-footnote="nota" class="footnote"></span>.</p>' },
  { id: 'b', title: 'Doi', html: '<p>Al doilea <span data-comment="obs" class="comment">document</span>.</p>' },
  { id: 'c', title: 'Trei', html: '<p>Al treilea, cu <mark>evidențiere</mark>.</p><p></p>' },
];

function make(sections = SECTIONS) {
  const ext = buildExtensions({ scrivenings: {} });
  ed = new Editor({ extensions: ext, content: '' });
  const doc = buildScriveningsDoc(ed.schema, sections);
  ed.view.dispatch(ed.state.tr.replaceWith(0, ed.state.doc.content.size, doc.content).setMeta('scrivAllow', true));
  return ed;
}
const single = (html) => {
  const e = new Editor({ extensions: buildExtensions(), content: html });
  const out = e.getHTML();
  e.destroy();
  return out;
};
const pos = (e, text) => {
  let at = -1;
  e.state.doc.descendants((n, p) => {
    if (at < 0 && n.isText && n.text.includes(text)) at = p + n.text.indexOf(text);
  });
  return at;
};

describe('split/merge round-trip', () => {
  it('each section saves exactly what a single-document editor saves', () => {
    const e = make();
    const out = splitScriveningsDoc(e.state.doc, e.schema);
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    for (const s of out) expect(s.html).toBe(single(SECTIONS.find((x) => x.id === s.id).html));
    // comments, footnotes and highlights survive
    expect(out[0].html).toContain('data-footnote="nota"');
    expect(out[1].html).toContain('data-comment="obs"');
    expect(out[2].html).toContain('<mark');
  });
  it('rebuilding from the split output is stable', () => {
    const e = make();
    const once = splitScriveningsDoc(e.state.doc, e.schema);
    const again = splitScriveningsDoc(buildScriveningsDoc(e.schema, once.map((s, i) => ({ ...s, title: SECTIONS[i].title }))), e.schema);
    expect(again).toEqual(once);
  });
  it('empty documents get an empty section', () => {
    const e = make([{ id: 'x', html: '' }, { id: 'y', html: '<p>y</p>' }]);
    expect(splitScriveningsDoc(e.state.doc, e.schema)).toEqual([{ id: 'x', html: '<p></p>' }, { id: 'y', html: '<p>y</p>' }]);
  });
});

describe('boundaries', () => {
  it('sectionAt / crossesSections', () => {
    const e = make();
    const p1 = pos(e, 'Primul');
    const p2 = pos(e, 'Al doilea');
    expect(sectionAt(e.state.doc, p1).id).toBe('a');
    expect(sectionAt(e.state.doc, p2).id).toBe('b');
    expect(crossesSections(e.state.doc, p1, p1 + 3)).toBe(false);
    expect(crossesSections(e.state.doc, p1, p2)).toBe(true);
  });
  it('deleting across sections keeps every section and only edits inside each', () => {
    const e = make();
    const tr = e.state.tr;
    const at = deleteAcrossSections(tr, pos(e, 'aici'), pos(e, 'treilea'));
    expect(structureIntact(e.state.doc, tr.doc)).toBe(true);
    e.view.dispatch(tr);
    const out = splitScriveningsDoc(e.state.doc, e.schema);
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(out[0].html).toBe('<p>Primul <strong>text</strong> </p>');
    expect(out[1].html).toBe('<p></p>');
    expect(out[2].html).toContain('<p>treilea, cu');
    expect(sectionAt(e.state.doc, at).id).toBe('a');
  });
  it('select all + delete leaves one empty paragraph per document', () => {
    const e = make();
    const tr = e.state.tr;
    deleteAcrossSections(tr, 0, e.state.doc.content.size);
    e.view.dispatch(tr);
    expect(splitScriveningsDoc(e.state.doc, e.schema).map((s) => s.html)).toEqual(['<p></p>', '<p></p>', '<p></p>']);
  });
  it('a plain deleteSelection across sections (would merge) is refused', () => {
    const e = make();
    const before = e.state.doc;
    e.view.dispatch(e.state.tr.setSelection(TextSelection.create(e.state.doc, pos(e, 'aici'), pos(e, 'doilea'))));
    e.view.dispatch(e.state.tr.deleteSelection());
    expect(e.state.doc.eq(before)).toBe(true);
    expect(sectionRanges(e.state.doc)).toHaveLength(3);
  });
  it('Backspace at the start of a section does not join it with the previous one', () => {
    const e = make();
    e.commands.setTextSelection(pos(e, 'Al doilea'));
    e.commands.joinBackward();
    e.commands.deleteSelection();
    expect(sectionRanges(e.state.doc).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
  it('read-only sections refuse edits but take external updates', () => {
    const e = make(SECTIONS.map((s) => ({ ...s, readOnly: s.id === 'b' })));
    const before = e.state.doc;
    e.view.dispatch(e.state.tr.insertText('X', pos(e, 'document')));
    expect(e.state.doc.eq(before)).toBe(true);
    // a cross-section delete skips the locked section
    const tr = e.state.tr;
    deleteAcrossSections(tr, pos(e, 'aici'), pos(e, 'treilea'));
    e.view.dispatch(tr);
    expect(splitScriveningsDoc(e.state.doc, e.schema)[1].html).toContain('Al doilea');
    const tr2 = e.state.tr;
    expect(replaceSectionContent(tr2, 'b', '<p>Nou</p>')).toBe(true);
    e.view.dispatch(tr2);
    expect(splitScriveningsDoc(e.state.doc, e.schema)[1].html).toBe('<p>Nou</p>');
  });
  it('select all covers every section', () => {
    const e = make();
    e.view.dispatch(e.state.tr.setSelection(new AllSelection(e.state.doc)));
    const text = e.state.doc.textBetween(e.state.selection.from, e.state.selection.to, '\n');
    expect(text).toContain('Primul');
    expect(text).toContain('treilea');
  });
});

describe('find/replace and copy across sections', () => {
  it('finds matches in every section and replace all keeps the sections', () => {
    const e = make();
    const ranges = findRanges(e.state.doc, /Al /g);
    expect(ranges.map((r) => sectionAt(e.state.doc, r.from).id)).toEqual(['b', 'c']);
    const tr = e.state.tr;
    for (const r of [...ranges].reverse()) tr.insertText('Un ', r.from, r.to);
    e.view.dispatch(tr);
    const out = splitScriveningsDoc(e.state.doc, e.schema);
    expect(out[1].html).toContain('Un doilea');
    expect(out[2].html).toContain('Un treilea');
  });
  it('a copied cross-section slice pastes as plain blocks', () => {
    const e = make();
    const slice = e.state.doc.slice(pos(e, 'aici'), pos(e, 'treilea'));
    const flat = unwrapSections(slice);
    flat.content.forEach((n) => expect(n.type.name).not.toBe('scrivSection'));
    expect(flat.content.childCount).toBeGreaterThan(2);
  });
});
