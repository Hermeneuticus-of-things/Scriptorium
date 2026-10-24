// MCP server edge cases: unknown / trashed ids, projects without a trash root, huge
// documents, unicode, concurrent calls, --read-only, snapshots before writes, the
// agent log, the project.json lock shared with the app, path traversal.
import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');

const clients = [];
afterAll(async () => {
  for (const c of clients) await c.close().catch(() => {});
});

function makeProject(title = 'Carte') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-edge-'));
  const dir = store.projectDirFor(tmp, title);
  const p = store.createProject(dir, title);
  const a = store.newNode('text', 'Scena A');
  const b = store.newNode('text', 'Scena B');
  p.tree[0].children.push(a, b);
  store.saveProject(dir, p);
  store.writeDoc(dir, a.id, 'docs', '<p>Primul text.</p>');
  store.writeDoc(dir, b.id, 'docs', '<p>Al doilea text.</p>');
  return { tmp, dir, a, b };
}

async function connect(dir, extra = []) {
  const client = new Client({ name: 'edge', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir, ...extra], stderr: 'ignore' }));
  clients.push(client);
  const call = async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const t = res.content[0].text;
    if (res.isError) throw new Error(t);
    try {
      return JSON.parse(t);
    } catch {
      return t;
    }
  };
  return { client, call };
}

const readLog = (dir) => {
  const f = path.join(dir, 'agent-log.jsonl');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
};

// Every file (path + content) under dir.
function snapshotTree(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) {
        out[path.relative(dir, f) + '/'] = '';
        walk(f);
      } else out[path.relative(dir, f)] = fs.readFileSync(f, 'utf8');
    }
  };
  walk(dir);
  return out;
}

describe('MCP --read-only', () => {
  it('blocks every write tool and does not touch the disk at all', async () => {
    const { dir, a, b, tmp } = makeProject();
    fs.rmSync(path.join(dir, 'media'), { recursive: true }); // a read must not recreate folders
    const before = snapshotTree(dir);
    const { call, client } = await connect(dir, ['--read-only']);
    const { tools } = await client.listTools();
    const writes = {
      write_document: { id: a.id, content: 'x' },
      create_document: { title: 'Nou' },
      move_item: { id: a.id, target_id: b.id, position: 'after' },
      set_metadata: { id: a.id, title: 'Alt titlu' },
      trash_item: { id: a.id },
      replace: { query: 'text', replacement: 'TEXT' },
      set_notes: { id: a.id, content: 'n' },
      add_comment: { id: a.id, quote: 'Primul', comment: 'c' },
      add_footnote: { id: a.id, after_quote: 'Primul', note: 'f' },
      take_snapshot: { id: a.id },
      restore_snapshot: { id: a.id, file: 'x.json' },
      compile: { format: 'html', output_path: path.join(tmp, 'out.html') },
    };
    for (const [name, args] of Object.entries(writes)) {
      await expect(call(name, args), name).rejects.toThrow(/doar-citire/);
    }
    // The read tools still work (the tools added later are covered in tests/mcpFull.test.js,
    // which also fails for any tool not classified as read or write).
    const reads = { list_binder: {}, project_info: {}, read_document: { id: a.id }, search: { query: 'text' }, get_notes: { id: a.id }, lint: { id: a.id }, list_snapshots: { id: a.id }, writing_history: {} };
    for (const t of Object.keys(reads)) {
      expect(tools.some((x) => x.name === t), t).toBe(true);
      await call(t, reads[t]);
    }
    await client.readResource({ uri: 'scribner://binder' });
    expect(snapshotTree(dir)).toEqual(before);
    expect(fs.existsSync(path.join(tmp, 'out.html'))).toBe(false);
  }, 30000);
});

