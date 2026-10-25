import React from 'react';
import { useEditorState } from '@tiptap/react';
import { deleteStyle, isCharStyle, isParaStyle, renameStyle, styleFromLook } from '../lib/styles.js';
import { builtinName, t as tr } from '../lib/i18n.js';
import { confirmDialog, promptDialog } from '../lib/appDialog.js';

// Styles side panel (Format › Styles › Panel): the project's paragraph and character styles;
// a click applies, the style under the cursor is marked, + makes one from the selection.
export default function StylesPanel({ editor, styles = [], onStylesChange, onManage, onClose, readOnly }) {
  const cur = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed || ed.isDestroyed) return { para: null, char: null, empty: true };
      const { $from, empty } = ed.state.selection;
      return { para: $from.parent.attrs.styleName || null, char: ed.getAttributes('charStyle').name || null, empty };
    },
  }) || { para: null, char: null, empty: true };
  const apply = (st) => {
    if (readOnly) return;
    const c = editor.chain().focus();
    if (isCharStyle(st)) {
      if (cur.empty) editor.commands.selectWord?.();
      c.setCharStyle(cur.char === st.id ? null : st.id).run();
    } else c.setParagraphStyle(st.id).run();
  };
  const look = () => {
    const align = ['center', 'right', 'justify'].find((a) => editor.isActive({ textAlign: a })) || '';
    return { bold: editor.isActive('bold'), italic: editor.isActive('italic'), underline: editor.isActive('underline'), smallCaps: editor.isActive('smallCaps'), color: editor.getAttributes('textStyle').color || '', align };
  };
  const add = async (type) => {
    const name = await promptDialog({ message: tr('ui.g5.numeStil'), value: tr('ui.stylesDialog.stil_nou'), okLabel: tr('ui.dlg.creeaza') });
    if (!name || !name.trim()) return;
    const next = styleFromLook(styles, name, type, look());
    onStylesChange?.(next);
    const st = next[next.length - 1];
    if (type === 'para') editor.chain().focus().setParagraphStyle(st.id).run();
    else if (!cur.empty) editor.chain().focus().setCharStyle(st.id).run();
  };
  const rename = async (st) => {
    const name = await promptDialog({ message: tr('ui.g5.numeStil'), value: builtinName('style', st), okLabel: tr('ui.dlg.redenumeste') });
    if (name && name.trim()) onStylesChange?.(renameStyle(styles, st.id, name));
  };
  const remove = async (st) => {
    if (await confirmDialog({ message: tr('ui.stylesDialog.stergi_stilul_x_textul_care', { name: builtinName('style', st) }), okLabel: tr('ui.dlg.sterge'), danger: true })) onStylesChange?.(deleteStyle(styles, st.id));
  };
  const row = (st) => {
    const on = st.id === cur.para || st.id === cur.char;
    return (
      <li key={st.id} className={on ? 'on' : ''} data-style-id={st.id}>
        <button className="style-apply" onClick={() => apply(st)} aria-pressed={on} disabled={readOnly}>
          <span className="muted">{st.type === 'both' ? '¶a' : st.type === 'para' ? '¶' : 'a'}</span> <span style={{ fontWeight: st.bold ? 700 : undefined, fontStyle: st.italic ? 'italic' : undefined, textDecoration: st.underline ? 'underline' : undefined, color: st.color || undefined }}>{builtinName('style', st)}</span>
        </button>
        <button className="link style-rename" onClick={() => rename(st)} title={tr('ui.g5.redenumesteStil')} aria-label={tr('ui.g5.redenumesteStil')}>✎</button>
        <button className="link style-delete" onClick={() => remove(st)} title={tr('ui.g5.stergeStil')} aria-label={tr('ui.g5.stergeStil')}>×</button>
      </li>
    );
  };
  const curName = (id) => { const st = styles.find((s) => s.id === id); return st ? builtinName('style', st) : null; };
  return (
    <aside className="styles-panel" aria-label={tr('ui.g5.panouStiluri')}>
      <div className="styles-panel-inner">
      <div className="styles-panel-head">
        <strong>{tr('ui.g5.panouStiluri')}</strong>
        <button className="link" onClick={onClose} aria-label={tr('btn.close')}>×</button>
      </div>
      <p className="styles-current muted">
        {tr('ui.g5.stilCurent')}: <b>{curName(cur.para) || tr('ui.g5.faraStil')}</b>{cur.char && <> + <b>{curName(cur.char) || cur.char}</b></>}
      </p>
      <h4>{tr('ui.g5.stiluriParagraf')}</h4>
      <ul className="styles-panel-list">
        <li className={!cur.para ? 'on' : ''}>
          <button className="style-apply" disabled={readOnly} onClick={() => editor.chain().focus().setParagraphStyle(null).run()}>{tr('ui.formatBar.noParaStyle')}</button>
        </li>
        {styles.filter(isParaStyle).map(row)}
      </ul>
      <h4>{tr('ui.g5.stiluriCaractere')}</h4>
      <ul className="styles-panel-list">{styles.filter(isCharStyle).map(row)}</ul>
      <div className="styles-panel-actions">
        <button className="style-add-para" disabled={readOnly} onClick={() => add('para')}>+ {tr('ui.g5.dinSelectieParagraf')}</button>
        <button className="style-add-char" disabled={readOnly} onClick={() => add('char')}>+ {tr('ui.g5.dinSelectieCaractere')}</button>
        {onManage && <button className="link" onClick={onManage}>{tr('ui.formatBar.manageStyles')}</button>}
      </div>
      </div>
    </aside>
  );
}
