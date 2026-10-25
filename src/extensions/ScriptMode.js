// TipTap extension: Script Mode. Stores the element as data-script on paragraphs.
// Tab / Shift-Tab cycle elements, Enter creates the next element, uppercase
// elements are transformed on input. Also accepts imported data-style ids.
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { ALL_SCRIPT_ELEMENTS, completeCharacter, completeSceneHeading, completeTransition, isUppercase, nextOnEnter, nextOnTab } from '../lib/scriptFormats.js';

// The element under the cursor of the focused script editor, for the footer indicator
// ("Dialog — Tab: Paranteză, Enter: Personaj") and its element menu.
const listeners = new Set();
let current = { element: null, setElement: null };
/** Subscribes to the current script element; returns the unsubscribe function. */
export function onScriptElement(cb) {
  listeners.add(cb);
  cb(current);
  return () => listeners.delete(cb);
}
/** Current element and a setter that changes the element of the paragraph at the cursor. */
export function currentScriptElement() {
  return current;
}
function publish(next) {
  if (next.element === current.element && next.setElement === current.setElement) return;
  current = next;
  for (const cb of listeners) cb(current);
}

export const ScriptMode = Extension.create({
  name: 'scriptMode',

  addOptions() {
    return {
      getFormat: () => null, // returns format id ('screenplay'…) or null when script mode is off
      getCharacters: () => [], // names for autocomplete
      getSceneHeadings: () => [], // earlier scene headings for autocomplete
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          script: {
            default: null,
            parseHTML: (el) => {
              const s = el.getAttribute('data-script');
              if (s) return s;
              const st = el.getAttribute('data-style');
              return st && ALL_SCRIPT_ELEMENTS.includes(st) ? st : null;
            },
            renderHTML: (a) => (a.script ? { 'data-script': a.script } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setScriptElement:
        (element) =>
        ({ commands }) =>
          commands.updateAttributes('paragraph', { script: element || null }),
      cycleScriptElement:
        (shift = false) =>
        ({ editor, commands }) => {
          const fmt = this.options.getFormat();
          if (!fmt) return false;
          const cur = editor.getAttributes('paragraph').script;
          return commands.updateAttributes('paragraph', { script: nextOnTab(fmt, cur, shift) });
        },
      completeCharacterName:
        () =>
        ({ editor, state, dispatch }) => {
          const { $from, empty } = state.selection;
          if (!empty || editor.getAttributes('paragraph').script !== 'character') return false;
          const text = $from.parent.textContent;
          const [hit] = completeCharacter(this.options.getCharacters() || [], text);
          if (!hit) return false;
          if (dispatch) dispatch(state.tr.insertText(hit.slice(text.length), $from.end()));
          return true;
        },
      completeSceneHeading:
        () =>
        ({ editor, state, dispatch }) => {
          const { $from, empty } = state.selection;
          if (!empty || editor.getAttributes('paragraph').script !== 'scene-heading') return false;
          if ($from.parentOffset !== $from.parent.content.size) return false;
          const text = $from.parent.textContent;
          const [hit] = completeSceneHeading(this.options.getSceneHeadings() || [], text);
          if (!hit) return false;
          const typed = text.replace(/^\s+/, '').length;
          if (dispatch) dispatch(state.tr.insertText(hit.slice(typed), $from.end()));
          return true;
        },
      completeTransition:
        () =>
        ({ editor, state, dispatch }) => {
          const { $from, empty } = state.selection;
          if (!empty || editor.getAttributes('paragraph').script !== 'transition') return false;
          if ($from.parentOffset !== $from.parent.content.size) return false;
          const text = $from.parent.textContent;
          const [hit] = completeTransition(text);
          if (!hit) return false;
          if (dispatch) dispatch(state.tr.insertText(hit.slice(text.trim().length), $from.end()));
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    const active = () => !!this.options.getFormat() && this.editor.isActive('paragraph');
    return {
      Tab: () => {
        if (!active()) return false;
        // On a character line with a matching prefix, Tab completes first.
        if (this.editor.commands.completeCharacterName()) return true;
        if (this.editor.commands.completeSceneHeading()) return true;
        if (this.editor.commands.completeTransition()) return true;
        return this.editor.commands.cycleScriptElement(false);
      },
      'Shift-Tab': () => active() && this.editor.commands.cycleScriptElement(true),
      Enter: () => {
        if (!active()) return false;
        const fmt = this.options.getFormat();
        const { $from } = this.editor.state.selection;
        const cur = this.editor.getAttributes('paragraph').script;
        const isEmpty = $from.parent.content.size === 0;
        if (isEmpty && cur) return this.editor.commands.setScriptElement(nextOnEnter(fmt, cur, true));
        const next = nextOnEnter(fmt, cur, false);
        return this.editor.chain().splitBlock().updateAttributes('paragraph', { script: next }).run();
      },
    };
  },

  addProseMirrorPlugins() {
    const ext = this;
    // Uppercase typed text inside uppercase elements.
    const report = (view) => {
      const fmt = ext.options.getFormat();
      if (!fmt || !view.hasFocus()) return;
      const parent = view.state.selection.$from.parent;
      const element = parent.type.name === 'paragraph' ? parent.attrs.script || null : null;
      publish({ element, format: fmt, setElement: ext._setElement || (ext._setElement = (el) => ext.editor && !ext.editor.isDestroyed && ext.editor.chain().focus().setScriptElement(el).run()) });
    };
    return [
      new Plugin({
        view: (v) => {
          report(v);
          return { update: (view) => report(view), destroy: () => current.setElement === ext._setElement && publish({ element: null, setElement: null }) };
        },
        props: {
          handleDOMEvents: {
            focus: (view) => {
              setTimeout(() => report(view), 0);
              return false;
            },
          },
          handleTextInput(view, from, to, text) {
            const fmt = ext.options.getFormat();
            if (!fmt) return false;
            const parent = view.state.doc.resolve(from).parent;
            const el = parent.type.name === 'paragraph' ? parent.attrs.script : null;
            if (!el || !isUppercase(fmt, el) || text === text.toUpperCase()) return false;
            view.dispatch(view.state.tr.insertText(text.toUpperCase(), from, to));
            return true;
          },
        },
      }),
    ];
  },
});

export default ScriptMode;
