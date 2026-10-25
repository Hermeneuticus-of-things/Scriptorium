// The MCP server covers the whole app (everything that makes sense without a GUI): one
// test per tool added for "MCP integral", the --read-only refusal of every new write tool,
// and guards that make a new app feature fail here until it is exposed over MCP (or listed
// as GUI-only with a reason).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import http from 'http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const store = require('../lib/store.cjs');

const OLD_TOOLS = ['project_info', 'list_binder', 'read_document', 'write_document', 'create_document', 'move_item', 'set_metadata', 'trash_item', 'search', 'replace', 'get_notes', 'set_notes', 'add_comment', 'add_footnote', 'lint', 'list_snapshots', 'take_snapshot', 'restore_snapshot', 'compile', 'writing_history'];
// Write tools added for "MCP integral", with arguments that would succeed on a writable server.
const NEW_WRITE_TOOLS = (ctx) => ({
  create_project: { parent_dir: ctx.tmp, title: 'Nou' },
  set_project_info: { author: 'X' },
  import_files: { files: [ctx.md] },
  import_web_page: { url: 'http://127.0.0.1:9/x' },
  import_bibliography: { file: ctx.bib },
  import_scriv: { scriv_path: ctx.tmp, dest_dir: ctx.tmp },
  import_bundle: { file: ctx.bib, dest_dir: ctx.tmp },
  export_documents: { output_dir: path.join(ctx.tmp, 'out') },
  export_outline: { format: 'opml', output_path: path.join(ctx.tmp, 'o.opml') },
  export_scriv: { output_dir: path.join(ctx.tmp, 'out') },
  export_notebooklm: { output_dir: path.join(ctx.tmp, 'out') },
  export_editor_package: { output_dir: path.join(ctx.tmp, 'out') },
  export_bundle: { output_path: path.join(ctx.tmp, 'b.json') },
  save_project_as: { parent_dir: ctx.tmp, title: 'Copie' },
  manage_project_note_tab: { action: 'add', title: 'T' },
  manage_keyword: { action: 'add', name: 'k' },
  manage_label: { action: 'add', name: 'L' },
  manage_status: { action: 'add', name: 'S' },
  manage_custom_field: { action: 'add', title: 'F' },
  manage_section_type: { action: 'add', title: 'T' },
  set_targets: { draft: 1 },
  manage_collection: { action: 'create', title: 'C' },
  manage_bookmark: { action: 'add', id: ctx.a },
  update_comment: { id: ctx.a, index: 0, text: 'x' },
  delete_comment: { id: ctx.a, index: 0 },
  duplicate_item: { id: ctx.a },
  split_document: { id: ctx.a, at_text: 'text' },
  merge_documents: { ids: [ctx.a, ctx.b] },
  convert_item: { id: ctx.a, type: 'folder' },
  restore_from_trash: { id: ctx.a },
  empty_trash: {},
  manage_snapshot: { id: ctx.a, file: 'x.json', action: 'delete' },
  glossary_add: { term: 'drumuln' },
  backup_now: {},
  restore_backup: { name: 'x' },
  editorial_autofix: { id: ctx.a },
});
const NEW_READ_TOOLS = (ctx) => ({
  list_templates: {},
  scriv_outline: { scriv_path: path.join(ctx.tmp, 'mini.scriv') },
  scriv_read: { scriv_path: path.join(ctx.tmp, 'mini.scriv'), id: 'X' },
  scriv_search: { scriv_path: path.join(ctx.tmp, 'mini.scriv'), query: 'T' },
  list_compile_formats: {},
  list_project_notes: {},
  list_keywords: {},
  get_targets: {},
  list_collections: {},
  list_bookmarks: {},
  list_comments: { id: ctx.a },
  list_footnotes: { id: ctx.a },
  list_trash: {},
  compare_snapshots: { id: ctx.a, file_a: 'x.json' },
  statistics: {},
  timeline: {},
  analyze_pacing: {},
  character_relations: {},
  research_search: { query: 'text' },
  glossary_list: {},
  build_glossaries: {},
  lookup_url: { text: 'drumul' },
  list_backups: {},
  editorial_round: {},
  author_journal: {},
  team_activity: {},
});

