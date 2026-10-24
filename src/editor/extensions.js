import { ScriptMode } from '../extensions/ScriptMode.js';
import { Extension, InputRule, Mark, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Typography } from '@tiptap/extension-typography';
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { LinguisticFocus } from '../extensions/LinguisticFocus.js';
import { Corrections } from './corrections.js';
import { Invisibles } from './invisibles.js';
import { AllCaps, Bookmark, ListStyle, PageBreak, ParagraphFormat, ScaledImage, SmallCaps } from './formatting.js';
import { LineHighlight } from './lineHighlight.js';
import { AutoComplete, CharStyle, ParagraphStyle, Revision, WikiLink, WritingFocus } from './writing.js';

// Comment attached to a text range: <span data-comment="text" class="comment">…</span>
export const Comment = Mark.create({
  name: 'comment',
  inclusive: false,
  addAttributes() {
    return {
      comment: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-comment') || '',
        renderHTML: (attrs) => ({ 'data-comment': attrs.comment, title: attrs.comment }),
      },
      // Inspector metadata: data-comment-color/-author/-date (legacy data-color/data-author still read).
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-color') || el.getAttribute('data-color'),
        renderHTML: (attrs) => (attrs.color ? { 'data-comment-color': attrs.color, style: `--comment-color: ${attrs.color}; background-color: color-mix(in srgb, ${attrs.color} 25%, transparent)` } : {}),
      },
      author: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-author') || el.getAttribute('data-author'),
        renderHTML: (attrs) => (attrs.author ? { 'data-comment-author': attrs.author } : {}),
      },
      date: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-date'),
        renderHTML: (attrs) => (attrs.date ? { 'data-comment-date': attrs.date } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-comment]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'comment' }), 0];
  },
  addCommands() {
    return {
      setComment:
        (comment) =>
        ({ commands }) =>
          commands.setMark(this.name, { comment }),
      unsetComment:
        () =>
        ({ chain }) =>
          chain().extendMarkRange(this.name).unsetMark(this.name).run(),
    };
  },
});

// Footnote marker: inline atom <span data-footnote="text" class="footnote"></span>,
// numbered with a CSS counter in the editor and turned into real notes at Compile.
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-footnote') || '',
        renderHTML: (attrs) => ({ 'data-footnote': attrs.text, title: attrs.text }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-footnote]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'footnote' })];
  },
  addCommands() {
    return {
      insertFootnote:
        (text) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { text } }),
    };
  },
});

// Linked footnote (Scrivener "linked footnote"): a mark over the anchor text,
// <span data-linked-footnote="note" class="linked-footnote">anchor</span>.
export const LinkedFootnote = Mark.create({
  name: 'linkedFootnote',
  inclusive: false,
  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-linked-footnote') || '',
        renderHTML: (attrs) => ({ 'data-linked-footnote': attrs.text, title: attrs.text }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-linked-footnote]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'linked-footnote' }), 0];
  },
  addCommands() {
    return {
      setLinkedFootnote:
        (text) =>
        ({ commands }) =>
          commands.setMark(this.name, { text }),
    };
  },
});

// Inline annotation (Scrivener "inline annotation"): a note inside the text that never compiles.
export const Annotation = Node.create({
  name: 'annotation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-annotation') || '',
        renderHTML: (attrs) => ({ 'data-annotation': attrs.text, title: attrs.text }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-annotation]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'annotation' }), node.attrs.text];
  },
  addCommands() {
    return {
      insertAnnotation:
        (text) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { text } }),
    };
  },
});

