// Web build on a project folder shared with the desktop app through a sync client (OneDrive,
// Dropbox, a NAS). window.showDirectoryPicker returns an in-memory folder; "the other computer"
// writes into it directly. Checks: outside changes appear, the same document edited on both sides
// keeps the local text and saves the other version as a snapshot (with a message), conflict copies
// are reported on open, sync-client files are ignored.
// Run against `npx vite preview --outDir dist-web --port 4183` (no ?demo: the real web api).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { check, done } = require('./_helpers.cjs');
const URL = (process.env.SCRIBNER_URL || 'http://localhost:4183/?demo').replace(/\?demo$/, '');

const A = '3f2a9c1e-1111-4222-8333-444455556666';
const B = '3f2a9c1e-1111-4222-8333-777788889999';
const project = {
  format: 1,
  title: 'Carte comună',
  author: '',
  labels: [{ name: 'Fără', color: '' }],
  statuses: ['Fără'],
  tree: [
    { id: 'draft', title: 'Manuscris', type: 'folder', root: 'draft', children: [
      { id: A, title: 'Scena A', type: 'text', synopsis: '', label: 'Fără', status: 'Fără', includeInCompile: true, target: 0, keywords: [] },
      { id: B, title: 'Scena B', type: 'text', synopsis: '', label: 'Fără', status: 'Fără', includeInCompile: true, target: 0, keywords: [] },
    ] },
    { id: 'research', title: 'Cercetare', type: 'folder', root: 'research', children: [] },
    { id: 'trash', title: 'Coș', type: 'folder', root: 'trash', children: [] },
  ],
};

function initFs({ project, A, B }) {
  let clock = Date.now();
  const files = new Map([
    ['project.json', JSON.stringify(project, null, 2)],
    ['project-LAPTOP-ION.json', '{}'],
    ['desktop.ini', '[.ShellClassInfo]'],
    [`docs/${A}.html`, '<p>Textul A.</p>'],
    [`docs/${B}.html`, '<p>Textul B.</p>'],
    ['docs/Thumbs.db', 'x'],
    ['notes/.keep', ''],
  ]);
  const times = new Map([...files.keys()].map((k) => [k, clock]));
  const notFound = () => Object.assign(new Error('not found'), { name: 'NotFoundError' });
  const dirs = (p) => new Set([...files.keys()].filter((k) => k.startsWith(p)).map((k) => k.slice(p.length).split('/')).filter((x) => x.length > 1).map((x) => x[0]));
  const set = (k, v) => {
    files.set(k, v);
    times.set(k, (clock += 1000));
  };
  function fileHandle(k) {
    return {
      kind: 'file',
      name: k.split('/').pop(),
      async getFile() {
        if (!files.has(k)) throw notFound();
        const t = files.get(k);
        return { text: async () => t, size: new Blob([t]).size, lastModified: times.get(k) };
      },
      async createWritable() {
        let buf = '';
        return { write: async (t) => void (buf += t), close: async () => set(k, buf) };
      },
    };
  }
  function dirHandle(p) {
    return {
      kind: 'directory',
      __fake: true,
      name: p ? p.slice(0, -1).split('/').pop() : 'Carte.scribner',
      async isSameEntry(o) {
        return Boolean(o && o.__path === p);
      },
      __path: p,
      async queryPermission() {
        return 'granted';
      },
      async getDirectoryHandle(name, { create } = {}) {
        if (!dirs(p).has(name) && !create) throw notFound();
        return dirHandle(`${p}${name}/`);
      },
      async getFileHandle(name, { create } = {}) {
        if (!files.has(p + name)) {
          if (!create) throw notFound();
          set(p + name, '');
        }
        return fileHandle(p + name);
      },
      async removeEntry(name) {
        if (!files.has(p + name)) throw notFound();
        files.delete(p + name);
      },
      async *entries() {
        for (const d of dirs(p)) yield [d, dirHandle(`${p}${d}/`)];
        for (const k of [...files.keys()]) if (k.startsWith(p) && !k.slice(p.length).includes('/')) yield [k.slice(p.length), fileHandle(k)];
      },
    };
  }
  window.showDirectoryPicker = async () => dirHandle('');
  window.__otherComputer = { write: set, read: (k) => files.get(k), list: () => [...files.keys()] };
  // IndexedDB cannot store this fake handle (functions); the session keeps it in memory anyway.
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (v, k) {
    return put.call(this, v && v.__fake ? 'fake-handle' : v, k);
  };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(initFs, { project, A, B });
  await page.goto(URL);
  await page.getByText('Deschide proiect .scribner').first().click();
  await page.waitForSelector('.pane .ProseMirror');
  const toastText = async () => (await page.locator('.toast').allInnerTexts()).join(' | ');
  await page.waitForTimeout(500);
  const t0 = await toastText();
  check('conflict copy reported on open', t0.includes('project-LAPTOP-ION.json') && !t0.includes('desktop.ini'), t0);
  await page.locator('.toast button').first().click().catch(() => {});

  const ed = page.locator('.pane .ProseMirror').first();
  await page.locator('.binder-row', { hasText: 'Scena A' }).first().click();
  await page.waitForTimeout(300);

  // 1. Another document changed on the other computer: appears within seconds.
  await page.evaluate((B) => window.__otherComputer.write(`docs/${B}.html`, '<p>Textul B, scris pe laptop.</p>'), B);
  await page.waitForTimeout(3800);
  await page.locator('.binder-row', { hasText: 'Scena B' }).first().click();
  await page.waitForTimeout(300);
  check('outside change of another document shows up', (await ed.innerText()).includes('scris pe laptop'), await ed.innerText());

  // 2. Same document: typing here while the other computer saves it.
  await page.locator('.binder-row', { hasText: 'Scena A' }).first().click();
  await page.waitForTimeout(300);
  await ed.click();
  await page.keyboard.press('Control+End');
  await page.evaluate((A) => window.__otherComputer.write(`docs/${A}.html`, '<p>Textul A, varianta de pe laptop.</p>'), A);
  for (let i = 0; i < 25; i++) {
    await page.keyboard.type('x');
    await page.waitForTimeout(170);
  }
  await page.waitForTimeout(1500);
  const text = await ed.innerText();
  check('local typing kept in the editor', text.includes('xxxxxxxxxx') && !text.includes('varianta de pe laptop'), text);
  const disk = await page.evaluate((A) => window.__otherComputer.read(`docs/${A}.html`), A);
  check('local text saved to the folder', disk.includes('xxxxxxxxxx'), disk);
  const snapFiles = await page.evaluate((A) => window.__otherComputer.list().filter((k) => k.startsWith(`snapshots/${A}/`)).map((k) => window.__otherComputer.read(k)), A);
  check('other version kept as a snapshot', snapFiles.some((s) => s.includes('varianta de pe laptop') && s.includes('Versiunea de pe celălalt calculator')), snapFiles.join('\n'));
  const t1 = await toastText();
  check('writer is told', t1.includes('Scena A') && t1.includes('celălalt calculator'), t1);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
