// Writing aids for the editor: named styles, revision mode, linguistic focus,
// current-paragraph highlight and auto-complete. Toggled through editor.storage
// and commands so the UI can switch them without rebuilding the editor.
import { Extension, InputRule, Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { eventShortcut, isCharStyle, nextStyleId, styleForShortcut } from '../lib/styles.js';

export const REVISION_COLORS = ['#c62828', '#1565c0', '#2e7d32', '#6a1b9a', '#ef6c00'];

// --- Named styles ---------------------------------------------------------
// Paragraph styles: data-style on paragraphs/headings. Character styles: a mark.

export const ParagraphStyle = Extension.create({
  name: 'paragraphStyle',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          styleName: {
            default: null,
            parseHTML: (el) => el.getAttribute('data-style'),
            renderHTML: (attrs) => (attrs.styleName ? { 'data-style': attrs.styleName } : {}),
          },
        },
      },
    ];
  },
  // storage.styles: the project stylesheet (set by the Editor component), used for
  // "Next style" on Enter and per-style keyboard shortcuts.
  addStorage() {
    return { styles: [] };
  },
  addCommands() {
    return {
      setParagraphStyle:
        (name) =>
        ({ commands }) =>
          commands.updateAttributes(this.editor.isActive('heading') ? 'heading' : 'paragraph', { styleName: name || null }),
      applyNamedStyle:
        (id) =>
        ({ commands }) => {
          const st = this.storage.styles.find((x) => x.id === id);
          if (!st) return false;
          if (isCharStyle(st)) return !this.editor.state.selection.empty && commands.setCharStyle(id);
          return commands.setParagraphStyle(id);
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from, empty } = selection;
        if (!empty || !$from.parent.isTextblock || $from.parentOffset !== $from.parent.content.size) return false;
        if ($from.depth > 1 && $from.node(-1).type.name === 'listItem') return false;
        const cur = $from.parent.attrs.styleName;
        if (!cur) return false;
        const next = nextStyleId(this.storage.styles, cur);
        if (next === cur) return false;
        return editor
          .chain()
          .splitBlock()
          .command(({ tr }) => {
            const $p = tr.selection.$from;
            if (!('styleName' in $p.parent.attrs)) return true;
            tr.setNodeMarkup($p.before(), undefined, { ...$p.parent.attrs, styleName: next });
            return true;
          })
          .run();
      },
    };
  },
  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: new PluginKey('styleShortcuts'),
        props: {
          handleKeyDown(_view, e) {
            if (!(e.ctrlKey || e.metaKey || e.altKey)) return false;
            const st = styleForShortcut(ext.storage.styles, eventShortcut(e));
            if (!st) return false;
            e.preventDefault();
            ext.editor.commands.applyNamedStyle(st.id);
            return true;
          },
        },
      }),
    ];
  },
});