// Every renderer API (electron/preload.cjs) is either reachable over MCP (tool name) or GUI-only
// (reason). A new preload function makes this test fail until it is listed here.
const PRELOAD_COVERAGE = {
  deleteHistory: 'gui: ștergerea zilelor din istoricul scrisului se face din fereastra Istoric',
  scratchOpenWindow: 'gui: fereastra separată de notițe (scratchpad)',
  scratchSetOnTop: 'gui: fereastra de notițe mereu deasupra',
  scratchChooseFolder: 'gui: dosarul notițelor se alege într-un dialog',
  scratchClearFolder: 'gui: notițele revin în setări',
  scratchReadFolder: 'gui: notițele din dosarul ales de autor',
  scratchWriteFolder: 'gui: notițele din dosarul ales de autor',
  scratchProjects: 'gui: proiectele deschise în alte ferestre',
  scratchSend: 'gui: trimite o notiță în proiectul din altă fereastră',
  onScratchReceive: 'gui: notiță primită din fereastra de notițe',
  mcpConnectInfo: 'gui: legarea programului la Claude se face din interfață (Ajutor)',
  mcpConnectDesktop: 'gui: scrie configurarea Claude Desktop la cererea autorului',
  isMisspelled: 'gui: corectorul ortografic al ferestrei (corecturi învățate)',
  onSpellReplaced: 'gui: sugestie aleasă din meniul nativ de clic dreapta',
  updateCheck: 'gui: actualizarea programului (Ajutor → Caută actualizări)',
  updateConfigure: 'gui: actualizarea programului (setări)',
  updateDownload: 'gui: actualizarea programului',
  updateInstall: 'gui: actualizarea programului',
  onUpdateProgress: 'gui: actualizarea programului',
  onUpdateAvailable: 'gui: anunțul de versiune nouă',
  getSettings: 'gui: setările aplicației (temă, chei API); serverul citește doar backup / liste editoriale',
  setSettings: 'gui: setările aplicației și cheile API nu se schimbă din agent',
  chooseBackupDir: 'gui: dialog de folder (backup_now primește backup_dir)',
  listTemplates: 'list_templates',
  newProject: 'create_project',
  openProject: 'gui: serverul primește proiectele în linia de comandă',
  saveProject: 'set_metadata',
  readDoc: 'read_document',
  writeDoc: 'write_document',
  takeSnapshot: 'take_snapshot',
  listSnapshots: 'list_snapshots',
  importScriv: 'import_scriv',
  importFile: 'import_files',
  readMedia: 'gui: afișarea fișierelor media',
  mcpInfo: 'gui: comanda de conectare MCP',
  readStylesFromProject: 'gui: import de stiluri din dialogul Stiluri',
  addMediaFiles: 'import_files',
  importFiles: 'import_files',
  importOpml: 'import_files',
  exportDocuments: 'export_documents',
  exportOpml: 'export_outline',
  exportCsv: 'export_outline',
  saveProjectAs: 'save_project_as',
  printDocument: 'gui: tipărire la imprimantă',
  setAppMenu: 'gui: meniul ferestrei',
  onMenuCommand: 'gui: meniul ferestrei',
  watchProject: 'gui: reîncărcarea ferestrei la schimbări externe',
  reloadProject: 'gui: reîncărcarea ferestrei la schimbări externe',
  syncConflicts: 'gui: anunță copiile în conflict lăsate de serviciul de sincronizare',
  onProjectChanged: 'gui: reîncărcarea ferestrei la schimbări externe',
  backupNow: 'backup_now',
  listBackups: 'list_backups',
  restoreBackup: 'restore_backup',
  recordHistory: 'gui: istoricul se notează de fereastra care scrie',
  getHistory: 'writing_history',
  exportCompiled: 'compile',
  previewCompiled: 'compile',
  exportScript: 'compile',
  exportScriv: 'export_scriv',
  syncOut: 'gui: sincronizarea cu folder extern e legată de deschiderea/închiderea proiectului în aplicație (export_documents / import_files pentru agent)',
  syncIn: 'gui: idem syncOut',
  syncAuto: 'gui: idem syncOut',
  importBibliography: 'import_bibliography',
  exportLatex: 'compile',
  exportPandoc: 'compile',
  aiBulkSynopsis: 'gui: AI (clientul MCP este AI-ul)',
  aiConsistency: 'gui: AI (clientul MCP este AI-ul)',
  aiZoomReview: 'gui: AI (clientul MCP este AI-ul)',
  onAiProgress: 'gui: AI',
  editorPackage: 'export_editor_package',
  deleteSnapshot: 'manage_snapshot',
  renameSnapshot: 'manage_snapshot',
  snapshotCounts: 'gui: semnul din Binder și managerul de snapshot-uri (list_snapshots per document)',
  listAllTemplates: 'list_templates',
  saveAsTemplate: 'gui: scrie în folderul aplicației, nu la o cale dată de client',
  deleteTemplate: 'gui: șterge din folderul aplicației',
  exportTemplate: 'gui: dialog de folder pentru exportul unui șablon',
  importTemplate: 'gui: dialog de folder; scrie în folderul aplicației',
  backupTo: 'gui: dialog de folder (backup_now primește backup_dir)',
  backupOnSave: 'gui: backup la salvarea manuală din fereastră (Ctrl+S)',
  newFromTemplate: 'create_project',
  importText: 'import_files',
  importWebPage: 'import_web_page',
  getPageSetup: 'gui: Page Setup pentru imprimantă',
  setPageSetup: 'gui: Page Setup pentru imprimantă',
  printPreview: 'compile',
  printDocuments: 'gui: tipărire la imprimantă (dialogul sistemului)',
  savePrintPdf: 'gui: salvează PDF-ul din previzualizare (dialog de salvare)',
  listGlobalFormats: 'list_compile_formats',
  saveGlobalFormats: 'gui: editorul de formate Compile',
  listDictionaryWords: 'gui: dicționarul ortografic al lui Chromium',
  removeDictionaryWord: 'gui: dicționarul ortografic al lui Chromium',
  cancelAi: 'gui: AI',
  runAi: 'gui: AI (clientul MCP este AI-ul; editorial_round dă promptul rundei)',
  onAiDelta: 'gui: AI',
  testAi: 'gui: AI',
  nlmExport: 'export_notebooklm',
  nlmOpen: 'gui: deschide browserul',
  openLink: 'lookup_url',
  copyText: 'gui: clipboard pentru raportul de problemă',
  getErrorLog: 'gui: jurnalul de erori pentru Ajutor → Raportează o problemă',
  clearErrorLog: 'gui: jurnalul de erori al aplicației',
  logError: 'gui: erorile ferestrei ajung în jurnalul aplicației',
  onAppError: 'gui: notificare de eroare nouă în fereastră',
  servicesStatus: 'gui: conturile de servicii au secretele criptate cu safeStorage din Electron',
  setService: 'gui: conturile de servicii nu se schimbă din agent',
  setAccount: 'gui: conturile de servicii nu se schimbă din agent',
  deleteAccount: 'gui: conturile de servicii nu se schimbă din agent',
  copyAccountPassword: 'gui: parolele nu ies spre agent',
  translateText: 'gui: cheia DeepL/Google e criptată cu safeStorage (agentul traduce singur sau folosește lookup_url)',
  checkGrammar: 'gui: serviciu extern cu cont din Setări (agentul corectează singur; lint pentru I-REP)',
  importZotero: 'gui: contul Zotero e criptat cu safeStorage, pe care serverul MCP nu îl poate citi; agentul folosește import_bibliography cu un fișier',
  speakCloud: 'gui: citire cu voce tare (Speechify) redată în fereastră; un agent nu are difuzoare',
  newWindow: 'gui: ferestre',
  toggleFullScreen: 'gui: ferestre',
  recheckSpelling: 'gui: corector ortografic',
  openMediaExternal: 'gui: deschide aplicația externă',
  releaseProject: 'gui: ferestre',
  exportBundle: 'export_bundle',
  importBundle: 'import_bundle',
  teamFiles: 'team_activity',
  whisperStatus: 'gui: motorul de dictare încorporat rulează pe calculatorul autorului',
  whisperInstall: 'gui: descărcarea motorului de dictare, din Setări',
  ttsStatus: 'gui: vocea de citire încorporată (mini-player)',
  ttsInstall: 'gui: descărcarea vocii de citire, automat la prima pornire',
  ttsSynth: 'gui: citire cu voce tare în mini-player',
  whisperRemove: 'gui: ștergerea motorului de dictare, din Setări',
  whisperTranscribePcm: 'gui: sunetul vine de la microfonul autorului',
  whisperReadAudio: 'gui: fișierul audio ales în dialog',
  whisperReadMedia: 'gui: fișierul audio din binder, decodat în fereastră',
  onWhisperProgress: 'gui: progresul descărcării',
  dtedStatus: 'gui: D&TED (dictare) rulează pe calculatorul autorului, cu microfonul lui',
  dtedPickAudio: 'gui: dialog de fișiere',
  dtedSetModel: 'gui: modelul D&TED îl alege autorul în Setări',
  dtedTranscribe: 'gui: transcrierea D&TED o cere autorul din fereastră (agentul primește documentul creat)',
  dtedTranscribeMedia: 'gui: transcrierea D&TED o cere autorul din binder',
  dtedDictateStart: 'gui: dictare la microfon',
  dtedDictateStop: 'gui: dictare la microfon',
  dtedCancel: 'gui: dictare la microfon',
  onDtedEvent: 'gui: evenimentele dictării',
  teamWrite: 'gui: prezența și jurnalul echipei le scrie fereastra persoanei care lucrează (agentul e înregistrat automat ca „agent”)',
  appendAuthorJournal: 'gui: jurnalul MODIFICARI_AUTOR se scrie de fereastra în care autorul salvează (author_journal îl citește)',
  ragBuild: 'research_search',
  ragQuery: 'research_search',
  ragAsk: 'research_search',
  ragChat: 'gui: conversația AI din panoul Cercetare (clientul MCP este AI-ul; research_search îi dă pasajele cu care răspunde singur)',
  ragChats: 'gui: istoricul conversațiilor panoului Cercetare (research-chats.json din folderul proiectului)',
  ragChatDelete: 'gui: istoricul conversațiilor panoului Cercetare',
  ragImportFiles: 'gui: dialog de fișiere pentru surse (agentul folosește import_files / import_web_page)',
  onRagProgress: 'gui: progresul indexării',
};

