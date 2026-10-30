import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const { exportScriv } = require('../lib/scrivExport.cjs');
const sync = require('../lib/folderSync.cjs');
const bib = require('../lib/bibliography.cjs');
const adv = require('../lib/advancedExport.cjs');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-v04-'));
});

function makeProject() {
  const dir = path.join(tmp, 'src');
  store.createProject(dir, 'Roman');
  const project = store.loadProject(dir);
  for (const root of project.tree) root.children = [];
  const draft = project.tree.find((n) => n.root === 'draft');
  const research = project.tree.find((n) => n.root === 'research');
  const ch = store.newNode('folder', 'Capitolul 1');
  const s1 = Object.assign(store.newNode('text', 'Scena unu'), { synopsis: 'Începutul', label: 'Idee', status: 'Prima ciornă', keywords: ['noapte'] });
  const s2 = Object.assign(store.newNode('text', 'Scena doi'), { includeInCompile: false });
  ch.children.push(s1, s2);
  draft.children.push(ch);
  const r = store.newNode('text', 'Notițe Paris');
  research.children.push(r);
  project.author = 'Ana Pop';
  store.saveProject(dir, project);
  store.writeDoc(dir, s1.id, 'docs', '<p>Era o <em>noapte</em> rece &amp; lungă.</p>');
  store.writeDoc(dir, s1.id, 'notes', '<p>De verificat.</p>');
  store.writeDoc(dir, s2.id, 'docs', '<p>Al doilea.</p>');
  store.writeDoc(dir, r.id, 'docs', '<p>Turnul Eiffel</p>');
  store.writeDoc(dir, 'project-notes', 'notes', '<p>Idei generale</p>');
  return { dir, project, ch, s1, s2, r };
}

describe('scrivExport', () => {
  it('round-trips through scrivImport', () => {
    const { dir, project } = makeProject();
    const out = fs.mkdirSync(path.join(tmp, 'out'), { recursive: true }) && path.join(tmp, 'out');
    const res = exportScriv(project, { readDoc: (id, kind) => store.readDoc(dir, id, kind), readMedia: () => null }, out);
    expect(fs.existsSync(path.join(res.dir, 'Roman.scrivx'))).toBe(true);
    const imp = importScriv(res.dir, path.join(tmp, 'back'), { keepOriginal: false });
    const p = imp.project;
    const draft = p.tree.find((n) => n.root === 'draft');
    expect(draft.children[0].title).toBe('Capitolul 1');
    const [a, b] = draft.children[0].children;
    expect(a.title).toBe('Scena unu');
    expect(a.synopsis).toBe('Începutul');
    expect(a.label).toBe('Idee');
    expect(a.status).toBe('Prima ciornă');
    expect(a.keywords).toEqual(['noapte']);
    expect(b.includeInCompile).toBe(false);
    const html = store.readDoc(imp.dir, a.id);
    expect(store.htmlToText(html)).toContain('Era o noapte rece & lungă.');
    expect(html).toMatch(/<em>noapte<\/em>/);
    expect(store.htmlToText(store.readDoc(imp.dir, a.id, 'notes'))).toContain('De verificat');
    expect(p.tree.find((n) => n.root === 'research').children[0].title).toBe('Notițe Paris');
    expect(store.readDoc(imp.dir, 'project-notes', 'notes')).toContain('Idei generale');
  });
});

