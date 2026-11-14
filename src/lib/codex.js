// Codex pentru cărți (directivă autor, 14 nov 2026 — cercetarea AI-UX, direcția B):
// entități structurate ale cărții (Personaj/Locație/Termen/Obiect/Altfel) cu descriere și
// aliasuri, **injectate automat în contextul AI** când sunt menționate în textul lucrat —
// modelul Lorebook (NovelAI) / Codex (Novelcrafter), integrat cu binder-ul Pneuma.
// Pur: fără React, fără IPC — testabil unitar.

import { flatten } from './tree.js';

// Fold care păstrează lungimea (1 code-point în → 1 out) — pozițiile din textul foldat
// rămân valide în original, ca în quickSearch (fold1to1).
const FOLD_MAP = new Map();
function fold1to1(s) {
  let out = '';
  for (const ch of String(s || '')) {
    let f = FOLD_MAP.get(ch);
    if (f === undefined) {
      const d = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      f = [...d].length === 1 ? d : ch;
      FOLD_MAP.set(ch, f);
    }
    out += f;
  }
  return out;
}

export const CODEX_TYPES = ['Personaj', 'Locație', 'Termen', 'Obiect', 'Altfel'];

/** Normalizează o intrare Codex din proiect: {id,name,type,description,aliases}. */
export function codexEntity(raw) {
  return {
    id: raw.id,
    name: String(raw.name || ''),
    type: CODEX_TYPES.includes(raw.type) ? raw.type : 'Altfel',
    description: String(raw.description || ''),
    aliases: (raw.aliases || []).filter(Boolean).map(String),
  };
}

export function codexFromProject(project) {
  return (project?.codex || []).map(codexEntity);
}

/** Termenii căutabili ai unei entități: numele + aliasurile, foldate. */
function searchableTerms(entity) {
  return [entity.name, ...entity.aliases].map(fold1to1).filter((t) => t.length >= 3);
}

/** Potrivirea pe cuvinte întregi foldate, ca să „Ion" nu prindă „Ionel". */
function textMentions(foldedText, term) {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
  return re.test(foldedText);
}

/** Entitățile Codex menționate în text (nume sau alias, cuvinte întregi, fold pe diacritice). */
export function codexMatches(text, entities) {
  const folded = fold1to1(text || '');
  const out = [];
  const seen = new Set();
  for (const entity of entities || []) {
    if (seen.has(entity.id)) continue;
    for (const term of searchableTerms(entity)) {
      if (textMentions(folded, term)) {
        seen.add(entity.id);
        out.push(entity);
        break;
      }
    }
  }
  return out;
}

/** Secțiunea „Codex" pentru contextul AI, în limita bugetului rămas. */
export function codexContextSection(matched, budgetLeft) {
  if (!matched.length || budgetLeft <= 0) return { section: '', used: 0, entities: [] };
  let section = '\n## Codex (personaje, locații, lore-ul cărții — respectă-le exact):\n';
  const entities = [];
  for (const e of matched) {
    const line = `- ${e.name}${e.type !== 'Altfel' ? ` (${e.type})` : ''}: ${e.description || '(fără descriere)'}\n`;
    if (section.length + line.length > budgetLeft) break;
    section += line;
    entities.push({ id: e.id, name: e.name, type: e.type });
  }
  return { section, used: section.length, entities };
}