// Images the editor cannot display (EMF/WMF/PICT from Word/Scrivener): kept byte-for-byte.
export const UnsupportedImage = Node.create({
  name: 'unsupportedImage',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { data: { default: '', parseHTML: (el) => el.getAttribute('data-unsupported-image') || '', renderHTML: (a) => ({ 'data-unsupported-image': a.data }) } };
  },
  parseHTML() {
    return [{ tag: 'span[data-unsupported-image]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'unsupported-image', title: 'Imagine EMF/WMF păstrată (nu poate fi afișată)' })];
  },
});

// TextStyle claims every <span style>; spans owned by other marks (comment colour,
// revision colour) would otherwise gain an empty extra <span> on each reload.
const OWN_SPANS = '[data-comment],[data-revision],[data-caps],[data-bookmark],[data-linked-footnote]';
const ScopedTextStyle = TextStyle.extend({
  parseHTML() {
    return [{ tag: 'span', consuming: false, getAttrs: (el) => (el.hasAttribute('style') && !el.matches(OWN_SPANS) ? {} : false) }];
  },
});

// Romanian smart quotes: " → „ / ” and ' → « / » (nested) or ’ (apostrophe).
// Typography's quote rules only open after whitespace or ASCII brackets, so they closed
// quotes after an em-dash („—"Vino" → —”Vino”) or after „ (nested « became »), and turned
// every in-word apostrophe (O'Brien, l'a) into ».
const QUOTE_OPENER = /[\s([{<„“‘«—–\-\/]/u;
/** Replacement for a typed " or ' given the block text before the cursor. */
export function romanianQuote(before, ch) {
  const prev = before.slice(-1);
  const opens = prev === '' || QUOTE_OPENER.test(prev);
  if (ch === '"') return opens ? '„' : '”';
  if (opens) return '«';
  // Close a pending « (one without a matching » after it); otherwise it is an apostrophe.
  return before.lastIndexOf('«') > before.lastIndexOf('»') ? '»' : '’';
}

export const RomanianQuotes = Extension.create({
  name: 'romanianQuotes',
  addInputRules() {
    return [
      new InputRule({
        find: /["']$/,
        handler: ({ state, range, match }) => {
          const $from = state.doc.resolve(range.from);
          if ($from.parent.type.spec.code || $from.marks().some((m) => m.type.spec.code)) return null;
          const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
          state.tr.insertText(romanianQuote(before, match[0]), range.from, range.to);
          return undefined;
        },
      }),
    ];
  },
});

// Redo keys always consume the event. prosemirror-keymap retries a shifted letter without
// Shift when the handler returns false, so Mod-Shift-z with an empty redo stack fell back to
// Mod-z and UNDID the last edit whenever the key arrived as lowercase "z" (Caps Lock on, or
// Cmd+Shift+Z on macOS).
export const RedoKeys = Extension.create({
  name: 'redoKeys',
  priority: 1000,
  addKeyboardShortcuts() {
    const redo = () => {
      this.editor.commands.redo();
      return true;
    };
    return { 'Shift-Mod-z': redo, 'Mod-y': redo };
  },
});

export function buildExtensions({ placeholder = 'Începe să scrii…', smartQuotes = true, getWords = () => [], getScriptFormat = () => null, getCharacters = () => [], getSceneHeadings = () => [], getLinkTargets = () => [], corrections = null, showInvisibles = false } = {}) {
  // corrections: {smartDashes, smartEllipsis, autoCapitalize, replacements}; null keeps the
  // historical behaviour (dashes/ellipsis only through Typography when smartQuotes is on).
  const corr = corrections ? { smartDashes: true, smartEllipsis: true, autoCapitalize: false, smartFractions: false, replacements: [], ...corrections } : null;
  const ext = [
    RedoKeys,
    ParagraphStyle,
    CharStyle,
    Revision,
    WritingFocus,
    AutoComplete.configure({ getWords }),
    WikiLink.configure({ getTargets: getLinkTargets }),
    StarterKit.configure({ link: { openOnClick: false, protocols: ['scribner', 'scriptorium'] } }),
    Placeholder.configure({ placeholder }),
    Comment,
    Footnote,
    LinkedFootnote,
    Annotation,
    LinguisticFocus,
    ScriptMode.configure({ getFormat: getScriptFormat, getCharacters, getSceneHeadings }),
    UnsupportedImage,
    ScaledImage.configure({ allowBase64: true, inline: true }),
    TableKit.configure({ table: { resizable: false } }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    ScopedTextStyle,
    Color,
    FontFamily,
    FontSize,
    SmallCaps,
    AllCaps,
    Bookmark,
    PageBreak,
    ParagraphFormat,
    ListStyle,
    LineHighlight,
    Superscript,
    Subscript,
    Invisibles.configure({ enabled: showInvisibles }),
  ];
  if (corr) ext.push(Corrections.configure(corr));
  if (smartQuotes) {
    ext.push(
      RomanianQuotes,
      Typography.configure({
        // Quotes come from RomanianQuotes.
        openDoubleQuote: false,
        closeDoubleQuote: false,
        openSingleQuote: false,
        closeSingleQuote: false,
        // With explicit corrections, dashes/ellipsis are handled by the Corrections extension.
        emDash: corr ? false : '—',
        ellipsis: corr ? false : '…',
        // Rules that would change ordinary Romanian text unexpectedly.
        laquo: false,
        raquo: false,
        multiplication: false,
        oneHalf: false,
        oneQuarter: false,
        threeQuarters: false,
        superscriptTwo: false,
        superscriptThree: false,
      }),
    );
  }
  return ext;
}
