'use strict';
// File and folder names that work on Windows, macOS and Linux alike.
// Windows refuses < > : " / \ | ? * and control characters, names ending in a dot or space,
// and device names (CON, NUL, COM1…, also with an extension: "con.txt", "CON .scribner").
const RESERVED = /^(con|prn|aux|nul|conin\$|conout\$|com[0-9¹²³]|lpt[0-9¹²³])$/i;
const INVISIBLE = '\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u2064\\u2066-\\u2069\\ufeff\\u061c';
const INVISIBLE_EDGES = new RegExp(`^[${INVISIBLE}\\s]+|[${INVISIBLE}\\s]+$`, 'g');
const MAX = 120; // keeps project/doc paths well under the 260-character Windows limit

function safeName(name, fallback = 'Fără titlu') {
  let s = String(name || '')
    .normalize('NFC') // "Café" from macOS (NFD) and typed (NFC) give the same file name
    // Zero-width / BOM / word-joiner / bidi controls are invisible: a name made only of them
    // looks empty in Explorer/Finder, and at the ends they make look-alike duplicates.
    .replace(INVISIBLE_EDGES, '')
    .replace(/\s+/g, ' ') // tabs and newlines become spaces before control characters are replaced
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_')
    .trim()
    .replace(/[. ]+$/, '');
  if (!s) s = fallback;
  if (RESERVED.test(s.split('.')[0].trim())) s = `_${s}`;
  // Cut on code points: slicing UTF-16 units can leave half an emoji (a lone surrogate, which
  // the file system stores as U+FFFD or rejects).
  return cap(s, MAX) || fallback;
}

// Shortens a (safe) name to at most max UTF-16 units without splitting a surrogate pair and
// without leaving a trailing dot/space/invisible character (Windows strips those).
function cap(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/[\ud800-\udbff]$/, '').replace(INVISIBLE_EDGES, '').replace(/[. ]+$/, '');
}

module.exports = { safeName, cap, RESERVED };
