import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/lib/i18n-ui.js', import.meta.url), 'utf8');
describe('P7 template folder dual hint', () => {
  it('RO+EN keys exist and point to the Binder door', () => {
    const hits = src.match(/"ui\.ps\.template_folder_dual_hint": "[^"]+"/g) || [];
    expect(hits.length).toBe(2);
    expect(hits[0]).toContain('Dosar de șabloane');
    expect(hits[1]).toContain('Templates folder');
  });
  it('dialog renders hint on foldere tab; Binder door kept', () => {
    const d = fs.readFileSync(new URL('../src/components/ProjectSettingsDialog.jsx', import.meta.url), 'utf8');
    expect(d).toContain("tr('ui.ps.template_folder_dual_hint')");
    const b = fs.readFileSync(new URL('../src/components/Binder.jsx', import.meta.url), 'utf8');
    expect(b).toContain("tr('ui.binder.dosar_de_sabloane')");
  });
});
