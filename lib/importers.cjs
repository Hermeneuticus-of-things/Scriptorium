'use strict';
// importers: DOCX, TXT, MD, RTF, ODT, HTML, FDX, Fountain, OPML, web pages.
// Pure Node (no Electron): used by electron/ioHandlers.cjs and by tests.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { fileToHtml: baseFileToHtml, markdownToHtml, readText } = require('./docxImport.cjs');
const { rtfToHtml, escapeHtml } = require('./rtf.cjs');

const TEXT_EXTS = ['.docx', '.txt', '.md', '.markdown', '.rtf', '.odt', '.html', '.htm', '.xhtml', '.epub', '.fdx', '.fountain'];
// Files the Import dialog lists as media (they go to Research as they are).
const MEDIA_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic', 'pdf', 'mp3', 'm4a', 'wav', 'ogg', 'aac', 'mp4', 'mov', 'm4v', 'webm', 'mht', 'mhtml'];

// ---------------------------------------------------------------- minimal XML parser
function decodeXml(s) {
  // One pass: "&#38;lt;" is the text "&lt;", not "<".
  const NAMED = { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' };
  return String(s).replace(/&(?:#x([0-9a-f]+)|#(\d+)|(lt|gt|quot|apos|amp));/gi, (ref, h, d, name) => {
    if (name) return NAMED[name.toLowerCase()] ?? ref;
    const cp = h ? parseInt(h, 16) : Number(d);
    // An out-of-range reference is kept as text: one bad character must not abort the import.
    return cp <= 0x10ffff ? String.fromCodePoint(cp) : ref;
  });
}

function parseAttrs(src) {
  const attrs = {};
  // Quoted values (XML and HTML) or unquoted HTML values (<img src=a.png alt=x>).
  const re = /([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1]] = decodeXml(m[3] ?? m[4] ?? m[5]);
  return attrs;
}

// Returns a root node {name:'#root', children}; element = {name, attrs, children}; text = {text}.
function parseXml(xml) {
  const root = { name: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([^\s>/]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/gi;
  let m;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.children.push({ text: m[1] });
    else if (m[6] !== undefined) top.children.push({ text: decodeXml(m[6]) });
    else if (m[3]) {
      if (m[2] === '/') {
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].name === m[3]) {
            stack.length = i;
            break;
          }
        }
      } else {
        const el = { name: m[3], attrs: parseAttrs(m[4] || ''), children: [] };
        top.children.push(el);
        if (!m[5]) stack.push(el);
      }
    }
  }
  return root;
}

const elems = (node, name) => (node.children || []).filter((c) => c.name && (!name || c.name === name));
function findAll(node, name, out = []) {
  for (const c of node.children || []) {
    if (c.name === name) out.push(c);
    if (c.children) findAll(c, name, out);
  }
  return out;
}
function textOf(node) {
  if (node.text !== undefined) return node.text;
  return (node.children || []).map(textOf).join('');
}

