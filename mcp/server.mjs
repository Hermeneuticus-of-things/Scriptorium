#!/usr/bin/env node
// Scribner MCP server: lets AI agents (Claude Code, Claude Desktop, any MCP
// client) read and edit Scribner projects.
//
//   node mcp/server.mjs --project "D:\Carti\Drumul spre munte.scribner" [--project …] [--read-only]
//
// Safety: only the projects passed on the command line are reachable; every write
// takes a snapshot first and is appended to <project>/agent-log.jsonl.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { findNode, findParent, flatten, insertNear, moveNode, moveToTrash, updateNode } from '../src/lib/tree.js';
import { buildRegex, findInHtml, replaceInHtml } from '../src/lib/search.js';
import { htmlToManuscript, lint, manuscriptToHtml, profileFor, reattach, summarize } from '../src/lib/editorial.js';
import { styleCss, stylesOf } from '../src/lib/styles.js';
import { projectNoteTabs } from '../src/lib/projectNotes.js';
import { registerFullTools } from './fullTools.mjs';
import { diffParagraphs } from '../src/lib/authorText.js';
import { AGENT, logRow, readPeers as readPeersRaw, seenTimes } from '../src/lib/team.js';

// Locks are judged by when this server saw each presence file change, not by the other
// computer's clock (it may run ahead or behind). A lock seen for the first time counts as live.
const seenPresence = new Map();
const readPeers = (files) => {
  const now = Date.now();
  for (const [name, t] of Object.entries(files || {})) {
    if (!/^presence-.+\.json$/.test(name)) continue;
    try {
      const m = JSON.parse(t).machine;
      if (m && !seenPresence.has(m)) seenPresence.set(m, { stamp: JSON.parse(t).time, at: now });
    } catch {
      /* unreadable presence file */
    }
  }
  return readPeersRaw(seenTimes(files, seenPresence, now), { now });
};

const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const compile = require('../lib/compile.cjs');
const history = require('../lib/history.cjs');
const compileFormats = require('../lib/compileFormats.cjs');
const teamStore = require('../lib/teamStore.cjs');

// Team work (src/lib/team.js): in a project shared by a team (it has a team/ folder), the agent's
// changes to a document go in the change log as a separate person, "agent".
const AGENT_WHO = { name: AGENT, color: '#7a7a7a', machine: AGENT };
const writeDocPlain = store.writeDoc;
store.writeDoc = (dir, id, kind, html) => {
  const logged = kind === 'docs' && fs.existsSync(path.join(dir, 'team'));
  // A document a person locked (Scribner, lock button) is not written by the agent either.
  if (logged) {
    const lock = readPeers(teamStore.teamFiles(dir)).locks[id];
    if (lock) throw new Error(`Documentul e blocat de ${lock.who} (lucru în echipă); nu l-am modificat. Cere-i să-l deblocheze sau lucrează la alt document.`);
  }
  let before = '';
  if (logged) {
    try {
      before = store.readDoc(dir, id, 'docs');
    } catch {
      /* new document */
    }
  }
  const out = writeDocPlain(dir, id, kind, html);
  if (logged && before !== html) {
    try {
      const chunks = diffParagraphs(before, html);
      let title = '';
      try {
        title = findNode(store.loadProject(dir, { readOnly: true }).tree, id)?.title || '';
      } catch {
        /* title is optional */
      }
      if (chunks.length) teamStore.teamWrite(dir, 'log-agent.jsonl', `${JSON.stringify(logRow({ who: AGENT_WHO, doc: id, title, chunks }))}\n`, { append: true });
    } catch {
      /* the log never blocks a write */
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Arguments

const args = process.argv.slice(2);
const projects = [];
let readOnly = false;
let anonymizeOn = false; // --anonymize: private names, e-mails and phones go out as tokens
// --http <port>: Streamable HTTP instead of stdio (another computer, a home server, a tunnel).
let httpPort = 0;
let httpHost = '127.0.0.1';
let httpToken = process.env.SCRIBNER_MCP_TOKEN || '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project' && args[i + 1]) projects.push(path.resolve(args[++i]));
  else if (args[i] === '--read-only') readOnly = true;
  else if (args[i] === '--anonymize') anonymizeOn = true;
  else if (args[i] === '--http' && args[i + 1]) httpPort = Number(args[++i]);
  else if (args[i] === '--host' && args[i + 1]) httpHost = args[++i];
  else if (args[i] === '--token' && args[i + 1]) httpToken = args[++i];
}
for (const p of (process.env.SCRIBNER_PROJECTS || '').split(path.delimiter).filter(Boolean)) projects.push(path.resolve(p));
// No --project: the projects in Scribner's recent list (on this computer), so one general command
// works for everyone and names no book. Missing folders are skipped.
if (!projects.length) {
  const recent = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(process.env.SCRIBNER_USER_DATA ? path.resolve(process.env.SCRIBNER_USER_DATA) : defaultUserData(), 'settings.json'), 'utf8')).recent || [];
    } catch {
      return [];
    }
  })();
  for (const r of recent) {
    const d = typeof r === 'string' ? r : r && r.dir;
    if (d && fs.existsSync(path.join(d, 'project.json')) && !projects.includes(path.resolve(d))) projects.push(path.resolve(d));
  }
}
if (!projects.length) {
  process.stderr.write('Niciun proiect: deschide unul în Scribner (intră în lista recentă) sau dă --project <cale către proiect.scribner> [--project …] [--read-only]\n');
  process.exit(2);
}
for (const p of projects) {
  if (!fs.existsSync(path.join(p, 'project.json'))) {
    process.stderr.write(`Nu e un proiect Scribner: ${p}\n`);
    process.exit(2);
  }
}

