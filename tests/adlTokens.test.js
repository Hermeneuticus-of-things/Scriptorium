// ADL §4/§11 conformance (campaign T9, items 9–13): src/styles.css uses the Ionuț ADL
// dimension tokens and carries no off-scale control/spacing/radius/icon/UI-type values
// outside the documented keep-list below. Every kept raw value has a reason — this file is
// the executable form of the audit; a value may leave the list only together with its reason.
// Scale (docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md): controls 24/28/32, toolbar 32–40,
// pointer target ≥32, icons 16/20, UI type 12–14, spacing 4/8/12, radius 4–8, padding 4–8.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src', 'styles.css'), 'utf8');
const lines = css.split(/\r?\n/);

describe('ADL tokens are defined in :root', () => {
  const tokens = {
    '--ctl-sm: 24px': 'dense-panel control',
    '--ctl-md: 28px': 'inline control',
    '--ctl-lg: 32px': 'toolbar/dialog control, pointer target',
    '--icon-sm: 16px': 'button/toolbar icon',
    '--icon-md: 20px': 'large glyph',
    '--sp-1: 4px': 'inside a group',
    '--sp-2: 8px': 'between controls',
    '--sp-3: 12px': 'between groups',
    '--radius: 6px': 'controls/cards',
    '--radius-lg: 8px': 'menus/popovers/dialogs',
    '--font-ui-sm: 12px': 'secondary UI text',
    '--font-ui: 13px': 'UI text',
    '--font-ui-md: 14px': 'primary UI text',
  };
  it.each(Object.entries(tokens))('%s (%s)', (t) => {
    expect(css).toContain(t);
  });
});

describe('ADL: key controls consume the tokens', () => {
  const rules = [
    // [selector start, required declaration fragment] — pointer targets & control scale
    ['border-radius: var(--radius); padding: var(--sp-1) var(--sp-2); cursor: pointer;', ''],
    ['input, select, textarea {', 'padding: var(--sp-1) var(--sp-2)'],
    ['.toolbar { display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-1) 10px', ''],
    ['.format-bar button {', 'min-width: var(--ctl-lg); min-height: var(--ctl-lg)'],
    ['.binder-tools button {', 'min-height: var(--ctl-lg); min-width: var(--ctl-lg)'],
    ['.toolbar .menubar .menu > button, .toolbar .seg button {', 'min-height: var(--ctl-lg)'],
    ['.toolbar > button[data-tb] {', 'min-width: var(--ctl-lg); min-height: var(--ctl-lg)'],
    ['.modal-x {', 'width: var(--ctl-lg); height: var(--ctl-lg)'],
    ['.snap-toolbar .snap-add, .snap-toolbar .snap-del {', 'min-width: var(--ctl-md); min-height: var(--ctl-md)'],
    ['.mini-player .mini-mic {', 'width: var(--ctl-lg); height: var(--ctl-lg)'],
    ['body {', 'font: var(--font-ui-md)/1.4'],
  ];
  it.each(rules)('%s keeps its ADL sizing', (sel, decl) => {
    if (!decl) {
      expect(css).toContain(sel);
    } else {
      const line = lines.find((l) => l.startsWith(sel));
      expect(line, `selector not found: ${sel}`).toBeTruthy();
      expect(line).toContain(decl);
    }
  });
});

