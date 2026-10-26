'use strict';
// RTF -> HTML converter for Scrivener documents (content.rtf, notes.rtf,
// snapshots, comment bodies). Keeps everything the editor can represent:
// paragraphs, headings/quotes (from named styles), alignment, bold/italic/
// underline/strike, super/subscript, text and highlight colors, links
// (external, Scrivener Links, linked comments/footnotes), inline footnotes and
// annotations, lists, tables, line/page breaks and embedded images.

const SKIP_DESTINATIONS = new Set([
  'fonttbl', 'stylesheet', 'info', 'header', 'footer', 'headerl', 'headerr', 'headerf',
  'footerl', 'footerr', 'footerf', 'listtable', 'listoverridetable', 'rsidtbl', 'generator',
  'xmlnstbl', 'themedata', 'colorschememapping', 'latentstyles', 'datastore', 'filetbl',
  'revtbl', 'nonshppict', 'expandedcolortbl', 'pgdsctbl', 'listpicture', 'bkmkstart', 'bkmkend',
  'object', 'objdata', 'fldrslt_ignored', 'pntxta', 'pntxtb', 'pn',
]);

const CP1252 = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
  0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’',
  0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ',
  0x9e: 'ž', 0x9f: 'Ÿ',
};

// Private-use sentinels for Scrivener inline notes, inserted before tokenizing.
const FN_START = '';
const FN_END = '';
const AN_START = '';
const AN_END = '';

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// Scrivener writes inline footnotes/annotations as a group with pseudo control words:
//   {\Scrv_fn=text\end_Scrv_fn}   {\Scrv_annot \color={\R=..}\text=text\end_Scrv_annot}
// They are rewritten into private control words (handled by the tokenizer, which emits a
// sentinel character). The surrounding braces are left alone, so the group still scopes
// \ucN and every other character property exactly as RTF requires.
const NOTE_WORDS = { scrvfnstart: FN_START, scrvfnend: FN_END, scrvanstart: AN_START, scrvanend: AN_END };
function preprocessScrivenerMarkers(rtf) {
  return rtf
    .replace(/\\Scrv_fn=/g, '\\scrvfnstart ')
    .replace(/\\end_Scrv_fn/g, '\\scrvfnend ')
    .replace(/\\Scrv_annot\s*(?:\\color=\{[^}]*\})?\s*(?:\\text=)?/g, '\\scrvanstart ')
    .replace(/\\end_Scrv_annot/g, '\\scrvanend ');
}

function parseColorTable(body) {
  // body: contents of {\colortbl ...}; entries separated by ';'. First is "auto".
  const colors = [];
  for (const entry of body.split(';').slice(0, -1)) {
    const r = /\\red(\d+)/.exec(entry);
    const g = /\\green(\d+)/.exec(entry);
    const b = /\\blue(\d+)/.exec(entry);
    colors.push(r && g && b ? `#${[r, g, b].map((m) => Number(m[1]).toString(16).padStart(2, '0')).join('')}` : null);
  }
  return colors;
}

function extractGroup(rtf, keyword) {
  const idx = rtf.indexOf(`{\\${keyword}`);
  if (idx < 0) return null;
  let depth = 0;
  for (let i = idx; i < rtf.length; i++) {
    if (rtf[i] === '\\') {
      i++;
      continue;
    }
    if (rtf[i] === '{') depth++;
    else if (rtf[i] === '}' && --depth === 0) return rtf.slice(idx + keyword.length + 2, i);
  }
  return null;
}

function parseStyleSheet(rtf) {
  const body = extractGroup(rtf, 'stylesheet');
  const map = {};
  if (!body) return map;
  const re = /\{[^{}]*?\\s(\d+)[^{}]*?([^\\{};]+);\}/g;
  let m;
  while ((m = re.exec(body))) map[m[1]] = m[2].trim();
  const re2 = /\{[^{}]*?\\cs(\d+)[^{}]*?([^\\{};]+);\}/g;
  while ((m = re2.exec(body))) map[`cs${m[1]}`] = m[2].trim();
  return map;
}