// The app's user data folder (settings.json, user templates, global compile formats).
// Read only; SCRIBNER_USER_DATA overrides it (portable installs, tests).
function defaultUserData() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Scribner');
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Scribner');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Scribner');
}
const userData = process.env.SCRIBNER_USER_DATA ? path.resolve(process.env.SCRIBNER_USER_DATA) : defaultUserData();
function readJson(file, def) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return def;
  }
}
const appSettings = () => readJson(path.join(userData, 'settings.json'), {});
try {
  compileFormats.setGlobalFormats(readJson(path.join(userData, 'compile-formats.json'), []));
} catch {
  /* unreadable global formats: presets only */
}

// ---------------------------------------------------------------------------
// Helpers

function projectDir(project) {
  if (!project) return projects[0];
  const hit = projects.find((p) => p === path.resolve(project) || path.basename(p) === project || path.basename(p).replace(/\.(scribner|scriptorium)$/i, '') === project);
  if (!hit) throw new Error(`Proiect necunoscut: ${project}. Disponibile: ${projects.map((p) => path.basename(p)).join(', ')}`);
  return hit;
}

// Reads never touch the disk (no folders created, even in --read-only mode).
const load = (dir) => store.loadProject(dir, { readOnly: true });
// Binder writes: read-modify-write of project.json under the lock shared with the app
// (lib/store.cjs updateProject), so a concurrent app save is never overwritten with a
// stale copy; the previous project.json is kept in snapshots/_backup/.
const mutate = (dir, fn) => store.updateProject(dir, fn, { before: (raw) => store.backupFile(dir, 'project.json', raw) });
const trashIds = (p) => {
  const trash = p.tree.find((n) => n.root === 'trash');
  return new Set(trash ? flatten(trash.children || []).map((n) => n.id) : []);
};

function requireWritable() {
  if (readOnly) throw new Error('Serverul rulează în modul doar-citire (--read-only).');
}

// Long strings (whole documents) are shortened in the log: it records what an agent
// did, the text itself is in the documents and their snapshots.
const MAX_LOG_STRING = 500;
function shorten(v) {
  if (typeof v === 'string') return v.length > MAX_LOG_STRING ? `${v.slice(0, MAX_LOG_STRING)}… [${v.length} caractere]` : v;
  if (Array.isArray(v)) return v.slice(0, 50).map(shorten);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shorten(x)]));
  return v;
}
function log(dir, tool, input, result) {
  const line = JSON.stringify({ date: new Date().toISOString(), tool, input: shorten(input), result: shorten(result) }) + '\n';
  fs.appendFileSync(path.join(dir, 'agent-log.jsonl'), line);
}

function nodeOrThrow(project, id) {
  const n = findNode(project.tree, id);
  if (!n) throw new Error(`Element inexistent: ${id}`);
  return n;
}

function textNodeOrThrow(dir, id) {
  const n = nodeOrThrow(load(dir), id);
  if (n.type !== 'text') throw new Error('Operația se aplică doar documentelor text.');
  return n;
}

function wordCount(dir, id) {
  return store.wordCount(store.readDoc(dir, id));
}

const text = (s) => ({ content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] });

// global: the tool does not work on an open project (create / import a new one); its
// write is logged in the project it creates (result.dir), or in the first project.
// A document a person locked is refused before anything is written (no stray snapshot or new
// document left behind by a half-run tool).
function assertUnlocked(dir, id) {
  if (!dir || !id || !fs.existsSync(path.join(dir, 'team'))) return;
  const lock = readPeers(teamStore.teamFiles(dir)).locks[id];
  if (lock) throw new Error(`Documentul e blocat de ${lock.who} (lucru în echipă); nu l-am modificat. Cere-i să-l deblocheze sau lucrează la alt document.`);
}
function assertSubtreeUnlocked(dir, ids) {
  const locks = lockedIds(dir);
  if (!Object.keys(locks).length) return;
  let p;
  try {
    p = store.loadProject(dir, { readOnly: true });
  } catch {
    return;
  }
  const find = (list, id) => {
    for (const n of list || []) {
      if (n.id === id) return n;
      const f = find(n.children, id);
      if (f) return f;
    }
    return null;
  };
  for (const id of ids.filter(Boolean)) {
    for (const n of flatten(find(p.tree, id)?.children || [])) {
      if (locks[n.id]) throw new Error(`„${n.title}” e blocat de ${locks[n.id].who} (lucru în echipă); nu am mutat dosarul care îl conține.`);
    }
  }
}
const lockedIds = (dir) => (dir && fs.existsSync(path.join(dir, 'team')) ? readPeers(teamStore.teamFiles(dir)).locks : {});

// Position of `target` in the HTML text, never inside a tag or an attribute value
// (a quote like "comment" must not match data-comment="…").
function textIndexOf(html, target, from = 0) {
  for (let i = html.indexOf(target, from); i >= 0; i = html.indexOf(target, i + 1)) {
    if (html.lastIndexOf('<', i) <= html.lastIndexOf('>', i) && !target.includes('<')) return i;
  }
  return -1;
}

// --anonymize: only what <project>/private-names.txt lists (one name per line; "+email" and
// "+telefon" add e-mail addresses and phone numbers). Characters and invented details stay as they are.
const { createAnonymizer } = require('../lib/anonymize.cjs');
let anon = null;
function anonymizer() {
  if (!anonymizeOn) return null;
  if (!anon) {
    const names = [];
    for (const d of projects) {
      try {
        names.push(...fs.readFileSync(path.join(d, 'private-names.txt'), 'utf8').split(/\r?\n/));
      } catch {
        /* no list for this project */
      }
    }
    // Lines "+email" / "+telefon" in the list also hide e-mail addresses / phone numbers; in a
    // novel they are usually invented, so by default only the listed names are hidden.
    const flags = new Set(names.map((n) => n.trim().toLowerCase()));
    anon = createAnonymizer(names.filter((n) => !/^\s*\+/.test(n)), { emails: flags.has('+email'), phones: flags.has('+telefon') });
  }
  return anon;
}

