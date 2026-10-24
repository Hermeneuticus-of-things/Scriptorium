#!/usr/bin/env node
'use strict';
// Scribner command line interface. Uses the same lib/ modules as the app; never duplicates them.
//   node cli/scribner.cjs help
// Installed app (no Node.js needed): ELECTRON_RUN_AS_NODE=1 Scribner.exe resources/app/cli/scribner.cjs …
// Exit codes: 0 ok, 1 error, 2 bad usage.
// Read-only commands never take the project lock; commands that change the project run under
// store.withProjectLock (the same lock the app window and the MCP server use).
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const store = require('../lib/store.cjs');

const ROOT = path.join(__dirname, '..');
const VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

// ---------------------------------------------------------------- messages
const MSG = {
  ro: {
    usage: 'Folosire greșită',
    unknownCommand: (c) => `Comandă necunoscută: ${c}. Vezi „scribner help”.`,
    needProject: 'Lipsește calea proiectului (.scribner).',
    notProject: (p) => `Nu e un proiect Scribner: ${p}`,
    needArg: (a) => `Lipsește argumentul: ${a}`,
    needOut: 'Lipsește folderul/fișierul de ieșire (-o).',
    badValue: (o, v, ok) => `Valoare invalidă pentru ${o}: ${v} (permise: ${ok})`,
    unknownOption: (o) => `Opțiune necunoscută: ${o}`,
    notFound: (q) => `Nu am găsit documentul: ${q}`,
    ambiguous: (q, list) => `Mai multe documente se potrivesc cu „${q}”; folosește id-ul:\n${list}`,
    badRegex: 'Expresie regulată invalidă.',
    noPreset: (p) => `Format de compilare necunoscut: ${p}`,
    pdfNeedsApp:
      'PDF-ul se produce doar din aplicația Scribner (Compile → PDF), fiindcă are nevoie de motorul de randare al ferestrei. Din linia de comandă folosește --format html (deschide-l în browser și tipărește ca PDF) sau --format docx.',
    written: (f) => `Scris: ${f}`,
    files: (n, d) => `${n} fișiere în ${d}`,
    words: 'cuvinte',
    title: 'Titlu',
    author: 'Autor',
    documents: 'Documente',
    folders: 'Dosare',
    manuscript: 'Manuscris',
    research: 'Cercetare',
    trash: 'Coș',
    total: 'Total',
    modified: 'Modificat',
    snapshots: 'Snapshot-uri',
    target: 'Țintă',
    session: 'Sesiune',
    history: 'Istoric',
    days: 'zile',
    noResults: 'Niciun rezultat.',
    results: (n, d) => `${n} potriviri în ${d} documente`,
    snapshotTaken: (t, n) => `Snapshot „${n}” pentru „${t}”`,
    backupDone: (f) => `Copie de siguranță: ${f}`,
    imported: (n, d) => `Importat ${n} documente în ${d}`,
    locked: 'Proiectul e ocupat (blocat de aplicație sau de alt proces). Încearcă din nou.',
    warnings: 'Avertismente',
    badSession: (f) => `Sesiunea salvată era deteriorată; am pus-o deoparte (${f}) și am început una nouă.`,
    help: HELP_RO(),
  },
  en: {
    usage: 'Bad usage',
    unknownCommand: (c) => `Unknown command: ${c}. See "scribner help".`,
    needProject: 'Missing project path (.scribner).',
    notProject: (p) => `Not a Scribner project: ${p}`,
    needArg: (a) => `Missing argument: ${a}`,
    needOut: 'Missing output folder/file (-o).',
    badValue: (o, v, ok) => `Invalid value for ${o}: ${v} (allowed: ${ok})`,
    unknownOption: (o) => `Unknown option: ${o}`,
    notFound: (q) => `Document not found: ${q}`,
    ambiguous: (q, list) => `Several documents match "${q}"; use the id:\n${list}`,
    badRegex: 'Invalid regular expression.',
    noPreset: (p) => `Unknown compile format: ${p}`,
    pdfNeedsApp:
      'PDF is produced only from the Scribner app (Compile → PDF), since it needs the window rendering engine. From the command line use --format html (open it in a browser and print to PDF) or --format docx.',
    written: (f) => `Written: ${f}`,
    files: (n, d) => `${n} files in ${d}`,
    words: 'words',
    title: 'Title',
    author: 'Author',
    documents: 'Documents',
    folders: 'Folders',
    manuscript: 'Manuscript',
    research: 'Research',
    trash: 'Trash',
    total: 'Total',
    modified: 'Modified',
    snapshots: 'Snapshots',
    target: 'Target',
    session: 'Session',
    history: 'History',
    days: 'days',
    noResults: 'No results.',
    results: (n, d) => `${n} matches in ${d} documents`,
    snapshotTaken: (t, n) => `Snapshot "${n}" of "${t}"`,
    backupDone: (f) => `Backup: ${f}`,
    imported: (n, d) => `Imported ${n} documents into ${d}`,
    locked: 'The project is busy (locked by the app or another process). Try again.',
    warnings: 'Warnings',
    badSession: (f) => `The saved session was damaged; it was set aside (${f}) and a new one started.`,
    help: HELP_EN(),
  },
};

