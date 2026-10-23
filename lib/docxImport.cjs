'use strict';
// Imports DOCX / TXT / Markdown and optionally splits it into several documents.
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { escapeHtml } = require('./rtf.cjs');
const { docxToHtmlWithRevisions } = require('./trackChanges.cjs');

// options.trackChanges (default true): Word tracked insertions/deletions become revision marks.
async function fileToHtml(file, options = {}) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.docx') {
    if (options.trackChanges !== false) return docxToHtmlWithRevisions(fs.readFileSync(file));
    const { value } = await mammoth.convertToHtml({ path: file });
    return value;
  }
  const text = fs.readFileSync(file, 'utf8');
  if (ext === '.md' || ext === '.markdown') return markdownToHtml(text);
  return text
    .split(/\r?\n/)
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
  for (const line of md.split(/\r?\n/)) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) out.push(`<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`);
    else if (/^>\s?/.test(line)) out.push(`<blockquote><p>${inlineMd(line.replace(/^>\s?/, ''))}</p></blockquote>`);
    else if (/^\s*$/.test(line)) continue;
    else if (/^(\*\s*\*\s*\*|#{3,}|-{3,})\s*$/.test(line)) out.push('<p>***</p>');
    else out.push(`<p>${inlineMd(line)}</p>`);
  }
  return out.join('');
}

// mode: 'none' | 'h1' | 'h2' | 'separator'
function splitHtml(html, mode, separator = '#', fallbackTitle = 'Document importat') {
  if (mode === 'none') return [{ title: fallbackTitle, html }];
  const blocks = html.match(/<(h[1-6]|p|blockquote|ul|ol|table)[\s\S]*?<\/\1>/gi) || [];
  const parts = [];
  let cur = { title: fallbackTitle, blocks: [] };
  const push = () => {
    if (cur.blocks.length || parts.length === 0) parts.push(cur);
  };
  const text = (b) => b.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
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

module.exports = { fileToHtml, markdownToHtml, splitHtml };