function tool(name, description, shape, handler, { writes = false, global = false } = {}) {
  // Hints for the client's approval gates: reads run freely, changes ask, and the ones that remove
  // or overwrite text are marked destructive (they still take a snapshot or backup first).
  const annotations = {
    readOnlyHint: !writes,
    destructiveHint: writes && /^(trash|empty|delete|remove|replace|restore|merge|split|write|set_notes|convert|apply|rename|editorial_autofix)/.test(name),
    idempotentHint: !writes,
    openWorldHint: /web|lookup|import_web|zotero/.test(name),
  };
  server.registerTool(name, { title: name, description, inputSchema: shape, annotations }, async (input) => {
    try {
      if (writes) requireWritable();
      const dir = global ? null : projectDir(input.project);
      if (writes && dir) for (const id of [input.id, ...(Array.isArray(input.ids) && name !== 'replace' ? input.ids : [])]) assertUnlocked(dir, id);
      // Moving or trashing a folder moves the locked documents inside it too.
      if (writes && dir && /^(trash_item|move_item|merge_documents|empty_trash)$/.test(name)) assertSubtreeUnlocked(dir, name === 'empty_trash' ? [store.loadProject(dir, { readOnly: true }).tree.find((n) => n.root === 'trash')?.id] : [input.id, ...(Array.isArray(input.ids) ? input.ids : [])]);
      const an = anonymizer();
      const args = an ? an.hydrate(input) : input; // tokens the agent sends back become real names here
      const result = await handler(dir, args);
      if (writes) log(dir || (result && typeof result === 'object' && result.dir) || projects[0], name, args, result);
      const out = text(result);
      if (an) out.content = out.content.map((c) => (c.type === 'text' ? { ...c, text: an.pack(c.text) } : c));
      return out;
    } catch (err) {
      const an = anonymizer();
      return { content: [{ type: 'text', text: `Eroare: ${an ? an.pack(err.message) : err.message}` }], isError: true };
    }
  });
}

const project = z.string().optional().describe('Numele sau calea proiectului (implicit primul proiect)');

