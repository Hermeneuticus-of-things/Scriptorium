import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { insertNear, dropMany, findNode } from '../src/lib/tree.js';
import { replaceInFields } from '../src/lib/projectSearch.js';
const require = createRequire(import.meta.url);
const { linkedNotesInline, parseBlocks } = require('../lib/compile.cjs');
const { rtfToHtml } = require('../lib/rtf.cjs');

const tree = () => [
  { id: 'd', root: 'draft', title: 'D', children: [{ id: 'F', type: 'folder', title: 'F', children: [{ id: 'c', type: 'text', title: 'c' }] }, { id: 'X', type: 'folder', title: 'X', children: [] }] },
  { id: 'r', root: 'research', title: 'R', children: [] },
  { id: 't', root: 'trash', title: 'T', children: [{ id: 'old', type: 'text', title: 'old' }] },
];

describe('bug hunt 3', () => {
  it('new documents never land in the Trash', () => {
    const t = insertNear(tree(), 'old', { id: 'n', type: 'text', title: 'n' });
    expect(findNode([t[2]], 'n')).toBeNull();
    expect(t[0].children.some((n) => n.id === 'n')).toBe(true);
  });
  it('dragging a folder with its child keeps the child inside', () => {
    const t = dropMany(tree(), ['c', 'F'], 'X', 'inside');
    const X = findNode(t, 'X');
    expect(X.children.map((n) => n.id)).toEqual(['F']);
    expect(findNode(t, 'F').children.map((n) => n.id)).toEqual(['c']);
  });
  it('a drop on the Trash remembers where the item came from', () => {
    const t = dropMany(tree(), ['c'], 't', 'inside');
    expect(findNode(t, 'c').trashedFrom).toBeTruthy();
  });
  it('one linked footnote split by bold compiles once', () => {
    const h = linkedNotesInline('<p><span data-linked-footnote="N">an </span><strong><span data-linked-footnote="N">it</span></strong><span data-linked-footnote="N"> ch</span> rest</p>');
    expect(h.match(/data-footnote=/g)).toHaveLength(1);
    expect(h).toContain('an <strong>it</strong> ch<span data-footnote="N"');
  });
  it('one comment split by bold exports once', () => {
    const b = parseBlocks('<p><span data-comment="c">x </span><strong><span data-comment="c">bold</span></strong><span data-comment="c"> y</span></p>', [], { comments: true });
    const runs = b.flatMap((x) => x.runs || []);
    expect(runs.filter((r) => r.commentStart)).toHaveLength(1);
    expect(runs.filter((r) => r.commentEnd)).toHaveLength(1);
  });
  it('$ in title replacements follows the text rules', () => {
    const r = replaceInFields({ title: 'Cap X' }, '', '', /X/g, 'A$2B$$C$&', ['title']);
    expect(r.node.title).toBe('Cap A$2B$CX');
  });
  it('Word footnotes import as footnotes, \\bin bytes are skipped', () => {
    expect(rtfToHtml('{\\rtf1 Text{\\super\\chftn}{\\footnote\\pard\\plain{\\super\\chftn} Nota aici.}\\par}')).toMatch(/data-footnote="Nota aici\./);
    expect(rtfToHtml('{\\rtf1 {\\*\\objdata \\bin3 }}}x}after\\par}')).not.toContain('x');
  });
});

import { buildRegex, findInHtml, replaceInHtml } from '../src/lib/search.js';
describe('search across formatting', () => {
  it('whole word sees the letters around bold', () => {
    const re = buildRegex({ query: 'fix', wholeWord: true });
    expect(replaceInHtml('<p>pre<strong>fix</strong> fix</p>', re, 'Z').html).toBe('<p>pre<strong>fix</strong> Z</p>');
    expect(findInHtml('<p>pre<strong>fix</strong></p>', re)).toHaveLength(0);
  });
  it('^ is the start of the paragraph, not of the italic word', () => {
    const re = buildRegex({ query: '^Cap', regex: true });
    expect(replaceInHtml('<p>Cap <em>Cap</em></p><p><em>Cap</em></p>', re, 'X').html).toBe('<p>X <em>Cap</em></p><p><em>X</em></p>');
  });
});

describe('data round trips (v0.9.4)', () => {
  it('.scriv keeps tabs and repeated spaces, and every <hr> is a page break', () => {
    const { htmlToScrivRtf } = require('../lib/scrivRtf.cjs');
    const r = htmlToScrivRtf('<p>tab\taici   trei</p><hr><p>x</p>');
    const rtf = typeof r === 'string' ? r : r.rtf;
    const back = rtfToHtml(rtf);
    expect(back).toContain('tab\taici   trei');
    expect(back).toContain('<hr data-page-break="true" class="page-break">');
  });
  it('the bundle carries the writing history', () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const store = require('../lib/store.cjs');
    const bundle = require('../lib/bundle.cjs');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bh3-'));
    const dir = store.projectDirFor(tmp, 'Istoric');
    store.createProject(dir, 'Istoric');
    fs.writeFileSync(path.join(dir, 'history.json'), JSON.stringify({ '2026-10-24': { draftStart: 1 } }));
    const b = bundle.exportBundle(dir);
    const out = bundle.importBundle(JSON.parse(JSON.stringify(b)), path.join(tmp, 'copie'));
    expect(JSON.parse(fs.readFileSync(path.join(out.dir, 'history.json'), 'utf8'))['2026-10-24'].draftStart).toBe(1);
  });
});
