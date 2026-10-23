'use strict';
// Scribner HTML -> RTF as Scrivener 3 stores it in Files/Data/<UUID>/content.rtf.
// Own implementation. Emits only constructs that lib/rtf.cjs (the importer) and
// Scrivener read back:
//   headings/quote/code       {\stylesheet} \sN entries named "Heading 1"... + \sN on the paragraph
//   named para/char styles     \sN / \csN entries with the Scribner style name
//   b/i/u/s/sup/sub            \b \i \ul \strike \super \sub
//   colours / highlights       {\colortbl} + \cfN / \cbN
//   links                      {\field{\*\fldinst HYPERLINK "..."}{\fldrslt ...}}
//                              internal scribner://doc/<id>  ->  scrivlnk://<UUID>
//   comments, linked footnotes field HYPERLINK "scrivcmt://<UUID>" + entry in content.comments
//   inline footnotes           {\Scrv_fn=...\end_Scrv_fn}
//   inline annotations         {\Scrv_annot\text=...\end_Scrv_annot}
//   lists                      \lsN \ilvlN + {\listtext ...}
//   tables                     \trowd \cellxN ... \intbl ... \cell ... \row
//   images                     png/jpeg: {\pict\pngblip|\jpegblip}; other types: attachment file +
//                              {\NeXTGraphic name \width \height} (the importer reads it via readAttachment)
//   page breaks                \page
const crypto = require('crypto');
const { rtfEscape } = require('./rtfWriter.cjs');

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', '#39': "'" };
function decode(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9#]+);/gi, (all, e) => {
    if (/^#x/i.test(e)) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (/^#\d+$/.test(e)) return String.fromCodePoint(Number(e.slice(1)));
    return ENT[e.toLowerCase()] ?? all;
  });
}

function attrsOf(s) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s || ''))) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
}

function cssOf(style) {
  const out = {};
  for (const part of String(style || '').split(';')) {
    const i = part.indexOf(':');
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

function parseColor(c) {
  if (!c) return null;
  const s = String(c).trim().toLowerCase();
  let m = /^#([0-9a-f]{6})$/.exec(s);
  if (m) return `#${m[1]}`;
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(s);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`;
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(s);
  if (m) return `#${m.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`;
  return null;
}

const BLOCK_STYLES = [
  { key: 'h1', name: 'Heading 1', fs: 36 },
  { key: 'h2', name: 'Heading 2', fs: 30 },
  { key: 'h3', name: 'Heading 3', fs: 26 },
  { key: 'blockquote', name: 'Block Quote' },
  { key: 'pre', name: 'Code Block' },
];
const HEADING_KEY = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3' };
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'col', 'wbr', 'source']);
const ALIGN = { center: '\\qc', right: '\\qr', justify: '\\qj' };
const IMG_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/tiff': 'tiff', 'image/bmp': 'bmp', 'image/svg+xml': 'svg' };

function rtfDate(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' +0000') : '';
}

/**
 * @param {string} html
 * @param {object} ctx
 *   linkUuid(id) -> Scrivener UUID of a binder item or null (deleted target)
 *   styles       [{id, name, type:'para'|'char'|'both', bold, italic, underline, align, indent}] (project.styles)
 *   comments     false to drop comment / linked-footnote anchors (snapshots: no content.comments of their own)
 * @returns {{ rtf: string, comments: Array, attachments: Array<{name, data}>, warnings: string[] }}
 */
