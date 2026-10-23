'use strict';
// Compile Formats (Scrivener 3 "Compile Formats"): presets that say how each
// section type is laid out, what goes between sections, typography, page
// settings and text transformations. Custom formats live in
// project.compile.formats and have the same shape as these presets.
//
// Format shape:
// {
//   id, name, builtin?,
//   layouts: { [sectionTypeTitle]: Layout },     // section type -> section layout
//   defaultLayouts: { folder, container, file },   // section type titles used when a node has none
//   separators: { sameType: Sep, differentType: Sep },   Sep = { kind: 'text'|'page'|'space'|'none', text }
//   titlePage: bool, toc: bool,
//   typography: { fontFamily, headingFont, fontSizePt, lineSpacing, firstLineIndentIn, noIndentAfterHeading, paragraphSpacingPt },
//   page: { size, widthIn?, heightIn?, margins: {top, bottom, inner, outer}, mirrored,
//           header: {left, center, right}, footer: {left, center, right}, differentFirstPage, pageNumbers } | null (e-book),
//   transforms: { smartQuotes, dashes, removeHighlights, removeColors, linksToText, comments: 'strip'|'export',
//                 notes: 'footnotes'|'endnotes-chapter'|'endnotes-book' },
//   replacements: [{ find, replace, regex, wholeWord, caseSensitive }],
// }
// Layout = { showTitle, titlePrefix, titleSuffix, titleCase: 'normal'|'upper'|'smallcaps', titleAlign,
//            pageBreakBefore: bool|'level1', showText, separatorBefore: 'auto'|'none'|'text'|'page' , separatorText? }
// A "\n" inside titlePrefix/titleSuffix is a line break inside the heading.

const PAGE_SIZES = {
  A4: { widthIn: 8.27, heightIn: 11.69, name: 'A4' },
  A5: { widthIn: 5.83, heightIn: 8.27, name: 'A5' },
  Letter: { widthIn: 8.5, heightIn: 11, name: 'Letter' },
  '6x9': { widthIn: 6, heightIn: 9 },
  '5x8': { widthIn: 5, heightIn: 8 },
  '5.5x8.5': { widthIn: 5.5, heightIn: 8.5 },
};

const PAGE_SIZE_LABELS = {
  A4: 'A4 (210 × 297 mm)',
  A5: 'A5 (148 × 210 mm)',
  Letter: 'Letter (8,5 × 11 in)',
  '6x9': '6 × 9 in (paperback)',
  '5x8': '5 × 8 in',
  '5.5x8.5': '5,5 × 8,5 in',
};

const LAYOUT_DEFAULTS = {
  showTitle: true,
  titlePrefix: '',
  titleSuffix: '',
  titleCase: 'normal',
  titleAlign: 'center',
  pageBreakBefore: false,
  showText: true,
  separatorBefore: 'auto',
};
const layout = (o = {}) => ({ ...LAYOUT_DEFAULTS, ...o });

const DEFAULT_TRANSFORMS = {
  smartQuotes: false,
  dashes: false,
  removeHighlights: true,
  removeColors: false,
  linksToText: true,
  comments: 'strip',
  notes: 'footnotes',
};