// ---------------------------------------------------------------- ODT
async function odtToHtml(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('content.xml');
  if (!entry) throw new Error('Fișier ODT invalid: lipsește content.xml.');
  const doc = parseXml(await entry.async('string'));
  // Automatic styles: name -> {b, i, u, s}
  const styles = {};
  for (const st of findAll(doc, 'style:style')) {
    const tp = elems(st, 'style:text-properties')[0];
    if (!tp) continue;
    const a = tp.attrs;
    styles[st.attrs['style:name']] = {
      b: a['fo:font-weight'] === 'bold' || Number(a['fo:font-weight']) >= 600,
      i: a['fo:font-style'] === 'italic',
      u: !!a['style:text-underline-style'] && a['style:text-underline-style'] !== 'none',
      s: !!a['style:text-line-through-style'] && a['style:text-line-through-style'] !== 'none',
    };
  }
  const wrap = (html, st) => {
    if (!st) return html;
    if (st.s) html = `<s>${html}</s>`;
    if (st.u) html = `<u>${html}</u>`;
    if (st.i) html = `<em>${html}</em>`;
    if (st.b) html = `<strong>${html}</strong>`;
    return html;
  };
  const inline = (node) =>
    (node.children || [])
      .map((c) => {
        if (c.text !== undefined) return escapeHtml(c.text);
        switch (c.name) {
          case 'text:span':
            return wrap(inline(c), styles[c.attrs['text:style-name']]);
          case 'text:s':
            return ' '.repeat(Number(c.attrs['text:c']) || 1);
          case 'text:tab':
            return '\t';
          case 'text:line-break':
            return '<br>';
          case 'text:a':
            return `<a href="${escapeHtml(c.attrs['xlink:href'] || '')}">${inline(c)}</a>`;
          case 'text:note': {
            const body = elems(c, 'text:note-body')[0];
            const txt = body ? elems(body).map((p) => textOf(p)).join(' ').trim() : '';
            return `<span data-footnote="${escapeHtml(txt).replace(/"/g, '&quot;')}" class="footnote"></span>`;
          }
          case 'text:note-citation':
          case 'office:annotation':
            return '';
          default:
            return inline(c);
        }
      })
      .join('');
  const block = (c) => {
    switch (c.name) {
      case 'text:p': {
        const inner = inline(c);
        return wrap(inner, styles[c.attrs['text:style-name']]) && `<p>${wrap(inner, styles[c.attrs['text:style-name']])}</p>`;
      }
      case 'text:h': {
        const lvl = Math.min(Math.max(Number(c.attrs['text:outline-level']) || 1, 1), 3);
        return `<h${lvl}>${inline(c)}</h${lvl}>`;
      }
      case 'text:list':
        return `<ul>${elems(c, 'text:list-item').map((li) => `<li>${elems(li).map((x) => (x.name === 'text:p' ? inline(x) : block(x))).join('')}</li>`).join('')}</ul>`;
      case 'table:table':
        return `<table>${findAll(c, 'table:table-row')
          .map((r) => `<tr>${elems(r, 'table:table-cell').map((cell) => `<td>${elems(cell).map((p) => inline(p)).join('<br>')}</td>`).join('')}</tr>`)
          .join('')}</table>`;
      case 'text:section':
        return elems(c).map(block).join('');
      default:
        return '';
    }
  };
  const body = findAll(doc, 'office:text')[0];
  if (!body) return '';
  return elems(body).map(block).join('');
}

// ---------------------------------------------------------------- HTML sanitize
const ALLOWED = new Set(['p', 'h1', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'sup', 'sub', 'a', 'br', 'table', 'tr', 'td', 'img']);
const ALIASES = { b: 'strong', i: 'em', strike: 's', del: 's', th: 'td', h4: 'h3', h5: 'h3', h6: 'h3' };

function resolveUrl(u, baseUrl) {
  if (!baseUrl) return u;
  try {
    return new URL(u, baseUrl).href;
  } catch {
    return u;
  }
}
const safeUrl = (u) => (/^(https?:|mailto:|data:image\/)/i.test(u) ? u : '');

/** Best candidate of a srcset ("a.jpg 480w, b.jpg 1080w" / "a.jpg 1x, b.jpg 2x"): the largest width/density. */
function bestSrcset(srcset) {
  let best = '';
  let bestScore = -1;
  for (const part of String(srcset || '').split(/,\s+/)) {
    const [url, desc = '1x'] = part.trim().split(/\s+/);
    if (!url) continue;
    const d = /^(\d+(?:\.\d+)?)([wx])$/i.exec(desc);
    // Widths outrank densities (a 2x density says nothing about the actual width).
    const score = d ? (d[2].toLowerCase() === 'w' ? 1000 + Number(d[1]) : Number(d[1])) : 1;
    if (score > bestScore) [best, bestScore] = [url, score];
  }
  return best;
}

