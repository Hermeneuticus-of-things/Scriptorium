// @vitest-environment jsdom
// Ruler: paragraph indents and tab stops survive the editor round-trip and reach DOCX.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { paragraphCss } from '../src/editor/formatting.js';
import { PARSE_OPTIONS } from '../src/editor/syncDoc.js';
import { DEFAULT_KEYS, conflicts } from '../src/lib/commands.js';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');

let ed;
afterEach(() => ed?.destroy());

describe('ruler attributes in the editor', () => {
  it('setParagraphFormat writes indents and tabs that reload identically', () => {
    ed = new Editor({ extensions: buildExtensions({ smartQuotes: false }), content: '<p>a\tb</p><h2>T</h2>', parseOptions: PARSE_OPTIONS });
    ed.chain().selectAll().setParagraphFormat({ indentLeft: 2, indentRight: 1, firstIndent: -0.5, tabStops: '3,6.5' }).run();
    const html = ed.getHTML();
    expect(html).toContain('data-indent-left="2"');
    expect(html).toContain('data-first-indent="-0.5"');
    expect(html).toContain('data-tabs="3,6.5"');
    ed.destroy();
    ed = new Editor({ extensions: buildExtensions({ smartQuotes: false }), content: html, parseOptions: PARSE_OPTIONS });
    for (const n of [ed.state.doc.child(0), ed.state.doc.child(1)]) {
      expect(n.attrs).toMatchObject({ indentLeft: 2, indentRight: 1, firstIndent: -0.5, tabStops: '3,6.5' });
    }
    expect(ed.state.doc.child(0).textContent).toBe('a\tb');
    expect(ed.getHTML()).toBe(html);
  });
  it('renders a hanging indent as CSS', () => {
    expect(paragraphCss({ firstIndent: -1, indentLeft: 1 })).toBe('text-indent: -1cm; margin-left: 1cm');
  });
  it('the Show Ruler shortcut does not collide with defaults', () => {
    expect(DEFAULT_KEYS.toggleRuler).toBe('Ctrl+Alt+Shift+R');
    expect(conflicts(Object.keys(DEFAULT_KEYS), {}).size).toBe(0);
  });
});

describe('ruler attributes in Compile', () => {
  const HTML = '<p style="margin-left: 2cm" data-indent-left="2" data-indent-right="1" data-first-indent="-0.5" data-tabs="3,6.5">Nume\tRol</p><p>Simplu</p>';
  it('parseBlocks reads indents and tab stops', () => {
    const [a, b] = compile.parseBlocks(HTML);
    expect(a.para).toEqual({ left: 2, right: 1, first: -0.5, tabs: [3, 6.5] });
    expect(b.para).toBeUndefined();
  });
  it('DOCX gets w:ind, w:tabs and real tabs', async () => {
    const project = {
      title: 'T', author: 'A',
      tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [{ id: 's1', type: 'text', title: 'S', includeInCompile: true }] }],
    };
    const format = JSON.parse(JSON.stringify(F.PRESETS[0]));
    const zip = await JSZip.loadAsync(await compile.compileDocx(project, (id) => (id === 's1' ? HTML : ''), { format }));
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toMatch(/<w:ind w:left="1134" w:right="567" w:hanging="283"\/>/);
    expect(xml).toContain('<w:tab w:val="left" w:pos="1701"/>');
    expect(xml).toContain('<w:tab w:val="left" w:pos="3686"/>');
    expect(xml).toMatch(/Nume<\/w:t><w:tab\/><w:t[^>]*>Rol/);
  });
});
