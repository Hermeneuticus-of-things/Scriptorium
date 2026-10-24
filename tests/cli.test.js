import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const store = require('../lib/store.cjs');

const CLI = path.join(__dirname, '..', 'cli', 'scribner.cjs');
const ENV = { ...process.env, LANG: 'ro_RO.UTF-8', LC_ALL: '', LC_MESSAGES: '', SCRIBNER_LANG: '' };

function run(args, opts = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...ENV, ...(opts.env || {}) }, cwd: opts.cwd || tmp, timeout: 30000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const runJson = (args) => {
  const r = run([...args, '--json']);
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out);
};

let tmp;
let P;
const ids = {};

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-cli-'));
  P = path.join(tmp, 'Carte.scribner');
  const project = store.createProject(P, 'Țara mea — „Karma”');
  project.author = 'Ion Pop';
  const draft = project.tree[0];
  const research = project.tree[1];
  const ch1 = store.newNode('folder', 'Capitolul 1: Început');
  ch1.synopsis = 'Eroul pleacă de acasă.';
  const s1 = store.newNode('text', 'Scena ăîșț');
  s1.target = 10;
  const s2 = store.newNode('text', 'Scena doi');
  ch1.children.push(s1, s2);
  const ch2 = store.newNode('text', 'Capitolul 2 😀');
  const r1 = store.newNode('text', 'Notițe despre Karma');
  draft.children = [ch1, ch2];
  research.children = [r1];
  Object.assign(ids, { ch1: ch1.id, s1: s1.id, s2: s2.id, ch2: ch2.id, r1: r1.id });
  store.writeDoc(P, s1.id, 'docs', '<p>Pădurea era <strong>întunecată</strong> și liniștită.</p><p>Karma veghea.</p>');
  store.writeDoc(P, s2.id, 'docs', '<p>A doua scenă, cu karma mică.</p>');
  store.writeDoc(P, ch2.id, 'docs', '<p>Final fericit pentru toți.</p>');
  store.writeDoc(P, r1.id, 'docs', '<p>Legea cauzei și efectului.</p>');
  store.writeDoc(P, s1.id, 'notes', '<p>De verificat numele pădurii.</p>');
  store.saveProject(P, project);
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('cli: usage and help', () => {
  it('help and --version exit 0, no command exits 2', () => {
    const h = run(['help']);
    expect(h.code).toBe(0);
    expect(h.out).toMatch(/export-sources/);
    expect(h.out).toMatch(/Folosire/);
    expect(run(['help', '--lang', 'en']).out).toMatch(/Usage/);
    expect(run(['help'], { env: { LANG: 'en_US.UTF-8' } }).out).toMatch(/Usage/);
    const v = run(['--version']);
    expect(v.code).toBe(0);
    expect(v.out.trim()).toBe(require('../package.json').version);
    expect(run([]).code).toBe(2);
  });

  it('bad usage exits 2, errors exit 1', () => {
    expect(run(['nope']).code).toBe(2);
    expect(run(['info']).code).toBe(2);
    expect(run(['info', P, '--bogus']).code).toBe(2);
    expect(run(['compile', P, '--format', 'xyz']).code).toBe(2);
    expect(run(['export-docs', P]).code).toBe(2); // missing -o
    const missing = run(['info', path.join(tmp, 'nu-exista'), '--lang', 'en']);
    expect(missing.code).toBe(1);
    expect(missing.err).toMatch(/Not a Scribner project/);
    expect(run(['cat', P, 'Nu există']).code).toBe(1);
    expect(run(['search', P, '(', '--regex']).code).toBe(2);
    expect(run(['mcp']).code).toBe(2);
  });
});