function sanitizeHtml(html, baseUrl) {
  let src = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|iframe|object|embed|template|svg|head|title|form|button|select|textarea)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|link|meta|input)\b[^>]*>/gi, '');
  const out = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[4] !== undefined) {
      out.push(m[4].replace(/[<>]/g, ''));
      continue;
    }
    let tag = m[2].toLowerCase();
    tag = ALIASES[tag] || tag;
    if (!ALLOWED.has(tag)) {
      if (['div', 'section', 'article'].includes(tag) && m[1]) out.push('\n');
      continue;
    }
    if (m[1]) {
      if (tag !== 'br' && tag !== 'img') out.push(`</${tag}>`);
      continue;
    }
    const a = parseAttrs(m[3]);
    if (tag === 'a') {
      const href = safeUrl(resolveUrl(a.href || '', baseUrl));
      out.push(href ? `<a href="${escapeHtml(href)}">` : '<a>');
    } else if (tag === 'img') {
      // Lazy-loading pages keep the real image in srcset / data-src and a placeholder in src.
      const cands = [bestSrcset(a.srcset), bestSrcset(a['data-srcset']), a['data-src'], a.src];
      const s = cands.map((c) => (c ? safeUrl(resolveUrl(c, baseUrl)) : '')).find(Boolean);
      if (s) out.push(`<img src="${escapeHtml(s)}"${a.alt ? ` alt="${escapeHtml(a.alt)}"` : ''}>`);
    } else out.push(tag === 'br' ? '<br>' : `<${tag}>`);
  }
  return out.join('').replace(/<a>([\s\S]*?)<\/a>/g, '$1').replace(/\n+/g, '').trim();
}

// ---------------------------------------------------------------- Final Draft / Fountain
const fdxStyle = (t) => String(t || 'Action').toLowerCase().replace(/[^a-z0-9]+/g, '-');

function fdxToHtml(xml) {
  const doc = parseXml(xml);
  const content = findAll(doc, 'Content')[0] || doc;
  return elems(content, 'Paragraph')
    .map((p) => {
      const inner = elems(p, 'Text')
        .map((t) => {
          let h = escapeHtml(textOf(t));
          const st = t.attrs.Style || '';
          if (/Underline/.test(st)) h = `<u>${h}</u>`;
          if (/Italic/.test(st)) h = `<em>${h}</em>`;
          if (/Bold/.test(st)) h = `<strong>${h}</strong>`;
          return h;
        })
        .join('');
      return `<p data-style="${fdxStyle(p.attrs.Type)}">${inner}</p>`;
    })
    .join('');
}

function fountainInline(s) {
  return escapeHtml(s)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<u>$1</u>');
}

