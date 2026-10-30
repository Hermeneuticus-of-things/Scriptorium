// Dialogue Focus (Scrivener 3 §20.3.2): shows only the dialogue lines of the
// project, for proofing who-says-what without reading the narration. A
// paragraph counts as dialogue when it contains a quoted span — Romanian „…”
// (second level «…» counts too), falling back to straight quotes. Pure: no
// React, no IPC.

const BLOCK_RE = /<(p|h[1-6]|li|blockquote|div)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const TAG_RE = /<[^>]*>/g;

// Quoted spans that mark dialogue, most specific first.
const QUOTE_PAIRS = [
  ['\u201E', '\u201D'], // „…”
  ['\u00AB', '\u00BB'], // «…”
  ['"', '"'], // "…" (imported text)
];

function firstQuotePair(text) {
  for (const [open, close] of QUOTE_PAIRS) {
    const a = text.indexOf(open);
    if (a !== -1 && text.indexOf(close, a + open.length) !== -1) return [open, close];
  }
  return null;
}

// Plain paragraph text; block-level inner markup is rare — tags are stripped, entities kept simple.
function plainText(html) {
  return html.replace(TAG_RE, '');
}

/** True when the paragraph's plain text holds a full quoted span. */
export function isDialogueParagraph(html) {
  const text = plainText(html || '');
  return firstQuotePair(text) !== null;
}

/**
 * Dialogue lines per document, in document order.
 * @param {Object<string,string>} docsHtml map of document id → HTML
 * @returns {Object<string,{count:number, lines:Array<{text:string, quote:string}>}>}
 *   only documents that have at least one dialogue line are included.
 */
export function dialogueFocus(docsHtml) {
  const out = {};
  for (const [id, html] of Object.entries(docsHtml || {})) {
    if (!html) continue;
    const lines = [];
    for (const m of (html || '').matchAll(BLOCK_RE)) {
      const text = plainText(m[2]).trim();
      if (!text) continue;
      const pair = firstQuotePair(text);
      if (!pair) continue;
      const open = text.indexOf(pair[0]);
      const close = text.indexOf(pair[1], open + pair[0].length);
      lines.push({ text, quote: text.slice(open, close + pair[1].length) });
    }
    if (lines.length) out[id] = { count: lines.length, lines };
  }
  return out;
}