let tmp;
let userData;
let dir;
let client;
let server;
let port;
let ids;
const clients = [];

async function connect(projectDir, extra = []) {
  const c = new Client({ name: 'full', version: '1.0.0' });
  await c.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [path.resolve('mcp/server.mjs'), '--project', projectDir, ...extra],
      env: { ...process.env, SCRIBNER_USER_DATA: userData, SCRIBNER_MCP_ALLOW_LOCAL_WEB: '1' },
      stderr: 'ignore',
    }),
  );
  clients.push(c);
  const call = async (name, args = {}) => {
    const res = await c.callTool({ name, arguments: args });
    const t = res.content[0].text;
    if (res.isError) throw new Error(t);
    try {
      return JSON.parse(t);
    } catch {
      return t;
    }
  };
  return { client: c, call };
}
let call;

function makeProject(parent, title) {
  const d = store.projectDirFor(parent, title);
  const p = store.createProject(d, title);
  const a = store.newNode('text', 'Scena A');
  const b = store.newNode('text', 'Scena B');
  const c = store.newNode('text', 'Scena C');
  p.tree[0].children = [a, b, c];
  store.saveProject(d, p);
  store.writeDoc(d, a.id, 'docs', '<p>Primul text cu "ghilimele"  drepte. <span data-comment="De verificat" data-comment-author="Ana" class="comment">Fraza comentată</span>.</p><p>al doilea paragraf<span data-footnote="Sursa 1" class="footnote"></span> și restul.</p>');
  store.writeDoc(d, b.id, 'docs', '<p>Al doilea text, Maria și Ion vorbesc.</p>');
  store.writeDoc(d, c.id, 'docs', '<p>Al treilea text, Maria și Ion pleacă.</p>');
  return { dir: d, a: a.id, b: b.id, c: c.id };
}

function snapshotTree(root) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) {
        out[path.relative(root, f) + '/'] = '';
        walk(f);
      } else out[path.relative(root, f)] = fs.readFileSync(f).toString('base64');
    }
  };
  walk(root);
  return out;
}

