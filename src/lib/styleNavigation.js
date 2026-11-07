// Style navigation (Scrivener 3 §17.4.1 — Select Style Range, Next/Previous in Same Style,
// Select All with Style). Pure: a ProseMirror doc + a caret position in, ranges out —
// testable in Node without an editor; the Editor handle and App registry only dispatch.
//
// What counts as an identifiable paragraph style ("decizie de stil", parity item P1 #27):
// - a named paragraph style, i.e. the `styleName` attribute (data-style) set on a
//   paragraph/heading — what the project stylesheet (src/lib/styles.js) applies;
// - a bare heading, identified by its outline level as "heading:<level>" — Scrivener's
//   Heading 1/2/3 are stock styles, so navigation must work on headings without data-style;
// - a plain paragraph without styleName has NO identifiable style: the four commands are
//   disabled there (hasIdentifiableStyle is the gate).
// "Select All with Style" parity decision (task P1 #27): tiptap supports a single selection,
// so it selects from the FIRST to the LAST paragraph with the style, like Scrivener's
// documented "selects from first to last".

/**
 * Identifiable style id of a textblock, or null. Named style wins over the heading level.
 */
export function paraStyleId(node) {
  if (!node || !node.isTextblock) return null;
  const named = node.attrs.styleName;
  if (named) return named;
  if (node.type.name === 'heading') return `heading:${node.attrs.level ?? 1}`;
  return null;
}

/** All textblocks in document order with their absolute start position and style id. */
export function textblocks(doc) {
  const out = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) out.push({ node, pos, style: paraStyleId(node) });
    return true; // blockquote/listItem/table cell paragraphs are textblocks deeper in
  });
  return out;
}

/** The textblock containing (or starting right at) `pos`; null when there is none. */
function textblockAt(doc, pos) {
  const $p = doc.resolve(pos);
  if ($p.parent.isTextblock) return { node: $p.parent, pos: $p.before() };
  if ($p.nodeAfter && $p.nodeAfter.isTextblock) return { node: $p.nodeAfter, pos };
  if ($p.nodeBefore && $p.nodeBefore.isTextblock) return { node: $p.nodeBefore, pos: pos - $p.nodeBefore.nodeSize };
  return null;
}

/** Current block if it carries an identifiable style, else null (the commands' gate). */
function currentStyledBlock(doc, pos) {
  // Not a real ProseMirror doc (test mocks pass a plain {descendants, textBetween}): no style.
  if (!doc || typeof doc.resolve !== 'function') return null;
  const tb = textblockAt(doc, pos);
  if (!tb) return null;
  const style = paraStyleId(tb.node);
  return style ? { ...tb, style } : null;
}

const spanOf = (first, last) => ({ from: first.pos + 1, to: last.pos + last.node.nodeSize - 1 });
const caretOf = (block) => ({ from: block.pos + 1, to: block.pos + 1 });

/**
 * Select Style Range: the contiguous run of textblocks with the current block's style,
 * extending up and down until the style changes (an unstyled block breaks the run).
 * Returns {from, to} spanning the run's text, or null when the caret has no identifiable style.
 */
export function styleRangeAt(doc, pos) {
  const cur = currentStyledBlock(doc, pos);
  if (!cur) return null;
  const blocks = textblocks(doc);
  const idx = blocks.findIndex((b) => b.pos === cur.pos);
  if (idx < 0) return null;
  let a = idx;
  let b = idx;
  while (a > 0 && blocks[a - 1].style === cur.style) a--;
  while (b < blocks.length - 1 && blocks[b + 1].style === cur.style) b++;
  return spanOf(blocks[a], blocks[b]);
}

/**
 * Next in Same Style: caret position (start of content) of the next textblock with the
 * same style, cyclic (after the last instance wraps to the first). Null when the caret
 * has no identifiable style or the style has a single instance (nowhere to jump).
 */
export function nextStyleBlock(doc, pos) {
  return sameStyleNeighbour(doc, pos, 1);
}

/** Previous in Same Style: the same, backwards, cyclic at the first instance. */
export function prevStyleBlock(doc, pos) {
  return sameStyleNeighbour(doc, pos, -1);
}

function sameStyleNeighbour(doc, pos, dir) {
  const cur = currentStyledBlock(doc, pos);
  if (!cur) return null;
  const same = textblocks(doc).filter((b) => b.style === cur.style);
  if (same.length <= 1) return null;
  const idx = same.findIndex((b) => b.pos === cur.pos);
  return caretOf(same[(idx + dir + same.length) % same.length]);
}

/**
 * Select All with Style: {from, to, count} from the first to the last textblock with the
 * current style (parity decision — see the header). Null when no identifiable style.
 */
export function allStyleRange(doc, pos) {
  const cur = currentStyledBlock(doc, pos);
  if (!cur) return null;
  const same = textblocks(doc).filter((b) => b.style === cur.style);
  return { ...spanOf(same[0], same[same.length - 1]), count: same.length };
}

/** Whether the caret sits on a paragraph with an identifiable style (drives `disabled`). */
export function hasIdentifiableStyle(doc, pos) {
  return Boolean(currentStyledBlock(doc, pos));
}
