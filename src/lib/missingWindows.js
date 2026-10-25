// Pure helpers for the windows added in "audit 2": page view at the Page Setup size,
// the special characters table, the project auto-complete list and the keywords HUD.

const PAPER_MM = { A4: [210, 297], A5: [148, 210], Letter: [215.9, 279.4], Legal: [215.9, 355.6], '6x9': [152.4, 228.6] };
const num = (v, min, max, def) => {
  const n = Number(v);
  return v !== '' && v != null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Page box (cm) for Page View from project.pageSetup: paper size, orientation and margins. */
export function pageViewGeometry(setup) {
  const s = setup && typeof setup === 'object' ? setup : {};
  const p = PAPER_MM[s.size];
  let w = p ? p[0] / 10 : num(s.widthCm, 5, 100, 21);
  let h = p ? p[1] / 10 : num(s.heightCm, 5, 100, 29.7);
  if ((s.orientation === 'landscape') !== w > h) [w, h] = [h, w];
  const m = s.margins || {};
  const fit = (a, b, size) => {
    const room = Math.max(0, size - 2);
    if (a + b <= room) return [a, b];
    const k = room / (a + b);
    return [a * k, b * k];
  };
  let [left, right] = fit(num(m.left, 0, 10, 2.5), num(m.right, 0, 10, 2.5), w);
  let [top, bottom] = fit(num(m.top, 0, 10, 2.5), num(m.bottom, 0, 10, 2.5), h);
  const r = (v) => Math.round(v * 100) / 100;
  [w, h, left, right, top, bottom] = [w, h, left, right, top, bottom].map(r);
  return { width: w, height: h, top, right, bottom, left };
}

/** CSS custom properties consumed by `.page.page-view.page-setup`. */
export function pageViewVars(setup) {
  const g = pageViewGeometry(setup);
  return {
    '--ps-w': `${g.width}cm`,
    '--ps-h': `${g.height}cm`,
    '--ps-mt': `${g.top}cm`,
    '--ps-mr': `${g.right}cm`,
    '--ps-mb': `${g.bottom}cm`,
    '--ps-ml': `${g.left}cm`,
  };
}

/** Insert > Special Characters: categories of characters (labels are i18n keys). */
export const SPECIAL_CHARS = [
  ['punct', '— – ‑ … « » „ ” “ ‘ ’ ‚ ‹ › · • ¶ § † ‡ ′ ″ ¡ ¿ ⁂'],
  ['letters', 'ă â î ș ț Ă Â Î Ș Ț à á ä ã å æ ç è é ê ë ì í ï ñ ò ó ô ö õ ø œ ß ù ú û ü ý ÿ Æ Ç É Ñ Ö Ø Œ Ü'],
  ['math', '± × ÷ ≈ ≠ ≤ ≥ ∞ √ ∑ ∏ ∫ ∂ ∆ π µ ° ‰ ¼ ½ ¾ ⅓ ⅔ ¹ ² ³'],
  ['currency', '€ £ ¥ ¢ $ ₤ ₽ ₹ ₺ ₿'],
  ['symbols', '© ® ™ ℗ № ★ ☆ ♠ ♣ ♥ ♦ ♪ ♫ ✓ ✗ ☐ ☑ ☼ ☾ ✝ ☮ ∴ ∵'],
  ['arrows', '← → ↑ ↓ ↔ ↕ ⇐ ⇒ ⇔ ↩ ↪ ➔'],
  ['greek', 'α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω'],
  ['spaces', '          ​'],
].map(([id, s]) => ({ id, chars: s.split(' ').filter(Boolean) }));

/** Unicode name shown under the table (code point). */
export function charCode(ch) {
  return `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
}

/** Cleans the project auto-complete list: trimmed, unique (case-insensitive), sorted. */
export function normalizeCompletions(list) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const w = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!w || seen.has(w.toLocaleLowerCase())) continue;
    seen.add(w.toLocaleLowerCase());
    out.push(w);
  }
  return out.sort((a, b) => a.localeCompare(b, 'ro'));
}

/** The word being typed at the end of `text` (letters, digits, apostrophe, hyphen). */
export function wordBefore(text) {
  const m = /[\p{L}\p{N}'’-]+$/u.exec(String(text || ''));
  return m ? m[0] : '';
}

/** Completions for `prefix` (case-insensitive, longer than the prefix), shortest first. */
export function completeFromList(list, prefix) {
  const p = String(prefix || '').toLocaleLowerCase();
  if (!p) return [];
  return normalizeCompletions(list)
    .filter((w) => w.toLocaleLowerCase().startsWith(p) && w.length > p.length)
    .sort((a, b) => a.length - b.length || a.localeCompare(b, 'ro'));
}

/** Text to insert so that `prefix` becomes `word` (keeps what was typed, adds the rest). */
export function completionSuffix(word, prefix) {
  return String(word).slice(String(prefix).length);
}

/** Keywords HUD: adds or removes `name` on every node in `ids`. Returns the new tree. */
export function toggleKeywordOn(tree, ids, name) {
  const set = new Set(ids);
  let all = true;
  const walk = (nodes, fn) => nodes.map((n) => fn(n.children ? { ...n, children: walk(n.children, fn) } : n));
  const visit = (nodes) => {
    for (const n of nodes) {
      if (set.has(n.id) && !(n.keywords || []).includes(name)) all = false;
      if (n.children) visit(n.children);
    }
  };
  visit(tree);
  return walk(tree, (n) => {
    if (!set.has(n.id)) return n;
    const kw = (n.keywords || []).filter((k) => k !== name);
    return { ...n, keywords: all ? kw : [...kw, name] };
  });
}