function HELP_RO() {
  return `Scribner ${VERSION} — linia de comandă

Folosire: scribner <comandă> [argumente] [opțiuni]

Citire (nu blochează proiectul):
  info <proiect> [--json]                    titlu, autor, numărători, cuvinte, ultima modificare
  list <proiect> [--tree] [--json]           documentele din binder
  cat <proiect> <id|titlu> [--md|--html] [--notes]   textul unui document
  search <proiect> <text> [--regex] [--case] [--whole] [--json]
  stats <proiect> [--json]                   cuvinte pe document, ținte, istoric

Export:
  compile <proiect> --format docx|epub|odt|rtf|html|md|txt|latex|fountain|fdx|pdf [--preset nume] [-o fișier]
  export-notebooklm <proiect> -o <folder>    surse .md pentru NotebookLM (max. 50)
  export-sources <proiect> -o <folder> [--format md|txt|docx] [--per chapter|document] [--max-sources N]
         [--target notebooklm|gemini|chatgpt|claude|manus|generic]
                                             surse pentru NotebookLM, Gemini, ChatGPT/Claude Projects, Manus
  export-docs <proiect> -o <folder> --format docx|md|txt|html|rtf|odt   câte un fișier pe document
  backup <proiect> [-o folder] [--no-zip]

Scriere (sub blocarea proiectului):
  snapshot <proiect> <id|titlu> [--name nume]
  import <fișier.docx|md|txt|odt|rtf|html|fountain|fdx|folder.scriv> -o <proiect.scribner>
         [--split none|h1|h2] [--to draft|research] [--title titlu]

Agenți AI:
  ask <proiect> "întrebare" [--session id] [--sources manuscript,research,notes] [--provider p --model m]
                                             răspuns din pasajele proiectului, cu citări [n]
  mcp <proiect>... [--read-only]             pornește serverul MCP

Opțiuni generale: --lang ro|en, --json, --lock-timeout ms, --version, help
Coduri de ieșire: 0 reușit, 1 eroare, 2 folosire greșită.
`;
}

function HELP_EN() {
  return `Scribner ${VERSION} — command line

Usage: scribner <command> [arguments] [options]

Reading (never locks the project):
  info <project> [--json]                    title, author, counts, words, last modified
  list <project> [--tree] [--json]           binder items
  cat <project> <id|title> [--md|--html] [--notes]   text of one document
  search <project> <text> [--regex] [--case] [--whole] [--json]
  stats <project> [--json]                   words per document, targets, history

Export:
  compile <project> --format docx|epub|odt|rtf|html|md|txt|latex|fountain|fdx|pdf [--preset name] [-o file]
  export-notebooklm <project> -o <folder>    .md sources for NotebookLM (max 50)
  export-sources <project> -o <folder> [--format md|txt|docx] [--per chapter|document] [--max-sources N]
         [--target notebooklm|gemini|chatgpt|claude|manus|generic]
                                             sources for NotebookLM, Gemini, ChatGPT/Claude Projects, Manus
  export-docs <project> -o <folder> --format docx|md|txt|html|rtf|odt   one file per document
  backup <project> [-o folder] [--no-zip]

Writing (under the project lock):
  snapshot <project> <id|title> [--name name]
  import <file.docx|md|txt|odt|rtf|html|fountain|fdx|folder.scriv> -o <project.scribner>
         [--split none|h1|h2] [--to draft|research] [--title title]

AI agents:
  ask <project> "question" [--session id] [--sources manuscript,research,notes] [--provider p --model m]
                                             answer from project passages, with [n] citations
  mcp <project>... [--read-only]             starts the MCP server

General options: --lang ro|en, --json, --lock-timeout ms, --version, help
Exit codes: 0 ok, 1 error, 2 bad usage.
`;
}

let T = MSG.ro;

class UsageError extends Error {}

// ---------------------------------------------------------------- arguments
const VALUE_OPTS = new Set(['-o', '--out', '--format', '--preset', '--per', '--name', '--lang', '--split', '--to', '--title', '--max-sources', '--target', '--session', '--sources', '--provider', '--model', '-k', '--lock-timeout', '--keep']);
const BOOL_OPTS = new Set(['--json', '--tree', '--html', '--md', '--notes', '--regex', '--case', '--whole', '--no-zip', '--read-only', '--help', '-h', '--version', '-v']);

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      pos.push(...argv.slice(i + 1));
      break;
    }
    const eq = a.startsWith('--') ? a.indexOf('=') : -1;
    const name = eq > 0 ? a.slice(0, eq) : a;
    if (VALUE_OPTS.has(name)) {
      const v = eq > 0 ? a.slice(eq + 1) : argv[++i];
      if (v === undefined) throw new UsageError(`${name}?`);
      opt[name === '--out' ? '-o' : name] = v;
    } else if (BOOL_OPTS.has(name)) {
      opt[name] = true;
    } else if (/^-{1,2}[A-Za-z]/.test(a)) {
      opt._unknown = opt._unknown || a;
    } else {
      pos.push(a);
    }
  }
  return { pos, opt };
}

function pickLang(argv, env = process.env) {
  const i = argv.findIndex((a) => a === '--lang' || a.startsWith('--lang='));
  const v = i < 0 ? '' : argv[i].includes('=') ? argv[i].split('=')[1] : argv[i + 1] || '';
  if (v) return /^en/i.test(v) ? 'en' : 'ro';
  const sys = env.SCRIBNER_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG || '';
  return /^en/i.test(sys) ? 'en' : 'ro';
}

