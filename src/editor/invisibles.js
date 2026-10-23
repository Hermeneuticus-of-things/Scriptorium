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

function build(doc) {
  const decos = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    decos.push(...buildBlock(node, pos));
    return false;
  });
  return DecorationSet.create(doc, decos);
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
          init: (_c, state) => ({ on: initial, set: initial ? build(state.doc) : DecorationSet.empty }),
          apply: (tr, prev, _old, state) => {
            const meta = tr.getMeta(invisiblesKey);
            const on = meta === undefined ? prev.on : meta;
            if (!on) return { on, set: DecorationSet.empty };
            if (meta !== undefined && meta !== prev.on) return { on, set: build(state.doc) };
            // Typing: rebuild only the touched blocks instead of the whole document.
            if (tr.docChanged) return { on, set: updateBlockDecorations(prev.set, tr, buildBlock) };
            return prev;
          },
        },
        props: {
          decorations: (state) => invisiblesKey.getState(state).set,
          attributes: (state) => (invisiblesKey.getState(state).on ? { 'data-invisibles': 'on' } : {}),
        },
      }),
    ];
  },
});
