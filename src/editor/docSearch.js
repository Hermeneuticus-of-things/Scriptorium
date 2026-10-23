// Find & replace inside one ProseMirror document. Matches run per text block, so a
// match can span bold/italic runs but never crosses a paragraph boundary.

// Returns [{from, to}] document ranges for every match of `re` (a /g regex).
export function findRanges(doc, re) {
  const ranges = [];
  if (!re) return ranges;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Map each character of textContent to its document position.
    const map = [];
    let text = '';
    node.forEach((child, offset) => {
      if (child.isText) {
        for (let i = 0; i < child.text.length; i++) map.push(pos + 1 + offset + i);
        text += child.text;
      } else {
        // atoms (footnotes, images) count as one opaque character
        map.push(-1);
        text += '￼';
      }
    });
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m[0] === '') {
        re.lastIndex++;
        continue;
      }
      const from = map[m.index];
      const to = map[m.index + m[0].length - 1];
      if (from >= 0 && to >= 0) ranges.push({ from, to: to + 1, match: m });
    }
    return false;
  });
  return ranges;
}

// Replaces the given ranges (from last to first so positions stay valid).
// `replacement` supports $1..$9 groups like the project-wide replace.
export function replaceRanges(editor, ranges, replacement) {
  if (!ranges.length) return 0;
  const { tr } = editor.state;
  for (const r of [...ranges].sort((a, b) => b.from - a.from)) {
    const text = replacement.replace(/\$(\d)/g, (_, d) => r.match[Number(d)] ?? '');
    const marks = editor.state.doc.resolve(r.from).marks();
    if (text) tr.replaceWith(r.from, r.to, editor.schema.text(text, marks));
    else tr.delete(r.from, r.to);
  }
  editor.view.dispatch(tr);
  return ranges.length;
}
