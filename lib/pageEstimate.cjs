'use strict';
// Page ESTIMATION for the compiled output (P1 #28, Scrivener §22.1–22.2 parity).
//
// The compiler does not paginate: DOCX pages in Word (PAGE / PAGEREF fields), PDF in Chromium
// (CSS page counters), print in the OS. Nothing in the pipeline knows real page numbers, so for
// the features that need one at compile time — the `<$p>` field in section titles and body text,
// and the page numbers of the generated ToC — this module ESTIMATES the page each section starts
// on, from the format's page box and typography:
//
//   - a page holds  floor(textHeight / (lineHeight + paragraphSpacing))  lines;
//   - an average glyph is ~0.5 em, so a line of text wraps at  ~textWidth / (0.5 × fontSize);
//   - every paragraph/heading/list item wraps like plain text, a heading costs 2 extra lines
//     (top/bottom margins), an image costs 12 lines (the text block keeps it inside one page),
//     a table row costs 2 lines, a <br> ends the current line;
//   - `hr` and every page break / section break start a new page;
//   - the front matter (title page, contents, front sections) is counted on its own stream and,
//     when page.frontRoman is set (the same settings the DOCX/PDF writers use), the body restarts
//     at page 1 — otherwise it continues the front counter. With running headers the DOCX writer
//     also restarts at 1; the estimate does not try to see that far (documented drift).
//
// The result is a good-faith estimate, not a promise: kerning, hyphenation, keep-with-next,
// embedded fonts and image scaling all drift from what Word or Chromium actually render.

const PH = require('./placeholders.cjs');

const PAGE_FIELD = /<\$p(?::([^<>]+))?>/g;

const px = (v) => (Number(v) || 0) * (96 / 72); // points → px (96 dpi)
const inch = (v) => (Number(v) || 0) * 96; // inches → px (96 dpi)
const tagCount = (s, re) => (String(s).match(re) || []).length;

