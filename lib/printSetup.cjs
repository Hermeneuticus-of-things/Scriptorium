'use strict';
// Page Setup (File > Page Setup) for printing and Print Preview, independent of Compile formats.
// Stored by the main process in userData/page-setup.json:
//   { size: 'A4'|'A5'|'Letter'|'Legal', orientation: 'portrait'|'landscape', margins: {top, bottom, left, right} (cm),
//     fontFamily, fontSizePt, lineSpacing }

const PAPER = {
  A4: { widthMm: 210, heightMm: 297 },
  A5: { widthMm: 148, heightMm: 210 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
  Legal: { widthMm: 215.9, heightMm: 355.6 },
};

const DEFAULT_PAGE_SETUP = {
  size: 'A4',
  orientation: 'portrait',
  margins: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
  fontFamily: 'Georgia',
  fontSizePt: 12,
  lineSpacing: 1.5,
};

const clampNum = (v, min, max, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

function normalizePageSetup(s = {}) {
  const d = DEFAULT_PAGE_SETUP;
  const m = (s && s.margins) || {};
  return {
    size: PAPER[s.size] ? s.size : d.size,
    orientation: s.orientation === 'landscape' ? 'landscape' : 'portrait',
    margins: {
      top: clampNum(m.top, 0, 10, d.margins.top),
      bottom: clampNum(m.bottom, 0, 10, d.margins.bottom),
      left: clampNum(m.left, 0, 10, d.margins.left),
      right: clampNum(m.right, 0, 10, d.margins.right),
    },
    fontFamily: String((s && s.fontFamily) || d.fontFamily).replace(/[^\w\s-]/g, '').slice(0, 60) || d.fontFamily,
    fontSizePt: clampNum(s.fontSizePt, 6, 48, d.fontSizePt),
    lineSpacing: clampNum(s.lineSpacing, 1, 3, d.lineSpacing),
  };
}

/** CSS for printing a document with the page setup. */
function printCss(setup) {
  const s = normalizePageSetup(setup);
  const m = s.margins;
  return `@page{size:${s.size} ${s.orientation};margin:${m.top}cm ${m.right}cm ${m.bottom}cm ${m.left}cm}body{font-family:"${s.fontFamily}",Georgia,serif;font-size:${s.fontSizePt}pt;line-height:${s.lineSpacing};margin:0}img{max-width:100%}`;
}

/** Options for webContents.printToPDF (Print Preview renders a PDF). Margins in inches. */
function pdfPrintOptions(setup) {
  const s = normalizePageSetup(setup);
  const cm = (v) => Math.round((v / 2.54) * 1000) / 1000;
  return {
    pageSize: s.size,
    landscape: s.orientation === 'landscape',
    printBackground: false,
    preferCSSPageSize: true,
    margins: { top: cm(s.margins.top), bottom: cm(s.margins.bottom), left: cm(s.margins.left), right: cm(s.margins.right) },
  };
}

/** Options for webContents.print (pageSize in microns). */
function printOptions(setup) {
  const s = normalizePageSetup(setup);
  const p = PAPER[s.size];
  const w = Math.round(p.widthMm * 1000);
  const h = Math.round(p.heightMm * 1000);
  return { silent: false, printBackground: false, landscape: s.orientation === 'landscape', pageSize: { width: w, height: h } };
}

/** Full HTML page for printing / previewing a document. */
function printPage(html, title, setup) {
  const t = String(title || 'Scribner').replace(/[<&]/g, '');
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${t}</title><style>${printCss(setup)}</style></head><body>${html || ''}</body></html>`;
}

module.exports = { PAPER, DEFAULT_PAGE_SETUP, normalizePageSetup, printCss, pdfPrintOptions, printOptions, printPage };
