// Show invisibles (Options → Editing): marks spaces with a "·" decoration and lets CSS
// draw "¶" at paragraph ends. Enabled through the extension option or at runtime with
// editor.commands.setInvisibles(bool); CSS lives in src/behaviour.css under
// [data-invisibles="on"] (set on <html> by applySettingsCss) or .page.invisibles.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { updateBlockDecorations } from './decoRanges.js';

export const invisiblesKey = new PluginKey('invisibles');

/** Positions (relative to the text start) of space characters in `text`. */
export function spaceOffsets(text) {
  const out = [];
  for (let i = 0; i < text.length; i += 1) if (text[i] === ' ' || text[i] === ' ') out.push(i);
  return out;
}

/** Space decorations of one text block at `pos`. */
function buildBlock(block, pos) {
  const decos = [];
  block.forEach((child, offset) => {
    if (!child.isText) return;
    const at = pos + 1 + offset;
    for (const i of spaceOffsets(child.text)) decos.push(Decoration.inline(at + i, at + i + 1, { class: 'inv-space' }));
  });
  return decos;
}

// Only the text near the screen gets dots: a long document has tens of thousands of spaces,
// and one decoration per space made every keystroke re-lay out all of them. `range` is the
// document span on screen plus a margin (null = whole document, e.g. before the view measures).
const inRange = (range, pos, size) => !range || (pos + size >= range[0] && pos <= range[1]);

function build(doc, range) {
  const decos = [];
  const from = range ? Math.max(0, range[0]) : 0;
  const to = range ? Math.min(doc.content.size, range[1]) : doc.content.size;
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    decos.push(...buildBlock(node, pos));
    return false;
  });
  return DecorationSet.create(doc, decos);
}

const MARGIN_PX = 1200;

/** Document range shown in the viewport (plus a margin), or null when it cannot be measured. */
function visibleRange(view) {
  if (!view.dom.isConnected || typeof view.posAtCoords !== 'function') return null;
  const rect = view.dom.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight;
  if (!rect.height || !height) return null;
  const left = rect.left + Math.min(20, rect.width / 2);
  const top = Math.max(rect.top + 1, -MARGIN_PX);
  const bottom = Math.min(rect.bottom - 1, height + MARGIN_PX);
  const at = (y) => view.posAtCoords({ left, top: Math.min(Math.max(y, 0), height - 1) });
  const start = rect.top + 1 >= -MARGIN_PX && rect.top >= 0 ? 0 : at(top)?.pos;
  const end = rect.bottom <= height + MARGIN_PX && rect.bottom <= height ? view.state.doc.content.size : at(bottom)?.pos;
  if (start == null || end == null) return null;
  // posAtCoords only sees the screen; extend by a margin of characters for what is off-screen.
  const pad = Math.round((MARGIN_PX / 20) * 60);
  return [Math.max(0, start - pad), Math.min(view.state.doc.content.size, end + pad)];
}

export const Invisibles = Extension.create({
  name: 'invisibles',
  addOptions() {
    return { enabled: false };
  },
  addCommands() {
    return {
      setInvisibles:
        (on) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(invisiblesKey, Boolean(on));
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    const initial = Boolean(this.options.enabled);
    return [
      new Plugin({
        key: invisiblesKey,
        state: {
          init: (_c, state) => ({ on: initial, range: null, set: initial ? build(state.doc, null) : DecorationSet.empty }),
          apply: (tr, prev, _old, state) => {
            const meta = tr.getMeta(invisiblesKey);
            const toggle = typeof meta === 'boolean' ? meta : undefined;
            const on = toggle === undefined ? prev.on : toggle;
            if (!on) return { on, range: prev.range, set: DecorationSet.empty };
            let range = prev.range && tr.docChanged ? [tr.mapping.map(prev.range[0], -1), tr.mapping.map(prev.range[1], 1)] : prev.range;
            if (meta && typeof meta === 'object' && meta.range !== undefined) range = meta.range;
            if ((toggle !== undefined && toggle !== prev.on) || range !== prev.range && !tr.docChanged) return { on, range, set: build(state.doc, range) };
            // Typing: rebuild only the touched blocks instead of the whole document.
            if (tr.docChanged) {
              const inWindow = (node, pos) => (inRange(range, pos, node.nodeSize) ? buildBlock(node, pos) : []);
              return { on, range, set: updateBlockDecorations(prev.set, tr, inWindow) };
            }
            return prev;
          },
        },
        // Re-measures the visible range after scrolling, resizing or toggling the dots on.
        view: (view) => {
          let frame = 0;
          const measure = () => {
            frame = 0;
            const st = invisiblesKey.getState(view.state);
            if (!st || !st.on || view.isDestroyed) return;
            const range = visibleRange(view);
            const old = st.range;
            if (!range && !old) return;
            if (range && old && Math.abs(range[0] - old[0]) < 2000 && Math.abs(range[1] - old[1]) < 2000) return;
            view.dispatch(view.state.tr.setMeta(invisiblesKey, { range }).setMeta('addToHistory', false));
          };
          const schedule = () => {
            if (!frame) frame = requestAnimationFrame(measure);
          };
          window.addEventListener('scroll', schedule, true);
          window.addEventListener('resize', schedule);
          schedule();
          return {
            update: (v, prevState) => {
              const now = invisiblesKey.getState(v.state);
              const before = invisiblesKey.getState(prevState);
              if (now?.on && (!before?.on || !now.range)) schedule();
            },
            destroy: () => {
              if (frame) cancelAnimationFrame(frame);
              window.removeEventListener('scroll', schedule, true);
              window.removeEventListener('resize', schedule);
            },
          };
        },
        props: {
          decorations: (state) => invisiblesKey.getState(state).set,
          attributes: (state) => (invisiblesKey.getState(state).on ? { 'data-invisibles': 'on' } : {}),
        },
      }),
    ];
  },
});
