import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const ex = require('../lib/exporters.cjs');
const store = require('../lib/store.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-exp-'));

const project = () => ({
  title: 'Carte',
  customFields: [{ id: 'pov', name: 'POV' }],
  tree: [
    { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
      { id: 'f1', type: 'folder', title: 'Partea: 1/2', children: [
        { id: 'd1', type: 'text', title: 'Scena?', synopsis: 'Sinopsis 1', label: 'Idee', status: 'Final', keywords: ['noapte'], custom: { pov: 'Ana, "mică"' }, created: '2026-01-01' },
        { id: 'd2aaaaaa', type: 'text', title: 'Scena?', synopsis: '' },
        { id: 'd3', type: 'text', title: 'CON' },
      ] },
    ] },
    { id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [] },
    { id: 'trash', root: 'trash', type: 'folder', title: 'Coș', children: [{ id: 'z', type: 'text', title: 'Șters' }] },
  ],
});
const docs = { d1: '<p>Ana <strong>are</strong> <em>mere</em>.<span data-footnote="Notă" class="footnote"></span></p>', d2aaaaaa: '<p>Doi</p>', d3: '<p>Trei</p>' };
const notes = { d1: '<p>O notă <em>mică</em></p>' };

describe('exporters', () => {
  it('exports documents mirroring the binder with sidecars and safe names', async () => {
    const out = tmp();
    const res = await ex.exportDocuments(project(), null, (id) => docs[id] || '', (id) => notes[id] || '', null, out, { format: 'md', withNotes: true, withSynopsis: true, withMeta: true });
    const folder = path.join(out, 'Manuscris', 'Partea_ 1_2');
    const files = fs.readdirSync(folder).sort();
    expect(files).toEqual(['Partea_ 1_2.meta.json', 'Scena_ (d2aaaa).md', 'Scena_.md', 'Scena_.meta.json', 'Scena_.notes.md', 'Scena_.synopsis.txt', '_CON.md', '_CON.meta.json', 'Scena_ (d2aaaa).meta.json'].sort());
    expect(fs.readFileSync(path.join(folder, 'Scena_.md'), 'utf8')).toBe('# Scena?\n\nAna **are** *mere*.[^Notă]\n');
    expect(fs.readFileSync(path.join(folder, 'Scena_.notes.md'), 'utf8')).toBe('O notă *mică*\n');
    expect(fs.readFileSync(path.join(folder, 'Scena_.synopsis.txt'), 'utf8')).toBe('Sinopsis 1');
    expect(JSON.parse(fs.readFileSync(path.join(folder, 'Scena_.meta.json'), 'utf8'))).toMatchObject({ label: 'Idee', status: 'Final', keywords: ['noapte'], custom: { pov: 'Ana, "mică"' }, includeInCompile: true });
    expect(fs.existsSync(path.join(out, 'Cercetare'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'Coș'))).toBe(false);
    expect(res.count).toBe(3);
  });

  it('exports only the selection, in DOCX, RTF, TXT and HTML', async () => {
    for (const format of ['docx', 'rtf', 'txt', 'html']) {
      const out = tmp();
      await ex.exportDocuments(project(), null, (id) => docs[id] || '', null, ['d1'], out, { format });
      const file = path.join(out, 'Manuscris', 'Partea_ 1_2', `Scena_.${format}`);
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.readdirSync(path.join(out, 'Manuscris', 'Partea_ 1_2'))).toHaveLength(1);
      if (format === 'docx') {
        const zip = await JSZip.loadAsync(fs.readFileSync(file));
        expect(await zip.file('word/document.xml').async('string')).toContain('mere');
        expect(zip.file('word/footnotes.xml')).toBeTruthy();
      }
      if (format === 'rtf') expect(fs.readFileSync(file, 'utf8')).toMatch(/^\{\\rtf1[\s\S]*\{\\b are\}[\s\S]*\\footnote/);
    }
  });

  it('writes RTF with unicode escapes', () => {
    expect(ex.htmlToRtf('<p>ș{</p>')).toContain('\\u537?\\{\\par');
  });

  it('exports CSV metadata with BOM, header and custom field columns', () => {
    const csv = ex.exportMetadataCsv(project(), { d1: 4 });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('id,title,path,type,label,status,keywords,section_type,include_in_compile,words,created,modified,pov');
    const d1 = lines.find((l) => l.startsWith('d1,'));
    expect(d1).toBe('d1,Scena?,Manuscris / Partea: 1/2 / Scena?,text,Idee,Final,noapte,,true,4,2026-01-01,,"Ana, ""mică"""');
  });

  it('saveProjectAs copies docs and renames the title', () => {
    const parent = tmp();
    const src = store.createProject(store.projectDirFor(parent, 'Original'), 'Original');
    const srcDir = typeof src === 'string' ? src : src.dir || store.projectDirFor(parent, 'Original');
    store.writeDoc(srcDir, 'abc', 'docs', '<p>Text</p>');
    const dest = tmp();
    const { dir, project: p } = ex.saveProjectAs(srcDir, dest, 'Copie: nouă');
    expect(dir).toBe(path.join(dest, 'Copie_ nouă.scribner'));
    expect(p.title).toBe('Copie: nouă');
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8')).title).toBe('Copie: nouă');
    expect(fs.readFileSync(path.join(dir, 'docs', 'abc.html'), 'utf8')).toBe('<p>Text</p>');
    expect(() => ex.saveProjectAs(srcDir, dest, 'Copie: nouă')).toThrow();
  });
});