// Only the structural paragraph styles that Pneuma Sofer has native blocks for are mapped
// (Scrivener's / Word's "Heading N", "Block Quote", "Code Block"). Every other named style is
// kept by name as a Pneuma Sofer style (data-style / data-char-style); its look comes from the
// style definition, never from guessing at the name.
function styleKind(name) {
  const n = String(name || '').trim().toLowerCase();
  const h = /^(?:heading|titlu)\s*([1-6])$/.exec(n);
  if (h) return h[1] === '1' ? 'h1' : h[1] === '2' ? 'h2' : 'h3';
  if (/^block\s*quote$/.test(n)) return 'blockquote';
  if (/^code\s*block$/.test(n)) return 'pre';
  return null;
}

// Names that mean "no style" in RTF stylesheets.
const PLAIN_STYLE = /^(?:normal|default|no style|default paragraph font|body|body text)$/i;

function slugStyle(name) {
  const s = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'stil';
}

// Pneuma Sofer style id for a named style; options.styleId(name, 'para'|'char') lets the caller
// register the style in project.styles. null = no style.
function namedStyleId(name, kind, options) {
  if (!name || PLAIN_STYLE.test(String(name).trim())) return null;
  if (kind === 'para' && styleKind(name)) return null;
  if (options && typeof options.styleId === 'function') return options.styleId(name, kind) || null;
  return slugStyle(name);
}

/**
 * options:
 *   comments: { [id]: {text, footnote, author, color, date} } linked notes from content.comments
 *   linkFor(uuid): new internal href for a Scrivener Link (or null)
 *   styleNames: { [index]: name } named styles from styles.xml for <$Scr_*::n> markers
 *   readAttachment(name): Buffer for \NeXTGraphic attachments (optional)
 */
