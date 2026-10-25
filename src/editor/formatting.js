// Paragraph and character formatting beyond StarterKit (Scrivener "Format" menu):
// per-paragraph spacing/indents/tab stops/direction, small caps and all caps,
// text bookmarks, page breaks, image size/alignment, select word/sentence/paragraph,
// copy/paste formatting, "Convert to Default Formatting" and find by formatting.
// Units: indents and tab stops in cm, spacing before/after in pt, line height unitless.
import { Extension, Mark, Node, mergeAttributes } from '@tiptap/core';
import { Image } from '@tiptap/extension-image';
import { TextSelection } from '@tiptap/pm/state';

// --- Paragraph attributes -------------------------------------------------

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;
};
const unitVal = (v, unit) => (v && String(v).trim().endsWith(unit) ? num(v) : null);

// Reads one declaration from the inline style attribute (el.style can merge
// margin longhands into a shorthand, losing the per-side values in some engines).
function styleValue(el, prop) {
  const css = prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  const m = new RegExp(`(?:^|;)\\s*${css}\\s*:\\s*([^;]+)`, 'i').exec(el.getAttribute('style') || '');
  return m ? m[1].trim() : '';
}

export const PARA_FORMAT_ATTRS = ['lineHeight', 'spaceBefore', 'spaceAfter', 'firstIndent', 'indentLeft', 'indentRight', 'tabStops', 'dir'];

// Tab stop types (Scrivener/Word): left, center, right, decimal.
export const TAB_TYPES = ['left', 'center', 'right', 'decimal'];
const TAB_LETTER = { left: '', center: 'c', right: 'r', decimal: 'd' };
const TAB_BY_LETTER = { l: 'left', c: 'center', r: 'right', d: 'decimal' };

/** Parses tab stops into [{pos, type}] (cm, sorted, unique by position; the last one wins).
 * Accepts the attribute string ("2,4.5c,8r,10d"; legacy "2,4.5" = all left) or an array of
 * numbers / {pos, type}. A suffix c/r/d marks center/right/decimal; no suffix (or l) is left. */
export function parseTabStops(s) {
  if (s === null || s === undefined || s === '') return null;
  const items = Array.isArray(s) ? s : String(s).split(/[,\s]+/);
  const byPos = new Map();
  for (const it of items) {
    let pos = null;
    let type = 'left';
    if (it && typeof it === 'object') {
      pos = num(it.pos);
      if (TAB_TYPES.includes(it.type)) type = it.type;
    } else {
      const m = /^(\d*\.?\d+)\s*([lcrd])?$/i.exec(String(it).trim());
      if (m) {
        pos = num(m[1]);
        type = TAB_BY_LETTER[(m[2] || 'l').toLowerCase()];
      }
    }
    if (pos !== null && pos > 0) byPos.set(pos, { pos, type });
  }
  const out = [...byPos.values()].sort((a, b) => a.pos - b.pos);
  return out.length ? out : null;
}
/** [{pos, type}] → "2,4.5c,8r,10d" (left stops stay plain numbers, readable by older versions). */
export const serializeTabStops = (stops) => (stops && stops.length ? stops.map((t) => (typeof t === 'object' ? `${t.pos}${TAB_LETTER[t.type] || ''}` : String(t))).join(',') : null);
/** Next type in the L → C → R → D cycle (ruler type selector, double-click on a stop). */
export const nextTabType = (type) => TAB_TYPES[(TAB_TYPES.indexOf(type) + 1) % TAB_TYPES.length];