// Files the server writes for a client (compile, exports, backups of new projects) never
// land inside a project folder: a client cannot overwrite project files through an export.
function outsideProjects(p, what = 'output_path') {
  // Real path, case-folded where the file system ignores case: no way around it by C:/c: or a link.
  const norm = (x) => {
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
  const real = norm(p);
  if (hiddenPath(path.resolve(p)) || hiddenPath(real)) throw new Error(`${what}: nu scriu în foldere sau fișiere ascunse ori de sistem.`);
  if (projects.map(norm).some((pd) => real === pd || real.startsWith(pd + path.sep))) throw new Error(`${what} nu poate fi în interiorul unui proiect.`);
  return path.resolve(p); // the comparison form is only for the check; the caller keeps its spelling
}
// Hidden or start-up places (dotfiles, .ssh, Start Menu, autostart) are never read or written for a client.
function hiddenPath(abs) {
  return abs.split(/[\\/]+/).some((seg) => (seg.startsWith('.') && seg !== '.' && seg !== '..') || /^(start menu|startup|autostart|launchagents)$/i.test(seg));
}
// An existing file is replaced only when this server wrote it (a re-compile to the same place).
const writtenByServer = new Set();
function freshOutput(abs) {
  // A link at the output path (even a dangling one) would send the write somewhere else.
  let st = null;
  try {
    st = fs.lstatSync(abs);
  } catch {
    /* new file */
  }
  if (st && st.isSymbolicLink()) throw new Error(`La ${abs} este o legătură (symlink); nu scriu prin ea.`);
  if (st && !writtenByServer.has(abs)) throw new Error(`Fișierul există deja: ${abs}. Alege alt nume sau șterge-l întâi.`);
  writtenByServer.add(abs);
  return abs;
}
// A project created / imported / restored by a tool becomes reachable in this session.
function addProject(dir) {
  const abs = path.resolve(dir);
  if (!projects.includes(abs)) projects.push(abs);
  return abs;
}

// ---------------------------------------------------------------------------
// Server

// What the client tells the model about this server: the book projects it can reach, and that a
// `.scriv` project can also be read in place (scriv_outline / scriv_read) or imported (import_scriv).
const server = new McpServer(
  { name: 'scribner', version: '0.3.0' },
  {
    instructions:
      'Scribner: program de scris cărți lungi. Unelte pentru proiectele .scribner date la pornire sau din lista recentă (argumentul project = numele sau calea; project_info, list_binder, read_document, write_document, search, compile…). Un proiect Scrivener (.scriv) se citește pe loc cu scriv_outline și scriv_read sau se importă cu import_scriv. Fiecare scriere face întâi un snapshot.',
  },
);

tool('project_info', 'Titlul, autorul, țintele, etichetele, statusurile, profilul editorial și numărul de cuvinte al proiectului.', { project }, (dir) => {
  const p = load(dir);
  const draft = flatten(p.tree[0].children).filter((n) => n.type === 'text' && n.includeInCompile !== false);
  return {
    dir,
    title: p.title,
    author: p.author,
    targets: p.targets,
    labels: p.labels,
    statuses: p.statuses,
    keywords: p.keywordDefs || [],
    customFields: p.customFields || [],
    sectionTypes: p.sectionTypes || [],
    sectionTypeLevels: p.sectionTypeLevels || {},
    projectNotes: projectNoteTabs(p),
    collections: (p.collections || []).map(({ id, title, type }) => ({ id, title, type })),
    editorialProfile: profileFor(p, appSettings()).name,
    draftWords: draft.reduce((s, n) => s + wordCount(dir, n.id), 0),
    readOnly,
  };
});

tool('list_binder', 'Arborele binderului: id, titlu, tip, etichetă, status, Include în Compile, număr de cuvinte, sinopsis.', { project, root_id: z.string().optional().describe('Doar sub acest dosar') }, (dir, { root_id }) => {
  const p = load(dir);
  const start = root_id ? [nodeOrThrow(p, root_id)] : p.tree;
  const map = (n, depth = 0) => ({
    id: n.id,
    title: n.title,
    type: n.root ? `root:${n.root}` : n.type,
    depth,
    label: n.label !== 'Fără' ? n.label : undefined,
    status: n.status !== 'Fără' ? n.status : undefined,
    includeInCompile: n.includeInCompile === false ? false : undefined,
    words: n.type === 'text' ? wordCount(dir, n.id) : undefined,
    synopsis: n.synopsis || undefined,
    keywords: n.keywords && n.keywords.length ? n.keywords : undefined,
    children: n.children ? n.children.map((c) => map(c, depth + 1)) : undefined,
  });
  return start.map((n) => map(n));
});

tool(
  'read_document',
  'Citește un document. format: "manuscript" (paragrafe, ***ALOGEN***, *ilustrații*, [^note]) | "html" | "text". Include sinopsisul, notele și metadatele.',
  { project, id: z.string(), format: z.enum(['manuscript', 'html', 'text']).default('manuscript') },
  (dir, { id, format }) => {
    const p = load(dir);
    const n = nodeOrThrow(p, id);
    const html = store.readDoc(dir, id);
    const body = format === 'html' ? html : format === 'text' ? store.htmlToText(html) : htmlToManuscript(html);
    return {
      id,
      title: n.title,
      path: pathOf(p, id),
      synopsis: n.synopsis || '',
      label: n.label,
      status: n.status,
      keywords: n.keywords || [],
      custom: n.custom || {},
      target: n.target ? { value: n.target, unit: n.targetType === 'Characters' ? 'caractere' : 'cuvinte' } : null,
      words: store.wordCount(html),
      notes: store.htmlToText(store.readDoc(dir, id, 'notes')).trim(),
      content: body,
    };
  },
);

function pathOf(p, id) {
  const parts = [];
  let cur = findNode(p.tree, id);
  while (cur) {
    parts.unshift(cur.title);
    cur = findParent(p.tree, cur.id);
  }
  return parts.join(' / ');
}

tool(
  'write_document',
  'Înlocuiește textul unui document. Face snapshot înainte. În format "manuscript" comentariile, adnotările și alinierea existente se păstrează.',
  { project, id: z.string(), content: z.string(), format: z.enum(['manuscript', 'html']).default('manuscript'), snapshot_name: z.string().optional() },
  (dir, { id, content, format, snapshot_name }) => {
    const p = load(dir);
    const n = nodeOrThrow(p, id);
    if (n.type !== 'text') throw new Error('Doar documentele text pot fi scrise.');
    const before = store.readDoc(dir, id);
    store.takeSnapshot(dir, id, snapshot_name || 'Înainte de modificarea unui agent AI');
    const html = format === 'html' ? content : reattach(before, manuscriptToHtml(content));
    store.writeDoc(dir, id, 'docs', html);
    return `Scris „${n.title}”: ${store.wordCount(html)} cuvinte (înainte ${store.wordCount(before)}). Snapshot salvat.`;
  },
  { writes: true },
);

tool(
  'create_document',
  'Creează un document sau dosar nou, după elementul after_id sau în interiorul dosarului parent_id.',
  {
    project,
    title: z.string(),
    type: z.enum(['text', 'folder']).default('text'),
    parent_id: z.string().optional(),
    after_id: z.string().optional(),
    content: z.string().optional().describe('Text în format manuscript'),
    synopsis: z.string().optional(),
  },
  (dir, { title, type, parent_id, after_id, content, synopsis }) => {
    const node = store.newNode(type, title);
    if (synopsis) node.synopsis = synopsis;
    // The text first: when the app sees the new binder item its document already exists.
    if (type === 'text') store.writeDoc(dir, node.id, 'docs', content ? manuscriptToHtml(content) : '<p></p>');
    let p;
    try {
      p = mutate(dir, (p) => {
        if (after_id) {
          // "after" means sibling: insertNear would nest the item inside a folder anchor.
          const after = nodeOrThrow(p, after_id);
          if (after.root) throw new Error('after_id nu poate fi o rădăcină; folosește parent_id.');
          if (trashIds(p).has(after_id)) throw new Error('after_id e în Coș: textul nou n-ar fi vizibil (și s-ar pierde la golirea coșului).');
          const list = findParent(p.tree, after_id).children;
          list.splice(list.findIndex((n) => n.id === after_id) + 1, 0, node);
        } else {
          const anchor = parent_id || p.tree[0].id;
          const anchorNode = nodeOrThrow(p, anchor);
          if (!anchorNode.children) throw new Error('parent_id trebuie să fie un dosar.');
          p.tree = insertNear(p.tree, anchor, node);
        }
      });
    } catch (err) {
      // the binder item was not added: do not leave its document behind as an orphan file
      if (type === 'text') fs.rmSync(path.join(dir, 'docs', `${node.id}.html`), { force: true });
      throw err;
    }
    return { id: node.id, path: pathOf(p, node.id) };
  },
  { writes: true },
);

tool(
  'move_item',
  'Mută un element: position "before" | "after" | "inside" (în dosar) față de target_id.',
  { project, id: z.string(), target_id: z.string(), position: z.enum(['before', 'after', 'inside']) },
  (dir, { id, target_id, position }) => {
    const p = mutate(dir, (p) => {
      nodeOrThrow(p, id);
      nodeOrThrow(p, target_id);
      const next = moveNode(p.tree, id, target_id, position);
      if (next === p.tree) throw new Error('Mutare imposibilă (rădăcină sau în propriul copil).');
      p.tree = next;
    });
    return `Mutat la: ${pathOf(p, id)}`;
  },
  { writes: true },
);

tool(
  'set_metadata',
  'Schimbă titlul (redenumire), sinopsisul, eticheta, statusul, cuvintele cheie, Include în Compile, ținta, tipul de secțiune sau metadatele personalizate.',
  {
    project,
    id: z.string(),
    title: z.string().trim().min(1, "Titlul nu poate fi gol.").optional(),
    synopsis: z.string().optional(),
    label: z.string().optional(),
    status: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    include_in_compile: z.boolean().optional(),
    target: z.number().int().min(0).optional(),
    custom: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
    section_type: z.string().optional().describe('Titlul tipului de secțiune; "" îl scoate'),
  },
  (dir, input) => {
    let n;
    let patch;
    mutate(dir, (p) => {
    n = nodeOrThrow(p, input.id);
    if (n.root) throw new Error('Rădăcinile nu au metadate editabile.');
    if (input.label !== undefined && !p.labels.some((l) => l.name === input.label)) throw new Error(`Etichetă necunoscută. Disponibile: ${p.labels.map((l) => l.name).join(', ')}`);
    if (input.status !== undefined && !p.statuses.includes(input.status)) throw new Error(`Status necunoscut. Disponibile: ${p.statuses.join(', ')}`);
    patch = {};
    for (const [k, v] of [['title', input.title], ['synopsis', input.synopsis], ['label', input.label], ['status', input.status], ['keywords', input.keywords], ['includeInCompile', input.include_in_compile], ['target', input.target]]) {
      if (v !== undefined) patch[k] = v;
    }
    if (input.custom) patch.custom = { ...(n.custom || {}), ...input.custom };
    if (input.section_type !== undefined) {
      if (input.section_type && !(p.sectionTypes || []).some((t) => t.title === input.section_type)) throw new Error(`Tip de secțiune necunoscut. Disponibile: ${(p.sectionTypes || []).map((t) => t.title).join(', ')}`);
      patch.sectionType = input.section_type || undefined;
    }
    p.tree = updateNode(p.tree, input.id, patch);
    });
    return `Actualizat „${patch.title || n.title}”: ${Object.keys(patch).join(', ')}`;
  },
  { writes: true },
);

tool('trash_item', 'Mută un element în coș (recuperabil).', { project, id: z.string() }, (dir, { id }) => {
  let n;
  mutate(dir, (p) => {
    n = nodeOrThrow(p, id);
    if (n.root) throw new Error('Rădăcinile nu pot fi mutate în coș.');
    if (!p.tree.some((r) => r.root === 'trash')) throw new Error('Proiectul nu are coș.');
    if (trashIds(p).has(id)) throw new Error('Elementul este deja în coș.');
    p.tree = moveToTrash(p.tree, id);
  });
  return `„${n.title}” mutat în coș.`;
}, { writes: true });

tool(
  'search',
  'Caută în textul tuturor documentelor (fără coș). Întoarce documentele și fragmentele găsite.',
  { project, query: z.string(), regex: z.boolean().default(false), case_sensitive: z.boolean().default(false), whole_word: z.boolean().default(false), limit: z.number().int().min(1).max(500).default(100) },
  (dir, { query, regex, case_sensitive, whole_word, limit }) => {
    const p = load(dir);
    const re = buildRegex({ query, regex, caseSensitive: case_sensitive, wholeWord: whole_word });
    if (!re) throw new Error('Expresie invalidă.');
    const trash = trashIds(p);
    const out = [];
    for (const n of flatten(p.tree)) {
      if (n.root || n.type !== 'text' || trash.has(n.id)) continue;
      const hits = findInHtml(store.readDoc(dir, n.id), re);
      if (hits.length) out.push({ id: n.id, title: n.title, count: hits.length, snippets: hits.slice(0, 5).map((h) => `${h.before}[${h.match}]${h.after}`) });
      if (out.length >= limit) break;
    }
    return out;
  },
);

tool(
  'replace',
  'Caută și înlocuiește în documente (toate sau doar ids). Face snapshot la fiecare document modificat.',
  { project, query: z.string(), replacement: z.string(), regex: z.boolean().default(false), case_sensitive: z.boolean().default(false), whole_word: z.boolean().default(false), ids: z.array(z.string()).optional() },
  (dir, { query, replacement, regex, case_sensitive, whole_word, ids }) => {
    const p = load(dir);
    const re = buildRegex({ query, regex, caseSensitive: case_sensitive, wholeWord: whole_word });
    if (!re) throw new Error('Expresie invalidă.');
    const trash = trashIds(p);
    const targets = ids ? ids.map((id) => nodeOrThrow(p, id)) : flatten(p.tree).filter((n) => !n.root && n.type === 'text' && !trash.has(n.id));
    let total = 0;
    const changed = [];
    // Documents a person locked are skipped (and named), never half-changed with an error.
    const locks = lockedIds(dir);
    const skipped = targets.filter((n) => locks[n.id]);
    for (const n of targets) {
      if (locks[n.id]) continue;
      const { html, count } = replaceInHtml(store.readDoc(dir, n.id), re, replacement);
      if (!count) continue;
      store.takeSnapshot(dir, n.id, 'Înainte de înlocuirea unui agent AI');
      store.writeDoc(dir, n.id, 'docs', html);
      total += count;
      changed.push(`${n.title} (${count})`);
    }
    const skip = skipped.length ? ` Sărite (blocate de colegi): ${skipped.map((n) => n.title).join(', ')}.` : '';
    return `${total} înlocuiri în ${changed.length} documente: ${changed.join(', ')}${skip}`;
  },
  { writes: true },
);

// Notes of a binder item, or of the project: id "project" (first tab) or the id of a
// Project Notes tab (list_project_notes).
function notesId(dir, id) {
  const p = load(dir);
  if (id === 'project') return projectNoteTabs(p)[0].id;
  if (projectNoteTabs(p).some((t) => t.id === id)) return id;
  nodeOrThrow(p, id);
  return id;
}

tool('get_notes', 'Notele unui document, sau ale proiectului (id "project" sau id-ul unui tab din list_project_notes).', { project, id: z.string() }, (dir, { id }) => {
  const docId = notesId(dir, id);
  return htmlToManuscript(store.readDoc(dir, docId, 'notes'));
});

tool('set_notes', 'Înlocuiește notele unui document sau ale proiectului (id "project" sau id-ul unui tab de note).', { project, id: z.string(), content: z.string() }, (dir, { id, content }) => {
  const docId = notesId(dir, id);
  const old = store.readDoc(dir, docId, 'notes');
  if (old) store.backupFile(dir, `notes-${docId}.html`, old);
  store.writeDoc(dir, docId, 'notes', manuscriptToHtml(content));
  return 'Note salvate.';
}, { writes: true });

tool(
  'add_comment',
  'Adaugă un comentariu pe prima apariție a fragmentului quote din document (comentariul nu ajunge în Compile).',
  { project, id: z.string(), quote: z.string(), comment: z.string() },
  (dir, { id, quote, comment }) => {
    textNodeOrThrow(dir, id);
    const html = store.readDoc(dir, id);
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const target = esc(quote);
    const idx = textIndexOf(html, target);
    if (idx < 0) throw new Error('Fragmentul nu a fost găsit exact (în interiorul unui singur paragraf, fără formatare la mijloc).');
    store.takeSnapshot(dir, id, 'Înainte de comentariul unui agent AI');
    // data-comment-author / -date: the attributes the editor and the Inspector read.
    const span = `<span data-comment="${esc(comment).replace(/"/g, '&quot;')}" data-comment-author="Agent AI" data-comment-date="${new Date().toISOString()}" class="comment">${target}</span>`;
    store.writeDoc(dir, id, 'docs', html.slice(0, idx) + span + html.slice(idx + target.length));
    return 'Comentariu adăugat.';
  },
  { writes: true },
);

tool(
  'add_footnote',
  'Adaugă o notă de subsol imediat după fragmentul after_quote.',
  { project, id: z.string(), after_quote: z.string(), note: z.string() },
  (dir, { id, after_quote, note }) => {
    textNodeOrThrow(dir, id);
    const html = store.readDoc(dir, id);
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const target = esc(after_quote);
    const idx = textIndexOf(html, target);
    if (idx < 0) throw new Error('Fragmentul nu a fost găsit exact.');
    store.takeSnapshot(dir, id, 'Înainte de nota unui agent AI');
    const end = idx + target.length;
    const fn = `<span data-footnote="${esc(note).replace(/"/g, '&quot;')}" class="footnote"></span>`;
    store.writeDoc(dir, id, 'docs', html.slice(0, end) + fn + html.slice(end));
    return 'Notă de subsol adăugată.';
  },
  { writes: true },
);

tool(
  'lint',
  'I-REP: verifică un document sau toate documentele dintr-un dosar după profilul editorial (DOOM III, binar, ALOGEN, LLM, redundanță micro/mezzo/macro). Întoarce problemele cu rundă și gravitate.',
  { project, id: z.string().describe('Document sau dosar'), severity: z.enum(['GRAVE', 'MEDIU', 'MINOR', 'SEMNAL']).optional().describe('Doar această gravitate') },
  (dir, { id, severity }) => {
    const p = load(dir);
    const n = nodeOrThrow(p, id);
    const profile = profileFor(p, appSettings());
    const docs = (n.type === 'text' ? [n] : flatten(n.children || [])).filter((x) => x.type === 'text');
    const parent = n.type === 'text' ? findParent(p.tree, id) : n;
    const chapter = flatten(parent ? parent.children || [] : []).filter((x) => x.type === 'text').map((x) => ({ id: x.id, title: x.title, html: store.readDoc(dir, x.id) }));
    return docs.map((d) => {
      const issues = lint(store.readDoc(dir, d.id), { profile, otherDocs: chapter.filter((c) => c.id !== d.id) }).filter((i) => !severity || i.severity === severity);
      return { id: d.id, title: d.title, summary: summarize(issues), issues: issues.map(({ round, severity: s, message, excerpt }) => ({ round, severity: s, message, excerpt })) };
    });
  },
);

// NotebookLM follow-up interrogation (karma-nlm-doctrina style). Optional: works only when a
// notebook is set in Settings (notebookLmNotebook) and the notebooklm-mcp server is discoverable
// in the user's Claude config. We spawn that server as an MCP client and ask follow-ups until a
// usable answer, then return a doctrinal verdict per term (DOCTRINĂ / ORNAMENT / INEXACT / INCERT).
const nlmClient = require('../lib/notebookLmClient.cjs');
const nlmConsult = require('../lib/notebookConsult.cjs');
tool(
  'consult_notebook',
  'Întreabă notebook-ul NotebookLM configurat pe sursele lui, cu întrebări de continuare până la un răspuns. Cu `terms`: verdict doctrinar per expresie (DOCTRINĂ se păstrează / ORNAMENT se rărește / INEXACT se corectează / INCERT rămâne la judecată). Cu `question`: răspuns liber cu citate. Opțional: necesită un notebook în Setări și serverul notebooklm-mcp.',
  {
    project,
    terms: z.array(z.object({ term: z.string(), context: z.string().optional() })).optional().describe('Expresii de verificat pe sursă'),
    question: z.string().optional().describe('Întrebare liberă către notebook'),
    type: z.enum(['doctrine', 'fact', 'consistency']).default('doctrine').describe('Tipul de consult pentru `terms`'),
    max_rounds: z.number().int().min(1).max(8).default(4).describe('Câte întrebări de continuare cel mult'),
  },
  async (dir, { terms, question, type, max_rounds }) => {
    const s = appSettings();
    const notebook = String(s.notebookLmNotebook || '').trim();
    if (!notebook) throw new Error('Niciun notebook NotebookLM configurat în Setări (notebookLmNotebook).');
    const serverName = String(s.notebookLmServer || '').trim() || nlmClient.SERVER_NAME;
    const entry = nlmClient.discoverServerEntry({ name: serverName });
    if (!entry) throw new Error(`Serverul „${serverName}” nu este configurat în Claude (MCP).`);
    const conn = await nlmClient.createClient({ entry });
    try {
      const ask = nlmConsult.makeAsk({ client: conn });
      if (terms && terms.length) {
        const { results, errors } = await nlmConsult.consult({ type, items: terms, ask, notebook, maxRounds: max_rounds });
        return { notebook, type, results, errors };
      }
      if (!String(question || '').trim()) throw new Error('Dă `terms` sau `question`.');
      const res = await nlmConsult.interrogate({ ask, notebook, question, maxRounds: max_rounds });
      return { notebook, answer: res.answer, answered: res.answered, rounds: res.rounds, references: res.references };
    } finally {
      await conn.close();
    }
  },
);

tool('list_snapshots', 'Snapshot-urile unui document (nume, dată).', { project, id: z.string() }, (dir, { id }) =>
  store.listSnapshots(dir, id).map(({ file, name, date }) => ({ file, name, date })),
);

tool('take_snapshot', 'Salvează un snapshot al documentului.', { project, id: z.string(), name: z.string().optional() }, (dir, { id, name }) => {
  nodeOrThrow(load(dir), id);
  return store.takeSnapshot(dir, id, name || 'Snapshot agent AI');
}, { writes: true });

tool('restore_snapshot', 'Restaurează un snapshot (textul curent e salvat întâi ca snapshot).', { project, id: z.string(), file: z.string() }, (dir, { id, file }) => {
  textNodeOrThrow(dir, id);
  const snap = store.listSnapshots(dir, id).find((s) => s.file === file);
  if (!snap) throw new Error('Snapshot inexistent.');
  store.takeSnapshot(dir, id, 'Automat înainte de restaurare (agent AI)');
  store.writeDoc(dir, id, 'docs', snap.html);
  return `Restaurat „${snap.name}”.`;
}, { writes: true });

// Every Compile output the app has except PDF (rendered by Electron's Chromium): "print"
// gives the print-ready HTML the PDF is made from.
const COMPILE_FORMATS = [...Object.keys(compile.OUTPUT_FORMATS).filter((f) => f !== 'pdf'), 'print'];
tool(
  'compile',
  'Compilează manuscrisul (Manuscris, cu Include în Compile) în docx | epub | html | rtf | odt | md | mmd | txt | fountain | fdx | tex | print (HTML pentru tipar/PDF), cu formatul de Compile ales (list_compile_formats), opțional doar o colecție, un dosar sau anumite documente. Fișierul se scrie lângă proiect sau la output_path.',
  {
    project,
    format: z.enum(COMPILE_FORMATS),
    output_path: z.string().optional(),
    format_id: z.string().optional().describe('Formatul de Compile (preset, global sau al proiectului)'),
    collection_id: z.string().optional().describe('Doar documentele colecției'),
    root_id: z.string().optional().describe('Doar acest dosar'),
    ids: z.array(z.string()).optional().describe('Doar aceste documente'),
    title_page: z.boolean().optional(),
    toc: z.boolean().optional(),
    track_changes: z.boolean().optional().describe('DOCX: reviziile rămân urmărite'),
  },
  async (dir, { format, output_path, format_id, collection_id, root_id, ids, title_page, toc, track_changes }) => {
    const p = load(dir);
    const read = (id) => store.readDoc(dir, id);
    const styles = stylesOf(p);
    const opts = { styles, styleCss: styleCss(styles, 'body'), projectDir: dir };
    if (format_id) {
      if (!compileFormats.findFormat(p, format_id)) throw new Error(`Format de Compile necunoscut: ${format_id}`);
      opts.formatId = format_id;
    }
    if (collection_id) {
      if (!(p.collections || []).some((c) => c.id === collection_id)) throw new Error(`Colecție inexistentă: ${collection_id}`);
      opts.collectionId = collection_id;
    }
    if (root_id) opts.rootId = nodeOrThrow(p, root_id).id;
    if (ids) opts.ids = ids.map((id) => nodeOrThrow(p, id).id);
    if (title_page !== undefined) opts.titlePage = title_page;
    if (toc !== undefined) opts.toc = toc;
    if (track_changes && format === 'docx') Object.assign(opts, { trackChanges: true, trackAuthor: p.author || '' });
    const data = await compile.compile(p, read, format, opts);
    const ext = format === 'print' ? 'html' : compile.OUTPUT_FORMATS[format].ext;
    const out = outsideProjects(output_path ? path.resolve(output_path) : path.join(path.dirname(dir), `${p.title.replace(/[<>:"/\\|?*]/g, '_')}.${ext}`));
    fs.writeFileSync(freshOutput(out), data);
    return `Compilat: ${out}`;
  },
  { writes: true },
);

tool('writing_history', 'Istoricul scrisului pe zile (cuvinte în manuscris și în tot proiectul).', { project }, (dir) => history.summarize(history.readHistory(dir)));

registerFullTools({
  tool,
  textIndexOf,
  z,
  project,
  projects,
  store,
  load,
  mutate,
  trashIds,
  nodeOrThrow,
  textNodeOrThrow,
  pathOf,
  outsideProjects,
  freshOutput,
  hiddenPath,
  lockedIds,
  assertSubtreeUnlocked,
  addProject,
  appSettings,
  userData,
  readOnly: () => readOnly,
});

// Resources: the binder and each document as manuscript text.
server.registerResource('binder', 'scribner://binder', { title: 'Binder', description: 'Structura proiectului principal', mimeType: 'application/json' }, async (uri) => {
  const p = load(projects[0]);
  const slim = (n) => ({ id: n.id, title: n.title, type: n.root ? `root:${n.root}` : n.type, children: n.children ? n.children.map(slim) : undefined });
  const t = JSON.stringify(p.tree.map(slim), null, 2);
  return { contents: [{ uri: uri.href, mimeType: 'application/json', text: anonymizer() ? anonymizer().pack(t) : t }] };
});

server.registerResource(
  'document',
  new ResourceTemplate('scribner://doc/{id}', {
    list: async () => {
      const p = load(projects[0]);
      return { resources: flatten(p.tree).filter((n) => n.type === 'text').map((n) => ({ uri: `scribner://doc/${n.id}`, name: n.title, mimeType: 'text/markdown' })) };
    },
  }),
  { title: 'Document', description: 'Textul unui document în format manuscript', mimeType: 'text/markdown' },
  async (uri, { id }) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: ((t) => (anonymizer() ? anonymizer().pack(t) : t))(htmlToManuscript(store.readDoc(projects[0], anonymizer() ? anonymizer().hydrate(id) : id))) }] }),
);