describe('folderSync', () => {
  it('writes, detects external edits, conflicts and new files', () => {
    const { dir, project, s1, s2, r } = makeProject();
    const folder = path.join(tmp, 'sync');
    const read = (id) => store.readDoc(dir, id);
    const m = sync.syncOut(project, folder, read, { format: 'txt' });
    expect(Object.keys(m.files)).toHaveLength(3);
    expect(fs.readdirSync(path.join(folder, 'Draft'))).toEqual(['001 Scena unu.txt', '002 Scena doi.txt']);
    expect(fs.readdirSync(path.join(folder, 'Notes'))).toEqual(['001 Notițe Paris.txt']);
    expect(fs.existsSync(path.join(folder, sync.MANIFEST))).toBe(true);

    expect(sync.syncIn(project, folder, read)).toMatchObject({ updates: [], conflicts: [], newDocs: [] });

    fs.writeFileSync(path.join(folder, 'Draft', '001 Scena unu.txt'), 'Text nou extern');
    fs.writeFileSync(path.join(folder, 'Draft', '002 Scena doi.txt'), 'Și aici extern');
    store.writeDoc(dir, s2.id, 'docs', '<p>Editat în Pneuma Sofer</p>');
    fs.writeFileSync(path.join(folder, 'Notes', 'Nou.md'), '# Titlu\n\n*idee*');

    const written = {};
    const res = sync.syncIn(project, folder, read, (id, html) => (written[id] = html));
    expect(res.updates.map((u) => u.id)).toEqual([s1.id]);
    expect(written[s1.id]).toContain('Text nou extern');
    expect(res.conflicts).toHaveLength(1);
    expect(res.conflicts[0]).toMatchObject({ id: s2.id });
    expect(res.conflicts[0].ours).toContain('Editat în Pneuma Sofer');
    expect(res.conflicts[0].theirs).toContain('Și aici extern');
    expect(written[s2.id]).toBeUndefined();
    expect(res.newDocs).toHaveLength(1);
    expect(res.newDocs[0]).toMatchObject({ title: 'Nou', folder: 'notes' });
    expect(res.newDocs[0].html).toContain('<em>idee</em>');

    // applied update is now in sync; after markSynced the conflict is gone too
    store.writeDoc(dir, s1.id, 'docs', written[s1.id]);
    sync.markSynced(folder, s2.id, res.conflicts[0].theirs);
    store.writeDoc(dir, s2.id, 'docs', res.conflicts[0].theirs);
    const again = sync.syncIn(project, folder, read);
    expect(again.updates).toEqual([]);
    expect(again.conflicts).toEqual([]);
    expect(r.id).toBeTruthy();
  });

  it('supports rtf and md formats', () => {
    const { dir, project } = makeProject();
    for (const format of ['rtf', 'md']) {
      const folder = path.join(tmp, `sync-${format}`);
      sync.syncOut(project, folder, (id) => store.readDoc(dir, id), { format });
      const f = path.join(folder, 'Draft', `001 Scena unu.${format}`);
      expect(fs.existsSync(f)).toBe(true);
      expect(sync.syncIn(project, folder, (id) => store.readDoc(dir, id)).updates).toEqual([]);
    }
  });
});

describe('bibliography', () => {
  const BIB = `@article{smith2020,
    author = {Smith, John and Jones, Mary},
    title = {On {W}riting Novels},
    journal = {Journal of Letters},
    year = 2020, volume = {12}, number = {3}, pages = {45--67},
    doi = {10.1000/xyz}
  }
  @book{popescu1999, author = "Ion Popescu", title = {Istoria rom\\^{a}nului}, publisher = {Humanitas}, address = {Bucure\\c{s}ti}, year = {1999}}`;

  it('parses BibTeX', () => {
    const e = bib.parseBibtex(BIB);
    expect(e).toHaveLength(2);
    expect(e[0]).toMatchObject({ key: 'smith2020', type: 'article-journal', title: 'On Writing Novels', year: '2020', pages: '45–67', volume: '12', issue: '3' });
    expect(e[0].authors).toEqual([{ family: 'Smith', given: 'John' }, { family: 'Jones', given: 'Mary' }]);
    expect(e[1].authors[0]).toEqual({ family: 'Popescu', given: 'Ion' });
    expect(e[1].title).toBe('Istoria românului');
    expect(e[1].place).toBe('Bucure\u015fti');
  });

  it('parses CSL-JSON', () => {
    const e = bib.parseBibliography(JSON.stringify([{ id: 'doe', type: 'book', title: 'A Book', author: [{ family: 'Doe', given: 'Jane' }], issued: { 'date-parts': [[2001]] }, publisher: 'Pub' }]));
    expect(e[0]).toMatchObject({ key: 'doe', type: 'book', year: '2001', publisher: 'Pub' });
  });

  it('formats in each style', () => {
    const [a, b] = bib.parseBibtex(BIB);
    expect(bib.formatReference(a, 'apa')).toBe('Smith, J., &amp; Jones, M. (2020). On Writing Novels. <em>Journal of Letters, 12</em>(3), 45–67. https://doi.org/10.1000/xyz');
    expect(bib.formatReference(b, 'apa')).toBe('Popescu, I. (1999). <em>Istoria românului</em>. Humanitas.');
    expect(bib.formatReference(b, 'chicago')).toBe('Popescu, Ion. 1999. <em>Istoria românului.</em> Bucure\u015fti: Humanitas.');
    expect(bib.formatReference(a, 'mla')).toContain('Smith, John, and Mary Jones. “On Writing Novels.” <em>Journal of Letters</em>, vol. 12, no. 3, 2020, pp. 45–67.');
    expect(bib.formatCitation(a, 'apa', '50')).toBe('(Smith & Jones, 2020, p. 50)');
    expect(bib.formatCitation(b, 'chicago')).toBe('(Popescu 1999)');
    expect(bib.formatCitation(b, 'mla', '12')).toBe('(Popescu 12)');
  });

  it('finds [@key] citations and builds references', () => {
    const entries = bib.parseBibtex(BIB);
    const html = '<p>Așa cum arată [@smith2020, 50] și [@popescu1999; @smith2020], dar nu [@lipsa].</p>';
    expect(bib.findCitations(html).map((c) => c.key)).toEqual(['smith2020', 'popescu1999', 'smith2020', 'lipsa']);
    const r = bib.buildReferences(html, entries, 'apa');
    expect(r.html).toContain('(Smith &amp; Jones, 2020, p. 50)');
    expect(r.html).toContain('(Popescu, 1999; Smith &amp; Jones, 2020)');
    expect(r.html).toContain('[@lipsa]');
    expect(r.missing).toEqual(['lipsa']);
    expect(r.references.items).toHaveLength(2);
    expect(r.references.items[0]).toMatch(/^Popescu/);
  });
});

