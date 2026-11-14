'use strict';
// Print formats for Page Setup (File > Page Setup → Format), P1 #30 (Scrivener §26.1.1–26.3):
//   manuscript  — the Compile HTML pipeline (unchanged, electron/ioHandlers.cjs);
//   indexCards  — the binder's text documents as index cards: title on top, synopsis (or the
//                 opening of the text) as the card body, label color on the top edge, a grid of
//                 2 columns × N rows per page with fixed card size and overflow hidden (the body
//                 is cut at what fits), dashed borders as cutting guides;
//   outline     — the binder as an indented hierarchical list: bold title, synopsis underneath,
//                 word counts (folders show the sum of their documents).
// Pure module: tree + readDoc + options → a complete HTML document with inline CSS (print runs
// headless). The page box, margins and running header/footer come from the Page Setup through
// printSetup.applyToHtml, so all three formats share one print pipeline.
// One rule everywhere: what does not compile does not print (includeInCompile=false is skipped,
// like the Compile pipeline behind Print Preview); media documents are not cards/outline rows.

const store = require('./store.cjs');
const { escapeHtml: esc } = require('./rtf.cjs');

const FORMATS = ['manuscript', 'indexCards', 'outline'];

const draftRoot = (project) => (project.tree || []).find((n) => n.root === 'draft') || null;
// Only real colors reach the inline style (a stray "red;…" can't inject other declarations).
const HEX = /^#[0-9a-f]{3,8}$/i;
const labelColor = (project, name) => {
  const l = (project.labels || []).find((x) => x.name === name);
  const c = (l && l.color) || '';
  return HEX.test(c) ? c : '';
};
// Deterministic thousands separator (ro): 1200 → "1.200".
const fmtWords = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const synopsisFallback = (readDoc, id, max = 280) => {
  const text = store.htmlToText(readDoc(id) || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  // cut on code points, never inside a surrogate pair
  return `${Array.from(text).slice(0, max).join('').trimEnd()}…`;
};
const sumWords = (readDoc, n) =>
  n.type === 'text' ? store.wordCount(readDoc(n.id) || '') : (n.children || []).reduce((a, c) => a + sumWords(readDoc, c), 0);
// A wanted descendant, for pruning dead branches when printing a selection.
const wantedIn = (want, n) => !want || want.has(n.id) || (n.children || []).some((c) => wantedIn(want, c));
const skippable = (n) => n.type === 'file' || n.includeInCompile === false;

// Text documents of the Draft, in binder order → [{id, title, body, color, depth}].
// opts.ids: selection — a folder id expands to all its text descendants, a text id is one card.
function collectCards(project, readDoc, opts = {}) {
  const root = draftRoot(project);
  if (!root) return [];
  const want = Array.isArray(opts.ids) && opts.ids.length ? new Set(opts.ids) : null;
  const cards = [];
  const visit = (nodes, depth, all) => {
    for (const n of nodes) {
      if (skippable(n)) continue;
      const hit = all || !want || want.has(n.id);
      if (hit && n.type === 'text') {
        const synopsis = String(n.synopsis || '').trim();
        cards.push({ id: n.id, title: n.title || '', body: synopsis || synopsisFallback(readDoc, n.id), color: labelColor(project, n.label), depth });
      }
      if (n.children && n.children.length && (hit || wantedIn(want, n))) visit(n.children, depth + 1, all || Boolean(want && want.has(n.id)));
    }
  };
  visit(root.children || [], 0, false);
  return cards;
}

// The Draft as rows → [{id, title, synopsis, depth, kind, words}]; folders keep their children.
// opts.ids: the selection keeps its ancestors as context; a selected folder shows the whole
// subtree. words: text = own word count, folder = sum of descendants (counts=false → undefined).
function collectOutline(project, readDoc, opts = {}) {
  const root = draftRoot(project);
  if (!root) return [];
  const counts = opts.counts !== false;
  const want = Array.isArray(opts.ids) && opts.ids.length ? new Set(opts.ids) : null;
  const rows = [];
  const visit = (nodes, depth, all) => {
    for (const n of nodes) {
      if (skippable(n)) continue;
      const hit = all || !want || want.has(n.id) || (n.children || []).some((c) => wantedIn(want, c));
      if (!hit) continue;
      rows.push({
        id: n.id,
        title: n.title || '',
        synopsis: String(n.synopsis || '').trim(),
        depth,
        kind: n.type,
        words: counts ? sumWords(readDoc, n) : undefined,
      });
      if (n.children && n.children.length) visit(n.children, depth + 1, all || Boolean(want && want.has(n.id)));
    }
  };
  visit(root.children || [], 0, false);
  return rows;
}

// --- index cards ---------------------------------------------------------------------------

function indexCardsHtml(project, readDoc, opts = {}) {
  const setup = opts.setup || {};
  const cutLines = opts.cutLines !== false;
  const cardH = Math.max(2, Math.min(40, Number(setup.cardHeightCm) || 15));
  const cardW = Math.max(2, Math.min(40, Number(setup.cardWidthCm) || 10));
  const cards = collectCards(project, readDoc, opts);
  const items = cards
    .map((c) => {
      const color = c.color ? `border-top:4px solid ${esc(c.color)};` : '';
      return `<section class="card" style="${color}" data-id="${esc(c.id)}">` +
        `<h2 class="card-title">${esc(c.title)}</h2>` +
        `<div class="card-body">${esc(c.body)}</div>` +
        `</section>`;
    })
    .join('\n');
  const css = `
.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm 8mm;align-content:start}
.card{box-sizing:border-box;height:${cardH}cm;width:min(100%,${cardW}cm);overflow:hidden;break-inside:avoid;page-break-inside:avoid;border:1px ${cutLines ? 'dashed' : 'solid'} #9a9a9a;padding:.5cm .6cm;background:#fffdf5}
.card-title{font:bold 13pt Georgia,serif;margin:0 0 .35em;text-indent:0;hyphens:none;-webkit-hyphens:none}
.card-body{font:10.5pt Georgia,serif;line-height:1.4;white-space:pre-wrap;overflow-wrap:break-word}`;
  return fullDoc(project, 'index-cards', 'Fișe index', css, `<main class="cards">\n${items}\n</main>`);
}

// --- outline -------------------------------------------------------------------------------

function outlineHtml(project, readDoc, opts = {}) {
  const rows = collectOutline(project, readDoc, opts);
  const li = (r) => {
    const syn = r.synopsis ? `<div class="ol-syn">${esc(r.synopsis)}</div>` : '';
    const words = r.words ? `<span class="ol-words">${fmtWords(r.words)} cuvinte</span>` : '';
    const sub = r.children ? `<ul>\n${r.children.map(li).join('\n')}\n</ul>` : '';
    return `<li class="ol-item ol-${esc(r.kind)}"><span class="ol-title">${esc(r.title)}</span>${words}${syn}${sub}</li>`;
  };
  const tree = rowsToTree(rows);
  const css = `
.print-outline{font:11pt Georgia,serif;line-height:1.45}
.print-outline ul{list-style:none;margin:0;padding-left:1.1cm}
.print-outline li{text-indent:0;margin:.45em 0;break-inside:avoid;page-break-inside:avoid}
.ol-title{font-weight:bold}
.ol-folder .ol-title{font-variant:small-caps;letter-spacing:.02em}
.ol-words{float:right;font:9pt Georgia,serif;color:#555;margin-left:.5em}
.ol-syn{font:10pt Georgia,serif;color:#333;margin:.1em 0 .3em;white-space:pre-wrap}
.ol-item ul{margin-top:.15em}`;
  return fullDoc(project, 'outline', 'Schiță', css, `<div class="print-outline">\n<ul>\n${tree.map(li).join('\n')}\n</ul>\n</div>`);
}

// Flat rows (depth-first) → nested {…, children}.
function rowsToTree(rows) {
  const root = [];
  const stack = [{ depth: -1, children: root }];
  for (const r of rows) {
    while (stack.length && stack[stack.length - 1].depth >= r.depth) stack.pop();
    const node = { ...r };
    stack[stack.length - 1].children.push(Object.assign(node, { children: [] }));
    stack.push({ depth: r.depth, children: node.children });
  }
  return root;
}

// --- dispatch ------------------------------------------------------------------------------

/** setup.format → complete HTML, or null for 'manuscript' / unknown (the old pipeline). */
function formatHtml(setup, project, readDoc, options = {}) {
  const format = setup && FORMATS.includes(setup.format) ? setup.format : 'manuscript';
  if (format === 'indexCards') return indexCardsHtml(project, readDoc, { ...options, setup });
  if (format === 'outline') return outlineHtml(project, readDoc, { ...options, setup });
  return null;
}

function fullDoc(project, format, label, css, body) {
  const title = esc(`${(project && project.title) || 'Pneuma Sofer'} — ${label}`);
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${title}</title>
<style>${css}
body{margin:0}</style></head><body data-format="${format}">
${body}
</body></html>`;
}

module.exports = { FORMATS, collectCards, collectOutline, indexCardsHtml, outlineHtml, formatHtml };
