// Options › Behaviors and Navigation: pure helpers used by App.jsx, Binder.jsx and the panes.
import { findNode, produce } from './tree.js';

const textOf = (html) =>
  String(html || '')
    .replace(/<\/(p|h[1-6]|li|div|blockquote|pre)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/** First non-empty line of a document's text, cut at max characters on a word boundary. */
export function firstLineTitle(html, max = 60) {
  const line = textOf(html).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).find(Boolean) || '';
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max / 2 ? cut.slice(0, sp) : cut).trim()}…`;
}

/** True when a title is empty or one of the default names a new item gets. */
export function isUntitled(title, defaults = []) {
  const t = String(title || '').trim();
  return !t || defaults.some((d) => d && d.trim().toLocaleLowerCase() === t.toLocaleLowerCase());
}

/** Text documents that had no sub-documents in `before` and have some in `after` become folders. */
export function folderizeNewParents(before, after) {
  const had = new Set();
  const walk = (ns, fn) => (ns || []).forEach((n) => { fn(n); walk(n.children, fn); });
  walk(before, (n) => n.children && n.children.length && had.add(n.id));
  const ids = [];
  walk(after, (n) => n.type === 'text' && !n.root && n.children && n.children.length && !had.has(n.id) && ids.push(n.id));
  if (!ids.length) return after;
  return produce(after, (t) => {
    for (const id of ids) {
      const n = findNode(t, id);
      if (n) n.type = 'folder';
    }
  });
}

/** View for a binder item by the Behaviors options; null = keep the current view. */
export function viewForNode(node, settings = {}) {
  if (!node || node.root === 'trash') return null;
  const hasKids = Boolean(node.children && node.children.length) || node.type === 'folder';
  if (!hasKids) return null;
  const pick = node.type === 'folder' || node.root ? settings.folderView : settings.parentDocView;
  return pick && pick !== 'keep' ? pick : null;
}

/** View for a selection of several items (Behaviors › multiple selection). */
export function viewForSelection(count, settings = {}) {
  if (count < 2) return null;
  const v = settings.multiSelectView || 'scrivenings';
  return v === 'scrivenings' ? 'editor' : v;
}

/** What double-click on a binder folder does: 'behaviour' falls back to the general double-click. */
export function folderDoubleClickMode(node, settings = {}) {
  const m = settings.folderDoubleClick || 'behaviour';
  if (!node || !(node.children || node.type === 'folder') || m === 'behaviour') return null;
  return m;
}

/** HTML inserted when binder items are dropped in the text ('link' | 'text' | 'image'). */
export function dropHtml(nodes, mode, { docs = {}, images = {}, link = (id) => `scribner://doc/${encodeURIComponent(id)}` } = {}) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const parts = [];
  for (const n of nodes) {
    if (!n) continue;
    if (mode === 'image' && images[n.id]) parts.push(`<p><img src="${esc(images[n.id])}" alt="${esc(n.title)}"></p>`);
    else if (mode === 'text' && n.type === 'text' && docs[n.id]) parts.push(docs[n.id]);
    else parts.push(`<p><a href="${esc(link(n.id))}">${esc(n.title)}</a></p>`);
  }
  // A single link goes inline at the drop point.
  if (parts.length === 1 && mode !== 'text' && parts[0].startsWith('<p><a')) return parts[0].slice(3, -4);
  return parts.join('');
}

/** Short two-note chime (target reached); silent where Web Audio is missing. */
export function playChime() {
  try {
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return false;
    const ctx = new Ctx();
    [[880, 0], [1320, 0.16]].forEach(([f, at]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.32);
    });
    setTimeout(() => ctx.close?.(), 800);
    return true;
  } catch {
    return false;
  }
}

// Cursor positions per document (Navigation › remember the cursor position), for this session.
const CARETS = new Map();
export const rememberCaretPos = (key, pos) => key && CARETS.set(key, pos);
export const caretPosFor = (key) => (key ? CARETS.get(key) : undefined);
