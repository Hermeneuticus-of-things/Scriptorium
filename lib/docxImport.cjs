'use strict';
// Imports DOCX / TXT / Markdown and optionally splits it into several documents.
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const JSZip = require('jszip');
const { escapeHtml } = require('./rtf.cjs');
const { docxToHtmlWithRevisions } = require('./trackChanges.cjs');
const { stripAiWatermarks } = require('./sanitizeText.cjs');

// Text files as Windows editors save them: UTF-8 with a BOM (Notepad) or UTF-16 ("Unicode").
// Without this the BOM sticks to the first line ("\uFEFF# Title" is no longer a heading).
function readText(file) {
  const buf = fs.readFileSync(file);
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2));
  // UTF-16 without a BOM: NUL bytes on every other position.
  const sample = buf.subarray(0, 2000);
  let evenNul = 0;
  let oddNul = 0;
  for (let i = 0; i < sample.length; i++) if (sample[i] === 0) (i % 2 ? oddNul++ : evenNul++);
  if (sample.length > 3 && oddNul > sample.length / 4 && evenNul < sample.length / 20) return new TextDecoder('utf-16le').decode(buf);
  if (sample.length > 3 && evenNul > sample.length / 4 && oddNul < sample.length / 20) return new TextDecoder('utf-16be').decode(buf);
  const utf8 = buf.toString('utf8').replace(/^\uFEFF/, '');
  if (!utf8.includes('\uFFFD')) return utf8;
  // Not UTF-8: the Central European Windows code page (ș ț ă î â), as old Romanian texts use.
  try {
    return new TextDecoder('windows-1250').decode(buf);
  } catch {
    return buf.toString('latin1');
  }
}

// mammoth drops the paragraph first-line indent ("aliniatul de la capăt"), and it cannot re-inject
// direct formatting through its style map. Manuscripts almost always use ONE uniform first-line
// indent on the body, so we read the prevailing \firstLine from the DOCX XML and, when a clear
// majority of the text paragraphs carry it, put it back as a text-indent on every body <p>. This is
// all-or-nothing on purpose (per-paragraph alignment to mammoth's output is not reliable); when the
// document has no consistent indent we add nothing. w:firstLine is in twips (567/cm), like RTF \fi.
function uniformFirstLineCm(xml) {
  const paras = String(xml || '').match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  const withText = paras.filter((p) => /<w:t[\s>]/.test(p));
  if (withText.length < 3) return 0;
  const vals = [];
  for (const p of withText) {
    const m = /<w:ind\b[^>]*\bw:firstLine="(\d+)"/.exec(p);
    const n = m ? Number(m[1]) : 0;
    if (n > 0) vals.push(n);
  }
  // Need a clear majority of text paragraphs indented, else leave the import untouched.
  if (vals.length < withText.length * 0.6) return 0;
  vals.sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)];
  const cm = median / 567;
  return cm >= 0.1 && cm <= 5 ? Math.round(cm * 100) / 100 : 0;
}

// Add a first-line indent to the body paragraphs mammoth produced (bare <p>, no attributes), leaving
// headings, list items and already-styled paragraphs alone.
function applyFirstLineIndent(html, cm) {
  if (!cm) return html;
  return String(html).replace(/<p>/g, `<p style="text-indent:${cm}cm">`);
}

async function docxHtml(buffer, options) {
  const html = options.trackChanges !== false
    ? await docxToHtmlWithRevisions(buffer)
    : (await mammoth.convertToHtml({ buffer })).value;
  let xml = '';
  try {
    const entry = (await JSZip.loadAsync(buffer)).file('word/document.xml');
    if (entry) xml = await entry.async('string');
  } catch { /* not a readable zip: skip indent recovery */ }
  return applyFirstLineIndent(html, uniformFirstLineCm(xml));
}

// options.trackChanges (default true): Word tracked insertions/deletions become revision marks.
async function fileToHtml(file, options = {}) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.docx') {
    return stripAiWatermarks(await docxHtml(fs.readFileSync(file), options));
  }
  const text = stripAiWatermarks(readText(file));
  if (ext === '.md' || ext === '.markdown') return markdownToHtml(text);
  return plainTextToHtml(text);
}

// Plain text → paragraphs, keeping the author's paragraph breaks and first-line indents.
// If the file separates paragraphs with blank lines, each blank-line block is one paragraph (its
// wrapped lines joined with a space); otherwise each non-empty line is its own paragraph. A line
// that starts with a tab or two+ spaces is an indented first line, kept as a text-indent — so the
// "aliniate de la capăt" survive instead of being flattened by HTML whitespace collapsing.
function plainTextToHtml(text) {
  const lines = String(text || '').split(/\r\n?|\n/);
  const hasBlank = lines.some((l) => !l.trim()) && lines.some((l) => l.trim());
  const indented = (l) => /^(\t|[ ]{2,})/.test(l);
  const paras = [];
  if (hasBlank) {
    let cur = null;
    for (const l of lines) {
      if (!l.trim()) { if (cur) { paras.push(cur); cur = null; } continue; }
      if (!cur) cur = { indent: indented(l), text: l.trim() };
      else cur.text += ` ${l.trim()}`;
    }
    if (cur) paras.push(cur);
  } else {
    for (const l of lines) if (l.trim()) paras.push({ indent: indented(l), text: l.trim() });
  }
  if (!paras.length) return '<p></p>';
  return paras.map((p) => `<p${p.indent ? ' style="text-indent:1.25cm"' : ''}>${escapeHtml(p.text)}</p>`).join('');
}

