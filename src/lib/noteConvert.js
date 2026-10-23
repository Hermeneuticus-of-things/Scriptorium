// Conversion between inline notes (atoms inside the text) and linked notes
// (marks over a text range), Scrivener-style:
//   inline annotation  <->  comment            (node 'annotation' <-> mark 'comment')
//   inline footnote    <->  linked footnote    (node 'footnote'   <-> mark 'linkedFootnote')
// Pure ProseMirror: every function takes an EditorState and returns a Transaction
// (or null when there is nothing to convert), so it is testable without a DOM.
// When the selection is not empty only notes inside it are converted.

export const PAIRS = {
  annotation: { node: 'annotation', mark: 'comment', nodeAttr: 'text', markAttr: 'comment' },
  footnote: { node: 'footnote', mark: 'linkedFootnote', nodeAttr: 'text', markAttr: 'text' },
};

const WORD_BEFORE = /([\p{L}\p{N}’'-]+)[\s\p{P}]*$/u;
const WORD_AFTER = /^[\s\p{P}]*([\p{L}\p{N}’'-]+)/u;

function scope(state) {
  const { from, to, empty } = state.selection;
  return empty ? { from: 0, to: state.doc.content.size } : { from, to };
}

// Inline atoms -> mark on the word just before (or, at paragraph start, after) them.
export function inlineToLinked(state, pair) {
  const markType = state.schema.marks[pair.mark];
  if (!markType || !state.schema.nodes[pair.node]) return null;
  const { from, to } = scope(state);
  const found = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === pair.node && pos >= from && pos < to) found.push({ pos, text: node.attrs[pair.nodeAttr] || '' });
  });
  if (!found.length) return null;
  const tr = state.tr;
  // Work from the end so earlier positions stay valid.
  for (const a of found.reverse()) {
    const $pos = state.doc.resolve(a.pos);
    const parentStart = a.pos - $pos.parentOffset;
    const before = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '￼');
    const after = $pos.parent.textBetween($pos.parentOffset + 1, $pos.parent.content.size, undefined, '￼');
    const mb = WORD_BEFORE.exec(before);
    const ma = WORD_AFTER.exec(after);
    tr.delete(a.pos, a.pos + 1);
    const mark = markType.create({ [pair.markAttr]: a.text });
    if (mb) {
      const end = parentStart + mb.index + mb[1].length;
      tr.addMark(end - mb[1].length, end, mark);
    } else if (ma) {
      const start = a.pos + (ma[0].length - ma[1].length);
      tr.addMark(start, start + ma[1].length, mark);
    }
    // no word at all: the note text would be lost, so put it back as-is
    else tr.insert(a.pos, state.schema.nodes[pair.node].create({ [pair.nodeAttr]: a.text }));
  }
  return tr;
}

// Marked ranges -> inline atom placed right after the range. Adjacent text nodes
// carrying the same note are merged into one range.
export function linkedToInline(state, pair) {
  const markType = state.schema.marks[pair.mark];
  const nodeType = state.schema.nodes[pair.node];
  if (!markType || !nodeType) return null;
  const { from, to } = scope(state);
  const ranges = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const m = node.marks.find((x) => x.type === markType);
    if (!m) return;
    const text = m.attrs[pair.markAttr] || '';
    const last = ranges[ranges.length - 1];
    if (last && last.to === pos && last.text === text) last.to = pos + node.nodeSize;
    else ranges.push({ from: pos, to: pos + node.nodeSize, text });
  });
  if (!ranges.length) return null;
  const tr = state.tr;
  for (const r of ranges.reverse()) {
    tr.removeMark(r.from, r.to, markType);
    tr.insert(r.to, nodeType.create({ [pair.nodeAttr]: r.text }));
  }
  return tr;
}

// Editor wrappers (TipTap editor): return true when something was converted.
const run = (editor, tr) => {
  if (!tr) return false;
  editor.view.dispatch(tr);
  return true;
};
export const annotationsToComments = (editor) => run(editor, inlineToLinked(editor.state, PAIRS.annotation));
export const commentsToAnnotations = (editor) => run(editor, linkedToInline(editor.state, PAIRS.annotation));
export const footnotesToLinked = (editor) => run(editor, inlineToLinked(editor.state, PAIRS.footnote));
export const linkedToFootnotes = (editor) => run(editor, linkedToInline(editor.state, PAIRS.footnote));
