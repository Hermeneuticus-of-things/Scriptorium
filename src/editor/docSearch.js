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
      // A match that contains a footnote, image or annotation is skipped: replacing it would
      // delete the note (regex "." matches the placeholder character).
      if (map.slice(m.index, m.index + m[0].length).includes(-1)) continue;
      if (from >= 0 && to >= 0) ranges.push({ from, to: to + 1, match: m });
    }
    return false;
  });
  return ranges;
}

/**
 * Replacement text for one match. Groups ($1..$9, $&, $$) are expanded only in regex mode,
 * so a literal search can insert "$5"; a group the pattern does not have stays literal
 * (as in String.prototype.replace).
 */
export function expandReplacement(replacement, match, regex) {
  if (!regex || !match) return replacement;
  return replacement.replace(/\$(\$|&|\d)/g, (all, g) => {
    if (g === '$') return '$';
    if (g === '&') return match[0];
    const n = Number(g);
    return n >= 1 && n < match.length ? match[n] ?? '' : all;
  });
}

// Replaces the given ranges (from last to first so positions stay valid).
// With regex: true, `replacement` supports $1..$9 groups like the project-wide replace.
export function replaceRanges(editor, ranges, replacement, { regex = false } = {}) {
  if (!ranges.length) return 0;
  const { tr } = editor.state;
  for (const r of [...ranges].sort((a, b) => b.from - a.from)) {
    const text = expandReplacement(replacement, r.match, regex);
    // The formatting of the replaced text itself (bold, italic, comment), not of the text before it.
    const marks = editor.state.doc.nodeAt(r.from)?.marks ?? editor.state.doc.resolve(r.from).marks();
    if (text) tr.replaceWith(r.from, r.to, editor.schema.text(text, marks));
    else tr.delete(r.from, r.to);
  }
  editor.view.dispatch(tr);
  return ranges.length;
}
