// Typing corrections (Options → Corrections): smart dashes, smart ellipsis,
// sentence capitalization and user auto-replacements. The decision logic is pure
// (correctionFor) so it can be tested without an editor; the TipTap side wraps it
// in input rules, so Backspace or Ctrl+Z right after a correction reverts it.
import { Extension, InputRule } from '@tiptap/core';

const WORD = /[\p{L}\p{N}_]/u;

/** Vulgar fractions used by the smartFractions correction. */
export const FRACTIONS = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘', '1/6': '⅙', '5/6': '⅚', '1/7': '⅐', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞', '1/9': '⅑', '1/10': '⅒' };

/**
 * Given the text of the current block before the cursor (`before`) and the character
 * just typed (`ch`), returns the correction to apply or null:
 * { deleteFrom: number of chars to remove from the end of `before`, insert: replacement text incl. `ch` }.
 */
export function correctionFor(before, ch, opts = {}) {
  const { smartDashes = true, smartEllipsis = true, autoCapitalize = false, smartFractions = false, replacements = [] } = opts;
  const text = String(before ?? '');
  // "1/2" → "½" when a non-digit follows a standalone fraction
  if (smartFractions && !/[\d/]/.test(ch)) {
    const m = /(?:^|[^\d/])(\d{1,2}\/\d{1,2})$/.exec(text);
    if (m && FRACTIONS[m[1]]) return { deleteFrom: m[1].length, insert: FRACTIONS[m[1]] + ch };
  }
  // "--" → "—" (fires on the second hyphen)
  if (smartDashes && ch === '-' && text.endsWith('-') && !text.endsWith('--')) return { deleteFrom: 1, insert: '—' };
  // "..." → "…"
  if (smartEllipsis && ch === '.' && text.endsWith('..') && !text.endsWith('...')) return { deleteFrom: 2, insert: '…' };
  // Replacements: when a word boundary is typed after a replacement's "from".
  if (!WORD.test(ch)) {
    for (const r of replacements || []) {
      if (!r || !r.from || !text.endsWith(r.from)) continue;
      const prev = text[text.length - r.from.length - 1];
      if (WORD.test(r.from[0]) && prev && WORD.test(prev)) continue;
      return { deleteFrom: r.from.length, insert: (r.to ?? '') + ch };
    }
  }
  // Capitalize the first letter of a sentence (start of block or after . ! ? … + space).
  if (autoCapitalize && /\p{Ll}/u.test(ch) && isSentenceStart(text)) {
    return { deleteFrom: 0, insert: ch.toLocaleUpperCase('ro') };
  }
  return null;
}

/** True when a letter typed after `before` starts a sentence. */
export function isSentenceStart(before) {
  // Strip trailing opening quotes/brackets with a loop: /[…]+$/ is quadratic on long runs.
  let t = String(before ?? '');
  let end = t.length;
  while (end > 0 && '„"«(['.includes(t[end - 1])) end--;
  t = t.slice(0, end);
  if (t === '' || /^\s*$/.test(t)) return true;
  return /[.!?…]\s+$/u.test(t) && !/\b(?:etc|nr|dl|dna|ex|pag|vol|cap|art)\.\s+$/iu.test(t);
}

/** Applies a sequence of typed characters with correctionFor (handy for tests and previews). */
export function simulateTyping(chars, opts) {
  let out = '';
  for (const ch of chars) {
    const c = correctionFor(out, ch, opts);
    out = c ? out.slice(0, out.length - c.deleteFrom) + c.insert : out + ch;
  }
  return out;
}

export const Corrections = Extension.create({
  name: 'corrections',
  addOptions() {
    return { smartDashes: true, smartEllipsis: true, autoCapitalize: false, smartFractions: false, replacements: [] };
  },
  addInputRules() {
    const opts = this.options;
    if (!opts.smartDashes && !opts.smartEllipsis && !opts.autoCapitalize && !opts.smartFractions && !(opts.replacements || []).length) return [];
    // One rule matching any single typed char; correctionFor decides.
    return [
      new InputRule({
        find: /[\s\S]$/u,
        handler: ({ state, range, match }) => {
          const ch = match[0];
          const $from = state.doc.resolve(range.from);
          if ($from.parent.type.spec.code) return null;
          const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
          const c = correctionFor(before, ch, opts);
          if (!c) return null;
          state.tr.insertText(c.insert, range.from - c.deleteFrom, range.to);
          return undefined;
        },
      }),
    ];
  },
  // Ctrl/Cmd+Z right after an input rule (ours or Typography's) undoes only the correction.
  addKeyboardShortcuts() {
    return { 'Mod-z': () => this.editor.commands.undoInputRule() };
  },
});
