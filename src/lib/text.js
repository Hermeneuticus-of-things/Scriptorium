import { t as tr } from './i18n.js';
export function htmlToText(html) {
  const el = document.createElement('div');
  el.innerHTML = (html || '').replace(/<\/(p|h[1-6]|li|blockquote|div|td|th|tr|pre|dt|dd|figcaption)>/gi, '$&\n').replace(/<br\s*\/?>/gi, '\n');
  return el.textContent || '';
}

export function countWords(text) {
  const words = (text || '').normalize('NFC').match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*/gu);
  return words ? words.length : 0;
}

export function wordCount(html) {
  return countWords(htmlToText(html));
}

export function newNode(type, title) {
  const node = {
    id: crypto.randomUUID(),
    title: title || tr(type === 'folder' ? 'cmd.newFolder' : 'cmd.newText'),
    type,
    synopsis: '',
    label: 'Fără',
    status: 'Fără',
    includeInCompile: true,
    target: 0,
  };
  if (type === 'folder') node.children = [];
  return node;
}

export function textToHtml(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return (text || '')
    .split(/[\r\n]+/).filter((p) => p.trim())
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
}

// Word and character count of a text selection (status bar). Characters exclude line breaks.
export function selectionStats(text) {
  const t = String(text || '');
  return { words: countWords(t), chars: t.replace(/[\r\n]+/g, '').length };
}

// The selected text when the DOM selection lies inside an editor (ProseMirror) area, else ''.
export function editorSelectionText(sel = typeof window !== 'undefined' ? window.getSelection() : null) {
  if (!sel || sel.isCollapsed || !sel.rangeCount) return '';
  const node = sel.anchorNode;
  const el = node && (node.nodeType === 1 ? node : node.parentElement);
  return el && el.closest && el.closest('.ProseMirror') ? sel.toString() : '';
}
