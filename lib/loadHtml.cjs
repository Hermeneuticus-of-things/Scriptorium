'use strict';

// Loads a large HTML page into a hidden window through a temp file. A data: URL stops working
// past about 2 MB (a full manuscript with diacritics or inlined images goes over it).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

async function loadHtml(win, html) {
  const file = path.join(os.tmpdir(), `scribner-render-${process.pid}-${crypto.randomBytes(6).toString('hex')}.html`);
  fs.writeFileSync(file, html);
  try {
    await win.loadFile(file);
  } catch (e) {
    throw new Error(`Pagina pentru PDF nu s-a putut încărca: ${String(e.message || e).slice(0, 200)}`);
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {
      /* already gone */
    }
  }
}

module.exports = { loadHtml };
