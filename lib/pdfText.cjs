'use strict';
// Best-effort text extraction from PDF files for research sources, without dependencies:
// inflates FlateDecode content streams and reads the text-showing operators (Tj, TJ, ', ")
// between BT/ET, with line breaks from Td/TD/T*/Tm. Works for most PDFs written by word
// processors with standard font encodings; scanned PDFs (images) give no text.
const zlib = require('zlib');

function decodeStream(buf, dict) {
  if (/\/FlateDecode/.test(dict)) {
    try {
      return zlib.inflateSync(buf);
    } catch {
      try {
        return zlib.inflateRawSync(buf.subarray(2));
      } catch {
        return null;
      }
    }
  }
  if (/\/Filter/.test(dict)) return null; // other filters (images, LZW…) are skipped
  return buf;
}

function streams(pdf) {
  const out = [];
  const s = pdf.toString('latin1');
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const dictStart = s.lastIndexOf('<<', m.index);
    const dict = dictStart >= 0 ? s.slice(dictStart, m.index) : '';
    const start = m.index + m[0].length;
    const end = s.indexOf('endstream', start);
    if (end < 0) break;
    let stop = end;
    while (stop > start && (s[stop - 1] === '\n' || s[stop - 1] === '\r')) stop--;
    if (!/\/(Subtype\s*\/Image|Type\s*\/XObject|Length1|Type\s*\/Metadata)/.test(dict)) {
      const data = decodeStream(pdf.subarray(start, stop), dict);
      if (data) out.push(data.toString('latin1'));
    }
    re.lastIndex = end + 9;
  }
  return out;
}

// PDF literal string body (between the outer parentheses) -> text.
function literal(body) {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== '\\') {
      out += c;
      continue;
    }
    const n = body[++i];
    if (n === undefined) break;
    if (/[0-7]/.test(n)) {
      let oct = n;
      while (oct.length < 3 && /[0-7]/.test(body[i + 1])) oct += body[++i];
      out += String.fromCharCode(parseInt(oct, 8));
    } else out += { n: '\n', r: '', t: '\t', b: '', f: '', '\n': '', '\r': '' }[n] ?? n;
  }
  return out;
}

function hexString(h) {
  const clean = h.replace(/\s+/g, '');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt((clean[i] + (clean[i + 1] || '0')), 16));
  // Two-byte hex strings with a BOM or leading zero bytes are usually UTF-16BE.
  if (bytes.length % 2 === 0 && (bytes[0] === 0xfe || bytes.filter((b, i) => i % 2 === 0 && b === 0).length >= bytes.length / 4)) {
    let s = '';
    for (let i = bytes[0] === 0xfe ? 2 : 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return s;
  }
  return String.fromCharCode(...bytes);
}

// Text of one content stream.
function contentText(src) {
  let out = '';
  let inText = false;
  const tokens = /\((?:\\[\s\S]|[^\\)(]|\((?:\\[\s\S]|[^\\)])*\))*\)|<[0-9A-Fa-f\s]*>|\[|\]|-?\d*\.?\d+|\/[^\s/<>[\]()]+|[A-Za-z'"*]+/g;
  let m;
  let pending = [];
  while ((m = tokens.exec(src))) {
    const t = m[0];
    if (t === 'BT') {
      inText = true;
      continue;
    }
    if (t === 'ET') {
      inText = false;
      out += '\n';
      pending = [];
      continue;
    }
    if (!inText) continue;
    if (t[0] === '(') pending.push(literal(t.slice(1, -1)));
    else if (t[0] === '<') pending.push(hexString(t.slice(1, -1)));
    else if (/^-?\d*\.?\d+$/.test(t)) {
      // a large negative kerning inside TJ is a word space
      if (Number(t) < -200 && pending.length) pending.push(' ');
    } else if (t === 'Tj' || t === 'TJ') {
      out += pending.join('');
      pending = [];
    } else if (t === "'" || t === '"') {
      out += `\n${pending.join('')}`;
      pending = [];
    } else if (t === 'Td' || t === 'TD' || t === 'T*' || t === 'Tm') {
      if (out && !out.endsWith('\n')) out += '\n';
    } else if (t !== '[' && t !== ']' && t[0] !== '/') pending = [];
  }
  return out;
}

/** Plain text of a PDF (Buffer); paragraphs separated by blank lines where the PDF shows gaps. */
function pdfToText(buf) {
  const pdf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') return '';
  const text = streams(pdf)
    .filter((s) => /\bBT\b/.test(s))
    .map(contentText)
    .join('\n\n');
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { pdfToText, contentText, literal, hexString };
