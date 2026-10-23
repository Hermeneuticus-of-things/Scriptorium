export function htmlToText(html) {
  const el = document.createElement('div');
  el.innerHTML = (html || '').replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '$&\n').replace(/<br\s*\/?>/gi, '\n');
  return el.textContent || '';
}

export function countWords(text) {
  const words = (text || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return words ? words.length : 0;
}

export function wordCount(html) {
  return countWords(htmlToText(html));
}

export function newNode(type, title) {
  const node = {
    id: crypto.randomUUID(),
    title: title || (type === 'folder' ? 'Dosar nou' : 'Document nou'),
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
    .split(/\n+/).filter((p) => p.trim())
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
}
