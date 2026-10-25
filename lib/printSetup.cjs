'use strict';
// Page Setup (File > Page Setup) for Print and Print Preview, independent of Compile formats.
// Stored per project in project.pageSetup (the main process keeps the last one in
// userData/page-setup.json as the default for projects that have none):
//   { size: 'A4'|'A5'|'Letter'|'Legal'|'6x9'|'custom', widthCm, heightCm (custom),
//     orientation: 'portrait'|'landscape', margins: {top, bottom, left, right} (cm),
//     header: {left, center, right}, footer: {left, center, right} (Compile placeholders: <$p>,
//     <$projecttitle>, <$author>, …), differentFirstPage, fontFamily, fontSizePt, lineSpacing }
// The page box and running header/footer CSS come from lib/compile.cjs (pageCss), so Print,
// Print Preview and Compile > PDF share one pipeline.

const PAPER = {
  A4: { widthMm: 210, heightMm: 297 },
  A5: { widthMm: 148, heightMm: 210 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
  Legal: { widthMm: 215.9, heightMm: 355.6 },
  '6x9': { widthMm: 152.4, heightMm: 228.6 },
  custom: null,
};

const DEFAULT_PAGE_SETUP = {
  size: 'A4',
  widthCm: 21,
  heightCm: 29.7,
  orientation: 'portrait',
  margins: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
  header: { left: '', center: '', right: '' },
  footer: { left: '', center: '<$p>', right: '' },
  differentFirstPage: false,
  fontFamily: 'Georgia',
  fontSizePt: 12,
  lineSpacing: 1.5,
  // Printing (not Compile): scale, mirrored margins, header/footer font and distance from the edge.
  scale: 100,
  mirrorMargins: false,
  hfFontFamily: '',
  hfFontSizePt: 10,
  headerDistanceCm: 0,
  footerDistanceCm: 0,
  printer: '',
  copies: 1,
  // What a print of each view contains (File > Page Setup > Print settings per view).
  views: {
    document: { titles: true, synopsis: false, notes: false, metadata: false },
    cards: { layout: 'grid', perPage: 4, borders: true, labelColors: true, cutLines: true, titles: true, synopsis: true },
    outline: { columns: ['title', 'synopsis', 'label', 'status', 'words'], indent: true },
  },
};

const CARD_LAYOUTS = ['grid', '3x5', '4x6'];
const OUTLINE_COLUMNS = ['title', 'synopsis', 'label', 'status', 'keywords', 'words', 'target', 'modified', 'created', 'sectionType', 'includeInCompile'];

const clampNum = (v, min, max, def) => {
  const n = Number(v);
  return v !== '' && v != null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const hfText = (v) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, 200);
const normHf = (hf, def) => {
  const x = hf && typeof hf === 'object' ? hf : def;
  return { left: hfText(x.left), center: hfText(x.center), right: hfText(x.right) };
};

// Margins that leave less than this much text area (cm) are scaled down proportionally:
// Chromium refuses to print a page whose content area is empty.
const MIN_TEXT_CM = 2;
function fitMargins(a, b, sizeCm) {
  const room = Math.max(0, sizeCm - MIN_TEXT_CM);
  if (a + b <= room) return [a, b];
  const k = room / (a + b);
  return [r3(a * k), r3(b * k)];
}

function normalizePageSetup(s = {}) {
  const out = normalizeRaw(s);
  const p = PAPER[out.size];
  let w = p ? p.widthMm / 10 : out.widthCm;
  let h = p ? p.heightMm / 10 : out.heightCm;
  if ((out.orientation === 'landscape') !== w > h) [w, h] = [h, w];
  const m = out.margins;
  [m.left, m.right] = fitMargins(m.left, m.right, w);
  [m.top, m.bottom] = fitMargins(m.top, m.bottom, h);
  return out;
}

function normalizeRaw(s = {}) {
  const d = DEFAULT_PAGE_SETUP;
  s = s && typeof s === 'object' ? s : {};
  const m = s.margins || {};
  return {
    size: Object.prototype.hasOwnProperty.call(PAPER, s.size) ? s.size : d.size,
    widthCm: clampNum(s.widthCm, 5, 100, d.widthCm),
    heightCm: clampNum(s.heightCm, 5, 100, d.heightCm),
    orientation: s.orientation === 'landscape' ? 'landscape' : 'portrait',
    margins: {
      top: clampNum(m.top, 0, 10, d.margins.top),
      bottom: clampNum(m.bottom, 0, 10, d.margins.bottom),
      left: clampNum(m.left, 0, 10, d.margins.left),
      right: clampNum(m.right, 0, 10, d.margins.right),
    },
    header: normHf(s.header, d.header),
    footer: normHf(s.footer, d.footer),
    differentFirstPage: Boolean(s.differentFirstPage),
    fontFamily: String(s.fontFamily || d.fontFamily).replace(/[^\w\s-]/g, '').slice(0, 60) || d.fontFamily,
    fontSizePt: clampNum(s.fontSizePt, 6, 48, d.fontSizePt),
    lineSpacing: clampNum(s.lineSpacing, 1, 3, d.lineSpacing),
    scale: clampNum(s.scale, 10, 200, d.scale),
    mirrorMargins: Boolean(s.mirrorMargins),
    hfFontFamily: String(s.hfFontFamily || '').replace(/[^\w\s-]/g, '').slice(0, 60),
    hfFontSizePt: clampNum(s.hfFontSizePt, 6, 36, d.hfFontSizePt),
    headerDistanceCm: clampNum(s.headerDistanceCm, 0, 5, d.headerDistanceCm),
    footerDistanceCm: clampNum(s.footerDistanceCm, 0, 5, d.footerDistanceCm),
    printer: String(s.printer || '').slice(0, 200),
    copies: Math.round(clampNum(s.copies, 1, 99, 1)),
    views: normalizeViews(s.views),
  };
}

function normalizeViews(v = {}) {
  const d = DEFAULT_PAGE_SETUP.views;
  v = v && typeof v === 'object' ? v : {};
  const doc = v.document || {};
  const cards = v.cards || {};
  const outline = v.outline || {};
  const bool = (x, def) => (x === undefined ? def : Boolean(x));
  const cols = Array.isArray(outline.columns) ? outline.columns.filter((c) => OUTLINE_COLUMNS.includes(c)) : d.outline.columns;
  return {
    document: { titles: bool(doc.titles, true), synopsis: bool(doc.synopsis, false), notes: bool(doc.notes, false), metadata: bool(doc.metadata, false) },
    cards: {
      layout: CARD_LAYOUTS.includes(cards.layout) ? cards.layout : d.cards.layout,
      perPage: Math.round(clampNum(cards.perPage, 1, 12, d.cards.perPage)),
      borders: bool(cards.borders, true),
      labelColors: bool(cards.labelColors, true),
      cutLines: bool(cards.cutLines, true),
      titles: bool(cards.titles, true),
      synopsis: bool(cards.synopsis, true),
    },
    outline: { columns: cols.length ? [...new Set(cols)] : ['title'], indent: bool(outline.indent, true) },
  };
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const cmToIn = (v) => r3(v / 2.54);

/** Paper size in inches after orientation is applied. */
function paperInches(setup) {
  const s = normalizePageSetup(setup);
  const p = PAPER[s.size] || { widthMm: s.widthCm * 10, heightMm: s.heightCm * 10 };
  let w = r3(p.widthMm / 25.4);
  let h = r3(p.heightMm / 25.4);
  const wantLandscape = s.orientation === 'landscape';
  if (wantLandscape !== w > h) [w, h] = [h, w];
  return { widthIn: w, heightIn: h };
}

/** Page Setup → the `page` object of a Compile format (inches), as used by compile.pageCss. */
function toCompilePage(setup) {
  const s = normalizePageSetup(setup);
  const { widthIn, heightIn } = paperInches(s);
  return {
    size: 'custom',
    widthIn,
    heightIn,
    mirrored: s.mirrorMargins,
    differentFirstPage: s.differentFirstPage,
    margins: { top: cmToIn(s.margins.top), bottom: cmToIn(s.margins.bottom), inner: cmToIn(s.margins.left), outer: cmToIn(s.margins.right) },
    header: { ...s.header },
    footer: { ...s.footer },
  };
}

/** CSS for printing with the page setup: page box + running header/footer from Compile, plus body text. */
function printCss(setup, project = {}, wc = 0) {
  const s = normalizePageSetup(setup);
  const compile = require('./compile.cjs');
  const page = compile.pageCss(toCompilePage(s), project || {}, wc, []);
  return `${page}${hfCss(s)}\nbody{font-family:"${s.fontFamily}",Georgia,serif;font-size:${s.fontSizePt}pt;line-height:${s.lineSpacing};margin:0}img{max-width:100%}`;
}

/** Header / footer margin boxes: own font, size and distance from the page edge. */
function hfCss(setup) {
  const s = setup;
  const font = `font-family:"${s.hfFontFamily || s.fontFamily}",Georgia,serif;font-size:${s.hfFontSizePt}pt`;
  const box = (edge, dist) =>
    ['left', 'center', 'right'].map((p) => `@${edge}-${p}{${font}${dist > 0 ? `;vertical-align:${edge};padding-${edge}:${dist}cm` : ''}}`).join('');
  return `\n@page{${box('top', s.headerDistanceCm)}${box('bottom', s.footerDistanceCm)}}`;
}

/** Options for webContents.printToPDF. Inches; the CSS @page size wins (preferCSSPageSize). */
function pdfPrintOptions(setup) {
  const pg = toCompilePage(setup);
  return {
    pageSize: { width: pg.widthIn, height: pg.heightIn },
    landscape: false,
    printBackground: false,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margins: { top: pg.margins.top, bottom: pg.margins.bottom, left: pg.margins.inner, right: pg.margins.outer },
    scale: Math.min(2, Math.max(0.1, normalizePageSetup(setup).scale / 100)),
  };
}

/** Options for webContents.print (pageSize in microns, orientation already applied). */
function printOptions(setup) {
  const s = normalizePageSetup(setup);
  const p = PAPER[s.size] || { widthMm: s.widthCm * 10, heightMm: s.heightCm * 10 };
  let w = Math.round(p.widthMm * 1000);
  let h = Math.round(p.heightMm * 1000);
  if ((s.orientation === 'landscape') !== w > h) [w, h] = [h, w];
  const out = { silent: false, printBackground: s.views.cards.labelColors, landscape: false, pageSize: { width: w, height: h }, scaleFactor: s.scale, copies: s.copies };
  if (s.printer) out.deviceName = s.printer;
  return out;
}

/** Full HTML page for printing a fragment of HTML. */
function printPage(html, title, setup, project = {}) {
  const t = String(title || 'Scribner').replace(/[<&]/g, '');
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${t}</title><style>${printCss(setup, project)}</style></head><body>${html || ''}</body></html>`;
}

/** Inserts the page setup CSS into a compiled HTML document (after its own styles, so it wins). */
function applyToHtml(html, setup, project = {}) {
  const css = `<style>${printCss(setup, project)}</style>`;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${css}</head>`) : css + html;
}

// --- per-view print bodies -------------------------------------------------------------
const escH = (x) =>
  String(x == null ? '' : x)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const labelColor = (project, name) => ((project && project.labels) || []).find((l) => l.name === name)?.color || '';

/**
 * Document view: each document with (optionally) its title, synopsis, metadata and notes.
 * items: [{node, depth, html, notes}] in binder order.
 */
function documentPrintHtml(items, project, view = {}) {
  const v = normalizeViews({ document: view }).document;
  return (items || [])
    .map(({ node, depth = 0, html = '', notes = '' }, i) => {
      const h = Math.min(6, depth + 1);
      const parts = [];
      if (v.titles) parts.push(`<h${h} class="print-title">${escH(node.title)}</h${h}>`);
      if (v.metadata) {
        const meta = [node.label && `<span class="print-label" style="border-color:${escH(labelColor(project, node.label)) || '#999'}">${escH(node.label)}</span>`, node.status && `<span>${escH(node.status)}</span>`, (node.keywords || []).length && `<span>${escH(node.keywords.join(', '))}</span>`].filter(Boolean);
        if (meta.length) parts.push(`<p class="print-meta">${meta.join(' · ')}</p>`);
      }
      if (v.synopsis && node.synopsis) parts.push(`<blockquote class="print-synopsis"><em>${escH(node.synopsis).replace(/\n/g, '<br>')}</em></blockquote>`);
      parts.push(html || '');
      if (v.notes && String(notes).replace(/<[^>]+>/g, '').trim()) parts.push(`<section class="print-notes"><h${Math.min(6, h + 1)}>Note</h${Math.min(6, h + 1)}>${notes}</section>`);
      return `<section class="print-doc"${i ? ' style="break-before:page"' : ''}>${parts.join('')}</section>`;
    })
    .join('\n');
}

// Index card sizes (inches, landscape like a real card).
const CARD_SIZES = { '3x5': { w: 5, h: 3 }, '4x6': { w: 6, h: 4 } };

/**
 * Corkboard view: the synopsis cards. layout 'grid' = perPage cards per page in a grid;
 * '3x5' / '4x6' = real index card size, as many as fit, with dashed cut lines.
 */
function cardsPrintHtml(nodes, project, view = {}) {
  const v = normalizeViews({ cards: view }).cards;
  const card = (n) => {
    const color = v.labelColors ? labelColor(project, n.label) : '';
    const style = [v.borders ? 'border:1px solid #444' : 'border:1px solid transparent', color ? `border-top:6px solid ${escH(color)}` : ''].filter(Boolean).join(';');
    return `<div class="card" style="${style}">${v.titles ? `<div class="card-title">${escH(n.title)}</div>` : ''}${v.synopsis ? `<div class="card-syn">${escH(n.synopsis || '').replace(/\n/g, '<br>')}</div>` : ''}</div>`;
  };
  const size = CARD_SIZES[v.layout];
  const cut = v.cutLines ? 'outline:1px dashed #888;outline-offset:0.12in;' : '';
  let css;
  if (size) {
    css = `.cards{display:flex;flex-wrap:wrap;gap:0.25in}.card{box-sizing:border-box;width:${size.w}in;height:${size.h}in;padding:0.2in;overflow:hidden;break-inside:avoid;${cut}}`;
  } else {
    const cols = v.perPage <= 1 ? 1 : v.perPage <= 4 ? 2 : 3;
    const rows = Math.ceil(v.perPage / cols);
    css = `.cards{display:grid;grid-template-columns:repeat(${cols},1fr);gap:0.2in}.card{box-sizing:border-box;height:calc((100vh - ${(rows - 1) * 0.2}in) / ${rows} - 1px);padding:0.15in;overflow:hidden;break-inside:avoid;${cut}}.card:nth-child(${v.perPage}n){break-after:page}`;
  }
  css += '.card-title{font-weight:bold;margin-bottom:0.08in;border-bottom:1px solid #ccc}.card-syn{font-size:0.9em}';
  return `<style>${css}</style><div class="cards">${(nodes || []).map(card).join('')}</div>`;
}

const COLUMN_TITLES = { title: 'Titlu', synopsis: 'Sinopsis', label: 'Etichetă', status: 'Stare', keywords: 'Cuvinte-cheie', words: 'Cuvinte', target: 'Țintă', modified: 'Modificat', created: 'Creat', sectionType: 'Tip de secțiune', includeInCompile: 'În compilare' };

/** Outline view: a table with the chosen columns. items: [{node, depth, words}]. */
function outlinePrintHtml(items, project, view = {}, titles = COLUMN_TITLES) {
  const v = normalizeViews({ outline: view }).outline;
  const cell = ({ node, depth = 0, words = 0 }, c) => {
    switch (c) {
      case 'title':
        return `<td style="padding-left:${v.indent ? depth * 1.2 : 0}em">${node.children ? '<strong>' : ''}${escH(node.title)}${node.children ? '</strong>' : ''}</td>`;
      case 'keywords':
        return `<td>${escH((node.keywords || []).join(', '))}</td>`;
      case 'words':
        return `<td class="num">${words || ''}</td>`;
      case 'target':
        return `<td class="num">${node.target || ''}</td>`;
      case 'includeInCompile':
        return `<td>${node.includeInCompile === false ? '' : '✓'}</td>`;
      case 'modified':
      case 'created':
        return `<td>${escH(String(node[c] || '').slice(0, 10))}</td>`;
      case 'label': {
        const color = labelColor(project, node.label);
        return `<td>${color ? `<span style="display:inline-block;width:0.8em;height:0.8em;border-radius:50%;background:${escH(color)}"></span> ` : ''}${escH(node.label || '')}</td>`;
      }
      default:
        return `<td>${escH(node[c] || '')}</td>`;
    }
  };
  const head = v.columns.map((c) => `<th>${escH(titles[c] || c)}</th>`).join('');
  const rows = (items || []).map((it) => `<tr>${v.columns.map((c) => cell(it, c)).join('')}</tr>`).join('');
  return `<style>table.outline{border-collapse:collapse;width:100%;font-size:0.9em}table.outline th,table.outline td{border:1px solid #bbb;padding:3px 6px;text-align:left;vertical-align:top}table.outline thead{display:table-header-group}table.outline tr{break-inside:avoid}td.num{text-align:right}</style><table class="outline"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** Nodes for printing, depth-first: the given ids (folders include their descendants) or the whole Draft. */
function printItems(project, ids) {
  const out = [];
  const want = Array.isArray(ids) && ids.length ? new Set(ids) : null;
  const visit = (nodes, depth, inside) => {
    for (const n of nodes || []) {
      if (n.root === 'trash') continue;
      const inc = inside || !want || want.has(n.id);
      if (inc && !n.root) out.push({ node: n, depth });
      visit(n.children, n.root ? depth : depth + (inc ? 1 : 0), inc && (inside || Boolean(want)));
    }
  };
  const tree = project.tree || [];
  visit(want ? tree : tree.filter((n) => n.root === 'draft'), 0, false);
  return out;
}

// --- PDF inspection (page count / size for the preview dialog and tests) ---
function pdfText(buf) {
  return Buffer.isBuffer(buf) ? buf.toString('latin1') : Buffer.from(buf).toString('latin1');
}
function pdfPageCount(buf) {
  const m = pdfText(buf).match(/\/Type\s*\/Page(?![s\w])/g);
  return m ? m.length : 0;
}
/** First page MediaBox in points: { width, height } or null. */
function pdfPageSize(buf) {
  const m = pdfText(buf).match(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/);
  if (!m) return null;
  return { width: Number(m[3]) - Number(m[1]), height: Number(m[4]) - Number(m[2]) };
}

module.exports = {
  CARD_LAYOUTS,
  CARD_SIZES,
  OUTLINE_COLUMNS,
  COLUMN_TITLES,
  normalizeViews,
  hfCss,
  documentPrintHtml,
  cardsPrintHtml,
  outlinePrintHtml,
  printItems,
  PAPER,
  DEFAULT_PAGE_SETUP,
  normalizePageSetup,
  paperInches,
  toCompilePage,
  printCss,
  pdfPrintOptions,
  printOptions,
  printPage,
  applyToHtml,
  pdfPageCount,
  pdfPageSize,
};