/** Whole number option >= min; a missing option gives `fallback`, anything else is bad usage. */
function intOpt(opt, name, min, fallback) {
  const v = opt[name];
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!/^\s*\d+\s*$/.test(String(v)) || !Number.isSafeInteger(n) || n < min) throw new UsageError(T.badValue(name, v, `${min}…`));
  return n;
}

// cmd.exe passes "C:\Carti\Drumul spre munte.scribner\" as C:\Carti\Drumul spre munte.scribner" (the \" escapes the
// quote): a stray trailing quote on a path is dropped.
const cleanPath = (p) => String(p).replace(/^"|"$/g, '').replace(/^\s+|\s+$/g, '');
const endsWithSep = (p) => /[\\/]$/.test(cleanPath(p));

function oneOf(name, value, allowed, fallback) {
  const v = value === undefined ? fallback : String(value).toLowerCase();
  if (!allowed.includes(v)) throw new UsageError(T.badValue(name, value, allowed.join('|')));
  return v;
}

// ---------------------------------------------------------------- project helpers
function resolveProject(p) {
  if (!p || !cleanPath(p)) throw new UsageError(T.needProject);
  let dir = path.resolve(cleanPath(p));
  if (path.basename(dir) === 'project.json') dir = path.dirname(dir);
  if (!fs.existsSync(path.join(dir, 'project.json'))) {
    const e = new Error(T.notProject(dir));
    throw e;
  }
  return dir;
}

const open = (dir) => store.loadProject(dir, { readOnly: true });

// Every binder item with its root ('draft' | 'research' | 'trash' | other), depth and parent.
function items(project) {
  const out = [];
  const visit = (nodes, root, depth, parent) => {
    for (const n of nodes) {
      const r = n.root || root;
      out.push({ node: n, root: r, depth, parent, isRoot: Boolean(n.root) });
      if (n.children) visit(n.children, r, depth + 1, n);
    }
  };
  visit(project.tree || [], null, 0, null);
  return out;
}

function findItem(project, query) {
  if (!query) throw new UsageError(T.needArg('id|title'));
  const all = items(project);
  const byId = all.find((i) => i.node.id === query);
  if (byId) return byId;
  const key = (s) => String(s || '').normalize('NFC').trim().toLocaleLowerCase();
  let hits = all.filter((i) => key(i.node.title) === key(query));
  if (!hits.length && /^[A-Za-z0-9-]{6,}$/.test(query)) hits = all.filter((i) => i.node.id.startsWith(query));
  if (!hits.length) throw new Error(T.notFound(query));
  if (hits.length > 1) throw new Error(T.ambiguous(query, hits.map((i) => `  ${i.node.id}  ${i.node.title}`).join('\n')));
  return hits[0];
}

const reader = (dir) => (id, kind = 'docs') => {
  try {
    return store.readDoc(dir, id, kind);
  } catch {
    return '';
  }
};

function lastModified(dir) {
  let t = 0;
  const see = (f) => {
    try {
      t = Math.max(t, fs.statSync(f).mtimeMs);
    } catch {
      /* gone */
    }
  };
  see(path.join(dir, 'project.json'));
  for (const sub of ['docs', 'notes']) {
    const d = path.join(dir, sub);
    // Only the project's own files: Thumbs.db, desktop.ini, .DS_Store are touched by the OS.
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (/^[A-Za-z0-9-]+\.html$/.test(f)) see(path.join(d, f));
  }
  return t ? new Date(t).toISOString() : null;
}

function countSnapshots(dir) {
  const d = path.join(dir, 'snapshots');
  if (!fs.existsSync(d)) return 0;
  let n = 0;
  for (const id of fs.readdirSync(d)) {
    if (id.startsWith('_')) continue;
    try {
      n += fs.readdirSync(path.join(d, id)).filter((f) => f.endsWith('.json')).length;
    } catch {
      /* not a folder */
    }
  }
  return n;
}

function wordsOf(dir, all) {
  const read = reader(dir);
  const map = {};
  for (const i of all) map[i.node.id] = i.node.type === 'file' ? 0 : store.wordCount(read(i.node.id));
  return map;
}

function summary(dir, project) {
  const all = items(project);
  const words = wordsOf(dir, all);
  const docs = all.filter((i) => !i.isRoot);
  const sum = (pred) => docs.filter(pred).reduce((a, i) => a + words[i.node.id], 0);
  return {
    title: project.title || '',
    author: project.author || '',
    path: dir,
    format: project.format,
    counts: {
      documents: docs.filter((i) => i.node.type !== 'folder').length,
      folders: docs.filter((i) => i.node.type === 'folder').length,
      manuscript: docs.filter((i) => i.root === 'draft').length,
      research: docs.filter((i) => i.root === 'research').length,
      trash: docs.filter((i) => i.root === 'trash').length,
      snapshots: countSnapshots(dir),
    },
    words: { manuscript: sum((i) => i.root === 'draft'), total: sum((i) => i.root !== 'trash') },
    targets: { draft: (project.targets && project.targets.draft) || 0, session: (project.targets && project.targets.session) || 0 },
    created: project.created || null,
    modified: lastModified(dir),
  };
}

