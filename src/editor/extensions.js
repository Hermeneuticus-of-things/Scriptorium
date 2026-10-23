import { ScriptMode } from '../extensions/ScriptMode.js';
import { Mark, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Typography } from '@tiptap/extension-typography';
import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { LinguisticFocus } from '../extensions/LinguisticFocus.js';
import { Corrections } from './corrections.js';
import { Invisibles } from './invisibles.js';
import { AutoComplete, CharStyle, ParagraphStyle, Revision, WritingFocus } from './writing.js';

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
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-color'),
        renderHTML: (attrs) => (attrs.color ? { 'data-color': attrs.color, style: `--comment-color: ${attrs.color}` } : {}),
      },
      author: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-author'),
        renderHTML: (attrs) => (attrs.author ? { 'data-author': attrs.author } : {}),
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

export function buildExtensions({ placeholder = 'Începe să scrii…', smartQuotes = true, getWords = () => [], getScriptFormat = () => null, getCharacters = () => [], corrections = null, showInvisibles = false } = {}) {
  // corrections: {smartDashes, smartEllipsis, autoCapitalize, replacements}; null keeps the
  // historical behaviour (dashes/ellipsis only through Typography when smartQuotes is on).
  const corr = corrections ? { smartDashes: true, smartEllipsis: true, autoCapitalize: false, replacements: [], ...corrections } : null;
  const ext = [
    ParagraphStyle,
    CharStyle,
    Revision,
    WritingFocus,
    AutoComplete.configure({ getWords }),
    StarterKit.configure({ link: { openOnClick: false, protocols: ['scribner', 'scriptorium'] } }),
    Placeholder.configure({ placeholder }),
    Comment,
    Footnote,
    LinkedFootnote,
    Annotation,
    LinguisticFocus,
    ScriptMode.configure({ getFormat: getScriptFormat, getCharacters }),
    UnsupportedImage,
    Image.configure({ allowBase64: true, inline: true }),
    TableKit.configure({ table: { resizable: false } }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    Superscript,
    Subscript,
    Invisibles.configure({ enabled: showInvisibles }),
  ];
  if (corr) ext.push(Corrections.configure(corr));
  if (smartQuotes) {
    ext.push(
      Typography.configure({
        openDoubleQuote: '„',
        closeDoubleQuote: '”',
        openSingleQuote: '«',
        closeSingleQuote: '»',
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
