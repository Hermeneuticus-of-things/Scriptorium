// Typing corrections (Options → Corrections): smart dashes, smart ellipsis,
// sentence capitalization and user auto-replacements. The decision logic is pure
// (correctionFor) so it can be tested without an editor; the TipTap side wraps it
// in input rules, so Backspace or Ctrl+Z right after a correction reverts it.
import { Extension, InputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
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
  const { smartDashes = true, smartEllipsis = true, autoCapitalize = false, smartFractions = false, replacements = [], fixTwoCaps = false, fixCapsLock = false, capitalizeDays = false, dayLanguages = ['en'], capExceptions = [] } = opts;
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
    // Word fixes when the word is finished: DOuble CApitals, cAPS lOCK, day names.
    if (fixTwoCaps || fixCapsLock || capitalizeDays) {
      const m = /[\p{L}\p{M}]+$/u.exec(text);
      // Not inside codes, addresses or file names (a2BC, x@ABc, path/ABc).
      if (m && !(m.index > 0 && /[\p{N}_@/\\.-]/u.test(text[m.index - 1]))) {
        const fixed = fixWord(m[0], { fixTwoCaps, fixCapsLock, capitalizeDays, dayLanguages });
        if (fixed !== m[0]) return { deleteFrom: m[0].length, insert: fixed + ch };
      }
    }
  }
  // Capitalize the first letter of a sentence (start of block or after . ! ? … + space).
  if (autoCapitalize && /\p{Ll}/u.test(ch) && isSentenceStart(text, capExceptions)) {
    return { deleteFrom: 0, insert: ch.toLocaleUpperCase('ro') };
  }
  return null;
}

/** Day names that take a capital letter, per language (Romanian writes them in lower case). */
export const DAY_NAMES = {
  en: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  de: ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag', 'sonnabend'],
};

/**
 * Corrections applied to a finished word: "DOuble" → "Double" (two capitals at the start of a
 * word followed by lower case), "cAPS" → "Caps" (typed with Caps Lock on by accident),
 * "monday" → "Monday" for the languages in dayLanguages.
 */
export function fixWord(word, { fixTwoCaps = true, fixCapsLock = true, capitalizeDays = true, dayLanguages = ['en'] } = {}) {
  const w = String(word ?? '');
  const chars = [...w];
  const lower = (c) => /[\p{Ll}\p{M}]/u.test(c);
  const upper = (c) => /[\p{Lu}\p{M}]/u.test(c);
  if (fixCapsLock && chars.length >= 3 && /\p{Ll}/u.test(chars[0]) && /\p{Lu}/u.test(chars[1]) && chars.slice(1).every(upper)) {
    return chars[0].toLocaleUpperCase() + chars.slice(1).join('').toLocaleLowerCase();
  }
  if (fixTwoCaps && chars.length >= 3 && /\p{Lu}/u.test(chars[0]) && /\p{Lu}/u.test(chars[1]) && /\p{Ll}/u.test(chars[2]) && chars.slice(2).every(lower)) {
    return chars[0] + chars[1].toLocaleLowerCase() + chars.slice(2).join('');
  }
  if (capitalizeDays && /^\p{Ll}/u.test(w)) {
    const low = w.toLocaleLowerCase();
    for (const lang of dayLanguages || []) {
      const base = String(lang).toLowerCase().split(/[-_]/)[0];
      if ((DAY_NAMES[base] || []).includes(low)) return chars[0].toLocaleUpperCase() + chars.slice(1).join('');
    }
  }
  return w;
}

/** Abbreviations after which a capital letter is not forced (the user's list adds to these). */
export const CAP_EXCEPTIONS = ['etc', 'nr', 'dl', 'dna', 'ex', 'pag', 'vol', 'cap', 'art', 'dr', 'prof', 'str', 'cf', 'vs', 'mr', 'mrs', 'e.g', 'i.e', 'ș.a'];

/** Parses the exceptions field ("dr., etc., nr.") into bare lower-case abbreviations. */
export function parseCapExceptions(text) {
  return String(text ?? '')
    .split(/[,;\n]+/)
    .map((x) => x.trim().replace(/\.+$/, '').toLocaleLowerCase())
    .filter(Boolean);
}

