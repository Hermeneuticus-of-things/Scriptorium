'use strict';
// Compile format designer: everything that decides how one section looks (section layouts),
// what goes between sections (separators), text options and transformations, style overrides,
// notes/comments handling, statistics and script settings. lib/compile.cjs calls these while
// building the document; the dialog (CompileLayoutEditor.jsx) edits the same fields.
// Own implementation.

// ---- section layouts ----------------------------------------------------------------------

// Fields added to a layout by the designer (besides showTitle, titlePrefix, titleSuffix,
// titleCase, titleAlign, pageBreakBefore, showText, separatorBefore of compileFormats.layout):
const LAYOUT_EXTRAS = {
  // title formatting
  titleFont: '', // '' = the format's heading font
  titleSizePt: 0, // 0 = automatic by level
  titleBold: null, // null = default
  titleItalic: false,
  titleSpaceBeforePt: null,
  titleSpaceAfterPt: null,
  // prefix on its own lines, with its own formatting ("Capitolul unu" centred, then the title)
  prefixFont: '',
  prefixSizePt: 0,
  prefixAlign: '', // '' = like the title
  prefixCase: 'normal', // normal | upper | smallcaps
  prefixItalic: false,
  // text
  firstWordsSmallCaps: 0, // first N words of the first paragraph in small caps
  dropCap: false, // large first letter
  firstIndent: 'inherit', // inherit | none | indent (first paragraph of the section)
  indentIn: null, // first-line indent of this layout's paragraphs (null = the format's)
  formatting: 'inherit', // inherit | override (compile font, no editor fonts) | editor (keep editor fonts/sizes)
  columns: 1, // text columns for this layout (HTML/PDF/EPUB; DOCX via continuous section)
  // pages
  pageBreakAfter: false,
  startRecto: false, // start on a right-hand (odd) page
  // extra content
  synopsis: 'none', // none | before | after
  notes: 'none', // none | before | after
  meta: [], // any of label, status, keywords
  metaPosition: 'before',
};

function layoutOf(l) {
  return { ...LAYOUT_EXTRAS, ...(l || {}), meta: Array.isArray(l && l.meta) ? l.meta : [] };
}

// ---- separators -----------------------------------------------------------------------------

// Decorative separators chosen from a list.
const DECORATIONS = {
  hash: '#',
  stars: '* * *',
  star: '*',
  asterism: '⁂',
  dinkus: '• • •',
  fleuron: '❦',
  tilde: '~',
  line: '',
};

// Separator kinds: none | space (blank line) | text | page | decorative | section (Word section
// break, new page) | oddPage (section break starting on an odd page).
function normalizeSep(sep) {
  if (!sep || typeof sep !== 'object') return null;
  const s = { kind: sep.kind || 'none', text: sep.text || '' };
  if (sep.align) s.align = sep.align;
  if (s.kind === 'decorative') {
    s.symbol = sep.symbol || 'stars';
    s.text = s.symbol === 'line' ? '' : DECORATIONS[s.symbol] ?? sep.text ?? '* * *';
    s.line = s.symbol === 'line';
  }
  return s;
}

const kindOf = (role) => (role === 'folder' ? 'folder' : 'text');

/**
 * The separator between two sections. Four rules like the classic designer — text→text,
 * folder→folder, folder→text, text→folder (format.separators.{textText,folderFolder,folderText,
 * textFolder}) — then per section type (separators.byType[type] = what goes BEFORE a section of
 * that type), falling back to the two older rules (same type / different type).
 */
function separatorBetween(format, prev, cur) {
  const S = format.separators || {};
  const byType = S.byType && S.byType[cur.type];
  if (byType && byType.kind) return normalizeSep(byType);
  const key = `${kindOf(prev.role)}${kindOf(cur.role) === 'folder' ? 'Folder' : 'Text'}`;
  const rule = { textText: S.textText, folderFolder: S.folderFolder, folderText: S.folderText, textFolder: S.textFolder }[key];
  if (rule && rule.kind && rule.kind !== 'inherit') return normalizeSep(rule);
  return normalizeSep(prev.type === cur.type ? S.sameType : S.differentType);
}

