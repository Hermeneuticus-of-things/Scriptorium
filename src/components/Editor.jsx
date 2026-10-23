import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { getHTMLFromFragment } from '@tiptap/core';
import { buildExtensions } from '../editor/extensions.js';
import { textToHtml } from '../lib/text.js';
import FindBar from './FindBar.jsx';
import FormatBar from './FormatBar.jsx';

const Editor = forwardRef(function Editor(
  { html, title, readOnly, typewriter, smartQuotes = true, compact = false, linkTargets = [], onOpenLink, onChange, onFocus, onTitleClick },
  ref,
) {
  const [showFind, setShowFind] = useState(false);
  const plainPaste = useRef(false);
  const imageInput = useRef(null);
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
        handleKeyDown: (_view, e) => {
          const mod = e.ctrlKey || e.metaKey;
          if (mod && !e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            setShowFind(true);
            return true;
          }
          // Paste and Match Style: the next paste keeps only the text.
          if (mod && e.shiftKey && e.key.toLowerCase() === 'v') plainPaste.current = true;
          if (mod && !e.shiftKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            const href = window.prompt('Adresa linkului:', editor?.getAttributes('link').href || 'https://');
            if (href) editor?.chain().focus().extendMarkRange('link').setLink({ href }).run();
            return true;
          }
          return false;
        },
        // Scrivener Links: Ctrl/Cmd+click (or any click when read-only) opens the target document.
        handleClick: (_view, _pos, event) => {
          const a = event.target.closest && event.target.closest('a[href]');
          if (!a) return false;
          const m = /^(?:scribner|scriptorium):\/\/doc\/([A-Za-z0-9-]+)/.exec(a.getAttribute('href'));
          if (m && (event.ctrlKey || event.metaKey || readOnly)) {
            onOpenLink?.(m[1]);
            return true;
          }
          return false;
        },
        handlePaste: (view, event) => {
          if (!plainPaste.current) return false;
          plainPaste.current = false;
          const text = event.clipboardData?.getData('text/plain') || '';
          if (!text) return false;
          editor?.chain().focus().insertContent(text.includes('\n') ? textToHtml(text) : text).run();
          return true;
        },
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
      openFind: () => setShowFind(true),
      // useSelectionAsTitle=false: plain split at the cursor (Scrivener "Split at Selection").
      splitAtCursor: (useSelectionAsTitle = true) => {
        if (!editor) return null;
        const { state } = editor;
        const { from, to } = state.selection;
        const title = from === to || !useSelectionAsTitle ? '' : state.doc.textBetween(from, to, ' ').trim().slice(0, 80);
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
  const chain = () => editor.chain().focus();

  const addComment = () => {
    const text = window.prompt('Comentariu:');
    if (text) chain().setComment(text).run();
  };
  const addFootnote = () => {
    const text = window.prompt('Nota de subsol:');
    if (text) chain().insertFootnote(text).run();
  };
  const addAnnotation = () => {
    const text = window.prompt('Adnotare inline (nu intră în Compile):');
    if (text) chain().insertAnnotation(text).run();
  };
  const insertImage = () => imageInput.current?.click();
  const onImageFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => chain().setImage({ src: reader.result, alt: file.name }).run();
    reader.readAsDataURL(file);
  };

  return (
    <div className={`editor ${compact ? 'compact' : ''}`}>
      <input ref={imageInput} type="file" accept="image/*" hidden onChange={onImageFile} />
      {!readOnly && !compact && (
        <FormatBar
          editor={editor}
          linkTargets={linkTargets}
          onAddComment={addComment}
          onAddFootnote={addFootnote}
          onAddAnnotation={addAnnotation}
          onInsertImage={insertImage}
        />
      )}
      <div className={`page ${typewriter ? 'typewriter' : ''} ${compact ? 'flow' : ''}`}>
        <h2 className="doc-title" onClick={onTitleClick}>
          {title}
        </h2>
        {readOnly && <p className="hint">Doar citire.</p>}
        {showFind && <FindBar editor={editor} onClose={() => { setShowFind(false); editor.commands.focus(); }} />}
        <EditorContent editor={editor} className="prose" />
      </div>
    </div>
  );
});

export default Editor;