/** CSS declarations for a paragraph's format attributes (used by renderHTML and tests). */
export function paragraphCss(a = {}) {
  const d = [];
  if (a.lineHeight) d.push(`line-height: ${a.lineHeight}`);
  if (a.spaceBefore !== null && a.spaceBefore !== undefined) d.push(`margin-top: ${a.spaceBefore}pt`);
  if (a.spaceAfter !== null && a.spaceAfter !== undefined) d.push(`margin-bottom: ${a.spaceAfter}pt`);
  if (a.firstIndent !== null && a.firstIndent !== undefined) d.push(`text-indent: ${a.firstIndent}cm`);
  if (a.indentLeft) d.push(`margin-left: ${a.indentLeft}cm`);
  if (a.indentRight) d.push(`margin-right: ${a.indentRight}cm`);
  const tabs = parseTabStops(a.tabStops);
  // Editor/HTML/PDF/EPUB approximation: only the first stop's position sets the tab width;
  // stop types (center/right/decimal) are honoured exactly only in DOCX.
  if (tabs) d.push(`tab-size: ${tabs[0].pos}cm`);
  return d.join('; ');
}

export const ParagraphFormat = Extension.create({
  name: 'paragraphFormat',
  addGlobalAttributes() {
    // Each value is written twice: as CSS (for display and compiled HTML) and as a
    // data attribute (exact round-trip even when the serializer merges margins).
    const styleAttr = (cssProp, unit, key) => {
      const data = `data-${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`;
      return {
        default: null,
        parseHTML: (el) => {
          if (el.hasAttribute(data)) return num(el.getAttribute(data));
          const v = styleValue(el, cssProp);
          if (unit) return unitVal(v, unit);
          return /^\d*\.?\d+$/.test(String(v || '').trim()) ? num(v) : null;
        },
        renderHTML: (attrs) => {
          const css = paragraphCss({ [key]: attrs[key] });
          return css ? { style: css, [data]: String(attrs[key]) } : {};
        },
      };
    };
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: styleAttr('lineHeight', '', 'lineHeight'),
          spaceBefore: styleAttr('marginTop', 'pt', 'spaceBefore'),
          spaceAfter: styleAttr('marginBottom', 'pt', 'spaceAfter'),
          firstIndent: styleAttr('textIndent', 'cm', 'firstIndent'),
          indentLeft: styleAttr('marginLeft', 'cm', 'indentLeft'),
          indentRight: styleAttr('marginRight', 'cm', 'indentRight'),
          tabStops: {
            default: null,
            parseHTML: (el) => serializeTabStops(parseTabStops(el.getAttribute('data-tabs'))),
            renderHTML: (a) => {
              const tabs = parseTabStops(a.tabStops);
              if (!tabs) return {};
              return { 'data-tabs': serializeTabStops(tabs), style: `tab-size: ${tabs[0].pos}cm` };
            },
          },
          dir: {
            default: null,
            parseHTML: (el) => (el.getAttribute('dir') === 'rtl' ? 'rtl' : null),
            renderHTML: (a) => (a.dir === 'rtl' ? { dir: 'rtl' } : {}),
          },
        },
      },
    ];
  },
  addStorage() {
    return { clipboard: null, defaults: {} };
  },
  addCommands() {
    return {
      setParagraphFormat:
        (attrs) =>
        ({ chain }) =>
          chain().updateAttributes('paragraph', attrs).updateAttributes('heading', attrs).run(),
      toggleRtl:
        () =>
        ({ editor, commands }) => {
          const cur = editor.state.selection.$from.parent.attrs.dir;
          return commands.setParagraphFormat({ dir: cur === 'rtl' ? null : 'rtl' });
        },
      selectWord:
        () =>
        ({ state, dispatch }) => selectBy(state, dispatch, wordBounds),
      selectSentence:
        () =>
        ({ state, dispatch }) => selectBy(state, dispatch, sentenceBounds),
      selectParagraph:
        () =>
        ({ state, dispatch }) => selectBy(state, dispatch, (t) => [0, t.length]),
      copyFormat:
        () =>
        ({ editor, state }) => {
          editor.storage.paragraphFormat.clipboard = captureFormat(state);
          return true;
        },
      pasteFormat:
        () =>
        ({ editor, state, tr, dispatch }) => {
          const clip = editor.storage.paragraphFormat.clipboard;
          if (!clip) return false;
          applyFormat(state, tr, clip);
          if (dispatch) dispatch(tr);
          return true;
        },
      applyDefaultFormatting:
        (defaults) =>
        ({ editor, state, tr, dispatch }) => {
          resetToDefault(state, tr, defaults || editor.storage.paragraphFormat.defaults || {});
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-Shift-w': () => this.editor.commands.selectWord(),
      'Mod-Alt-Shift-s': () => this.editor.commands.selectSentence(),
      'Mod-Alt-Shift-p': () => this.editor.commands.selectParagraph(),
      'Mod-Alt-c': () => this.editor.commands.copyFormat(),
      'Mod-Alt-v': () => this.editor.commands.pasteFormat(),
      // Tab inserts a tab character in paragraphs that have tab stops (ruler).
      Tab: () => {
        const { $from } = this.editor.state.selection;
        if ($from.parent.type.name !== 'paragraph' || !$from.parent.attrs.tabStops || $from.parent.attrs.script) return false;
        return this.editor.commands.insertContent('\t');
      },
    };
  },
});