const readLog = (d) => fs.readFileSync(path.join(d, 'agent-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-full-'));
  userData = path.join(tmp, 'userdata');
  fs.mkdirSync(userData);
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ backupKeep: 3 }));
  ({ dir, ...ids } = makeProject(tmp, 'Carte'));
  ({ call } = await connect(dir));
  client = clients[0];
  server = http.createServer((req, res) => {
    if (req.url === '/img.png') {
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end(PNG);
    } else {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<html><head><title>Pagina test</title></head><body><article><p>Text de pe web.</p><img src="http://127.0.0.1:${port}/img.png"></article></body></html>`);
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
}, 30000);

afterAll(async () => {
  for (const c of clients) await c.close().catch(() => {});
  server?.close();
});

describe('MCP integral: tool list and coverage', () => {
  it('offers workflow prompts and a project list resource', async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((x) => x.name)).toEqual(expect.arrayContaining(['revizie_capitol', 'rezumat_proiect', 'importa_scriv']));
    const r = await client.readResource({ uri: 'scribner://projects' });
    expect(JSON.parse(r.contents[0].text).length).toBeGreaterThan(0);
  });

  it('lists every old and new tool', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    const ctx = { tmp, a: 'a', b: 'b' };
    const expected = [...OLD_TOOLS, ...Object.keys(NEW_WRITE_TOOLS(ctx)), ...Object.keys(NEW_READ_TOOLS(ctx))];
    expect(names).toEqual(expect.arrayContaining(expected));
    // No tool without a test entry here: a new tool must be classified as read or write.
    expect(names.filter((n) => !expected.includes(n))).toEqual([]);
    for (const t of tools) expect(t.description.length, t.name).toBeGreaterThan(20);
  });

  it('every renderer API is reachable over MCP or listed as GUI-only', async () => {
    const preload = fs.readFileSync(path.resolve('electron/preload.cjs'), 'utf8');
    const apis = [...preload.matchAll(/^ {2}(\w+): /gm)].map((m) => m[1]);
    expect(apis.length).toBeGreaterThan(50);
    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));
    for (const a of apis) {
      const v = PRELOAD_COVERAGE[a];
      expect(v, `preload api "${a}" has no MCP tool and no GUI-only reason in tests/mcpFull.test.js`).toBeDefined();
      if (!v.startsWith('gui:')) expect(names.has(v), `${a} -> ${v}`).toBe(true);
    }
  });
});

describe('MCP integral: projects, templates, import', () => {
  it('list_templates / create_project (built-in template; the new project is reachable)', async () => {
    const list = await call('list_templates');
    expect(list.map((t) => t.id)).toEqual(expect.arrayContaining(['blank', 'novel']));
    const res = await call('create_project', { parent_dir: tmp, title: 'Roman nou', template: 'novel' });
    expect(fs.existsSync(path.join(res.dir, 'project.json'))).toBe(true);
    const info = await call('project_info', { project: res.dir });
    expect(info.title).toBe('Roman nou');
    expect(readLog(res.dir)[0].tool).toBe('create_project');
    await expect(call('create_project', { parent_dir: tmp, title: 'X', template: 'nu-exista' })).rejects.toThrow(/Șablon necunoscut/);
    await expect(call('create_project', { parent_dir: dir, title: 'Y' })).rejects.toThrow(/interiorul unui proiect/);
  });

  it('create_project from a user template in the app data folder', async () => {
    const tdir = path.join(userData, 'templates', 'sablonul-meu');
    fs.mkdirSync(path.join(tdir, 'project'), { recursive: true });
    store.createProject(path.join(tdir, 'project'), 'Șablon', 'stories');
    fs.writeFileSync(path.join(tdir, 'template.json'), JSON.stringify({ title: 'Șablonul meu' }));
    expect((await call('list_templates')).some((t) => t.id === 'user:sablonul-meu')).toBe(true);
    const res = await call('create_project', { parent_dir: tmp, title: 'Din șablon', template: 'user:sablonul-meu' });
    expect(store.loadProject(res.dir).title).toBe('Din șablon');
  });

  it('set_project_info', async () => {
    await call('set_project_info', { author: 'Ana Pop', author_first: 'Ana', title_abbreviation: 'CRT' });
    const p = store.loadProject(dir);
    expect([p.author, p.authorFirst, p.titleAbbreviation]).toEqual(['Ana Pop', 'Ana', 'CRT']);
  });

  it('import_files: text formats (split by headings), OPML outline and media', async () => {
    const src = path.join(tmp, 'src');
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, 'carte.md'), '# Unu\n\nPrimul **capitol**.\n\n# Doi\n\nAl doilea.');
    fs.writeFileSync(path.join(src, 'pagina.html'), '<html><body><p>Din HTML</p><script>alert(1)</script></body></html>');
    fs.writeFileSync(path.join(src, 'note.txt'), 'linia unu\nlinia doi');
    fs.writeFileSync(path.join(src, 'scena.fountain'), 'INT. CASA - ZI\n\nIon intră.');
    fs.writeFileSync(path.join(src, 'text.rtf'), '{\\rtf1\\ansi Text RTF\\par}');
    fs.writeFileSync(path.join(src, 'plan.opml'), '<?xml version="1.0"?><opml version="2.0"><body><outline text="Partea I" _note="Sinopsis I" _label="Idee" _status="Final"><outline text="Cap 1"/></outline></body></opml>');
    fs.writeFileSync(path.join(src, 'poza.png'), PNG);
    const res = await call('import_files', { files: ['carte.md', 'pagina.html', 'note.txt', 'scena.fountain', 'text.rtf', 'plan.opml', 'poza.png'].map((f) => path.join(src, f)), split: 'h1' });
    expect(res.map((r) => r.title)).toEqual(['Unu', 'Doi', 'pagina', 'note', 'scena', 'text', 'Partea I', 'poza']);
    const byTitle = Object.fromEntries(res.map((r) => [r.title, r]));
    expect(store.readDoc(dir, byTitle.Unu.id)).toContain('<strong>capitol</strong>');
    expect(store.readDoc(dir, byTitle.pagina.id)).not.toContain('script');
    expect(store.readDoc(dir, byTitle.text.id)).toContain('Text RTF');
    const p = store.loadProject(dir);
    const part = store.findNode(p.tree, byTitle['Partea I'].id);
    // OPML labels and statuses that the project defines are kept (they used to be dropped).
    expect([part.type, part.synopsis, part.label, part.status, part.children[0].title]).toEqual(['folder', 'Sinopsis I', 'Idee', 'Final', 'Cap 1']);
    const media = store.findNode(p.tree, byTitle.poza.id);
    expect([media.type, media.includeInCompile, media.media.mime]).toEqual(['file', false, 'image/png']);
    expect(byTitle.poza.path).toBe('Cercetare / poza');
    expect(fs.readFileSync(path.join(dir, 'media', media.media.file))).toEqual(PNG);
    await expect(call('import_files', { files: [path.join(src, 'lipsa.md')] })).rejects.toThrow(/Fișier inexistent/);
    await expect(call('import_files', { files: [src] })).rejects.toThrow(/Fișier inexistent/);
  });

  it('import_web_page: page and its images (offline copy) into Research', async () => {
    const res = await call('import_web_page', { url: `http://127.0.0.1:${port}/articol` });
    expect(res.title).toBe('Pagina test');
    expect(res.images).toBe(1);
    expect(res.path).toBe('Cercetare / Pagina test');
    const html = store.readDoc(dir, res.id);
    expect(html).toContain('Text de pe web.');
    expect(html).toContain('data:image/png;base64');
    await expect(call('import_web_page', { url: 'file:///etc/passwd' })).rejects.toThrow(/http/);
  });

  it('import_bibliography', async () => {
    const bib = path.join(tmp, 'ref.bib');
    fs.writeFileSync(bib, '@book{eliade1949, author={Eliade, Mircea}, title={Mitul eternei reîntoarceri}, year={1949}}');
    expect(await call('import_bibliography', { file: bib })).toMatch(/^1 intrări/);
    expect(store.loadProject(dir).bibliography[0].title).toContain('Mitul');
  });
});