// The projects this server can reach (names and folders), for clients that read resources first.
server.registerResource('projects', 'scribner://projects', { title: 'Proiecte', description: 'Proiectele Scribner disponibile în această sesiune', mimeType: 'application/json' }, async (uri) => ({
  contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(projects.map((d) => ({ name: path.basename(d).replace(/\.scribner$/i, ''), dir: d, title: (() => { try { return load(d).title; } catch { return ''; } })() })), null, 2) }],
}));

// A short guide for the agent: how the work is organised and what is safe (read when unsure).
server.registerResource('ghid', 'scribner://ghid', { title: 'Ghid pentru agent', description: 'Cum lucrezi cu proiectele Scribner prin acest server', mimeType: 'text/markdown' }, async (uri) => ({
  contents: [{ uri: uri.href, mimeType: 'text/markdown', text: [
    '# Scribner: ghid pentru agent',
    '- Proiectele: resursa scribner://projects; argumentul `project` = numele sau calea (implicit primul).',
    '- Structura: `list_binder` (Manuscris, Cercetare, Coș). Textul: `read_document` (format manuscript, html sau text).',
    '- Caută: `search`; înlocuiește: `replace` (sare documentele blocate de colegi).',
    '- Scrie: `write_document`, `set_notes`, `set_metadata`, `add_comment`. Fiecare scriere face întâi un snapshot; `restore_snapshot` o anulează.',
    '- Proiecte .scriv: `scriv_outline`, `scriv_read`, `scriv_search` pe loc; `import_scriv` le transformă în proiecte Scribner.',
    '- Ce faci e notat în agent-log.jsonl din proiect. Cu --read-only uneltele de scriere sunt refuzate.',
    '- Nu scrie fără acordul autorului: propune întâi, aplică doar ce a aprobat.',
  ].join('\n') }],
}));