export const CharStyle = Mark.create({
  name: 'charStyle',
  addAttributes() {
    return { name: { default: null, parseHTML: (el) => el.getAttribute('data-char-style'), renderHTML: (a) => ({ 'data-char-style': a.name }) } };
  },
  parseHTML() {
    return [{ tag: 'span[data-char-style]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setCharStyle:
        (name) =>
        ({ commands }) =>
          name ? commands.setMark(this.name, { name }) : commands.unsetMark(this.name),
    };
  },
});

// --- Revision mode --------------------------------------------------------
// While on, every inserted text gets the revision mark of the current level.

export const Revision = Mark.create({
  name: 'revision',
  inclusive: true,
  addAttributes() {
    return {
      level: {
        default: 1,
        parseHTML: (el) => Number(el.getAttribute('data-revision')) || 1,
        renderHTML: (a) => ({ 'data-revision': a.level, style: `color: ${REVISION_COLORS[(a.level - 1) % 5]}` }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-revision]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'revision' }), 0];
  },
  addStorage() {
    return { level: 0 };
  },
  addCommands() {
    return {
      setRevisionLevel:
        (level) =>
        ({ editor }) => {
          editor.storage.revision.level = level;
          return true;
        },
      removeRevisions:
        (level) =>
        ({ tr, state, dispatch }) => {
          const type = state.schema.marks.revision;
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            for (const m of node.marks) {
              if (m.type === type && (!level || m.attrs.level === level)) tr.removeMark(pos, pos + node.nodeSize, m);
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: new PluginKey('revisionMode'),
        appendTransaction(transactions, _old, state) {
          const level = ext.editor.storage.revision.level;
          if (!level || !transactions.some((t) => t.docChanged && !t.getMeta('revision'))) return null;
          const type = state.schema.marks.revision;
          const tr = state.tr;
          for (const t of transactions) {
            t.steps.forEach((step, i) => {
              const map = t.mapping.slice(i + 1);
              step.getMap().forEach((_from, _to, newFrom, newTo) => {
                if (newTo > newFrom) tr.addMark(map.map(newFrom, -1), map.map(newTo), type.create({ level }));
              });
            });
          }
          tr.setMeta('revision', true);
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});

// --- Linguistic focus and current paragraph -------------------------------

const focusKey = new PluginKey('writingFocus');

function dialogueRanges(text) {
  const out = [];
  // „…” quotes, and paragraphs that start with a dialogue dash
  for (const m of text.matchAll(/„[^”]*”|«[^»]*»|"[^"]*"/g)) out.push([m.index, m.index + m[0].length]);
  if (/^\s*[—–-]\s/.test(text)) out.push([0, text.length]);
  return out;
}

export const WritingFocus = Extension.create({
  name: 'writingFocus',
  addStorage() {
    return { mode: 'off', currentParagraph: false }; // mode: off | dialogue | paragraph | sentence
  },
  addCommands() {
    return {
      setFocusMode:
        (mode) =>
        ({ editor, tr, dispatch }) => {
          editor.storage.writingFocus.mode = mode;
          if (dispatch) dispatch(tr.setMeta(focusKey, true));
          return true;
        },
      setCurrentParagraphHighlight:
        (on) =>
        ({ editor, tr, dispatch }) => {
          editor.storage.writingFocus.currentParagraph = on;
          if (dispatch) dispatch(tr.setMeta(focusKey, true));
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: focusKey,
        props: {
          decorations(state) {
            const { mode, currentParagraph } = ext.editor.storage.writingFocus;
            if (mode === 'off' && !currentParagraph) return null;
            const decos = [];
            const sel = state.selection.from;
            state.doc.descendants((node, pos) => {
              if (!node.isTextblock) return true;
              const inside = sel >= pos && sel <= pos + node.nodeSize;
              if (currentParagraph && inside) decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'current-paragraph' }));
              if (mode === 'paragraph' && !inside) decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'faded' }));
              if (mode === 'sentence') {
                if (!inside) decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'faded' }));
                else {
                  const text = node.textContent;
                  const offset = sel - pos - 1;
                  const bounds = [...text.matchAll(/[^.!?…]+[.!?…]*\s*/g)].map((m) => [m.index, m.index + m[0].length]);
                  for (const [a, b] of bounds) {
                    if (offset >= a && offset <= b) continue;
                    decos.push(Decoration.inline(pos + 1 + a, pos + 1 + b, { class: 'faded' }));
                  }
                }
              }
              if (mode === 'dialogue') {
                const text = node.textContent;
                const keep = dialogueRanges(text);
                let last = 0;
                for (const [a, b] of keep) {
                  if (a > last) decos.push(Decoration.inline(pos + 1 + last, pos + 1 + a, { class: 'faded' }));
                  last = b;
                }
                if (last < text.length) decos.push(Decoration.inline(pos + 1 + last, pos + 1 + text.length, { class: 'faded' }));
              }
              return false;
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

// --- Auto-complete ----------------------------------------------------------
// Ghost completion for words from the project (names, keywords). Tab accepts.

const acKey = new PluginKey('autocomplete');

export const AutoComplete = Extension.create({
  name: 'autoComplete',
  addOptions() {
    return { getWords: () => [] };
  },
  addProseMirrorPlugins() {
    const ext = this;
    const suggestionFor = (state) => {
      const { $from, empty } = state.selection;
      if (!empty || !$from.parent.isTextblock) return null;
      // Only the end of the paragraph matters: a bounded window keeps typing fast in huge paragraphs.
      const before = $from.parent.textBetween(Math.max(0, $from.parentOffset - 256), $from.parentOffset, undefined, '￼');
      const m = /([\p{L}][\p{L}\p{M}'’-]{2,})$/u.exec(before);
      if (!m) return null;
      const after = $from.parent.textBetween($from.parentOffset, Math.min($from.parent.content.size, $from.parentOffset + 64), undefined, '￼');
      if (/^[\p{L}]/u.test(after)) return null;
      const prefix = m[1];
      const low = prefix.toLocaleLowerCase('ro');
      const word = ext.options.getWords().find((w) => w.length > prefix.length && w.toLocaleLowerCase('ro').startsWith(low));
      return word ? { rest: word.slice(prefix.length), pos: $from.pos } : null;
    };
    return [
      new Plugin({
        key: acKey,
        props: {
          decorations(state) {
            const s = suggestionFor(state);
            if (!s) return null;
            const el = document.createElement('span');
            el.className = 'ghost-completion';
            el.textContent = s.rest;
            return DecorationSet.create(state.doc, [Decoration.widget(s.pos, el, { side: 1 })]);
          },
          handleKeyDown(view, event) {
            if (event.key !== 'Tab' || event.shiftKey) return false;
            const s = suggestionFor(view.state);
            if (!s) return false;
            event.preventDefault();
            view.dispatch(view.state.tr.insertText(s.rest, s.pos));
            return true;
          },
        },
      }),
    ];
  },
});

// Words for auto-complete: titles from the Research folder, keywords and
// capitalised words that appear at least 3 times in the project.
// Capitalised-word counts per document, recomputed only when that document's HTML changes,
// so typing in one document does not rescan the whole project on every keystroke.
const capsCache = new Map(); // doc id -> { html, caps: Map<word, count> }
function capsOf(id, html) {
  const hit = capsCache.get(id);
  if (hit && hit.html === html) return hit.caps;
  const caps = new Map();
  // capitalised words inside a sentence (after a letter or comma), so sentence starts don't count
  for (const m of (html || '').replace(/<[^>]+>/g, ' ').matchAll(/(?<=[\p{L},;]\s)(\p{Lu}[\p{Ll}\p{M}]{3,})/gu)) caps.set(m[1], (caps.get(m[1]) || 0) + 1);
  capsCache.set(id, { html, caps });
  return caps;
}

export function projectWords(project, docs) {
  const words = new Map();
  const add = (w, weight) => {
    const k = w.trim();
    if (k.length < 4 || k.length > 40) return;
    words.set(k, (words.get(k) || 0) + weight);
  };
  const walk = (nodes, research) =>
    nodes.forEach((n) => {
      // "Personaj: Andrei Popescu" -> Andrei, Popescu (the label before ":" is skipped)
      if (research && !n.root) for (const part of n.title.split(':').pop().split(/[—–,]/)) for (const w of part.split(/\s+/)) if (/^\p{Lu}/u.test(w)) add(w, 10);
      (n.keywords || []).forEach((k) => add(k, 10));
      if (n.children) walk(n.children, research || n.root === 'research');
    });
  walk(project.tree, false);
  for (const k of project.keywordDefs || []) add(k.name, 10);
  const counts = new Map();
  for (const [id, html] of Object.entries(docs)) for (const [w, c] of capsOf(id, html)) counts.set(w, (counts.get(w) || 0) + c);
  for (const [w, c] of counts) if (c >= 3) add(w, c);
  return [...words.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
}

// --- [[Title]] internal links ------------------------------------------------
// Typing "[[Title]]" links the text to the project document with that title (exact title first,
// then the only title that starts with it, case- and diacritics-insensitive). With no match the
// typed text stays as written, so nothing is lost.
const foldTitle = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ro').replace(/\s+/g, ' ').trim();

export function findLinkTarget(targets, text) {
  const q = foldTitle(text);
  if (!q) return null;
  const list = (targets || []).filter((t) => t && t.id);
  const exact = list.filter((t) => foldTitle(t.title) === q);
  if (exact.length) return exact[0];
  const starts = list.filter((t) => foldTitle(t.title).startsWith(q));
  return starts.length === 1 ? starts[0] : null;
}

/**
 * Turns the plain "[[label]]" typed at `from` into a link to document `id`. Returns false
 * when the text there changed meanwhile (undo, more typing), leaving it untouched.
 */
export function resolveWikiLink(editor, from, label, id) {
  const { state } = editor;
  if (from < 0 || from >= state.doc.content.size) return false;
  const text = state.doc.textBetween(from, Math.min(state.doc.content.size, from + 210), '\n');
  const m = /^\[\[([^[\]\n]{1,200})\]\]/.exec(text);
  if (!m || m[1].trim() !== label) return false;
  const linkType = state.schema.marks.link;
  const mark = linkType.create({ href: `scribner://doc/${id}`, class: 'internal-link' });
  editor.view.dispatch(state.tr.replaceWith(from, from + m[0].length, state.schema.text(label, [mark])).removeStoredMark(linkType));
  return true;
}

export const WikiLink = Extension.create({
  name: 'wikiLink',
  addOptions() {
    // onMissing(label, from): no document has that title; the typed "[[label]]" stays as text
    // starting at `from` and the editor can offer to create the document (resolveWikiLink).
    return { getTargets: () => [], onMissing: null };
  },
  addInputRules() {
    const getTargets = this.options.getTargets;
    const onMissing = this.options.onMissing;
    return [
      new InputRule({
        find: /\[\[([^[\]\n]{1,200})\]\]$/,
        handler: ({ state, range, match }) => {
          const target = findLinkTarget(getTargets(), match[1]);
          const linkType = state.schema.marks.link;
          if (!linkType) return null;
          if (!target) {
            const label = match[1].trim();
            if (label && onMissing) setTimeout(() => onMissing(label, range.from), 0);
            return null;
          }
          const label = match[1].trim();
          const mark = linkType.create({ href: `scribner://doc/${target.id}`, class: 'internal-link' });
          state.tr.replaceWith(range.from, range.to, state.schema.text(label, [mark])).removeStoredMark(linkType);
          return undefined;
        },
      }),
    ];
  },
});
