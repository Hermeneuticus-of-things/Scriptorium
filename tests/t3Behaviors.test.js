import { describe, it, expect } from 'vitest';
import fs from 'fs';
// T3 (Anexa B — GOLURI NOI): comportamente Windows lipsă.
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('T3 — comportamente și aspect', () => {
  it('BEH.09: dublu-click pe fundalul corkboard-ului creează fișă nouă', () => {
    const c = src('src/components/Corkboard.jsx');
    expect(c).toContain('onDoubleClick={(e) => { if (!e.target.closest(\'[data-card-id], textarea, input, button, header, .cork-head\')) addCard(); }}');
  });
  it('GEN.15: separatorul de unire e configurabil (asteriscuri/rând liber/custom)', () => {
    const app = src('src/App.jsx');
    expect(app).toContain("settings.mergeSeparator || 'asterisks'");
    expect(app).toContain("sepMode === 'blank'");
    expect(app).toContain('mergeSeparatorCustom');
    const sd = src('src/components/SettingsDialog.jsx');
    expect(sd).toContain("set('mergeSeparator')");
    expect(sd).toContain("set('mergeSeparatorCustom')");
  });
  it('APP.43/44: marginile editorului — variabile CSS + câmpuri în Aspect', () => {
    expect(src('src/App.jsx')).toContain("'--ed-pad-x'");
    expect(src('src/App.jsx')).toContain("'--ed-pad-y'");
    expect(src('src/styles.css')).toContain('var(--ed-pad-x, 48px)');
    const ap = src('src/components/AppearancePane.jsx');
    expect(ap).toContain("set('editorPadX')");
    expect(ap).toContain("set('editorPadY')");
  });
  it('marginile și separatorul au etichete RO/EN', () => {
    const i = src('src/lib/i18n.js');
    for (const k of ['set.editorPadX', 'set.editorPadY', 'set.mergeSeparator', 'set.mergeSeparatorAsterisks', 'set.mergeSeparatorBlank', 'set.mergeSeparatorCustom']) {
      expect(i.match(new RegExp(`'${k.replace(/([.])/g, '\\.')}':`, 'g'))?.length, k).toBe(2);
    }
  });
});
