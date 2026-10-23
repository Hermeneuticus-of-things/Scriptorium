'use strict';
// "Compile": assembles the manuscript (Draft root, items with includeInCompile)
// into one document and exports it as HTML, DOCX or EPUB. PDF is rendered by
// Electron from the HTML produced here (see electron/main.cjs).
const JSZip = require('jszip');
const docx = require('docx');
const store = require('./store.cjs');
const { escapeHtml } = require('./rtf.cjs');

const DEFAULT_OPTIONS = {
  folderHeadings: true,
  documentTitles: false,
  separator: '* * *',
  fontFamily: 'Georgia',
  fontSizePt: 12,
};

// Returns [{level, title, html}] in binder order.
function collectSections(project, readDoc, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const draft = project.tree.find((n) => n.root === 'draft');
  const sections = [];
  let previousWasText = false;
  const visit = (nodes, depth) => {
    for (const n of nodes) {
      if (n.includeInCompile === false || n.type === 'file') continue;
      if (n.type === 'folder') {
        const html = readDoc(n.id) || '';
        sections.push({
          kind: 'heading',
          level: Math.min(depth + 1, 3),
          title: opts.folderHeadings ? n.title : '',
          html: store.htmlToText(html).trim() ? html : '',
        });
        previousWasText = false;
        visit(n.children || [], depth + 1);
      } else {
        if (previousWasText && opts.separator) sections.push({ kind: 'separator', text: opts.separator });
        sections.push({
          kind: 'text',
          level: Math.min(depth + 1, 3),
          title: opts.documentTitles ? n.title : '',
          html: readDoc(n.id) || '',
        });
        previousWasText = true;
        // A text document can contain sub-documents (Scrivener "file group").
        if (n.children && n.children.length) visit(n.children, depth + 1);
      }
    }
  };
  visit(draft ? draft.children : [], 0);
  return sections;
}

function attr(tag, name) {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m ? decodeEntities(m[1]) : null;
}

