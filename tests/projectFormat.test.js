// @vitest-environment jsdom
// Project-wide conversion to default formatting (ROADMAP #40): the headless pipeline gives the
// same result as the Format Bar's per-document reset.
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { convertHtmlToDefault } from '../src/lib/projectFormat.js';
import { buildExtensions } from '../src/editor/extensions.js';

const DEFAULTS = { fontFamily: 'Georgia', fontSize: 18, align: 'left', lineSpacing: 1.6, paraSpacing: 0.6, firstLineIndent: 0 };
let ed;
afterEach(() => { ed?.destroy(); ed = null; });

const make = (content) => (ed = new Editor({ extensions: buildExtensions({}), content }));

describe('convertHtmlToDefault', () => {
  it('scoate fontul și mărimea locale (textStyle) și atributele de paragraf', () => {
    const styled = make('<p style="text-align: center"><span style="font-family: Arial; font-size: 20px">Text cu formatare proprie</span></p>');
    const defaults = styled.storage.paragraphFormat.defaults || {};
    const { html, changed } = convertHtmlToDefault(styled.getHTML(), buildExtensions, defaults);
    expect(changed).toBe(true);
    expect(html).not.toContain('font-family: Arial');
    expect(html).not.toContain('text-align: center');
  });

  it('document deja implicit → changed false (fără snapshot/scris în plus)', () => {
    const clean = make('<p>Text curat, la implicit.</p>');
    const r = convertHtmlToDefault(clean.getHTML(), buildExtensions, clean.storage.paragraphFormat.defaults || {});
    expect(r.changed).toBe(false);
  });

  it('paragrafe multiple: fiecare resetat, conținutul rămâne', () => {
    const multi = make('<p style="text-align: right"><span style="font-family: Arial">Unu</span></p><p style="text-align: center">Doi</p>');
    const { html, changed } = convertHtmlToDefault(multi.getHTML(), buildExtensions, multi.storage.paragraphFormat.defaults || {});
    expect(changed).toBe(true);
    expect(html).toContain('Unu');
    expect(html).toContain('Doi');
    expect(html).not.toContain('text-align');
  });

  it('bold/cursiv (mark-uri de conținut) NU sunt atinse', () => {
    const rich = make('<p><strong>Ingroșat</strong> și <em>înclinat</em></p>');
    const r = convertHtmlToDefault(rich.getHTML(), buildExtensions, rich.storage.paragraphFormat.defaults || {});
    expect(r.html).toContain('<strong>');
    expect(r.html).toContain('<em>');
  });
});