// Ready-made workflows the client can offer as commands (prompt templates). They only describe the
// work; every change still goes through the tools above (snapshot first, locks respected).
const promptText = (text) => ({ messages: [{ role: 'user', content: { type: 'text', text } }] });
server.registerPrompt(
  'revizie_capitol',
  { title: 'Revizuiește un capitol', description: 'Citește un capitol, propune corecturi de stil și le aplică doar după confirmare.', argsSchema: { titlu: z.string().describe('Titlul capitolului din binder') } },
  ({ titlu }) => promptText(`În proiectul Scribner, găsește cu list_binder documentul sau dosarul „${titlu}”, citește-l cu read_document și propune corecturi (gramatică, repetiții, ritm), fiecare cu fragmentul exact. Nu scrie nimic până nu confirm; după confirmare aplică doar ce am aprobat, cu replace sau write_document (fiecare scriere face snapshot).`),
);
server.registerPrompt(
  'rezumat_proiect',
  { title: 'Rezumatul cărții', description: 'Un rezumat pe capitole al manuscrisului, fără modificări.' },
  () => promptText('Folosește project_info și list_binder, apoi read_document pe fiecare capitol din Manuscris. Fă un rezumat pe capitole (2–3 fraze fiecare) și o listă de personaje cu prima apariție. Doar citire: nu modifica nimic.'),
);
server.registerPrompt(
  'importa_scriv',
  { title: 'Citește un proiect .scriv', description: 'Citește un proiect .scriv pe loc și, la cerere, îl importă.', argsSchema: { cale: z.string().describe('Folderul .scriv') } },
  ({ cale }) => promptText(`Citește proiectul .scriv din „${cale}” cu scriv_outline, apoi textele cu scriv_read. Spune-mi ce conține. Dacă îți cer, importă-l cu import_scriv într-un folder pe care ți-l dau.`),
);