// Replaces footnote markers with numbered references and strips comment marks
// (keeping the commented text). Returns the new html and the collected notes.
function processNotes(html, startAt = 1, prefix = 'fn') {
  const notes = [];
  let out = (html || '').replace(/<span[^>]*data-footnote="[^"]*"[^>]*>[\s\S]*?<\/span>/g, (tag) => {
    const n = startAt + notes.length;
    notes.push(attr(tag, 'data-footnote'));
    return `<sup><a id="${prefix}ref${n}" href="#${prefix}${n}">${n}</a></sup>`;
  });
  out = out.replace(/<span[^>]*data-comment="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Revision colors are an editing aid, not part of the book.
  out = out.replace(/<span[^>]*data-revision="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Inline annotations and unrenderable images never reach the compiled book.
  out = out.replace(/<span[^>]*data-(?:annotation|unsupported-image)="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
  return { html: out, notes };
}

function notesHtml(notes, startAt = 1, prefix = 'fn') {
  if (!notes.length) return '';
  return `<section class="notes"><h3>Note</h3><ol start="${startAt}">${notes
    .map((t, i) => `<li id="${prefix}${startAt + i}">${escapeHtml(t)} <a href="#${prefix}ref${startAt + i}">↩</a></li>`)
    .join('')}</ol></section>`;
}

function compileHtml(project, readDoc, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const allNotes = [];
  const body = collectSections(project, readDoc, opts)
    .map((s) => {
      if (s.kind === 'separator') return `<p class="sep">${escapeHtml(s.text)}</p>`;
      const head = s.title ? `<h${s.level}>${escapeHtml(s.title)}</h${s.level}>` : '';
      const { html, notes } = processNotes(s.html, allNotes.length + 1);
      allNotes.push(...notes);
      return head + html;
    })
    .join('\n') + notesHtml(allNotes);
  const title = escapeHtml(project.title);
  const author = project.author ? `<p class="author">${escapeHtml(project.author)}</p>` : '';
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:${opts.fontFamily},serif;font-size:${opts.fontSizePt}pt;line-height:1.5;max-width:40em;margin:2em auto;}
h1{page-break-before:always;text-align:center;margin-top:3em}
h1.book{page-break-before:avoid;font-size:2.2em;margin-top:30vh}
.author{text-align:center;font-style:italic}
p{text-indent:1.5em;margin:0} h1+p,h2+p,h3+p,.sep+p{text-indent:0}
.sep{text-align:center;margin:1em 0;text-indent:0}
.notes{page-break-before:always;font-size:.9em}.notes li{text-indent:0}
hr{border:none;page-break-after:always;margin:0}
${opts.styleCss || ''}
</style></head><body><h1 class="book">${title}</h1>${author}\n${body}</body></html>`;
}

// --- tiny HTML parser for TipTap output -> block list with inline runs ---
// styles: named style definitions ({id, type, bold, italic, align, …}).
function parseBlocks(html, styles = []) {
  const byId = Object.fromEntries(styles.map((s) => [s.id, s]));
  const blocks = [];
  let current = null;
  const marks = { b: 0, i: 0, u: 0, s: 0, sup: 0, sub: 0 };
  const spans = []; // stack of {skip, style}
  const lists = []; // stack of 'ol' | 'ul'
  const startBlock = (type, attrs = '') => {
    const align = (/text-align:\s*(left|center|right|justify)/.exec(attrs) || [])[1] || null;
    const style = byId[(/data-style="([^"]*)"/.exec(attrs) || [])[1]] || null;
    current = { type, runs: [], align: align || (style && style.align) || null, style, list: lists[lists.length - 1] || null };
    blocks.push(current);
  };
  const charStyle = () => spans.reduce((acc, s) => (s.style ? { b: acc.b || s.style.bold, i: acc.i || s.style.italic } : acc), { b: false, i: false });
  const skipping = () => spans.some((s) => s.skip);
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const closing = m[1] === '/';
    const tag = m[2] && m[2].toLowerCase();
    if (tag === 'span') {
      if (closing) {
        spans.pop();
        continue;
      }
      if (/data-footnote=/.test(m[3])) {
        if (!skipping()) {
          if (!current) startBlock('p');
          current.runs.push({ footnote: attr(`<span${m[3]}>`, 'data-footnote') || '' });
        }
        spans.push({ skip: true });
        continue;
      }
      if (/data-(annotation|unsupported-image)=/.test(m[3])) {
        spans.push({ skip: true });
        continue;
      }
      spans.push({ skip: false, style: byId[(/data-char-style="([^"]*)"/.exec(m[3]) || [])[1]] || null });
      continue;
    }
    if (skipping()) continue;
    if (m[4] !== undefined) {
      const text = decodeEntities(m[4]);
      if (!text) continue;
      if (!current) startBlock('p');
      const cs = charStyle();
      const ps = current.style || {};
      current.runs.push({
        text,
        b: marks.b > 0 || cs.b || Boolean(ps.bold),
        i: marks.i > 0 || cs.i || Boolean(ps.italic),
        u: marks.u > 0,
        s: marks.s > 0,
        sup: marks.sup > 0,
        sub: marks.sub > 0,
      });
      continue;
    }
    if (tag === 'ol' || tag === 'ul') {
      if (closing) lists.pop();
      else lists.push(tag);
    } else if (['p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote', 'pre'].includes(tag)) {
      // <li><p>…</p></li>: the <p> opens the block; avoid an empty extra block for <li>
      if (!closing) {
        if (tag === 'p' && current && current.type === 'li' && !current.runs.length) {
          const style = byId[(/data-style="([^"]*)"/.exec(m[3]) || [])[1]] || null;
          current.style = style;
          current.align = (/text-align:\s*(left|center|right|justify)/.exec(m[3]) || [])[1] || (style && style.align) || null;
        } else startBlock(tag === 'h4' ? 'h3' : tag === 'pre' ? 'p' : tag, m[3]);
      } else if (tag !== 'p' || !current || current.type !== 'li') current = null;
      if (tag === 'li' && closing) current = null;
    } else if (tag === 'hr' && !closing) {
      blocks.push({ type: 'hr', runs: [] });
      current = null;
    } else if (tag === 'strong' || tag === 'b') marks.b += closing ? -1 : 1;
    else if (tag === 'em' || tag === 'i') marks.i += closing ? -1 : 1;
    else if (tag === 'u') marks.u += closing ? -1 : 1;
    else if (tag === 's' || tag === 'strike') marks.s += closing ? -1 : 1;
    else if (tag === 'sup') marks.sup += closing ? -1 : 1;
    else if (tag === 'sub') marks.sub += closing ? -1 : 1;
    else if (tag === 'br' && current) current.runs.push({ text: '\n', b: false, i: false, u: false, s: false });
  }
  return blocks.filter((b) => b.type === 'hr' || b.type !== 'blockquote' || b.runs.length);
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

async function compileDocx(project, readDoc, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, FootnoteReferenceRun, PageBreak, LevelFormat } = docx;
  const footnotes = {};
  let nextFootnote = 1;
  const H = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun(project.title)] }),
  ];
  if (project.author) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: project.author, italics: true })] }));
  }
  const runsFor = (runs) =>
    runs.map((r) => {
      if (r.footnote !== undefined) {
        const id = nextFootnote++;
        footnotes[id] = { children: [new Paragraph({ children: [new TextRun(r.footnote)] })] };
        return new FootnoteReferenceRun(id);
      }
      return r.text === '\n'
        ? new TextRun({ break: 1 })
        : new TextRun({ text: r.text, bold: r.b, italics: r.i, underline: r.u ? {} : undefined, strike: r.s, superScript: r.sup, subScript: r.sub });
    });
  const ALIGN = { center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED, left: AlignmentType.LEFT };
  let firstAfterHeading = true;
  for (const s of collectSections(project, readDoc, opts)) {
    if (s.kind === 'separator') {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(s.text)] }));
      firstAfterHeading = true;
      continue;
    }
    if (s.title) {
      children.push(
        new Paragraph({
          heading: H[s.level],
          pageBreakBefore: s.level === 1,
          alignment: s.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun(s.title)],
        }),
      );
      firstAfterHeading = true;
    }
    for (const b of parseBlocks(s.html, opts.styles || [])) {
      if (b.type === 'hr') {
        children.push(new Paragraph({ children: [new PageBreak()] }));
        firstAfterHeading = true;
      } else if (b.type.startsWith('h')) {
        children.push(new Paragraph({ heading: H[b.type[1]] || H[3], alignment: ALIGN[b.align], children: runsFor(b.runs) }));
        firstAfterHeading = true;
      } else {
        const styleIndent = b.style && b.style.indent ? Math.round(b.style.indent * 567) : 0;
        const centered = b.align === 'center' || b.align === 'right';
        children.push(
          new Paragraph({
            children: runsFor(b.runs),
            alignment: ALIGN[b.align],
            indent:
              b.type === 'blockquote' || styleIndent
                ? { left: styleIndent || 567, right: styleIndent || 567 }
                : firstAfterHeading || centered || b.type === 'li'
                  ? undefined
                  : { firstLine: 425 },
            bullet: b.type === 'li' && b.list !== 'ol' ? { level: 0 } : undefined,
            numbering: b.type === 'li' && b.list === 'ol' ? { reference: 'ordered', level: 0 } : undefined,
          }),
        );
        firstAfterHeading = false;
      }
    }
  }
  const doc = new Document({
    numbering: {
      config: [{ reference: 'ordered', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }] }],
    },
    creator: project.author || 'Scribner',
    title: project.title,
    styles: {
      default: { document: { run: { font: opts.fontFamily, size: opts.fontSizePt * 2 }, paragraph: { spacing: { line: 360 } } } },
    },
    footnotes,
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

async function compileEpub(project, readDoc, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sections = collectSections(project, readDoc, opts);
  // Split into chapters at level-1 headings (or one chapter if none).
  const chapters = [];
  let cur = null;
  for (const s of sections) {
    if (s.kind === 'heading' && s.level === 1) {
      cur = { title: s.title || `Capitolul ${chapters.length + 1}`, parts: [] };
      chapters.push(cur);
      if (s.html) cur.parts.push(s.html);
      continue;
    }
    if (!cur) {
      cur = { title: project.title, parts: [] };
      chapters.push(cur);
    }
    if (s.kind === 'separator') cur.parts.push(`<p class="sep">${escapeHtml(s.text)}</p>`);
    else cur.parts.push((s.title ? `<h${s.level + 1}>${escapeHtml(s.title)}</h${s.level + 1}>` : '') + s.html);
  }
  const uid = `urn:uuid:${store.newId()}`;
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  zip.file('OEBPS/style.css', `body{font-family:serif;line-height:1.5}p{text-indent:1.5em;margin:0}h1,h2,h3{text-align:center}.sep{text-align:center;text-indent:0;margin:1em 0}hr{border:none;margin:2em 0}\n${opts.styleCss || ''}`);
  const xhtml = (title, body) =>
    `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="ro"><head><title>${escapeHtml(title)}</title><link rel="stylesheet" href="style.css"/></head><body>${body}</body></html>`;
  chapters.forEach((c, idx) => {
    const { html, notes } = processNotes(c.parts.join('\n'));
    const body = `<h1>${escapeHtml(c.title)}</h1>${html}${notesHtml(notes)}`;
    zip.file(`OEBPS/ch${idx + 1}.xhtml`, xhtml(c.title, toXhtml(body)));
  });
  const nav = `<nav epub:type="toc"><h1>Cuprins</h1><ol>${chapters
    .map((c, i) => `<li><a href="ch${i + 1}.xhtml">${escapeHtml(c.title)}</a></li>`)
    .join('')}</ol></nav>`;
  zip.file('OEBPS/nav.xhtml', xhtml('Cuprins', nav));
  const manifest = chapters.map((_, i) => `<item id="ch${i + 1}" href="ch${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join('');
  const spine = chapters.map((_, i) => `<itemref idref="ch${i + 1}"/>`).join('');
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">${uid}</dc:identifier><dc:title>${escapeHtml(project.title)}</dc:title><dc:creator>${escapeHtml(project.author || '')}</dc:creator><dc:language>ro</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>${manifest}</manifest><spine>${spine}</spine></package>`,
  );
  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
}

// XHTML requires self-closed void elements and no HTML-only entities.
function toXhtml(html) {
  return html.replace(/<br\s*>/gi, '<br/>').replace(/<hr\s*>/gi, '<hr/>').replace(/&nbsp;/g, '&#160;');
}

module.exports = { DEFAULT_OPTIONS, collectSections, compileHtml, compileDocx, compileEpub, parseBlocks, processNotes };