// --- Select word / sentence / paragraph -------------------------------------

const WORD_CH = /[\p{L}\p{N}\p{M}_'’-]/u;

/** [from, to] of the word at text offset (empty range when not on a word). */
export function wordBounds(text, offset) {
  let a = Math.min(offset, text.length);
  let b = a;
  while (a > 0 && WORD_CH.test(text[a - 1])) a--;
  while (b < text.length && WORD_CH.test(text[b])) b++;
  return [a, b];
}

/** [from, to] of the sentence at offset (trailing spaces excluded). */
export function sentenceBounds(text, offset) {
  for (const m of text.matchAll(/[^.!?…]+(?:[.!?…]+[”"»)]*)?\s*/gu)) {
    const a = m.index;
    const b = a + m[0].length;
    if (offset >= a && (offset < b || b === text.length)) {
      const lead = m[0].length - m[0].trimStart().length;
      return [a + lead, a + m[0].trimEnd().length];
    }
  }
  return [offset, offset];
}

function selectBy(state, dispatch, fn) {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return false;
  const text = $from.parent.textBetween(0, $from.parent.content.size, undefined, '￼');
  const [a, b] = fn(text, $from.parentOffset);
  const start = $from.start();
  if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, start + a, start + b)).scrollIntoView());
  return true;
}

// --- Copy / paste formatting, default formatting ---------------------------

// Marks that are content, not formatting: never copied or removed by format paste.
const CONTENT_MARKS = ['comment', 'linkedFootnote', 'link', 'bookmark', 'revision'];
const PARA_KEYS = [...PARA_FORMAT_ATTRS, 'textAlign', 'styleName'];

export function captureFormat(state) {
  const { $from, from, empty } = state.selection;
  const marks = (empty ? state.storedMarks || $from.marks() : state.doc.resolve(Math.min(from + 1, $from.end())).marks()).filter((m) => !CONTENT_MARKS.includes(m.type.name));
  const para = {};
  for (const k of PARA_KEYS) if (k in $from.parent.attrs) para[k] = $from.parent.attrs[k];
  return { marks: marks.map((m) => m.toJSON()), para };
}

function eachTextblock(state, fn) {
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    fn(node, pos);
    return false;
  });
}

export function applyFormat(state, tr, clip) {
  let { from, to, empty } = state.selection;
  // No selection: the character formatting goes on the word under the cursor (and on what is typed next).
  if (empty) {
    const { $from } = state.selection;
    if ($from.parent.isTextblock) {
      const text = $from.parent.textBetween(0, $from.parent.content.size, null, '\ufffc');
      const [a, b] = wordBounds(text, $from.parentOffset);
      if (b > a) {
        from = $from.start() + a;
        to = $from.start() + b;
        empty = false;
      }
    }
    if (empty) tr.setStoredMarks((clip.marks || []).map((mj) => state.schema.marks[mj.type]?.create(mj.attrs)).filter(Boolean));
  }
  if (!empty) {
    for (const [, type] of Object.entries(state.schema.marks)) if (!CONTENT_MARKS.includes(type.name)) tr.removeMark(from, to, type);
    for (const mj of clip.marks || []) {
      const type = state.schema.marks[mj.type];
      if (type) tr.addMark(from, to, type.create(mj.attrs));
    }
  }
  eachTextblock(state, (node, pos) => {
    const attrs = { ...node.attrs };
    for (const [k, v] of Object.entries(clip.para || {})) if (k in attrs) attrs[k] = v;
    tr.setNodeMarkup(pos, undefined, attrs);
  });
  return tr;
}

