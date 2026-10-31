import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';
import { TOP_ITEMS } from '../src/lib/toolbars.js';

const src = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('Zone 6 i18n leftovers', () => {
  it('Z6-4: top toolbar texts are i18n keys present in RO and EN', () => {
    for (const it of TOP_ITEMS.filter((i) => i.text)) {
      expect(it.text, it.id).toMatch(/\./);
      expect(uiRo[it.text], it.text).toBeTruthy();
      expect(uiEn[it.text], it.text).toBeTruthy();
    }
    expect(TOP_ITEMS.find((i) => i.id === 'compile').text).toBe('ui.tb.compile');
  });
  it('Z6-5: CompileDialog has no hardcoded column/option literals', () => {
    const s = src('src/components/CompileDialog.jsx');
    expect(s).not.toMatch(/>(Text|Regex|Majuscule|Prefix|Sufix|Litere|Aliniere|Normale|MAJUSCULE)</);
    expect(s).not.toMatch(/aria-label="(Prefix|Sufix|Litere|Aliniere)"/);
    for (const k of ['text', 'regex', 'matchCase', 'prefix', 'suffix', 'letterCase', 'align', 'caseNormal', 'caseUpper']) {
      expect(uiRo[`ui.compileDialog.lit.${k}`], k).toBeTruthy();
      expect(uiEn[`ui.compileDialog.lit.${k}`], k).toBeTruthy();
    }
    expect(uiEn['ui.compileDialog.lit.matchCase']).toBe('Match case');
  });
  it('Z6-6: Settings > Partajare has no hardcoded labels', () => {
    const s = src('src/components/SettingsDialog.jsx');
    expect(s).not.toMatch(/^\s*Format text\s*$/m);
    expect(s).not.toMatch(/^\s*Format\s*$/m);
    expect(s).not.toMatch(/\/> Include (notele|metadatele)</);
    for (const k of ['format_text', 'format_export', 'include_notele', 'include_metadatele']) {
      expect(uiRo[`ui.settingsDialog.${k}`], k).toBeTruthy();
      expect(uiEn[`ui.settingsDialog.${k}`], k).toBeTruthy();
    }
  });
});
