import React, { forwardRef, useImperativeHandle } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { getHTMLFromFragment } from '@tiptap/core';
import { buildExtensions } from '../editor/extensions.js';
import { textToHtml } from '../lib/text.js';

const Editor = forwardRef(function Editor(
  { html, title, readOnly, typewriter, smartQuotes = true, compact = false, onChange, onFocus, onTitleClick },
  ref,
) {
  const editor = useEditor(
    {
      extensions: buildExtensions({ smartQuotes }),
      content: html || '<p></p>',
      editable: !readOnly,
      onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
      onFocus: () => onFocus?.(),
      onSelectionUpdate: ({ editor: ed }) => {
        if (!typewriter) return;
        const { node } = ed.view.domAtPos(ed.state.selection.from);
        const el = node.nodeType === 1 ? node : node.parentElement;
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
      editorProps: {
        handleDoubleClickOn: (_view, _pos, node, nodePos) => {
          if (node.type.name !== 'footnote' || readOnly) return false;
          const text = window.prompt('Nota de subsol:', node.attrs.text);
          if (text !== null) editor?.chain().setNodeSelection(nodePos).updateAttributes('footnote', { text }).run();
          return true;
        },
      },
    },
    [smartQuotes],
  );

  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            bold: ed.isActive('bold'),
            italic: ed.isActive('italic'),
            underline: ed.isActive('underline'),
            strike: ed.isActive('strike'),
            h1: ed.isActive('heading', { level: 1 }),
            h2: ed.isActive('heading', { level: 2 }),
            quote: ed.isActive('blockquote'),
            list: ed.isActive('bulletList'),
            comment: ed.isActive('comment'),
            hasSelection: !ed.state.selection.empty,
          }
        : {},
  });

  useImperativeHandle(
    ref,
    () => ({
      editor,
      setHtml: (h) => editor?.commands.setContent(h, { emitUpdate: false }),
      getSelectionText: () => {
        if (!editor) return '';
        const { from, to } = editor.state.selection;
        return from === to ? '' : editor.state.doc.textBetween(from, to, '\n\n');
      },
      insertText: (text) => {
        if (!editor) return;
        const { to } = editor.state.selection;
        editor.chain().focus().setTextSelection(to).insertContent(textToHtml(text)).run();
      },
      replaceSelection: (text) => editor?.chain().focus().insertContent(textToHtml(text)).run(),
      replaceSelectionHtml: (h) => editor?.chain().focus().insertContent(h).run(),
      // Selects the first occurrence of a text snippet (used to jump to an editorial issue).
      findText: (snippet) => {
        if (!editor || !snippet) return false;
        const needle = snippet.replace(/^…|…$/g, '').trim().slice(0, 60);
        if (!needle) return false;
        let found = null;
        editor.state.doc.descendants((node, pos) => {
          if (found || !node.isTextblock) return !found;
          const text = node.textContent;
          const at = text.indexOf(needle);
          if (at >= 0) {
            // map text offset to document position by walking inline children
            let offset = 0;
            let start = null;
            node.forEach((child, childOffset) => {
              if (start !== null) return;
              const len = child.isText ? child.text.length : 0;
              if (child.isText && at >= offset && at <= offset + len) start = pos + 1 + childOffset + (at - offset);
              offset += len;
            });
            if (start !== null) found = { from: start, to: start + needle.length };
          }
          return false;
        });
        if (!found) return false;
        editor.chain().focus().setTextSelection(found).scrollIntoView().run();
        return true;
      },
      // Splits the document at the cursor. Returns {before, after, title} as HTML;
      // the title is the selected text, if any.
      splitAtCursor: () => {
        if (!editor) return null;
        const { state } = editor;
        const { from, to } = state.selection;
        const title = from === to ? '' : state.doc.textBetween(from, to, ' ').trim().slice(0, 80);
        const before = state.doc.cut(0, from);
        const after = state.doc.cut(from);
        return {
          before: getHTMLFromFragment(before.content, editor.schema),
          after: getHTMLFromFragment(after.content, editor.schema),
          title,
        };
      },
      focus: () => editor?.commands.focus(),
    }),
    [editor],
  );

  if (!editor) return null;
  const btn = (label, isOn, action, titleText, disabled = false) => (
    <button className={isOn ? 'on' : ''} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={action} title={titleText}>
      {label}
    </button>
  );
  const chain = () => editor.chain().focus();

  const addComment = () => {
    const text = window.prompt('Comentariu:');
    if (text) chain().setComment(text).run();
  };
  const addFootnote = () => {
    const text = window.prompt('Nota de subsol:');
    if (text) chain().insertFootnote(text).run();
  };

  return (
    <div className={`editor ${compact ? 'compact' : ''}`}>
      {!readOnly && !compact && (
        <div className="format-bar">
          {btn(<b>B</b>, active.bold, () => chain().toggleBold().run(), 'Bold (Ctrl+B)')}
          {btn(<i>I</i>, active.italic, () => chain().toggleItalic().run(), 'Italic (Ctrl+I)')}
          {btn(<u>U</u>, active.underline, () => chain().toggleUnderline().run(), 'Subliniat (Ctrl+U)')}
          {btn(<s>S</s>, active.strike, () => chain().toggleStrike().run(), 'Tăiat')}
          <span className="sep" />
          {btn('T1', active.h1, () => chain().toggleHeading({ level: 1 }).run(), 'Titlu 1')}
          {btn('T2', active.h2, () => chain().toggleHeading({ level: 2 }).run(), 'Titlu 2')}
          {btn('❝', active.quote, () => chain().toggleBlockquote().run(), 'Citat')}
          {btn('•', active.list, () => chain().toggleBulletList().run(), 'Listă')}
          {btn('— ', false, () => chain().insertContent('— ').run(), 'Linie de dialog')}
          <span className="sep" />
          {active.comment
            ? btn('💬✕', true, () => chain().unsetComment().run(), 'Șterge comentariul')
            : btn('💬', false, addComment, 'Comentariu pe textul selectat', !active.hasSelection)}
          {btn('¹', false, addFootnote, 'Notă de subsol (dublu-clic pe număr pentru editare)')}
          <span className="sep" />
          {btn('↶', false, () => chain().undo().run(), 'Anulează (Ctrl+Z)')}
          {btn('↷', false, () => chain().redo().run(), 'Refă (Ctrl+Y)')}
        </div>
      )}
      <div className={`page ${typewriter ? 'typewriter' : ''} ${compact ? 'flow' : ''}`}>
        <h2 className="doc-title" onClick={onTitleClick}>
          {title}
        </h2>
        {readOnly && <p className="hint">Doar citire.</p>}
        <EditorContent editor={editor} className="prose" />
      </div>
    </div>
  );
});

export default Editor;