// The keep-list: raw px values that remain in styles.css by design. Keyed by
// "property=pxLiterals"; the comment is the reason recorded by the T9 audit.
const KEEP = {
  // gap — micro-gaps inside composed glyphs/art, not control spacing
  'gap=6px': 'top bar one-row constraint: at 8px gaps the menubar collapses over the project title (T9 audit, header.toolbar override)',
  'gap=1px': 'paired glyph micro-gap (cd-icon-tabs, fb-space button)',
  'gap=2px': 'inside the keyword chip pill (icon/count) and the narrow-window AI toggle (≤960px)',
  'gap=3px': 'chart bars (statistics) and compile layout thumbnail art',
  // border-radius — content-level marks, chart micro-elements, stadium/pill shapes
  'border-radius=2px': 'prose mark inline highlight (content)',
  'border-radius=3px': 'prose annotation inline highlight (content)',
  'border-radius=3px 3px': 'statistics bar chart top (chart)',
  'border-radius=10px': 'stadium pills at pill height (keyword chip, team chip)',
  'border-radius=12px': 'status pill (stadium)',
  'border-radius=14px': 'synonym chip (stadium)',
  'border-radius=999px': 'AI status pill (stadium)',
  // font-size — indicators, display type and content text (UI text is 12–14 via tokens)
  'font-size=9px': 'chart tick labels (data-viz annotation)',
  'font-size=10px': 'micro-indicators: binder badge, menu arrows, header arrow (glyphs, not reading text)',
  'font-size=15px': 'content text: document title, quick reference editor',
  'font-size=22px': 'statistics number (data display)',
  'font-size=28px': 'template tile letter/emoji fallback (illustration)',
  'font-size=42px': 'home screen display heading',
  // height / min-height — indicators, data displays, surfaces, thumbnails, drag grips
  'min-height=1px': 'bar chart minimum',
  'height=5px': 'snapshot indicator dot',
  'height=8px': 'label dot / sync dot (indicator)',
  'height=9px': 'AI dot / team dot (indicator)',
  'height=10px': 'dictation pulse dot (indicator)',
  'height=11px': 'binder badge glyph (inline text companion)',
  'height=12px': 'dictation mic dot, team lock glyph (inline indicator)',
  'height=13px': 'mini-player title glyph (inline text companion)',
  'height=16px': 'mini-player level meter (data display)',
  'min-height=18px': 'card footer row (text row)',
  'height=36px': 'template tile icon box (illustration preview)',
  'height=32px': 'template tile icon (illustration preview)',
  'height=46px': 'compile layout thumbnail (preview art)',
  'height=48px': 'page-width drag grip (edge handle)',
  'min-height=64px': 'template description box (surface)',
  'min-height=80px': 'floating inspector notes (surface)',
  'height=96px': 'page-width drag grip on hover (edge handle)',
  'min-height=100px': 'card synopsis textarea (content surface)',
  'min-height=120px': 'service popover minimum (floating surface)',
  'height=140px': 'statistics bars (chart)',
  'min-height=170px': 'corkboard card minimum (content surface)',
  'height=280px': 'toolbar customize list (surface)',
  'min-height=300px': 'notes editor / template body (content surface)',
  'height=360px': 'quick reference default height (resizable window)',
  'min-height=1400px': 'freeform corkboard canvas (canvas)',
  // min-width / width — layout widths of surfaces/fields, meters, sliders, handles
  'min-width=8px': 'format-bar flexible spacer',
  'min-width=40px': 'find bar count / mini level meter',
  'min-width=96px': 'block type select (field width)',
  'min-width=140px': 'find bar input (field width)',
  'min-width=180px': 'template footer input (field width)',
  'min-width=200px': 'menus/popovers, narrow binder (surface width)',
  'min-width=240px': 'popovers (surface width)',
  'min-width=280px': 'menu popover (surface width)',
  'min-width=460px': 'dictation bar (floating surface)',
  'min-width=1200px': 'freeform corkboard canvas (canvas)',
  'width=1px': 'separators',
  'width=4px': 'page-width grip visual (drag handle)',
  'width=5px': 'snapshot dot / resizer (indicator, handle)',
  'width=8px': 'label dot / sync dot (indicator)',
  'width=9px': 'AI dot / team dot (indicator)',
  'width=10px': 'dictation pulse dot (indicator)',
  'width=11px': 'binder badge glyph (inline text companion)',
  'width=12px': 'dictation mic dot, team lock glyph (inline indicator)',
  'width=13px': 'mini-player title glyph (inline text companion)',
  'width=16px': 'page-width drag handle hit zone (edge handle)',
  'width=32px': 'template tile icon (illustration preview)',
  'width=36px': 'template tile icon box (illustration preview)',
  'width=60px': 'mini-player volume slider length',
  'width=72px': 'composition slider length',
  'width=80px': 'progress/target meter width (data display)',
  'width=90px': 'dictation level meter width (data display)',
  'width=130px': 'shortcut editor input (field width)',
  'width=180px': 'color swatch grid (surface width)',
  'width=200px': 'binder narrow media query (layout)',
  'width=260px': 'binder / PDF notes column (layout)',
  'width=300px': 'inspector / AI panel / floating inspector (layout)',
  'width=360px': 'mini-player window (floating surface)',
  'width=420px': 'quick reference default width (resizable window)',
  'width=440px': 'prompt modal width (dialog layout)',
  'width=460px': 'format bar overflow / synonym modal (dialog layout)',
  'width=520px': 'default modal width (dialog layout)',
  'width=560px': 'goto / quick search modal (dialog layout)',
  'width=820px': 'wide modal (dialog layout)',
  'width=900px': 'compile sub-dialog (dialog layout)',
  'width=1060px': 'snapshots manager modal (dialog layout)',
};

// Properties scanned for raw px literals. Not scanned (documented here, T9 scope):
// padding/margin of surfaces (bars, panels, dialogs, pages — container padding is layout),
// max-height/max-width of scroll areas, box-shadow/position offsets, `font:` shorthands
// (one kept: cd-layout-thumb 9px thumbnail art).
const SCAN_PROPS = ['gap', 'row-gap', 'column-gap', 'border-radius', 'font-size', 'height', 'min-height', 'min-width', 'width'];

// key = "prop=<space-joined px literals>" so min(560px, 94vw) counts as 560px
function scan() {
  const bad = [];
  const found = new Set();
  lines.forEach((line, i) => {
    if (line.trim().startsWith('/*') || line.trim().startsWith('*')) return;
    const declRe = /([a-z-]+)\s*:\s*([^;{}]+)/g;
    let m;
    while ((m = declRe.exec(line))) {
      const prop = m[1];
      if (!SCAN_PROPS.includes(prop)) continue;
      const val = m[2].trim();
      const pxs = (val.match(/-?\d+(\.\d+)?px/g) || []).join(' ');
      if (!pxs) continue;
      if (val.includes('var(')) continue;
      const key = `${prop}=${pxs}`;
      found.add(key);
      if (!KEEP[key]) bad.push(`L${i + 1}: ${key} — ${line.trim().slice(0, 110)}`);
    }
  });
  return { bad, found };
}

describe('ADL: no off-scale raw values outside the keep-list', () => {
  it('every px value in scanned properties is a token or a documented keep', () => {
    expect(scan().bad).toEqual([]);
  });
  it('keep-list entries all exist in styles.css (no stale reasons)', () => {
    const { found } = scan();
    const stale = Object.keys(KEEP).filter((k) => {
      const prop = k.slice(0, k.indexOf('='));
      return !SCAN_PROPS.includes(prop) || !found.has(k);
    });
    expect(stale).toEqual([]);
  });
});

describe('ADL §13 Floor: no transition: all', () => {
  it('no css file animates everything', () => {
    const srcDir = join(root, 'src');
    const files = readdirSync(srcDir, { recursive: true }).filter((f) => String(f).endsWith('.css'));
    const offenders = files.filter((f) => readFileSync(join(srcDir, String(f)), 'utf8').match(/transition\s*:\s*all/));
    expect(offenders).toEqual([]);
  });
});
