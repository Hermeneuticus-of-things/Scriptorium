// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { isSentenceStart } from '../src/editor/corrections.js';
import { cleanModelText } from '../src/lib/editorial.js';
import { htmlToPlain } from '../src/lib/stats.js';
import { dictionaries } from '../src/lib/i18n.js';
import fs from 'node:fs';
import path from 'node:path';

let ed;
afterEach(() => ed?.destroy());

const FULL = [
  '<h2 data-style="Titlu" style="text-align: center">Cap <span data-char-style="Accent">unu</span></h2>',
  '<p data-style="Corp" style="line-height: 1.5; margin-top: 6pt; margin-bottom: 12pt; text-indent: 1.25cm; margin-left: 2cm; margin-right: 1cm" data-line-height="1.5" data-space-before="6" data-space-after="12" data-first-indent="1.25" data-indent-left="2" data-indent-right="1" data-tabs="2,4.5" dir="rtl">',
  'A <span data-comment="notă" data-comment-color="#ff0000" data-comment-author="Ana" data-comment-date="2026-01-02">comentat</span>',
  ' B<span data-footnote="nota 1" class="footnote"></span>',
  ' <span data-linked-footnote="legată">ancoră</span>',
  ' <span data-annotation="adnotare" class="annotation">adnotare</span>',
  ' <span data-revision="2">revizie</span>',
  ' <span data-bookmark="semn">semn</span>',
  ' <span data-caps="small">mici</span> <span data-caps="all">mari</span>',
  ' <mark data-color="#ffff00" style="background-color: #ffff00; color: inherit">galben</mark>',
  ' <span style="color: rgb(0, 255, 0)">verde</span> <span style="font-family: Georgia; font-size: 14pt">font</span>',
  ' x<sub>2</sub> y<sup>3</sup> <strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code>',
  ' <a href="scribner://doc/abc-123">intern</a> <a href="https://ex.ro">extern</a>',
  ' <img src="data:image/png;base64,iVBORw0KGgo=" width="120" data-align="center"></p>',
  '<p data-script="character">ION</p>',
  '<hr data-page-break="true" class="page-break">',
  '<ol type="a"><li><p>unu</p></li></ol><ol type="i" start="3"><li><p>trei</p></li></ol>',
  '<ul><li><p>bullet</p></li></ul><blockquote><p>citat</p></blockquote>',
  '<table><tbody><tr><th><p>H</p></th></tr><tr><td><p>C</p></td></tr></tbody></table>',
  '<p>sfârșit</p>',
].join('');

describe('HTML round-trip through buildExtensions', () => {
  it('is stable and loses nothing', () => {
    ed = new Editor({ extensions: buildExtensions(), content: FULL });
    const h1 = ed.getHTML();
    const j1 = ed.getJSON();
    ed.commands.setContent(h1);
    const h2 = ed.getHTML();
    expect(h2).toBe(h1);
    expect(ed.getJSON()).toEqual(j1);
    for (const needle of [
      'data-style="Titlu"', 'data-char-style="Accent"', 'text-align: center', 'data-comment="notă"', 'data-comment-color="#ff0000"',
      'data-comment-author="Ana"', 'data-comment-date="2026-01-02"', 'data-footnote="nota 1"', 'data-linked-footnote="legată"',
      'data-annotation="adnotare"', 'data-revision="2"', 'data-bookmark="semn"', 'data-caps="small"', 'data-caps="all"',
      'data-color="#ffff00"', 'color: rgb(0, 255, 0)', 'font-family: Georgia', 'font-size: 14pt', '<sub>2</sub>', '<sup>3</sup>',
      'href="scribner://doc/abc-123"', 'href="https://ex.ro"', 'width="120"', 'data-align="center"', 'data-script="character"',
      'data-page-break', 'type="a"', 'type="i"', 'start="3"', 'data-tabs="2,4.5"', 'dir="rtl"', 'data-line-height="1.5"',
      'data-space-before="6"', 'data-space-after="12"', 'data-first-indent="1.25"', 'data-indent-left="2"', 'data-indent-right="1"',
      '<table', '<th', '<blockquote', '<code>c</code>', '<u>u</u>', '<s>s</s>',
    ]) expect(h2, needle).toContain(needle);
  });
});

describe('i18n keys used in src', () => {
  it('every literal t() key exists in ro and en', () => {
    const files = [];
    (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(jsx?|cjs)$/.test(f)) files.push(p); } })(path.resolve(process.cwd(), 'src'));
    const missing = [];
    for (const f of files) {
      const s = fs.readFileSync(f, 'utf8');
      for (const m of s.matchAll(/\bt\(\s*(['"`])([^'"`$]+)\1/g)) for (const l of ['ro', 'en']) if (!(m[2] in dictionaries[l])) missing.push(`${l}:${m[2]}`);
    }
    expect(missing).toEqual([]);
  });
  it('settings tabs (set.tab.${k}) are translated, incl. sharing', () => {
    const s = fs.readFileSync(path.resolve(process.cwd(), 'src/components/SettingsDialog.jsx'), 'utf8');
    const tabs = [...s.match(/const TABS = \[([^\]]*)\]/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    for (const l of ['ro', 'en']) expect(tabs.filter((k) => !(`set.tab.${k}` in dictionaries[l])), l).toEqual([]);
  });
});

describe('no catastrophic regex backtracking', () => {
  const fast = (fn) => { const t = performance.now(); fn(); return performance.now() - t; };
  it('isSentenceStart on a long run of quotes', () => {
    expect(fast(() => isSentenceStart('„'.repeat(30000) + 'x'))).toBeLessThan(200);
  });
  it('cleanModelText on long whitespace', () => {
    expect(fast(() => cleanModelText('a' + ' '.repeat(40000) + 'b'))).toBeLessThan(200);
    expect(cleanModelText('<text>\n x \n</text>\n')).toBe('x');
  });
  it('stats htmlToPlain on long whitespace runs', () => {
    expect(fast(() => htmlToPlain('<p>a' + ' \t'.repeat(20000) + 'b</p>'))).toBeLessThan(200);
    expect(htmlToPlain('<p>a  </p><p>b</p>')).toBe('a\n\nb');
  });
});

function typeText(editor, text) {
  const { view } = editor;
  for (const ch of text) {
    const { from, to } = view.state.selection;
    const handled = view.someProp('handleTextInput', (f) => f(view, from, to, ch, () => view.state.tr.insertText(ch, from, to)));
    if (!handled) view.dispatch(view.state.tr.insertText(ch, from, to));
  }
}
const typed = (s) => {
  ed = new Editor({ extensions: buildExtensions(), content: '<p></p>' });
  ed.commands.setTextSelection(1);
  typeText(ed, s);
  const out = ed.state.doc.textContent;
  ed.destroy(); ed = null;
  return out;
};

describe('Romanian smart quotes', () => {
  it('paragraph start and after space', () => {
    expect(typed('"Da" a zis "nu"')).toBe('„Da” a zis „nu”');
  });
  it('after em-dash dialogue (with and without space)', () => {
    expect(typed('— "Vino"')).toBe('— „Vino”');
    expect(typed('—"Vino"')).toBe('—„Vino”');
  });
  it('nested «…» inside „…”', () => {
    expect(typed('"El a zis \'da\' apoi"')).toBe('„El a zis «da» apoi”');
    expect(typed('"\'Da\'"')).toBe('„«Da»”');
  });
  it('apostrophes inside words stay apostrophes', () => {
    expect(typed("n-ar într-o O'Brien l'a")).toBe("n-ar într-o O’Brien l’a");
  });
});