describe('advancedExport', () => {
  const sections = [
    { title: 'Capitolul 1', level: 1, html: '' },
    { title: 'Scena #1', level: 2, html: '<p>Un <em>text</em> cu 50% & $ și notă<span data-footnote="Notă &amp; jos" class="footnote"></span>.</p><ul><li>a</li><li>b</li></ul>' },
  ];
  const meta = { title: 'Roman & co', author: 'Ana Pop', lang: 'ro' };

  it('LaTeX', () => {
    const tex = adv.toLatex(sections, meta);
    expect(tex).toContain('\\documentclass[12pt]{book}');
    expect(tex).toContain('\\title{Roman \\& co}');
    expect(tex).toContain('\\chapter{Capitolul 1}');
    expect(tex).toContain('\\section{Scena \\#1}');
    expect(tex).toContain('Un \\emph{text} cu 50\\% \\& \\$ și notă\\footnote{Notă \\& jos}.');
    expect(tex).toMatch(/\\begin\{itemize\}\n {2}\\item a\n\n? {2}\\item b/);
    expect(tex.trim().endsWith('\\end{document}')).toBe(true);
  });

  it('Pandoc Markdown', () => {
    const md = adv.toPandoc(sections, meta);
    expect(md.startsWith('---\ntitle: "Roman & co"\nauthor: "Ana Pop"')).toBe(true);
    expect(md).toContain('# Capitolul 1');
    expect(md).toContain('## Scena #1');
    expect(md).toContain('Un *text* cu 50% & $ și notă[^1].');
    expect(md).toContain('[^1]: Notă & jos');
    expect(md).toContain('- a\n- b');
  });

  it('MultiMarkdown + Kindle note', () => {
    const mmd = adv.toMultiMarkdown(sections, meta);
    expect(mmd.startsWith('Title: Roman & co\nAuthor: Ana Pop')).toBe(true);
    expect(mmd).toContain('[^1]: Notă & jos');
    expect(adv.KINDLE_EPUB_NOTE.supported).toBe(false);
    expect(adv.KINDLE_EPUB_NOTE.recommended.output).toBe('epub');
  });

  it('sectionsFromProject skips excluded items', () => {
    const { dir, project } = makeProject();
    const s = adv.sectionsFromProject(project, (id) => store.readDoc(dir, id));
    expect(s.map((x) => [x.title, x.level])).toEqual([['Capitolul 1', 1], ['Scena unu', 2]]);
  });
});