// src/lib/*.js are ES modules in a package without "type": "module": Node loads them fine but
// prints a MODULE_TYPELESS_PACKAGE_JSON warning, which would pollute script output.
async function importEsm(rel) {
  const emit = process.emitWarning;
  process.emitWarning = (w, ...rest) => {
    const code = (rest[0] && rest[0].code) || rest[1] || (w && w.code);
    if (code === 'MODULE_TYPELESS_PACKAGE_JSON' || /MODULE_TYPELESS_PACKAGE_JSON|Module type of file/.test(String(w))) return;
    emit.call(process, w, ...rest);
  };
  try {
    return await import(pathToFileURL(path.join(ROOT, rel)).href);
  } finally {
    process.emitWarning = emit;
  }
}

// ---------------------------------------------------------------- output
const out = (s) => process.stdout.write(s.endsWith('\n') ? s : `${s}\n`);
const json = (v) => out(JSON.stringify(v, null, 2));

function outPath(o, fallbackName) {
  if (!o) return path.resolve(fallbackName);
  const p = path.resolve(cleanPath(o));
  // "-o out/" (or out\\ on Windows) is a folder even before it exists.
  return endsWithSep(o) || (fs.existsSync(p) && fs.statSync(p).isDirectory()) ? path.join(p, fallbackName) : p;
}

// Output never lands inside the project folder (it would overwrite project.json or documents).
function notInside(dir, out) {
  const real = (x) => {
    let r = path.resolve(x);
    for (let probe = r, rest = ''; ; ) {
      try { r = path.join(fs.realpathSync.native(probe), rest); break; } catch { /* not there yet */ }
      const up = path.dirname(probe);
      if (up === probe) break;
      rest = path.join(path.basename(probe), rest);
      probe = up;
    }
    return process.platform === 'win32' || process.platform === 'darwin' ? r.toLowerCase() : r;
  };
  const o = real(out);
  const d = real(dir);
  if (o === d || o.startsWith(d + path.sep)) throw new UsageError('Ieșirea (-o) nu poate fi în folderul proiectului: ar suprascrie fișierele lui. Alege alt folder.');
  return out;
}

function needOut(opt) {
  if (!opt['-o'] || !cleanPath(opt['-o'])) throw new UsageError(T.needOut);
  return path.resolve(cleanPath(opt['-o']));
}

const lockOpts = (opt) => (opt['--lock-timeout'] !== undefined ? { timeoutMs: intOpt(opt, '--lock-timeout', 0) } : undefined);

