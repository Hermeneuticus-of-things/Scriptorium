// Main-process logic for external edits and multi-window (lib/projectWatch.cjs) and
// the project.json three-way merge (src/lib/projectMerge.js).
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
import { mergeProject } from '../src/lib/projectMerge.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');
const { createChangeTracker, createClaimRegistry, saveMerged } = require('../lib/projectWatch.cjs');

const tmpProject = () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sync-')), 'P.scribner');
  const p = store.createProject(dir, 'P');
  const a = store.newNode('text', 'A');
  const b = store.newNode('text', 'B');
  const f = store.newNode('folder', 'Dosar');
  p.tree[0].children = [a, b, f];
  store.saveProject(dir, p);
  return { dir, p, a, b, f };
};

function fakeClock() {
  let t = 1000;
  const timers = [];
  return {
    now: () => t,
    setTimer: (fn, ms) => {
      const h = { fn, at: t + ms, live: true };
      timers.push(h);
      return h;
    },
    clearTimer: (h) => h && (h.live = false),
    advance(ms) {
      t += ms;
      for (const h of timers) if (h.live && h.at <= t) {
        h.live = false;
        h.fn();
      }
    },
  };
}

describe('change tracker (fs.watch events → project:changed)', () => {
  const setup = () => {
    const { dir, a } = tmpProject();
    const clock = fakeClock();
    const flushed = [];
    const tr = createChangeTracker({ dir, onFlush: (f) => flushed.push(f), ...clock });
    return { dir, a, clock, flushed, tr };
  };

  it('ignores its own writes by content, but not an external write right after one', () => {
    const { dir, a, clock, flushed, tr } = setup();
    const file = path.join(dir, 'docs', `${a.id}.html`);
    tr.noteWrite(file, '<p>app</p>');
    store.writeDoc(dir, a.id, 'docs', '<p>app</p>');
    expect(tr.handle(`docs/${a.id}.html`)).toBe(false);
    // An MCP agent writes the same file 100 ms later: the old 2 s time window swallowed this.
    clock.advance(100);
    store.writeDoc(dir, a.id, 'docs', '<p>agent</p>');
    expect(tr.handle(`docs/${a.id}.html`)).toBe(true);
    clock.advance(400);
    expect(flushed).toEqual([[`docs/${a.id}.html`]]);
  });

  it('reports only project files: temp, swap, lock and sync-client files are ignored', () => {
    const { dir, a, clock, flushed, tr } = setup();
    for (const rel of [`docs/${a.id}.html.tmp`, `docs/.${a.id}.html.swp`, `docs/${a.id}.html~`, 'project.json.lock', 'project.json.123.ab12.tmp', '.syncthing.project.json.tmp', '.dropbox.cache/x', 'snapshots/x/1.json', 'agent-log.jsonl', 'history.json', 'media/x.png', 'docs']) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      if (!fs.existsSync(path.join(dir, rel))) fs.writeFileSync(path.join(dir, rel), 'x');
      expect(tr.handle(rel), rel).toBe(false);
    }
    // An editor's rename-based save ends with an event on the real name (Windows separators too).
    store.writeDoc(dir, a.id, 'docs', '<p>vim</p>');
    expect(tr.handle(`docs\\${a.id}.html`)).toBe(true);
    clock.advance(500);
    expect(flushed).toEqual([[`docs/${a.id}.html`]]);
  });

  it('does not report a deleted file (sync clients delete then recreate)', () => {
    const { dir, a, clock, flushed, tr } = setup();
    store.writeDoc(dir, a.id, 'docs', '<p>x</p>');
    fs.unlinkSync(path.join(dir, 'docs', `${a.id}.html`));
    expect(tr.handle(`docs/${a.id}.html`)).toBe(false);
    clock.advance(1000);
    expect(flushed).toEqual([]);
    store.writeDoc(dir, a.id, 'docs', '<p>back</p>');
    expect(tr.handle(`docs/${a.id}.html`)).toBe(true);
  });

  it('debounces bursts into one notification but never waits longer than maxWait', () => {
    const { dir, a, clock, flushed, tr } = setup();
    store.writeDoc(dir, a.id, 'docs', '<p>x</p>');
    for (let i = 0; i < 30; i++) {
      tr.handle(`docs/${a.id}.html`);
      tr.handle('project.json');
      clock.advance(100); // a steady stream faster than the 400 ms debounce
    }
    expect(flushed.length).toBeGreaterThanOrEqual(1);
    expect(flushed.length).toBeLessThanOrEqual(2);
    expect(new Set(flushed[0])).toEqual(new Set([`docs/${a.id}.html`, 'project.json']));
  });

  it('writers that do not pass the content keep the old 2 s window', () => {
    const { dir, a, clock, tr } = setup();
    store.writeDoc(dir, a.id, 'docs', '<p>x</p>');
    tr.noteWrite(path.join(dir, 'docs', `${a.id}.html`));
    expect(tr.handle(`docs/${a.id}.html`)).toBe(false);
    clock.advance(2500);
    expect(tr.handle(`docs/${a.id}.html`)).toBe(true);
  });
});