// The preset list is plain JSON between the markers so the renderer (which has
// no Node and a CSP without eval) can read it with Vite's ?raw import and JSON.parse.
const PRESETS = /* BEGIN_PRESETS_JSON */ [
  {
    "id": "manuscris",
    "name": "Manuscris standard",
    "builtin": true,
    "layouts": {
      "Parte": {
        "showTitle": true,
        "titlePrefix": "Partea <$n:Words>\n",
        "titleSuffix": "",
        "titleCase": "upper",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol": {
        "showTitle": true,
        "titlePrefix": "Capitolul <$n>\n",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol cu text": {
        "showTitle": true,
        "titlePrefix": "Capitolul <$n>\n",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Secțiune": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "left",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "none"
      },
      "Scenă": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Pagină de titlu": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "none"
      }
    },
    "defaultLayouts": {
      "folder": "Capitol",
      "container": "Capitol cu text",
      "file": "Scenă"
    },
    "separators": {
      "sameType": {
        "kind": "text",
        "text": "#"
      },
      "differentType": {
        "kind": "none",
        "text": ""
      }
    },
    "titlePage": true,
    "toc": false,
    "typography": {
      "fontFamily": "Times New Roman",
      "headingFont": "",
      "fontSizePt": 12,
      "lineSpacing": 2,
      "firstLineIndentIn": 0.5,
      "noIndentAfterHeading": true,
      "paragraphSpacingPt": 0
    },
    "page": {
      "size": "A4",
      "margins": {
        "top": 1,
        "bottom": 1,
        "inner": 1,
        "outer": 1
      },
      "mirrored": false,
      "header": {
        "left": "",
        "center": "",
        "right": "<$surname> / <$abbr_title> / <$p>"
      },
      "footer": {
        "left": "",
        "center": "",
        "right": ""
      },
      "differentFirstPage": true,
      "pageNumbers": true
    },
    "transforms": {
      "smartQuotes": false,
      "dashes": false,
      "removeHighlights": true,
      "removeColors": false,
      "linksToText": true,
      "comments": "strip",
      "notes": "footnotes"
    },
    "replacements": []
  },
  {
    "id": "paperback",
    "name": "Carte tipărită (paperback)",
    "builtin": true,
    "layouts": {
      "Parte": {
        "showTitle": true,
        "titlePrefix": "Partea <$n:Words>\n",
        "titleSuffix": "",
        "titleCase": "upper",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol": {
        "showTitle": true,
        "titlePrefix": "Capitolul <$n:words>\n",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol cu text": {
        "showTitle": true,
        "titlePrefix": "Capitolul <$n:words>\n",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Secțiune": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "left",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "none"
      },
      "Scenă": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Pagină de titlu": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "none"
      }
    },
    "defaultLayouts": {
      "folder": "Capitol",
      "container": "Capitol cu text",
      "file": "Scenă"
    },
    "separators": {
      "sameType": {
        "kind": "text",
        "text": "* * *"
      },
      "differentType": {
        "kind": "none",
        "text": ""
      }
    },
    "titlePage": true,
    "toc": true,
    "typography": {
      "fontFamily": "Garamond",
      "headingFont": "",
      "fontSizePt": 11,
      "lineSpacing": 1.2,
      "firstLineIndentIn": 0.3,
      "noIndentAfterHeading": true,
      "paragraphSpacingPt": 0
    },
    "page": {
      "size": "6x9",
      "margins": {
        "top": 0.75,
        "bottom": 0.75,
        "inner": 0.875,
        "outer": 0.625
      },
      "mirrored": true,
      "header": {
        "left": "",
        "center": "<$projecttitle>",
        "right": ""
      },
      "footer": {
        "left": "",
        "center": "<$p>",
        "right": ""
      },
      "differentFirstPage": true,
      "pageNumbers": true
    },
    "transforms": {
      "smartQuotes": true,
      "dashes": true,
      "removeHighlights": true,
      "removeColors": false,
      "linksToText": true,
      "comments": "strip",
      "notes": "footnotes"
    },
    "replacements": []
  },
  {
    "id": "ebook",
    "name": "E-book",
    "builtin": true,
    "layouts": {
      "Parte": {
        "showTitle": true,
        "titlePrefix": "Partea <$n:Words>\n",
        "titleSuffix": "",
        "titleCase": "upper",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol cu text": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Secțiune": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "left",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "none"
      },
      "Scenă": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Pagină de titlu": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "none"
      }
    },
    "defaultLayouts": {
      "folder": "Capitol",
      "container": "Capitol cu text",
      "file": "Scenă"
    },
    "separators": {
      "sameType": {
        "kind": "text",
        "text": "* * *"
      },
      "differentType": {
        "kind": "none",
        "text": ""
      }
    },
    "titlePage": true,
    "toc": false,
    "typography": {
      "fontFamily": "Georgia",
      "headingFont": "",
      "fontSizePt": 12,
      "lineSpacing": 1.5,
      "firstLineIndentIn": 0.25,
      "noIndentAfterHeading": true,
      "paragraphSpacingPt": 0
    },
    "page": null,
    "transforms": {
      "smartQuotes": true,
      "dashes": true,
      "removeHighlights": true,
      "removeColors": false,
      "linksToText": true,
      "comments": "strip",
      "notes": "endnotes-chapter"
    },
    "replacements": []
  },
  {
    "id": "modern",
    "name": "Modern",
    "builtin": true,
    "layouts": {
      "Parte": {
        "showTitle": true,
        "titlePrefix": "Partea <$n:Words>\n",
        "titleSuffix": "",
        "titleCase": "upper",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol": {
        "showTitle": true,
        "titlePrefix": "<$n>\n",
        "titleSuffix": "",
        "titleCase": "upper",
        "titleAlign": "left",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol cu text": {
        "showTitle": true,
        "titlePrefix": "<$n>\n",
        "titleSuffix": "",
        "titleCase": "upper",
        "titleAlign": "left",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Secțiune": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "left",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "none"
      },
      "Scenă": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Pagină de titlu": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "none"
      }
    },
    "defaultLayouts": {
      "folder": "Capitol",
      "container": "Capitol cu text",
      "file": "Scenă"
    },
    "separators": {
      "sameType": {
        "kind": "space",
        "text": ""
      },
      "differentType": {
        "kind": "none",
        "text": ""
      }
    },
    "titlePage": true,
    "toc": true,
    "typography": {
      "fontFamily": "Georgia",
      "headingFont": "Helvetica",
      "fontSizePt": 11,
      "lineSpacing": 1.4,
      "firstLineIndentIn": 0,
      "noIndentAfterHeading": true,
      "paragraphSpacingPt": 6
    },
    "page": {
      "size": "A4",
      "margins": {
        "top": 1,
        "bottom": 1,
        "inner": 1.1,
        "outer": 1.1
      },
      "mirrored": false,
      "header": {
        "left": "",
        "center": "",
        "right": ""
      },
      "footer": {
        "left": "",
        "center": "",
        "right": "<$p>"
      },
      "differentFirstPage": true,
      "pageNumbers": true
    },
    "transforms": {
      "smartQuotes": true,
      "dashes": true,
      "removeHighlights": true,
      "removeColors": false,
      "linksToText": true,
      "comments": "strip",
      "notes": "footnotes"
    },
    "replacements": []
  },
  {
    "id": "pdf-a5",
    "name": "Citire PDF A5",
    "builtin": true,
    "layouts": {
      "Parte": {
        "showTitle": true,
        "titlePrefix": "Partea <$n:Words>\n",
        "titleSuffix": "",
        "titleCase": "upper",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Capitol cu text": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Secțiune": {
        "showTitle": true,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "left",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "none"
      },
      "Scenă": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": false,
        "showText": true,
        "separatorBefore": "auto"
      },
      "Pagină de titlu": {
        "showTitle": false,
        "titlePrefix": "",
        "titleSuffix": "",
        "titleCase": "normal",
        "titleAlign": "center",
        "pageBreakBefore": true,
        "showText": true,
        "separatorBefore": "none"
      }
    },
    "defaultLayouts": {
      "folder": "Capitol",
      "container": "Capitol cu text",
      "file": "Scenă"
    },
    "separators": {
      "sameType": {
        "kind": "text",
        "text": "* * *"
      },
      "differentType": {
        "kind": "none",
        "text": ""
      }
    },
    "titlePage": true,
    "toc": true,
    "typography": {
      "fontFamily": "Georgia",
      "headingFont": "",
      "fontSizePt": 11,
      "lineSpacing": 1.4,
      "firstLineIndentIn": 0.25,
      "noIndentAfterHeading": true,
      "paragraphSpacingPt": 0
    },
    "page": {
      "size": "A5",
      "margins": {
        "top": 0.6,
        "bottom": 0.7,
        "inner": 0.6,
        "outer": 0.6
      },
      "mirrored": false,
      "header": {
        "left": "",
        "center": "",
        "right": ""
      },
      "footer": {
        "left": "",
        "center": "<$p>",
        "right": ""
      },
      "differentFirstPage": true,
      "pageNumbers": true
    },
    "transforms": {
      "smartQuotes": true,
      "dashes": false,
      "removeHighlights": true,
      "removeColors": false,
      "linksToText": true,
      "comments": "strip",
      "notes": "footnotes"
    },
    "replacements": []
  }
] /* END_PRESETS_JSON */;

