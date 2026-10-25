import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/compileLayouts.cjs');

// P2/P3 — the first-paragraph typography and columns the Compile layout editor now exposes.
describe('compile layout extras', () => {
  it('drop cap wraps the first letter', () => {
    const out = L.firstParagraph('<p>Hello world</p>', { dropCap: true });
    expect(out).toContain('<span data-dropcap="1">H</span>');
    expect(out).toContain('ello world');
  });
  it('lead-in small caps wraps the first N words', () => {
    const out = L.firstParagraph('<p>Hello world foo bar</p>', { firstWordsSmallCaps: 2 });
    expect(out).toContain('<span data-caps="small">Hello world</span>');
    expect(out).toContain(' foo bar');
  });
  it('no change when no first-paragraph option is set', () => {
    expect(L.firstParagraph('<p>plain</p>', {})).toBe('<p>plain</p>');
  });
  it('columns emit a multi-column rule in the layout CSS', () => {
    const css = L.layoutCss([{ cls: 'lay1', lay: { columns: 2 } }]);
    expect(css).toMatch(/\.lay1\{[^}]*column-count:2/);
    expect(L.layoutCss([{ cls: 'lay1', lay: { columns: 1 } }])).not.toMatch(/column-count/);
  });
});