describe('window claims (multi-window)', () => {
  it('a project is open in one window at a time; close / crash releases it', () => {
    const alive = new Set([1, 2]);
    const reg = createClaimRegistry({ isAlive: (id) => alive.has(id) });
    expect(reg.claim(1, '/x/P.scribner').ok).toBe(true);
    expect(reg.claim(1, '/x/./P.scribner').ok).toBe(true); // same window, same project (normalized)
    expect(reg.claim(2, '/x/P.scribner')).toEqual({ ok: false, owner: 1 });
    reg.release(1); // window closed / project:release
    expect(reg.claim(2, '/x/P.scribner').ok).toBe(true);
    // Window 2 crashes without a release: a dead owner never blocks.
    alive.delete(2);
    expect(reg.claim(1, '/x/P.scribner').ok).toBe(true);
    expect(reg.ownerOf('/x/P.scribner')).toBe(1);
  });

  it('switching projects in a window frees the previous one', () => {
    const reg = createClaimRegistry();
    reg.claim(1, '/a');
    expect(reg.release(1)).toBe(path.resolve('/a'));
    reg.claim(1, '/b');
    expect(reg.ownerOf('/a')).toBe(null);
    expect(reg.claim(2, '/a').ok).toBe(true);
  });
});

describe('project.json three-way merge', () => {
  it('keeps both sides: app metadata edits + agent binder edits', () => {
    const { p: base, a, b, f } = tmpProject();
    const mine = structuredClone(base);
    mine.tree[0].children[0].title = 'A (app)';
    mine.targets.draft = 5;
    const theirs = structuredClone(base);
    theirs.tree[0].children[1].status = 'Final';
    const added = store.newNode('text', 'Din MCP');
    theirs.tree[0].children[2].children.push(added);
    const out = mergeProject(base, mine, theirs);
    const kids = out.tree[0].children;
    expect(kids.map((n) => n.id)).toEqual([a.id, b.id, f.id]);
    expect(kids[0].title).toBe('A (app)');
    expect(kids[1].status).toBe('Final');
    expect(kids[2].children.map((n) => n.id)).toEqual([added.id]);
    expect(out.targets.draft).toBe(5);
  });

  it('moves, trash and order from either side; same field on both sides: app wins', () => {
    const { p: base, a, b, f } = tmpProject();
    const mine = structuredClone(base);
    mine.tree[0].children.reverse(); // app reorders
    mine.tree[0].children.find((n) => n.id === a.id).synopsis = 'app';
    const theirs = structuredClone(base);
    // agent trashes B and edits A's synopsis
    const bNode = theirs.tree[0].children.splice(1, 1)[0];
    theirs.tree[2].children.push(bNode);
    theirs.tree[0].children[0].synopsis = 'agent';
    const out = mergeProject(base, mine, theirs);
    expect(out.tree[0].children.map((n) => n.id)).toEqual([f.id, a.id]);
    expect(out.tree[2].children.map((n) => n.id)).toEqual([b.id]);
    expect(out.tree[0].children[1].synopsis).toBe('app');
  });

  it('a node deleted on one side survives if the other side edited it; cycles do not lose nodes', () => {
    const { p: base, a, f } = tmpProject();
    const mine = structuredClone(base);
    mine.tree[0].children.find((n) => n.id === a.id).title = 'editat';
    const theirs = structuredClone(base);
    theirs.tree[0].children = theirs.tree[0].children.filter((n) => n.id !== a.id); // emptied from trash
    expect(mergeProject(base, mine, theirs).tree[0].children.some((n) => n.id === a.id)).toBe(true);
    const untouched = structuredClone(base);
    untouched.tree[0].children[1].title = 'altceva';
    expect(mergeProject(base, untouched, theirs).tree[0].children.some((n) => n.id === a.id)).toBe(false);

    // Folder F into new folder G here, G into F there.
    const g = store.newNode('folder', 'G');
    const base2 = structuredClone(base);
    base2.tree[0].children.push(g);
    const m2 = structuredClone(base2);
    const t2 = structuredClone(base2);
    const fm = m2.tree[0].children.findIndex((n) => n.id === f.id);
    m2.tree[0].children.find((n) => n.id === g.id).children.push(m2.tree[0].children.splice(fm, 1)[0]);
    const gt = t2.tree[0].children.findIndex((n) => n.id === g.id);
    t2.tree[0].children.find((n) => n.id === f.id).children.push(t2.tree[0].children.splice(gt, 1)[0]);
    const out = mergeProject(base2, m2, t2);
    const ids = [];
    store.walk(out.tree, (n) => ids.push(n.id));
    expect(ids.filter((id) => id === f.id || id === g.id).sort()).toEqual([f.id, g.id].sort());
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('project:save with merge (saveMerged)', () => {
  it('an app save after an MCP binder change merges instead of overwriting it', () => {
    const { dir, a } = tmpProject();
    const base = fs.readFileSync(path.join(dir, 'project.json'), 'utf8');
    // The app window holds `base` in memory. An agent adds a document meanwhile.
    store.updateProject(dir, (p) => {
      p.tree[0].children.push({ ...store.newNode('text', 'Agent'), id: 'agent-doc' });
    });
    const mine = JSON.parse(base);
    mine.tree[0].children[0].label = 'Idee';
    const noted = [];
    const res = saveMerged(dir, mine, base, { noteWrite: (f, raw) => noted.push(raw) });
    expect(res.merged).toBe(true);
    const disk = store.loadProject(dir);
    expect(disk.tree[0].children.map((n) => n.id)).toContain('agent-doc');
    expect(disk.tree[0].children.find((n) => n.id === a.id).label).toBe('Idee');
    expect(noted[0]).toBe(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
    // The window saves again from its old state (before it reloaded): still merged.
    mine.tree[0].children[1].title = 'B2';
    saveMerged(dir, mine, base);
    const again = store.loadProject(dir).tree[0].children;
    expect(again.map((n) => n.id)).toContain('agent-doc');
    expect(again.find((n) => n.title === 'B2')).toBeTruthy();
  });

  it('without an external change it is a plain save', () => {
    const { dir } = tmpProject();
    const base = fs.readFileSync(path.join(dir, 'project.json'), 'utf8');
    const mine = JSON.parse(base);
    mine.title = 'T';
    expect(saveMerged(dir, mine, base).merged).toBe(false);
    expect(store.loadProject(dir).title).toBe('T');
  });

  it('serializes with an MCP writer through the lock', () => {
    const { dir } = tmpProject();
    fs.writeFileSync(path.join(dir, 'project.json.lock'), 'mcp');
    expect(() => store.withProjectLock(dir, () => 0, { timeoutMs: 50 })).toThrow(/ocupat/);
    fs.unlinkSync(path.join(dir, 'project.json.lock'));
    expect(saveMerged(dir, store.loadProject(dir), null).merged).toBe(false);
  });
});

vi.restoreAllMocks();