describe('cli: read commands', () => {
  it('info --json has a stable shape', () => {
    const s = runJson(['info', P]);
    expect(Object.keys(s)).toEqual(['title', 'author', 'path', 'format', 'counts', 'words', 'targets', 'created', 'modified']);
    expect(s.title).toBe('Țara mea — „Karma”');
    expect(s.author).toBe('Ion Pop');
    expect(s.counts).toMatchObject({ documents: 4, folders: 1, manuscript: 4, research: 1, trash: 0, snapshots: 0 });
    expect(s.words.manuscript).toBe(7 + 6 + 4);
    expect(s.words.total).toBe(17 + 4);
    expect(typeof s.modified).toBe('string');
    expect(run(['info', P]).out).toMatch(/Țara mea/);
  });

  it('list: flat, tree and json', () => {
    const list = runJson(['list', P]);
    const s1 = list.find((i) => i.id === ids.s1);
    expect(s1).toMatchObject({ title: 'Scena ăîșț', type: 'text', root: 'draft', depth: 2, parent: ids.ch1, words: 7, includeInCompile: true });
    expect(Object.keys(s1)).toEqual(['id', 'title', 'type', 'root', 'depth', 'parent', 'words', 'synopsis', 'label', 'status', 'includeInCompile']);
    const flat = run(['list', P]).out;
    expect(flat).toContain(`${ids.ch2}\tdraft\ttext\t4\tCapitolul 2 😀`);
    const tree = run(['list', P, '--tree']).out;
    expect(tree).toMatch(/^ {4}Scena ăîșț {2}\[/m);
  });

  it('cat by title or id, as text, markdown, html and notes', () => {
    expect(run(['cat', P, 'scena ĂÎȘȚ']).out).toMatch(/Pădurea era întunecată și liniștită\.\n+Karma veghea\./);
    expect(run(['cat', P, ids.s1, '--md']).out).toMatch(/\*\*întunecată\*\*/);
    expect(run(['cat', P, ids.s1, '--html']).out).toContain('<strong>întunecată</strong>');
    expect(run(['cat', P, ids.s1, '--notes']).out).toMatch(/numele pădurii/);
    expect(run(['cat', P, 'Capitolul 2 😀']).out).toMatch(/Final fericit/);
  });

  it('search: plain, case, whole word, regex', () => {
    const all = runJson(['search', P, 'karma']);
    expect(all.results.map((r) => r.id).sort()).toEqual([ids.s1, ids.s2, ids.r1].sort());
    expect(all.results[0]).toHaveProperty('snippets');
    expect(runJson(['search', P, 'Karma', '--case']).results.map((r) => r.id).sort()).toEqual([ids.s1, ids.r1].sort());
    expect(runJson(['search', P, 'scen', '--whole']).results.length).toBe(0);
    expect(runJson(['search', P, 'p.dur', '--regex']).total).toBe(2); // text + notes
    expect(run(['search', P, 'zzzz']).out).toMatch(/Niciun rezultat/);
    expect(run(['search', P, 'karma']).err).toBe(''); // no Node warnings on stderr
  });

  it('stats --json: per document words, targets, history', () => {
    const st = runJson(['stats', P]);
    expect(st.words.manuscript).toBe(17);
    expect(st.targets).toMatchObject({ draft: 80000, session: 1000 });
    const s1 = st.documents.find((d) => d.id === ids.s1);
    expect(s1).toMatchObject({ words: 7, target: 10, progress: 70 });
    expect(st.history).toMatchObject({ days: 0, first: null, recent: [] });
  });

  it('read commands work while the project is locked', () => {
    const lock = path.join(P, 'project.json.lock');
    fs.writeFileSync(lock, 'other-process');
    try {
      expect(run(['info', P]).code).toBe(0);
      expect(run(['list', P]).code).toBe(0);
      expect(run(['stats', P]).code).toBe(0);
    } finally {
      fs.rmSync(lock, { force: true });
    }
  });
});

describe('cli: compile and exports', () => {
  it('compile docx/md/txt/html/epub/odt/rtf/latex/fountain/fdx with presets', () => {
    const out = path.join(tmp, 'compiled');
    fs.mkdirSync(out);
    for (const f of ['docx', 'md', 'txt', 'html', 'epub', 'odt', 'rtf', 'latex', 'fountain', 'fdx']) {
      const r = run(['compile', P, '--format', f, '-o', path.join(out, `carte-${f}`), '--json']);
      expect(r.code, `${f}: ${r.err}`).toBe(0);
      const j = JSON.parse(r.out);
      expect(j.bytes).toBeGreaterThan(0);
    }
    expect(fs.readFileSync(path.join(out, 'carte-md'), 'utf8')).toMatch(/Pădurea/);
    // -o as an existing folder: file named after the project title
    const r = run(['compile', P, '--format', 'txt', '--preset', 'paperback', '-o', out, '--json']);
    expect(r.code, r.err).toBe(0);
    expect(path.basename(JSON.parse(r.out).file)).toMatch(/^Țara mea.*\.txt$/);
    expect(run(['compile', P, '--format', 'txt', '--preset', 'nu-exista']).code).toBe(2);
  });

  it('compile pdf prints a clear message instead of failing obscurely', () => {
    const r = run(['compile', P, '--format', 'pdf', '--lang', 'en']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/--format html/);
  });

  it('export-notebooklm reuses the NotebookLM export', () => {
    const res = runJson(['export-notebooklm', P, '-o', path.join(tmp, 'nlm')]);
    expect(res.files[0]).toBe('00 - Cuprins.md');
    expect(res.files.length).toBeGreaterThanOrEqual(3);
    expect(fs.existsSync(path.join(res.dir, res.files[1]))).toBe(true);
  });

  it('export-sources per chapter (md): index + chapters + research + notes + manifest', () => {
    const res = runJson(['export-sources', P, '-o', path.join(tmp, 'src')]);
    expect(res.files).toEqual(['00 - Cuprins.md', '01 - Capitolul 1_ Început.md', '02 - Capitolul 2 😀.md', 'Cercetare - Notițe despre Karma.md', 'Note proiect.md']);
    expect(fs.readdirSync(res.dir).sort()).toEqual([...res.files, 'sources.json'].sort());
    expect(fs.readFileSync(path.join(res.dir, '00 - Cuprins.md'), 'utf8')).toMatch(/Eroul pleacă de acasă/);
    expect(fs.readFileSync(path.join(res.dir, '01 - Capitolul 1_ Început.md'), 'utf8')).toMatch(/Scena doi/);
    const manifest = JSON.parse(fs.readFileSync(path.join(res.dir, 'sources.json'), 'utf8'));
    expect(manifest.sources.map((s) => s.kind)).toEqual(['index', 'chapter', 'chapter', 'research', 'notes']);
  });

  it('export-sources per document, txt and docx', () => {
    const doc = runJson(['export-sources', P, '-o', path.join(tmp, 'src-doc'), '--per', 'document', '--format', 'txt']);
    expect(doc.files.filter((f) => /^\d\d - /.test(f))).toEqual(['00 - Cuprins.txt', '01 - Capitolul 1_ Început.txt', '02 - Scena ăîșț.txt', '03 - Scena doi.txt', '04 - Capitolul 2 😀.txt']);
    const txt = fs.readFileSync(path.join(doc.dir, '02 - Scena ăîșț.txt'), 'utf8');
    expect(txt).toMatch(/Pădurea era întunecată/);
    expect(txt).not.toMatch(/\*\*/);
    const docx = runJson(['export-sources', P, '-o', path.join(tmp, 'src-docx'), '--format', 'docx']);
    expect(docx.files.every((f) => f.endsWith('.docx'))).toBe(true);
    expect(fs.readFileSync(path.join(docx.dir, docx.files[1])).subarray(0, 2).toString()).toBe('PK');
    expect(run(['export-sources', P, '-o', tmp, '--per', 'scene']).code).toBe(2);
  });

  it('export-sources --target: notebooklm caps at 50 sources, manus is generic', () => {
    expect(run(['help']).out).toMatch(/Manus/);
    const t = runJson(['export-sources', P, '-o', path.join(tmp, 'src-nlm'), '--target', 'notebooklm', '--per', 'document']);
    expect(t.target).toBe('notebooklm');
    expect(t.files.length).toBeLessThanOrEqual(50);
    const m = runJson(['export-sources', P, '-o', path.join(tmp, 'src-manus'), '--target', 'manus', '--max-sources', '4', '--per', 'document']);
    expect(m.target).toBe('manus');
    expect(m.files.length).toBeLessThan(6); // index + merged chapters + research + notes
    expect(m.warnings.length).toBeGreaterThan(0);
    expect(run(['export-sources', P, '-o', tmp, '--target', 'bard']).code).toBe(2);
  });

  it('export-docs mirrors the binder', () => {
    const res = runJson(['export-docs', P, '-o', path.join(tmp, 'docs'), '--format', 'md']);
    expect(res.count).toBe(4);
    expect(res.files.some((f) => f.endsWith(`Scena ăîșț.md`))).toBe(true);
  });

  it('backup writes a zip (or a folder with --no-zip)', () => {
    const zip = runJson(['backup', P, '-o', path.join(tmp, 'bk')]);
    expect(zip.file).toMatch(/\.zip$/);
    expect(fs.existsSync(zip.file)).toBe(true);
    const folder = runJson(['backup', P, '-o', path.join(tmp, 'bk2'), '--no-zip']);
    expect(fs.existsSync(path.join(folder.file, 'Carte.scribner', 'project.json'))).toBe(true);
  });
});

describe('cli: write commands', () => {
  it('snapshot by title takes a snapshot', () => {
    const snap = runJson(['snapshot', P, 'Scena doi', '--name', 'Înainte']);
    expect(snap).toMatchObject({ id: ids.s2, title: 'Scena doi', name: 'Înainte' });
    const list = store.listSnapshots(P, ids.s2);
    expect(list[0].html).toMatch(/karma mică/);
  });

  it('write commands respect the project lock', () => {
    const lock = path.join(P, 'project.json.lock');
    fs.writeFileSync(lock, 'other-process');
    try {
      const r = run(['snapshot', P, 'Scena doi', '--lock-timeout', '200']);
      expect(r.code).toBe(1);
      expect(r.err).toMatch(/ocupat/);
      expect(fs.readFileSync(lock, 'utf8')).toBe('other-process');
      const before = store.listSnapshots(P, ids.s2).length;
      expect(before).toBe(1);
      const src = path.join(tmp, 'locked.md');
      fs.writeFileSync(src, 'Text.');
      expect(run(['import', src, '-o', P, '--lock-timeout', '200']).code).toBe(1);
    } finally {
      fs.rmSync(lock, { force: true });
    }
  });

  it('import markdown into a new project, split by headings', () => {
    const src = path.join(tmp, 'roman.md');
    fs.writeFileSync(src, '# Unu\n\nPrimul paragraf ăîș.\n\n# Doi\n\nAl doilea **gras**.\n');
    const dest = path.join(tmp, 'Roman nou.scribner');
    const res = runJson(['import', src, '-o', dest, '--split', 'h1']);
    expect(res.added.map((a) => a.title)).toEqual(['Unu', 'Doi']);
    const list = runJson(['list', dest]).filter((i) => i.root === 'draft' && i.depth > 0);
    expect(list.map((i) => i.title)).toEqual(['Unu', 'Doi']);
    expect(run(['cat', dest, 'Doi', '--html']).out).toContain('<strong>gras</strong>');
    // into an existing project, research folder
    const more = runJson(['import', src, '-o', dest, '--to', 'research']);
    expect(more.documents).toBe(1);
    expect(runJson(['list', dest]).filter((i) => i.root === 'research' && i.depth > 0)).toHaveLength(1);
  });

  it('import a .scriv folder', () => {
    const scriv = path.join(tmp, 'Mic.scriv');
    const uuid = 'BBBBBBBB-0000-0000-0000-000000000002';
    fs.mkdirSync(path.join(scriv, 'Files', 'Data', uuid), { recursive: true });
    fs.writeFileSync(
      path.join(scriv, 'Mic.scrivx'),
      `<?xml version="1.0" encoding="UTF-8"?><ScrivenerProject Version="2.0"><Binder><BinderItem UUID="BBBBBBBB-0000-0000-0000-000000000001" Type="DraftFolder"><Title>Manuscris</Title><Children><BinderItem UUID="${uuid}" Type="Text"><Title>Capitol</Title></BinderItem></Children></BinderItem></Binder></ScrivenerProject>`,
    );
    fs.writeFileSync(path.join(scriv, 'Files', 'Data', uuid, 'content.rtf'), '{\\rtf1\\ansi Salut lume.}');
    const dest = path.join(tmp, 'importat', 'Din scriv.scribner');
    const res = runJson(['import', scriv, '-o', dest]);
    expect(res.project).toBe(dest);
    expect(run(['cat', dest, 'Capitol']).out.trim()).toBe('Salut lume.');
  });
});

describe('cli: ask (offline fake provider)', () => {
  const FAKE = { env: { NODE_ENV: 'test', SCRIBNER_AI_FAKE: '1', ANTHROPIC_API_KEY: '', OPENROUTER_API_KEY: '' } };
  it('answers with citations and keeps a session', () => {
    const a = run(['ask', P, 'pădurea întunecată', '--session', 'demo', '--json'], FAKE);
    expect(a.code, a.err).toBe(0);
    const j = JSON.parse(a.out);
    expect(j.answer).toMatch(/\[1\]/);
    expect(j.sources[0]).toMatchObject({ n: 1, id: ids.s1 });
    expect(j.turn).toBe(1);
    const b = JSON.parse(run(['ask', P, 'și în capitolul 2?', '--session', 'demo', '--json'], FAKE).out);
    expect(b.turn).toBe(2);
    expect(b.answer).toMatch(/cu istoric/);
    const chat = JSON.parse(fs.readFileSync(path.join(P, 'research', 'chats', 'demo.json'), 'utf8'));
    expect(chat.turns.map((t) => t.question)).toEqual(['pădurea întunecată', 'și în capitolul 2?']);
    const text = run(['ask', P, 'pădurea', '--provider', 'openrouter'], FAKE).out;
    expect(text).toMatch(/FAKE openrouter/);
    expect(text).toMatch(/^\[1\] Scena ăîșț/m);
  });
  it('filters sources and validates arguments', () => {
    const r = JSON.parse(run(['ask', P, 'cauzei efectului', '--sources', 'research', '--json'], FAKE).out);
    expect(r.sources.every((x) => x.id === ids.r1)).toBe(true);
    expect(run(['ask', P, 'x', '--sources', 'trash'], FAKE).code).toBe(2);
    expect(run(['ask', P, 'x', '--session', '../evil'], FAKE).code).toBe(2);
    expect(run(['ask', P], FAKE).code).toBe(2);
    expect(run(['ask', P, 'pădurea', '--provider', 'openrouter'], { env: { SCRIBNER_AI_FAKE: '', OPENROUTER_API_KEY: '' } }).code).toBe(1);
  });
});