function rtfToHtml(input, options = {}) {
  if (!input) return '';
  // A byte-order mark (decoded as UTF-8 "\uFEFF" or as latin1 "ï»¿") or leading blank lines
  // in front of "{\\rtf" must not turn the whole file into plain text.
  const start = /^(?:\uFEFF|\u00EF\u00BB\u00BF)?\s*(?=\{\\rtf)/.exec(input);
  if (!start) return textToHtml(input);
  const rtf = preprocessScrivenerMarkers(input.slice(start[0].length));
  const colors = parseColorTable(extractGroup(rtf, 'colortbl') || '');
  const sheet = parseStyleSheet(rtf);
  const blocks = tokenize(rtf, colors, sheet, { ...options, decodeByte: byteDecoder(rtf) });
  return render(blocks, options);
}

// \'XX bytes are in the document code page (\ansicpgN). Word on a Romanian/Central European
// system writes \ansicpg1250, where \'ba is "ş" (not cp1252 "º"). Single-byte Windows code
// pages are decoded with TextDecoder; anything else falls back to cp1252.
function byteDecoder(rtf) {
  const m = /\\ansicpg(\d+)/.exec(rtf.slice(0, 400));
  const cp = m ? Number(m[1]) : 1252;
  if (cp !== 1252 && (cp === 874 || (cp >= 1250 && cp <= 1258))) {
    try {
      const dec = new TextDecoder(`windows-${cp}`);
      return (code) => dec.decode(Uint8Array.of(code));
    } catch {
      /* code page unknown to this runtime */
    }
  }
  return (code) => CP1252[code] || String.fromCharCode(code);
}

function newPara() {
  return { align: null, style: null, list: null, listMarker: '', inTable: false, indent: 0, pageBreak: false, ilvl: null };
}

function tokenize(rtf, colors, sheet, options) {
  const blocks = []; // {kind:'p', para, runs} | {kind:'row', cells:[[blocks]]}
  let runs = [];
  let para = newPara();
  const stack = [];
  let state = {
    b: false, i: false, u: false, s: false, sup: false, sub: false, caps: false, scaps: false,
    color: null, bg: null, skip: false, uc: 1, link: null, field: null, capture: null, charStyle: null,
    listText: false,
  };
  let pendingSkip = 0;
  let row = null; // current table row: {cells: [[blocks]]}
  let cellBlocks = [];

  const emit = (text) => {
    if (state.capture) {
      state.capture.text += text;
      return;
    }
    if (state.skip || !text) return;
    if (pendingSkip > 0) {
      const n = Math.min(pendingSkip, text.length);
      text = text.slice(n);
      pendingSkip -= n;
      if (!text) return;
    }
    if (state.listText) {
      para.listMarker += text;
      return;
    }
    const key = ['b', 'i', 'u', 's', 'sup', 'sub', 'caps', 'scaps', 'color', 'bg', 'link', 'charStyle'];
    const last = runs[runs.length - 1];
    if (last && !last.img && key.every((k) => last[k] === state[k])) last.text += text;
    else runs.push({ text, ...Object.fromEntries(key.map((k) => [k, state[k]])) });
  };
  const endParagraph = (force = false) => {
    if (!runs.length && !force && !para.listMarker && !para.pageBreak) {
      // empty paragraph still matters (blank line), keep it
    }
    const block = { kind: 'p', para, runs };
    if (para.inTable) cellBlocks.push(block);
    else blocks.push(block);
    runs = [];
    const keep = para;
    para = newPara();
    // paragraph properties persist until \pard in RTF
    para.align = keep.align;
    para.style = keep.style;
    para.inTable = keep.inTable;
    para.indent = keep.indent;
    para.list = keep.list;
    para.ilvl = keep.ilvl;
  };

  let i = 0;
  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === '{') {
      stack.push(state);
      state = { ...state };
      i++;
      if (rtf.startsWith('\\*', i)) {
        i += 2;
        const m = /^\\([a-zA-Z_]+)/.exec(rtf.slice(i, i + 40));
        if (m && m[1] === 'fldinst') {
          // keep reading; handled when the control word arrives
        } else if (m && m[1] === 'Scrv') {
          // handled by preprocess; ignore
          state.skip = true;
        } else {
          state.skip = true;
        }
      }
    } else if (ch === '}') {
      const closing = state;
      state = stack.pop() || state;
      if (closing.capture && !state.capture) {
        // end of field instruction: decide link target for the field result
        const inst = closing.capture.text;
        if (closing.field) closing.field.inst = inst;
      }
      // End of a Word footnote group {\footnote ...}: close the note opened at \footnote.
      if (closing.wordNote && !state.wordNote && !closing.skip) emit(FN_END);
      if (closing.field && !state.field) {
        // end of the whole \field group
      }
      i++;
    } else if (ch === '\\') {
      const next = rtf[i + 1];
      if (next === '\\' || next === '{' || next === '}') {
        emit(next);
        i += 2;
      } else if (next === "'") {
        const hex = rtf.substr(i + 2, 2);
        const code = /^[0-9a-f]{2}$/i.test(hex) ? parseInt(hex, 16) : NaN;
        if (pendingSkip > 0) pendingSkip--;
        else if (Number.isNaN(code)) { /* malformed \'xx: nothing */ }
        else emit(options.decodeByte ? options.decodeByte(code) : CP1252[code] || String.fromCharCode(code));
        i += 4;
      } else if (next === '\n' || next === '\r') {
        if (!state.skip && !state.capture) endParagraph(true);
        i += 2;
      } else if (next === '~') {
        emit(' ');
        i += 2;
      } else if (next === '-') {
        i += 2; // optional hyphen
      } else if (next === '_') {
        emit('‑');
        i += 2;
      } else if (/[a-zA-Z]/.test(next)) {
        const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 48));
        const word = m[1];
        const param = m[2] !== undefined ? parseInt(m[2], 10) : null;
        i += m[0].length;
        if (NOTE_WORDS[word]) {
          // Not text: must not be eaten by a pending \\uN fallback skip.
          const skipped = pendingSkip;
          pendingSkip = 0;
          emit(NOTE_WORDS[word]);
          pendingSkip = skipped;
          continue;
        }
        if (word === 'bin') {
          i += Math.max(0, param || 0); // raw bytes (objdata): never parsed as RTF
          continue;
        }
        if (word === 'footnote' && !state.skip) {
          state.wordNote = true;
          emit(FN_START);
          continue;
        }
        if (word === 'pict') {
          i = readPicture(rtf, i, state, runs, (img) => {
            if (!state.skip) runs.push({ img });
          });
          continue;
        }
        if (word === 'NeXTGraphic') {
          const nm = /^([^\\{}]+?)\s*\\width/.exec(rtf.slice(i, i + 300)) || /^([^\\{}]+)/.exec(rtf.slice(i, i + 300));
          const name = nm ? nm[1].trim() : '';
          const buf = name && options.readAttachment ? options.readAttachment(name) : null;
          if (buf) {
            const ext = name.split('.').pop().toLowerCase();
            const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', tif: 'image/tiff', tiff: 'image/tiff', webp: 'image/webp' }[ext] || 'application/octet-stream';
            runs.push({ img: { src: `data:${mime};base64,${buf.toString('base64')}` } });
          }
          state.skip = true;
          continue;
        }
        if (word === 'colortbl') {
          state.skip = true;
          continue;
        }
        if (SKIP_DESTINATIONS.has(word)) {
          state.skip = true;
          continue;
        }
        if (word === 'field') {
          state.field = { inst: '' };
          continue;
        }
        if (word === 'fldinst') {
          state.capture = { text: '' };
          state.skip = false;
          continue;
        }
        if (word === 'fldrslt') {
          state.skip = false;
          if (state.field) state.link = linkFromInstruction(state.field.inst, options);
          continue;
        }
        if (state.capture) continue;
        switch (word) {
          case 'par':
          case 'sect':
            if (!state.skip) endParagraph(true);
            break;
          case 'page':
            if (!state.skip) {
              para.pageBreak = true;
              endParagraph(true);
            }
            break;
          case 'line':
            emit('\n');
            break;
          case 'tab':
            emit('\t');
            break;
          case 'pard':
            para.align = null;
            para.style = null;
            para.inTable = false;
            para.indent = 0;
            para.firstIndent = 0;
            para.list = null;
            para.ilvl = null;
            break;
          case 'plain':
            Object.assign(state, { b: false, i: false, u: false, s: false, sup: false, sub: false, caps: false, scaps: false, color: null, bg: null, charStyle: null });
            break;
          case 'b': state.b = param !== 0; break;
          case 'i': state.i = param !== 0; break;
          case 'ul': case 'uld': case 'uldb': case 'ulw': case 'ulwave': case 'ulth': case 'uldash':
            state.u = param !== 0;
            break;
          case 'ulnone': state.u = false; break;
          case 'strike': case 'striked': state.s = param !== 0; break;
          case 'super': state.sup = true; state.sub = false; break;
          case 'sub': state.sub = true; state.sup = false; break;
          case 'nosupersub': state.sup = false; state.sub = false; break;
          case 'up': state.sup = param !== 0; break;
          case 'dn': state.sub = param !== 0; break;
          case 'caps': state.caps = param !== 0; break;
          case 'scaps': state.scaps = param !== 0; break;
          case 'cf': state.color = significantColor(colors[param]); break;
          case 'cb': case 'highlight': case 'chcbpat': state.bg = param ? colors[param] || null : null; break;
          case 'qc': para.align = 'center'; break;
          case 'qr': para.align = 'right'; break;
          case 'qj': para.align = 'justify'; break;
          case 'ql': para.align = null; break;
          case 'li': para.indent = param || 0; break;
          // \fi = first-line indent in twips (567/cm). Positive = indented first line
          // ("aliniat de la capăt"); negative is a hanging indent, which we don't carry over.
          case 'fi': para.firstIndent = param || 0; break;
          case 's': para.style = sheet[param] || null; break;
          case 'cs': state.charStyle = sheet[`cs${param}`] || null; break;
          case 'ls': para.list = para.list || { id: param }; break;
          // list level: \\ilvlN (Word / Cocoa) or \\pnlvlN (old Word, 1-based); may precede \\ls
          case 'ilvl': para.ilvl = Math.max(0, param || 0); break;
          case 'pnlvl': para.ilvl = Math.max(0, (param || 1) - 1); para.list = para.list || { id: 0 }; break;
          case 'listtext': state.listText = true; para.list = para.list || { id: 0 }; break;
          case 'pntext': state.listText = true; para.list = para.list || { id: 0 }; break;
          case 'intbl': para.inTable = true; break;
          case 'trowd':
            if (!row) row = { cells: [] };
            break;
          case 'trhdr':
            // RTF header row (repeats on each page): its cells are table headers
            if (!row) row = { cells: [] };
            row.header = true;
            break;
          case 'cell':
            if (runs.length || para.inTable) endParagraph(true);
            if (!row) row = { cells: [] };
            row.cells.push(cellBlocks);
            cellBlocks = [];
            break;
          case 'row':
            if (row) blocks.push({ kind: 'row', cells: row.cells, header: Boolean(row.header) });
            row = null;
            cellBlocks = [];
            para.inTable = false;
            break;
          case 'uc': state.uc = param ?? 1; break;
          case 'u': {
            let code = param;
            if (code < 0) code += 65536;
            if (code >= 0xd800 && code <= 0xdbff) {
              // high surrogate: next \u is the low surrogate
              const low = /^(?:\\'[0-9a-f]{2}|\?|.)?\\u(-?\d+) ?/i.exec(rtf.slice(i, i + 20));
              if (low) {
                let lc = parseInt(low[1], 10);
                if (lc < 0) lc += 65536;
                emit(String.fromCharCode(code, lc));
                i += low[0].length;
                pendingSkip = state.uc;
                break;
              }
            }
            // Out of range or an unpaired surrogate: nothing (it would make the XML exports invalid).
            if (Number.isInteger(code) && code > 0 && code <= 0xffff && !(code >= 0xd800 && code <= 0xdfff)) emit(String.fromCharCode(code));
            pendingSkip = state.uc;
            break;
          }
          case 'emdash': emit('—'); break;
          case 'endash': emit('–'); break;
          case 'emspace': emit(' '); break;
          case 'enspace': emit(' '); break;
          case 'lquote': emit('‘'); break;
          case 'rquote': emit('’'); break;
          case 'ldblquote': emit('“'); break;
          case 'rdblquote': emit('”'); break;
          case 'bullet': emit('•'); break;
          default:
            break;
        }
      } else {
        i += 2;
      }
    } else if (ch === '\r' || ch === '\n') {
      i++;
    } else {
      let j = i;
      while (j < rtf.length && !'{}\\\r\n'.includes(rtf[j])) j++;
      emit(rtf.slice(i, j));
      i = j;
    }
    if (state.listText && ch === '}') state.listText = false;
  }
  if (runs.length) endParagraph(true);
  if (row && row.cells.length) blocks.push({ kind: 'row', cells: row.cells, header: Boolean(row.header) });
  return blocks;
}

