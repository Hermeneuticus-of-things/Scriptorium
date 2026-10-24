import { createDocument } from "@tiptap/core";
// Replacing a document's content from outside (the same document open in the other split
// pane, comment edits from the Inspector). setContent swapped the whole document, which
// threw the caret of the receiving editor to the end; replacing only the changed range lets
// ProseMirror map the selection, so a caret before or after the edit stays where it was.

/**
 * Adds to `tr` the minimal replace turning `tr.doc` into `next` (a doc node with the same
 * schema). Returns false when the documents are already equal.
 */
export function replaceChangedRange(tr, next) {
  const cur = tr.doc;
  const start = cur.content.findDiffStart(next.content);
  if (start == null) return false;
  let { a: endA, b: endB } = cur.content.findDiffEnd(next.content);
  // findDiffEnd can overlap findDiffStart when the change repeats nearby text.
  const overlap = start - Math.min(endA, endB);
  if (overlap > 0) {
    endA += overlap;
    endB += overlap;
  }
  tr.replace(start, endA, next.slice(start, endB));
  return true;
}

// Saved documents are the editor's own HTML, so spaces in it are the user's: tabs (tab
// stops), double spaces and a leading space must survive a reload. `true` keeps them but
// still ignores whitespace between block tags (pretty-printed/imported HTML).
export const PARSE_OPTIONS = { preserveWhitespace: true };

/** Parses document HTML into a doc node the way the editor loads it. */
export function htmlToDoc(html, schema) {
  return createDocument(html || '<p></p>', schema, PARSE_OPTIONS);
}
