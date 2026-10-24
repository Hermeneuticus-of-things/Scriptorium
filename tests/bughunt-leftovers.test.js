// Leftover data bugs: backup restore root detection, named entities in search,
// invisible-only titles, long Windows paths in per-document export.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { buildRegex, findInHtml, replaceInHtml } from '../src/lib/search.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const { restoreBackup } = require('../lib/backup.cjs');
const { safeName } = require('../lib/fsNames.cjs');
const exporters = require('../lib/exporters.cjs');

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'scr-left-'));

describe('restoreBackup locates project.json', () => {
  const restore = async (entries) => {
    const zip = new JSZip();
    for (const [k, v] of entries) zip.file(k, v);
    const t = tmpDir();
    const file = path.join(t, 'b.zip');
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
    const out = await restoreBackup(file, t);
    return out;
  };
  it('ignores __MACOSX and .DS_Store listed first', async () => {
    const out = await restore([
      ['__MACOSX/Carte.scribner/._project.json', 'junk'],
      ['.DS_Store', 'junk'],
      ['Carte.scribner/project.json', '{}'],
      ['Carte.scribner/docs/a.html', '<p>a</p>'],
    ]);
    expect(path.basename(out)).toMatch(/^Carte \(restaurat /);
    expect(fs.readFileSync(path.join(out, 'project.json'), 'utf8')).toBe('{}');
    expect(fs.existsSync(path.join(out, 'docs', 'a.html'))).toBe(true);
    expect(fs.existsSync(path.join(out, '._project.json'))).toBe(false);
  });
  it('restores a zip without a wrapping folder', async () => {
    const out = await restore([['docs/a.html', 'x'], ['project.json', '{}']]);
    expect(fs.existsSync(path.join(out, 'project.json'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'docs', 'a.html'))).toBe(true);
  });
  it('rejects a zip without project.json', async () => {
    await expect(restore([['x/readme.txt', 'x']])).rejects.toThrow();
  });
});

describe('search decodes named entities', () => {
  it('matches &mdash; as text and does not re-encode it', () => {
    const html = '<p>a&mdash;b &laquo;c&raquo; d&hellip; &copy; &bdquo;e&rdquo;</p>';
    expect(findInHtml(html, buildRegex({ query: '—' }))).toHaveLength(1);
    expect(findInHtml(html, buildRegex({ query: 'mdash' }))).toHaveLength(0);
    const { html: out } = replaceInHtml(html, buildRegex({ query: 'c' }), 'C');
    expect(out).not.toContain('&amp;');
    expect(out).toContain('«C»');
    expect(out).toContain('d…');
    expect(out).toContain('„e”');
  });
  it('leaves unknown entity-like text alone', () => {
    const { html: out } = replaceInHtml('<p>&foo; x</p>', buildRegex({ query: 'x' }), 'y');
    expect(out).toBe('<p>&amp;foo; y</p>');
  });
});

describe('safeName invisible characters', () => {
  it('falls back when the title is only invisible characters', () => {
    expect(safeName('​‌‍﻿⁠‎‏‪‮')).toBe('Fără titlu');
  });
  it('strips invisible characters at the ends and normalizes to NFC', () => {
    expect(safeName('​Café﻿')).toBe('Café');
    expect(safeName('​Café').length).toBe(4);
  });
});

describe('per-document export keeps paths short', () => {
  it('a deep tree with long titles stays under 240 characters and unique', async () => {
    const long = (i) => `${'Capitol foarte lung cu titlu interminabil '.repeat(4)}${i}`;
    let leaf = [];
    for (let d = 12; d >= 0; d--) {
      leaf = [
        { id: `f${d}`, type: 'folder', title: long(d), children: leaf },
        { id: `t${d}a`, type: 'text', title: long('x'), children: [] },
        { id: `t${d}b`, type: 'text', title: long('x'), children: [] },
      ];
    }
    const project = { tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: leaf }] };
    const out = path.join(tmpDir(), 'export');
    const { files } = await exporters.exportDocuments(project, null, () => '<p>x</p>', () => '<p>n</p>', null, out, { format: 'txt', withNotes: true, withSynopsis: true, withMeta: true });
    expect(files.length).toBeGreaterThan(30);
    const budget = 240 - out.length; // the export folder itself is the user's choice
    for (const f of files) expect(f.length - out.length).toBeLessThanOrEqual(budget);
    for (const f of files) expect(f.length).toBeLessThan(240 + 40);
    expect(new Set(files.map((f) => f.toLowerCase())).size).toBe(files.length);
  });
});
