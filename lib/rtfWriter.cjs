'use strict';
// Block list (see compile.cjs blocksFor) -> RTF 1.9 document.
// Non-ASCII characters are written as \uN? (signed 16-bit, surrogate pairs above U+FFFF).

const TWIP = 1440;

function rtfEscape(s) {
  let out = '';
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0);
    if (ch === '\\' || ch === '{' || ch === '}') out += `\\${ch}`;
    else if (ch === '\n') out += '\\line ';
    else if (ch === '\t') out += '\\tab ';
    else if (cp < 128) out += ch;
    else if (cp <= 0xffff) out += `\\u${cp > 32767 ? cp - 65536 : cp}?`;
    else {
      const v = cp - 0x10000;
      const hi = 0xd800 + (v >> 10);
      const lo = 0xdc00 + (v & 0x3ff);
      out += `\\u${hi - 65536}?\\u${lo - 65536}?`;
    }
  }
  return out;
}

// Embedded picture: PNG and JPEG are native RTF blips; other types fall back to their alt text.
function pictRtf(im) {
  const blip = im.ext === 'png' ? '\\pngblip' : im.ext === 'jpg' ? '\\jpegblip' : null;
  if (!blip) return im.alt ? rtfEscape(`[${im.alt}]`) : '';
  const tw = (px) => Math.round((px * TWIP) / 96);
  const hex = Buffer.from(im.data).toString('hex').replace(/(.{128})/g, '$1\n');
  return `{\\pict${blip}\\picw${im.width}\\pich${im.height}\\picwgoal${tw(im.width)}\\pichgoal${tw(im.height)}\n${hex}}`;
}

// Bookmark names: letters, digits and underscores.
const bookmarkName = (id) => String(id).replace(/[^A-Za-z0-9_]/g, '_');

function fieldQuote(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '%22').replace(/[{}]/g, (c) => `\\${c}`);
}

// Runs -> RTF; consecutive runs with the same link become one HYPERLINK field.
function runsRtf(runs) {
  let out = '';
  let link = null;
  let inner = '';
  const flush = () => {
    if (link) {
      const inst = link.startsWith('#') ? `HYPERLINK \\\\l "${fieldQuote(bookmarkName(link.slice(1)))}"` : `HYPERLINK "${fieldQuote(link)}"`;
      out += `{\\field{\\*\\fldinst {${inst}}}{\\fldrslt {\\ul\\cf1 ${inner}}}}`;
    }
    link = null;
    inner = '';
  };
  for (const r of runs || []) {
    const href = (r.text !== undefined || r.image) && r.link ? r.link : null;
    if (href !== link) flush();
    if (href) {
      link = href;
      inner += runRtf(r);
    } else out += runRtf(r);
  }
  flush();
  return out;
}

function runRtf(r) {
  if (r.image) return pictRtf(r.image);
  if (r.footnote !== undefined) {
    return `{\\super\\chftn}{\\footnote\\pard\\plain\\fs20{\\super\\chftn} ${rtfEscape(r.footnote)}}`;
  }
  if (r.text === undefined) return '';
  if (r.text === '\n') return '\\line ';
  const on = [];
  if (r.b) on.push('\\b');
  if (r.i) on.push('\\i');
  if (r.u) on.push('\\ul');
  if (r.s) on.push('\\strike');
  if (r.sup) on.push('\\super');
  if (r.sub) on.push('\\sub');
  if (r.sc) on.push('\\scaps');
  const text = rtfEscape(r.text);
  return on.length ? `{${on.join('')} ${text}}` : text;
}

// Table: one \\trowd…\\row group per row; a header row repeats on every page (\\trhdr).
function tableRtf(b, brk, size, width) {
  const rows = b.rows.filter((r) => r.length);
  const cols = Math.max(1, ...rows.map((r) => r.reduce((n, c) => n + c.colspan, 0)));
  const colW = Math.floor(width / cols);
  const brd = '\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10';
  let out = brk ? `\\pard\\plain${brk}\\f0\\fs4\\par\n` : '';
  rows.forEach((r, ri) => {
    const hdr = ri === 0 && r.every((c) => c.header) ? '\\trhdr' : '';
    let x = 0;
    const defs = r
      .map((c) => {
        x += colW * c.colspan;
        return `${brd}\\cellx${x}`;
      })
      .join('');
    const cells = r.map((c) => `\\pard\\plain\\intbl\\f0\\fs${size} ${runsRtf(c.runs)}\\cell`).join('');
    out += `\\trowd\\trgaph108\\trleft0${hdr}${defs}\n${cells}\\row\n`;
  });
  return `${out}\\pard\\plain\\f0\\fs${size}\\par\n`;
}

const ALIGN = { center: '\\qc', right: '\\qr', justify: '\\qj', left: '\\ql' };

// hf: {left, center, right} already resolved to strings; '<$p>' becomes the page field.
function headerFooter(kind, hf, widthTw) {
  if (!hf || !(hf.left || hf.center || hf.right)) return '';
  const part = (s) => rtfEscape(s || '').replace(/<\\\$p>|<\$p>/g, '{\\field{\\*\\fldinst PAGE}{\\fldrslt 1}}');
  return `{\\${kind}\\pard\\plain\\fs18\\tqc\\tx${Math.round(widthTw / 2)}\\tqr\\tx${widthTw} ${part(hf.left)}\\tab ${part(hf.center)}\\tab ${part(hf.right)}\\par}`;
}

