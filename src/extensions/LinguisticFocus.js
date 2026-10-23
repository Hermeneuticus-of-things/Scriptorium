// Linguistic Focus (Scrivener: View > Linguistic Focus): dims every word except
// the chosen part of speech. Uses the heuristic tagger in ../lib/pos.js.
// Commands: setLinguisticFocus(cls | null, lang?) with cls in noun/verb/adj/adv/conj.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { guessLang, tagText } from '../lib/pos.js';
import { updateBlockDecorations } from '../editor/decoRanges.js';

export const linguisticFocusKey = new PluginKey('linguisticFocus');

/** Fading decorations for one text block at `pos`. */
export function blockLinguisticDecorations(node, pos, cls, lang) {
  const decos = [];
  const text = node.textBetween(0, node.content.size, undefined, '￼');
  const l = lang === 'auto' || !lang ? guessLang(text) : lang;
  let last = 0;
  const start = pos + 1;
  for (const w of tagText(text, l)) {
    if (w.tag === cls) {
      if (w.from > last) decos.push(Decoration.inline(start + last, start + w.from, { class: 'faded' }));
      last = w.to;
    }
  }
  if (last < text.length) decos.push(Decoration.inline(start + last, start + text.length, { class: 'faded' }));
  return decos;
}

export function linguisticDecorations(doc, cls, lang) {
  const decos = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    decos.push(...blockLinguisticDecorations(node, pos, cls, lang));
    return false;
  });
  return DecorationSet.create(doc, decos);
}

export const LinguisticFocus = Extension.create({
  name: 'linguisticFocus',
  addStorage() {
    return { cls: null, lang: 'auto' };
  },
  addCommands() {
    return {
      setLinguisticFocus:
        (cls, lang) =>
        ({ editor, tr, dispatch }) => {
          editor.storage.linguisticFocus.cls = cls || null;
          if (lang) editor.storage.linguisticFocus.lang = lang;
          if (dispatch) dispatch(tr.setMeta(linguisticFocusKey, true));
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: linguisticFocusKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old, _o, state) {
            const { cls, lang } = ext.storage;
            if (!cls) return DecorationSet.empty;
            if (tr.getMeta(linguisticFocusKey) || old === DecorationSet.empty) return linguisticDecorations(state.doc, cls, lang);
            if (!tr.docChanged) return old;
            // Typing: re-tag only the touched blocks instead of the whole document.
            return updateBlockDecorations(old, tr, (node, pos) => blockLinguisticDecorations(node, pos, cls, lang));
          },
        },
        props: {
          decorations(state) {
            return linguisticFocusKey.getState(state);
          },
        },
      }),
    ];
  },
});