function significantColor(c) {
  if (!c) return null;
  const v = parseInt(c.slice(1), 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  // near-black is the default text color; dropping it keeps dark mode readable
  return r + g + b < 60 ? null : c;
}

function readPicture(rtf, i, state, _runs, onImage) {
  // Reads until the closing brace of the \pict group; returns new index.
  let depth = 1;
  let j = i;
  let header = '';
  let hex = '';
  while (j < rtf.length && depth > 0) {
    const c = rtf[j];
    if (c === '{') {
      depth++;
      j++;
      continue;
    }
    if (c === '}') {
      depth--;
      if (depth === 0) break;
      j++;
      continue;
    }
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(j, j + 40));
      if (m) {
        if (m[1] === 'bin') {
          // binary data follows: skip param bytes
          j += m[0].length + Number(m[2] || 0);
          continue;
        }
        if (depth === 1) header += m[0];
        j += m[0].length;
        continue;
      }
      j += 2;
      continue;
    }
    if (depth === 1 && /[0-9a-fA-F]/.test(c)) hex += c;
    j++;
  }
  let mime = null;
  if (/\\pngblip/.test(header)) mime = 'image/png';
  else if (/\\jpegblip/.test(header)) mime = 'image/jpeg';
  else if (/\\emfblip/.test(header)) mime = 'image/emf';
  else if (/\\wmetafile/.test(header)) mime = 'image/wmf';
  else if (/\\macpict/.test(header)) mime = 'image/pict';
  if (mime && hex.length > 8 && !state.skip) {
    const goalw = /\\picwgoal(\d+)/.exec(header);
    const scale = /\\picscalex(\d+)/.exec(header);
    let width = goalw ? Math.round(Number(goalw[1]) / 15) : null; // twips -> px
    if (width && scale) width = Math.round((width * Number(scale[1])) / 100);
    const src = `data:${mime};base64,${Buffer.from(hex, 'hex').toString('base64')}`;
    onImage({ src, width, unsupported: !/png|jpeg/.test(mime) });
  }
  return j;
}