/**
 * @param {Array} blocks block list
 * @param {object} o { title, author, fontFamily, headingFont, fontSizePt, lineSpacing, firstLineIndentIn,
 *   paragraphSpacingPt, page: {widthIn, heightIn, margins, mirrored, header, footer, differentFirstPage} | null }
 */
function blocksToRtf(blocks, o = {}) {
  const size = Math.round((o.fontSizePt || 12) * 2);
  const sl = Math.round(240 * (o.lineSpacing || 1));
  const indent = Math.round((o.firstLineIndentIn || 0) * TWIP);
  const after = Math.round((o.paragraphSpacingPt || 0) * 20);
  let head = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl{\\f0\\froman\\fcharset0 ${rtfEscape(o.fontFamily || 'Times New Roman')};}{\\f1\\froman\\fcharset0 ${rtfEscape(o.headingFont || o.fontFamily || 'Times New Roman')};}}{\\colortbl;\\red5\\green99\\blue193;}`;
  head += `{\\info{\\title ${rtfEscape(o.title || '')}}{\\author ${rtfEscape(o.author || '')}}}`;
  let body = '';
  if (o.page) {
    const p = o.page;
    const m = p.margins || {};
    const w = Math.round(p.widthIn * TWIP);
    head += `\\paperw${w}\\paperh${Math.round(p.heightIn * TWIP)}\\margl${Math.round((m.inner ?? 1) * TWIP)}\\margr${Math.round((m.outer ?? 1) * TWIP)}\\margt${Math.round((m.top ?? 1) * TWIP)}\\margb${Math.round((m.bottom ?? 1) * TWIP)}`;
    if (p.mirrored) head += '\\margmirror';
    head += '\\sectd';
    if (p.differentFirstPage) head += '\\titlepg';
    const textW = w - Math.round(((m.inner ?? 1) + (m.outer ?? 1)) * TWIP);
    body += headerFooter('header', p.header, textW) + headerFooter('footer', p.footer, textW);
  }
  const textWidth = o.page ? Math.round(o.page.widthIn * TWIP) - Math.round((((o.page.margins || {}).inner ?? 1) + ((o.page.margins || {}).outer ?? 1)) * TWIP) : 9000;
  head += '\n';
  let pendingBreak = false;
  for (const b of blocks) {
    if (b.type === 'pagebreak' || b.type === 'hr') {
      pendingBreak = true;
      continue;
    }
    const brk = pendingBreak || b.pageBreakBefore ? '\\pagebb' : '';
    pendingBreak = false;
    const bk = b.section ? `{\\*\\bkmkstart ${bookmarkName(b.section)}}{\\*\\bkmkend ${bookmarkName(b.section)}}` : '';
    const runs = bk + runsRtf(b.runs);
    const al = ALIGN[b.align] || '';
    if (b.type === 'table') {
      body += tableRtf(b, brk, size, textWidth);
      continue;
    }
    if (/^h\d$/.test(b.type) || b.type === 'title') {
      const hs = b.type === 'title' ? size + 16 : b.type === 'h1' ? size + 12 : b.type === 'h2' ? size + 6 : size + 2;
      const lvl = b.type === 'title' ? 0 : Number(b.type[1]) - 1;
      body += `\\pard\\plain${brk}\\outlinelevel${lvl}\\keepn\\sb480\\sa240${al || '\\qc'}\\f1\\fs${hs}\\b ${runs}\\par\n`;
    } else if (b.type === 'li') {
      const li = 720 * Math.max(1, b.level || 1);
      const bullet = ['\\u8226?', '\\u9702?', '\\u9642?'][(Math.max(1, b.level || 1) - 1) % 3];
      body += `\\pard\\plain${brk}\\fi-360\\li${li}\\tx${li}\\sl${sl}\\slmult1\\f0\\fs${size} ${b.list === 'ol' ? `${b.index || 1}.` : bullet}\\tab ${runs}\\par\n`;
    } else if (b.type === 'blockquote') {
      body += `\\pard\\plain${brk}\\li720\\ri720\\sl${sl}\\slmult1\\f0\\fs${size} ${runs}\\par\n`;
    } else if (b.type === 'sep' || b.type === 'author' || b.type === 'subtitle') {
      body += `\\pard\\plain${brk}\\qc\\sb240\\sa240${b.type === 'subtitle' ? '\\keepn' : ''}\\f0\\fs${size}${b.type !== 'sep' ? '\\i' : ''} ${runs}\\par\n`;
    } else if (b.type === 'space') {
      body += `\\pard\\plain\\f0\\fs${size}\\par\n`;
    } else {
      const fi = b.noIndent || al === '\\qc' || al === '\\qr' ? '' : `\\fi${indent}`;
      body += `\\pard\\plain${brk}${al}${fi}\\sl${sl}\\slmult1\\sa${after}\\f0\\fs${size} ${runs}\\par\n`;
    }
  }
  return `${head}${body}}`;
}

module.exports = { blocksToRtf, rtfEscape, runsRtf };