// ---- text options and transformations (Compile > Text options / Transformations) -------------

// Markup-level options, applied before the text options. tr = format.transforms.
function markupOptions(html, tr = {}) {
  let out = String(html || '');
  if (tr.removeStrike) out = out.replace(/<(s|strike|del)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  if (tr.removeExternalLinks) out = out.replace(/<a\b[^>]*href="(?:https?:|mailto:|ftp:)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  if (tr.italicToUnderline) out = out.replace(/<(\/?)(em|i)\b([^>]*)>/gi, '<$1u$3>');
  else if (tr.underlineToItalic) out = out.replace(/<(\/?)u\b([^>]*)>/gi, '<$1em$2>');
  if (tr.plainText) {
    // Text only: no bold/italic/underline/colours/fonts/styles (notes, comments and paragraphs stay).
    out = out
      .replace(/<\/?(strong|b|em|i|u|s|strike|del|sup|sub|mark|code|font)\b[^>]*>/gi, '')
      .replace(/\s(?:style|data-style|data-char-style|data-caps)="[^"]*"/gi, '');
  }
  if (tr.trimParagraphs) out = out.replace(/(<(p|h\d|li)\b[^>]*>)(?:\s|&nbsp;|&#160;)+/gi, '$1').replace(/(?:\s|&nbsp;|&#160;)+(<\/(p|h\d|li)>)/gi, '$1');
  return out;
}

// Comments (Compile > Notes and comments): 'strip' | 'export' (Word comments) | 'footnotes' |
// 'inline' (text between brackets after the commented text).
function commentsTo(html, mode) {
  if (mode !== 'footnotes' && mode !== 'inline') return html;
  return String(html || '').replace(/<span\b([^>]*?)data-comment="([^"]*)"([^>]*)>([\s\S]*?)<\/span>/g, (_m, _a, note, _b, text) =>
    mode === 'footnotes' ? `${text}<span data-footnote="${note}" class="footnote"></span>` : `${text} [${note}]`,
  );
}

// Text-level options as one function (applied to every text node).
function textOptions(tr = {}) {
  const fns = [];
  if (tr.straightQuotes) fns.push((t) => t.replace(/[„“”«»]/g, '"').replace(/[‚‘’]/g, "'"));
  if (tr.ellipsisToDots) fns.push((t) => t.replace(/…/g, '...'));
  else if (tr.dotsToEllipsis) fns.push((t) => t.replace(/\.\.\./g, '…'));
  if (tr.collapseSpaces) fns.push((t) => t.replace(/([^\S\n\u00a0])[^\S\n\u00a0]+/g, '$1'));
  // French: a narrow no-break space before ; : ! ? » and after « (not inside 10:30 or ?!).
  if (tr.frenchSpacing) fns.push((t) => t.replace(/(?<=[^\s\d;:!?\u202f])[ \u00a0]*([;:!?\u00bb])/gu, '\u202f$1').replace(/\u00ab[ \u00a0]*/gu, '\u00ab\u202f'));
  return fns.length ? (t) => fns.reduce((x, f) => f(x), t) : null;
}

// Preserve-formatting blocks treated as code blocks / quotes in Markdown (format.transforms.preserveAs).
function preserveAs(html, mode) {
  if (!mode || mode === 'keep') return html;
  return String(html || '').replace(/<div\b[^>]*data-preserve-format[^>]*>([\s\S]*?)<\/div>/g, (_m, inner) => {
    const paras = [...inner.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((x) => x[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, ''));
    const text = (paras.length ? paras : [inner.replace(/<[^>]+>/g, '')]).join('\n');
    return mode === 'code' ? `<pre data-code="1">${text}</pre>` : `<blockquote>${paras.map((p) => `<p>${p}</p>`).join('')}</blockquote>`;
  });
}

// Replacements with an "enabled" tick and a scope: all | titles | text.
function replacementsFor(list, scope) {
  return (Array.isArray(list) ? list : []).filter((r) => r && r.find && r.enabled !== false && (!r.scope || r.scope === 'all' || r.scope === scope));
}

// ---- styles (Compile > Styles) -------------------------------------------------------------

// format.styleOverrides: { [styleIdOrName]: { remove, fontFamily, sizePct, color, bold, italic,
//   indentEm, align, cssClass, wordStyle } }.
function overrideFor(overrides, st) {
  if (!overrides || !st) return null;
  return overrides[st.id] || overrides[st.name] || null;
}

/** The project's styles with the format's compile-only redefinitions applied (removed ones dropped). */
function stylesForCompile(styles, overrides) {
  return (styles || [])
    .filter((st) => !(overrideFor(overrides, st) || {}).remove)
    .map((st) => {
      const o = overrideFor(overrides, st);
      if (!o) return st;
      const out = { ...st };
      if (o.fontFamily) out.font = o.fontFamily;
      if (o.sizePct) out.size = Number(o.sizePct);
      if (o.color) out.color = o.color;
      if (typeof o.bold === 'boolean') out.bold = o.bold;
      if (typeof o.italic === 'boolean') out.italic = o.italic;
      if (o.indentEm != null && o.indentEm !== '') out.indent = Number(o.indentEm);
      if (o.align) out.align = o.align;
      if (o.wordStyle) out.wordStyle = o.wordStyle;
      if (o.cssClass) out.cssClass = String(o.cssClass).replace(/[^\w-]/g, '');
      return out;
    });
}

/** Removes the markup of styles marked "remove at compile" (the text stays) and adds the CSS class of mapped ones. */
function applyStyleOverrides(html, styles, overrides) {
  if (!overrides || !Object.keys(overrides).length) return html;
  let out = String(html || '');
  for (const st of styles || []) {
    const o = overrideFor(overrides, st);
    if (!o) continue;
    const id = String(st.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (o.remove) {
      out = out.replace(new RegExp(`\\sdata-style="${id}"`, 'g'), '');
      out = out.replace(new RegExp(`\\sdata-char-style="${id}"`, 'g'), '');
    } else if (o.cssClass) {
      const cls = String(o.cssClass).replace(/[^\w-]/g, '');
      out = out.replace(new RegExp(`(<[a-z0-9]+)([^>]*\\sdata-(?:char-)?style="${id}")`, 'g'), (m, tag, rest) => (/\sclass="/.test(rest) ? m.replace(/\sclass="/, ` class="${cls} `) : `${tag} class="${cls}"${rest}`));
    }
  }
  return out;
}

/** CSS for the redefined styles (later than the editor's style CSS, so it wins). */
function styleOverrideCss(styles, overrides) {
  if (!overrides) return '';
  return (styles || [])
    .map((st) => {
      const o = overrideFor(overrides, st);
      if (!o || o.remove) return '';
      const d = [];
      if (o.fontFamily) d.push(`font-family:"${String(o.fontFamily).replace(/"/g, '')}"`);
      if (o.sizePct) d.push(`font-size:${Number(o.sizePct)}%`);
      if (o.color) d.push(`color:${String(o.color).replace(/[;{}]/g, '')}`);
      if (typeof o.bold === 'boolean') d.push(`font-weight:${o.bold ? 700 : 400}`);
      if (typeof o.italic === 'boolean') d.push(`font-style:${o.italic ? 'italic' : 'normal'}`);
      if (o.indentEm != null && o.indentEm !== '') d.push(`margin-left:${Number(o.indentEm)}em;margin-right:${Number(o.indentEm)}em`);
      if (o.align) d.push(`text-align:${o.align}`);
      if (!d.length) return '';
      const sel = st.type === 'char' ? `[data-char-style="${st.id}"]` : `[data-style="${st.id}"]`;
      return `body ${sel}${o.cssClass ? `,body .${String(o.cssClass).replace(/[^\w-]/g, '')}` : ''}{${d.join(';')}}`;
    })
    .filter(Boolean)
    .join('\n');
}

// ---- first paragraph: small caps lead-in, drop cap, indent ----------------------------------

function firstParagraph(html, lay) {
  const words = Math.max(0, Math.floor(Number(lay.firstWordsSmallCaps) || 0));
  if (!words && !lay.dropCap && lay.firstIndent !== 'none' && lay.firstIndent !== 'indent') return html;
  const m = /<p\b([^>]*)>([\s\S]*?)<\/p>/.exec(html);
  if (!m) return html;
  let [all, attrs, inner] = m;
  if (lay.firstIndent === 'none' || lay.firstIndent === 'indent') attrs = `${attrs.replace(/\sdata-first="[^"]*"/, '')} data-first="${lay.firstIndent}"`;
  // Leading text up to the first tag: where the lead-in can be wrapped without crossing markup.
  const lead = /^([^<]*)/.exec(inner)[1];
  let rest = inner.slice(lead.length);
  let text = lead;
  let drop = '';
  if (lay.dropCap) {
    const d = /^(\s*)([„"'«(]?[\p{L}\p{N}])/u.exec(text);
    if (d) {
      drop = `${d[1]}<span data-dropcap="1">${d[2]}</span>`;
      text = text.slice(d[0].length);
    }
  }
  if (words) {
    const re = new RegExp(`^((?:\\S+\\s+){0,${words - 1}}\\S+)`, 'u');
    const w = re.exec(text);
    if (w && w[1]) text = `<span data-caps="small">${w[1]}</span>${text.slice(w[1].length)}`;
  }
  return html.replace(all, `<p${attrs}>${drop}${text}${rest}</p>`);
}

// ---- extra content per layout: synopsis, notes, metadata ----------------------------------------

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** {before, after} HTML for a section: synopsis, document notes and metadata, as the layout says. */
function extrasHtml(node, lay, opts = {}) {
  const before = [];
  const after = [];
  const put = (where, html) => (where === 'after' ? after : before).push(html);
  if (lay.synopsis && lay.synopsis !== 'none' && node.synopsis) put(lay.synopsis, `<p class="synopsis" data-first="none"><em>${escapeHtml(node.synopsis)}</em></p>`);
  if (lay.notes && lay.notes !== 'none') {
    const notes = typeof opts.readNotes === 'function' ? opts.readNotes(node.id) : node.notes;
    if (notes && String(notes).replace(/<[^>]+>/g, '').trim()) put(lay.notes, `<div class="doc-notes">${/<p\b/.test(notes) ? notes : `<p>${escapeHtml(notes)}</p>`}</div>`);
  }
  const meta = (lay.meta || [])
    .map((k) => {
      const lbl = (opts.labels || {})[k] || k;
      if (k === 'label' && node.label) return `${lbl}: ${node.label}`;
      if (k === 'status' && node.status) return `${lbl}: ${node.status}`;
      if (k === 'keywords' && (node.keywords || []).length) return `${lbl}: ${node.keywords.join(', ')}`;
      return '';
    })
    .filter(Boolean);
  if (meta.length) put(lay.metaPosition || 'before', `<p class="doc-meta" data-first="none"><small>${escapeHtml(meta.join(' · '))}</small></p>`);
  return { before: before.join(''), after: after.join('') };
}

// ---- per-layout CSS (HTML / PDF / EPUB) --------------------------------------------------------

const cssFont = (name) => `"${String(name).replace(/["\\;{}]/g, '')}"`;

/** CSS for the layouts used in the document; classes lay-<i> on headings, prefixes and bodies. */
function layoutCss(used) {
  return used
    .map(({ cls, lay }) => {
      const out = [];
      const h = [];
      if (lay.titleFont) h.push(`font-family:${cssFont(lay.titleFont)},serif`);
      if (Number(lay.titleSizePt) > 0) h.push(`font-size:${Number(lay.titleSizePt)}pt`);
      if (lay.titleBold === true) h.push('font-weight:700');
      if (lay.titleBold === false) h.push('font-weight:400');
      if (lay.titleItalic) h.push('font-style:italic');
      if (lay.titleSpaceBeforePt != null && lay.titleSpaceBeforePt !== '') h.push(`margin-top:${Number(lay.titleSpaceBeforePt)}pt`);
      if (lay.titleSpaceAfterPt != null && lay.titleSpaceAfterPt !== '') h.push(`margin-bottom:${Number(lay.titleSpaceAfterPt)}pt`);
      if (h.length) out.push(`.h-${cls}{${h.join(';')}}`);
      const p = [];
      if (lay.prefixFont) p.push(`font-family:${cssFont(lay.prefixFont)},serif`);
      if (Number(lay.prefixSizePt) > 0) p.push(`font-size:${Number(lay.prefixSizePt)}pt`);
      if (lay.prefixItalic) p.push('font-style:italic');
      if (lay.prefixCase === 'upper') p.push('text-transform:uppercase');
      if (lay.prefixCase === 'smallcaps') p.push('font-variant:small-caps');
      if (lay.prefixAlign) p.push(`display:block;text-align:${lay.prefixAlign}`);
      if (p.length) out.push(`.h-${cls} .ch-prefix{${p.join(';')}}`);
      const b = [];
      if (Number(lay.columns) > 1) b.push(`column-count:${Math.min(4, Number(lay.columns))};column-gap:1.5em`);
      if (b.length) out.push(`.${cls}{${b.join(';')}}`);
      if (lay.indentIn != null && lay.indentIn !== '') out.push(`.${cls} p{text-indent:${Number(lay.indentIn)}in}`);
      if (lay.formatting === 'override') out.push(`.${cls} [style]{font-family:inherit!important;font-size:inherit!important}`);
      if (lay.pageBreakAfter) out.push(`.${cls}{break-after:page;page-break-after:always}`);
      return out.join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

/** Removes editor fonts and sizes (layout "override formatting"). */
function stripFonts(html) {
  return String(html || '')
    .replace(/(style="[^"]*?)font-(?:family|size):\s*[^;"]+;?\s*/g, '$1')
    .replace(/(style="[^"]*?)font-(?:family|size):\s*[^;"]+;?\s*/g, '$1')
    .replace(/\sstyle="\s*"/g, '');
}

// ---- a miniature of a layout (for the list in the designer) ------------------------------------

/** Lines describing what a section with this layout looks like: [{kind, text, align, style}]. */
function layoutPreview(l, sample = {}) {
  const lay = layoutOf(l);
  const lines = [];
  if (lay.pageBreakBefore) lines.push({ kind: 'break' });
  const meta = lay.meta.length ? { kind: 'meta', text: lay.meta.join(' · ') } : null;
  if (meta && lay.metaPosition !== 'after') lines.push(meta);
  if (lay.synopsis === 'before') lines.push({ kind: 'synopsis' });
  if (lay.notes === 'before') lines.push({ kind: 'notes' });
  const prefix = String(lay.titlePrefix || '').replace(/<\$n(?::[^>]*)?>/g, '1').replace(/<\$[^>]+>/g, '…');
  const titleText = lay.showTitle ? sample.title || 'Titlu' : '';
  if (prefix.includes('\n')) {
    lines.push({ kind: 'prefix', text: prefix.split('\n')[0], align: lay.prefixAlign || lay.titleAlign || 'center', style: lay.prefixCase });
    if (titleText || lay.titleSuffix) lines.push({ kind: 'title', text: `${prefix.split('\n').slice(1).join(' ')}${titleText}${lay.titleSuffix || ''}`, align: lay.titleAlign || 'center', style: lay.titleCase });
  } else if (prefix || titleText || lay.titleSuffix) lines.push({ kind: 'title', text: `${prefix}${titleText}${lay.titleSuffix || ''}`, align: lay.titleAlign || 'center', style: lay.titleCase });
  if (lay.showText) {
    lines.push({ kind: 'text', dropCap: lay.dropCap, smallCaps: Number(lay.firstWordsSmallCaps) > 0, indent: lay.firstIndent === 'indent', columns: Number(lay.columns) || 1 });
    lines.push({ kind: 'text', columns: Number(lay.columns) || 1 });
  }
  if (lay.synopsis === 'after') lines.push({ kind: 'synopsis' });
  if (lay.notes === 'after') lines.push({ kind: 'notes' });
  if (meta && lay.metaPosition === 'after') lines.push(meta);
  if (lay.pageBreakAfter) lines.push({ kind: 'break' });
  return lines;
}

// ---- statistics ----------------------------------------------------------------------------

/** format.statistics: { round: 0|100|500|1000, includeTitles, countFrontBack } */
function statistics(format) {
  const s = (format && format.statistics) || {};
  return { round: [0, 100, 500, 1000].includes(Number(s.round)) ? Number(s.round) : 0, includeTitles: Boolean(s.includeTitles), countFrontBack: Boolean(s.countFrontBack) };
}

// ---- script settings (Compile > Script settings) ----------------------------------------------

// Standard US screenplay geometry, inches from the left text margin (1.5in page margin).
const SCRIPT_ELEMENTS = {
  screenplay: {
    'scene-heading': { upper: true, bold: false, spaceBefore: 1, left: 0, right: 0 },
    action: { spaceBefore: 1, left: 0, right: 0 },
    character: { upper: true, spaceBefore: 1, left: 2.2, right: 0 },
    parenthetical: { left: 1.6, right: 2.0 },
    dialogue: { left: 1.0, right: 1.5 },
    transition: { upper: true, spaceBefore: 1, left: 4.0, right: 0, align: 'right' },
    shot: { upper: true, spaceBefore: 1 },
    general: {},
  },
  stageplay: {
    act: { upper: true, underline: true, align: 'center', spaceBefore: 2 },
    scene: { upper: true, align: 'center', spaceBefore: 1 },
    character: { upper: true, align: 'center', spaceBefore: 1 },
    dialogue: { left: 0.5, right: 0.5 },
    'stage-direction': { italic: true, left: 2.5, spaceBefore: 1 },
    parenthetical: { left: 2.0, right: 1.0 },
  },
  comic: {
    page: { upper: true, bold: true, spaceBefore: 2 },
    panel: { bold: true, spaceBefore: 1 },
    description: { spaceBefore: 0 },
    character: { upper: true, left: 2.0, spaceBefore: 1 },
    balloon: { left: 1.0, right: 1.0 },
    caption: { italic: true, left: 1.0 },
    sfx: { upper: true, bold: true },
  },
  radio: {
    character: { upper: true, bold: true, spaceBefore: 1 },
    dialogue: { left: 1.5 },
    sfx: { upper: true, underline: true, spaceBefore: 1 },
    music: { upper: true, underline: true, spaceBefore: 1 },
  },
};
const SCRIPT_DEFAULTS = { mode: '', contd: true, more: true, contdAfterAction: false, linesPerPage: 55, charsPerLine: 60, contdText: "(CONT'D)", moreText: '(MORE)', elements: {} };

function scriptSettings(format) {
  const s = { ...SCRIPT_DEFAULTS, ...((format && format.script) || {}) };
  s.linesPerPage = Math.max(20, Math.min(90, Number(s.linesPerPage) || 55));
  s.charsPerLine = Math.max(20, Math.min(120, Number(s.charsPerLine) || 60));
  const base = SCRIPT_ELEMENTS[s.mode] || {};
  const own = s.elements || {};
  s.elements = Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(own)])].map((k) => [k, { ...(base[k] || {}), ...(own[k] || {}) }]));
  return s;
}

/** CSS mapping each script element to its output look. */
function scriptCss(s) {
  if (!s.mode) return '';
  return Object.entries(s.elements)
    .map(([id, e]) => {
      const d = ['text-indent:0', 'margin-bottom:0'];
      if (e.upper) d.push('text-transform:uppercase');
      if (e.bold) d.push('font-weight:700');
      if (e.italic) d.push('font-style:italic');
      if (e.underline) d.push('text-decoration:underline');
      if (e.align) d.push(`text-align:${e.align}`);
      if (e.left) d.push(`margin-left:${e.left}in`);
      if (e.right) d.push(`margin-right:${e.right}in`);
      if (e.spaceBefore) d.push(`margin-top:${e.spaceBefore}em`);
      return `p[data-script="${id}"]{${d.join(';')}}`;
    })
    .join('\n');
}

const paraRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
const scriptOf = (attrs) => (/data-(?:script|style)="([^"]+)"/.exec(attrs) || [])[1] || '';
const plain = (h) => String(h).replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/**
 * Automatic "(MORE)" / "(CONT'D)": estimates the pages of a screenplay (lines per page, characters
 * per line by element width) and, when a speech is cut by a page break, ends the page with (MORE)
 * and repeats the character name with (CONT'D) on the next page. With contdAfterAction, a
 * character who speaks again after only action lines gets (CONT'D) too.
 */
function scriptContinuations(html, s) {
  if (!s.mode || (!s.contd && !s.more && !s.contdAfterAction)) return html;
  const paras = [];
  let m;
  paraRe.lastIndex = 0;
  let last = 0;
  const pieces = [];
  while ((m = paraRe.exec(html))) {
    pieces.push(html.slice(last, m.index));
    paras.push({ attrs: m[1], inner: m[2], el: scriptOf(m[1]), at: pieces.length });
    pieces.push(null);
    last = paraRe.lastIndex;
  }
  pieces.push(html.slice(last));
  const width = (el) => {
    const e = s.elements[el] || {};
    const inches = 6 - (e.left || 0) - (e.right || 0);
    return Math.max(10, Math.round((s.charsPerLine * inches) / 6));
  };
  const linesOf = (p) => {
    const e = s.elements[p.el] || {};
    const text = plain(p.inner);
    const w = width(p.el);
    const n = text.split('\n').reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / w)), 0);
    return n + (e.spaceBefore || 0);
  };
  const out = paras.map((p) => `<p${p.attrs}>${p.inner}</p>`);
  let line = 0;
  let speaker = null; // name of the current speech
  let lastSpeaker = null;
  let onlyAction = false;
  paras.forEach((p, i) => {
    const n = linesOf(p);
    const isSpeech = p.el === 'dialogue' || p.el === 'parenthetical';
    if (p.el === 'character') {
      const name = plain(p.inner).replace(/\s*\(.*\)\s*$/, '').trim();
      if (s.contdAfterAction && onlyAction && lastSpeaker && name.toUpperCase() === lastSpeaker.toUpperCase() && !/\(/.test(plain(p.inner))) {
        out[i] = `<p${p.attrs}>${p.inner} ${escapeHtml(s.contdText)}</p>`;
      }
      speaker = name;
      lastSpeaker = name;
      onlyAction = false;
    } else if (p.el === 'scene-heading' || p.el === 'transition') {
      lastSpeaker = null;
      speaker = null;
      onlyAction = false;
    } else if (p.el === 'action') {
      speaker = null;
      onlyAction = true;
    } else if (!isSpeech) speaker = null;
    if (line + n > s.linesPerPage) {
      // this paragraph starts the next page
      if (isSpeech && speaker) {
        const charAttrs = ' data-script="character"';
        const more = s.more ? `<p data-script="parenthetical" class="script-more">${escapeHtml(s.moreText)}</p>` : '';
        const cont = s.contd ? `<p${charAttrs} class="script-contd">${escapeHtml(`${speaker} ${s.contdText}`)}</p>` : '';
        out[i] = `${more}<div class="pb"></div>${cont}${out[i]}`;
        line = 1 + n;
      } else {
        out[i] = `<div class="pb"></div>${out[i]}`;
        line = n;
      }
    } else line += n;
  });
  paras.forEach((p, i) => (pieces[p.at] = out[i]));
  return pieces.join('');
}

// ---- Markdown options ------------------------------------------------------------------------

/** format.markdown: { headings: 'atx'|'setext', noteSeparator, yaml } */
function markdownSettings(format) {
  const m = (format && format.markdown) || {};
  return { headings: m.headings === 'setext' ? 'setext' : 'atx', noteSeparator: typeof m.noteSeparator === 'string' ? m.noteSeparator : '', yaml: m.yaml !== false };
}

function yamlString(v) {
  const s = String(v == null ? '' : v);
  return /^[\w .,()-]*$/u.test(s) && s && !/^(true|false|null|yes|no|\d)/i.test(s) ? s : JSON.stringify(s);
}

/** YAML front matter block for Markdown outputs. */
function yamlFrontMatter(meta) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(meta)) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (Array.isArray(v)) lines.push(`${k}:`, ...v.map((x) => `  - ${yamlString(x)}`));
    else lines.push(`${k}: ${yamlString(v)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

// ---- e-book / HTML ---------------------------------------------------------------------------

/** Custom CSS typed in the format (e-book / HTML), with anything that could leave the <style> removed. */
function customCss(format, target) {
  const e = (format && format.ebook) || {};
  const css = target === 'epub' ? e.css : (format && format.html && format.html.css) || e.htmlCss;
  return String(css || '').replace(/<\/?style\b[^>]*>/gi, '').replace(/<\//g, '<\\/');
}

// ---- post-processing -------------------------------------------------------------------------

/**
 * Runs the post-processing command chosen in the compile settings (project.compile.postCommand,
 * never from an imported format) after the file was written. <$file> / <$dir> / <$name> are
 * replaced by the compiled file's path, folder and name without extension. Runs without a shell:
 * the command is split into program + arguments.
 */
function splitCommand(cmd) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(String(cmd || '')))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}
function postProcess(command, file, { execFile = require('child_process').execFile, timeoutMs = 120000 } = {}) {
  const path = require('path');
  const parts = splitCommand(command);
  if (!parts.length) return Promise.resolve(null);
  const vars = { '<$file>': file, '<$dir>': path.dirname(file), '<$name>': path.basename(file, path.extname(file)) };
  const args = parts.map((a) => a.replace(/<\$(file|dir|name)>/g, (t) => vars[t]));
  return new Promise((resolve, reject) => {
    execFile(args[0], args.slice(1), { cwd: path.dirname(file), timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(new Error(`${String(stderr || err.message).trim()}`), { code: err.code }));
      else resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

module.exports = {
  LAYOUT_EXTRAS,
  DECORATIONS,
  SCRIPT_ELEMENTS,
  layoutOf,
  normalizeSep,
  separatorBetween,
  markupOptions,
  commentsTo,
  textOptions,
  preserveAs,
  replacementsFor,
  stylesForCompile,
  applyStyleOverrides,
  styleOverrideCss,
  firstParagraph,
  extrasHtml,
  layoutCss,
  stripFonts,
  layoutPreview,
  statistics,
  scriptSettings,
  scriptCss,
  scriptContinuations,
  markdownSettings,
  yamlFrontMatter,
  customCss,
  splitCommand,
  postProcess,
};