describe('MCP edge inputs', () => {
  it('rejects unknown ids, ids pointing outside the binder and path traversal', async () => {
    const { dir, a } = makeProject();
    // A document file left behind by an item that is no longer in the binder.
    store.writeDoc(dir, 'orfan', 'docs', '<p>Text orfan</p>');
    const { call } = await connect(dir);
    for (const [name, args] of [
      ['add_comment', { id: 'orfan', quote: 'Text', comment: 'c' }],
      ['add_footnote', { id: 'orfan', after_quote: 'Text', note: 'f' }],
      ['restore_snapshot', { id: 'nu-exista', file: 'x.json' }],
      ['get_notes', { id: 'nu-exista' }],
      ['read_document', { id: '../../etc/passwd' }],
      ['set_notes', { id: '../x', content: 'x' }],
      ['take_snapshot', { id: '..' }],
      ['write_document', { id: 'draft', content: 'x' }],
    ]) {
      await expect(call(name, args), name).rejects.toThrow(/Element inexistent|Id invalid|Doar documentele|doar documentelor/);
    }
    expect(store.readDoc(dir, 'orfan')).toBe('<p>Text orfan</p>');
    await expect(call('compile', { format: 'html', output_path: path.join(dir, 'docs', `${a.id}.html`) })).rejects.toThrow(/interiorul unui proiect/);
    expect(store.readDoc(dir, a.id)).toBe('<p>Primul text.</p>');
    await expect(call('trash_item', { id: 'trash' })).rejects.toThrow(/Rădăcinile/);
  }, 30000);

  it('trash: an item already in the trash is not "trashed" again; search and replace skip it', async () => {
    const { dir, a, b } = makeProject();
    const { call } = await connect(dir);
    await call('trash_item', { id: a.id });
    await expect(call('trash_item', { id: a.id })).rejects.toThrow(/deja în coș/);
    expect((await call('search', { query: 'text' })).map((r) => r.id)).toEqual([b.id]);
    await call('replace', { query: 'text', replacement: 'TEXT' });
    expect(store.readDoc(dir, a.id)).toBe('<p>Primul text.</p>');
  }, 30000);

  it('works on a project without a trash root (older / imported projects) and an empty draft', async () => {
    const { dir } = makeProject();
    const p = store.loadProject(dir);
    p.tree = p.tree.filter((n) => n.root !== 'trash');
    p.tree[0].children = [];
    store.saveProject(dir, p);
    const { call } = await connect(dir);
    expect(await call('search', { query: 'text' })).toEqual([]);
    expect(await call('replace', { query: 'text', replacement: 'x' })).toMatch(/^0 înlocuiri/);
    expect((await call('project_info')).draftWords).toBe(0);
    const created = await call('create_document', { title: 'Primul' });
    await expect(call('trash_item', { id: created.id })).rejects.toThrow(/nu are coș/);
  }, 30000);

  it('unicode titles and content round-trip; huge documents are written but not copied into the log', async () => {
    const { dir } = makeProject();
    const { call } = await connect(dir);
    const title = 'Capitolul „Țară” / 🌸 <b>&amp; "x"';
    const big = Array.from({ length: 20000 }, (_, i) => `Paragraful ${i} cu diacritice ăîșțâ și emoji 🌸.`).join('\n\n');
    const created = await call('create_document', { title, content: big });
    expect(created.path).toBe(`Manuscris / ${title}`);
    const doc = await call('read_document', { id: created.id });
    expect(doc.title).toBe(title);
    expect(doc.content).toBe(big);
    await call('write_document', { id: created.id, content: big + '\n\nFinal.' });
    const log = readLog(dir);
    expect(JSON.stringify(log).length).toBeLessThan(10000);
    expect(log[0].tool).toBe('create_document');
    expect(log[0].input.title).toBe(title);
    expect(log[0].input.content).toMatch(/caractere\]$/);
    expect(log[0].result.id).toBe(created.id); // object results are logged, not just "ok"
  }, 30000);

  it('concurrent calls on the binder all land', async () => {
    const { dir } = makeProject();
    const { call } = await connect(dir);
    const made = await Promise.all(Array.from({ length: 25 }, (_, i) => call('create_document', { title: `D${i}` })));
    const ids = new Set(store.loadProject(dir).tree[0].children.map((n) => n.id));
    for (const m of made) expect(ids.has(m.id)).toBe(true);
    await Promise.all(made.map((m, i) => call('set_metadata', { id: m.id, synopsis: `s${i}` })));
    const tree = store.loadProject(dir).tree[0].children;
    expect(made.every((m, i) => tree.find((n) => n.id === m.id).synopsis === `s${i}`)).toBe(true);
  }, 30000);
});

describe('MCP safety: snapshots, backups and the project.json lock', () => {
  it('backs up project.json before binder writes and the notes before set_notes', async () => {
    const { dir, a } = makeProject();
    const { call } = await connect(dir);
    const original = fs.readFileSync(path.join(dir, 'project.json'), 'utf8');
    store.writeDoc(dir, a.id, 'notes', '<p>Note vechi</p>');
    await call('set_metadata', { id: a.id, title: 'Nou' });
    await call('set_notes', { id: a.id, content: 'Note noi' });
    const bdir = path.join(dir, 'snapshots', '_backup');
    const files = fs.readdirSync(bdir);
    const pj = files.filter((f) => f.endsWith('project.json'));
    expect(pj.length).toBe(1);
    expect(fs.readFileSync(path.join(bdir, pj[0]), 'utf8')).toBe(original);
    const notes = files.find((f) => f.endsWith(`notes-${a.id}.html`));
    expect(fs.readFileSync(path.join(bdir, notes), 'utf8')).toBe('<p>Note vechi</p>');
    // Backups never show up as a document's snapshots.
    expect(await call('list_snapshots', { id: a.id })).toEqual([]);
  }, 30000);

  it('waits for the app holding project.json.lock and applies its change on top of the app save', async () => {
    const { dir, a } = makeProject();
    const { call } = await connect(dir);
    await call('project_info'); // server up
    const lock = path.join(dir, 'project.json.lock');
    fs.writeFileSync(lock, 'app');
    const pending = call('set_metadata', { id: a.id, status: 'Final' });
    // While the "app" holds the lock it saves a binder change of its own.
    await new Promise((r) => setTimeout(r, 300));
    const p = store.loadProject(dir);
    p.tree[0].children.push(store.newNode('text', 'Din aplicație'));
    store.saveProject(dir, p);
    fs.unlinkSync(lock);
    await pending;
    const after = store.loadProject(dir).tree[0].children;
    expect(after.map((n) => n.title)).toContain('Din aplicație');
    expect(after.find((n) => n.id === a.id).status).toBe('Final');
    expect(fs.existsSync(lock)).toBe(false);
  }, 30000);

  it('takes over a stale lock left by a crashed writer', () => {
    const { dir } = makeProject();
    const lock = path.join(dir, 'project.json.lock');
    fs.writeFileSync(lock, '999999');
    const old = new Date(Date.now() - 60000);
    fs.utimesSync(lock, old, old);
    const p = store.updateProject(dir, (pr) => {
      pr.author = 'X';
    });
    expect(p.author).toBe('X');
    expect(fs.existsSync(lock)).toBe(false);
  });

  it('times out on a live lock instead of writing over it', () => {
    const { dir } = makeProject();
    fs.writeFileSync(path.join(dir, 'project.json.lock'), 'x');
    expect(() => store.withProjectLock(dir, () => 1, { timeoutMs: 100 })).toThrow(/ocupat/);
  });
});