/**
 * Convert to Default Formatting: paragraph format attributes take the project
 * defaults, text alignment is cleared, per-span font family and size are removed.
 * defaults: { lineHeight, spaceBefore, spaceAfter, firstIndent, indentLeft, indentRight, align }.
 * Applies to the selection, or to the whole document when nothing is selected.
 */
export function resetToDefault(state, tr, defaults = {}) {
  const { empty } = state.selection;
  const from = empty ? 0 : state.selection.from;
  const to = empty ? state.doc.content.size : state.selection.to;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isTextblock && node.type.name !== 'codeBlock') {
      const attrs = { ...node.attrs };
      for (const k of PARA_FORMAT_ATTRS) if (k in attrs && k !== 'dir') attrs[k] = defaults[k] ?? null;
      if ('textAlign' in attrs) attrs.textAlign = defaults.align || null;
      tr.setNodeMarkup(pos, undefined, attrs);
    }
    if (node.isText) {
      const ts = node.marks.find((m) => m.type.name === 'textStyle');
      if (ts && (ts.attrs.fontFamily || ts.attrs.fontSize)) {
        const a = Math.max(pos, from);
        const b = Math.min(pos + node.nodeSize, to);
        tr.removeMark(a, b, ts.type);
        const rest = { ...ts.attrs, fontFamily: null, fontSize: null };
        if (Object.values(rest).some((v) => v)) tr.addMark(a, b, ts.type.create(rest));
      }
    }
    return true;
  });
  return tr;
}

// --- Marks: small caps, all caps, bookmarks ---------------------------------

// No inline style here: TextStyle would also claim a styled <span>. The look comes
// from CSS on [data-caps] (editor-extra.css; Compile needs the same rule).
const capsMark = (name, kind) =>
  Mark.create({
    name,
    parseHTML: () => [{ tag: `span[data-caps="${kind}"]` }],
    renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { 'data-caps': kind }), 0],
    addCommands() {
      return { [`toggle${name[0].toUpperCase()}${name.slice(1)}`]: () => ({ commands }) => commands.toggleMark(name) };
    },
  });

export const SmallCaps = capsMark('smallCaps', 'small');
export const AllCaps = capsMark('allCaps', 'all');

// Text bookmark: <span data-bookmark="name" class="bookmark">anchor</span>.
export const Bookmark = Mark.create({
  name: 'bookmark',
  inclusive: false,
  excludes: '',
  addAttributes() {
    return {
      name: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-bookmark') || '',
        renderHTML: (a) => ({ 'data-bookmark': a.name, title: a.name }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-bookmark]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'bookmark' }), 0];
  },
  addCommands() {
    return {
      setBookmark:
        (name) =>
        ({ state, tr, dispatch }) => {
          const { from, to, empty, $from } = state.selection;
          let a = from;
          let b = to;
          if (empty) {
            // no selection: bookmark the word at the cursor (or the whole paragraph if none)
            const text = $from.parent.textBetween(0, $from.parent.content.size, undefined, '￼');
            let [wa, wb] = wordBounds(text, $from.parentOffset);
            if (wa === wb) [wa, wb] = [0, text.length];
            a = $from.start() + wa;
            b = $from.start() + wb;
          }
          if (a === b) return false;
          if (dispatch) dispatch(tr.addMark(a, b, state.schema.marks.bookmark.create({ name })));
          return true;
        },
      removeBookmark:
        (name) =>
        ({ state, tr, dispatch }) => {
          const type = state.schema.marks.bookmark;
          for (const r of listBookmarks(state.doc)) if (!name || r.name === name) tr.removeMark(r.from, r.to, type);
          if (dispatch) dispatch(tr);
          return true;
        },
      goToBookmark:
        (name) =>
        ({ state, tr, dispatch }) => {
          const hit = listBookmarks(state.doc).find((r) => r.name === name);
          if (!hit) return false;
          if (dispatch) dispatch(tr.setSelection(TextSelection.create(state.doc, hit.from, hit.to)).scrollIntoView());
          return true;
        },
    };
  },
});

