'use strict';
// File and folder names that work on Windows, macOS and Linux alike.
// Windows refuses < > : " / \ | ? * and control characters, names ending in a dot or space,
// and device names (CON, NUL, COM1…, also with an extension: "con.txt", "CON .scribner").
const RESERVED = /^(con|prn|aux|nul|conin\$|conout\$|com[0-9¹²³]|lpt[0-9¹²³])$/i;
const MAX = 120; // keeps project/doc paths well under the 260-character Windows limit

function safeName(name, fallback = 'Fără titlu') {
  let s = String(name || '')
    .replace(/\s+/g, ' ') // tabs and newlines become spaces before control characters are replaced
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_')
    .trim()
    .replace(/[. ]+$/, '');
  if (!s) s = fallback;
  if (RESERVED.test(s.split('.')[0].trim())) s = `_${s}`;
  // Cut on code points: slicing UTF-16 units can leave half an emoji (a lone surrogate, which
  // the file system stores as U+FFFD or rejects).
  s = s.slice(0, MAX).replace(/[\ud800-\udbff]$/, '');
  return s.replace(/[. ]+$/, '') || fallback;
}

module.exports = { safeName, RESERVED };
