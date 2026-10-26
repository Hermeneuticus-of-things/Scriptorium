import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { MANUAL_RO } from '../src/help/manual.ro.js';
import { MANUAL_EN } from '../src/help/manual.en.js';
import { shortcutRows, commandLabel, placeholderRows, syntaxRows, scriptRows, getManual } from '../src/help/reference.js';
import { searchManual, buildIndex, resolveTopic, htmlToPlain, CONTEXT_TOPICS } from '../src/help/helpSearch.js';
import { DEFAULT_KEYS } from '../src/lib/commands.js';
import { SCRIPT_FORMAT_LIST } from '../src/lib/scriptFormats.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');
const templates = require('../lib/templates.cjs');
const { tutorialTemplate } = require('../lib/tutorialProject.cjs');

const CHAPTERS = ['start', 'projects', 'binder', 'editor', 'styles', 'comments', 'scrivenings', 'corkboard', 'outline', 'inspector', 'snapshots', 'search', 'targets', 'compile', 'import', 'script', 'tools', 'irep', 'ai', 'settings', 'shortcuts', 'faq', 'yours'];

describe('help manual', () => {
  for (const [lang, manual] of [['ro', MANUAL_RO], ['en', MANUAL_EN]]) {
    it(`${lang}: has every chapter with non-empty sections`, () => {
      expect(manual.map((c) => c.id)).toEqual(CHAPTERS);
      for (const c of manual) {
        expect(c.title.trim()).not.toBe('');
        expect(c.sections.length).toBeGreaterThan(0);
        for (const s of c.sections) {
          expect(s.title.trim()).not.toBe('');
          expect(htmlToPlain(s.html).length).toBeGreaterThan(20);
        }
      }
    });
    it(`${lang}: ids are unique`, () => {
      const ids = [...manual.map((c) => c.id), ...manual.flatMap((c) => c.sections.map((s) => s.id))];
      expect(new Set(ids).size).toBe(ids.length);
    });
  }

  it('Romanian manual is the complete one', () => {
    const len = (m) => m.reduce((n, c) => n + c.sections.reduce((a, s) => a + htmlToPlain(s.html).length, 0), 0);
    expect(len(MANUAL_RO)).toBeGreaterThan(25000);
    expect(len(MANUAL_RO)).toBeGreaterThan(len(MANUAL_EN));
  });

  it('English and Romanian share section ids (context help)', () => {
    const ids = (m) => m.flatMap((c) => c.sections.map((s) => s.id)).sort();
    expect(ids(MANUAL_EN)).toEqual(ids(MANUAL_RO));
  });

  it('context topics resolve in both languages', () => {
    for (const topic of Object.values(CONTEXT_TOPICS)) {
      expect(resolveTopic(MANUAL_RO, topic)).not.toBeNull();
      expect(resolveTopic(MANUAL_EN, topic)).not.toBeNull();
    }
    expect(resolveTopic(MANUAL_RO, 'compile')).toEqual({ chapterId: 'compile', sectionId: 'compile-basics' });
    expect(resolveTopic(MANUAL_RO, 'compile/compile-page')).toEqual({ chapterId: 'compile', sectionId: 'compile-page' });
    expect(resolveTopic(MANUAL_RO, 'nope')).toBeNull();
  });
});

