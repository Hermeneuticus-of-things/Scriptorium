// Full-text search over the manual. Diacritics- and case-insensitive.
// Pure module: used by HelpWindow and by tests.

const DECODE = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

export function htmlToPlain(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(lt|gt|amp|quot|#39|nbsp);/g, (m) => DECODE[m])
    .replace(/\s+/g, ' ')
    .trim();
}

/** Folds case and Romanian diacritics (ș/ş, ț/ţ, ă, â, î) keeping string length. */
export function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ş/g, 's')
    .replace(/ţ/g, 't');
}

// fold() on NFD strips combining marks, which can change length for precomposed letters;
// build the folded text char by char so indexes map back to the original.
function foldWithMap(s) {
  let out = '';
  for (const ch of String(s)) out += fold(ch).charAt(0) || ch;
  return out;
}

export function terms(query) {
  return fold(query).split(/\s+/).filter((t) => t.length > 1 || /\d|[<$]/.test(t));
}

/** Index: [{chapterId, chapterTitle, sectionId, title, text, folded, foldedTitle}] */
export function buildIndex(manual) {
  const out = [];
  for (const ch of manual) {
    for (const s of ch.sections) {
      const text = htmlToPlain(s.html);
      out.push({ chapterId: ch.id, chapterTitle: ch.title, sectionId: s.id, title: s.title, text, folded: foldWithMap(text), foldedTitle: fold(`${ch.title} ${s.title}`) });
    }
  }
  return out;
}

const escHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Snippet (HTML-escaped) around the first match, with <mark> on every term. */
export function snippet(entry, ts, radius = 70) {
  const first = Math.max(0, Math.min(...ts.map((t) => entry.folded.indexOf(t)).filter((i) => i >= 0), entry.text.length));
  const start = Math.max(0, first - radius);
  const end = Math.min(entry.text.length, first + radius * 2);
  const raw = entry.text.slice(start, end);
  const folded = entry.folded.slice(start, end);
  const marks = [];
  for (const t of ts) {
    let i = folded.indexOf(t);
    while (i >= 0) {
      marks.push([i, i + t.length]);
      i = folded.indexOf(t, i + t.length);
    }
  }
  marks.sort((a, b) => a[0] - b[0]);
  let html = '';
  let pos = 0;
  for (const [a, b] of marks) {
    if (a < pos) continue;
    html += escHtml(raw.slice(pos, a)) + '<mark>' + escHtml(raw.slice(a, b)) + '</mark>';
    pos = b;
  }
  html += escHtml(raw.slice(pos));
  return (start > 0 ? '…' : '') + html + (end < entry.text.length ? '…' : '');
}

/**
 * Searches the manual. Every term must appear (in the title or the text).
 * Returns [{chapterId, chapterTitle, sectionId, title, score, snippet}] best first.
 */
export function searchManual(manualOrIndex, query, limit = 50) {
  const ts = terms(query);
  if (!ts.length) return [];
  const index = manualOrIndex.length && manualOrIndex[0].sections ? buildIndex(manualOrIndex) : manualOrIndex;
  const out = [];
  for (const e of index) {
    let score = 0;
    let ok = true;
    for (const t of ts) {
      const inTitle = e.foldedTitle.includes(t);
      const count = e.folded.split(t).length - 1;
      if (!inTitle && !count) {
        ok = false;
        break;
      }
      score += (inTitle ? 10 : 0) + Math.min(count, 5);
    }
    if (ok) out.push({ chapterId: e.chapterId, chapterTitle: e.chapterTitle, sectionId: e.sectionId, title: e.title, score, snippet: snippet(e, ts) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Resolves a topic (section id, chapter id or "chapter/section") to {chapterId, sectionId}. */
export function resolveTopic(manual, topic) {
  if (!topic) return null;
  const [a, b] = String(topic).split('/');
  for (const ch of manual) {
    if (b && ch.id === a && ch.sections.some((s) => s.id === b)) return { chapterId: a, sectionId: b };
    if (!b && ch.id === a) return { chapterId: a, sectionId: ch.sections[0]?.id || null };
    const s = ch.sections.find((x) => x.id === (b || a));
    if (s) return { chapterId: ch.id, sectionId: s.id };
  }
  return null;
}

// Context help: view / panel / dialog name -> manual section.
export const CONTEXT_TOPICS = {
  editor: 'editor-basics',
  scrivenings: 'scrivenings-basics',
  corkboard: 'corkboard-basics',
  outline: 'outline-basics',
  inspector: 'inspector-basics',
  binder: 'binder-basics',
  composition: 'scrivenings-composition',
  compile: 'compile-basics',
  timeline: 'tools-timeline',
  relations: 'tools-relations',
  pacing: 'tools-pacing',
  editorial: 'irep-basics',
  ai: 'ai-assistant',
  settings: 'settings-tabs',
  shortcuts: 'shortcuts-config',
  find: 'search-project',
  advsearch: 'search-advanced',
  targets: 'targets-project',
  stats: 'targets-stats',
  styles: 'styles-basics',
  import: 'import-files',
  export: 'import-export',
  projectSettings: 'projects-properties',
  script: 'script-basics',
};