function linkFromInstruction(inst, options) {
  const m = /HYPERLINK\s+(?:\\l\s+)?"([^"]*)"/i.exec(inst || '');
  if (!m) return null;
  const href = m[1];
  const cmt = /^scrivcmt:\/\/(.+)$/i.exec(href);
  if (cmt) return { comment: cmt[1].toUpperCase() };
  const fnt = /^scrivfnt:\/\/(.+)$/i.exec(href);
  if (fnt) return { comment: fnt[1].toUpperCase() };
  const lnk = /^(?:scrivlnk:\/\/|x-scrivener-item:\/\/\/?|scrivener:\/\/)(?:.*?)([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}|\d+)/i.exec(href);
  if (lnk) {
    const target = options.linkFor ? options.linkFor(lnk[1].toUpperCase()) : null;
    return { href: target || href, internal: Boolean(target) };
  }
  // Only links that are safe to follow from an exported book.
  if (!/^(https?:|mailto:|scribner:|#)/i.test(href.trim())) return null;
  return { href };
}

// --- rendering -------------------------------------------------------------

function render(blocks, options) {
  const comments = options.comments || {};
  const styleNames = options.styleNames || {};
  const ctx = { comments, usedComments: new Set(), options };
  const out = [];
  // Open lists, outermost first: {tag, level}. The last <li> of each open list is still open,
  // so a deeper list nests inside it.
  const lists = [];
  const closeLists = (depth = 0) => {
    while (lists.length > depth) out.push(`</li></${lists.pop().tag}>`);
  };

  // Inline notes may span runs and paragraphs: walk all text with a small state machine.
  let noteMode = null; // {kind:'fn'|'an', text}

  const renderRuns = (runs) => {
    let html = '';
    for (const r of runs) {
      if (r.img) {
        if (!noteMode) html += imgHtml(r.img);
        continue;
      }
      // split by sentinels and named-style markers
      const parts = r.text.split(/([\uE000-\uE003])/);
      for (const part of parts) {
        if (part === FN_START || part === AN_START) {
          noteMode = { kind: part === FN_START ? 'fn' : 'an', text: '' };
          continue;
        }
        if (part === FN_END || part === AN_END) {
          if (noteMode) html += noteMode.kind === 'fn' ? footnoteHtml(noteMode.text.trim()) : annotationHtml(noteMode.text.trim());
          noteMode = null;
          continue;
        }
        if (!part) continue;
        if (noteMode) {
          noteMode.text += part;
          continue;
        }
        html += runHtml({ ...r, text: part }, ctx);
      }
    }
    return html;
  };

  for (const block of blocks) {
    if (block.kind === 'row') {
      closeLists();
      // merge consecutive rows into one table
      const cellTag = block.header ? 'th' : 'td';
      const rowHtml = `<tr>${block.cells
        .map((cell) => `<${cellTag}>${cell.map((b) => paragraphHtml(b, renderRuns(b.runs), options)).join('') || '<p></p>'}</${cellTag}>`)
        .join('')}</tr>`;
      const last = out[out.length - 1];
      if (last && last.endsWith('</tbody></table>')) out[out.length - 1] = last.replace(/<\/tbody><\/table>$/, `${rowHtml}</tbody></table>`);
      else out.push(`<table><tbody>${rowHtml}</tbody></table>`);
      continue;
    }
    const inner = renderRuns(block.runs);
    if (noteMode) {
      // paragraph break inside an inline note
      noteMode.text += '\n';
      if (!inner) continue;
    }
    if (block.para.list) {
      const p = block.para;
      // Level: \ilvl / \pnlvl when given, else from the indent (Cocoa/Word: 720 twips per level).
      let level = p.ilvl !== null && p.ilvl !== undefined ? p.ilvl : Math.max(0, Math.round((p.indent || 0) / 720) - 1);
      level = Math.min(level, lists.length); // a list can only nest one level deeper than the open one
      const marker = p.listMarker.trim();
      const ordered = /^\s*(\d+|[a-z]|[ivxlc]+)[.)]/i.test(marker);
      let tag = ordered ? 'ol' : 'ul';
      if (!marker && lists[level]) tag = lists[level].tag; // continuation paragraph without a marker
      closeLists(level + 1);
      if (lists.length === level + 1) {
        if (lists[level].tag === tag) out.push('</li>');
        else {
          out.push(`</li></${lists.pop().tag}>`);
        }
      }
      if (lists.length === level) {
        out.push(`<${tag}>`);
        lists.push({ tag, level });
      }
      out.push(`<li>${paragraphHtml(block, inner, options)}`);
      continue;
    }
    closeLists();
    if (block.para.pageBreak && !inner) {
      out.push('<hr data-page-break="true" class="page-break">');
      continue;
    }
    out.push(paragraphHtml(block, inner, options));
    if (block.para.pageBreak) out.push('<hr data-page-break="true" class="page-break">');
  }
  closeLists();

  // Linked notes that had no anchor in the text are kept at the end, never dropped.
  const orphans = Object.entries(comments).filter(([id]) => !ctx.usedComments.has(id));
  for (const [, c] of orphans) {
    out.push(`<p>${c.footnote ? footnoteHtml(c.text) : annotationHtml(c.text)}</p>`);
  }

  let html = out.join('');
  // Applied named-style markers: <$Scr_H::n> / <$Scr_Ps::n> / <$Scr_Cs::n> (escaped as text)
  html = applyStyleMarkers(html, styleNames, options);
  // drop trailing empty paragraphs
  html = html.replace(/(<p><\/p>)+$/, '');
  return html;
}