function htmlToScrivRtf(html, ctx = {}) {
  const colors = [];
  const colorIdx = (hex) => {
    let i = colors.indexOf(hex);
    if (i < 0) i = colors.push(hex) - 1;
    return i + 1;
  };
  const sheet = BLOCK_STYLES.map((s, i) => ({ ...s, n: i + 1, kind: 'para' }));
  const userStyles = Array.isArray(ctx.styles) ? ctx.styles : [];
  const styleRef = (id, kind) => {
    let e = sheet.find((s) => s.id === id && s.kind === kind);
    if (!e) {
      const def = userStyles.find((s) => s.id === id) || { id, name: id };
      e = { id, name: def.name || id, def, kind, n: kind === 'char' ? 10 + sheet.length : sheet.length + 1 };
      sheet.push(e);
    }
    return e;
  };

  const comments = [];
  const attachments = [];
  const warnings = [];

  const out = []; // finished top-level paragraphs/rows
  let sink = out; // current paragraph sink (top level or a table cell)
  let para = null; // {props, body}
  const inline = []; // stack of {tag, open, close} for inline elements
  const lists = []; // [{ordered, n}]
  let quote = 0;
  let pre = 0;
  let table = null; // {rows:[[cells]], row:[cells]|null}

  const fmtGroup = () => {
    const st = { b: 0, i: 0, u: 0, s: 0, sup: 0, sub: 0, scaps: 0, color: null, bg: null, cs: null, mono: 0 };
    for (const f of inline) Object.assign(st, Object.fromEntries(Object.entries(f.fmt || {}).map(([k, v]) => [k, typeof v === 'number' ? st[k] + v : v])));
    let w = '';
    if (st.cs) w += `\\cs${st.cs}`;
    if (st.b) w += '\\b';
    if (st.i) w += '\\i';
    if (st.u) w += '\\ul';
    if (st.s) w += '\\strike';
    if (st.sup) w += '\\super';
    else if (st.sub) w += '\\sub';
    if (st.scaps) w += '\\scaps';
    if (st.mono || pre) w += '\\f1';
    if (st.color) w += `\\cf${colorIdx(st.color)}`;
    if (st.bg) w += `\\cb${colorIdx(st.bg)}`;
    return w;
  };

  const openPara = (props = {}) => {
    if (para) return;
    para = { props, body: '' };
  };
  const ensurePara = () => openPara({ implicit: true });
  const write = (s) => {
    ensurePara();
    para.body += s;
  };
  const text = (raw) => {
    let t = raw;
    if (!pre) t = t.replace(/[\r\n\t ]+/g, ' ');
    if (!para && !t.trim()) return;
    if (!t) return;
    const w = fmtGroup();
    const esc = rtfEscape(t);
    write(w ? `{${w} ${esc}}` : esc);
  };

  const finishPara = () => {
    if (!para) return;
    const p = para.props;
    const content = para.body;
    para = null;
    let head = '\\pard\\plain';
    if (table) head += '\\intbl';
    const blockKey = p.block || (quote ? 'blockquote' : null);
    if (blockKey) {
      const s = sheet.find((x) => x.key === blockKey);
      head += `\\s${s.n}`;
      if (blockKey === 'blockquote') head += '\\li720\\ri720';
      if (s.fs) head += `\\fs${s.fs}`;
      if (blockKey === 'pre') head += '\\f1';
    }
    let def = null;
    if (p.style) {
      const s = styleRef(p.style, 'para');
      def = s.def || null;
      head += `\\s${s.n}`;
      if (def && def.indent && !blockKey) head += `\\li${Math.round(def.indent * 240)}\\ri${Math.round(def.indent * 240)}`;
    }
    const align = p.align || (def && def.align) || '';
    if (ALIGN[align]) head += ALIGN[align];
    let marker = '';
    if (p.list) {
      const lvl = p.list.level;
      head += `\\li${720 * (lvl + 1)}\\fi-360\\ls${p.list.ordered ? 2 : 1}\\ilvl${lvl}`;
      if (p.list.marker) marker = `{\\listtext\\tab ${p.list.ordered ? `${p.list.n}.` : '\\u8226?'}\\tab}`;
    }
    if (p.pageBreakBefore) sink.push({ page: true });
    sink.push({ rtf: `${head} ${marker}${content}` });
  };

  const startBlock = (props) => {
    finishPara();
    openPara(props);
  };

  const listItemProps = () => {
    const l = lists[lists.length - 1];
    if (!l || l.used) return null;
    l.used = true;
    return { ordered: l.ordered, n: l.n, level: lists.length - 1, marker: true };
  };

  const imgRtf = (src, width, height) => {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(src || '');
    if (!m) {
      warnings.push(`imagine externă nepreluată: ${String(src).slice(0, 60)}`);
      return '';
    }
    const mime = m[1].toLowerCase();
    const data = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
    const wTw = width ? Math.round(Number(width) * 15) : 0;
    const hTw = height ? Math.round(Number(height) * 15) : 0;
    const blip = { 'image/png': '\\pngblip', 'image/jpeg': '\\jpegblip', 'image/emf': '\\emfblip', 'image/wmf': '\\wmetafile8', 'image/pict': '\\macpict' }[mime];
    if (blip) {
      return `{\\pict${blip}${wTw ? `\\picwgoal${wTw}` : ''}${hTw ? `\\pichgoal${hTw}` : ''}\n${data.toString('hex').replace(/(.{128})/g, '$1\n')}}`;
    }
    const name = `image${attachments.length + 1}.${IMG_EXT[mime] || 'bin'}`;
    attachments.push({ name, data });
    // Cocoa writes a trailing attachment character (\\'ac) after the group; rtf.cjs would show it as "¬", so it is omitted.
    return `{{\\NeXTGraphic ${name} \\width${wTw || 2000} \\height${hTw || 2000} \\noorient}}`;
  };

  const noteRtf = (kind, t) => {
    const body = rtfEscape(String(t || '').trim());
    // \uc1 after the marker: the importer's marker rewrite emits \uc0, which would otherwise make
    // the next \uN? leave a stray '?'.
    return kind === 'fn' ? `{\\Scrv_fn=\\uc1 ${body}\\end_Scrv_fn}\\uc1 ` : `{\\Scrv_annot\\text=\\uc1 ${body}\\end_Scrv_annot}\\uc1 `;
  };

  const tokens = String(html || '').match(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+|</g) || [];
  for (const tok of tokens) {
    if (tok.startsWith('<!--')) continue;
    const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>$/.exec(tok);
    if (!m) {
      text(decode(tok));
      continue;
    }
    const closing = Boolean(m[1]);
    const tag = m[2].toLowerCase();
    const a = closing ? {} : attrsOf(m[3]);
    const css = cssOf(a.style);

    if (!closing) {
      switch (tag) {
        case 'p':
        case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        case 'pre':
        case 'div': {
          const props = { align: css['text-align'] || a.align || '', style: a['data-style'] || null };
          if (HEADING_KEY[tag]) props.block = HEADING_KEY[tag];
          if (tag === 'pre') {
            props.block = 'pre';
            pre++;
          }
          if (/page-break-before:\s*always/.test(a.style || '')) props.pageBreakBefore = true;
          const li = listItemProps();
          if (li) props.list = li;
          else if (lists.length && !para) props.list = { level: lists.length - 1, ordered: lists[lists.length - 1].ordered, n: 0, marker: false };
          startBlock(props);
          continue;
        }
        case 'blockquote':
          finishPara();
          quote++;
          continue;
        case 'ul':
        case 'ol':
          finishPara();
          lists.push({ ordered: tag === 'ol', n: Number(a.start || 1) - 1, used: true });
          continue;
        case 'li': {
          finishPara();
          const l = lists[lists.length - 1];
          if (l) {
            l.n++;
            l.used = false;
          }
          continue;
        }
        case 'table':
          finishPara();
          table = { rows: [], row: null, outer: sink };
          continue;
        case 'tr':
          if (table) table.row = [];
          continue;
        case 'td':
        case 'th':
          if (table && table.row) {
            finishPara();
            const cell = [];
            table.row.push(cell);
            sink = cell;
          }
          continue;
        case 'br':
          write('\\line ');
          continue;
        case 'hr':
          finishPara();
          if (/page-break/.test(a.class || '')) sink.push({ page: true });
          else sink.push({ rtf: '\\pard\\plain\\qc * * *' });
          continue;
        case 'img':
          write(imgRtf(a.src, a.width, a.height));
          continue;
        default:
          break;
      }
      if (VOID.has(tag)) continue;

      // inline
      const frame = { tag, fmt: {}, close: '' };
      if (tag === 'strong' || tag === 'b') frame.fmt.b = 1;
      else if (tag === 'em' || tag === 'i') frame.fmt.i = 1;
      else if (tag === 'u') frame.fmt.u = 1;
      else if (tag === 's' || tag === 'strike' || tag === 'del') frame.fmt.s = 1;
      else if (tag === 'sup') frame.fmt.sup = 1;
      else if (tag === 'sub') frame.fmt.sub = 1;
      else if (tag === 'code') frame.fmt.mono = 1;
      if (/bold|[6-9]00/.test(css['font-weight'] || '')) frame.fmt.b = 1;
      if (/italic/.test(css['font-style'] || '')) frame.fmt.i = 1;
      if (/underline/.test(css['text-decoration'] || '')) frame.fmt.u = 1;
      if (/line-through/.test(css['text-decoration'] || '')) frame.fmt.s = 1;
      if (a['data-caps'] === 'small' || /small-caps/.test(css['font-variant'] || '')) frame.fmt.scaps = 1;
      const color = parseColor(css.color);
      if (color) frame.fmt.color = color;
      const bg = tag === 'mark' ? parseColor(a['data-color'] || css['background-color']) || '#ffff00' : parseColor(css['background-color']);
      if (bg && a['data-comment'] === undefined) frame.fmt.bg = bg;
      if (a['data-char-style']) frame.fmt.cs = styleRef(a['data-char-style'], 'char').n;

      if (a['data-footnote'] !== undefined) {
        write(noteRtf('fn', a['data-footnote']));
        frame.atom = true;
      } else if (a['data-annotation'] !== undefined) {
        write(noteRtf('an', a['data-annotation']));
        frame.atom = true;
      } else if ((a['data-comment'] !== undefined || a['data-linked-footnote'] !== undefined) && ctx.comments !== false) {
        const id = crypto.randomUUID().toUpperCase();
        const footnote = a['data-linked-footnote'] !== undefined;
        comments.push({
          id,
          footnote,
          text: footnote ? a['data-linked-footnote'] : a['data-comment'],
          color: parseColor(a['data-comment-color'] || a['data-color']) || '',
          author: a['data-comment-author'] || a['data-author'] || '',
          date: a['data-comment-date'] || '',
        });
        write(`{\\field{\\*\\fldinst HYPERLINK "scrivcmt://${id}"}{\\fldrslt `);
        frame.close = '}}';
      } else if (tag === 'a' && a.href) {
        let href = a.href;
        const internal = /^scribner:\/\/doc\/([A-Za-z0-9-]+)/.exec(href);
        if (internal) {
          const u = ctx.linkUuid ? ctx.linkUuid(internal[1]) : null;
          href = u ? `scrivlnk://${u}` : null;
          if (!u) warnings.push(`legătură către un document inexistent (${internal[1]}) exportată ca text`);
        }
        if (href) {
          write(`{\\field{\\*\\fldinst HYPERLINK "${href.replace(/["\\{}]/g, (c) => encodeURIComponent(c))}"}{\\fldrslt `);
          frame.close = '}}';
        }
      }
      if (m[4] === '/') {
        if (frame.close) write(frame.close);
        continue;
      }
      inline.push(frame);
      continue;
    }

    // closing tags
    switch (tag) {
      case 'p':
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      case 'div':
        finishPara();
        continue;
      case 'pre':
        finishPara();
        pre = Math.max(0, pre - 1);
        continue;
      case 'blockquote':
        finishPara();
        quote = Math.max(0, quote - 1);
        continue;
      case 'li':
        finishPara();
        continue;
      case 'ul':
      case 'ol':
        finishPara();
        lists.pop();
        continue;
      case 'td':
      case 'th':
        finishPara();
        if (table) sink = table.outer;
        continue;
      case 'tr':
        if (table && table.row) {
          table.rows.push(table.row);
          table.row = null;
        }
        continue;
      case 'table':
        if (table) {
          sink = table.outer;
          for (const row of table.rows) sink.push({ row });
          table = null;
        }
        continue;
      default:
        break;
    }
    for (let k = inline.length - 1; k >= 0; k--) {
      if (inline[k].tag === tag) {
        const [f] = inline.splice(k, 1);
        if (f.close) write(f.close);
        break;
      }
    }
  }
  finishPara();

  // serialize
  const lines = [];
  const emitParas = (items, inCell) => {
    items.forEach((it, idx) => {
      const last = idx === items.length - 1;
      if (it.page) lines.push('\\page');
      else if (it.row) {
        const n = it.row.length || 1;
        const w = Math.floor(9000 / n);
        lines.push(`\\trowd\\trgaph108${it.row.map((_, k) => `\\cellx${w * (k + 1)}`).join('')}`);
        for (const cell of it.row) {
          const paras = cell.filter((c) => c.rtf);
          if (!paras.length) lines.push('\\pard\\plain\\intbl\\cell');
          else emitParas(paras, true);
        }
        lines.push('\\row');
      } else lines.push(`${it.rtf}${inCell && last ? '\\cell' : '\\par'}`);
    });
  };
  emitParas(out, false);

  const colortbl = `{\\colortbl;${colors.map((c) => `\\red${parseInt(c.slice(1, 3), 16)}\\green${parseInt(c.slice(3, 5), 16)}\\blue${parseInt(c.slice(5, 7), 16)};`).join('')}}`;
  // Stylesheet names must directly follow \sN / \csN (the importer reads the text after the control word).
  const stylesheet = `{\\stylesheet{\\s0 Normal;}${sheet.map((s) => (s.kind === 'char' ? `{\\*\\cs${s.n} ${rtfEscape(s.name)};}` : `{\\s${s.n} ${rtfEscape(s.name)};}`)).join('')}}`;
  const listtable =
    '{\\*\\listtable{\\list\\listtemplateid1\\listhybrid{\\listlevel\\levelnfc23\\levelstartat1{\\leveltext\\\'01\\u8226 ?;}{\\levelnumbers;}\\fi-360\\li720}\\listid1}' +
    '{\\list\\listtemplateid2\\listhybrid{\\listlevel\\levelnfc0\\levelstartat1{\\leveltext\\\'02\\\'00.;}{\\levelnumbers\\\'01;}\\fi-360\\li720}\\listid2}}' +
    '{\\*\\listoverridetable{\\listoverride\\listid1\\listoverridecount0\\ls1}{\\listoverride\\listid2\\listoverridecount0\\ls2}}';
  const rtf = `{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0{\\fonttbl{\\f0\\froman Times New Roman;}{\\f1\\fmodern Courier New;}}\n${colortbl}\n${stylesheet}\n${listtable}\n\\f0\\fs24\n${lines.join('\n')}\n}`;
  return { rtf, comments, attachments, warnings, styles: sheet };
}

