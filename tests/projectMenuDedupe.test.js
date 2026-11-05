import { describe, it, expect } from 'vitest';
import fs from 'fs';

// P9 (owner decision X5, 2026-10-31): the Proiect menu no longer duplicates doors
// that live in Fișier (compile, import, backups), Format (styles) or Editare (find, advSearch).
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const block = app.slice(app.indexOf('const projectMenu = ['), app.indexOf('];', app.indexOf('const projectMenu = [')));
const live = block.split(/\r?\n/).filter((l) => !l.trim().startsWith('//')).join('\n');

describe('Proiect menu without cross-menu duplicates', () => {
  it('drops compile, import, backups, styles, find and advanced search', () => {
    for (const k of ["tr('cmd.compile')", "tr('cmd.import')", "tr('cmd.backups')", "tr('cmd.styles')",
      "tr('ui.app.cauta_si_inlocuieste')", "tr('ui.app.cautare_avansata_campuri_filtre_colectii')",
      "setDialog('find')", "setDialog('advsearch')", "setDialog('import')", "setDialog('backup')", "setDialog('styles')", "setDialog('compile')"]) {
      expect(live).not.toContain(k);
    }
  });
  it('keeps the project-only entries', () => {
    for (const k of ["tr('cmd.keywords')", "tr('cmd.history')", "tr('cmd.targets')", "tr('cmd.stats')"]) expect(live).toContain(k);
  });
  it('the removed doors still exist in their primary menus', () => {
    expect(app).toContain("['file', 'compile', tr('cmd.compile')");
    expect(app).toContain("['file', 'import', tr('cmd.import')");
    expect(app).toContain("['file', 'backups', tr('cmd.backups')");
    expect(app).toContain("['format', 'styles', tr('cmd.styles')");
    expect(app).toContain("['edit', 'findProject', tr('cmd.findProject')");
    expect(app).toContain("['edit', 'advSearch', tr('cmd.advSearch')");
    expect(fs.readFileSync(new URL('../src/lib/menuLayout.js', import.meta.url), 'utf8')).toContain("'findProject', 'findFormat', 'advSearch'");
  });
});

describe('P10: stats and textStats unified', () => {
  it('only one statistics command in the Proiect group', () => {
    expect(app).toContain("['project', 'stats', tr('cmd.stats'), () => setDialog('stats')]");
    expect(app).not.toContain("['project', 'textStats'");
    expect((live.match(/cmd\.(stats|textStats)'/g) || [])).toEqual(["cmd.stats'"]);
  });
  it('the statistics dialog opens the live selection window', () => {
    expect(app).toContain("onLiveText={() => { setDialog(null); setFloats((f) => ({ ...f, ts: true })); }}");
    expect(app).toContain('<TextStatsPanel');
  });
});
