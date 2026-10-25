import React, { useState } from 'react';
import { STYLE_KINDS, duplicateShortcuts, isParaStyle, normalizeShortcut, stylesOf } from '../lib/styles.js';
import { t, builtinName } from '../lib/i18n.js';
import { confirmDialog, promptDialog } from '../lib/appDialog.js';

const EMPTY = () => ({ name: t('ui.stylesDialog.stil_nou'), type: 'para', bold: false, italic: false, smallCaps: false, underline: false, align: '', indent: 0, size: 100, color: '' });

function slug(name, taken) {
  const base =
    name
      .toLocaleLowerCase('ro')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'stil';
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

// Project stylesheet editor (Scrivener: Format > Style > Show Styles Panel / Redefine).
export default function StylesDialog({ api, project, currentLook, onSave, onClose, onError }) {
  const [styles, setStyles] = useState(() => structuredClone(stylesOf(project)));
  const [sel, setSel] = useState(0);
  const st = styles[sel];
  const dupes = duplicateShortcuts(styles);

  const patch = (p) => setStyles((all) => all.map((x, i) => (i === sel ? { ...x, ...p } : x)));
  const add = () => {
    const id = slug(t('ui.stylesDialog.stil_nou_2'), new Set(styles.map((s) => s.id)));
    setStyles((all) => [...all, { ...EMPTY(), id }]);
    setSel(styles.length);
  };
  const remove = async () => {
    if (!(await confirmDialog({ message: t('ui.stylesDialog.stergi_stilul_x_textul_care', { name: st.name }), okLabel: t('ui.dlg.sterge'), danger: true }))) return;
    setStyles((all) => all.filter((_, i) => i !== sel));
    setSel(0);
  };
  const redefine = () => {
    if (!currentLook) return;
    patch(currentLook);
  };
  const importFrom = async () => {
    try {
      const incoming = await api.readStylesFromProject();
      if (!incoming) return;
      const mode = await promptDialog({ message: t('ui.stylesDialog.stilurile_cu_acelasi_nume_pastreaza'), value: t('ui.stylesDialog.pastreaza'), okLabel: t('ui.dlg.importa') });
      if (mode === null) return;
      setStyles((all) => {
        const out = [...all];
        for (const s of incoming) {
          const idx = out.findIndex((x) => x.name === s.name);
          if (idx < 0) out.push({ ...s, id: slug(s.name, new Set(out.map((x) => x.id))) });
          else if (/înloc|replace/i.test(mode)) out[idx] = { ...s, id: out[idx].id };
          else if (/adaug|add/i.test(mode)) out.push({ ...s, name: t('ui.stylesDialog.x_importat', { name: s.name }), id: slug(`${s.name} importat`, new Set(out.map((x) => x.id))) });
        }
        return out;
      });
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.stylesDialog.stiluri')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.stylesDialog.stiluri')}</h2>
        <div className="styles-layout">
          <ul className="style-list">
            {styles.map((s, i) => (
              <li key={s.id} className={i === sel ? 'on' : ''} onClick={() => setSel(i)}>
                <span className="muted">{s.type === 'both' ? '¶a' : s.type === 'para' ? '¶' : 'a'}</span> {builtinName('style', s)}
                {s.shortcut && <kbd className="muted"> {s.shortcut}</kbd>}
              </li>
            ))}
          </ul>
          {st && (
            <div className="fields">
              <div className="row">
                <label>
                  {t('ui.keywordsDialog.nume')}
                  <input value={st.name} onChange={(e) => patch({ name: e.target.value })} />
                </label>
                <label>
                  {t('ui.projectSettingsDialog.tip')}
                  <select value={st.type} onChange={(e) => patch({ type: e.target.value })}>
                    {STYLE_KINDS.map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="row">
                {isParaStyle(st) && (
                  <label>
                    {t('ui.stylesDialog.stilul_urmator_dupa_enter')}
                    <select value={st.next || ''} onChange={(e) => patch({ next: e.target.value || undefined })}>
                      <option value="">{t('ui.stylesDialog.acelasi_stil')}</option>
                      <option value="none">{t('ui.stylesDialog.fara_stil')}</option>
                      {styles.filter((x) => isParaStyle(x) && x.id !== st.id).map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  {t('ui.stylesDialog.scurtatura')}
                  <input
                    placeholder="ex. Ctrl+Alt+1"
                    defaultValue={st.shortcut || ''}
                    key={`sc-${st.id}`}
                    onBlur={(e) => patch({ shortcut: normalizeShortcut(e.target.value) || undefined })}
                    title={t('ui.stylesDialog.ctrl_sau_cmd_si_sau')}
                  />
                </label>
              </div>
              {dupes.length > 0 && <p className="warn">{t('ui.stylesDialog.scurtatura_folosita_de_mai_multe')} {dupes.join(', ')}</p>}
              <div className="checks">
                {[
                  ['bold', 'Bold'],
                  ['italic', 'Italic'],
                  ['smallCaps', t('ui.compileDialog.majuscule_mici')],
                  ['underline', 'Subliniat'],
                ].map(([k, label]) => (
                  <label key={k} className="check">
                    <input type="checkbox" checked={Boolean(st[k])} onChange={(e) => patch({ [k]: e.target.checked })} /> {label}
                  </label>
                ))}
              </div>
              <div className="row">
                <label>
                  {t('ui.stylesDialog.marime')}
                  <input type="number" min="50" max="300" value={st.size || 100} onChange={(e) => patch({ size: Number(e.target.value) || 100 })} />
                </label>
                <label>
                  {t('ui.collectionsBar.culoare')}
                  <input type="color" value={st.color || '#000000'} onChange={(e) => patch({ color: e.target.value === '#000000' ? '' : e.target.value })} />
                </label>
              </div>
              {isParaStyle(st) && (
                <div className="row">
                  <label>
                    Aliniere
                    <select value={st.align || ''} onChange={(e) => patch({ align: e.target.value })}>
                      <option value="">{t('ui.inspector.implicita')}</option>
                      <option value="left">{t('ui.compileDialog.stanga_2')}</option>
                      <option value="center">{t('ui.compileDialog.centru')}</option>
                      <option value="right">{t('ui.compileDialog.dreapta')}</option>
                      <option value="justify">Justify</option>
                    </select>
                  </label>
                  <label>
                    {t('ui.stylesDialog.indent_stanga_dreapta_em')}
                    <input type="number" min="0" max="10" step="0.5" value={st.indent || 0} onChange={(e) => patch({ indent: Number(e.target.value) || 0 })} />
                  </label>
                </div>
              )}
              <p className="style-preview" style={{
                fontWeight: st.bold ? 700 : 400,
                fontStyle: st.italic ? 'italic' : 'normal',
                fontVariant: st.smallCaps ? 'small-caps' : 'normal',
                textDecoration: st.underline ? 'underline' : 'none',
                textAlign: st.align || 'left',
                fontSize: `${st.size || 100}%`,
                color: st.color || undefined,
                marginLeft: isParaStyle(st) ? `${st.indent || 0}em` : 0,
              }}>
                {t('ui.stylesDialog.fapta_lasa_o_urma_care')}
              </p>
              <div className="ai-actions">
                <button onClick={redefine} disabled={!currentLook} title={t('ui.stylesDialog.preia_aspectul_textului_selectat_in')}>{t('ui.stylesDialog.redefineste_din_selectie')}</button>
                <button onClick={remove}>{t('ui.stylesDialog.sterge_stilul')}</button>
              </div>
            </div>
          )}
        </div>
        <div className="actions">
          <button onClick={add}>{t('ui.stylesDialog.stil_nou_3')}</button>
          {api.readStylesFromProject && <button onClick={importFrom}>{t('ui.stylesDialog.importa_din_alt_proiect')}</button>}
          <span className="spacer" />
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" onClick={() => onSave(styles)}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
