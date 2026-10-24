import { TextSelection } from '@tiptap/pm/state';
import { sentenceAt, wordAt } from '../lib/textRange.js';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Serializing the whole document (getHTML) costs ~7 ms per keystroke on 50k words, so the
// HTML is produced and handed to onChange once typing pauses. Every path that needs the
// newest text (blur, unmount, getHtml/setHtml, window unload, App flush) flushes first.
export const SERIALIZE_DELAY = 300;
import { EditorContent, useEditor } from '@tiptap/react';
import { getHTMLFromFragment } from '@tiptap/core';
import { buildExtensions } from '../editor/extensions.js';
import { PARSE_OPTIONS, htmlToDoc, replaceChangedRange } from '../editor/syncDoc.js';
import { collectCharacters, collectSceneHeadings } from '../lib/scriptFormats.js';
import { textToHtml } from '../lib/text.js';
import FindBar from './FindBar.jsx';
import FormatBar from './FormatBar.jsx';
import FormatFind from './FormatFind.jsx';
import Ruler from './Ruler.jsx';

const Editor = forwardRef(function Editor(
  {
    html,
    title,
    readOnly,
    typewriter,
    smartQuotes = true,
    corrections = null,
    showInvisibles = false,
    compact = false,
    linkTargets = [],
    words = [],
    styles = [],
    view = {},
    onViewChange,
    onManageStyles,
    onOpenLink,
    onChange,
    onFocus,
    onTitleClick,
    scriptFormat = null,
    defaultFormatting = null,
  },
  ref,
) {
  const [showFind, setShowFind] = useState(false);
  const [showFormatFind, setShowFormatFind] = useState(false);
  const scenesRef = useRef([]);
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const scriptRef = useRef(scriptFormat);
  scriptRef.current = scriptFormat;
  const charsRef = useRef([]);
  const plainPaste = useRef(false);
  const imageInput = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Pending edit: the newest doc node not yet passed to onChange (null = nothing pending).
  // The node is kept rather than the editor so a flush still works after the editor is destroyed.
  const dirty = useRef(null);
  const dirtyTimer = useRef(null);
  const flushRef = useRef(() => {});
  flushRef.current = () => {
    clearTimeout(dirtyTimer.current);
    const pend = dirty.current;
    if (!pend) return;
    dirty.current = null;
    const out = getHTMLFromFragment(pend.doc.content, pend.schema);
    if (scriptRef.current) {
      charsRef.current = collectCharacters(out);
      scenesRef.current = collectSceneHeadings(out);
    }
    onChangeRef.current?.(out);
  };
  const editor = useEditor(
    {
      extensions: buildExtensions({ smartQuotes, corrections, showInvisibles, getWords: () => wordsRef.current, getScriptFormat: () => scriptRef.current, getCharacters: () => charsRef.current, getSceneHeadings: () => scenesRef.current }),
      content: html || '<p></p>',
      parseOptions: PARSE_OPTIONS,
      editable: !readOnly,
      onUpdate: ({ editor: ed }) => {
        dirty.current = { doc: ed.state.doc, schema: ed.schema };
        clearTimeout(dirtyTimer.current);
        dirtyTimer.current = setTimeout(() => flushRef.current(), SERIALIZE_DELAY);
      },
      onFocus: () => onFocus?.(),
      onBlur: () => flushRef.current(),
      onDestroy: () => flushRef.current(),
      onSelectionUpdate: ({ editor: ed }) => {
        if (!typewriter) return;
        const { node } = ed.view.domAtPos(ed.state.selection.from);
        const el = node.nodeType === 1 ? node : node.parentElement;
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
      editorProps: {
        // Right-click on unselected text selects the word under the pointer, so the context
        // menu (translate, dictionaries, AI, NotebookLM) acts on it like on a selection.
        handleDOMEvents: {
          contextmenu: (view, event) => {
            if (!view.state.selection.empty) return false;
            const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (hit) selectAround(view, hit.pos, 'word');
            return false;
          },
        },
        handleKeyDown: (_view, e) => {
          const mod = e.ctrlKey || e.metaKey;
          if (mod && !e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            // Ctrl+Alt+F: find by formatting
            if (e.altKey) setShowFormatFind(true);
            else setShowFind(true);
            return true;
          }
          // Paste and Match Style: the next paste keeps only the text.
          // Ctrl+Shift+V arms the next paste only for a moment: if no paste follows (shortcut taken
          // by the OS, empty clipboard), a later normal paste must keep its formatting.
          if (mod && e.shiftKey && e.key.toLowerCase() === 'v') {
            plainPaste.current = true;
            setTimeout(() => { plainPaste.current = false; }, 1000);
          }
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
          editor?.chain().focus().insertContent(/[\r\n]/.test(text) ? textToHtml(text) : text).run();
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
    [smartQuotes, JSON.stringify(corrections)],
  );

  // Selects the word, sentence or paragraph around `pos` (default: the cursor).
  function selectAround(view, pos, kind) {
    const $p = view.state.doc.resolve(pos ?? view.state.selection.head);
    if (!$p.parent.isTextblock) return false;
    const start = $p.start();
    const text = $p.parent.textBetween(0, $p.parent.content.size, null, '\ufffc');
    const r = kind === 'paragraph' ? [0, text.length] : kind === 'sentence' ? sentenceAt(text, $p.parentOffset) : wordAt(text, $p.parentOffset);
    if (!r || r[1] <= r[0]) return false;
    // Focus first: an unfocused view does not sync the DOM selection, and focusing later would
    // read the old DOM selection back into the editor.
    if (!view.hasFocus()) view.focus();
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, start + r[0], start + r[1])));
    return true;
  }

  useImperativeHandle(
    ref,
    () => ({
      editor,
      setScriptElement: (el) => editor?.chain().focus().setScriptElement(el).run(),
      flush: () => flushRef.current(),
      getHtml: () => {
        flushRef.current();
        return editor && !editor.isDestroyed ? editor.getHTML() : '';
      },
      getText: () => editor?.getText() || '',
      // External update (other split pane, Inspector): replace only what changed so the caret stays put.
      setHtml: (h) => {
        flushRef.current();
        if (!editor || editor.isDestroyed) return;
        const tr = editor.state.tr;
        if (replaceChangedRange(tr, htmlToDoc(h, editor.schema))) editor.view.dispatch(tr.setMeta('preventUpdate', true));
      },
      selectAround: (kind) => Boolean(editor && !editor.isDestroyed && selectAround(editor.view, undefined, kind)),
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
      openFormatFind: () => setShowFormatFind(true),
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

  // Unmount (document switch, pane closed) and window close must not drop pending typing.
  useEffect(() => {
    const onUnload = () => flushRef.current();
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
      flushRef.current();
    };
  }, []);

  // Invisibles: Options setting or the per-view toggle (Format → paragraph marks).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setInvisibles(Boolean(showInvisibles || view.invisibles));
  }, [editor, showInvisibles, view.invisibles]);

  // Focus modes and revision level live in the editor's storage.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setFocusMode(view.focus || 'off');
    editor.commands.setCurrentParagraphHighlight(Boolean(view.currentParagraph));
    editor.commands.setRevisionLevel(readOnly ? 0 : view.revision || 0);
    editor.commands.setCurrentLineHighlight(Boolean(view.currentLine));
    editor.commands.setFadeOpacity(view.fadeOpacity ?? 0.28);
  }, [editor, view.focus, view.currentParagraph, view.currentLine, view.fadeOpacity, view.revision, readOnly]);

  // Script Mode auto-complete lists for the document as loaded.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !scriptFormat) return;
    const out = editor.getHTML();
    charsRef.current = collectCharacters(out);
    scenesRef.current = collectSceneHeadings(out);
  }, [editor, scriptFormat]);

  // Project default paragraph formatting for "Convert to Default Formatting".
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.storage.paragraphFormat.defaults = defaultFormatting || {};
  }, [editor, defaultFormatting]);

  // Project stylesheet for "Next style" on Enter and per-style shortcuts.
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.storage.paragraphStyle.styles = styles || [];
  }, [editor, styles]);

  // Linguistic Focus: view.posFocus = noun|verb|adj|adv|conj ('' = off), view.posLang = auto|ro|en.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setLinguisticFocus(view.posFocus || null, view.posLang || 'auto');
  }, [editor, view.posFocus, view.posLang]);

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
          onManageStyles={onManageStyles}
          onFindFormatting={() => setShowFormatFind(true)}
          defaultFormatting={defaultFormatting}
          styles={styles}
          view={view}
          onViewChange={onViewChange}
        />
      )}
      <div
        className={`page ${typewriter ? 'typewriter' : ''} ${compact ? 'flow' : ''} ${view.pageView ? `page-view page-${view.pageSize || 'a5'}` : ''} ${view.pageView && view.facing ? 'facing' : ''} ${view.invisibles ? 'invisibles' : ''}`}
        style={view.zoom && view.zoom !== 100 ? { '--zoom': view.zoom / 100 } : undefined}
      >
        <h2 className="doc-title" onClick={onTitleClick}>
          {title}
        </h2>
        {readOnly && <p className="hint">Doar citire.</p>}
        {showFormatFind && <FormatFind editor={editor} styles={styles} onClose={() => { setShowFormatFind(false); editor.commands.focus(); }} />}
        {view.ruler && !readOnly && !compact && <Ruler editor={editor} zoom={(view.zoom || 100) / 100} />}
        {showFind && <FindBar editor={editor} onClose={() => { setShowFind(false); editor.commands.focus(); }} />}
        <EditorContent editor={editor} className={scriptFormat ? `prose script-mode script-${scriptFormat}` : 'prose'} />
      </div>
    </div>
  );
});

export default Editor;
