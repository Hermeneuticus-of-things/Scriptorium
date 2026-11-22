import { describe, it, expect } from 'vitest';
import fs from 'fs';
// Bug user (2026-11-22): preview-ul de compile umfla dialogul — greu de ajuns la Salvare.
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('Compile preview — panou, nu umflare', () => {
  it('preview-ul stă în grila cd-body (a doua coloană), cu scroll propriu', () => {
    const c = src('src/components/CompileDialog.jsx');
    const bodyStart = c.indexOf('<div className="cd-body">');
    const previewStart = c.indexOf('{preview !== null && (', bodyStart);
    const actionsStart = c.indexOf('className="actions cd-actions"');
    expect(previewStart).toBeGreaterThan(bodyStart);      // înăuntrul cd-body
    expect(previewStart).toBeLessThan(actionsStart);      // înaintea acțiunilor
    expect(c).toContain('cd-preview-scroll');
    expect(c).toContain('compile-dialog.with-preview');
  });
  it('acțiunile (Salvează/Compilează) sunt sticky — mereu vizibile', () => {
    expect(src('src/components/CompileDialog.jsx')).toContain('actions cd-actions');
    expect(src('src/components/CompileDialog.jsx')).toContain('.cd-actions{position:sticky');
  });
  it('zoom cu «Potrivire la lățime» — pagina 6x9 nu mai lățește dialogul', () => {
    const c = src('src/components/CompileDialog.jsx');
    expect(c).toContain('previewZoom');
    expect(c).toContain('fitPreview');
    expect(c).toContain('zoom_potrivire');
  });
  it('etichetele zoom există RO/EN', () => {
    const i = src('src/lib/i18n-ui.js');
    expect(i.match(/"ui\.compileDialog\.zoom_potrivire"/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