// ---------------------------------------------------------------- commands
const commands = {
  info(pos, opt) {
    const dir = resolveProject(pos[0]);
    const s = summary(dir, open(dir));
    if (opt['--json']) return json(s);
    out(
      [
        `${T.title}: ${s.title}`,
        `${T.author}: ${s.author || '—'}`,
        `${T.documents}: ${s.counts.documents}  ${T.folders}: ${s.counts.folders}`,
        `${T.manuscript}: ${s.counts.manuscript}  ${T.research}: ${s.counts.research}  ${T.trash}: ${s.counts.trash}  ${T.snapshots}: ${s.counts.snapshots}`,
        `${T.words} (${T.manuscript.toLowerCase()}): ${s.words.manuscript}` + (s.targets.draft ? ` / ${s.targets.draft}` : ''),
        `${T.words} (${T.total.toLowerCase()}): ${s.words.total}`,
        `${T.modified}: ${s.modified || '—'}`,
      ].join('\n'),
    );
  },

  list(pos, opt) {
    const dir = resolveProject(pos[0]);
    const project = open(dir);
    const all = items(project);
    const words = wordsOf(dir, all);
    if (opt['--json']) {
      return json(
        all.map((i) => ({
          id: i.node.id,
          title: i.node.title || '',
          type: i.node.type || 'text',
          root: i.root,
          depth: i.depth,
          parent: i.parent ? i.parent.id : null,
          words: words[i.node.id],
          synopsis: i.node.synopsis || '',
          label: i.node.label || '',
          status: i.node.status || '',
          includeInCompile: i.node.includeInCompile !== false,
        })),
      );
    }
    for (const i of all) {
      const mark = i.node.type === 'folder' || i.isRoot ? '/' : '';
      if (opt['--tree']) out(`${'  '.repeat(i.depth)}${i.node.title || '—'}${mark}  [${i.node.id}] ${words[i.node.id]}`);
      else if (!i.isRoot) out(`${i.node.id}\t${i.root}\t${i.node.type || 'text'}\t${words[i.node.id]}\t${i.node.title || ''}`);
    }
  },

  cat(pos, opt) {
    const dir = resolveProject(pos[0]);
    const { node } = findItem(open(dir), pos[1]);
    const html = reader(dir)(node.id, opt['--notes'] ? 'notes' : 'docs');
    if (opt['--html']) return out(html);
    if (opt['--md']) return out(require('../lib/exporters.cjs').htmlToMarkdown(html));
    out(store.htmlToText(html).replace(/\n{3,}/g, '\n\n').trim());
  },

  async search(pos, opt) {
    const dir = resolveProject(pos[0]);
    const query = pos.slice(1).join(' ');
    if (!query) throw new UsageError(T.needArg('query'));
    const project = open(dir);
    const read = reader(dir);
    const docs = {};
    const notes = {};
    for (const i of items(project)) {
      docs[i.node.id] = read(i.node.id);
      notes[i.node.id] = read(i.node.id, 'notes');
    }
    const { searchProject, buildTerms } = await importEsm('src/lib/projectSearch.js');
    const criteria = { query, regex: Boolean(opt['--regex']), caseSensitive: Boolean(opt['--case']), wholeWord: Boolean(opt['--whole']), operator: 'exact' };
    const terms = buildTerms(criteria);
    if (terms === null || terms.some((t) => !t)) throw new UsageError(T.badRegex);
    const roots = new Map(items(project).map((i) => [i.node.id, i.root]));
    const res = searchProject(project, docs, notes, criteria).map((r) => ({
      id: r.node.id,
      title: r.node.title || '',
      root: roots.get(r.node.id) || null,
      count: Object.values(r.fields).reduce((a, b) => a + b, 0),
      fields: r.fields,
      snippets: r.snippets.map((s) => ({ field: s.field, before: s.before, match: s.match, after: s.after })),
    }));
    if (opt['--json']) return json({ query, total: res.reduce((a, r) => a + r.count, 0), results: res });
    if (!res.length) return out(T.noResults);
    for (const r of res) {
      out(`${r.title}  [${r.id}]  (${r.count})`);
      for (const s of r.snippets) out(`    ${s.field}: ${s.before.replace(/\s+/g, ' ')}[${s.match}]${s.after.replace(/\s+/g, ' ')}`);
    }
    out(T.results(res.reduce((a, r) => a + r.count, 0), res.length));
  },

  stats(pos, opt) {
    const dir = resolveProject(pos[0]);
    const project = open(dir);
    const history = require('../lib/history.cjs');
    const s = summary(dir, project);
    const all = items(project).filter((i) => !i.isRoot && i.node.type !== 'file');
    const words = wordsOf(dir, all);
    const days = history.summarize(history.readHistory(dir));
    const recent = days.slice(-30);
    const data = {
      title: s.title,
      words: s.words,
      targets: { ...s.targets, draftProgress: s.targets.draft ? Math.round((s.words.manuscript / s.targets.draft) * 1000) / 10 : null },
      documents: all.map((i) => ({
        id: i.node.id,
        title: i.node.title || '',
        root: i.root,
        words: words[i.node.id],
        target: Number(i.node.target) || 0,
        progress: Number(i.node.target) ? Math.round((words[i.node.id] / Number(i.node.target)) * 1000) / 10 : null,
      })),
      history: {
        days: days.length,
        first: days.length ? days[0].date : null,
        last: days.length ? days[days.length - 1].date : null,
        draftWritten: days.reduce((a, d) => a + (d.draft || 0), 0),
        totalWritten: days.reduce((a, d) => a + (d.total || 0), 0),
        recent: recent.map((d) => ({ date: d.date, draft: d.draft, total: d.total })),
      },
    };
    if (opt['--json']) return json(data);
    out(`${data.title}`);
    out(`${T.manuscript}: ${data.words.manuscript} ${T.words}` + (data.targets.draft ? ` / ${T.target.toLowerCase()} ${data.targets.draft} (${data.targets.draftProgress}%)` : ''));
    out(`${T.total}: ${data.words.total} ${T.words}  ${T.session}: ${data.targets.session}`);
    out('');
    for (const d of data.documents) {
      out(`${String(d.words).padStart(7)}  ${d.target ? `${T.target.toLowerCase()} ${d.target} (${d.progress}%)  ` : ''}${d.root === 'draft' ? '' : `[${d.root}] `}${d.title}`);
    }
    out('');
    out(`${T.history}: ${data.history.days} ${T.days}` + (data.history.days ? ` (${data.history.first} … ${data.history.last}), ${T.manuscript.toLowerCase()} +${data.history.draftWritten}` : ''));
    for (const d of data.history.recent.slice(-7)) out(`  ${d.date}  ${d.draft >= 0 ? '+' : ''}${d.draft}`);
  },

  async compile(pos, opt) {
    const dir = resolveProject(pos[0]);
    const compile = require('../lib/compile.cjs');
    const F = require('../lib/compileFormats.cjs');
    let format = oneOf('--format', opt['--format'], ['docx', 'pdf', 'epub', 'odt', 'rtf', 'html', 'md', 'mmd', 'txt', 'latex', 'tex', 'fountain', 'fdx'], 'docx');
    if (format === 'latex') format = 'tex';
    if (format === 'pdf') {
      const e = new Error(T.pdfNeedsApp);
      throw e;
    }
    const project = open(dir);
    const options = {};
    if (opt['--preset']) {
      const want = String(opt['--preset']).normalize('NFC').toLocaleLowerCase();
      const f = F.allFormats(project).find((x) => x.id.toLocaleLowerCase() === want || String(x.name || '').normalize('NFC').toLocaleLowerCase() === want);
      if (!f) throw new UsageError(`${T.noPreset(opt['--preset'])} (${F.allFormats(project).map((x) => x.id).join(', ')})`);
      options.formatId = f.id;
    }
    const info = compile.OUTPUT_FORMATS[format];
    const data = await compile.compile(project, reader(dir), format, options);
    const file = notInside(dir, outPath(opt['-o'], `${store.projectDirFor('', project.title || 'Proiect').replace(/\.scribner$/, '')}.${info.ext}`));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    if (opt['--json']) return json({ file, format, bytes: fs.statSync(file).size });
    out(T.written(file));
  },

  'export-notebooklm'(pos, opt) {
    const dir = resolveProject(pos[0]);
    const outDir = notInside(dir, needOut(opt));
    const { exportNotebookLm } = require('../lib/notebookLm.cjs');
    const res = exportNotebookLm({ project: open(dir), readDoc: reader(dir), outDir });
    if (opt['--json']) return json(res);
    out(T.files(res.files.length, res.dir));
    if (res.warnings.length) process.stderr.write(`${T.warnings}:\n${res.warnings.map((w) => `  ${w}`).join('\n')}\n`);
  },

  async 'export-sources'(pos, opt) {
    const dir = resolveProject(pos[0]);
    const outDir = notInside(dir, needOut(opt));
    const format = oneOf('--format', opt['--format'], ['md', 'txt', 'docx'], 'md');
    const per = oneOf('--per', opt['--per'], ['chapter', 'document'], 'chapter');
    // --target only sets the source limit: NotebookLM takes at most 50 sources (chapters are merged).
    const target = oneOf('--target', opt['--target'], Object.keys(TARGET_LIMITS), 'generic');
    const maxSources = intOpt(opt, '--max-sources', 2, TARGET_LIMITS[target]);
    const res = { target, ...(await exportSources(dir, open(dir), outDir, { format, per, maxSources })) };
    if (opt['--json']) return json(res);
    out(T.files(res.files.length, res.dir));
    if (res.warnings.length) process.stderr.write(`${T.warnings}:\n${res.warnings.map((w) => `  ${w}`).join('\n')}\n`);
  },

  async 'export-docs'(pos, opt) {
    const dir = resolveProject(pos[0]);
    const outDir = notInside(dir, needOut(opt));
    const ex = require('../lib/exporters.cjs');
    const format = oneOf('--format', opt['--format'], ex.FORMATS, 'docx');
    const read = reader(dir);
    const res = await ex.exportDocuments(open(dir), dir, (id) => read(id), (id) => read(id, 'notes'), null, outDir, { format, withNotes: Boolean(opt['--notes']) });
    if (opt['--json']) return json({ dir: outDir, count: res.count, files: res.files });
    out(T.files(res.files.length, outDir));
  },

  async backup(pos, opt) {
    const dir = resolveProject(pos[0]);
    const backup = require('../lib/backup.cjs');
    const keep = intOpt(opt, '--keep', 1, 10);
    const file = await backup.backupProject(dir, opt['-o'] ? path.resolve(cleanPath(opt['-o'])) : undefined, keep, { zip: !opt['--no-zip'] });
    if (opt['--json']) return json({ file });
    out(T.backupDone(file));
  },

  snapshot(pos, opt) {
    const dir = resolveProject(pos[0]);
    const { node } = findItem(open(dir), pos[1]);
    const name = opt['--name'] || 'Snapshot';
    const lock = lockOpts(opt);
    const snap = store.withProjectLock(dir, () => store.takeSnapshot(dir, node.id, name), lock);
    if (opt['--json']) return json({ id: node.id, title: node.title || '', ...snap });
    out(T.snapshotTaken(node.title || node.id, snap.name));
  },

  async import(pos, opt) {
    const src = pos[0];
    if (!src) throw new UsageError(T.needArg('file'));
    const srcPath = path.resolve(cleanPath(src));
    if (!fs.existsSync(srcPath)) throw new Error(T.notFound(srcPath));
    const target = needOut(opt);
    if (/\.scriv$/i.test(srcPath) || fs.statSync(srcPath).isDirectory()) {
      const { importScriv } = require('../lib/scrivImport.cjs');
      const parent = /\.scribner$/i.test(target) ? path.dirname(target) : target;
      if (/\.scribner$/i.test(target) && fs.existsSync(target)) throw new Error(T.notProject(target));
      fs.mkdirSync(parent, { recursive: true });
      const res = importScriv(srcPath, parent);
      let finalDir = res.dir;
      if (/\.scribner$/i.test(target) && path.resolve(res.dir) !== target) {
        store.renameWithRetry(res.dir, target);
        finalDir = target;
      }
      const count = items(res.project).filter((i) => !i.isRoot).length;
      if (opt['--json']) return json({ project: finalDir, documents: count, report: res.report || null });
      return out(T.imported(count, finalDir));
    }
    const split = oneOf('--split', opt['--split'], ['none', 'h1', 'h2'], 'none');
    const lock = lockOpts(opt);
    const to = oneOf('--to', opt['--to'], ['draft', 'research'], 'draft');
    const { fileToHtml } = require('../lib/importers.cjs');
    const { splitHtml } = require('../lib/docxImport.cjs');
    const base = path.basename(srcPath).replace(/\.[^.]+$/, '');
    const parts = splitHtml(await fileToHtml(srcPath), split, '#', base);
    const created = !fs.existsSync(path.join(target, 'project.json'));
    if (created) {
      fs.mkdirSync(target, { recursive: true });
      store.createProject(target, opt['--title'] || path.basename(target).replace(/\.scribner$/i, '') || base);
    }
    const added = [];
    store.withProjectLock(
      target,
      () => {
        const raw = fs.readFileSync(path.join(target, 'project.json'), 'utf8');
        const project = store.parseProject(raw);
        const rootNode = (project.tree || []).find((r) => r.root === to);
        if (!rootNode) throw new Error(T.notFound(to));
        // A project created just now for the import keeps only the imported text, not the empty
        // starter document of the blank template.
        if (created) project.tree[0].children = (project.tree[0].children || []).filter((n) => store.htmlToText(store.readDoc(target, n.id)).trim());
        for (const p of parts) {
          const node = store.newNode('text', p.title);
          store.writeDoc(target, node.id, 'docs', p.html);
          (rootNode.children = rootNode.children || []).push(node);
          added.push({ id: node.id, title: node.title });
        }
        store.backupFile(target, 'project.json', raw);
        store.saveProject(target, project);
      },
      lock,
    );
    if (opt['--json']) return json({ project: target, documents: added.length, added });
    out(T.imported(added.length, target));
  },

  // Question about the project, answered from retrieved passages (lib/rag.cjs) by an AI provider
  // (lib/aiProviders.cjs). Key from the provider's environment variable (lib/aiPresets.json envKey).
  // --session <id> keeps the conversation in <project>/research/chats/<id>.json for follow-ups.
  async ask(pos, opt) {
    const dir = resolveProject(pos[0]);
    const question = pos.slice(1).join(' ').trim();
    if (!question) throw new UsageError(T.needArg('question'));
    const rag = require('../lib/rag.cjs');
    const ai = require('../lib/aiProviders.cjs');
    const PRESETS = require('../lib/aiPresets.json');
    const KINDS = { manuscript: 'docs', research: 'research', notes: 'notes' };
    const wanted = String(opt['--sources'] ?? 'manuscript,research,notes').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (!wanted.length) throw new UsageError(T.badValue('--sources', opt['--sources'], Object.keys(KINDS).join(',')));
    for (const w of wanted) if (!KINDS[w]) throw new UsageError(T.badValue('--sources', w, Object.keys(KINDS).join(',')));
    const kinds = new Set(wanted.map((w) => KINDS[w]));
    const session = opt['--session'];
    if (session !== undefined && !/^[\w-]{1,64}$/.test(session)) throw new UsageError(T.badValue('--session', session, '[A-Za-z0-9_-]'));
    const chatFile = session ? path.join(dir, 'research', 'chats', `${session}.json`) : null;
    const k = intOpt(opt, '-k', 1, 6);
    let chat = { id: session || null, created: new Date().toISOString(), turns: [] };
    if (chatFile && fs.existsSync(chatFile)) {
      try {
        const saved = JSON.parse(fs.readFileSync(chatFile, 'utf8').replace(/^\ufeff/, ''));
        if (!saved || !Array.isArray(saved.turns)) throw new Error('turns');
        chat = { ...chat, ...saved, turns: saved.turns.filter((t) => t && typeof t.question === 'string') };
      } catch {
        // Damaged session (crash while saving, edited by hand): kept aside, a new one starts.
        const bad = `${chatFile}.bad-${Date.now()}`;
        try {
          fs.renameSync(chatFile, bad);
        } catch {
          /* replaced by the next save */
        }
        process.stderr.write(`${T.badSession(path.basename(bad))}\n`);
      }
    }

    const index = rag.createIndex();
    index.update(rag.collectSources(store, dir).filter((x) => kinds.has(x.kind)));
    // Follow-ups ("and in chapter 3?") retrieve with the previous question too.
    const prev = chat.turns.length ? chat.turns[chat.turns.length - 1].question : '';
    // Same budget as the app's research conversation: the last 6 turns, long answers shortened.
    const past = require('../lib/researchChat.cjs').trimHistory(chat.turns.map((t) => ({ q: t.question, answer: t.answer })));
    const history = past.map((t) => `Întrebare: ${t.q}\nRăspuns: ${t.answer}`).join('\n\n');

    const provider = opt['--provider'] || Object.keys(PRESETS).find((p) => PRESETS[p].envKey && process.env[PRESETS[p].envKey]) || 'anthropic';
    if (!PRESETS[provider]) throw new UsageError(T.badValue('--provider', provider, Object.keys(PRESETS).join('|')));
    const apiKey = (PRESETS[provider].envKey && process.env[PRESETS[provider].envKey]) || '';
    const run = async ({ text, question: q }) => {
      const prompt = `${history ? `Conversația de până acum:\n${history}\n\n` : ''}Pasaje din proiect:\n${text}\n\n${q}`;
      // Offline test provider: only with NODE_ENV=test and SCRIBNER_AI_FAKE=1 (never set by the app).
      if (process.env.NODE_ENV === 'test' && process.env.SCRIBNER_AI_FAKE === '1') return { text: `FAKE ${provider}: ${question} [1]${history ? ' (cu istoric)' : ''}` };
      if (!apiKey && PRESETS[provider].needsKey) throw new Error(ai.missingKeyMessage(provider, T === MSG.en ? 'en' : 'ro') || `${PRESETS[provider].envKey}?`);
      return ai.completeFull({ provider, model: opt['--model'], apiKey, prompt, maxTokens: 4000 });
    };
    const res = await rag.ask({ query: (q, o) => index.query(prev ? `${q} ${prev}` : q, o) }, question, run, { k });
    const sources = res.passages.map((p, i) => ({ n: i + 1, id: p.docId, title: p.title || p.docId, kind: p.kind || null }));
    if (chatFile) {
      chat.turns.push({ question, answer: res.answer, sources, provider, time: new Date().toISOString() });
      fs.mkdirSync(path.dirname(chatFile), { recursive: true });
      store.writeAtomic(chatFile, JSON.stringify(chat, null, 2));
    }
    if (opt['--json']) return json({ question, answer: res.answer, sources, session: session || null, turn: chat.turns.length || 1, provider });
    out(res.answer.trim());
    if (sources.length) {
      out('');
      for (const x of sources) out(`[${x.n}] ${x.title}`);
    }
  },

  mcp(pos, opt) {
    if (!pos.length) throw new UsageError(T.needProject);
    const dirs = pos.map(resolveProject);
    const args = [path.join(ROOT, 'mcp', 'server.mjs'), ...dirs.flatMap((d) => ['--project', d]), ...(opt['--read-only'] ? ['--read-only'] : [])];
    const { spawn } = require('child_process');
    // process.execPath is node, or Scribner.exe with ELECTRON_RUN_AS_NODE=1 (kept in env).
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
    return new Promise((resolve) => {
      for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
      child.on('exit', (code) => resolve(code == null ? 1 : code));
      child.on('error', (e) => {
        process.stderr.write(`${e.message}\n`);
        resolve(1);
      });
    });
  },
};

