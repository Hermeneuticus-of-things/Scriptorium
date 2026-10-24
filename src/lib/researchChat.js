// Research conversation helpers for the renderer: live display of a streamed answer, and the
// HTML used by „Salvează ca notă” / „Inserează în document” / „Copiază”. The prompt, retrieval
// and persistence live in the main process (lib/researchChat.cjs).

export const DEFAULT_SCOPE = { kinds: ['research', 'notes'], ids: [] };
const HEADING_RE = /\n?[ \t]*(?:#{1,4}[ \t]*)?\**[ \t]*(?:Întrebări de continuare|Intrebari de continuare|Follow-up questions|Suggested questions)[\s\S]*$/i;

/** Streamed text without the follow-up section (and without a half-written heading at the end). */
export function visibleAnswer(text) {
  return String(text || '').replace(HEADING_RE, '').replace(/\n[ \t]*#{1,4}[^\n]*$/, '').trimEnd();
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const docHref = (id) => `scribner://doc/${encodeURIComponent(id)}`;
const excerpt = (s, n = 160) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const paragraphs = (text) =>
  String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

// Replaces [n] / [1, 2] in already-escaped text; cite(n) returns the HTML for one citation.
function withCites(escaped, count, cite) {
  return escaped.replace(/\[(\d+(?:\s*[,;]\s*\d+)*)\]/g, (m, list) => {
    const nums = list.split(/[,;]/).map((x) => Number(x.trim()));
    if (!nums.every((n) => n >= 1 && n <= count)) return m;
    return nums.map(cite).join('');
  });
}

/** Note document: question, answer with citations as document links, the sources list. */
export function turnToNoteHtml(turn, { sourcesLabel = 'Surse', questionLabel = '' } = {}) {
  const ps = turn.passages || [];
  const cite = (n) => `<a href="${docHref(ps[n - 1].docId)}">[${n}]</a>`;
  const body = paragraphs(turn.answer)
    .map((p) => `<p>${withCites(esc(p), ps.length, cite).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const sources = ps.length
    ? `<h3>${esc(sourcesLabel)}</h3><ol>${ps.map((p) => `<li><a href="${docHref(p.docId)}">${esc(p.title || p.docId)}</a> — „${esc(excerpt(p.text))}”</li>`).join('')}</ol>`
    : '';
  return `<h2>${esc(questionLabel)}${esc(turn.q)}</h2>${body}${sources}`;
}

/** Answer for the manuscript: citations as footnotes (default) or as document links. */
export function turnToInsertHtml(turn, mode = 'footnotes') {
  const ps = turn.passages || [];
  const cite =
    mode === 'links'
      ? (n) => `<a href="${docHref(ps[n - 1].docId)}">[${n}]</a>`
      : (n) => `<span class="footnote" data-footnote="${esc(`${ps[n - 1].title || ''}: „${excerpt(ps[n - 1].text)}”`)}"></span>`;
  return paragraphs(turn.answer)
    .map((p) => `<p>${withCites(esc(p), ps.length, cite).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Plain text for the clipboard: answer, then the numbered sources. */
export function turnToPlain(turn, { sourcesLabel = 'Surse' } = {}) {
  const ps = turn.passages || [];
  const src = ps.length ? `\n\n${sourcesLabel}:\n${ps.map((p, i) => `[${i + 1}] ${p.title || p.docId}`).join('\n')}` : '';
  return `${String(turn.answer || '').trim()}${src}`;
}

/** Chips for the scope: ticked kinds, then the ticked folders/documents by title. */
export function scopeChips(scope, findTitle, kindLabels) {
  const s = scope || DEFAULT_SCOPE;
  return [
    ...(s.kinds || []).map((k) => ({ type: 'kind', id: k, label: kindLabels[k] || k })),
    ...(s.ids || []).map((id) => ({ type: 'id', id, label: findTitle(id) || id })),
  ];
}

export function toggleScope(scope, type, id) {
  const s = { kinds: [...(scope?.kinds || [])], ids: [...(scope?.ids || [])] };
  const list = type === 'kind' ? s.kinds : s.ids;
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.push(id);
  return s;
}
