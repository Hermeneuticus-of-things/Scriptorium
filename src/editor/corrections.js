// Typing corrections (Options → Corrections): smart dashes, smart ellipsis,
// sentence capitalization and user auto-replacements. The decision logic is pure
// (correctionFor) so it can be tested without an editor; the TipTap side wraps it
// in input rules, so Backspace or Ctrl+Z right after a correction reverts it.
import { Extension, InputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { matchCase } from '../lib/learnCorrections.js';

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
      if (!r || !r.from) continue;
      // Learned entries (lower case) match any case and keep the case typed.
      const tail = text.slice(-r.from.length);
      if (r.learned ? tail.toLowerCase() !== r.from : tail !== r.from) continue;
      const prev = text[text.length - r.from.length - 1];
      if (WORD.test(r.from[0]) && prev && WORD.test(prev)) continue;
      return { deleteFrom: r.from.length, insert: (r.learned ? matchCase(tail, r.to ?? '') : r.to ?? '') + ch };
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
  // Above the history extension, so Ctrl+Y can restore a reverted correction before plain redo runs.
  priority: 1000,
  addOptions() {
    // getReplacements: live list (changes without rebuilding the editor); onLearn(from, to): a word
    // replaced by hand, called once the new word is finished (see learnPlugin).
    return { smartDashes: true, smartEllipsis: true, autoCapitalize: false, smartFractions: false, replacements: [], getReplacements: null, onLearn: null };
  },
  addInputRules() {
    const base = this.options;
    const live = typeof base.getReplacements === 'function';
    if (!base.smartDashes && !base.smartEllipsis && !base.autoCapitalize && !base.smartFractions && !(base.replacements || []).length && !live) return [];
    // One rule matching any single typed char; correctionFor decides.
    return [
      new InputRule({
        find: /[\s\S]$/u,
        handler: ({ state, range, match }) => {
          const ch = match[0];
          const $from = state.doc.resolve(range.from);
          if ($from.parent.type.spec.code) return null;
          const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
          const opts = live ? { ...base, replacements: [...(base.replacements || []), ...(base.getReplacements() || [])] } : base;
          const c = correctionFor(before, ch, opts);
          if (!c) return null;
          state.tr.insertText(c.insert, range.from - c.deleteFrom, range.to);
          return undefined;
        },
      }),
    ];
  },
  // Ctrl/Cmd+Z right after an input rule (ours or Typography's) undoes only the correction.
  // Ctrl/Cmd+Y (or Shift+Z) right after that brings the correction back, as in Word. The
  // corrected document is remembered and only the changed range is put back.
  addProseMirrorPlugins() {
    return this.options.onLearn ? [learnPlugin(this.options.onLearn)] : [];
  },
  addStorage() {
    return { reverted: null }; // { after: doc once reverted, corrected: doc before, selection }
  },
  addKeyboardShortcuts() {
    const redoCorrection = () => {
      const r = this.storage.reverted;
      const { state, view } = this.editor;
      if (!r || r.after !== state.doc) return false;
      this.storage.reverted = null;
      const start = r.corrected.content.findDiffStart(state.doc.content);
      if (start == null) return false;
      const end = r.corrected.content.findDiffEnd(state.doc.content);
      const tr = state.tr.replace(start, end.b, r.corrected.slice(start, end.a));
      tr.setSelection(r.selection.map(tr.mapping).resolve(tr.doc));
      view.dispatch(tr);
      return true;
    };
    return {
      'Mod-z': () => {
        const corrected = this.editor.state.doc;
        const selection = this.editor.state.selection;
        const ok = this.editor.commands.undoInputRule();
        this.storage.reverted = ok ? { after: this.editor.state.doc, corrected, selection: selection.getBookmark() } : null;
        return ok;
      },
      'Mod-y': redoCorrection,
      'Shift-Mod-z': redoCorrection,
    };
  },
});

const isLetter = (c) => /[\p{L}\p{M}'’-]/u.test(c);
const learnKey = new PluginKey('learnCorrections');

/**
 * Watches for a word replaced by hand: a selection that is exactly one word gets replaced by typing
 * (or by a spelling suggestion). When the cursor leaves the new word, onLearn(old, new) is called.
 * Deciding whether the pair is a typo fix is left to onLearn.
 */
export function learnPlugin(onLearn) {
  let pending = null; // { pos, word }
  return new Plugin({
    key: learnKey,
    appendTransaction(trs, oldState) {
      for (const tr of trs) {
        if (!tr.docChanged) continue;
        if (pending) pending = { ...pending, pos: tr.mapping.map(pending.pos, -1) };
        const sel = oldState.selection;
        const step = tr.steps[0];
        if (sel.empty || !step || step.from !== sel.from || step.to !== sel.to || tr.getMeta('history$') || tr.getMeta('paste')) continue;
        const word = oldState.doc.textBetween(sel.from, sel.to, '\n', '\n');
        const before = sel.from > 0 ? oldState.doc.textBetween(sel.from - 1, sel.from, '\n', '\n') : '';
        const after = oldState.doc.textBetween(sel.to, Math.min(sel.to + 1, oldState.doc.content.size), '\n', '\n');
        const whole = word.length > 1 && [...word].every(isLetter) && !isLetter(before) && !isLetter(after);
        pending = whole ? { pos: sel.from, word } : null;
      }
      return null;
    },
    view() {
      return {
        update(view) {
          if (!pending) return;
          const { doc, selection } = view.state;
          const $pos = doc.resolve(Math.min(pending.pos, doc.content.size));
          const parentStart = $pos.start();
          const text = $pos.parent.textBetween(0, $pos.parent.content.size, '\n', '\n');
          let end = pending.pos - parentStart;
          while (end < text.length && isLetter(text[end])) end++;
          const word = text.slice(pending.pos - parentStart, end);
          const head = selection.head;
          // Still typing the word: wait.
          if (selection.empty && head >= pending.pos && head <= parentStart + end && head === parentStart + end) return;
          const old = pending.word;
          pending = null;
          if (word && word !== old) onLearn(old, word);
        },
      };
    },
  });
}