// The `.scriv` format marks applied styles with text markers whose number indexes Files/styles.xml:
// <$Scr_Ps::n>...<!$Scr_Ps::n> (paragraph) and <$Scr_Cs::n>...<!$Scr_Cs::n> (character).
function applyStyleMarkers(html, styleNames, options) {
  html = html.replace(/<p([^>]*)>&lt;\$Scr_(?:Ps|H)::(\d+)&gt;([\s\S]*?)(?:&lt;!\$Scr_(?:Ps|H)::\2&gt;)?<\/p>/g, (all, attrs, n, inner) => {
    const name = styleNames[n];
    const kind = styleKind(name);
    const body = applyCharMarkers(inner, styleNames, options).replace(/&lt;!?\$Scr_(?:Ps|H|Cs)::\d+&gt;/g, '');
    if (kind === 'h1' || kind === 'h2' || kind === 'h3') return `<${kind}${attrs}>${body}</${kind}>`;
    if (kind === 'blockquote') return `<blockquote><p${attrs}>${body}</p></blockquote>`;
    if (kind === 'pre') return `<pre><code>${body}</code></pre>`;
    const id = namedStyleId(name, 'para', options);
    const cleaned = attrs.replace(/ data-style="[^"]*"/, '');
    return `<p${id ? ` data-style="${escapeAttr(id)}"` : ''}${cleaned}>${body}</p>`;
  });
  html = applyCharMarkers(html, styleNames, options);
  return html.replace(/&lt;!?\$Scr_(?:Ps|H|Cs)::\d+&gt;/g, '');
}

