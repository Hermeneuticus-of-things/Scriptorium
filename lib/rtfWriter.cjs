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

function runRtf(r) {
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
  let head = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl{\\f0\\froman ${rtfEscape(o.fontFamily || 'Times New Roman')};}{\\f1\\fswiss ${rtfEscape(o.headingFont || o.fontFamily || 'Times New Roman')};}}`;
  head += `{\\info{\\title ${rtfEscape(o.title || '')}}{\\author ${rtfEscape(o.author || '')}}}`;
  let body = '';
  if (o.page) {
    const p = o.page;
    const m = p.margins || {};
    const w = Math.round(p.widthIn * TWIP);
    head += `\\paperw${w}\\paperh${Math.round(p.heightIn * TWIP)}\\margl${Math.round((m.inner || 1) * TWIP)}\\margr${Math.round((m.outer || 1) * TWIP)}\\margt${Math.round((m.top || 1) * TWIP)}\\margb${Math.round((m.bottom || 1) * TWIP)}`;
    if (p.mirrored) head += '\\margmirror';
    head += '\\sectd';
    if (p.differentFirstPage) head += '\\titlepg';
    const textW = w - Math.round(((m.inner || 1) + (m.outer || 1)) * TWIP);
    body += headerFooter('header', p.header, textW) + headerFooter('footer', p.footer, textW);
  }
  head += '\n';
  let pendingBreak = false;
  for (const b of blocks) {
    if (b.type === 'pagebreak' || b.type === 'hr') {
      pendingBreak = true;
      continue;
    }
    const brk = pendingBreak || b.pageBreakBefore ? '\\pagebb' : '';
    pendingBreak = false;
    const runs = (b.runs || []).map(runRtf).join('');
    const al = ALIGN[b.align] || '';
    if (/^h\d$/.test(b.type) || b.type === 'title') {
      const hs = b.type === 'title' ? size + 16 : b.type === 'h1' ? size + 12 : b.type === 'h2' ? size + 6 : size + 2;
      const lvl = b.type === 'title' ? 0 : Number(b.type[1]) - 1;
      body += `\\pard\\plain${brk}\\outlinelevel${lvl}\\keepn\\sb480\\sa240${al || '\\qc'}\\f1\\fs${hs}\\b ${runs}\\par\n`;
    } else if (b.type === 'li') {
      body += `\\pard\\plain${brk}\\fi-360\\li720\\sl${sl}\\slmult1\\f0\\fs${size} ${b.list === 'ol' ? `${b.index || 1}.` : '\\u8226?'}\\tab ${runs}\\par\n`;
    } else if (b.type === 'blockquote') {
      body += `\\pard\\plain${brk}\\li720\\ri720\\sl${sl}\\slmult1\\f0\\fs${size} ${runs}\\par\n`;
    } else if (b.type === 'sep' || b.type === 'author') {
      body += `\\pard\\plain${brk}\\qc\\sb240\\sa240\\f0\\fs${size}${b.type === 'author' ? '\\i' : ''} ${runs}\\par\n`;
    } else if (b.type === 'space') {
      body += `\\pard\\plain\\f0\\fs${size}\\par\n`;
    } else {
      const fi = b.noIndent || al === '\\qc' || al === '\\qr' ? '' : `\\fi${indent}`;
      body += `\\pard\\plain${brk}${al}${fi}\\sl${sl}\\slmult1\\sa${after}\\f0\\fs${size} ${runs}\\par\n`;
    }
  }
  return `${head}${body}}`;
}

module.exports = { blocksToRtf, rtfEscape };
