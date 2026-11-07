// P1 #29 — the compile respects the per-item include/exclude (Contents tab): an excluded
// document never enters the output, an excluded folder takes its children with it, the binder
// order is kept for the rest, filterInvert and label/status filters still work, and an explicit
// scope (folder / selection) compiles exactly what it was given.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');

const fmt = (id) => F.PRESETS.find((p) => p.id === id);

function makeProject(extra = {}) {
  return {
    title: 'Drumul',
    author: 'Ion Popescu',
    sectionTypes: [
      { id: 'st1', title: 'Capitol' },
      { id: 'st2', title: 'Scenă' },
    ],
    sectionTypeLevels: { folders: 'st1', containers: null, files: 'st2' },
    tree: [
      {
        id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'c1', type: 'folder', title: 'Plecarea', children: [
            { id: 's1', type: 'text', title: 'Gara', label: 'Idee' },
            { id: 's2', type: 'text', title: 'Trenul', label: 'Fără' },
          ] },
          { id: 'cx', type: 'folder', title: 'Fără compile', includeInCompile: false, children: [
            { id: 'sy', type: 'text', title: 'Invizibil' },
          ] },
          { id: 'c2', type: 'folder', title: 'Sosirea', children: [
            { id: 's3', type: 'text', title: 'Peronul', label: 'Idee' },
            { id: 'sx', type: 'text', title: 'Exclus', includeInCompile: false },
            { id: 's4', type: 'text', title: 'Casa' },
          ] },
        ],
      },
    ],
    ...extra,
  };
}
const DOCS = {
  s1: '<p>Textul gării.</p>',
  s2: '<p>Textul trenului.</p>',
  s3: '<p>Textul peronului.</p>',
  s4: '<p>Textul casei.</p>',
  sy: '<p>Textul invizibil.</p>',
  sx: '<p>Textul exclus.</p>',
};
const read = (id) => DOCS[id] || '';
const ids = (doc) => doc.items.filter((x) => x.kind === 'section').map((x) => x.node.id);

describe('compile respects include/exclude per item (§23.4.1)', () => {
  it('an excluded document does not enter the output; the others keep the binder order', () => {
    const doc = compile.buildDocument(makeProject(), read, { format: fmt('manuscris'), titlePage: false });
    expect(ids(doc)).not.toContain('sx');
    expect(ids(doc)).toEqual(['c1', 's1', 's2', 'c2', 's3', 's4']);
  });

  it('a folder marked „fără compile” excludes its whole subtree automatically', () => {
    const doc = compile.buildDocument(makeProject(), read, { format: fmt('manuscris'), titlePage: false });
    expect(ids(doc)).not.toContain('cx');
    expect(ids(doc)).not.toContain('sy');
    expect(ids(doc)).not.toContain('sx');
  });

  it('label and status filters keep only the matching nodes (folders too)', () => {
    const doc = compile.buildDocument(makeProject(), read, { format: fmt('manuscris'), titlePage: false, labels: ['Idee'] });
    expect(ids(doc)).toEqual(['s1', 's3']);
    const doc2 = compile.buildDocument(makeProject(), read, { format: fmt('manuscris'), titlePage: false, statuses: ['Nimeni nu are'] });
    expect(ids(doc2)).toEqual([]); // nothing matches
  });

  it('filterInvert compiles what does NOT match', () => {
    const doc = compile.buildDocument(makeProject(), read, { format: fmt('manuscris'), titlePage: false, labels: ['Idee'], filterInvert: true });
    expect(ids(doc)).toEqual(['c1', 's2', 'c2', 's4']);
  });

  it('an explicit scope compiles even an excluded top node; its children keep their own flags', () => {
    const doc = compile.buildDocument(makeProject(), read, { format: fmt('manuscris'), titlePage: false, rootId: 'c2' });
    expect(ids(doc)).toEqual(['c2', 's3', 's4']); // sx (child) is still excluded by its own flag
    const doc2 = compile.buildDocument(makeProject(), read, { format: fmt('manuscris'), titlePage: false, ids: ['sx'] });
    expect(ids(doc2)).toEqual(['sx']); // selected directly → compiled as-is
  });
});