function fountainToHtml(text) {
  const src = String(text).replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\[\[[\s\S]*?\]\]/g, '');
  const lines = src.split('\n');
  // Skip title page (key: value lines at the very top).
  let i = 0;
  if (/^[A-Za-z ]+:/.test(lines[0] || '')) while (i < lines.length && lines[i].trim()) i++;
  const out = [];
  const p = (style, s) => out.push(`<p data-style="${style}">${fountainInline(s)}</p>`);
  let inDialogue = false;
  for (; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const prevBlank = i === 0 || !lines[i - 1].trim();
    const nextBlank = i + 1 >= lines.length || !lines[i + 1].trim();
    if (!line) {
      inDialogue = false;
      continue;
    }
    if (/^(INT|EXT|EST|INT\.?\/EXT|I\/E)[. ]/i.test(line) || /^\.[^.]/.test(line)) p('scene-heading', line.replace(/^\./, ''));
    else if (/^>.*<$/.test(line)) out.push(`<p data-style="action" style="text-align: center">${fountainInline(line.slice(1, -1).trim())}</p>`);
    else if ((/^[A-Z0-9 .'-]+ TO:$/.test(line) && prevBlank) || /^>/.test(line)) p('transition', line.replace(/^>\s*/, ''));
    else if (/^#{1,3}\s/.test(line)) p('section', line.replace(/^#+\s*/, ''));
    else if (/^=\s/.test(line)) p('synopsis', line.slice(1).trim());
    else if (inDialogue && /^\(.*\)$/.test(line)) p('parenthetical', line);
    else if (inDialogue) p('dialogue', line);
    else if (prevBlank && !nextBlank && ((/^[^a-z]*[A-Z][^a-z]*$/.test(line) && !/^!/.test(line)) || /^@/.test(line))) {
      p('character', line.replace(/^@/, ''));
      inDialogue = true;
    } else p('action', line.replace(/^!/, ''));
  }
  return out.join('');
}

// ---------------------------------------------------------------- dispatch
// options: { defaultFormatting (strip fonts, sizes, colours), footnotes: 'inline' | 'linked' (Word) }
async function fileToHtml(file, options = {}) {
  let html = await rawFileToHtml(file);
  if (path.extname(file).toLowerCase() === '.docx') html = docxFootnotes(html, options.footnotes || 'inline');
  if (options.defaultFormatting) html = toDefaultFormatting(html);
  return html;
}

async function rawFileToHtml(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.epub':
      return epubToHtml(fs.readFileSync(file));
    case '.xhtml':
    case '.rtf':
      return rtfToHtml(fs.readFileSync(file, 'latin1'));
    case '.odt':
      return odtToHtml(fs.readFileSync(file));
    case '.html':
    case '.htm':
      return sanitizeHtml(readText(file));
    case '.fdx':
      return fdxToHtml(readText(file));
    case '.fountain':
      return fountainToHtml(readText(file));
    default:
      return baseFileToHtml(file); // .docx, .txt, .md, .markdown
  }
}

// ---------------------------------------------------------------- import options
/**
 * "Convert imported text to the default formatting": drops fonts, sizes, colours, line spacing and
 * indents (inline styles, <font>, classes), keeping structure, emphasis, alignment and the
 * editor's own data-* attributes (footnotes, comments, script elements, revisions).
 */
function toDefaultFormatting(html) {
  return String(html || '')
    .replace(/<\/?font\b[^>]*>/gi, '')
    .replace(/<(\w+)([^>]*)>/g, (all, tag, attrs) => {
      if (!attrs.trim()) return all;
      let a = attrs.replace(/\s(?:class|face|size|color|bgcolor|lang)=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      a = a.replace(/\sstyle=("([^"]*)"|'([^']*)')/i, (_m, _q, d, s2) => {
        const keep = String(d ?? s2 ?? '')
          .split(';')
          .map((x) => x.trim())
          .filter((x) => /^text-align\s*:/i.test(x));
        return keep.length ? ` style="${keep.join('; ')}"` : '';
      });
      return `<${tag}${a}>`;
    })
    .replace(/<span>([\s\S]*?)<\/span>/g, '$1');
}

/**
 * Word footnotes as mammoth renders them (a [n] reference linking to a list at the end) become
 * the editor's own notes: 'inline' = inline footnotes at the reference, 'linked' = linked notes
 * anchored on the word before the reference. The end list is removed.
 */
function docxFootnotes(html, mode = 'inline') {
  const src = String(html || '');
  const notes = {};
  const listRe = /<li id="(?:footnote|endnote)-(\d+)">([\s\S]*?)<\/li>/g;
  let m;
  while ((m = listRe.exec(src))) {
    notes[m[1]] = m[2]
      .replace(/<a href="#(?:footnote|endnote)-ref-\d+">[\s\S]*?<\/a>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (!Object.keys(notes).length) return src;
  const attr = (t) => t.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  let out = src.replace(/<ol>(?:\s*<li id="(?:footnote|endnote)-\d+">[\s\S]*?<\/li>)+\s*<\/ol>/g, '');
  out = out.replace(/(\S*?)<sup><a href="#(?:footnote|endnote)-(\d+)" id="(?:footnote|endnote)-ref-\d+">\[?\d+\]?<\/a><\/sup>/g, (all, before, n) => {
    const text = notes[n];
    if (text === undefined) return all;
    if (mode === 'linked') {
      const word = /([^\s<>]+)$/.exec(before);
      if (word) return `${before.slice(0, before.length - word[1].length)}<span data-linked-footnote="${attr(text)}">${word[1]}</span>`;
    }
    return `${before}<span data-footnote="${attr(text)}" class="footnote"></span>`;
  });
  return out;
}

// ---------------------------------------------------------------- EPUB
/** EPUB: the spine's chapters in reading order, each under an <h1> with its title (so the import splits per chapter). */
async function epubToHtml(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const read = async (name) => {
    const f = zip.file(name) || zip.file(decodeURIComponent(name));
    return f ? f.async('string') : '';
  };
  const container = parseXml(await read('META-INF/container.xml'));
  const rootfile = findAll(container, 'rootfile')[0];
  if (!rootfile) throw new Error('EPUB invalid: lipsește META-INF/container.xml.');
  const opfPath = rootfile.attrs['full-path'];
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const opf = parseXml(await read(opfPath));
  const manifest = {};
  for (const it of findAll(opf, 'item')) manifest[it.attrs.id] = it.attrs;
  const navTitles = {};
  // Chapter titles from the EPUB 2 table of contents (toc.ncx), when there is one.
  const ncx = Object.values(manifest).find((x) => /ncx/.test(x['media-type'] || ''));
  if (ncx) {
    const toc = parseXml(await read(base + ncx.href));
    for (const np of findAll(toc, 'navPoint')) {
      const label = textOf(findAll(np, 'text')[0] || {}).trim();
      const src = (findAll(np, 'content')[0] || { attrs: {} }).attrs.src || '';
      const file = src.split('#')[0];
      if (label && file && !navTitles[file]) navTitles[file] = label;
    }
  }
  const out = [];
  for (const ref of findAll(opf, 'itemref')) {
    const item = manifest[ref.attrs.idref];
    if (!item || !/html/.test(item['media-type'] || '')) continue;
    const raw = await read(base + item.href);
    const body = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(raw) || [, raw])[1];
    let html = sanitizeHtml(body);
    if (!html.replace(/<[^>]+>/g, '').trim()) continue;
    let title = navTitles[item.href];
    const h = /^<h[1-3]>([\s\S]*?)<\/h[1-3]>/.exec(html);
    if (h) {
      title = title || h[1].replace(/<[^>]+>/g, '').trim();
      html = html.slice(h[0].length);
    }
    out.push(`<h1>${escapeHtml(title || `Capitolul ${out.length + 1}`)}</h1>${html}`);
  }
  return out.join('');
}

// ---------------------------------------------------------------- folder import
/**
 * A folder from disk with its structure: sub-folders become binder folders, text files documents,
 * other files media. Hidden files are skipped; at most `limit` files are read.
 * Returns [{title, folder: true, children} | {title, html, file} | {title, mediaFile}] sorted by name.
 */
async function importFolder(root, options = {}) {
  const limit = options.limit || 2000;
  let count = 0;
  const walk = async (dir) => {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.') && !/^(Thumbs\.db|desktop\.ini)$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'ro', { numeric: true }));
    const out = [];
    for (const e of entries) {
      if (count >= limit) break;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) out.push({ title: e.name, folder: true, children: await walk(abs) });
      else if (e.isFile()) {
        count++;
        const title = e.name.replace(/\.[^.]+$/, '');
        if (classifyFile(abs) === 'text') {
          try {
            out.push({ title, html: await fileToHtml(abs, options), file: abs });
          } catch (err) {
            out.push({ title, html: `<p>${escapeHtml(`Nu s-a putut citi ${e.name}: ${err.message}`)}</p>`, file: abs });
          }
        } else if (MEDIA_EXTS.includes(path.extname(e.name).slice(1).toLowerCase())) out.push({ title, mediaFile: abs });
      }
    }
    return out;
  };
  return { title: path.basename(root), folder: true, children: await walk(root) };
}

function classifyFile(file) {
  return TEXT_EXTS.includes(path.extname(String(file)).toLowerCase()) ? 'text' : 'media';
}

// ---------------------------------------------------------------- OPML
// options.noteTo: 'synopsis' (default) or 'text' — where the outline's note goes.
function importOpml(xml, options = {}) {
  const doc = parseXml(String(xml));
  const body = findAll(doc, 'body')[0];
  if (!body) throw new Error('Fișier OPML invalid: lipsește <body>.');
  const conv = (o) => {
    const kids = elems(o, 'outline');
    const childText = (o.children || []).filter((c) => c.text !== undefined).map((c) => c.text).join('').trim();
    const node = { title: o.attrs.text || o.attrs.title || 'Fără titlu', synopsis: o.attrs._note !== undefined ? o.attrs._note : childText, children: kids.map(conv) };
    if (o.attrs._label) node.label = o.attrs._label;
    if (o.attrs._status) node.status = o.attrs._status;
    if (options.noteTo === 'text' && node.synopsis) {
      node.html = String(node.synopsis)
        .split(/\n{2,}|\r\n\r\n/)
        .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('');
      node.synopsis = '';
    }
    return node;
  };
  return elems(body, 'outline').map(conv);
}

// ---------------------------------------------------------------- web page
function webPageToHtml(html, baseUrl) {
  const src = String(html || '');
  const pick = (re) => (re.exec(src) || [])[1];
  const title =
    decodeXml((pick(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || pick(/<title[^>]*>([\s\S]*?)<\/title>/i) || '').replace(/\s+/g, ' ').trim()) ||
    baseUrl ||
    'Pagină web';
  let main = pick(/<article\b[^>]*>([\s\S]*?)<\/article>/i) || pick(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || pick(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || src;
  main = main.replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1\s*>/gi, '');
  const body = sanitizeHtml(main, baseUrl);
  const source = baseUrl ? `<p><em>Sursa: <a href="${escapeHtml(safeUrl(baseUrl))}">${escapeHtml(baseUrl)}</a></em></p>` : '';
  return { title, html: `<h1>${escapeHtml(title)}</h1>${source}${body}` };
}

// ---------------------------------------------------------------- web page images offline
const IMAGE_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp', 'image/avif': 'avif' };

function imageExt(mime, url) {
  const m = String(mime || '').split(';')[0].trim().toLowerCase();
  if (IMAGE_EXT[m]) return IMAGE_EXT[m];
  const fromUrl = /\.([a-z0-9]{2,4})(?:[?#]|$)/i.exec(String(url || ''));
  return fromUrl && /^(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(fromUrl[1]) ? fromUrl[1].toLowerCase().replace('jpeg', 'jpg') : null;
}

const IMAGE_LIMITS = { maxImages: 200, maxBytes: 10 * 1024 * 1024, timeoutMs: 20000, totalMs: 120000, totalBytes: 100 * 1024 * 1024 };

/**
 * Reads a fetch Response body into a Buffer, giving up (null) past `maxBytes` without buffering the rest.
 * Accepts WHATWG streams (Electron/Node fetch) and plain arrayBuffer() responses (test fakes).
 */
async function readCapped(res, maxBytes) {
  const declared = Number(res.headers && res.headers.get && res.headers.get('content-length'));
  if (declared > maxBytes) return null;
  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > maxBytes ? null : buf;
}

/**
 * fetchImage for localizeImages over a fetch implementation: http(s) only, image/* content-type only,
 * body capped at maxBytes. Resolves null for anything unusable.
 */
function makeImageFetcher(fetchImpl = globalThis.fetch, { maxBytes = IMAGE_LIMITS.maxBytes } = {}) {
  return async (url, { signal } = {}) => {
    const res = await fetchImpl(url, { redirect: 'follow', signal });
    if (!res || !res.ok) return null;
    const mime = String((res.headers && res.headers.get('content-type')) || '').split(';')[0].trim().toLowerCase();
    if (!mime.startsWith('image/')) return null;
    const data = await readCapped(res, maxBytes);
    return data ? { data, mime } : null;
  };
}

/**
 * Downloads the http(s) images of an imported page so it works offline.
 * fetchImage(url, {signal}) -> Promise<{data: Buffer, mime} | null>; saveMedia({data, mime, ext, name, url}) -> {id, file, mime, name}.
 * Each distinct URL is downloaded once and stored once in the project's media (returned in `media`, e.g. for
 * Research); its src becomes a data: URI (how documents embed images, so the editor and Compile need nothing
 * else) with data-media="<media file>" kept as reference. Only image/* responses are kept. Images that fail,
 * time out, are too big or exceed the caps keep their remote src (and alt). data: images are already inline.
 */
async function localizeImages(html, { fetchImage, saveMedia, ...limits } = {}) {
  const { maxImages, maxBytes, timeoutMs, totalMs, totalBytes } = { ...IMAGE_LIMITS, ...limits };
  const src = String(html || '');
  const urls = [];
  src.replace(/<img\b[^>]*\bsrc="(https?:[^"]+)"[^>]*>/gi, (_m, u) => {
    const url = decodeXml(u);
    if (!urls.includes(url)) urls.push(url);
    return _m;
  });
  const done = new Map();
  const media = [];
  const deadline = Date.now() + totalMs;
  let spent = 0;
  for (const url of urls.slice(0, maxImages)) {
    const left = deadline - Date.now();
    if (left <= 0 || spent >= totalBytes) break;
    const ctl = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_r, reject) => {
        timer = setTimeout(() => {
          ctl.abort();
          reject(new Error('timeout'));
        }, Math.min(timeoutMs, left));
      });
      const res = await Promise.race([fetchImage(url, { signal: ctl.signal }), timeout]);
      if (!res || !res.data || !res.data.length || res.data.length > maxBytes || spent + res.data.length > totalBytes) continue;
      const mimeIn = String(res.mime || '').split(';')[0].trim().toLowerCase();
      if (!mimeIn.startsWith('image/')) continue;
      const ext = imageExt(mimeIn, url);
      if (!ext) continue;
      const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      let base = '';
      try {
        base = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
      } catch {
        /* malformed %-escape: use the default name */
      }
      const name = (base || `imagine.${ext}`).slice(0, 80);
      const saved = await saveMedia({ data: res.data, mime, ext, name, url });
      spent += res.data.length;
      media.push({ ...saved, url });
      done.set(url, { uri: `data:${mime};base64,${Buffer.from(res.data).toString('base64')}`, file: saved.file });
    } catch {
      /* keep the remote image */
    } finally {
      clearTimeout(timer);
    }
  }
  const out = src.replace(/<img\b([^>]*?)\bsrc="(https?:[^"]+)"([^>]*)>/gi, (all, pre, u, post) => {
    const hit = done.get(decodeXml(u));
    return hit ? `<img${pre}src="${hit.uri}" data-media="${escapeHtml(hit.file)}"${post}>` : all;
  });
  return { html: out, media };
}