function htmlText(chunk) {
  return String(chunk)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Segments of rendered HTML in order: {lines} per block run, hr = a page break after it. */
function blockLines(html, { charsPerLine, linesPerPage }) {
  const segs = [];
  let lines = 0;
  const parts = String(html || '').split(/(<hr\b[^>]*>|<\/(?:p|h[1-6]|li|blockquote|div|tr|figcaption)>)/i);
  for (const part of parts) {
    if (!part) continue;
    if (/^<hr/i.test(part)) {
      segs.push({ lines, hr: true });
      lines = 0;
      continue;
    }
    if (/^<\//.test(part)) continue; // a closing tag: the chunk before it was the block
    if (!/<\w/.test(part)) continue; // between blocks there is only whitespace
    const imgs = tagCount(part, /<img\b/gi);
    const rows = tagCount(part, /<tr\b/gi);
    const brs = tagCount(part, /<br\b/gi);
    if (/<h[1-6]\b/i.test(part)) lines += 2; // heading margins
    if (imgs) lines += Math.min(linesPerPage - 1, 12) * imgs; // an image ≈ 12 lines, never a whole page over
    if (rows) lines += 2 * rows;
    const text = htmlText(part).trim();
    if (text) lines += Math.max(1, Math.ceil(text.length / charsPerLine)) + brs;
  }
  segs.push({ lines, hr: false });
  return { segs, breaks: segs.filter((s) => s.hr).length };
}

/**
 * Estimated start page per section item. items: the `items` array from buildDocument (order is
 * the output order). o: { textWidthIn, textHeightIn, fontSizePt, lineSpacing, paraSpacingPt,
 * frontRoman }. Returns { startPage: Map(id → page), total }.
 */
function estimateStartPages(items, o = {}) {
  const fontSizePx = px(o.fontSizePt || 12);
  const lineStep = Math.max(4, fontSizePx * (Number(o.lineSpacing) || 1.5) + px(o.paraSpacingPt || 0));
  const linesPerPage = Math.max(1, Math.floor(Math.max(48, inch(o.textHeightIn || 9)) / lineStep));
  const charsPerLine = Math.max(8, Math.round(Math.max(48, inch(o.textWidthIn || 6.3)) / (0.5 * fontSizePx)));
  const opts = { charsPerLine, linesPerPage };

  const startPage = new Map();
  // front stream (own counter) vs body stream — the body starts at the first body section.
  let page = 1;
  let line = 0;
  let frontPage = 1;
  let frontLine = 0;
  let frontSeen = false;
  let bodyStarted = false;

  const addFront = (n) => {
    if (n <= 0) return;
    frontSeen = true;
    frontLine += n;
    while (frontLine > linesPerPage) {
      frontLine -= linesPerPage;
      frontPage++;
    }
  };
  const breakFront = () => {
    if (frontLine > 0) {
      frontSeen = true;
      frontPage++;
      frontLine = 0;
    }
  };
  const addBody = (n) => {
    line += n;
    while (line > linesPerPage) {
      line -= linesPerPage;
      page++;
    }
  };
  const breakBody = () => {
    if (line > 0) {
      page++;
      line = 0;
    }
  };
  const sectionLines = (it) => {
    let n = 0;
    if (it.title) {
      for (const l of String(it.title).split('\n')) n += Math.max(1, Math.ceil(l.length / charsPerLine)) + 2;
    }
    if (it.subtitle) n += Math.max(1, Math.ceil(String(it.subtitle).length / charsPerLine));
    if (it.html) {
      const b = blockLines(it.html, opts);
      for (const seg of b.segs) {
        addBody(seg.lines + n);
        n = 0;
        if (seg.hr) breakBody(); // hr = page-break-after: always
      }
    }
    addBody(n);
  };

  for (const it of items || []) {
    const front = !bodyStarted && (it.matter === 'front' || it.kind === 'titlepage' || it.kind === 'toc');
    if (front) {
      if (it.kind === 'titlepage') {
        addFront(1); // the title page fills its own page
        breakFront();
      } else if (it.kind === 'toc') {
        const ts = it.settings || {};
        addFront((ts.title ? 2 : 0) + (it.entries || []).length);
        breakFront();
      } else if (it.kind === 'separator') {
        if (it.sep && it.sep.kind === 'page') breakFront();
        else addFront(2);
      } else if (it.kind === 'notes') {
        addFront(it.notes.reduce((sum, x) => sum + 1 + Math.max(1, Math.ceil(String(x.text || '').length / charsPerLine)), 0));
      } else if (it.kind === 'section') {
        if (it.pageBreak || it.sectionBreak) breakFront();
        startPage.set(it.id, frontPage);
        sectionLines(it);
      }
      continue;
    }
    if (!bodyStarted) {
      bodyStarted = true; // anything else (the first body section, notes, back matter) starts the body
      // Without roman front pages the body continues the front counter; with page.frontRoman
      // (the same settings the DOCX/PDF writers use) the body restarts at page 1.
      if (!o.frontRoman && frontSeen) {
        page = frontPage;
        line = frontLine;
      }
    }
    if (it.kind === 'titlepage') breakBody();
    else if (it.kind === 'toc') {
      const ts = it.settings || {};
      addBody((ts.title ? 2 : 0) + (it.entries || []).length);
      breakBody();
    } else if (it.kind === 'separator') {
      if (it.sep && it.sep.kind === 'page') breakBody();
      else addBody(2);
    } else if (it.kind === 'notes') {
      addBody(it.notes.reduce((sum, x) => sum + 1 + Math.max(1, Math.ceil(String(x.text || '').length / charsPerLine)), 0));
    } else if (it.kind === 'section') {
      if (it.pageBreak || it.sectionBreak) breakBody();
      startPage.set(it.id, page);
      sectionLines(it);
    }
  }
  return { startPage, total: page + frontPage - 1 };
}

/**
 * Replaces `<$p>` (and `<$p:fmt>`) with the given page number — the same field the writers keep
 * for themselves in headers/footers, here resolved statically for titles and body text.
 * `<$p:fmt>` resolves through the compile number formats (R, r, w, a, 00…); an unknown format
 * stays as typed. `<$P>` (capital) is not touched, like in the writers.
 */
function evalPageFields(text, page, lang = 'ro') {
  if (!text || typeof text !== 'string' || text.indexOf('<$p') < 0) return text;
  return text.replace(PAGE_FIELD, (all, fmt) => {
    if (!fmt) return String(page);
    const v = PH.formatNumber(Number(page), fmt, lang);
    return v == null ? all : v;
  });
}

module.exports = { estimateStartPages, evalPageFields, blockLines };