const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when a letter typed after `before` starts a sentence (not after an abbreviation). */
export function isSentenceStart(before, exceptions = []) {
  // Strip trailing opening quotes/brackets with a loop: /[…]+$/ is quadratic on long runs.
  let t = String(before ?? '');
  let end = t.length;
  while (end > 0 && '„"«(['.includes(t[end - 1])) end--;
  t = t.slice(0, end);
  if (t === '' || /^\s*$/.test(t)) return true;
  if (!/[.!?…]\s+$/u.test(t)) return false;
  if (!/\.\s+$/.test(t)) return true;
  const list = [...CAP_EXCEPTIONS, ...(exceptions || []).map((x) => String(x).replace(/\.+$/, '').toLocaleLowerCase())].filter(Boolean);
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}.])(?:${list.map(escapeRe).join('|')})\\.\\s+$`, 'iu');
  return !re.test(t);
}

// --- Quotes ----------------------------------------------------------------

/** Pairs for typed " (double) and ' (single). 'straight' leaves the character as typed. */
export const QUOTE_STYLES = {
  ro: ['„', '”'],
  en: ['“', '”'],
  de: ['„', '“'],
  guillemets: ['«', '»'],
  guillemetsIn: ['»', '«'],
  straight: ['"', '"'],
};
export const SINGLE_QUOTE_STYLES = {
  ro: ['«', '»'],
  en: ['‘', '’'],
  de: ['‚', '‘'],
  angle: ['‹', '›'],
  straight: ["'", "'"],
};
const QUOTE_OPENER = /[\s([{<„“‘‚«‹—–\-/]/u;

/**
 * Replacement for a typed " or ' given the block text before the cursor and the chosen pairs.
 * A ' inside a word (O'Brien, l'a) or with no pending opener is an apostrophe (’), unless the
 * single style is 'straight'.
 */
export function smartQuote(before, ch, double = 'ro', single = 'ro') {
  const b = String(before ?? '');
  const prev = b.slice(-1);
  const opens = prev === '' || QUOTE_OPENER.test(prev);
  if (ch === '"') {
    const [o, c] = QUOTE_STYLES[double] || QUOTE_STYLES.ro;
    return opens ? o : c;
  }
  if (single === 'straight') return "'";
  const [o, c] = SINGLE_QUOTE_STYLES[single] || SINGLE_QUOTE_STYLES.ro;
  if (opens) return o;
  // Close a pending opener (one without a matching closer after it); otherwise an apostrophe.
  if (o !== c && b.lastIndexOf(o) > b.lastIndexOf(c)) return c;
  return '’';
}

// --- Spelling: words left out, live checking ---------------------------------

/**
 * Ranges [{from, to}] (offsets in `text`) that the spell checker should skip: web and e-mail
 * addresses, words in CAPITALS (2+ letters) and words that contain digits.
 */
export function spellIgnoreRanges(text, { ignoreUpper = true, ignoreDigits = true, ignoreUrls = true } = {}) {
  const out = [];
  const t = String(text ?? '');
  if (ignoreUrls) {
    for (const m of t.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"”»]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/giu)) {
      out.push({ from: m.index, to: m.index + m[0].replace(/[.,;:!?)]+$/, '').length });
    }
  }
  for (const m of t.matchAll(/[\p{L}\p{M}\p{N}_]+/gu)) {
    const w = m[0];
    if (out.some((r) => m.index >= r.from && m.index < r.to)) continue;
    const letters = [...w].filter((c) => /\p{L}/u.test(c)).length;
    if (ignoreDigits && /\p{N}/u.test(w) && letters) out.push({ from: m.index, to: m.index + w.length });
    else if (ignoreUpper && letters >= 2 && !/\p{Ll}/u.test(w)) out.push({ from: m.index, to: m.index + w.length });
  }
  return out.sort((a, b) => a.from - b.from);
}

// --- Grammar (simple, offline rules) -------------------------------------------

/**
 * Grammar and punctuation problems in one paragraph of text: a repeated word ("the the"),
 * two spaces between words, a space before , . ; : ! ?, no space after , ; before a letter,
 * a sentence that starts in lower case. Returns [{from, to, kind}] (offsets in `text`).
 */
export function grammarIssues(text, exceptions = []) {
  const t = String(text ?? '');
  const out = [];
  // Each word with the next one (look-ahead, so every pair is compared).
  for (const m of t.matchAll(/(?<![\p{L}\p{M}])([\p{L}\p{M}]+)(?=(\s+)([\p{L}\p{M}]+)(?![\p{L}\p{M}]))/gu)) {
    if (m[1].toLocaleLowerCase() !== m[3].toLocaleLowerCase()) continue;
    out.push({ from: m.index, to: m.index + m[1].length + m[2].length + m[3].length, kind: 'repeat' });
  }
  for (const m of t.matchAll(/(?<=\S) {2,}(?=\S)/gu)) out.push({ from: m.index, to: m.index + m[0].length, kind: 'spaces' });
  for (const m of t.matchAll(/(?<=[\p{L}\p{N}]) +[,.;:!?](?![.\p{N}])/gu)) out.push({ from: m.index, to: m.index + m[0].length, kind: 'spaceBefore' });
  for (const m of t.matchAll(/(?<=\p{L})[,;](?=\p{L})/gu)) out.push({ from: m.index, to: m.index + 1, kind: 'spaceAfter' });
  for (const m of t.matchAll(/[.!?]\s+\p{Ll}/gu)) {
    const at = m.index + m[0].length - 1;
    if (/\.\.$/.test(t.slice(0, m.index + 1))) continue; // "..." does not end a sentence for sure
    if (!isSentenceStart(t.slice(0, at), exceptions)) continue;
    out.push({ from: at, to: at + 1, kind: 'lowerStart' });
  }
  return out.sort((a, b) => a.from - b.from);
}

const checkKey = new PluginKey('correctionsCheck');

/** Decorations for grammar issues and for words the spell checker should leave alone. */
export function checkDecorations(doc, opts) {
  const decos = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (node.type.spec.code) return false;
    // Offsets → positions, as in docSearch (atoms count as one opaque character).
    const map = [];
    let text = '';
    node.forEach((child, offset) => {
      if (child.isText) {
        for (let i = 0; i < child.text.length; i++) map.push(pos + 1 + offset + i);
        text += child.text;
      } else {
        map.push(-1);
        text += '￼';
      }
    });
    const add = (r, attrs) => {
      const a = map[r.from];
      const b = map[r.to - 1];
      if (a >= 0 && b >= 0) decos.push(Decoration.inline(a, b + 1, attrs));
    };
    if (opts.spellCheck !== false && (opts.ignoreUpper || opts.ignoreDigits || opts.ignoreUrls)) {
      for (const r of spellIgnoreRanges(text, opts)) add(r, { spellcheck: 'false', class: 'spell-skip' });
    }
    if (opts.grammarCheck) {
      for (const r of grammarIssues(text, opts.capExceptions)) add(r, { class: `grammar-issue grammar-${r.kind}`, 'data-grammar': r.kind });
    }
    return false;
  });
  return DecorationSet.create(doc, decos);
}

/** Live spell checking on/off, words the spell checker skips, grammar marks. */
export function checkPlugin(opts) {
  const active = Boolean(opts.grammarCheck || (opts.spellCheck !== false && (opts.ignoreUpper || opts.ignoreDigits || opts.ignoreUrls)));
  return new Plugin({
    key: checkKey,
    state: {
      init: (_, state) => (active ? checkDecorations(state.doc, opts) : DecorationSet.empty),
      apply: (tr, old) => (active && tr.docChanged ? checkDecorations(tr.doc, opts) : old.map(tr.mapping, tr.doc)),
    },
    props: {
      attributes: opts.spellCheck === false ? { spellcheck: 'false' } : {},
      decorations(state) {
        return checkKey.getState(state);
      },
    },
  });
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
    return {
      smartDashes: true, smartEllipsis: true, autoCapitalize: false, smartFractions: false, replacements: [], getReplacements: null, onLearn: null,
      fixTwoCaps: false, fixCapsLock: false, capitalizeDays: false, dayLanguages: ['en'], capExceptions: [],
      spellCheck: true, grammarCheck: false, ignoreUpper: false, ignoreDigits: false, ignoreUrls: false,
    };
  },
  addInputRules() {
    const base = this.options;
    const live = typeof base.getReplacements === 'function';
    if (!base.smartDashes && !base.smartEllipsis && !base.autoCapitalize && !base.smartFractions && !base.fixTwoCaps && !base.fixCapsLock && !base.capitalizeDays && !(base.replacements || []).length && !live) return [];
    // One rule matching any single typed char; correctionFor decides.
    return [
      new InputRule({
        find: /[\s\S]$/u,
        handler: ({ state, range, match }) => {
          const ch = match[0];
          const $from = state.doc.resolve(range.from);
          if ($from.parent.type.spec.code) return null;
          const before = $from.parent.textBetween(Math.max(0, $from.parentOffset - 256), $from.parentOffset, undefined, '￼'); // last 256 chars are enough
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
    return [checkPlugin(this.options), ...(this.options.onLearn ? [learnPlugin(this.options.onLearn)] : [])];
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