describe('help references', () => {
  it('every default shortcut resolves to a label in ro and en', () => {
    for (const lang of ['ro', 'en']) {
      const rows = shortcutRows(lang).filter((r) => r.configurable);
      expect(rows.map((r) => r.id).sort()).toEqual(Object.keys(DEFAULT_KEYS).sort());
      for (const r of rows) {
        expect(commandLabel(r.id, lang), `${lang}:${r.id}`).toBeTruthy();
        expect(r.label).not.toBe(r.id);
        expect(r.key).toBe(DEFAULT_KEYS[r.id]);
      }
    }
  });

  it('shows custom shortcuts from settings', () => {
    const row = shortcutRows('ro', { shortcuts: { save: 'Ctrl+Alt+S' } }).find((r) => r.id === 'save');
    expect(row.key).toBe('Ctrl+Alt+S');
    expect(row.defaultKey).toBe('Ctrl+S');
  });

  it('placeholders match those resolved by Compile', () => {
    const { replacePlaceholders } = require('../lib/compile.cjs');
    const codes = placeholderRows('ro').map((r) => r.code);
    expect(codes).toEqual(expect.arrayContaining(['<$n>', '<$t>', '<$wc>', '<$p>', '<$projecttitle>', '<$author>', '<$date>', '<$img:Nume>']));
    if (typeof replacePlaceholders === 'function') {
      const ctx = { n: 4, title: 'T', wc: 10, project: { title: 'P', author: 'Ion Creangă' } };
      for (const c of codes.filter((x) => !/<\$(p|img)/.test(x))) expect(replacePlaceholders(c, ctx), c).not.toBe(c);
    }
  });

  it('syntax and script references are populated', () => {
    for (const kind of ['markdown', 'multimarkdown', 'fountain']) expect(syntaxRows(kind, 'ro').length).toBeGreaterThan(3);
    const rows = scriptRows();
    expect(rows.map((r) => r.id)).toEqual(SCRIPT_FORMAT_LIST.map((f) => f.id));
    for (const f of rows) for (const e of f.elements) expect(e.tab && e.enter).toBeTruthy();
  });

  it('getManual picks the language', () => {
    expect(getManual('en')).toBe(MANUAL_EN);
    expect(getManual('ro')).toBe(MANUAL_RO);
    expect(getManual('xx')).toBe(MANUAL_RO);
  });
});

describe('help search', () => {
  const index = buildIndex(MANUAL_RO);
  const top = (q) => searchManual(index, q)[0]?.sectionId;

  it('finds expected sections', () => {
    expect(top('placeholders')).toBe('compile-placeholders');
    expect(top('snapshot restaurare')).toBe('snapshots-compare');
    expect(searchManual(index, 'corkboard').map((r) => r.sectionId)).toContain('corkboard-basics');
    expect(top('Script Mode Tab')).toMatch(/^script-/);
    expect(top('MCP')).toBe('ai-mcp');
  });

  it('ignores diacritics and case', () => {
    expect(searchManual(index, 'tinte').map((r) => r.sectionId)).toContain('targets-project');
    expect(searchManual(index, 'ȚINTE').map((r) => r.sectionId)).toContain('targets-project');
  });

  it('requires all terms and marks them in the snippet', () => {
    expect(searchManual(index, 'corkboard xyzzyq')).toEqual([]);
    const r = searchManual(index, 'freeform')[0];
    expect(r.snippet).toMatch(/<mark>freeform<\/mark>/i);
    expect(searchManual(index, '   ')).toEqual([]);
  });

  it('works on the raw manual too', () => {
    expect(searchManual(MANUAL_EN, 'placeholders')[0].sectionId).toBe('compile-placeholders');
  });
});

describe('tutorial project', () => {
  it('has the template shape', () => {
    const t = tutorialTemplate();
    expect(t.name).toBe('Tutorial Pneuma Sofer');
    expect(Array.isArray(t.draft) && Array.isArray(t.research)).toBe(true);
    const check = (n) => {
      expect(['text', 'folder']).toContain(n.type);
      expect(n.title).toBeTruthy();
      if (n.type === 'folder') n.children.forEach(check);
      else expect(n.html).toMatch(/<p>/);
    };
    [...t.draft, ...t.research].forEach(check);
  });

  it('creates a valid project with store.createProject', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-tutorial-'));
    const had = Object.prototype.hasOwnProperty.call(templates.TEMPLATES, 'tutorial');
    if (!had) templates.TEMPLATES.tutorial = tutorialTemplate();
    try {
      const projDir = path.join(dir, 'Tutorial.scribner');
      const project = store.createProject(projDir, 'Tutorial Pneuma Sofer', 'tutorial');
      const loaded = store.loadProject(projDir);
      expect(loaded.title).toBe('Tutorial Pneuma Sofer');
      const lessons = loaded.tree[0].children[0];
      expect(lessons.title).toBe('Tutorial');
      expect(lessons.children.length).toBeGreaterThanOrEqual(15);
      const labels = new Set(project.labels.map((l) => l.name));
      const all = [];
      store.walk(loaded.tree, (n) => all.push(n));
      for (const n of all.filter((x) => x.type === 'text')) {
        expect(labels.has(n.label)).toBe(true);
        const html = store.readDoc(projDir, n.id, 'docs');
        expect(store.wordCount(html)).toBeGreaterThan(5);
      }
      expect(store.readDoc(projDir, lessons.children[0].id, 'docs')).toMatch(/Încearcă acum/);
    } finally {
      if (!had) delete templates.TEMPLATES.tutorial;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