/** Bookmarks in document order: [{ name, from, to }] (adjacent pieces merged). */
export function listBookmarks(doc) {
  return markRanges(doc, (m) => m.type.name === 'bookmark', (m) => m.attrs.name).map((r) => ({ name: r.key, from: r.from, to: r.to }));
}

function markRanges(doc, test, keyOf = () => '') {
  const out = [];
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const m of node.marks) {
      if (!test(m)) continue;
      const key = keyOf(m);
      const last = out[out.length - 1];
      if (last && last.key === key && last.to === pos) last.to = pos + node.nodeSize;
      else out.push({ key, from: pos, to: pos + node.nodeSize });
    }
    return true;
  });
  return out;
}

// --- Find by formatting -------------------------------------------------------

export const FORMAT_KINDS = [
  ['comment', 'Comentarii'],
  ['footnote', 'Note de subsol'],
  ['annotation', 'Adnotări inline'],
  ['highlight', 'Highlight'],
  ['color', 'Culoare text'],
  ['revision', 'Revizii'],
  ['style', 'Stil (paragraf sau caractere)'],
  ['bookmark', 'Semne de carte'],
];

/**
 * Ranges [{from, to}] of content with a given formatting, in document order.
 * value narrows: highlight/color = colour, revision = level, style = style id, bookmark = name.
 */
export function findFormatting(doc, kind, value = null) {
  const v = value === '' ? null : value;
  const markTest = {
    comment: (m) => m.type.name === 'comment',
    footnote: (m) => m.type.name === 'linkedFootnote',
    highlight: (m) => m.type.name === 'highlight' && (!v || String(m.attrs.color).toLowerCase() === String(v).toLowerCase()),
    color: (m) => m.type.name === 'textStyle' && !!m.attrs.color && (!v || String(m.attrs.color).toLowerCase() === String(v).toLowerCase()),
    revision: (m) => m.type.name === 'revision' && (!v || Number(m.attrs.level) === Number(v)),
    style: (m) => m.type.name === 'charStyle' && (!v || m.attrs.name === v),
    bookmark: (m) => m.type.name === 'bookmark' && (!v || m.attrs.name === v),
  }[kind];
  const out = markTest ? markRanges(doc, markTest, (m) => JSON.stringify(m.attrs)) : [];
  doc.descendants((node, pos) => {
    if (kind === 'footnote' && node.type.name === 'footnote') out.push({ from: pos, to: pos + node.nodeSize });
    if (kind === 'annotation' && node.type.name === 'annotation') out.push({ from: pos, to: pos + node.nodeSize });
    if (kind === 'style' && node.isTextblock && node.attrs.styleName && (!v || node.attrs.styleName === v)) {
      out.push({ from: pos + 1, to: pos + node.nodeSize - 1 });
    }
    return true;
  });
  return out.map(({ from, to }) => ({ from, to })).sort((a, b) => a.from - b.from || a.to - b.to);
}

// --- Page break (separate from the horizontal rule) ---------------------------
// Rendered as <hr data-page-break class="page-break">: Compile already treats <hr>
// as a break, so compiled output is unchanged; the editor draws it as a dashed line.

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'hr[data-page-break]', priority: 60 }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-page-break': 'true', class: 'page-break' })];
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => this.editor.commands.setPageBreak() };
  },
});

// --- Preserve Formatting block ---------------------------------------------------------
// <div data-preserve-format class="preserve-format">…paragraphs…</div>: Compile keeps the text
// verbatim (no replacements, quotes, dashes) and the block's own font, size and indents.

