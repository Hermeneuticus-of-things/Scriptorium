// Pure helpers for the AI panels: before/after diff, per-session result history,
// what each action does with its result, clickable citations in research answers.
import { diffWords } from 'diff';

/** Word diff of two plain texts: [{ value, added?, removed? }]. */
export function diffParts(before, after) {
  return diffWords(String(before || ''), String(after || '')).map((p) => ({ value: p.value, added: Boolean(p.added), removed: Boolean(p.removed) }));
}

/** True when the diff contains no change at all. */
export const noChange = (parts) => parts.every((p) => !p.added && !p.removed);

/**
 * What the panel does with a result:
 * replace (proofread: diff + Accept/Reject), insert (continue), synopsis, read (feedback, consistency, ask).
 */
export function actionKind(action) {
  if (action === 'proofread' || action === 'translate') return 'replace';
  if (action === 'continue') return 'insert';
  if (action === 'summarize') return 'synopsis';
  return 'read';
}

let seq = 0;
/** Ring buffer of the last `max` AI results, newest first. */
export function createHistory(max = 10) {
  let items = [];
  return {
    add(entry) {
      const item = { ...entry, id: `h${Date.now().toString(36)}${(seq++).toString(36)}`, at: entry.at || Date.now() };
      items = [item, ...items].slice(0, max);
      return item;
    },
    list: () => items.slice(),
    clear() {
      items = [];
    },
  };
}

// One history for the whole app session, so it survives closing and reopening the panel.
export const sessionHistory = createHistory(10);

/**
 * Splits an answer into text and citation parts: "[1]" or "[2, 3]" become { cite: n } for each
 * n in 1..count; numbers outside that range stay plain text.
 */
export function citationParts(text, count) {
  const out = [];
  const re = /\[(\d+(?:\s*[,;]\s*\d+)*)\]/g;
  let last = 0;
  let m;
  const s = String(text || '');
  while ((m = re.exec(s))) {
    const nums = m[1].split(/[,;]/).map((x) => Number(x.trim()));
    if (!nums.every((n) => n >= 1 && n <= count)) continue;
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    nums.forEach((n) => out.push({ cite: n }));
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/** Human label of the provider/model shown in the panels. */
export function providerText(label, model) {
  if (!label && !model) return '';
  return model ? `${label || 'AI'} · ${model}` : label;
}
