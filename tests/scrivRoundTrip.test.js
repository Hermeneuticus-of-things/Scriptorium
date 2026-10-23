// Full .scriv round trip: rich Scribner project -> exportScriv -> importScriv, field by field.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const { exportScriv } = require('../lib/scrivExport.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const { htmlToScrivRtf } = require('../lib/scrivRtf.cjs');
const { rtfToHtml } = require('../lib/rtf.cjs');

let tmp;
beforeAll(() => (tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scriv-rt-'))));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const GIF = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const PDF = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

function node(type, title, extra = {}) {
  return Object.assign(store.newNode(type, title), extra);
}

function build() {
  const dir = path.join(tmp, 'Bogat.scribner');
  const project = store.createProject(dir, 'Roman bogat');
  Object.assign(project, {
    author: 'Ana Popescu',
    authorFirst: 'Ana',
    authorLast: 'Popescu',
    titleAbbreviation: 'RB',
    labels: [{ name: 'Fără', color: '' }, { name: 'Erou', color: '#ff0000' }, { name: 'Flashback', color: '#00ff00' }],
    statuses: ['Fără', 'Schiță', 'Gata'],
    keywordDefs: [
      { name: 'noapte', color: '#000080', parent: null },
      { name: 'lună', color: '#808080', parent: 'noapte' },
      { name: 'zi', color: '', parent: null },
    ],
    customFields: [
      { id: 'pov', title: 'POV', type: 'text', options: [], default: '', wraps: true },
      { id: 'gata', title: 'Verificat', type: 'checkbox', options: [] },
      { id: '', title: 'Ton', type: 'list', options: [{ id: '', title: 'Sumbru' }, { id: 'v', title: 'Vesel' }] },
      { id: 'cand', title: 'Data acțiunii', type: 'date', options: [] },
    ],
    sectionTypes: [{ id: 'chapter', title: 'Capitol' }, { id: 'scene', title: 'Scenă' }],
    targets: { draft: 90000, session: 1500, deadline: '2026-12-31', draftType: 'Words', sessionType: 'Words' },
    styles: [
      { id: 'motto', name: 'Motto', type: 'para', italic: true, align: 'right' },
      { id: 'termen', name: 'Termen', type: 'char', italic: true },
    ],
    projectNotes: [{ id: 'project-notes', title: 'Idei' }, { id: 'pn-2', title: 'Lume' }, { id: 'pn-3', title: 'Cronologie' }],
  });

  const scene1 = node('text', 'Scena unu', {
    synopsis: 'Începutul nopții',
    label: 'Erou',
    status: 'Schiță',
    keywords: ['noapte', 'lună'],
    custom: { POV: 'Ana', Verificat: true, Ton: 'Vesel', 'Data acțiunii': '2024-03-01' },
    sectionType: 'Scenă',
    target: 2000,
    targetType: 'Words',
    icon: '🔥',
    locked: true,
    favorite: true,
    created: '2024-01-02T10:00:00.000Z',
    modified: '2024-02-03T11:00:00.000Z',
  });
  const scene2 = node('text', 'Scena doi', { includeInCompile: false, status: 'Gata', keywords: ['zi'], custom: { Verificat: false } });
  const deleted = 'deadbeef-0000-4000-8000-000000000000';
  const withKids = node('text', 'Text cu copii', { children: [], sectionType: 'chapter' });
  const childOfText = node('text', 'Copil de text');
  withKids.children.push(childOfText);
  const ch1 = node('folder', 'Capitolul 1', { sectionType: 'Capitol', children: [scene1, scene2] });
  const part = node('folder', 'Partea I', { children: [ch1, withKids] });
  const img = node('file', 'Hartă', { media: { file: '', mime: 'image/png', name: 'harta.png' } });
  const pdf = node('file', 'Contract', { media: { file: '', mime: 'application/pdf', name: 'c.pdf' } });
  const research = node('text', 'Notițe Paris');
  const trashed = node('text', 'Scenă ștearsă');
  project.tree[0].children = [part];
  project.tree[1].children = [research, img, pdf];
  project.tree[2].children = [trashed];
  img.media.file = store.writeMedia(dir, img.id, 'png', Buffer.from(PNG, 'base64'));
  pdf.media.file = store.writeMedia(dir, pdf.id, 'pdf', PDF);

  project.bookmarks = [{ id: scene2.id, title: 'Scena a doua' }, { url: 'https://example.com/proj', title: 'Site' }, { id: research.id }];
  scene1.bookmarks = [{ url: 'https://example.com/doc' }, { id: research.id, title: 'Paris' }, { id: deleted }];
  project.collections = [
    { id: 'c1', title: 'De revizuit', color: '#0000ff', type: 'manual', ids: [scene2.id, scene1.id, deleted] },
    { id: 'c2', title: 'Goală', color: '', type: 'manual', ids: [] },
  ];

  const html = [
    '<h1>Capitol ă</h1>',
    '<h2 style="text-align: center">Sub</h2>',
    '<h3>Mic</h3>',
    '<p style="text-align: justify"><strong>gras</strong> <em>cursiv</em> <u>sub</u> <s>tăiat</s> x<sup>2</sup> H<sub>2</sub>O <span style="color: #ff0000">roșu</span> <mark data-color="#ffff00" style="background-color: #ffff00">galben</mark></p>',
    '<p style="text-align: right">dreapta</p>',
    '<ul><li><p>unu</p></li><li><p>doi</p></li></ul>',
    '<ol><li><p>primul</p></li><li><p>al doilea</p></li></ol>',
    '<table><tbody><tr><td><p>a1</p></td><td><p>b1</p></td></tr><tr><td><p>a2</p></td><td><p>b2</p></td></tr></tbody></table>',
    `<p>Imagine <img src="data:image/png;base64,${PNG}" width="40"> și gif <img src="data:image/gif;base64,${GIF}"></p>`,
    `<p><a href="https://example.com/x?a=1&amp;b=2">extern</a> <a href="scribner://doc/${scene2.id}" class="internal-link">intern</a> <a href="scribner://doc/${deleted}" class="internal-link">mort</a></p>`,
    '<p>Text <span data-comment="Verifică asta" data-comment-color="#ff8800" data-comment-author="Ana" data-comment-date="2024-03-04T05:06:07.000Z" class="comment">ancorat</span> aici.</p>',
    '<p>Un <span data-caps="small">Nume Propriu</span> aici</p>',
    '<p>Notă<span data-footnote="Notă de subsol ă" class="footnote"></span> după ș</p>',
    '<p><span data-linked-footnote="Notă legată" class="linked-footnote">ancora</span> rest</p>',
    '<p>Adnotare <span data-annotation="de rescris ț" class="annotation"></span> gata</p>',
    '<p data-style="motto">Un motto</p>',
    '<p>Un <span data-char-style="termen">termen</span>.</p>',
    '<blockquote><p>Citat lung</p></blockquote>',
    '<p>Rând<br>nou</p>',
    '<hr class="page-break">',
    '<p>După pauză</p>',
  ].join('');
  store.writeDoc(dir, scene1.id, 'docs', html);
  store.writeDoc(dir, scene1.id, 'notes', '<p>De verificat <strong>datele</strong></p>');
  store.writeDoc(dir, scene2.id, 'docs', `<p>Vezi <a href="scribner://doc/${scene1.id}">scena unu</a>.</p>`);
  store.writeDoc(dir, withKids.id, 'docs', '<p>Părinte cu text</p>');
  store.writeDoc(dir, childOfText.id, 'docs', '<p>Copil</p>');
  store.writeDoc(dir, research.id, 'docs', '<p>Café de Flore</p>');
  store.writeDoc(dir, trashed.id, 'docs', '<p>Gunoi</p>');
  store.writeDoc(dir, 'project-notes', 'notes', '<p>Idei generale</p>');
  store.writeDoc(dir, 'pn-2', 'notes', '<p>Geografia lumii</p>');
  store.writeDoc(dir, 'pn-3', 'notes', '<p>Anul 1900</p>');

  store.addSnapshot(dir, scene1.id, { name: 'Prima ciornă', date: '2024-01-10T12:00:00.000Z', html: '<p>Versiunea <em>unu</em></p>' });
  store.addSnapshot(dir, scene1.id, { name: 'A doua', date: '2024-02-11T08:30:00.000Z', html: '<p>Versiunea doi <span data-comment="c" class="comment">x</span></p>' });
  store.addSnapshot(dir, scene1.id, { name: 'Aceeași secundă', date: '2024-02-11T08:30:00.000Z', html: '<p>Trei</p>' });

  fs.writeFileSync(
    path.join(dir, 'history.json'),
    JSON.stringify({
      days: {
        '2024-05-01': { draftStart: 100, draftEnd: 600, totalStart: 150, totalEnd: 800 },
        '2024-05-02': { draftWritten: 300, totalWritten: 450, imported: true },
      },
    }),
  );
  store.saveProject(dir, project);
  return { dir, project, scene1, scene2, withKids, childOfText, img, pdf, research, trashed, deleted };
}

const io = (dir) => ({
  readDoc: (id, kind) => store.readDoc(dir, id, kind),
  readMedia: (file) => store.readMedia(dir, file), // {data, mime} as in electron/v04Handlers.cjs
  listSnapshots: (id) => store.listSnapshots(dir, id),
  readHistory: () => JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8')),
});

const byTitle = (tree, title) => {
  let found = null;
  store.walk(tree, (n) => {
    if (n.title === title) found = n;
  });
  return found;
};

describe('Scrivener export -> import round trip', () => {
  let src;
  let res;
  let imp;
  let p;
  beforeAll(() => {
    src = build();
    const out = path.join(tmp, 'out');
    fs.mkdirSync(out);
    res = exportScriv(src.project, io(src.dir), out);
    imp = importScriv(res.dir, path.join(tmp, 'back'), { keepOriginal: false });
    p = imp.project;
  });
  const doc = (title, kind = 'docs') => store.readDoc(imp.dir, byTitle(p.tree, title).id, kind);

  it('project properties', () => {
    expect(p.title).toBe('Roman bogat');
    expect(p.author).toBe('Ana Popescu');
    expect(p.authorFirst).toBe('Ana');
    expect(p.authorLast).toBe('Popescu');
    expect(p.titleAbbreviation).toBe('RB');
  });

  it('binder structure: nested folders, text with children, research, trash', () => {
    const draft = p.tree.find((n) => n.root === 'draft');
    expect(draft.children.map((n) => n.title)).toEqual(['Partea I']);
    const part = draft.children[0];
    expect(part.type).toBe('folder');
    expect(part.children.map((n) => n.title)).toEqual(['Capitolul 1', 'Text cu copii']);
    expect(part.children[0].children.map((n) => n.title)).toEqual(['Scena unu', 'Scena doi']);
    const wk = part.children[1];
    expect(wk.type).toBe('text');
    expect(wk.children.map((n) => n.title)).toEqual(['Copil de text']);
    expect(store.htmlToText(doc('Text cu copii'))).toContain('Părinte cu text');
    expect(p.tree.find((n) => n.root === 'research').children.map((n) => n.title)).toEqual(['Notițe Paris', 'Hartă', 'Contract']);
    expect(p.tree.find((n) => n.root === 'trash').children.map((n) => n.title)).toEqual(['Scenă ștearsă']);
    expect(store.htmlToText(doc('Scenă ștearsă'))).toContain('Gunoi');
  });

  it('item metadata', () => {
    const s1 = byTitle(p.tree, 'Scena unu');
    const s2 = byTitle(p.tree, 'Scena doi');
    expect(s1.synopsis).toBe('Începutul nopții');
    expect(s1.label).toBe('Erou');
    expect(s1.status).toBe('Schiță');
    expect(s2.status).toBe('Gata');
    expect(s1.keywords).toEqual(['noapte', 'lună']);
    expect(s2.keywords).toEqual(['zi']);
    expect(s1.includeInCompile).toBe(true);
    expect(s2.includeInCompile).toBe(false);
    expect(s1.target).toBe(2000);
    expect(s1.targetType).toBe('Words');
    expect(s1.icon).toBe('🔥');
    expect(s1.locked).toBe(true);
    // Section type as Scrivener 3 stores it: <MetaData><SectionType>UUID</SectionType>, UUID defined under <SectionTypes>.
    const scrivx = fs.readFileSync(path.join(res.dir, 'Roman bogat.scrivx'), 'utf8');
    const stId = (t) => new RegExp(`<SectionType ID="([0-9A-F-]{36})"><Title>${t}</Title>`).exec(scrivx)[1];
    expect(scrivx).toContain(`<SectionType>${stId('Scenă')}</SectionType>`);
    expect(scrivx.split(`<SectionType>${stId('Capitol')}</SectionType>`).length).toBe(3); // by title and by id
    expect(s1.sectionType).toBe('Scenă');
    expect(byTitle(p.tree, 'Capitolul 1').sectionType).toBe('Capitol');
    expect(byTitle(p.tree, 'Text cu copii').sectionType).toBe('Capitol'); // source referenced the type by id
    expect(s1.created).toBe('2024-01-02T10:00:00.000Z');
    expect(s1.modified).toBe('2024-02-03T11:00:00.000Z');
    expect(s1.custom).toEqual({ POV: 'Ana', Verificat: true, Ton: 'Vesel', 'Data acțiunii': '2024-03-01' });
    expect(s2.custom).toEqual({ Verificat: false });
  });

  it('labels, statuses, keywords with colours and hierarchy', () => {
    expect(p.labels.find((l) => l.name === 'Erou').color).toBe('#ff0000');
    expect(p.labels.find((l) => l.name === 'Flashback').color).toBe('#00ff00');
    expect(p.statuses).toEqual(expect.arrayContaining(['Schiță', 'Gata']));
    expect(p.keywordDefs).toEqual([
      { name: 'noapte', color: '#000080', parent: null },
      { name: 'lună', color: '#808080', parent: 'noapte' },
      { name: 'zi', color: '', parent: null },
    ]);
  });

  it('custom metadata definitions and section types', () => {
    expect(p.customFields.map((f) => [f.title, f.type])).toEqual([['POV', 'text'], ['Verificat', 'checkbox'], ['Ton', 'list'], ['Data acțiunii', 'date']]);
    expect(p.customFields[0].wraps).toBe(true);
    expect(p.customFields[2].options.map((o) => o.title)).toEqual(['Sumbru', 'Vesel']);
    expect(p.sectionTypes.map((t) => t.title)).toEqual(['Capitol', 'Scenă']);
  });

  it('project targets', () => {
    expect(p.targets.draft).toBe(90000);
    expect(p.targets.session).toBe(1500);
    expect(p.targets.draftType).toBe('Words');
    expect(String(p.targets.deadline).slice(0, 10)).toBe('2026-12-31');
  });

  it('collections (manual, order kept, deleted targets dropped)', () => {
    const s1 = byTitle(p.tree, 'Scena unu');
    const s2 = byTitle(p.tree, 'Scena doi');
    expect(p.collections.map((c) => c.title)).toEqual(['De revizuit', 'Goală']);
    expect(p.collections[0]).toMatchObject({ type: 'manual', color: '#0000ff', ids: [s2.id, s1.id] });
    expect(p.collections[1].ids).toEqual([]);
  });

  it('bookmarks (project and document; deleted targets dropped)', () => {
    const s1 = byTitle(p.tree, 'Scena unu');
    const s2 = byTitle(p.tree, 'Scena doi');
    const r = byTitle(p.tree, 'Notițe Paris');
    void s2;
    expect(p.bookmarks).toEqual([{ id: s2.id, title: 'Scena a doua' }, { url: 'https://example.com/proj', title: 'Site' }, { id: r.id }]);
    expect(s1.bookmarks).toEqual([{ url: 'https://example.com/doc' }, { id: r.id, title: 'Paris' }]);
    expect(res.warnings.some((w) => w.includes(src.deleted))).toBe(true);
  });

  it('rich text', () => {
    const html = doc('Scena unu');
    expect(html).toContain('<h1>Capitol ă</h1>');
    expect(html).toContain('<h2 style="text-align: center">Sub</h2>');
    expect(html).toContain('<h3>Mic</h3>');
    expect(html).toContain('<p style="text-align: justify"><strong>gras</strong> <em>cursiv</em> <u>sub</u> <s>tăiat</s> x<sup>2</sup> H<sub>2</sub>O <span style="color: #ff0000">roșu</span> <mark data-color="#ffff00" style="background-color: #ffff00">galben</mark></p>');
    expect(html).toContain('<p style="text-align: right">dreapta</p>');
    expect(html).toContain('<ul><li><p>unu</p></li><li><p>doi</p></li></ul>');
    expect(html).toContain('<ol><li><p>primul</p></li><li><p>al doilea</p></li></ol>');
    expect(html).toContain('<table><tbody><tr><td><p>a1</p></td><td><p>b1</p></td></tr><tr><td><p>a2</p></td><td><p>b2</p></td></tr></tbody></table>');
    expect(html).toContain(`<img src="data:image/png;base64,${PNG}" width="40">`);
    expect(html).toContain(`<img src="data:image/gif;base64,${GIF}">`);
    expect(html).toContain('<blockquote><p>Citat lung</p></blockquote>');
    expect(html).toContain('<p>Rând<br>nou</p>');
    expect(html).toMatch(/<hr class="page-break"><p>După pauză<\/p>/);
    // named styles come back by name as Scribner styles, with their definitions
    expect(html).toContain('<p data-style="motto" style="text-align: right">Un motto</p>');
    expect(html).toContain('<p>Un <span data-char-style="termen">termen</span>.</p>');
    expect(p.styles).toEqual([
      { id: 'motto', name: 'Motto', type: 'para', italic: true, align: 'right' },
      { id: 'termen', name: 'Termen', type: 'char', italic: true },
    ]);
    expect(html).toContain('<p>Un <span data-caps="small">Nume Propriu</span> aici</p>'); // \\scaps, not upper-cased
  });

  it('links: external, internal remapped to new ids, deleted target kept as text', () => {
    const html = doc('Scena unu');
    const s2 = byTitle(p.tree, 'Scena doi');
    const s1 = byTitle(p.tree, 'Scena unu');
    expect(html).toContain('<a href="https://example.com/x?a=1&amp;b=2">extern</a>');
    expect(html).toContain(`<a href="scribner://doc/${s2.id}" class="internal-link">intern</a>`);
    expect(html).toMatch(/ mort<\/p>/);
    expect(doc('Scena doi')).toContain(`<a href="scribner://doc/${s1.id}" class="internal-link">scena unu</a>`);
  });

  it('comments, footnotes (inline and linked), annotations', () => {
    const html = doc('Scena unu');
    expect(html).toContain('<span data-comment="Verifică asta" data-color="#ff8800" data-author="Ana" data-comment-date="2024-03-04T05:06:07.000Z" class="comment">ancorat</span>');
    expect(html).toContain('Notă<span data-footnote="Notă de subsol ă" class="footnote"></span> după ș</p>');
    // linked footnote (Footnote="Yes" in content.comments) comes back as a linked footnote over its anchor
    expect(html).toContain('<p><span data-linked-footnote="Notă legată" class="linked-footnote">ancora</span> rest</p>');
    expect(imp.stats.footnotes).toBe(2);
    expect(html).toContain('Adnotare <span data-annotation="de rescris ț" class="annotation"></span> gata');
    expect(imp.stats.comments).toBe(1);
    expect(res.comments).toBe(2);
    expect(html.replace(/https:[^"]*/g, '')).not.toMatch(/\?/); // no stray '?' from \uN fallbacks
  });

  it('document notes', () => {
    expect(doc('Scena unu', 'notes')).toBe('<p>De verificat <strong>datele</strong></p>');
  });

  it('snapshots with names, dates and text', () => {
    const snaps = store.listSnapshots(imp.dir, byTitle(p.tree, 'Scena unu').id);
    const view = snaps.map((s) => [s.name, s.date, store.htmlToText(s.html).trim()]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    expect(view).toEqual([
      ['A doua', '2024-02-11T08:30:00.000Z', 'Versiunea doi x'],
      ['Aceeași secundă', '2024-02-11T08:30:00.000Z', 'Trei'],
      ['Prima ciornă', '2024-01-10T12:00:00.000Z', 'Versiunea unu'],
    ]);
    expect(snaps.find((s) => s.name === 'Prima ciornă').html).toContain('<em>unu</em>');
  });

  it('media (image, pdf) byte-identical', () => {
    const img = byTitle(p.tree, 'Hartă');
    const pdf = byTitle(p.tree, 'Contract');
    expect(img.type).toBe('file');
    expect(store.readMedia(imp.dir, img.media.file).data.equals(Buffer.from(PNG, 'base64'))).toBe(true);
    expect(store.readMedia(imp.dir, pdf.media.file).data.equals(PDF)).toBe(true);
    expect(pdf.media.mime).toBe('application/pdf');
    expect(res.media).toBe(2);
  });

  it('project notes: every tab, in order, with its title', () => {
    expect(p.projectNotes.map((t) => t.title)).toEqual(['Idei', 'Lume', 'Cronologie']);
    expect(p.projectNotes[0].id).toBe('project-notes');
    expect(p.projectNotes.map((t) => store.readDoc(imp.dir, t.id, 'notes'))).toEqual(['<p>Idei generale</p>', '<p>Geografia lumii</p>', '<p>Anul 1900</p>']);
  });

  it('writing history', () => {
    const h = JSON.parse(fs.readFileSync(path.join(imp.dir, 'history.json'), 'utf8'));
    expect(h.days['2024-05-01']).toMatchObject({ draftWritten: 500, totalWritten: 650 });
    expect(h.days['2024-05-02']).toMatchObject({ draftWritten: 300, totalWritten: 450 });
  });

  it('writes the Scrivener 3 support files', () => {
    const files = path.join(res.dir, 'Files');
    expect(fs.readFileSync(path.join(files, 'version.txt'), 'utf8')).toBe('23');
    expect(fs.readFileSync(path.join(files, 'styles.xml'), 'utf8')).toContain('Name="Motto"');
    expect(fs.existsSync(path.join(files, 'writing.history'))).toBe(true);
    const s1 = fs.readdirSync(path.join(files, 'Data')).find((u) => fs.existsSync(path.join(files, 'Data', u, 'content.comments')));
    expect(fs.readFileSync(path.join(files, 'Data', s1, 'content.comments'), 'utf8')).toMatch(/Footnote="Yes"[\s\S]*legat\\u259\?/);
    expect(fs.readdirSync(path.join(files, 'Data', s1, 'snapshots')).sort()).toEqual(['2024-01-10-12-00-00.rtf', '2024-02-11-08-30-00-2.rtf', '2024-02-11-08-30-00.rtf', 'index.xml']);
  });
});

describe('Scrivener RTF writer details', () => {
  const back = (html, ctx = {}) => {
    const r = htmlToScrivRtf(html, ctx);
    const comments = Object.fromEntries(r.comments.map((c) => [c.id, { text: c.text, footnote: c.footnote, color: c.color, author: c.author }]));
    return rtfToHtml(r.rtf, { comments, linkFor: (u) => `scribner://doc/${u}` });
  };
  it('a comment spanning two paragraphs exports as two anchored comments', () => {
    const html = '<p><span data-comment="x" class="comment">a</span></p><p><span data-comment="x" class="comment">b</span></p>';
    expect(back(html)).toBe('<p><span data-comment="x" class="comment">a</span></p><p><span data-comment="x" class="comment">b</span></p>');
  });
  it('escapes RTF specials and astral characters', () => {
    expect(back('<p>{a} \\ b 😀 &lt;$x&gt;</p>')).toBe('<p>{a} \\ b 😀 &lt;$x&gt;</p>');
  });
  it('nested lists keep their levels', () => {
    const html = '<ul><li><p>a</p><ol><li><p>b</p></li><li><p>c</p></li></ol></li><li><p>d</p></li></ul>';
    expect(back(html)).toBe(html);
  });
  it('accepts readMedia returning a Buffer as well as {data}', () => {
    const dir = path.join(tmp, 'm.scribner');
    const project = store.createProject(dir, 'M');
    const f = store.newNode('file', 'Poză');
    f.media = { file: store.writeMedia(dir, f.id, 'png', Buffer.from(PNG, 'base64')) };
    project.tree[1].children = [f];
    const out = path.join(tmp, 'm-out');
    fs.mkdirSync(out);
    const r = exportScriv(project, { readDoc: () => '', readMedia: (file) => store.readMedia(dir, file).data }, out);
    expect(r.media).toBe(1);
  });
});

describe('Scrivener import edge cases', () => {
  const U = { a: '11111111-1111-4111-8111-111111111111', gone: '99999999-9999-4999-8999-999999999999', c: '22222222-2222-4222-8222-222222222222' };
  it('comment anchored across paragraphs marks both paragraphs', () => {
    const rtf = `{\\rtf1\\ansi {\\field{\\*\\fldinst HYPERLINK "scrivcmt://${U.c}"}{\\fldrslt unu\\par doi}} trei\\par}`;
    const html = rtfToHtml(rtf, { comments: { [U.c]: { text: 'n', footnote: false } } });
    expect(html).toBe('<p><span data-comment="n" class="comment">unu</span></p><p><span data-comment="n" class="comment">doi</span> trei</p>');
  });
  it('Scrivener Link to a deleted item keeps the text; the link stays a raw scrivlnk:// (not internal)', () => {
    const rtf = `{\\rtf1\\ansi {\\field{\\*\\fldinst HYPERLINK "scrivlnk://${U.gone}"}{\\fldrslt vezi}}\\par}`;
    const html = rtfToHtml(rtf, { linkFor: () => null });
    expect(html).toBe(`<p><a href="scrivlnk://${U.gone}">vezi</a></p>`);
  });
  it('comment anchor without an entry in content.comments keeps its text', () => {
    const rtf = `{\\rtf1\\ansi {\\field{\\*\\fldinst HYPERLINK "scrivcmt://${U.c}"}{\\fldrslt ancora}}\\par}`;
    expect(rtfToHtml(rtf, { comments: {} })).toBe('<p>ancora</p>');
  });
  it('comment entry whose anchor is gone is kept at the end of the text', () => {
    expect(rtfToHtml('{\\rtf1\\ansi text\\par}', { comments: { [U.c]: { text: 'orfan', footnote: false } } })).toBe('<p>text</p><p><span data-annotation="orfan" class="annotation"></span></p>');
  });
  it('a Scrivener inline footnote group scopes \\uc: no stray "?" after it', () => {
    // As Scrivener writes it: {\Scrv_fn=...\end_Scrv_fn}; the closing brace restores the outer \uc1.
    expect(rtfToHtml('{\\rtf1\\ansi\\uc1 a{\\Scrv_fn=n\\end_Scrv_fn} \\u259?\\par}')).toBe('<p>a<span data-footnote="n" class="footnote"></span> ă</p>');
    expect(rtfToHtml('{\\rtf1\\ansi\\uc1 a{\\Scrv_annot\\text=\\uc0 x\\end_Scrv_annot} \\u259?\\par}')).toBe('<p>a<span data-annotation="x" class="annotation"></span> ă</p>');
  });
  it('item without a Data folder imports as empty text; bookmarks/collections to missing UUIDs are dropped', () => {
    const scriv = path.join(tmp, 'Gol.scriv');
    fs.mkdirSync(path.join(scriv, 'Files', 'Data'), { recursive: true });
    fs.writeFileSync(
      path.join(scriv, 'Gol.scrivx'),
      `<?xml version="1.0"?><ScrivenerProject><Binder><BinderItem UUID="${U.a}" Type="DraftFolder"><Title>Draft</Title><Children><BinderItem UUID="${U.c}" Type="Text"><Title>Fără date</Title><Bookmarks><Bookmark Type="Internal" UUID="${U.gone}"/></Bookmarks></BinderItem></Children></BinderItem></Binder><Collections><Collection Type="Arbitrary"><Title>K</Title><BinderUUIDs>${U.gone},${U.c}</BinderUUIDs></Collection></Collections></ScrivenerProject>`,
    );
    const r = importScriv(scriv, path.join(tmp, 'gol-back'), { keepOriginal: false });
    const item = r.project.tree[0].children[0];
    expect(item.title).toBe('Fără date');
    expect(store.readDoc(r.dir, item.id)).toBe('<p></p>');
    expect(item.bookmarks).toEqual([]);
    expect(r.project.collections[0].ids).toEqual([item.id]);
  });
});

describe('table headers and all caps survive the round trip', () => {
  it('th stays th and data-caps="all" stays all caps', () => {
    const { htmlToScrivRtf } = require('../lib/scrivRtf.cjs');
    const { rtfToHtml } = require('../lib/rtf.cjs');
    const out = htmlToScrivRtf('<table><tr><th>Nume</th><th>Rol</th></tr><tr><td>Ana</td><td>eroină</td></tr></table><p>Un <span data-caps="all">titlu</span> mare.</p>');
    const html = rtfToHtml(typeof out === 'string' ? out : out.rtf);
    expect(html).toMatch(/<th[^>]*>\s*(<p[^>]*>)?Nume/);
    expect(html).toMatch(/<td[^>]*>\s*(<p[^>]*>)?Ana/);
    expect(html).toMatch(/data-caps="all"[^>]*>titlu/);
  });
});