// Files/Data/<UUID>/content.comments
function commentsXml(comments) {
  const rgb = (hex) => {
    const c = parseColor(hex);
    return c ? [1, 3, 5].map((i) => (parseInt(c.slice(i, i + 2), 16) / 255).toFixed(6)).join(' ') : '';
  };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const items = comments.map((c) => {
    const body = `{\\rtf1\\ansi\\uc1{\\fonttbl{\\f0 Helvetica;}}\\f0\\fs22 ${String(c.text || '')
      .split('\n')
      .map((l) => rtfEscape(l))
      .join('\\par\n')}}`;
    const attrs = [`ID="${c.id}"`, `Footnote="${c.footnote ? 'Yes' : 'No'}"`];
    if (rgb(c.color)) attrs.push(`Color="${rgb(c.color)}"`);
    if (c.author) attrs.push(`Author="${esc(c.author)}"`);
    if (rtfDate(c.date)) attrs.push(`Date="${rtfDate(c.date)}"`);
    return `    <Comment ${attrs.join(' ')}><![CDATA[${body.replace(/]]>/g, ']]]]><![CDATA[>')}]]></Comment>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Comments Version="1.0">\n${items.join('\n')}\n</Comments>\n`;
}

module.exports = { htmlToScrivRtf, commentsXml, parseColor };
