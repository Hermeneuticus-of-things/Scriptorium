import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { DEFAULT_SETTINGS, paraIndentCss } from '../src/lib/settingsDefaults.js';

// Owner decision 2026-11-21: every body paragraph starts with a 0.7 cm first-line indent by default
// (a paragraph property, not typed spaces); headings, lists and quotes keep their own typography.
describe('default first-line indent', () => {
  it('defaults to 0.7 cm', () => {
    expect(DEFAULT_SETTINGS.paragraphIndentCm).toBe(0.7);
    expect(paraIndentCss({})).toBe('0.7cm');
    expect(paraIndentCss(null)).toBe('0.7cm');
  });
  it('treats an old stored 0 em as "not set" and uses the cm default', () => {
    expect(paraIndentCss({ paragraphIndent: 0 })).toBe('0.7cm');
  });
  it('keeps an older explicit em value until a cm value is saved', () => {
    expect(paraIndentCss({ paragraphIndent: 1.5 })).toBe('1.5em');
    expect(paraIndentCss({ paragraphIndent: 1.5, paragraphIndentCm: 0.5 })).toBe('0.5cm');
  });
  it('allows turning the indent off', () => {
    expect(paraIndentCss({ paragraphIndentCm: 0 })).toBe('0cm');
  });
  it('does not indent headings, list items or quotes in the editor', () => {
    const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    expect(css).toContain('.prose .ProseMirror p { text-indent: var(--para-indent, 0);');
    expect(css).toContain('.prose .ProseMirror li p, .prose .ProseMirror blockquote p { text-indent: 0; }');
    expect(css).not.toMatch(/\.ProseMirror h[1-6][^{]*\{[^}]*text-indent: var\(--para-indent/);
  });
});