function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

function markdownToHtml(md) {
  const out = [];
  for (const line of md.split(/\r\n?|\n/)) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) out.push(`<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`);
    else if (/^>\s?/.test(line)) out.push(`<blockquote><p>${inlineMd(line.replace(/^>\s?/, ''))}</p></blockquote>`);
    else if (/^\s*$/.test(line)) continue;
    else if (/^(\*\s*\*\s*\*|#{3,}|-{3,})\s*$/.test(line)) out.push('<p>***</p>');
    else out.push(`<p>${inlineMd(line)}</p>`);
  }
  return out.join('');
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (ref, h, d) => {
      const cp = h ? parseInt(h, 16) : Number(d);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ref;
    })
    .replace(/&amp;/g, '&');
}

const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'wbr']);
// Top-level elements of an HTML fragment, nesting-aware: a lazy "<ul>…</ul>" match stops at the
// first inner </ul> and drops the rest of a nested list; <hr>, <pre>, <figure>… must survive too.
function topLevelBlocks(html) {
  const out = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b(?:[^>"']|"[^"]*"|'[^']*')*?(\/?)>|<!--[\s\S]*?-->/g;
  let depth = 0;
  let start = 0;
  let m;
  const loose = (to) => {
    const t = html.slice(start, to);
    if (t.trim()) out.push(`<p>${t.trim()}</p>`);
  };
  while ((m = re.exec(html))) {
    if (!m[2]) continue; // comment
    const name = m[2].toLowerCase();
    const selfClosing = m[3] === '/' || VOID.has(name);
    if (m[1] === '/') {
      if (depth === 0) continue; // stray closing tag
      depth--;
      if (depth === 0) {
        out.push(html.slice(start, re.lastIndex));
        start = re.lastIndex;
      }
    } else if (depth === 0) {
      loose(m.index);
      start = m.index;
      if (selfClosing) {
        out.push(html.slice(start, re.lastIndex));
        start = re.lastIndex;
      } else depth = 1;
    } else if (!selfClosing) depth++;
  }
  if (depth > 0) out.push(html.slice(start));
  else loose(html.length);
  return out;
}

// mode: 'none' | 'h1' | 'h2' | 'separator'
// opts.firstLineTitle: the first non-empty paragraph of each part becomes its title (and is removed).
function splitHtml(html, mode, separator = '#', fallbackTitle = 'Document importat', opts = {}) {
  const parts = splitBlocks(html, mode, separator || '#', fallbackTitle);
  if (!opts || !opts.firstLineTitle) return parts;
  return parts.map((p) => {
    const blocks = topLevelBlocks(p.html);
    const i = blocks.findIndex((b) => blockText(b));
    if (i < 0) return p;
    const title = blockText(blocks[i]).slice(0, 200);
    return { title, html: blocks.filter((_, j) => j !== i).join('') };
  });
}
const blockText = (b) => decodeEntities(b.replace(/<[^>]+>/g, '')).trim();

function splitBlocks(html, mode, separator, fallbackTitle) {
  if (mode === 'none' || !mode) return [{ title: fallbackTitle, html }];
  const blocks = topLevelBlocks(html);
  const parts = [];
  let cur = { title: fallbackTitle, blocks: [] };
  const push = () => {
    if (cur.blocks.length || parts.length === 0) parts.push(cur);
  };
  const text = (b) => decodeEntities(b.replace(/<[^>]+>/g, '')).trim();
  for (const b of blocks) {
    const tag = b.slice(1, 3).toLowerCase();
    const isHeading = (mode === 'h1' && tag === 'h1') || (mode === 'h2' && (tag === 'h1' || tag === 'h2'));
    const isSep = mode === 'separator' && /^<p/i.test(b) && text(b) === separator;
    if (isHeading || isSep) {
      push();
      cur = { title: isHeading ? text(b) || fallbackTitle : `${fallbackTitle} ${parts.length + 1}`, blocks: [] };
    } else {
      cur.blocks.push(b);
    }
  }
  push();
  return parts.filter((p) => p.blocks.length || parts.length === 1).map((p) => ({ title: p.title, html: p.blocks.join('') }));
}

module.exports = { fileToHtml, markdownToHtml, plainTextToHtml, splitHtml, readText, uniformFirstLineCm, applyFirstLineIndent };
