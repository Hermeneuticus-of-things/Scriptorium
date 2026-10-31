import React, { useMemo, useState } from 'react';
import { t } from '../lib/i18n.js';

// Pick a binder item from a list [{id, title, depth}] (Move To, Append Selection to Document).
export function PickNodeDialog({ title, items, onPick, onClose, emptyText = t('ui.batchADialogs.nimic_de_ales') }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('ro');
    return needle ? items.filter((x) => (x.title || '').toLocaleLowerCase('ro').includes(needle)) : items;
  }, [items, q]);
  const pick = (x) => {
    if (!x) return;
    onPick(x.id);
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal goto" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <input
          autoFocus
          placeholder={t('ui.batchADialogs.filtreaza')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') pick(list[0]);
            else if (e.key === 'Escape') onClose();
          }}
        />
        <ul className="goto-list">
          {list.map((x) => (
            <li key={x.id} style={{ paddingLeft: 8 + (q ? 0 : (x.depth || 0) * 14) }} onClick={() => pick(x)}>
              <span>{x.title || t('ui.app.fara_titlu')}</span>
            </li>
          ))}
          {list.length === 0 && <li className="muted">{emptyText}</li>}
        </ul>
        <div className="row-actions">
          <button onClick={onClose}>{t('ui.batchADialogs.renunta')}</button>
        </div>
      </div>
    </div>
  );
}

// Import Files: choose whether (and how) to split the imported texts.
export function ImportSplitDialog({ onImport, onClose }) {
  const [mode, setMode] = useState('none');
  const [separator, setSeparator] = useState('#');
  const [firstLineTitle, setFirstLineTitle] = useState(false);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={t('ui.batchADialogs.importa_fisiere')} onClick={(e) => e.stopPropagation()}>
        <h3>{t('ui.batchADialogs.importa_fisiere')}</h3>
        <label className="field">
          {t('ui.batchADialogs.impartire')}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="none">{t('ui.batchADialogs.fara_impartire_un_document_per')}</option>
            <option value="h1">{t('ui.batchADialogs.la_titluri_de_nivel_1')}</option>
            <option value="h2">{t('ui.batchADialogs.la_titluri_de_nivel_1_2')}</option>
            <option value="separator">{t('ui.batchADialogs.la_un_separator_ales')}</option>
          </select>
        </label>
        {mode === 'separator' && (
          <label className="field">
            Separator
            <input value={separator} onChange={(e) => setSeparator(e.target.value)} />
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={firstLineTitle} onChange={(e) => setFirstLineTitle(e.target.checked)} /> {t('ui.g4.primulRandTitlu')}
        </label>
        <div className="row-actions">
          <button onClick={onClose}>{t('ui.batchADialogs.renunta')}</button>
          <button
            className="primary"
            onClick={() => {
              onImport(mode, separator || '#', { firstLineTitle });
              onClose();
            }}
          >
            {t('ui.batchADialogs.alege_fisierele')}
          </button>
        </div>
      </div>
    </div>
  );
}
