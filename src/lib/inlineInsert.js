import { textToHtml } from './text.js';

// A one-line answer goes into the current paragraph as text (no paragraph split);
// several lines become paragraphs. `around` (the replaced text) keeps its outer spaces.
export function insertable(text, around = '') {
  let t = String(text ?? '');
  if (/[\r\n]/.test(t.trim())) return textToHtml(t);
  t = t.trim();
  if (around) {
    const lead = around.match(/^\s*/)[0];
    const trail = around.match(/\s*$/)[0];
    t = lead + t + trail;
  }
  return t ? { type: 'text', text: t } : '';
}
