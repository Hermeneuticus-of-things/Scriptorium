// Editing options (Options → Editing): closing brackets and quotes typed automatically,
// whole-word selection when dragging, a wider / steady caret, default formatting for pasted
// text and revision-mode deletions kept as struck-through text in the round's colour.
import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Fragment, Slice } from '@tiptap/pm/model';
import { smartQuote, QUOTE_STYLES, SINGLE_QUOTE_STYLES } from './corrections.js';
import { wordBounds } from './formatting.js';

const PAIRS = { '(': ')', '[': ']', '{': '}' };
const WORDCH = /[\p{L}\p{N}\p{M}_]/u;

/**
 * What typing `ch` does with auto-pairing, given the text before and after the cursor:
 * { insert, cursor } (cursor = offset inside insert) or { skip: true } to step over the
 * closing character already there, or null for normal typing.
 */
export function autoPairFor(before, after, ch, { brackets = true, quotes = true, smart = true, double = 'ro', single = 'ro' } = {}) {
  const next = String(after ?? '').slice(0, 1);
  if (brackets && PAIRS[ch]) {
    if (next && WORDCH.test(next)) return null;
    return { insert: ch + PAIRS[ch], cursor: 1 };
  }
  if (brackets && Object.values(PAIRS).includes(ch) && next === ch) return { skip: true };
  if (quotes && (ch === '"' || ch === "'")) {
    const q = smart ? smartQuote(before, ch, double, single) : ch;
    const pair = ch === '"' ? QUOTE_STYLES[smart ? double : 'straight'] || QUOTE_STYLES.ro : SINGLE_QUOTE_STYLES[smart ? single : 'straight'] || SINGLE_QUOTE_STYLES.ro;
    if (next === pair[1] && q !== pair[0]) return { skip: true };
    if (next === q && pair[0] === pair[1]) return { skip: true };
    const prev = String(before ?? '').slice(-1);
    const opening = q === pair[0] && (pair[0] !== pair[1] || !prev || /[\s([{]/u.test(prev));
    if (opening && !(next && WORDCH.test(next))) return { insert: pair[0] + pair[1], cursor: pair[0].length };
    return smart && q !== ch ? { insert: q, cursor: q.length } : null;
  }
  return null;
}

/** Strips direct formatting from pasted content (fonts, sizes, colours, paragraph layout). */
const DROP_MARKS = new Set(['textStyle', 'highlight', 'charStyle', 'smallCaps', 'allCaps']);
const KEEP_ATTRS = new Set(['level', 'script', 'start', 'order', 'colspan', 'rowspan', 'src', 'alt', 'href', 'id', 'note']);
export function plainFormatFragment(fragment) {
  const nodes = [];
  fragment.forEach((node) => {
    if (node.isText) {
      nodes.push(node.mark(node.marks.filter((m) => !DROP_MARKS.has(m.type.name))));
      return;
    }
    let attrs = node.attrs;
    if (node.isTextblock) {
      attrs = {};
      for (const [k, v] of Object.entries(node.attrs)) if (KEEP_ATTRS.has(k)) attrs[k] = v;
    }
    nodes.push(node.type.create(attrs, node.isLeaf ? null : plainFormatFragment(node.content), node.marks.filter((m) => !DROP_MARKS.has(m.type.name))));
  });
  return Fragment.fromArray(nodes);
}

// Struck-through text deleted in revision mode.
export const RevisionDeletion = Mark.create({
  name: 'revisionDel',
  inclusive: false,
  excludes: '',
  addAttributes() {
    return {
      level: {
        default: 1,
        parseHTML: (el) => Number(el.getAttribute('data-revision-del')) || 1,
        renderHTML: (a) => ({ 'data-revision-del': a.level }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 's[data-revision-del]', priority: 1000 }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['s', mergeAttributes(HTMLAttributes, { class: 'revision-del' }), 0];
  },
  addCommands() {
    return {
      // Accepts the deletions: the struck text goes away (level 0 = every round).
      acceptRevisionDeletions:
        (level = 0) =>
        ({ state, tr, dispatch }) => {
          const type = state.schema.marks.revisionDel;
          const ranges = [];
          state.doc.descendants((node, pos) => {
            if (node.isText && node.marks.some((m) => m.type === type && (!level || m.attrs.level === level))) ranges.push([pos, pos + node.nodeSize]);
          });
          for (const [a, b] of ranges.reverse()) tr.delete(a, b);
          if (dispatch) dispatch(tr.setMeta('revision', true));
          return ranges.length > 0;
        },
    };
  },
});

const pairKey = new PluginKey('autoPair');
const dragKey = new PluginKey('dragSelectWords');
const caretKey = new PluginKey('customCaret');
const revDelKey = new PluginKey('revisionDeletions');

function textAround(state, pos) {
  const $p = state.doc.resolve(pos);
  if (!$p.parent.isTextblock) return null;
  const before = $p.parent.textBetween(Math.max(0, $p.parentOffset - 256), $p.parentOffset, undefined, '￼');
  const after = $p.parent.textBetween($p.parentOffset, Math.min($p.parent.content.size, $p.parentOffset + 4), undefined, '￼');
  return { before, after, code: Boolean($p.parent.type.spec.code) };
}

/** Text range one word-boundary-aligned position (in a textblock) for drag selection. */
function wordEdge(doc, pos, forward) {
  const $p = doc.resolve(pos);
  if (!$p.parent.isTextblock) return pos;
  const text = $p.parent.textBetween(0, $p.parent.content.size, undefined, '￼');
  const [a, b] = wordBounds(text, $p.parentOffset);
  if (a === b) return pos;
  return $p.start() + (forward ? b : a);
}

/** Deletion range for Backspace/Delete with an empty selection (one character). */
function charRange(state, back) {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return null;
  if (back) return $from.parentOffset > 0 ? [$from.pos - 1, $from.pos] : null;
  return $from.parentOffset < $from.parent.content.size ? [$from.pos, $from.pos + 1] : null;
}

/**
 * Marks [from, to) as deleted in revision `level` instead of removing it. Text inserted in the
 * same round (revision mark of that level) is really deleted, as nothing was there before.
 */
export function strikeRange(state, from, to, level) {
  const tr = state.tr;
  const del = state.schema.marks.revisionDel;
  const rev = state.schema.marks.revision;
  if (!del) return null;
  const own = [];
  const strike = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return true;
    const a = Math.max(from, pos);
    const b = Math.min(to, pos + node.nodeSize);
    if (rev && node.marks.some((m) => m.type === rev && m.attrs.level === level)) own.push([a, b]);
    else if (!node.marks.some((m) => m.type === del)) strike.push([a, b]);
    return false;
  });
  for (const [a, b] of strike) tr.addMark(a, b, del.create({ level }));
  for (const [a, b] of own.reverse()) tr.delete(a, b);
  return tr.setMeta('revision', true);
}

export const EditingOptions = Extension.create({
  name: 'editingOptions',
  // Before the input rules (corrections, quotes), so a typed bracket or quote is handled once.
  priority: 1001,
  addOptions() {
    return { quoteStyle: 'ro', singleQuoteStyle: 'ro', smartQuotes: true, autoPairBrackets: false, autoPairQuotes: false, dragSelectWords: false, pasteDefaultFormat: false, revisionStrikeDeletions: false, caret: false };
  },
  addProseMirrorPlugins() {
    const o = this.options;
    const ext = this;
    const plugins = [];
    if (o.autoPairBrackets || o.autoPairQuotes) {
      plugins.push(
        new Plugin({
          key: pairKey,
          props: {
            handleTextInput(view, from, to, text) {
              if (text.length !== 1 || view.composing) return false;
              const ctx = textAround(view.state, from);
              if (!ctx || ctx.code) return false;
              const after = from === to ? ctx.after : '';
              const r = autoPairFor(ctx.before, after, text, { brackets: o.autoPairBrackets, quotes: o.autoPairQuotes, smart: o.smartQuotes, double: o.quoteStyle, single: o.singleQuoteStyle });
              if (!r) return false;
              const tr = view.state.tr;
              if (r.skip) tr.setSelection(TextSelection.create(tr.doc, from + 1));
              else {
                tr.insertText(r.insert, from, to);
                tr.setSelection(TextSelection.create(tr.doc, from + r.cursor));
              }
              view.dispatch(tr.scrollIntoView());
              return true;
            },
            handleKeyDown(view, event) {
              // Backspace between an empty pair removes both characters.
              if (event.key !== 'Backspace' || !view.state.selection.empty) return false;
              const { from } = view.state.selection;
              const ctx = textAround(view.state, from);
              if (!ctx) return false;
              const open = ctx.before.slice(-1);
              const close = ctx.after.slice(0, 1);
              const pairs = { ...PAIRS, '„': '”', '“': '”', '«': '»', '‚': '’', '‘': '’', '‹': '›', '"': '"' };
              if (!open || pairs[open] !== close) return false;
              view.dispatch(view.state.tr.delete(from - 1, from + 1));
              return true;
            },
          },
        }),
      );
    }
    if (o.dragSelectWords) {
      let dragging = false;
      plugins.push(
        new Plugin({
          key: dragKey,
          props: {
            handleDOMEvents: {
              mousedown(_view, e) {
                dragging = e.button === 0 && e.detail === 1 && !e.shiftKey;
                const stop = () => {
                  dragging = false;
                  window.removeEventListener('mouseup', stop, true);
                };
                if (dragging) window.addEventListener('mouseup', stop, true);
                return false;
              },
            },
          },
          appendTransaction(trs, _old, state) {
            if (!dragging || !trs.some((t) => t.selectionSet && t.getMeta('pointer'))) return null;
            const sel = state.selection;
            if (sel.empty || !(sel instanceof TextSelection)) return null;
            const fwd = sel.head > sel.anchor;
            const anchor = wordEdge(state.doc, sel.anchor, !fwd);
            const head = wordEdge(state.doc, sel.head, fwd);
            if (anchor === sel.anchor && head === sel.head) return null;
            return state.tr.setSelection(TextSelection.create(state.doc, anchor, head));
          },
        }),
      );
    }
    if (o.caret) {
      plugins.push(
        new Plugin({
          key: caretKey,
          state: {
            init: () => false,
            apply: (tr, focused) => {
              const m = tr.getMeta(caretKey);
              return m === undefined ? focused : m;
            },
          },
          props: {
            attributes: { class: 'custom-caret-on' },
            handleDOMEvents: {
              focus: (view) => {
                view.dispatch(view.state.tr.setMeta(caretKey, true));
                return false;
              },
              blur: (view) => {
                view.dispatch(view.state.tr.setMeta(caretKey, false));
                return false;
              },
            },
            decorations(state) {
              if (!caretKey.getState(state) || !state.selection.empty) return null;
              const el = document.createElement('span');
              el.className = 'custom-caret';
              el.setAttribute('aria-hidden', 'true');
              return DecorationSet.create(state.doc, [Decoration.widget(state.selection.head, el, { side: 1, key: 'caret', marks: [] })]);
            },
          },
        }),
      );
    }
    if (o.pasteDefaultFormat) {
      plugins.push(
        new Plugin({
          key: new PluginKey('pasteDefaultFormat'),
          props: {
            transformPasted(slice) {
              try {
                return new Slice(plainFormatFragment(slice.content), slice.openStart, slice.openEnd);
              } catch {
                return slice;
              }
            },
          },
        }),
      );
    }
    if (o.revisionStrikeDeletions) {
      const level = () => ext.editor?.storage?.revision?.level || 0;
      plugins.push(
        new Plugin({
          key: revDelKey,
          props: {
            handleKeyDown(view, event) {
              const lv = level();
              if (!lv || (event.key !== 'Backspace' && event.key !== 'Delete') || event.ctrlKey || event.metaKey || event.altKey) return false;
              const { state } = view;
              const back = event.key === 'Backspace';
              const range = state.selection.empty ? charRange(state, back) : [state.selection.from, state.selection.to];
              if (!range) return false;
              const tr = strikeRange(state, range[0], range[1], lv);
              if (!tr) return false;
              const pos = tr.mapping.map(back ? range[0] : range[1], back ? -1 : 1);
              tr.setSelection(TextSelection.create(tr.doc, Math.min(pos, tr.doc.content.size)));
              view.dispatch(tr.scrollIntoView());
              event.preventDefault();
              return true;
            },
            handleTextInput(view, from, to, text) {
              const lv = level();
              if (!lv || from === to) return false;
              // Typing over a selection: the old text stays struck, the new one follows it.
              const tr = strikeRange(view.state, from, to, lv);
              if (!tr) return false;
              const at = tr.mapping.map(to, 1);
              tr.insertText(text, at);
              tr.setSelection(TextSelection.create(tr.doc, at + text.length));
              tr.setMeta('revision', false);
              view.dispatch(tr);
              return true;
            },
          },
        }),
      );
    }
    return plugins;
  },
});

// Inline style properties that make up direct formatting (removed by "convert to default").
const FORMAT_PROPS = ['font-family', 'font-size', 'line-height', 'text-align', 'text-indent', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'padding-left', 'color', 'background-color'];

/**
 * Removes direct formatting from a document's HTML (fonts, sizes, line spacing, alignment,
 * indents, colours), keeping bold/italic, styles, comments, footnotes and revisions. Spans left
 * without attributes are unwrapped. Used by Options → Editing → Formatting to convert the whole
 * project to the default formatting.
 */
export function resetFormattingHtml(html, doc = typeof document !== 'undefined' ? document : null) {
  if (!html || !doc) return html || '';
  const box = doc.createElement('div');
  box.innerHTML = html;
  for (const el of [...box.querySelectorAll('[style]')]) {
    for (const p of FORMAT_PROPS) el.style.removeProperty(p);
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  }
  for (const el of [...box.querySelectorAll('[align]')]) el.removeAttribute('align');
  for (const el of [...box.querySelectorAll('font')]) el.replaceWith(...el.childNodes);
  for (const el of [...box.querySelectorAll('span')]) if (!el.attributes.length) el.replaceWith(...el.childNodes);
  return box.innerHTML;
}

/** Nearest scrollable ancestor of an element (the editor pane). */
function scrollParent(el) {
  for (let p = el; p && p !== document.body; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/**
 * Typewriter scrolling: keeps the line with the cursor at `percent` of the editor's height
 * (Options → Editing; 50 = the middle).
 */
export function typewriterScroll(view, percent = 50) {
  try {
    const pct = Math.min(90, Math.max(10, Number(percent) || 50)) / 100;
    const box = scrollParent(view.dom);
    if (!box) {
      const { node } = view.domAtPos(view.state.selection.from);
      (node.nodeType === 1 ? node : node.parentElement)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const caret = view.coordsAtPos(view.state.selection.head);
    const rect = box.getBoundingClientRect();
    const delta = (caret.top + caret.bottom) / 2 - (rect.top + rect.height * pct);
    if (Math.abs(delta) > 2) box.scrollBy({ top: delta, behavior: 'smooth' });
  } catch {
    /* the view may be gone */
  }
}
