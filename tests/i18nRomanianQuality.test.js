import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { dictionaries } from '../src/lib/i18n.js';

// Guards the Romanian language quality of the UI dictionaries (and the English ones against
// Romanian leftovers). Only the cedilla letters ş ţ Ş Ţ (U+015F/0163/015E/0162) are errors:
// IAST letters (ṣ ṭ ā ī …) used for foreign terms are intentional and never flagged.
const { ro, en } = dictionaries;
const strings = (d) => Object.entries(d).filter(([, v]) => typeof v === 'string');
// Strip HTML markup and placeholders: attribute quotes are code, not typography.
const prose = (v) => v.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '');
const CEDILLA = /[şţŞŢ]/;
// Values whose content is intentionally Romanian (sample rules, language names) in EN too.
const EN_ROMANIAN_OK = new Set(['ui.settingsDialog.romana', 'ui.settingsDialog.gest_fapta_urma_depunere_p3', 'ui.settingsDialog.randuiala_lumii_logica_interna', 'set.edHeader', 'set.edFooter']);
const RO_STOPWORDS = /\b(și|să|că|nu se|pentru|fișier\w*|documentul|proiectul|salvează|șterge|adaugă|anulează|setări|cuvinte|după|până|fără)\b/i;

describe('Romanian UI language quality', () => {
  it('no cedilla diacritics in ro or en', () => {
    const bad = [...strings(ro), ...strings(en)].filter(([, v]) => CEDILLA.test(v)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('Romanian text uses „…”, not straight or English curly opening quotes', () => {
    const bad = strings(ro).filter(([, v]) => /["“]/.test(prose(v))).map(([k, v]) => `${k}: ${v}`);
    expect(bad).toEqual([]);
  });

  it('no double spaces inside values', () => {
    // Leading/trailing spaces are intentional (fragments concatenated to other text); inner runs are not.
    const bad = [...strings(ro), ...strings(en)].filter(([, v]) => / {2,}/.test(v.trimStart())).map(([k, v]) => `${k}: [${v}]`);
    expect(bad).toEqual([]);
  });

  it('three dots are written as the ellipsis character', () => {
    const bad = strings(ro).filter(([, v]) => /\.\.\.(?!\])/.test(prose(v))).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('English values have no Romanian leftovers', () => {
    const bad = strings(en)
      .filter(([k, v]) => !EN_ROMANIAN_OK.has(k) && (/[ăâîșțĂÂÎȘȚ]/.test(prose(v)) || RO_STOPWORDS.test(prose(v))))
      .map(([k, v]) => `${k}: ${v}`);
    expect(bad).toEqual([]);
  });

  it('menu commands use the imperative "Tradu", not "Traduce"', () => {
    const bad = strings(ro).filter(([, v]) => /\bTraduce\b|\btraduce selecția/.test(v)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('FormatBar and FindBar have no hard-coded Romanian labels', () => {
    for (const f of ['FormatBar.jsx', 'FindBar.jsx']) {
      const src = fs.readFileSync(path.resolve(__dirname, '../src/components', f), 'utf8');
      const hits = src.split('\n').filter((l) => !l.trim().startsWith('//') && /(?:label|title|placeholder|prompt)\W{0,3}['"`][^'"`]*[ăâîșțĂÂÎȘȚ]/.test(l));
      expect(hits, f).toEqual([]);
    }
  });

  it('installer Romanian messages are UTF-8 with comma-below letters', () => {
    const buf = fs.readFileSync(path.resolve(__dirname, '../installer/Romanian.isl'));
    expect([...buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(CEDILLA.test(buf.toString('utf8'))).toBe(false);
  });
});