describe('MCP integral: export', () => {
  it('compile: every format except PDF, with a Compile format and a scope', async () => {
    const formats = await call('list_compile_formats');
    expect(formats.formats.map((f) => f.id)).toEqual(expect.arrayContaining(['manuscris', 'paperback', 'ebook']));
    const out = path.join(tmp, 'compile');
    fs.mkdirSync(out, { recursive: true });
    for (const format of ['docx', 'epub', 'html', 'rtf', 'odt', 'md', 'mmd', 'txt', 'fountain', 'fdx', 'tex', 'print']) {
      const file = path.join(out, `carte.${format}`);
      expect(await call('compile', { format, output_path: file, format_id: 'paperback' })).toContain(file);
      expect(fs.statSync(file).size, format).toBeGreaterThan(20);
    }
    await call('compile', { format: 'txt', output_path: path.join(out, 'b.txt'), ids: [ids.b] });
    const onlyB = fs.readFileSync(path.join(out, 'b.txt'), 'utf8');
    expect(onlyB).toContain('Al doilea text');
    expect(onlyB).not.toContain('Al treilea');
    await expect(call('compile', { format: 'pdf', output_path: path.join(out, 'x.pdf') })).rejects.toThrow();
    await expect(call('compile', { format: 'html', format_id: 'nu-exista', output_path: path.join(out, 'x.html') })).rejects.toThrow(/Format de Compile/);
  });

  it('export_documents (binder structure) and the output guard', async () => {
    const res = await call('export_documents', { output_dir: path.join(tmp, 'exp'), format: 'md', with_synopsis: true, with_meta: true });
    expect(res.count).toBeGreaterThanOrEqual(3);
    expect(fs.existsSync(path.join(res.dir, 'Manuscris', 'Scena B.md'))).toBe(true);
    await expect(call('export_documents', { output_dir: path.join(dir, 'docs') })).rejects.toThrow(/interiorul unui proiect/);
  });

  it('export_outline: OPML and CSV', async () => {
    await call('export_outline', { format: 'opml', output_path: path.join(tmp, 'o', 'plan.opml') });
    expect(fs.readFileSync(path.join(tmp, 'o', 'plan.opml'), 'utf8')).toContain('Scena A');
    await call('export_outline', { format: 'csv', output_path: path.join(tmp, 'o', 'meta.csv') });
    expect(fs.readFileSync(path.join(tmp, 'o', 'meta.csv'), 'utf8')).toContain('Scena B');
  });

  it('export_scriv and import_scriv round trip', async () => {
    const res = await call('export_scriv', { output_dir: path.join(tmp, 'scriv') });
    expect(fs.existsSync(res.dir)).toBe(true);
    fs.mkdirSync(path.join(tmp, 'din-scriv'));
    const imp = await call('import_scriv', { scriv_path: res.dir, dest_dir: path.join(tmp, 'din-scriv') });
    const binder = await call('list_binder', { project: imp.dir });
    expect(JSON.stringify(binder)).toContain('Scena B');
    // read in place, without importing
    const outline = await call('scriv_outline', { scriv_path: res.dir });
    const item = outline.find((o) => o.title === 'Scena B');
    expect(item).toBeTruthy();
    expect(typeof (await call('scriv_read', { scriv_path: res.dir, id: item.id }))).toBe('string');
    // the same through the .scrivx file inside it, and a search
    const scrivx = path.join(res.dir, fs.readdirSync(res.dir).find((f) => f.endsWith('.scrivx')));
    expect((await call('scriv_outline', { scriv_path: scrivx })).length).toBe(outline.length);
    expect(Array.isArray(await call('scriv_search', { scriv_path: scrivx, query: 'Scena' }))).toBe(true);
    fs.mkdirSync(path.join(tmp, 'din-scrivx'));
    const imp2 = await call('import_scriv', { scriv_path: scrivx, dest_dir: path.join(tmp, 'din-scrivx') });
    expect(JSON.stringify(await call('list_binder', { project: imp2.dir }))).toContain('Scena B');
  });

  it('export_notebooklm (project notes tabs included)', async () => {
    await call('set_notes', { id: 'project', content: 'Planul general al cărții.' });
    const res = await call('export_notebooklm', { output_dir: path.join(tmp, 'nlm') });
    expect(res.files[0]).toBe('00 - Cuprins.md');
    const notes = res.files.find((f) => f.startsWith('Note proiect'));
    expect(fs.readFileSync(path.join(res.dir, notes), 'utf8')).toContain('Planul general');
  });

  it('export_editor_package', async () => {
    const res = await call('export_editor_package', { output_dir: path.join(tmp, 'editor'), manuscript_format: 'md' });
    expect(res.files).toEqual(expect.arrayContaining(['01_Manuscris.md', 'README.md']));
    expect(fs.existsSync(res.dir)).toBe(true);
  });

  it('export_bundle and import_bundle round trip', async () => {
    const file = path.join(tmp, 'pachet.scribner.json');
    await call('export_bundle', { output_path: file });
    fs.mkdirSync(path.join(tmp, 'din-pachet'));
    const imp = await call('import_bundle', { file, dest_dir: path.join(tmp, 'din-pachet') });
    expect((await call('read_document', { project: imp.dir, id: ids.b, format: 'text' })).content).toContain('Al doilea text');
  });

  it('save_project_as', async () => {
    fs.mkdirSync(path.join(tmp, 'copii'));
    const res = await call('save_project_as', { parent_dir: path.join(tmp, 'copii'), title: 'Carte v2' });
    expect((await call('project_info', { project: res.dir })).title).toBe('Carte v2');
    expect(store.loadProject(dir).title).toBe('Carte');
  });
});

