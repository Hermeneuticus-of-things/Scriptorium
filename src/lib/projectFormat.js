// Project-wide "Convert to default formatting" (ROADMAP #40): the same reset the Format Bar does
// on one document, applied headless per document across the project. Identical pipeline = identical
// result: a headless tiptap editor with the project extensions, defaults from
// project.defaultFormatting, then resetToDefault over the whole document.
import { Editor } from '@tiptap/core';
import { resetToDefault } from '../editor/formatting.js';

/**
 * Converts one document's HTML to the project's default formatting, headless.
 * @returns {{ html: string, changed: boolean }} `changed` is false when nothing had to be reset
 * (the document already matches the defaults) — the caller skips snapshot+write for it.
 */
export function convertHtmlToDefault(html, buildExtensions, defaults = {}) {
  const ed = new Editor({ extensions: buildExtensions({}), content: html || '<p></p>' });
  try {
    ed.storage.paragraphFormat.defaults = defaults; // same channel as the live editor (Editor.jsx:515)
    const tr = resetToDefault(ed.state, ed.state.tr, defaults);
    ed.view.dispatch(tr);
    const out = ed.getHTML();
    return { html: out, changed: out !== (html || '<p></p>') };
  } finally {
    ed.destroy();
  }
}