// ---------------------------------------------------------------- export-sources
const TARGET_LIMITS = { generic: 1000, notebooklm: 50, gemini: 1000, chatgpt: 1000, claude: 1000, manus: 1000 };
// Generic "sources for AI notebooks" (NotebookLM, Gemini, ChatGPT/Claude Projects, Manus): one file per chapter (or per document) + research + notes +
// an index with synopses, built with the same source builder as the NotebookLM export.
async function exportSources(dir, project, outRoot, { format, per, maxSources }) {
  const { buildSources } = require('../lib/notebookLm.cjs');
  const { safeName } = require('../lib/fsNames.cjs');
  const ex = require('../lib/exporters.cjs');
  const { markdownToHtml } = require('../lib/importers.cjs');
  const read = reader(dir);
  const base = buildSources(project, read, { maxSources });
  let chapters = base.chapters;
  const warnings = [...base.warnings];
  if (per === 'document') {
    // Every manuscript item becomes its own source: a flat copy of the draft (no children).
    const flat = [];
    const draft = (project.tree || []).find((r) => r.root === 'draft') || { children: [] };
    store.walk(draft.children || [], (n) => {
      if (n.type !== 'file') flat.push({ ...n, children: undefined });
    });
    const fake = { ...project, tree: [{ ...draft, children: flat }] };
    // The research and notes sources of `base` come on top: the documents get the slots left.
    const docs = buildSources(fake, read, { maxSources: Math.max(2, maxSources - base.research.length - base.notes.length), includeNotes: false, includeResearch: false });
    chapters = docs.chapters;
    for (const w of docs.warnings) if (!warnings.includes(w)) warnings.push(w);
  }
  const outDir = path.join(outRoot, safeName(`Surse - ${project.title || 'Proiect'}`));
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (/\.(md|txt|docx)$/i.test(f) || f === 'sources.json') fs.unlinkSync(path.join(outDir, f));
  const used = new Set();
  const files = [];
  const manifest = [];
  const write = async (name, kind, src) => {
    const stem = safeName(name).slice(0, 120) || 'Sursa';
    let file = `${stem}.${format}`;
    for (let i = 2; used.has(file.normalize('NFC').toLowerCase()); i++) file = `${stem} (${i}).${format}`;
    used.add(file.normalize('NFC').toLowerCase());
    let data;
    if (format === 'md') data = `${src.text.trim()}\n`;
    else if (format === 'txt') data = `${ex.htmlToPlain(markdownToHtml(src.text)).trim()}\n`;
    else data = await ex.renderDocument('docx', { id: 'source', title: src.title }, markdownToHtml(src.text), { author: project.author || '' });
    fs.writeFileSync(path.join(outDir, file), data);
    files.push(file);
    manifest.push({ file, kind, title: src.title, words: src.words });
  };
  await write('00 - Cuprins', 'index', base.index);
  const pad = Math.max(2, String(chapters.length).length);
  for (let i = 0; i < chapters.length; i++) await write(`${String(i + 1).padStart(pad, '0')} - ${chapters[i].title}`, per, chapters[i]);
  for (const r of base.research) await write(r.title, 'research', r);
  for (const n of base.notes) await write(n.title, 'notes', n);
  const words = manifest.reduce((a, m) => a + m.words, 0);
  fs.writeFileSync(path.join(outDir, 'sources.json'), `${JSON.stringify({ title: project.title || '', format, per, words, sources: manifest }, null, 2)}\n`);
  return { dir: outDir, format, per, files, words, sources: manifest, warnings };
}

// ---------------------------------------------------------------- main
async function main(argv) {
  T = MSG[pickLang(argv)];
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`${T.usage}: ${e.message}\n`);
    return 2;
  }
  const { pos, opt } = parsed;
  if (opt['--version'] || opt['-v']) {
    out(VERSION);
    return 0;
  }
  const cmd = pos.shift();
  if (!cmd || cmd === 'help' || opt['--help'] || opt['-h']) {
    out(T.help);
    return cmd || opt['--help'] || opt['-h'] ? 0 : 2;
  }
  const fn = commands[cmd];
  if (!fn) {
    process.stderr.write(`${T.unknownCommand(cmd)}\n`);
    return 2;
  }
  if (opt._unknown) {
    process.stderr.write(`${T.unknownOption(opt._unknown)}\n`);
    return 2;
  }
  try {
    const code = await fn(pos, opt);
    return typeof code === 'number' ? code : 0;
  } catch (e) {
    if (e instanceof UsageError) {
      process.stderr.write(`${T.usage}: ${e.message}\n`);
      return 2;
    }
    const msg = /project\.json\.lock/.test(e.message) ? T.locked : e.message;
    process.stderr.write(`${msg}\n`);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

module.exports = { main, parseArgs, pickLang, exportSources };