describe('MCP integral: project settings', () => {
  it('list_project_notes / manage_project_note_tab, with get_notes / set_notes on a tab', async () => {
    const added = (await call('manage_project_note_tab', { action: 'add', title: 'Personaje', content: 'Ana, Ion' })).added;
    expect(await call('get_notes', { id: added.id })).toBe('Ana, Ion');
    await call('set_notes', { id: added.id, content: 'Ana, Ion, Maria' });
    await call('manage_project_note_tab', { action: 'rename', id: added.id, title: 'Distribuție' });
    let tabs = await call('list_project_notes');
    expect(tabs.map((t) => t.title)).toEqual(['Note proiect', 'Distribuție']);
    expect(tabs[1].words).toBe(3);
    await call('manage_project_note_tab', { action: 'move', id: added.id, delta: -1 });
    expect((await call('list_project_notes'))[0].id).toBe(added.id);
    await expect(call('manage_project_note_tab', { action: 'remove', id: 'project-notes' })).rejects.toThrow(/nu poate fi șters/);
    tabs = (await call('manage_project_note_tab', { action: 'remove', id: added.id })).tabs;
    expect(tabs.map((t) => t.id)).toEqual(['project-notes']);
  });

  it('list_keywords / manage_keyword', async () => {
    await call('set_metadata', { id: ids.a, keywords: ['dharma'] });
    await call('manage_keyword', { action: 'add', name: 'drumul', color: '#ff0000' });
    await call('manage_keyword', { action: 'set_parent', name: 'dharma', parent: 'drumul' });
    await expect(call('manage_keyword', { action: 'set_parent', name: 'drumul', parent: 'dharma' })).rejects.toThrow(/ciclu/);
    await call('manage_keyword', { action: 'rename', name: 'dharma', new_name: 'dharman' });
    const list = await call('list_keywords');
    expect(list.find((k) => k.name === 'dharman')).toMatchObject({ parent: 'drumul', count: 1 });
    expect(store.findNode(store.loadProject(dir).tree, ids.a).keywords).toEqual(['dharman']);
    await call('manage_keyword', { action: 'delete', name: 'dharman' });
    expect(store.findNode(store.loadProject(dir).tree, ids.a).keywords).toEqual([]);
  });

  it('manage_label (rename propagates to the binder)', async () => {
    await call('set_metadata', { id: ids.b, label: 'Idee' });
    await call('manage_label', { action: 'add', name: 'Flashback', color: '#00ff00' });
    await call('manage_label', { action: 'rename', name: 'Idee', new_name: 'Idee nouă' });
    expect(store.findNode(store.loadProject(dir).tree, ids.b).label).toBe('Idee nouă');
    await call('manage_label', { action: 'delete', name: 'Idee nouă' });
    expect(store.findNode(store.loadProject(dir).tree, ids.b).label).toBe('Fără');
    await expect(call('manage_label', { action: 'delete', name: 'Fără' })).rejects.toThrow(/nu poate fi schimbată/);
  });

  it('manage_status', async () => {
    await call('set_metadata', { id: ids.b, status: 'Revizuit' });
    await call('manage_status', { action: 'rename', name: 'Revizuit', new_name: 'Revăzut' });
    expect(store.findNode(store.loadProject(dir).tree, ids.b).status).toBe('Revăzut');
    const list = await call('manage_status', { action: 'add', name: 'Tipar' });
    expect(list.at(-1)).toBe('Tipar');
    expect((await call('manage_status', { action: 'move', name: 'Tipar', delta: -1 })).at(-2)).toBe('Tipar');
  });

  it('manage_custom_field (values via set_metadata custom survive a rename)', async () => {
    await call('manage_custom_field', { action: 'add', title: 'POV', type: 'list', options: ['Ana', 'Ion'] });
    await call('set_metadata', { id: ids.a, custom: { POV: 'Ana' } });
    const fields = await call('manage_custom_field', { action: 'rename', title: 'POV', new_title: 'Narator' });
    expect(fields[0]).toMatchObject({ title: 'Narator', type: 'list' });
    expect(fields[0].options.map((o) => o.title)).toEqual(['Ana', 'Ion']);
    expect(store.findNode(store.loadProject(dir).tree, ids.a).custom).toEqual({ Narator: 'Ana' });
    await call('manage_custom_field', { action: 'add', title: 'Data', type: 'date' });
  });

  it('manage_section_type and set_metadata section_type', async () => {
    await call('manage_section_type', { action: 'add', title: 'Capitol' });
    await call('manage_section_type', { action: 'add', title: 'Scenă' });
    await call('set_metadata', { id: ids.a, section_type: 'Scenă' });
    const res = await call('manage_section_type', { action: 'set_level', title: 'Capitol', level: 'folders' });
    expect(res.sectionTypeLevels.folders).toBe(res.sectionTypes[0].id);
    await call('manage_section_type', { action: 'rename', title: 'Scenă', new_title: 'Secvență' });
    expect(store.findNode(store.loadProject(dir).tree, ids.a).sectionType).toBe('Secvență');
    await expect(call('set_metadata', { id: ids.a, section_type: 'Nu' })).rejects.toThrow(/Tip de secțiune/);
    expect((await call('project_info')).sectionTypes.length).toBe(2);
  });

  it('get_targets / set_targets', async () => {
    await call('set_targets', { draft: 1000, deadline: '2099-12-31', writing_days: [1, 2, 3, 4, 5] });
    await call('set_metadata', { id: ids.b, target: 100 });
    const t = await call('get_targets');
    expect(t.targets).toMatchObject({ draft: 1000, deadline: '2099-12-31' });
    expect(t.plan.perDay).toBeGreaterThan(0);
    expect(t.documents.find((d) => d.id === ids.b).words).toBeGreaterThan(0);
    await expect(call('set_targets', { deadline: '31.12.2099' })).rejects.toThrow();
  });

  it('list_collections / manage_collection (manual and saved search)', async () => {
    const c = await call('manage_collection', { action: 'create', title: 'De revăzut', ids: [ids.c, ids.a] });
    await call('manage_collection', { action: 'add', collection_id: c.id, ids: [ids.b] });
    await call('manage_collection', { action: 'move', collection_id: c.id, ids: [ids.b], index: 0 });
    await call('manage_collection', { action: 'remove', collection_id: c.id, ids: [ids.a] });
    await call('manage_collection', { action: 'rename', collection_id: c.id, title: 'Revizie' });
    await call('manage_collection', { action: 'create', title: 'Maria', type: 'search', query: 'Maria' });
    const list = await call('list_collections');
    expect(list.find((x) => x.title === 'Revizie').items.map((n) => n.id)).toEqual([ids.b, ids.c]);
    expect(list.find((x) => x.title === 'Maria').items.map((n) => n.id).sort()).toEqual([ids.b, ids.c].sort());
    // Compile limited to a collection.
    const file = path.join(tmp, 'colectie.txt');
    await call('compile', { format: 'txt', output_path: file, collection_id: c.id });
    expect(fs.readFileSync(file, 'utf8')).not.toContain('Primul text');
    await expect(call('manage_collection', { action: 'add', collection_id: c.id, ids: ['nu-exista'] })).rejects.toThrow(/inexistent/);
    expect(await call('manage_collection', { action: 'delete', collection_id: c.id })).toMatch(/ștearsă/);
  });

  it('list_bookmarks / manage_bookmark', async () => {
    await call('manage_bookmark', { action: 'add', id: ids.c });
    expect(await call('list_bookmarks')).toEqual([{ id: ids.c, title: 'Scena C' }]);
    expect(await call('manage_bookmark', { action: 'remove', id: ids.c })).toEqual([]);
  });
});

