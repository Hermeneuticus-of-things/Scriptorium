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

export function buildExtensions({ placeholder = 'Începe să scrii…', smartQuotes = true } = {}) {
  const ext = [
    StarterKit.configure({ link: { openOnClick: false, protocols: ['scribner', 'scriptorium'] } }),
    Placeholder.configure({ placeholder }),
    Comment,
    Footnote,
    Annotation,
    UnsupportedImage,
    Image.configure({ allowBase64: true, inline: true }),
    TableKit.configure({ table: { resizable: false } }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    Superscript,
    Subscript,
  ];
  if (smartQuotes) {
    ext.push(
      Typography.configure({
        openDoubleQuote: '„',
        closeDoubleQuote: '”',
        openSingleQuote: '«',
        closeSingleQuote: '»',
        emDash: '—',
        ellipsis: '…',
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
