'use strict';
// Imports DOCX / TXT / Markdown and optionally splits it into several documents.
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { escapeHtml } = require('./rtf.cjs');
const { docxToHtmlWithRevisions } = require('./trackChanges.cjs');

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

// options.trackChanges (default true): Word tracked insertions/deletions become revision marks.
async function fileToHtml(file, options = {}) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.docx') {
    if (options.trackChanges !== false) return docxToHtmlWithRevisions(fs.readFileSync(file));
    const { value } = await mammoth.convertToHtml({ path: file });
    return value;
  }
  const text = readText(file);
  if (ext === '.md' || ext === '.markdown') return markdownToHtml(text);
  return text
    .split(/\r\n?|\n/)
    .filter((l) => l.trim())
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join('');
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
function splitHtml(html, mode, separator = '#', fallbackTitle = 'Document importat') {
  if (mode === 'none') return [{ title: fallbackTitle, html }];
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

module.exports = { fileToHtml, markdownToHtml, splitHtml, readText };