// The behaviour of Compile before formats existed (folders = headings, scenes
// separated by a separator). Used when no format is chosen, so old callers
// (MCP server, tests) get exactly the same output.
function legacyFormat(opts = {}) {
  const folderHeadings = opts.folderHeadings !== false;
  return {
    id: 'legacy',
    name: 'Implicit',
    builtin: true,
    legacy: true,
    layouts: {
      '@folder': layout({ showTitle: folderHeadings, titleAlign: '', pageBreakBefore: 'level1', separatorBefore: 'none' }),
      '@text': layout({ showTitle: Boolean(opts.documentTitles), titleAlign: '' }),
    },
    defaultLayouts: { folder: '@folder', container: '@text', file: '@text' },
    separators: {
      sameType: opts.separator ? { kind: 'text', text: opts.separator } : { kind: 'none', text: '' },
      differentType: { kind: 'none', text: '' },
    },
    titlePage: true,
    toc: false,
    typography: { fontFamily: opts.fontFamily || 'Georgia', headingFont: '', fontSizePt: Number(opts.fontSizePt) || 12, lineSpacing: 1.5, firstLineIndentIn: 0.3, noIndentAfterHeading: true, paragraphSpacingPt: 0 },
    page: { size: 'A5', margins: { top: 0.6, bottom: 0.6, inner: 0.6, outer: 0.6 }, mirrored: false, header: {}, footer: {}, differentFirstPage: false, pageNumbers: false },
    transforms: { ...DEFAULT_TRANSFORMS, linksToText: false, removeHighlights: false },
    replacements: [],
  };
}

