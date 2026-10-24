'use strict';
// importers: DOCX, TXT, MD, RTF, ODT, HTML, FDX, Fountain, OPML, web pages.
// Pure Node (no Electron): used by electron/ioHandlers.cjs and by tests.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { fileToHtml: baseFileToHtml, markdownToHtml, readText } = require('./docxImport.cjs');
const { rtfToHtml, escapeHtml } = require('./rtf.cjs');

const TEXT_EXTS = ['.docx', '.txt', '.md', '.markdown', '.rtf', '.odt', '.html', '.htm', '.fdx', '.fountain'];

// ---------------------------------------------------------------- minimal XML parser
function decodeXml(s) {
  return String(s)
    // An out-of-range reference (&#99999999;) is kept as text: String.fromCodePoint would throw
    // and abort the whole import over one bad character.
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (ref, h, d) => {
      const cp = h ? parseInt(h, 16) : Number(d);
      return cp <= 0x10ffff ? String.fromCodePoint(cp) : ref;
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
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
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([^\s>/]+)([^>]*?)(\/?)>|([^<]+)/gi;
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
async function fileToHtml(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
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

function classifyFile(file) {
  return TEXT_EXTS.includes(path.extname(String(file)).toLowerCase()) ? 'text' : 'media';
}

// ---------------------------------------------------------------- OPML
function importOpml(xml) {
  const doc = parseXml(String(xml));
  const body = findAll(doc, 'body')[0];
  if (!body) throw new Error('Fișier OPML invalid: lipsește <body>.');
  const conv = (o) => {
    const kids = elems(o, 'outline');
    const childText = (o.children || []).filter((c) => c.text !== undefined).map((c) => c.text).join('').trim();
    const node = { title: o.attrs.text || o.attrs.title || 'Fără titlu', synopsis: o.attrs._note !== undefined ? o.attrs._note : childText, children: kids.map(conv) };
    if (o.attrs._label) node.label = o.attrs._label;
    if (o.attrs._status) node.status = o.attrs._status;
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
async function importWebPage(url, { fetch: fetchImpl = globalThis.fetch, saveMedia, limits = {} } = {}) {
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
  if (!saveMedia) return page;
  const fetchImage = makeImageFetcher(fetchImpl, { maxBytes: limits.maxBytes });
  const local = await localizeImages(page.html, { fetchImage, saveMedia, ...limits });
  return { title: page.title, html: local.html, media: local.media };
}

module.exports = {
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
  parseXml,
};
