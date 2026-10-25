// Format › Text: whole-document clean-ups that act on the editor state (one undo step each).

/** Removes every mark of the given names and every node of the given names. Returns a count. */
function stripTypes(editor, markNames = [], nodeNames = []) {
  if (!editor || editor.isDestroyed || !editor.isEditable) return 0;
  const { state } = editor;
  const tr = state.tr;
  let n = 0;
  const end = state.doc.content.size;
  for (const name of markNames) {
    const type = state.schema.marks[name];
    if (!type) continue;
    state.doc.descendants((node) => {
      if (node.isText && type.isInSet(node.marks)) n++;
    });
    tr.removeMark(0, end, type);
  }
  const doomed = [];
  state.doc.descendants((node, pos) => {
    if (nodeNames.includes(node.type.name)) doomed.push([pos, pos + node.nodeSize]);
  });
  for (const [from, to] of doomed.reverse()) tr.delete(from, to);
  n += doomed.length;
  if (tr.docChanged) editor.view.dispatch(tr);
  return n;
}

/** Comments (marks) and inline annotations. */
export const removeAllComments = (editor) => stripTypes(editor, ['comment'], ['annotation']);

/** Inline footnote markers and linked footnotes (the anchor text stays). */
export const removeAllFootnotes = (editor) => stripTypes(editor, ['linkedFootnote'], ['footnote']);

/**
 * Plain text: the paragraphs touched by the selection (or the whole document when nothing is
 * selected) become ordinary paragraphs with no formatting, styles, lists, tables or notes.
 */
export function convertToPlainText(editor) {
  if (!editor || editor.isDestroyed || !editor.isEditable) return false;
  const { state } = editor;
  const { doc, schema, selection } = state;
  let from = 0;
  let to = doc.content.size;
  if (!selection.empty) {
    // widen to the top-level blocks the selection touches
    const a = doc.resolve(selection.from);
    const b = doc.resolve(selection.to);
    from = a.depth ? a.before(1) : 0;
    to = b.depth ? b.after(1) : doc.content.size;
  }
  const lines = [];
  doc.nodesBetween(from, to, (node) => {
    if (!node.isTextblock) return true;
    let text = '';
    node.forEach((child) => {
      if (child.isText) text += child.text;
      else if (child.type.name === 'hardBreak') text += '\n';
    });
    lines.push(...text.split('\n'));
    return false;
  });
  if (!lines.length) lines.push('');
  const paras = lines.map((l) => schema.nodes.paragraph.create(null, l ? schema.text(l) : null));
  const tr = state.tr.replaceWith(from, to, paras);
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}
