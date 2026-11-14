import { t as tr } from './i18n.js';
// Text simplu din HTML, echivalent cu varianta DOM (textContent), dar fără parsarea
// întregului markup: pe cărți mari htmlToText era apelat per document la deschidere și
// în căutări — profilat, parsarea DOM domina. Stripping pe string + decodarea entităților
// pe textul rămas (textarea decodează exact ca textContent, fără markup de parsat).
// Echivalența cu implementarea DOM e probată pe corpus real în tests/htmlToTextEquiv.test.js.
export function htmlToText(html) {
  // 1) aceleași înlocuiri de newline ca implementarea DOM, pe string-ul brut
  let s = String(html || '')
    .replace(/<\/(p|h[1-6]|li|blockquote|div|td|th|tr|pre|dt|dd|figcaption)>/gi, '$&\n')
    .replace(/<br\s*\/?>/gi, '\n');
  // 2) conținutul script/style rămâne în text CA TEXT BRUT (textContent nu decodează
  //    entitățile în elementele raw-text) — scos pe placeholder și pus la loc la final
  const raws = [];
  s = s.replace(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m, tag, body) => {
    raws.push(body);
    return `\uE000${raws.length - 1}\uE001`;
  });
  // 3) comentariile nu apar în textContent
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // 4) stripping quote-aware: `>` din valori de atribute nu termină tag-ul
  s = s.replace(/<\/?[a-zA-Z](?:[^>"']|"[^"]*"|'[^']*')*>/g, '');
  // 5) decodarea entităților pe textul rămas (textarea decodează exact ca textContent)
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  s = ta.value;
  // 6) conținutul brut script/style la loc (ne-decodat, ca în textContent)
  s = s.replace(/\uE000(\d+)\uE001/g, (m, i) => raws[Number(i)] || '');
  return s;
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
