import { t as i18nT } from '../lib/i18n.js';
import { uiPrompt } from '../lib/uiPrompt.jsx';
import { TextSelection } from '@tiptap/pm/state';
import { sentenceAt, wordAt } from '../lib/textRange.js';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Serializing the whole document (getHTML) costs ~7 ms per keystroke on 50k words, so the
// HTML is produced and handed to onChange once typing pauses. Every path that needs the
// newest text (blur, unmount, getHtml/setHtml, window unload, App flush) flushes first.
export const SERIALIZE_DELAY = 300;
import { EditorContent, useEditor } from '@tiptap/react';
import { getHTMLFromFragment } from '@tiptap/core';
import { Step } from '@tiptap/pm/transform';
import { closeHistory } from '@tiptap/pm/history';

// Undo history per document across document switches: the editor is rebuilt for every document
// (new schema), so the history itself cannot be kept. Instead the document's base HTML and its
// edits (step JSON, one group per transaction) are kept and replayed into the new editor when
// the text is unchanged since; Ctrl+Z then works after switching back.
const HISTORY_CACHE = new Map(); // key → { base, groups: [[stepJSON]], html }
const HISTORY_MAX_GROUPS = 400;
const HISTORY_MAX_DOCS = 30;
import { buildExtensions } from '../editor/extensions.js';
import { resolveWikiLink, typewriterScroll } from '../editor/writing.js';
import { PARSE_OPTIONS, htmlToDoc, replaceChangedRange } from '../editor/syncDoc.js';
import { collectCharacters, collectSceneHeadings } from '../lib/scriptFormats.js';
import { countWords, textToHtml } from '../lib/text.js';
import { insertable } from '../lib/inlineInsert.js';
import FindBar, { findAgain, lastFind } from './FindBar.jsx';
import FormatBar from './FormatBar.jsx';
import FormatFind from './FormatFind.jsx';
import Ruler from './Ruler.jsx';
import LineNumbers from './LineNumbers.jsx';
import StylesPanel from './StylesPanel.jsx';
import EquationDialog from './EquationDialog.jsx';
import { latexFromAlt } from '../lib/latexMath.js';

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
    historyKey = null,
    onCreateLinkedDoc = null,
    linkFolders = [],
    linkFolderDefault = '',
    commentColor = '',
    authorName = '',
    onSelectionWords = null,
    showStylesPanel = false,
    onStylesChange = null,
    onCloseStylesPanel = null,
  },
  ref,
) {
  const actionsRef = useRef({}); // note/image actions defined below, called from the handle
  const commentRef = useRef({ color: commentColor, author: authorName });
  commentRef.current = { color: commentColor, author: authorName };
  const selWordsRef = useRef(onSelectionWords);
  selWordsRef.current = onSelectionWords;
  const lastSelWords = useRef(0);
  const typewriterRef = useRef(typewriter);
  typewriterRef.current = typewriter;
  const histRef = useRef(null); // { base, groups } recorded for historyKey
  const replaying = useRef(false);
  const [showFind, setShowFind] = useState(false);
  const [showFormatFind, setShowFormatFind] = useState(false);
  // Equation dialog: {latex, pos} (pos = image to replace, null = insert at the cursor).
  const [equation, setEquation] = useState(null);
  const scenesRef = useRef([]);
  const wordsRef = useRef(words);
  wordsRef.current = words;
  // [[Title]] with no matching document: offer to create it (wikiOffer = {label, from, folder}).
  const [wikiOffer, setWikiOffer] = useState(null);
  const createLinkRef = useRef(onCreateLinkedDoc);
  createLinkRef.current = readOnly ? null : onCreateLinkedDoc;
  const linkFolderRef = useRef(linkFolderDefault);
  linkFolderRef.current = linkFolderDefault;
  const linkTargetsRef = useRef(linkTargets);
  linkTargetsRef.current = linkTargets;
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
      extensions: buildExtensions({ smartQuotes, corrections, showInvisibles, getWords: () => wordsRef.current, getScriptFormat: () => scriptRef.current, getCharacters: () => charsRef.current, getSceneHeadings: () => scenesRef.current, getLinkTargets: () => linkTargetsRef.current, onMissingLink: (label, from) => createLinkRef.current && setWikiOffer({ label, from, folder: linkFolderRef.current }) }),
      content: html || '<p></p>',
      parseOptions: PARSE_OPTIONS,
      editable: !readOnly,
      onTransaction: ({ transaction: tr }) => {
        const h = histRef.current;
        if (!h || replaying.current || !tr.docChanged || tr.getMeta('addToHistory') === false) return;
        h.groups.push(tr.steps.map((st) => st.toJSON()));
        if (h.groups.length > HISTORY_MAX_GROUPS) histRef.current = null; // too long: stop keeping it
      },
      onUpdate: ({ editor: ed }) => {
        if (replaying.current) return;
        dirty.current = { doc: ed.state.doc, schema: ed.schema };
        clearTimeout(dirtyTimer.current);
        dirtyTimer.current = setTimeout(() => flushRef.current(), SERIALIZE_DELAY);
      },
      onFocus: () => onFocus?.(),
      onBlur: () => flushRef.current(),
      onDestroy: () => flushRef.current(),
      onSelectionUpdate: ({ editor: ed }) => {
        // Words in the selection for the footer ("Words: 37 of 1,234"); 0 = no selection.
        if (selWordsRef.current) {
          const { from, to, empty } = ed.state.selection;
          const n = empty ? 0 : countWords(ed.state.doc.textBetween(from, to, ' ', ' '));
          if (n !== lastSelWords.current) {
            lastSelWords.current = n;
            selWordsRef.current(n);
          }
        }
        if (!typewriterRef.current) return; // a ref: turning the mode on reaches editors already open
        // Keeps the typing line at the position chosen in Options (Aspect > Editor), 50 % by default.
        if (!typewriterScroll(ed.view)) {
          const { node } = ed.view.domAtPos(ed.state.selection.from);
          const el = node.nodeType === 1 ? node : node.parentElement;
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
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
            (async () => {
              const href = await uiPrompt(i18nT('ui.formatBar.linkPrompt'), editor?.getAttributes('link').href || 'https://');
              if (href) editor?.chain().focus().extendMarkRange('link').setLink({ href }).run();
            })();
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
          // An image on the clipboard (screenshot, copied picture) goes in as an image.
          const img = [...(event.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
          if (img && !readOnly && !event.clipboardData?.getData('text/html')) {
            const reader = new FileReader();
            reader.onload = () => editor?.chain().focus().setImage({ src: reader.result, alt: img.name || '' }).run();
            reader.readAsDataURL(img);
            return true;
          }
          if (!plainPaste.current) return false;
          plainPaste.current = false;
          const text = event.clipboardData?.getData('text/plain') || '';
          if (!text) return false;
          editor?.chain().focus().insertContent(/[\r\n]/.test(text) ? textToHtml(text) : text).run();
          return true;
        },
        handleDoubleClickOn: (_view, _pos, node, nodePos) => {
          // An equation (image with $LaTeX$ as alt text) opens again in the equation editor.
          if (node.type.name === 'image' && !readOnly && latexFromAlt(node.attrs.alt) !== null) {
            setEquation({ latex: latexFromAlt(node.attrs.alt), pos: nodePos });
            return true;
          }
          if (node.type.name !== 'footnote' || readOnly) return false;
          (async () => {
            const text = await uiPrompt(i18nT('ui.editor.footnotePrompt'), node.attrs.text);
            // Emptied: the note goes away instead of staying as an empty numbered note.
            if (text !== null && !text.trim()) editor?.chain().deleteRange({ from: nodePos, to: nodePos + node.nodeSize }).run();
            else if (text !== null) editor?.chain().setNodeSelection(nodePos).updateAttributes('footnote', { text }).run();
          })();
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

  // Restore (replay) the kept history on creation; keep it when the editor goes away.
  useEffect(() => {
    if (!editor || !historyKey) return undefined;
    const startHtml = editor.getHTML();
    const kept = HISTORY_CACHE.get(historyKey);
    histRef.current = { base: startHtml, groups: [] };
    if (kept && kept.html === startHtml && kept.groups.length) {
      try {
        replaying.current = true;
        const { view } = editor;
        const sel = view.state.selection.toJSON();
        let tr = view.state.tr.replaceWith(0, view.state.doc.content.size, htmlToDoc(kept.base, editor.schema).content).setMeta('addToHistory', false);
        view.dispatch(tr);
        for (const g of kept.groups) {
          tr = closeHistory(view.state.tr);
          for (const js of g) tr.step(Step.fromJSON(editor.schema, js));
          view.dispatch(tr);
        }
        if (editor.getHTML() !== startHtml) throw new Error('history replay mismatch');
        view.dispatch(closeHistory(view.state.tr)); // new typing starts its own undo step
        try {
          view.dispatch(view.state.tr.setSelection(TextSelection.fromJSON(view.state.doc, sel)).setMeta('addToHistory', false));
        } catch { /* selection outside the doc */ }
        histRef.current = { base: kept.base, groups: [...kept.groups] };
      } catch {
        // Could not replay: start clean from the current text.
        editor.commands.setContent(startHtml, { emitUpdate: false, parseOptions: PARSE_OPTIONS });
        histRef.current = { base: editor.getHTML(), groups: [] };
      } finally {
        replaying.current = false;
      }
    }
    return () => {
      const h = histRef.current;
      HISTORY_CACHE.delete(historyKey);
      if (!h || !h.groups.length) return;
      HISTORY_CACHE.set(historyKey, { ...h, html: getHTMLFromFragment(editor.state.doc.content, editor.schema) });
      while (HISTORY_CACHE.size > HISTORY_MAX_DOCS) HISTORY_CACHE.delete(HISTORY_CACHE.keys().next().value);
    };
  }, [editor, historyKey]);

  function addCommentNow(text) {
    if (!editor || editor.isDestroyed || !editor.isEditable) return false;
    if (editor.state.selection.empty && !selectAround(editor.view, undefined, 'word')) return false;
    const { color, author } = commentRef.current;
    const attrs = { comment: String(text ?? ''), ...(color ? { color } : {}), ...(author ? { author } : {}), date: new Date().toISOString() };
    const ok = editor.chain().focus().setMark('comment', attrs).run();
    flushRef.current();
    return ok;
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
        // Not in this pane's undo history: its Undo must not reverse the other pane's change.
        if (replaceChangedRange(tr, htmlToDoc(h, editor.schema))) editor.view.dispatch(tr.setMeta('preventUpdate', true).setMeta('addToHistory', false));
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
        editor.chain().focus().setTextSelection(to).insertContent(insertable(text)).run();
      },
      // One line goes into the current paragraph as text; several lines become paragraphs.
      replaceSelection: (text) => {
        if (!editor) return false;
        const t = String(text ?? '');
        if (!/[\r\n]/.test(t)) return editor.chain().focus().insertContent({ type: 'text', text: t }).run();
        return editor.chain().focus().insertContent(textToHtml(t)).run();
      },
      // A read-only editor (locked document, snapshot view) is left alone: false tells the caller.
      replaceSelectionHtml: (h) => Boolean(editor && !editor.isDestroyed && editor.isEditable && editor.chain().focus().insertContent(h).run()),
      // New comment over the selection, or over the word under the cursor when nothing is selected.
      addComment: (text = '') => addCommentNow(text),
      addFootnote: (text = '') => {
        if (!editor || editor.isDestroyed || !editor.isEditable) return false;
        const ok = editor.chain().focus().insertFootnote(text).run();
        flushRef.current();
        return ok;
      },
      // Selects the index-th footnote marker or linked-footnote anchor (Inspector › Comments & Notes).
      selectFootnote: (index) => {
        if (!editor || editor.isDestroyed) return false;
        const el = editor.view.dom.querySelectorAll('[data-footnote],[data-linked-footnote]')[index];
        if (!el) return false;
        if (el.hasAttribute('data-footnote')) {
          const pos = editor.view.posAtDOM(el, 0);
          editor.chain().focus().setNodeSelection(pos).scrollIntoView().run();
        } else {
          editor.chain().focus().setTextSelection({ from: editor.view.posAtDOM(el, 0), to: editor.view.posAtDOM(el, el.childNodes.length) }).scrollIntoView().run();
        }
        return true;
      },
      // Selects the index-th comment's text (Inspector › Comments › Go to).
      selectComment: (index) => {
        if (!editor || editor.isDestroyed) return false;
        const el = editor.view.dom.querySelectorAll('[data-comment]')[index];
        if (!el) return false;
        const from = editor.view.posAtDOM(el, 0);
        const to = editor.view.posAtDOM(el, el.childNodes.length);
        editor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run();
        return true;
      },
      // Inserts after the selection (never over it); a single paragraph goes inline at the caret.
      insertHtmlAfter: (h) => {
        if (!editor || editor.isDestroyed || !editor.isEditable) return false;
        const { to } = editor.state.selection;
        const one = String(h).trim().match(/^<p>((?:(?!<\/?p[\s>]).)*)<\/p>$/s);
        return editor.chain().focus().setTextSelection(to).insertContent(one ? one[1] : h).run();
      },
      // Selects the first occurrence of a text snippet (used to jump to an editorial issue).
      // opts.block (0-based textblock index, = lint paragraph) and opts.at (offset in it) pick
      // the occurrence nearest to that place, so a repeated word jumps to the right one.
      findText: (snippet, opts = {}) => {
        if (!editor || !snippet) return false;
        const needle = snippet.replace(/^…|…$/g, '').trim().slice(0, 60);
        if (!needle) return false;
        let found = null;
        let blockNo = -1;
        const wantBlock = Number.isInteger(opts.block) ? opts.block : null;
        const nearest = (text) => {
          if (!Number.isFinite(opts.at)) return text.indexOf(needle);
          let best = -1;
          for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + 1)) if (best < 0 || Math.abs(i - opts.at) < Math.abs(best - opts.at)) best = i;
          return best;
        };
        const pass = (only) => editor.state.doc.descendants((node, pos) => {
          if (found || !node.isTextblock) return !found;
          blockNo += 1;
          if (only !== null && blockNo !== only) return false;
          const text = node.textContent;
          const at = only !== null ? nearest(text) : text.indexOf(needle);
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
        if (wantBlock !== null) pass(wantBlock);
        blockNo = -1;
        if (!found) pass(null);
        if (!found) return false;
        editor.chain().focus().setTextSelection(found).scrollIntoView().run();
        return true;
      },
      // Splits the document at the cursor. Returns {before, after, title} as HTML;
      // the title is the selected text, if any.
      openFind: () => setShowFind(true),
      openFormatFind: () => setShowFormatFind(true),
      // Edit › Find › Find Next / Previous / Use Selection for Find.
      findAgain: (dir = 1) => findAgain(editor, dir),
      useSelectionForFind: () => {
        if (!editor) return false;
        const { from, to } = editor.state.selection;
        if (from === to) return false;
        lastFind.query = editor.state.doc.textBetween(from, to, ' ').slice(0, 80);
        return true;
      },
      // Insert menu: the same actions as the format bar (prompts for the note text).
      addLinkedFootnote: () => actionsRef.current.addLinkedFootnote?.(),
      addInlineFootnote: () => actionsRef.current.addFootnote?.(),
      addAnnotation: () => actionsRef.current.addAnnotation?.(),
      insertImage: () => actionsRef.current.insertImage?.(),
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
      // Insert › Equation…
      insertEquation: () => {
        if (!editor || editor.isDestroyed || !editor.isEditable) return false;
        const { node, from } = editor.state.selection;
        const latex = node && node.type.name === 'image' ? latexFromAlt(node.attrs.alt) : null;
        setEquation(latex !== null ? { latex, pos: from } : { latex: '', pos: null });
        return true;
      },
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

  const addComment = async () => {
    if (editor.state.selection.empty && !selectAround(editor.view, undefined, 'word')) return;
    const text = await uiPrompt(i18nT('ui.editor.commentPrompt'));
    if (text) addCommentNow(text);
  };
  const addFootnote = async () => {
    const text = await uiPrompt(i18nT('ui.editor.footnotePrompt'));
    if (text) chain().insertFootnote(text).run();
  };
  const addAnnotation = async () => {
    const text = await uiPrompt(i18nT('ui.formatBar.annotationBtn') + ':');
    if (text) chain().insertAnnotation(text).run();
  };
  const insertImage = () => imageInput.current?.click();
  // Linked footnote on the selection (or the word at the caret); none there: an inline one.
  const addLinkedFootnote = async () => {
    if (editor.state.selection.empty) editor.commands.selectWord?.();
    if (editor.state.selection.empty) return addFootnote();
    const text = await uiPrompt(i18nT('ui.editor.footnotePrompt'));
    if (text) chain().setLinkedFootnote(text).run();
  };
  actionsRef.current = { addComment, addFootnote, addLinkedFootnote, addAnnotation, insertImage };
  const onImageFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => chain().setImage({ src: reader.result, alt: file.name }).run();
    reader.readAsDataURL(file);
  };

  const putEquation = ({ src, alt, width, display }) => {
    const eq = equation;
    setEquation(null);
    const attrs = { src, alt, title: alt, width: String(width), ...(display ? { align: 'center' } : {}) };
    if (eq && eq.pos !== null) {
      const node = editor.state.doc.nodeAt(eq.pos);
      if (node && node.type.name === 'image') {
        editor.chain().focus().command(({ tr }) => { tr.setNodeMarkup(eq.pos, undefined, { ...node.attrs, ...attrs }); return true; }).run();
        flushRef.current();
        return;
      }
    }
    chain().setImage(attrs).run();
    flushRef.current();
  };

  const acceptWikiOffer = async () => {
    const offer = wikiOffer;
    setWikiOffer(null);
    if (!offer) return;
    const node = await createLinkRef.current?.(offer.label, offer.folder);
    if (node?.id && !editor.isDestroyed) resolveWikiLink(editor, offer.from, offer.label, node.id);
    editor.commands.focus();
  };
  const dismissWikiOffer = () => {
    setWikiOffer(null);
    editor.commands.focus();
  };

  return (
    <div className={`editor ${compact ? 'compact' : ''} ${showStylesPanel && !compact ? 'with-styles-panel' : ''}`}>
      {wikiOffer && (
        <div
          className="wiki-offer"
          role="dialog"
          aria-label={i18nT('ui.editor.wikiCreateTitle')}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dismissWikiOffer(); }
          }}
        >
          <span>{i18nT('ui.editor.wikiCreate', { title: wikiOffer.label })}</span>
          <select aria-label={i18nT('ui.editor.wikiFolder')} value={wikiOffer.folder} onChange={(e) => setWikiOffer((o) => ({ ...o, folder: e.target.value }))}>
            <option value="">{i18nT('ui.editor.wikiSameFolder')}</option>
            {linkFolders.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
          <button className="primary" autoFocus onClick={acceptWikiOffer}>{i18nT('ui.editor.wikiCreateBtn')}</button>
          <button onClick={dismissWikiOffer}>{i18nT('btn.cancel')}</button>
        </div>
      )}
      <input ref={imageInput} type="file" accept="image/*" hidden onChange={onImageFile} />
      {equation && <EquationDialog initial={equation.latex} onInsert={putEquation} onClose={() => { setEquation(null); editor.commands.focus(); }} />}
      {showStylesPanel && !compact && <StylesPanel editor={editor} styles={styles} readOnly={readOnly} onStylesChange={onStylesChange} onManage={onManageStyles} onClose={onCloseStylesPanel} />}
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
        style={{
          ...(view.zoom && view.zoom !== 100 ? { '--zoom': view.zoom / 100 } : {}),
          // Width chosen by dragging the page edges (or the whole window, double-click on an edge).
          ...(!compact && !view.pageView && view.fullWidth ? { maxWidth: 'none' } : {}),
          ...(!compact && !view.pageView && !view.fullWidth && view.pageWidthPx ? { maxWidth: `${view.pageWidthPx}px` } : {}),
        }}
      >
        {onViewChange && !compact && !view.pageView && ['left', 'right'].map((side) => (
          <div
            key={side}
            className={`page-resize ${side}`}
            role="separator"
            aria-orientation="vertical"
            title={i18nT('ui.editor.latime_pagina')}
            onDoubleClick={() => onViewChange({ ...view, fullWidth: !view.fullWidth })}
            onMouseDown={(e) => {
              e.preventDefault();
              const page = e.currentTarget.parentElement;
              const startX = e.clientX;
              const startW = page.getBoundingClientRect().width;
              let w = startW;
              const move = (ev) => {
                const dx = (ev.clientX - startX) * (side === 'right' ? 1 : -1);
                w = Math.max(320, Math.round(startW + 2 * dx)); // the page stays centred: both edges move
                page.style.maxWidth = `${w}px`;
              };
              const up = () => {
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', up);
                if (Math.abs(w - startW) < 3) return; // a click (or the first half of a double-click)
                page.style.maxWidth = '';
                onViewChange({ ...view, fullWidth: false, pageWidthPx: w });
              };
              window.addEventListener('mousemove', move);
              window.addEventListener('mouseup', up);
            }}
          />
        ))}
        <h2 className="doc-title" onClick={onTitleClick}>
          {title}
        </h2>
        {readOnly && <p className="hint">{i18nT('ui.editor.doar_citire')}</p>}
        {showFormatFind && <FormatFind editor={editor} styles={styles} onClose={() => { setShowFormatFind(false); editor.commands.focus(); }} />}
        {view.ruler && !readOnly && !compact && <Ruler editor={editor} zoom={1} />}
        {view.lineNumbers && !compact && <LineNumbers editor={editor} mode={view.lineNumbers === 'paragraphs' ? 'paragraphs' : 'lines'} />}
        {showFind && <FindBar editor={editor} onClose={() => { setShowFind(false); editor.commands.focus(); }} />}
        <EditorContent editor={editor} className={`${scriptFormat ? `prose script-mode script-${scriptFormat}` : 'prose'}${view.lineNumbers && !compact ? ' with-line-numbers' : ''}`} />
      </div>
    </div>
  );
});

export default Editor;