export const PreserveFormat = Node.create({
  name: 'preserveFormat',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-preserve-format]', priority: 60 }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-preserve-format': 'true', class: 'preserve-format' }), 0];
  },
  addCommands() {
    return {
      togglePreserveFormat:
        () =>
        ({ editor, commands }) =>
          editor.isActive(this.name) ? commands.lift(this.name) : commands.wrapIn(this.name),
    };
  },
});

// --- Image with width and alignment ----------------------------------------------

const ALIGN_CSS = {
  left: 'float: left; margin: 0 1em 0.5em 0',
  right: 'float: right; margin: 0 0 0.5em 1em',
  center: 'display: block; margin: 0.5em auto',
};

export const ScaledImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width') || (el.style.width || null),
        renderHTML: (a) => (a.width ? { width: a.width } : {}),
      },
      align: {
        default: null,
        parseHTML: (el) => (ALIGN_CSS[el.getAttribute('data-align')] ? el.getAttribute('data-align') : null),
        renderHTML: (a) => (ALIGN_CSS[a.align] ? { 'data-align': a.align, style: ALIGN_CSS[a.align] } : {}),
      },
    };
  },
  // Node view: the image inside a frame with resize handles (drag a corner, aspect ratio kept)
  // and a small toolbar while selected: wrap left / inline / center / wrap right, quick widths.
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let cur = node;
      const frame = document.createElement('span');
      frame.className = 'img-frame';
      frame.contentEditable = 'false';
      const img = document.createElement('img');
      frame.append(img);
      const bar = document.createElement('span');
      bar.className = 'img-bar';
      const tools = [
        ['⇤', 'Stânga, cu text în jur', { align: 'left' }],
        ['▭', 'În rând cu textul', { align: null }],
        ['☰', 'Centrată, pe rândul ei', { align: 'center' }],
        ['⇥', 'Dreapta, cu text în jur', { align: 'right' }],
        ['¼', 'Lățime 25%', { width: '25%' }],
        ['½', 'Lățime 50%', { width: '50%' }],
        ['¾', 'Lățime 75%', { width: '75%' }],
        ['1:1', 'Toată lățimea paginii', { width: '100%' }],
        ['⟲', 'Mărimea originală', { width: null }],
      ];
      for (const [label, title, attrs] of tools) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.title = title;
        b.setAttribute('aria-label', title);
        b.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!editor.isEditable || typeof getPos !== 'function') return;
          editor.chain().setNodeSelection(getPos()).updateAttributes('image', attrs).run();
        });
        bar.append(b);
      }
      frame.append(bar);
      const handles = ['nw', 'ne', 'sw', 'se'].map((corner) => {
        const h = document.createElement('span');
        h.className = `img-handle img-${corner}`;
        h.dataset.corner = corner;
        frame.append(h);
        return h;
      });
      const paint = () => {
        img.src = cur.attrs.src;
        img.alt = cur.attrs.alt || '';
        if (cur.attrs.title) img.title = cur.attrs.title;
        else img.removeAttribute('title');
        img.style.width = cur.attrs.width ? (/^\d+$/.test(String(cur.attrs.width)) ? `${cur.attrs.width}px` : cur.attrs.width) : '';
        frame.dataset.align = cur.attrs.align || '';
        frame.style.cssText = ALIGN_CSS[cur.attrs.align] || '';
        // A percentage width is relative to the page, so the frame takes it and the image fills the frame.
        if (cur.attrs.width && /%$/.test(String(cur.attrs.width))) {
          frame.style.width = cur.attrs.width;
          img.style.width = '100%';
        }
      };
      paint();
      // Drag a corner: new width in px from the pointer, capped at the text column.
      for (const h of handles) {
        h.addEventListener('pointerdown', (e) => {
          if (!editor.isEditable || typeof getPos !== 'function') return;
          e.preventDefault();
          e.stopPropagation();
          h.setPointerCapture(e.pointerId);
          const startX = e.clientX;
          const startW = img.getBoundingClientRect().width;
          const column = (editor.view.dom.clientWidth || startW) - 4;
          const dir = h.dataset.corner.endsWith('w') ? -1 : 1;
          let w = startW;
          const move = (ev) => {
            w = Math.round(Math.min(column, Math.max(32, startW + dir * (ev.clientX - startX))));
            frame.style.width = '';
            img.style.width = `${w}px`;
          };
          const up = () => {
            h.removeEventListener('pointermove', move);
            h.removeEventListener('pointerup', up);
            h.removeEventListener('pointercancel', up);
            if (Math.abs(w - startW) >= 2) editor.chain().setNodeSelection(getPos()).updateAttributes('image', { width: String(w) }).run();
          };
          h.addEventListener('pointermove', move);
          h.addEventListener('pointerup', up);
          h.addEventListener('pointercancel', up);
        });
      }
      return {
        dom: frame,
        update: (n) => {
          if (n.type !== cur.type) return false;
          cur = n;
          paint();
          return true;
        },
        selectNode: () => frame.classList.add('selected'),
        deselectNode: () => frame.classList.remove('selected'),
        stopEvent: (e) => Boolean(e.target && e.target.closest && e.target.closest('.img-bar, .img-handle')),
        ignoreMutation: () => true,
      };
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setImageFormat:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes('image', attrs),
    };
  },
});

