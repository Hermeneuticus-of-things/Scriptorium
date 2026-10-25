// Builds the shared test project for the visual audit: one .scribner project and the same project
// exported as .scriv, so both programs open identical content.
// Usage: node scripts/ui-audit/make-test-project.cjs <outDir>
const fs = require('fs');
const path = require('path');
const store = require('../../lib/store.cjs');
const { exportScriv } = require('../../lib/scrivExport.cjs');
const { scrivExportIo } = require('../../electron/v04Handlers.cjs');

const out = path.resolve(process.argv[2] || 'ui-audit-project');
fs.mkdirSync(out, { recursive: true });
const dir = path.join(out, 'Audit vizual.scribner');
const p = store.createProject(dir, 'Audit vizual');
const draft = p.tree.find((n) => n.root === 'draft');
const chapters = ['Capitolul unu', 'Capitolul doi'].map((t, i) => {
  const ch = store.newNode('folder', t, p);
  ch.children = [1, 2].map((k) => {
    const d = store.newNode('text', `Scena ${i + 1}.${k}`, p);
    d.synopsis = `Rezumatul scenei ${i + 1}.${k}.`;
    store.writeDoc(dir, d.id, 'docs', `<p>Text de probă pentru scena ${i + 1}.${k}. Are câteva cuvinte.</p>`);
    return d;
  });
  return ch;
});
draft.children = [...(draft.children || []), ...chapters];
store.saveProject(dir, p);
const res = exportScriv(store.loadProject(dir), scrivExportIo(store, dir), out);
console.log(JSON.stringify({ scribner: dir, scriv: res.dir }));