function applyCharMarkers(html, styleNames, options) {
  return html.replace(/&lt;\$Scr_(?:Cs|H)::(\d+)&gt;([\s\S]*?)&lt;!\$Scr_(?:Cs|H)::\1&gt;/g, (all, n, inner) => {
    const id = namedStyleId(styleNames[n], 'char', options);
    return id ? `<span data-char-style="${escapeAttr(id)}">${inner}</span>` : inner;
  });
}

function paragraphHtml(block, inner, options) {
  const p = block.para;
  const parts = [];
  if (p.align) parts.push(`text-align: ${p.align}`);
  // Keep the author's first-line indent ("aliniat de la capăt"). \fi is in twips (567/cm);
  // only a positive indent carries over (a hanging indent is a list/quote device, not body).
  if (p.firstIndent > 0 && !p.list) parts.push(`text-indent: ${(p.firstIndent / 567).toFixed(2)}cm`);
  const style = parts.length ? ` style="${parts.join('; ')}"` : '';
  const kind = styleKind(p.style);
  if (kind === 'h1' || kind === 'h2' || kind === 'h3') return `<${kind}${style}>${inner}</${kind}>`;
  if (kind === 'pre') return `<pre><code>${inner}</code></pre>`;
  const id = namedStyleId(p.style, 'para', options);
  const ds = id ? ` data-style="${escapeAttr(id)}"` : '';
  if (kind === 'blockquote' || (!id && p.indent >= 700 && !p.list && !p.inTable)) return `<blockquote><p${ds}${style}>${inner}</p></blockquote>`;
  return `<p${ds}${style}>${inner}</p>`;
}