// Character spacing (tracking) on the text style: <span style="letter-spacing: 0.1em">.
const SPACING_OK = /^-?\d*\.?\d+(em|px|pt)$/;
export const LetterSpacing = Extension.create({
  name: 'letterSpacing',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        letterSpacing: {
          default: null,
          parseHTML: (el) => (SPACING_OK.test(el.style.letterSpacing || '') ? el.style.letterSpacing : null),
          renderHTML: (a) => (a.letterSpacing && SPACING_OK.test(a.letterSpacing) ? { style: `letter-spacing: ${a.letterSpacing}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      setLetterSpacing:
        (v) =>
        ({ chain }) =>
          (v && SPACING_OK.test(v) ? chain().setMark('textStyle', { letterSpacing: v }).run() : chain().setMark('textStyle', { letterSpacing: null }).removeEmptyTextStyle().run()),
      unsetLetterSpacing:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { letterSpacing: null }).removeEmptyTextStyle().run(),
    };
  },
});

// Numbering formats of ordered lists beyond the marker type: 'paren' = "a)", 'legal' = "1.1.".
export const LIST_FORMATS = ['dot', 'paren', 'legal'];

export const ListStyle = Extension.create({
  name: 'listStyle',
  addGlobalAttributes() {
    return [{
      types: ['orderedList'],
      attributes: {
        listFormat: {
          default: null,
          parseHTML: (el) => (['paren', 'legal'].includes(el.getAttribute('data-list-format')) ? el.getAttribute('data-list-format') : null),
          renderHTML: (a) => (a.listFormat ? { 'data-list-format': a.listFormat, 'data-list-marker': a.type || '1' } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      // format: 'dot' | 'paren' | 'legal' (with an optional marker type) — creates the list if needed.
      setOrderedListFormat:
        (format, type) =>
        ({ editor, chain }) => {
          const c = chain();
          if (!editor.isActive('orderedList')) c.toggleOrderedList();
          const attrs = { listFormat: format === 'paren' || format === 'legal' ? format : null };
          if (type !== undefined) attrs.type = type === '1' ? null : type;
          if (format === 'legal') attrs.type = null;
          return c.updateAttributes('orderedList', attrs).run();
        },
      // type: '1' | 'a' | 'A' | 'i' | 'I' — creates an ordered list if needed.
      setOrderedListType:
        (type) =>
        ({ editor, chain }) => {
          const c = chain();
          if (!editor.isActive('orderedList')) c.toggleOrderedList();
          return c.updateAttributes('orderedList', { type: type === '1' ? null : type }).run();
        },
    };
  },
});
