import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { createRequire } from 'module';
// T5 + T6 + PS-HELP 4-5 (batch 22.11.2026 seara): formate compile noi, transformări, What's New, EmptyState.
const require = createRequire(import.meta.url);
const compileFormats = require('../lib/compileFormats.cjs');
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('T5 — formate compile noi (Anexa D)', () => {
  it('preset „Schiță (cuprins)": doar titluri, fără text', () => {
    const f = compileFormats.PRESETS.find((x) => x.id === 'schita');
    expect(f).toBeTruthy();
    for (const L of Object.values(f.layouts)) {
      expect(L.showText).toBe(false);
    }
    expect(f.layouts.Parte.titlePrefix).toContain('<$n:Words>');
  });
  it('preseturi LaTeX cu clasa din preset (memoir, report)', () => {
    const memoir = compileFormats.PRESETS.find((x) => x.id === 'latex-memoir');
    const report = compileFormats.PRESETS.find((x) => x.id === 'latex-report');
    expect(memoir.latexDocClass).toBe('memoir');
    expect(report.latexDocClass).toBe('report');
    expect(src('lib/compile.cjs')).toContain('fmt.latexDocClass');
  });
  it('transform CriticMarkup: comentariu → {>>…<<}, revizii → {++}/{--}', () => {
    const c = src('lib/compile.cjs');
    expect(c).toContain('tr.criticMarkup');
    expect(c).toContain('{>>');
    expect(c).toContain('{++$1++}');
    expect(c).toContain('{--$1--}');
    expect(c).toContain('{==$1==}');
  });
  it('transform italicToUnderline', () => {
    expect(src('lib/compile.cjs')).toContain('tr.italicToUnderline');
    expect(src('lib/compile.cjs')).toContain('<u>$1</u>');
  });
  it('bifele noi în dialog + etichete RO/EN', () => {
    const d = src('src/components/CompileDialog.jsx');
    expect(d).toContain("['criticMarkup'");
    expect(d).toContain("['italicToUnderline'");
    const i = src('src/lib/i18n-ui.js');
    for (const k of ['ui.compileDialog.critic_markup', 'ui.compileDialog.italic_subliniere']) {
      expect(i.match(new RegExp(`"${k}"`, 'g'))?.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('T6 — Reset List Indents (Anexa E 3.1.4.1)', () => {
  it('comanda format/resetIndents cu setParagraphFormat null', () => {
    const app = src('src/App.jsx');
    expect(app).toContain("['format', 'resetIndents'");
    expect(app).toContain('indentLeft: null, firstIndent: null');
  });
  it('etichete RO/EN distincte', () => {
    const i = src('src/lib/i18n.js');
    expect(i).toContain("'cmd.resetIndents': 'Resetează indentările listelor'");
    expect(i).toContain("'cmd.resetIndents': 'Reset List Indents'");
  });
});

describe('T6b — Set Styles Defaults (defaultDocHtml)', () => {
  it('crearea de documente noi folosește project.defaultDocHtml când există', () => {
    const app = src('src/App.jsx');
    const hits = app.match(/projectRef.current.defaultDocHtml/g) || [];
    expect(hits.length).toBe(2);
  });
  it('StylesDialog: butonul implicită prin currentLook + paragraphCss', () => {
    const sd = src('src/components/StylesDialog.jsx');
    expect(sd).toContain('setCurrentAsDefault');
    expect(sd).toContain('paragraphCss(currentLook)');
    expect(sd).toContain('defaultDocHtml: html');
  });
  it('etichete RO/EN', () => {
    const i = src('src/lib/i18n-ui.js');
    for (const k of ['ui.styles.defaultButton', 'ui.styles.defaultSet', 'ui.styles.defaultNoEditor']) {
      expect(i.match(new RegExp('"' + k + '"', 'g'))?.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('PS-HELP 4-5 — What\u2019s New + EmptyState', () => {
  it('tab „Noutăți" în Help, cu conținut din app:changelog', () => {
    const hw = src('src/components/HelpWindow.jsx');
    expect(hw).toContain("const TABS = ['manual', 'shortcuts', 'placeholders', 'syntax', 'news']");
    expect(hw).toContain("{tab === 'news' && (");
    expect(hw).toContain('changelog?.()');
    const m = src('electron/main.cjs');
    expect(m).toContain("handle('app:changelog'");
    const pre = src('electron/preload.cjs');
    expect(pre).toContain("call('app:changelog'");
  });
  it('EmptyState partajat + aplicat în QuickSearch și Inspector', () => {
    const comp = src('src/components/EmptyState.jsx');
    expect(comp).toContain('ui.empty.binder.title');
    for (const f of ['src/components/QuickSearch.jsx', 'src/components/Inspector.jsx']) {
      expect(src(f)).toContain('EmptyState');
    }
    const i = src('src/lib/i18n-ui.js');
    expect(i.match(/"ui.quickSearch.reformuleaza"/g)?.length).toBe(2);
  });
  it('cheile EMPTY există RO+EN (nu se inventează text)', () => {
    const i = src('src/lib/i18n-ui.js');
    for (const k of ['ui.empty.binder.title', 'ui.empty.binder.hint', 'ui.empty.search.title', 'ui.empty.research.title', 'ui.empty.annotations.title']) {
      expect(i.match(new RegExp(`"${k}"`, 'g'))?.length).toBeGreaterThanOrEqual(2);
    }
  });
});
