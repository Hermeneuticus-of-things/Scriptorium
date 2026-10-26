import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const imp = require('../lib/importers.cjs');
const { exportOpml } = require('../lib/exporters.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-imp-'));

describe('importers', () => {
  it('imports ODT with headings, styles, lists, footnotes and tables', async () => {
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="o" xmlns:text="t" xmlns:style="s" xmlns:fo="f" xmlns:table="tb">
<office:automatic-styles>
<style:style style:name="T1" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
<style:style style:name="T2" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
</office:automatic-styles>
<office:body><office:text>
<text:h text:outline-level="1">Capitolul &amp; unu</text:h>
<text:p>Ana <text:span text:style-name="T1">are</text:span> <text:span text:style-name="T2">mere</text:span>.<text:note text:note-class="footnote"><text:note-citation>1</text:note-citation><text:note-body><text:p>O notă.</text:p></text:note-body></text:note></text:p>
<text:list><text:list-item><text:p>Unu</text:p></text:list-item></text:list>
<table:table><table:table-row><table:table-cell><text:p>A</text:p></table:table-cell><table:table-cell><text:p>B</text:p></table:table-cell></table:table-row></table:table>
</office:text></office:body></office:document-content>`;
    const zip = new JSZip();
    zip.file('mimetype', 'application/vnd.oasis.opendocument.text');
    zip.file('content.xml', content);
    const file = path.join(tmp(), 'carte.odt');
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
    const html = await imp.fileToHtml(file);
    expect(html).toContain('<h1>Capitolul &amp; unu</h1>');
    expect(html).toContain('Ana <strong>are</strong> <em>mere</em>.<span data-footnote="O notă." class="footnote"></span>');
    expect(html).toContain('<ul><li>Unu</li></ul>');
    expect(html).toContain('<table><tr><td>A</td><td>B</td></tr></table>');
  });

  it('imports RTF through rtfToHtml', async () => {
    const file = path.join(tmp(), 'a.rtf');
    fs.writeFileSync(file, String.raw`{\rtf1\ansi Salut \b lume\b0 .\par}`, 'latin1');
    expect(await imp.fileToHtml(file)).toBe('<p>Salut <strong>lume</strong>.</p>');
  });

  it('sanitizes HTML (scripts, styles, on* attributes)', async () => {
    const html = imp.sanitizeHtml('<div onclick="x()"><script>alert(1)</script><style>p{}</style><p onclick="evil()" class="a">Text <b>bold</b> <a href="javascript:x">rău</a> <a href="https://e.ro/">bun</a></p><img src="x.png" onerror="y"></div>', 'https://site.ro/a/');
    expect(html).not.toMatch(/script|alert|onclick|onerror|javascript|style/);
    expect(html).toBe('<p>Text <strong>bold</strong> rău <a href="https://e.ro/">bun</a></p><img src="https://site.ro/a/x.png">');
    const file = path.join(tmp(), 'p.html');
    fs.writeFileSync(file, '<p onclick="x">Hi</p><script>bad()</script>');
    expect(await imp.fileToHtml(file)).toBe('<p>Hi</p>');
  });

  it('round-trips OPML with nesting and notes', () => {
    const project = {
      title: 'Carte',
      tree: [
        { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'c1', type: 'folder', title: 'Cap. 1 "Început" & <tot>', synopsis: 'Rând 1\nRând 2', label: 'Idee', status: 'Final', children: [
            { id: 's1', type: 'text', title: 'Scena 1', synopsis: 'Ana pleacă.' },
          ] },
        ] },
        { id: 'trash', root: 'trash', type: 'folder', title: 'Coș', children: [{ id: 'x', type: 'text', title: 'Șters' }] },
      ],
    };
    const opml = exportOpml(project);
    expect(opml).not.toContain('Șters');
    const tree = imp.importOpml(opml);
    expect(tree).toHaveLength(1);
    const c1 = tree[0].children[0];
    expect(c1).toMatchObject({ title: 'Cap. 1 "Început" & <tot>', synopsis: 'Rând 1\nRând 2', label: 'Idee', status: 'Final' });
    expect(c1.children[0]).toMatchObject({ title: 'Scena 1', synopsis: 'Ana pleacă.', children: [] });
  });

  it('imports OPML child text as synopsis when _note is absent', () => {
    const t = imp.importOpml('<opml><body><outline title="A">nota</outline></body></opml>');
    expect(t[0]).toMatchObject({ title: 'A', synopsis: 'nota' });
  });

  it('imports Final Draft FDX paragraphs with element styles', () => {
    const html = imp.fdxToHtml(`<?xml version="1.0"?><FinalDraft><Content>
<Paragraph Type="Scene Heading"><Text>INT. CASĂ - ZI</Text></Paragraph>
<Paragraph Type="Character"><Text>ANA</Text></Paragraph>
<Paragraph Type="Dialogue"><Text Style="Bold">Bună</Text><Text> ziua.</Text></Paragraph>
</Content></FinalDraft>`);
    expect(html).toBe('<p data-style="scene-heading">INT. CASĂ - ZI</p><p data-style="character">ANA</p><p data-style="dialogue"><strong>Bună</strong> ziua.</p>');
  });

  it('parses basic Fountain', () => {
    const html = imp.fountainToHtml('Title: Test\n\nINT. BAR - NOAPTE\n\nIon intră.\n\nION\n(încet)\nSalut.\n\nCUT TO:\n');
    expect(html).toContain('<p data-style="scene-heading">INT. BAR - NOAPTE</p>');
    expect(html).toContain('<p data-style="character">ION</p><p data-style="parenthetical">(încet)</p><p data-style="dialogue">Salut.</p>');
    expect(html).toContain('<p data-style="transition">CUT TO:</p>');
  });

  it('classifies files and archives web pages', () => {
    expect(imp.classifyFile('a/b.ODT')).toBe('text');
    expect(imp.classifyFile('x.fountain')).toBe('text');
    expect(imp.classifyFile('poza.jpg')).toBe('media');
    expect(imp.classifyFile('doc.pdf')).toBe('media');
    const r = imp.webPageToHtml('<html><head><title>Articol</title><script>x</script></head><body><nav>meniu</nav><article><p>Conținut</p><img src="/i.png"></article></body></html>', 'https://ex.ro/a/b');
    expect(r.title).toBe('Articol');
    expect(r.html).toContain('<p>Conținut</p><img src="https://ex.ro/i.png">');
    expect(r.html).not.toContain('meniu');
  });
});