if (httpPort) await serveHttp();
else await server.connect(new StdioServerTransport());

// Streamable HTTP, stateless JSON, one request at a time. Every request carries
// "Authorization: Bearer <token>"; without --token / SCRIBNER_MCP_TOKEN a random one is made and
// printed once. Listens on 127.0.0.1 unless --host says otherwise (e.g. a Tailscale address).
async function serveHttp() {
  const http = await import('node:http');
  const crypto = await import('node:crypto');
  const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
  if (!httpToken) {
    httpToken = crypto.randomBytes(24).toString('hex');
    process.stderr.write(`Token MCP (pune-l în clientul AI ca „Authorization: Bearer …”): ${httpToken}\n`);
  }
  const expected = Buffer.from(`Bearer ${httpToken}`);
  let queue = Promise.resolve();
  const srv = http.createServer((req, res) => {
    const got = Buffer.from(String(req.headers.authorization || ''));
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
      res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"token lipsă sau greșit"}');
      return;
    }
    if (new URL(req.url, 'http://x').pathname !== '/mcp') {
      res.writeHead(404).end();
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { allow: 'POST' }).end();
      return;
    }
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 50 * 1024 * 1024) req.destroy();
      else chunks.push(c);
    });
    req.on('end', () => {
      queue = queue.then(async () => {
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          res.writeHead(400).end('{"error":"JSON invalid"}');
          return;
        }
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        await server.connect(transport);
        try {
          await transport.handleRequest(req, res, body);
        } finally {
          await server.close().catch(() => {});
        }
      }).catch((e) => {
        if (!res.headersSent) res.writeHead(500).end(JSON.stringify({ error: e.message }));
      });
    });
  });
  await new Promise((resolve) => srv.listen(httpPort, httpHost, resolve));
  process.stderr.write(`Scribner MCP pe http://${httpHost}:${httpPort}/mcp\n`);
}
process.stderr.write(`Scribner MCP pornit: ${projects.map((p) => path.basename(p)).join(', ')}${readOnly ? ' (doar citire)' : ''}\n`);
