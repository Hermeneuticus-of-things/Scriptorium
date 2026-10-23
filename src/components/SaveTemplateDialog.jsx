import React, { useState } from 'react';
import { t as tr } from '../lib/i18n.js';

const CATEGORIES = ['Ale mele', 'Ficțiune', 'Non-ficțiune', 'Scenariu', 'Poezie', 'Generale'];
const ICONS = ['📄', '📘', '📖', '✒️', '🎬', '🎭', '📝', '🍲', '🎓', '📜'];

// File > Save as Template: copies the project (structure, texts, settings) into the user's templates.
export default function SaveTemplateDialog({ api, dir, project, onSaved, onClose, onError }) {
  const [title, setTitle] = useState(project?.title || '');
  const [category, setCategory] = useState('Ale mele');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📄');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const t = await api.saveAsTemplate(dir, { title: title.trim(), category: category.trim(), description, icon });
      onSaved?.(t);
      onClose();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={tr('ui.saveTemplateDialog.salveaza_ca_sablon')} onClick={(e) => e.stopPropagation()}>
        <h2>{tr('ui.saveTemplateDialog.salveaza_proiectul_ca_sablon')}</h2>
        <p className="muted">{tr('ui.saveTemplateDialog.structura_textele_si_setarile_proiectului')}</p>
        <label>
          {tr('ui.advancedSearchDialog.titlu')}
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label>
          Categorie
          <input list="tpl-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="tpl-categories">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label>
          Descriere
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="row" role="radiogroup" aria-label={tr('ui.inspector.icoana')}>
          {ICONS.map((i) => (
            <button key={i} type="button" role="radio" aria-checked={icon === i} className={icon === i ? 'primary' : ''} onClick={() => setIcon(i)}>
              {i}
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={onClose}>{tr('btn.cancel')}</button>
          <button className="primary" disabled={busy || !title.trim()} onClick={save}>{busy ? tr('ui.saveTemplateDialog.se_salveaza') : tr('ui.saveTemplateDialog.salveaza_sablonul')}</button>
        </div>
      </div>
    </div>
  );
}
