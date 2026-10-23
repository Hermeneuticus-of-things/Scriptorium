import React, { useState } from 'react';
import { STYLE_KINDS, duplicateShortcuts, isParaStyle, normalizeShortcut, stylesOf } from '../lib/styles.js';

const EMPTY = { name: 'Stil nou', type: 'para', bold: false, italic: false, smallCaps: false, underline: false, align: '', indent: 0, size: 100, color: '' };

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
    const id = slug('stil nou', new Set(styles.map((s) => s.id)));
    setStyles((all) => [...all, { ...EMPTY, id }]);
    setSel(styles.length);
  };
  const remove = () => {
    if (!window.confirm(`Ștergi stilul „${st.name}”? Textul care îl folosește își pierde aspectul stilului.`)) return;
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
      const mode = window.prompt('Stilurile cu același nume: „păstrează” (implicit), „înlocuiește” sau „adaugă” (cu nume nou)?', 'păstrează');
      if (mode === null) return;
      setStyles((all) => {
        const out = [...all];
        for (const s of incoming) {
          const idx = out.findIndex((x) => x.name === s.name);
          if (idx < 0) out.push({ ...s, id: slug(s.name, new Set(out.map((x) => x.id))) });
          else if (/înloc/i.test(mode)) out[idx] = { ...s, id: out[idx].id };
          else if (/adaug/i.test(mode)) out.push({ ...s, name: `${s.name} (importat)`, id: slug(`${s.name} importat`, new Set(out.map((x) => x.id))) });
        }
        return out;
      });
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Stiluri" onClick={(e) => e.stopPropagation()}>
        <h2>Stiluri</h2>
        <div className="styles-layout">
          <ul className="style-list">
            {styles.map((s, i) => (
              <li key={s.id} className={i === sel ? 'on' : ''} onClick={() => setSel(i)}>
                <span className="muted">{s.type === 'both' ? '¶a' : s.type === 'para' ? '¶' : 'a'}</span> {s.name}
                {s.shortcut && <kbd className="muted"> {s.shortcut}</kbd>}
              </li>
            ))}
          </ul>
          {st && (
            <div className="fields">
              <div className="row">
                <label>
                  Nume
                  <input value={st.name} onChange={(e) => patch({ name: e.target.value })} />
                </label>
                <label>
                  Tip
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
                    Stilul următor (după Enter)
                    <select value={st.next || ''} onChange={(e) => patch({ next: e.target.value || undefined })}>
                      <option value="">Același stil</option>
                      <option value="none">Fără stil</option>
                      {styles.filter((x) => isParaStyle(x) && x.id !== st.id).map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Scurtătură
                  <input
                    placeholder="ex. Ctrl+Alt+1"
                    defaultValue={st.shortcut || ''}
                    key={`sc-${st.id}`}
                    onBlur={(e) => patch({ shortcut: normalizeShortcut(e.target.value) || undefined })}
                    title="Ctrl (sau Cmd) și/sau Alt, plus o tastă"
                  />
                </label>
              </div>
              {dupes.length > 0 && <p className="warn">Scurtătură folosită de mai multe stiluri: {dupes.join(', ')}</p>}
              <div className="checks">
                {[
                  ['bold', 'Bold'],
                  ['italic', 'Italic'],
                  ['smallCaps', 'Majuscule mici'],
                  ['underline', 'Subliniat'],
                ].map(([k, label]) => (
                  <label key={k} className="check">
                    <input type="checkbox" checked={Boolean(st[k])} onChange={(e) => patch({ [k]: e.target.checked })} /> {label}
                  </label>
                ))}
              </div>
              <div className="row">
                <label>
                  Mărime (%)
                  <input type="number" min="50" max="300" value={st.size || 100} onChange={(e) => patch({ size: Number(e.target.value) || 100 })} />
                </label>
                <label>
                  Culoare
                  <input type="color" value={st.color || '#000000'} onChange={(e) => patch({ color: e.target.value === '#000000' ? '' : e.target.value })} />
                </label>
              </div>
              {isParaStyle(st) && (
                <div className="row">
                  <label>
                    Aliniere
                    <select value={st.align || ''} onChange={(e) => patch({ align: e.target.value })}>
                      <option value="">Implicită</option>
                      <option value="left">Stânga</option>
                      <option value="center">Centru</option>
                      <option value="right">Dreapta</option>
                      <option value="justify">Justify</option>
                    </select>
                  </label>
                  <label>
                    Indent stânga/dreapta (em)
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
                Fapta lasă o urmă care se maturizează în timp.
              </p>
              <div className="ai-actions">
                <button onClick={redefine} disabled={!currentLook} title="Preia aspectul textului selectat în editor">Redefinește din selecție</button>
                <button onClick={remove}>Șterge stilul</button>
              </div>
            </div>
          )}
        </div>
        <div className="actions">
          <button onClick={add}>+ Stil nou</button>
          {api.readStylesFromProject && <button onClick={importFrom}>Importă din alt proiect…</button>}
          <span className="spacer" />
          <button onClick={onClose}>Anulează</button>
          <button className="primary" onClick={() => onSave(styles)}>Salvează</button>
        </div>
      </div>
    </div>
  );
}
