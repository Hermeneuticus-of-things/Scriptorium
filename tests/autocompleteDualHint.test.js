import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/lib/i18n-ui.js', import.meta.url), 'utf8');
describe('P5 autocomplete dual hint', () => {
  it('RO+EN keys exist and point to the menu door', () => {
    const hits = src.match(/"ui\.ps\.autocomplete_dual_hint": "[^"]+"/g) || [];
    expect(hits.length).toBe(2);
    expect(hits[0]).toContain('Proiect › Listă de completare automată…');
    expect(hits[1]).toContain('Project › Auto-complete list…');
  });
  it('dialog renders hint on autocomplete tab', () => {
    const d = fs.readFileSync(new URL('../src/components/ProjectSettingsDialog.jsx', import.meta.url), 'utf8');
    expect(d).toContain("tr('ui.ps.autocomplete_dual_hint')");
  });
});