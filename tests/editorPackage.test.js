import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { buildEditorPackage } = require('../lib/editorPackage.cjs');

const project = {
  editorialProfile: { base: 'karma' },
  title: 'Karma',
  author: 'Autor',
  tree: [
    { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
      { id: 'c1', type: 'folder', title: 'Cap 1', includeInCompile: true, children: [
        { id: 'd1', type: 'text', title: '1.1 Fapta', synopsis: 'Despre faptă.', includeInCompile: true },
      ] },
    ] },
  ],
};
const docs = { d1: "<p>fapta — lasă o urmă. Numim <strong><em>dispoziția de fond</em></strong> 'bhāva' ce rămâne.</p>" };

describe('buildEditorPackage', () => {
  it('writes the dated folder with all parts', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'edpkg-'));
    const { dir, files } = await buildEditorPackage(project, (id) => docs[id] || '', () => '<p>notă</p>', tmp, {
      date: '2026-10-23',
      extraReports: [{ name: 'VKB2.md', content: '# x' }],
      readSnapshots: () => [{ name: 'Înainte de R8', date: '2026-10-20T10:00:00Z' }],
      synopsis: { includeNotes: true },
    });
    expect(path.basename(dir)).toBe('📤 PENTRU EDITOR 2026-10-23');
    const names = files.map((f) => f.name);
    expect(names).toEqual(['01_Manuscris.docx', '02_Sinopsis.md', '03_Glosar_Alogeni_Indieni.md', '04_Glosar_de_lectură.md', '05_Cuprins_de_tipar.md', '06_Raport_I-REP.md', '07_Jurnal_snapshot-uri.md', 'VKB2.md', 'README.md']);
    expect(fs.readFileSync(path.join(dir, '01_Manuscris.docx')).slice(0, 2).toString()).toBe('PK');
    expect(fs.readFileSync(path.join(dir, '02_Sinopsis.md'), 'utf8')).toContain('> notă');
    expect(fs.readFileSync(path.join(dir, '03_Glosar_Alogeni_Indieni.md'), 'utf8')).toContain('| bhāva | dispoziția de fond |');
    expect(fs.readFileSync(path.join(dir, '06_Raport_I-REP.md'), 'utf8')).toMatch(/emDash|Em-dash/);
    expect(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')).toContain('01_Manuscris.docx');
    const again = await buildEditorPackage(project, (id) => docs[id] || '', null, tmp, { date: '2026-10-23', manuscript: false, glossaries: false, report: false, synopsis: { format: 'docx' } });
    expect(path.basename(again.dir)).toBe('📤 PENTRU EDITOR 2026-10-23 (2)');
    expect(again.files.map((f) => f.name)).toEqual(['02_Sinopsis.docx', 'README.md']);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
