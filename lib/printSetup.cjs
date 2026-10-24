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
};

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
    mirrored: false,
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
  return `${page}\nbody{font-family:"${s.fontFamily}",Georgia,serif;font-size:${s.fontSizePt}pt;line-height:${s.lineSpacing};margin:0}img{max-width:100%}`;
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
  };
}

/** Options for webContents.print (pageSize in microns, orientation already applied). */
function printOptions(setup) {
  const s = normalizePageSetup(setup);
  const p = PAPER[s.size] || { widthMm: s.widthCm * 10, heightMm: s.heightCm * 10 };
  let w = Math.round(p.widthMm * 1000);
  let h = Math.round(p.heightMm * 1000);
  if ((s.orientation === 'landscape') !== w > h) [w, h] = [h, w];
  return { silent: false, printBackground: false, landscape: false, pageSize: { width: w, height: h } };
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
