'use strict';
// A small, fixed book for evaluating the MCP server with an AI client (mcp/eval/evaluation.xml):
//   node mcp/eval/fixture.cjs <folder>   → creates "<folder>/Drumul spre munte.scribner"
// Every answer in evaluation.xml can be found with read-only tools in this project.
const path = require('path');
const store = require('../../lib/store.cjs');

function buildFixture(parent) {
  const dir = store.projectDirFor(parent, 'Drumul spre munte');
  const p = store.createProject(dir, 'Drumul spre munte');
  p.author = 'Autor Demo';
  p.labels = [{ name: 'Fără etichetă', color: '' }, { name: 'Flashback', color: '#7a5' }, { name: 'Acțiune', color: '#c33' }];
  const doc = (title, html, extra = {}) => {
    const n = { ...store.newNode('text', title), ...extra };
    store.writeDoc(dir, n.id, 'docs', html);
    return n;
  };
  const part1 = { ...store.newNode('folder', 'Partea întâi'), children: [] };
  const part2 = { ...store.newNode('folder', 'Partea a doua'), children: [] };
  part1.children.push(
    doc('Plecarea', '<p>Ilinca pleacă din Sibiu la ora șase, cu un rucsac verde.</p><p>Bunicul ei îi dăduse o busolă de alamă.</p>', { label: 'Acțiune', status: 'Final', keywords: ['busola'], synopsis: 'Ilinca pleacă spre munte.' }),
    doc('Amintirea', '<p>În copilărie, Ilinca urcase o singură dată pe Negoiu, cu tatăl ei.</p>', { label: 'Flashback', status: 'Prima ciornă' }),
  );
  part2.children.push(
    doc('Cabana', '<p>La cabana Bâlea, cabanierul Matei îi spune că poteca spre lac e închisă din cauza zăpezii.</p><p>Ilinca numără trei turiști la masă.</p>', { label: 'Acțiune', status: 'Revizuit', keywords: ['busola', 'cabana'] }),
    doc('Lacul', '<p>Lângă lac, Ilinca găsește urmele unui foc stins.<span data-footnote="Lacul Bâlea are 2034 m altitudine." class="footnote"></span></p><p><span data-comment="De verificat anul" data-comment-author="Ana" class="comment">Focul fusese aprins în 1998</span>.</p>', { label: 'Acțiune', status: 'De făcut', target: 1500 }),
  );
  p.tree[0].children = [part1, part2];
  const notes = p.tree[1];
  notes.children = [...(notes.children || []), doc('Personaje', '<p>Ilinca — 27 de ani, geolog.</p><p>Matei — cabanier, 61 de ani.</p>')];
  store.saveProject(dir, p);
  return dir;
}

module.exports = { buildFixture };
if (require.main === module) {
  const out = process.argv[2];
  if (!out) {
    process.stderr.write('Folosire: node mcp/eval/fixture.cjs <folder>\n');
    process.exit(2);
  }
  process.stdout.write(`${buildFixture(path.resolve(out))}\n`);
}