describe('MCP integral: comments, footnotes, documents, trash, snapshots', () => {
  it('list_comments / update_comment / delete_comment (add_comment writes the attributes the app reads)', async () => {
    await call('add_comment', { id: ids.b, quote: 'Maria', comment: 'Nume?' });
    const fromAgent = (await call('list_comments', { id: ids.b }))[0];
    expect(fromAgent).toMatchObject({ text: 'Nume?', on: 'Maria', author: 'Agent AI' });
    expect(fromAgent.date).toMatch(/^\d{4}-/);
    expect((await call('list_comments')).map((d) => d.id)).toEqual(expect.arrayContaining([ids.a, ids.b]));
    expect(await call('update_comment', { id: ids.a, index: 0, text: 'Rezolvat?', color: '#ffcc00' })).toMatchObject({ text: 'Rezolvat?', color: '#ffcc00', author: 'Ana' });
    await call('delete_comment', { id: ids.a, index: 0 });
    const html = store.readDoc(dir, ids.a);
    expect(html).not.toContain('data-comment');
    expect(html).toContain('Fraza comentată');
    expect((await call('list_snapshots', { id: ids.a })).length).toBe(2);
    await expect(call('delete_comment', { id: ids.a, index: 5 })).rejects.toThrow(/inexistent/);
  });

  it('list_footnotes', async () => {
    const notes = await call('list_footnotes', { id: ids.a });
    expect(notes).toEqual([expect.objectContaining({ kind: 'inline', text: 'Sursa 1' })]);
    expect(notes[0].before).toMatch(/al doilea paragraf$/);
    expect((await call('list_footnotes')).map((d) => d.id)).toEqual([ids.a]);
  });

  it('duplicate_item (text and notes copied)', async () => {
    await call('set_notes', { id: ids.c, content: 'Nota C' });
    const res = await call('duplicate_item', { id: ids.c });
    expect(res.path).toBe('Manuscris / Scena C (copie)');
    expect(store.readDoc(dir, res.id)).toBe(store.readDoc(dir, ids.c));
    expect(await call('get_notes', { id: res.id })).toBe('Nota C');
    const order = store.loadProject(dir).tree[0].children.map((n) => n.id);
    expect(order[order.indexOf(ids.c) + 1]).toBe(res.id);
  });

  it('split_document inside a paragraph and inside a comment', async () => {
    const doc = store.newNode('text', 'De împărțit');
    store.writeDoc(dir, doc.id, 'docs', '<p>Început <em>aici și</em> continuare.</p><p>Paragraf <span data-comment="c" class="comment">doi cu comentariu</span> final.</p>');
    store.updateProject(dir, (p) => {
      p.tree[0].children.push(doc);
    });
    const res = await call('split_document', { id: doc.id, at_text: 'cu comentariu', new_title: 'Partea 2' });
    expect(store.readDoc(dir, doc.id)).toBe('<p>Început <em>aici și</em> continuare.</p><p>Paragraf <span data-comment="c" class="comment">doi </span></p>');
    expect(store.readDoc(dir, res.id)).toBe('<p><span data-comment="c" class="comment">cu comentariu</span> final.</p>');
    expect(res.path).toBe('Manuscris / Partea 2');
    const res2 = await call('split_document', { id: doc.id, at_text: 'Paragraf' });
    expect(store.readDoc(dir, doc.id)).toBe('<p>Început <em>aici și</em> continuare.</p>');
    expect(store.readDoc(dir, res2.id)).toBe('<p>Paragraf <span data-comment="c" class="comment">doi </span></p>');
    expect((await call('list_snapshots', { id: doc.id })).length).toBe(2);
    await expect(call('split_document', { id: doc.id, at_text: 'Început' })).rejects.toThrow(/goală/);
    await expect(call('split_document', { id: doc.id, at_text: 'nu există' })).rejects.toThrow(/nu a fost găsit/);
  });

  it('merge_documents (others go to the trash) / list_trash / restore_from_trash / empty_trash', async () => {
    const x = await call('create_document', { title: 'X', content: 'Textul X.', synopsis: 'sx' });
    const y = await call('create_document', { title: 'Y', content: 'Textul Y.', synopsis: 'sy' });
    await call('set_notes', { id: y.id, content: 'Nota Y' });
    expect(await call('merge_documents', { ids: [y.id, x.id] })).toMatch(/Unite în „X”/);
    expect(store.readDoc(dir, x.id)).toBe('<p>Textul X.</p><p>* * *</p><p>Textul Y.</p>');
    expect(await call('get_notes', { id: x.id })).toBe('Nota Y');
    expect(store.findNode(store.loadProject(dir).tree, x.id).synopsis).toBe('sx\nsy');
    expect((await call('list_trash')).map((n) => n.id)).toContain(y.id);
    expect(await call('restore_from_trash', { id: y.id })).toMatch(/^Restaurat la: Manuscris \/ Y/);
    await call('trash_item', { id: y.id });
    expect(await call('empty_trash')).toMatch(/^1 elemente/);
    expect(await call('list_trash')).toEqual([]);
    expect(fs.existsSync(path.join(dir, 'docs', `${y.id}.html`))).toBe(true); // recoverable
  });

  it('convert_item', async () => {
    const res = await call('convert_item', { id: ids.c, type: 'folder' });
    expect(res).toMatch(/dosar/);
    expect(store.findNode(store.loadProject(dir).tree, ids.c).children).toEqual([]);
    await call('convert_item', { id: ids.c, type: 'text' });
    await expect(call('convert_item', { id: 'draft', type: 'text' })).rejects.toThrow();
  });

  it('compare_snapshots (snapshot vs snapshot and vs current) / manage_snapshot', async () => {
    const s1 = await call('take_snapshot', { id: ids.b, name: 'v1' });
    await call('write_document', { id: ids.b, content: 'Al doilea text, Maria și Ion tac.' });
    const [latest] = await call('list_snapshots', { id: ids.b });
    const vsCurrent = await call('compare_snapshots', { id: ids.b, file_a: s1.file });
    expect(vsCurrent.diff).toContain('[-vorbesc-]{+tac+}.');
    expect(vsCurrent.added).toBe(1);
    const two = await call('compare_snapshots', { id: ids.b, file_a: s1.file, file_b: latest.file });
    expect(two.to).toBe(latest.name);
    await call('manage_snapshot', { id: ids.b, file: s1.file, action: 'rename', name: 'Prima versiune' });
    expect((await call('list_snapshots', { id: ids.b })).some((s) => s.name === 'Prima versiune')).toBe(true);
    await call('manage_snapshot', { id: ids.b, file: s1.file, action: 'delete' });
    expect((await call('list_snapshots', { id: ids.b })).some((s) => s.file === s1.file)).toBe(false);
    expect(fs.readdirSync(path.join(dir, 'snapshots', '_backup')).some((f) => f.endsWith(s1.file))).toBe(true);
    await expect(call('manage_snapshot', { id: ids.b, file: '../../project.json', action: 'delete' })).rejects.toThrow(/inexistent/);
  });
});