const clone = (x) => JSON.parse(JSON.stringify(x));

function allFormats(project) {
  const custom = (project && project.compile && Array.isArray(project.compile.formats) && project.compile.formats) || [];
  return [...PRESETS, ...custom];
}

function findFormat(project, id) {
  return allFormats(project).find((f) => f.id === id) || null;
}

// Fills missing fields of a (possibly older or partial) custom format from the
// preset it was based on, or from "Manuscris standard".
function normalizeFormat(f) {
  const base = PRESETS.find((p) => p.id === (f && f.basedOn)) || PRESETS[0];
  const out = { ...clone(base), ...clone(f || {}) };
  out.typography = { ...base.typography, ...(f && f.typography) };
  out.transforms = { ...DEFAULT_TRANSFORMS, ...base.transforms, ...(f && f.transforms) };
  out.separators = { ...base.separators, ...(f && f.separators) };
  out.defaultLayouts = { ...base.defaultLayouts, ...(f && f.defaultLayouts) };
  if (f && f.page === null) out.page = null;
  else if (out.page) out.page = { ...(base.page || PRESETS[0].page), ...(f && f.page) };
  out.layouts = Object.fromEntries(Object.entries(out.layouts || {}).map(([k, v]) => [k, layout(v)]));
  out.replacements = Array.isArray(out.replacements) ? out.replacements : [];
  return out;
}

// A copy of any format that the user can edit and save in project.compile.formats.
function duplicateFormat(f, name) {
  const copy = clone(f);
  delete copy.builtin;
  delete copy.legacy;
  copy.basedOn = f.basedOn || f.id;
  copy.id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  copy.name = name || `${f.name} (copie)`;
  return copy;
}

function pageDimensions(page) {
  if (!page) return null;
  const preset = PAGE_SIZES[page.size];
  if (preset) return { widthIn: preset.widthIn, heightIn: preset.heightIn, name: preset.name || null };
  return { widthIn: Number(page.widthIn) || 8.27, heightIn: Number(page.heightIn) || 11.69, name: null };
}

module.exports = { PRESETS, LAYOUT_DEFAULTS, PAGE_SIZES, PAGE_SIZE_LABELS, DEFAULT_TRANSFORMS, layout, legacyFormat, allFormats, findFormat, normalizeFormat, duplicateFormat, pageDimensions };
