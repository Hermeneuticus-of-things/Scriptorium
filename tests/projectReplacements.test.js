import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');

// Project-level replacements (Scrivener 3 §23.4.4): ordered list on the project root,
// applied by the compile engine before the format's own replacements.
function makeProject(extra = {}) {
  return {
    title: 'Carte',
    tree: [
      {
        id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'c1', type: 'folder', title: 'Capitolul unu', includeInCompile: true, children: [
            { id: 's1', type: 'text', title: 'Scena unu', includeInCompile: true },
          ] },
        ],
      },
    ],
    ...extra,
  };
}

const DOCS = {
  s1: '<p>Pisica se numea Teh, un tehut și un teh.<span data-footnote="Numele Teh e scurt." class="footnote"></span></p>',
};
const read = (id) => DOCS[id] || '';
const fmt = (patch = {}) => ({ ...JSON.parse(JSON.stringify(F.PRESETS[0])), ...patch });
const rep = (over = {}) => ({ id: 'r1', find: 'teh', replace: 'Motan', regex: false, wholeWord: false, caseSensitive: false, enabled: true, ...over });

describe('project replacements', () => {
  it('plain: touch body text and footnotes, never markup', () => {
    const html = compile.compileHtml(makeProject({ replacements: [rep()] }), read, { format: fmt() });
    expect(html).toContain('Pisica se numea Motan, un Motanut și un Motan.');
    expect(html).toContain('Numele Motan e scurt.');
    expect(html).not.toContain('Teh');
  });

  it('wholeWord', () => {
    const html = compile.compileHtml(makeProject({ replacements: [rep({ wholeWord: true })] }), read, { format: fmt() });
    expect(html).toContain('Pisica se numea Motan, un tehut și un Motan.');
  });

  it('caseSensitive', () => {
    const html = compile.compileHtml(makeProject({ replacements: [rep({ caseSensitive: true })] }), read, { format: fmt() });
    expect(html).toContain('Pisica se numea Teh, un Motanut și un Motan.');
  });

  it('regex with capture groups', () => {
    const docs = { s1: '<p>Capitolul 7 are 3 scene.</p>' };
    const html = compile.compileHtml(makeProject({ replacements: [rep({ find: '(\\d+)', replace: '#$1', regex: true })] }), (id) => docs[id] || '', { format: fmt() });
    expect(html).toContain('Capitolul #7 are #3 scene.');
  });

  it('order matters: first entry = applied first', () => {
    const docs = { s1: '<p>ab</p>' };
    const rd = (id) => docs[id] || '';
    const first = compile.compileHtml(makeProject({ replacements: [rep({ id: 'a', find: 'ab', replace: 'X' }), rep({ id: 'b', find: 'X', replace: 'Y' })] }), rd, { format: fmt() });
    expect(first).toContain('>Y<');
    const swapped = compile.compileHtml(makeProject({ replacements: [rep({ id: 'b', find: 'X', replace: 'Y' }), rep({ id: 'a', find: 'ab', replace: 'X' })] }), rd, { format: fmt() });
    expect(swapped).toContain('>X<');
  });

  it('run before the format replacements (project feeds format)', () => {
    const docs = { s1: '<p>câine</p>' };
    const f = fmt();
    f.replacements = [{ find: 'pisică', replace: 'vulpe' }];
    const html = compile.compileHtml(makeProject({ replacements: [rep({ find: 'câine', replace: 'pisică' })] }), (id) => docs[id] || '', { format: f });
    expect(html).toContain('vulpe');
    expect(html).not.toContain('câine');
  });

  it('disabled entries are skipped', () => {
    const p = makeProject({ replacements: [rep({ replace: 'X', enabled: false }), rep({ id: 'r2', replace: 'Y' })] });
    const html = compile.compileHtml(p, read, { format: fmt() });
    expect(html).toContain('se numea Y, un Yut și un Y.');
    expect(html).not.toContain('se numea X');
  });

  it('invalid regex entries are skipped, valid ones still apply', () => {
    const html = compile.compileHtml(makeProject({ replacements: [rep({ find: '([unclosed', replace: 'X', regex: true }), rep({ id: 'r2', find: 'teh', replace: 'Motan' })] }), read, { format: fmt() });
    expect(html).toContain('Motan');
  });

  it('no project.replacements -> output identical to empty and to all-disabled lists (regression)', () => {
    const f = fmt();
    const plain = compile.compileHtml(makeProject(), read, { format: f });
    expect(compile.compileHtml(makeProject({ replacements: [] }), read, { format: f })).toBe(plain);
    expect(compile.compileHtml(makeProject({ replacements: [rep({ enabled: false }), rep({ id: 'r2', find: 'pisica', replace: 'X', enabled: false })] }), read, { format: f })).toBe(plain);
    expect(plain).toContain('Teh');
  });

  it('apply to plain-text outputs too', () => {
    const txt = compile.compileText(makeProject({ replacements: [rep({ wholeWord: true })] }), read, { format: fmt() });
    expect(txt).toContain('Motan');
    expect(txt).not.toContain('Teh');
  });
});
