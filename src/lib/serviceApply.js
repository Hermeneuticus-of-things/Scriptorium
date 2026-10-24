// Puts the result of an in-app service (translation, grammar check) back into the editor without
// losing formatting: plain text replaces the range with the marks it had (bold stays bold), and
// grammar corrections change only the corrected spans instead of retyping the whole selection.
// `range` is { from, to } in the document; `source` is its text as textBetween(from, to, '\n\n').
import { TextSelection } from '@tiptap/pm/state';

const SEP = '\n\n';

/** Replaces `range` with one line of `text` (or inserts it after the range with a space). */
export function replaceRangeText(editor, range, text, after = false) {
  const { state, view } = editor;
  if (!range || range.to > state.doc.content.size || range.from > range.to) return false;
  const tr = after ? state.tr.insertText(` ${text}`, range.to, range.to) : state.tr.insertText(text, range.from, range.to);
  const end = after ? range.to + text.length + 1 : range.from + text.length;
  tr.setSelection(TextSelection.create(tr.doc, end));
  view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}

// Document position of character `k` of the text of [from, to): the smallest position whose
// prefix text is k characters long (textBetween length only grows with the position).
function posOf(doc, from, to, k) {
  let lo = from;
  let hi = to;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (doc.textBetween(from, mid, SEP).length < k) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Applies edits ({ offset, length, text }, offsets in `source`) in one step; false when the text changed. */
export function applyTextEdits(editor, range, source, edits) {
  const { state, view } = editor;
  const { doc } = state;
  if (!range || range.to > doc.content.size || doc.textBetween(range.from, range.to, SEP) !== source) return false;
  const spans = [];
  for (const e of edits) {
    const a = posOf(doc, range.from, range.to, e.offset);
    const b = posOf(doc, range.from, range.to, e.offset + e.length);
    // A span that does not map onto exactly its text (crosses a paragraph break) is not safe to edit.
    if (doc.textBetween(a, b, SEP) !== source.slice(e.offset, e.offset + e.length)) return false;
    spans.push({ a, b, text: e.text });
  }
  const tr = state.tr;
  spans.sort((x, y) => y.a - x.a).forEach(({ a, b, text }) => (text ? tr.insertText(text, a, b) : tr.delete(a, b)));
  if (tr.docChanged) view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}