function runHtml(r, ctx) {
  const { comments, usedComments, options } = ctx;
  let html = escapeHtml(r.text).replace(/\n/g, '<br>');
  if (r.sup) html = `<sup>${html}</sup>`;
  if (r.sub) html = `<sub>${html}</sub>`;
  if (r.s) html = `<s>${html}</s>`;
  if (r.u) html = `<u>${html}</u>`;
  if (r.i) html = `<em>${html}</em>`;
  if (r.b) html = `<strong>${html}</strong>`;
  // \scaps / \caps are display attributes: the text keeps its case (Pneuma Sofer SmallCaps / AllCaps marks).
  if (r.scaps) html = `<span data-caps="small">${html}</span>`;
  else if (r.caps) html = `<span data-caps="all">${html}</span>`;
  const cs = namedStyleId(r.charStyle, 'char', options);
  if (cs) html = `<span data-char-style="${escapeAttr(cs)}">${html}</span>`;
  if (r.color) html = `<span style="color: ${r.color}">${html}</span>`;
  if (r.bg) html = `<mark data-color="${r.bg}" style="background-color: ${r.bg}">${html}</mark>`;
  if (r.link) {
    if (r.link.comment) {
      const c = comments[r.link.comment];
      if (c) {
        usedComments.add(r.link.comment);
        // Linked footnote (Footnote="Yes" in content.comments): a mark over its anchor text.
        if (c.footnote) return `<span data-linked-footnote="${escapeAttr(c.text)}" class="linked-footnote">${html}</span>`;
        return `<span data-comment="${escapeAttr(c.text)}"${c.color ? ` data-color="${escapeAttr(c.color)}"` : ''}${c.author ? ` data-author="${escapeAttr(c.author)}"` : ''}${c.date ? ` data-comment-date="${escapeAttr(c.date)}"` : ''} class="comment">${html}</span>`;
      }
      return html;
    }
    const cls = r.link.internal ? ' class="internal-link"' : '';
    return `<a href="${escapeAttr(r.link.href)}"${cls}>${html}</a>`;
  }
  return html;
}

function footnoteHtml(text) {
  return `<span data-footnote="${escapeAttr(text)}" class="footnote"></span>`;
}
function annotationHtml(text) {
  return `<span data-annotation="${escapeAttr(text)}" class="annotation"></span>`;
}
function imgHtml(img) {
  if (img.unsupported) {
    // EMF/WMF/PICT cannot be shown in the editor: keep the bytes in an attribute so nothing is lost.
    return `<span data-unsupported-image="${escapeAttr(img.src)}" class="unsupported-image"></span>`;
  }
  return `<img src="${escapeAttr(img.src)}"${img.width ? ` width="${img.width}"` : ''}>`;
}

function textToHtml(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

// Plain text of an RTF fragment (comment bodies, inline notes).
function rtfToText(rtf) {
  const html = rtfToHtml(rtf);
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote)>/g, '\n')
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

module.exports = { rtfToHtml, rtfToText, textToHtml, escapeHtml, styleKind, slugStyle };