/**
 * File > Import > Web Page: downloads `url`, keeps its readable content (sanitized) and, when `saveMedia`
 * is given, saves its images offline (see localizeImages). `fetch` is injectable for tests.
 */
// "Convert to text": the page's blocks become plain paragraphs (no images, links or formatting).
function webHtmlToText(html) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const decode = (t) =>
    t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
  const text = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|blockquote|div|pre|tr|figcaption)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  const paras = decode(text)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return paras.length ? paras.map((p) => `<p>${esc(p)}</p>`).join('') : '<p></p>';
}

// options.asText: plain paragraphs instead of the formatted page (images are then not downloaded).
async function importWebPage(url, { fetch: fetchImpl = globalThis.fetch, saveMedia, limits = {}, asText = false } = {}) {
  let u;
  try {
    u = new URL(String(url));
  } catch {
    throw new Error('Adresă web invalidă.');
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Sunt acceptate doar adrese http(s).');
  const r = await fetchImpl(u.href, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Pagina nu a putut fi descărcată (HTTP ${r.status}).`);
  const page = webPageToHtml(await r.text(), r.url || u.href);
  if (asText) return saveMedia ? { title: page.title, html: webHtmlToText(page.html), media: [] } : { ...page, html: webHtmlToText(page.html) };
  if (!saveMedia) return page;
  const fetchImage = makeImageFetcher(fetchImpl, { maxBytes: limits.maxBytes });
  const local = await localizeImages(page.html, { fetchImage, saveMedia, ...limits });
  return { title: page.title, html: local.html, media: local.media };
}

module.exports = {
  MEDIA_EXTS,
  toDefaultFormatting,
  docxFootnotes,
  epubToHtml,
  importFolder,
  localizeImages,
  makeImageFetcher,
  importWebPage,
  bestSrcset,
  imageExt,
  TEXT_EXTS,
  fileToHtml,
  markdownToHtml,
  odtToHtml,
  sanitizeHtml,
  fdxToHtml,
  fountainToHtml,
  classifyFile,
  importOpml,
  webPageToHtml,
  webHtmlToText,
  parseXml,
};
