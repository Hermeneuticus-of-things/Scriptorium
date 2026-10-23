// Current-line highlight (Scrivener "Highlight current line") and configurable fade
// for focus modes. The line is measured from the caret's screen coordinates and drawn
// as an overlay behind the text, so it follows wrapped lines, not whole paragraphs.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const lineHighlightKey = new PluginKey('lineHighlight');

/** Clamp a fade opacity (0.05–1); invalid values give the default 0.28. */
export function fadeOpacity(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(1, Math.max(0.05, n)) : 0.28;
}

export const LineHighlight = Extension.create({
  name: 'lineHighlight',
  addStorage() {
    return { enabled: false, fade: 0.28 };
  },
  addCommands() {
    return {
      setCurrentLineHighlight:
        (on) =>
        ({ editor, tr, dispatch }) => {
          editor.storage.lineHighlight.enabled = Boolean(on);
          if (dispatch) dispatch(tr.setMeta(lineHighlightKey, true));
          return true;
        },
      setFadeOpacity:
        (v) =>
        ({ editor, tr, dispatch }) => {
          editor.storage.lineHighlight.fade = fadeOpacity(v);
          if (dispatch) dispatch(tr.setMeta(lineHighlightKey, true));
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: lineHighlightKey,
        view(view) {
          const bar = document.createElement('div');
          bar.className = 'current-line-overlay';
          bar.style.display = 'none';
          const host = view.dom.parentElement;
          if (host) host.insertBefore(bar, view.dom);
          let lastFade = null;
          const update = () => {
            const { enabled, fade } = ext.storage;
            // Only touch the inline style when the value changes: rewriting an inherited custom
            // property on the editor root restyles every descendant (hundreds of ms per key on
            // large documents with many decorations).
            if (fade !== lastFade) {
              view.dom.style.setProperty('--fade-opacity', String(fade));
              lastFade = fade;
            }
            if (!enabled || !host || !view.hasFocus?.() || typeof view.coordsAtPos !== 'function') {
              bar.style.display = 'none';
              return;
            }
            try {
              const c = view.coordsAtPos(view.state.selection.head);
              const box = host.getBoundingClientRect();
              const dom = view.dom.getBoundingClientRect();
              bar.style.display = 'block';
              bar.style.top = `${c.top - box.top + host.scrollTop - 2}px`;
              bar.style.height = `${Math.max(4, c.bottom - c.top) + 4}px`;
              bar.style.left = `${dom.left - box.left - 6}px`;
              bar.style.width = `${dom.width + 12}px`;
            } catch {
              bar.style.display = 'none';
            }
          };
          const onBlur = () => (bar.style.display = 'none');
          view.dom.addEventListener('blur', onBlur);
          view.dom.addEventListener('focus', update);
          update();
          return {
            update,
            destroy() {
              view.dom.removeEventListener('blur', onBlur);
              view.dom.removeEventListener('focus', update);
              bar.remove();
            },
          };
        },
      }),
    ];
  },
});