describe('MCP integral: analysis, research, glossary, lookups, backups, editorial', () => {
  it('statistics', async () => {
    const s = await call('statistics', { top_words: 5 });
    expect(s.words).toBeGreaterThan(10);
    expect(s.documents).toBeGreaterThanOrEqual(3);
    expect(s.topWords.length).toBeLessThanOrEqual(5);
    expect(s.sentences.histogram.length).toBe(7);
    expect((await call('statistics', { ids: [ids.b] })).documents).toBe(1);
  });

  it('timeline', async () => {
    await call('set_metadata', { id: ids.c, custom: { Date: '2020-05-01', POV: 'Ion' } });
    await call('set_metadata', { id: ids.b, custom: { Date: '2020-06-01', POV: 'Ana' } });
    const t = await call('timeline');
    expect(t.events.map((e) => e.id)).toEqual([ids.c, ids.b]);
    expect(t.events[1].outOfOrder).toBe(true);
    expect(t.lanes).toEqual(['Ana', 'Ion']);
  });

  it('analyze_pacing and character_relations', async () => {
    const pacing = await call('analyze_pacing');
    expect(pacing.summary.count).toBeGreaterThanOrEqual(3);
    const rel = await call('character_relations');
    expect(rel.pairs.some((e) => [e.a, e.b].sort().join() === 'Ion,Maria')).toBe(true);
  });

  it('research_search (BM25 over manuscript, research and notes; re-indexes changed texts)', async () => {
    const hits = await call('research_search', { query: 'Maria pleacă' });
    expect(hits[0].id).toBe(ids.c);
    await call('write_document', { id: ids.c, content: 'Un text despre munți.' });
    expect((await call('research_search', { query: 'munți' }))[0].id).toBe(ids.c);
    expect((await call('research_search', { query: 'Nota C', kinds: ['notes'] }))[0].kind).toBe('notes');
  });

  it('glossary_add / glossary_list (creates "Glosar" in Research once, no duplicates)', async () => {
    expect((await call('glossary_list')).document).toBe(null);
    const first = await call('glossary_add', { term: 'drumuln', definition: 'faptă' });
    expect(first.created).toBe(true);
    const second = await call('glossary_add', { term: 'dharma' });
    expect(second.id).toBe(first.id);
    await expect(call('glossary_add', { term: 'Drumuln' })).rejects.toThrow(/deja în glosar/);
    const g = await call('glossary_list');
    expect(g.document.title).toBe('Glosar');
    expect(g.entries).toEqual([{ term: 'drumuln', definition: 'faptă' }, { term: 'dharma', definition: '' }]);
    expect(store.readDoc(dir, first.id)).toBe('<p><strong>drumuln</strong> — faptă</p><p><strong>dharma</strong> — </p>');
    expect((await call('list_binder', { root_id: 'research' }))[0].children.filter((n) => n.title === 'Glosar').length).toBe(1);
  });

  it('build_glossaries', async () => {
    store.writeDoc(dir, ids.b, 'docs', "<p>Fapta, <strong><em>faptă</em></strong> 'drumuln', rămâne.</p>");
    const g = await call('build_glossaries');
    expect(g.alogen.terms.map((t) => t.term)).toContain('drumuln');
    expect(Array.isArray(g.toc.entries)).toBe(true);
  });

  it('lookup_url (DeepL, dictionaries, research sites)', async () => {
    const deepl = await call('lookup_url', { text: 'a/b', kind: 'deepl', to: 'en' });
    expect(deepl.url).toBe('https://www.deepl.com/translator#auto/en/a%5C%2Fb');
    const groups = await call('lookup_url', { text: 'drumul' });
    expect(groups.dict.map((x) => x.kind)).toContain('dictionary');
    expect(groups.research.map((x) => x.kind)).toContain('wikipedia');
    await expect(call('lookup_url', { text: 'x'.repeat(200), kind: 'dictionary' })).rejects.toThrow(/prea lung/);
  });

  it('backup_now / list_backups / restore_backup (as a new project next to the original)', async () => {
    const bdir = path.join(tmp, 'backups');
    const made = await call('backup_now', { backup_dir: bdir });
    expect(made.file.startsWith(bdir)).toBe(true);
    const list = await call('list_backups', { backup_dir: bdir });
    expect(list.length).toBe(1);
    const res = await call('restore_backup', { name: list[0].name, backup_dir: bdir });
    expect(res.dir).toMatch(/restaurat/);
    expect((await call('project_info', { project: res.dir })).title).toBe('Carte');
    await expect(call('restore_backup', { name: '../x.zip', backup_dir: bdir })).rejects.toThrow(/necunoscut/);
    // Default folder: "<Proiect>.backups" next to the project; the zip holds the project.
    const def = await call('backup_now');
    expect(path.dirname(def.file)).toBe(`${dir.replace(/\.scribner$/, '')}.backups`);
    const zip = await JSZip.loadAsync(fs.readFileSync(def.file));
    expect(Object.keys(zip.files)).toContain('Carte.scribner/project.json');
    await expect(call('backup_now', { backup_dir: path.join(dir, 'b') })).rejects.toThrow(/interiorul unui proiect/);
  });

  it('editorial_autofix and editorial_round (round prompt for the client, no AI call)', async () => {
    const a = await call('create_document', { title: 'Corectură', content: 'text cu "ghilimele"  drepte.' });
    expect(await call('editorial_autofix', { id: a.id })).toMatch(/^1 documente/);
    expect(store.readDoc(dir, a.id)).toBe('<p>Text cu „ghilimele” drepte.</p>');
    expect(await call('editorial_autofix', { id: a.id })).toMatch(/^0 documente/);
    const rounds = await call('editorial_round');
    expect(rounds.map((r) => r.id)).toContain('R11');
    const r = await call('editorial_round', { id: a.id, round: 'R6' });
    expect(r.prompt).toContain('I-EDIT · runda R6');
    expect(r.prompt).toContain('Text cu „ghilimele” drepte.');
    expect(r.system).toContain('Profil editorial');
    await expect(call('editorial_round', { id: a.id, round: 'R99' })).rejects.toThrow(/Rundă necunoscută/);
  });

  it('every write is logged with long strings shortened', async () => {
    const log = readLog(dir);
    const tools = new Set(log.map((l) => l.tool));
    for (const t of ['import_files', 'manage_label', 'split_document', 'merge_documents', 'glossary_add', 'backup_now', 'editorial_autofix', 'export_documents']) expect(tools.has(t), t).toBe(true);
    expect(JSON.stringify(log).length).toBeLessThan(200000);
  });
});

describe('MCP integral --read-only', () => {
  it('refuses every new write tool, serves the read tools and does not touch the disk', async () => {
    const roTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-full-ro-'));
    const p = makeProject(roTmp, 'Doar citire');
    fs.writeFileSync(path.join(roTmp, 'x.md'), '# x');
    fs.writeFileSync(path.join(roTmp, 'x.bib'), '@book{a, title={A}}');
    fs.mkdirSync(path.join(roTmp, 'mini.scriv'));
    fs.writeFileSync(path.join(roTmp, 'mini.scriv', 'mini.scrivx'), '<?xml version="1.0"?><ScrivenerProject><Binder><BinderItem UUID="X" Type="Text"><Title>T</Title></BinderItem></Binder></ScrivenerProject>');
    const before = snapshotTree(roTmp);
    const { call: ro } = await connect(p.dir, ['--read-only']);
    const ctx = { tmp: roTmp, a: p.a, b: p.b, md: path.join(roTmp, 'x.md'), bib: path.join(roTmp, 'x.bib') };
    for (const [name, args] of Object.entries(NEW_WRITE_TOOLS(ctx))) {
      await expect(ro(name, args), name).rejects.toThrow(/doar-citire/);
    }
    for (const [name, args] of Object.entries(NEW_READ_TOOLS(ctx))) {
      if (name === 'compare_snapshots') continue; // needs a snapshot; read-only cannot take one
      await ro(name, args);
    }
    expect(snapshotTree(roTmp)).toEqual(before);
  }, 30000);
});
