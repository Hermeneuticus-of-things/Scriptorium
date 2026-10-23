import React, { useMemo, useState } from 'react';
import { listKeywords, addKeyword, renameKeyword, deleteKeyword, setKeywordColor, setKeywordParent } from '../lib/collections.js';
import { t } from '../lib/i18n.js';

const CSS = `
.kw-list { max-height: 55vh; overflow: auto; border: 1px solid var(--line); border-radius: 6px; }
.kw-table { width: 100%; border-collapse: collapse; }
.kw-table th, .kw-table td { padding: 4px 6px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
.kw-table th { color: var(--muted); font-weight: 500; position: sticky; top: 0; background: var(--paper); }
.kw-table input[type=color] { width: 30px; height: 24px; padding: 0; border: none; background: none; }
.kw-name { display: flex; align-items: center; gap: 6px; }
.kw-count { color: var(--muted); text-align: right; }
.kw-row-actions { display: flex; gap: 4px; justify-content: flex-end; }
.kw-row-actions button { font-size: 12px; padding: 2px 6px; }
.kw-add { display: flex; gap: 6px; align-items: center; margin: 10px 0; }
.kw-add input { flex: 1; }
`;

export default function KeywordsDialog({ project, onSave, onClose, onSearchKeyword }) {
  const [draft, setDraft] = useState(project);
  const [newName, setNewName] = useState('');
  const [filter, setFilter] = useState('');
  const keywords = useMemo(() => listKeywords(draft), [draft]);
  const dirty = draft !== project;

  // Depth-first order honouring parents (roots first, children indented).
  const ordered = useMemo(() => {
    const names = new Set(keywords.map((k) => k.name));
    const byParent = new Map();
    for (const k of keywords) {
      const p = k.parent && names.has(k.parent) ? k.parent : null;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p).push(k);
    }
    const out = [];
    const seen = new Set();
    const visit = (p, depth) => {
      for (const k of byParent.get(p) || []) {
        if (seen.has(k.name)) continue;
        seen.add(k.name);
        out.push({ ...k, depth });
        visit(k.name, depth + 1);
      }
    };
    visit(null, 0);
    for (const k of keywords) if (!seen.has(k.name)) out.push({ ...k, depth: 0 });
    const f = filter.trim().toLocaleLowerCase('ro');
    return f ? out.filter((k) => k.name.toLocaleLowerCase('ro').includes(f)) : out;
  }, [keywords, filter]);

  const add = () => {
    const n = newName.trim();
    if (!n) return;
    if (keywords.some((k) => k.name === n)) {
      window.alert(t('ui.keywordsDialog.cuvantul_cheie_x_exista_deja', { n: n }));
      return;
    }
    setDraft(addKeyword(draft, n));
    setNewName('');
  };

  const rename = (k) => {
    const next = window.prompt(t('ui.keywordsDialog.nume_nou_pentru_cuvantul_cheie'), k.name);
    if (!next || !next.trim() || next.trim() === k.name) return;
    const target = next.trim();
    if (keywords.some((x) => x.name === target) && !window.confirm(t('ui.keywordsDialog.x_exista_deja_unesti_cele', { target: target }))) return;
    setDraft(renameKeyword(draft, k.name, target));
  };

  const remove = (k) => {
    const msg = k.count
      ? t('ui.keywordsDialog.stergi_x_va_fi_scos', { name: k.name, count: k.count, v2: k.count === 1 ? 'document' : t('ui.advancedSearchDialog.documente') })
      : t('ui.keywordsDialog.stergi_x', { name: k.name });
    if (window.confirm(msg)) setDraft(deleteKeyword(draft, k.name));
  };

  const search = (name) => {
    if (dirty) onSave(draft);
    onSearchKeyword?.(name);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.advancedSearchDialog.cuvinte_cheie')} onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>{t('ui.keywordsDialog.cuvinte_cheie_ale_proiectului')}</h2>
        <div className="kw-add">
          <input
            placeholder={t('ui.keywordsDialog.cuvant_cheie_nou')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            aria-label={t('ui.keywordsDialog.cuvant_cheie_nou')}
          />
          <button onClick={add} disabled={!newName.trim()}>{t('btn.add')}</button>
          <input placeholder={t('ui.keywordsDialog.filtreaza')} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('ui.keywordsDialog.filtreaza')} />
        </div>
        {keywords.length === 0 ? (
          <p className="muted">{t('ui.keywordsDialog.proiectul_nu_are_inca_niciun')}</p>
        ) : (
          <div className="kw-list">
            <table className="kw-table">
              <thead>
                <tr>
                  <th>{t('ui.collectionsBar.culoare')}</th>
                  <th>{t('ui.keywordsDialog.nume')}</th>
                  <th>{t('ui.keywordsDialog.parinte')}</th>
                  <th className="kw-count">{t('ui.keywordsDialog.utilizari')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ordered.map((k) => (
                  <tr key={k.name}>
                    <td>
                      <input
                        type="color"
                        value={k.color || '#cccccc'}
                        onChange={(e) => setDraft(setKeywordColor(draft, k.name, e.target.value))}
                        aria-label={t('ui.keywordsDialog.culoare_pentru_x', { name: k.name })}
                      />
                    </td>
                    <td>
                      <span className="kw-name" style={{ paddingLeft: k.depth * 16 }}>
                        {k.depth > 0 && <span className="muted">↳</span>}
                        {k.name}
                      </span>
                    </td>
                    <td>
                      <select
                        value={k.parent || ''}
                        onChange={(e) => setDraft(setKeywordParent(draft, k.name, e.target.value || null))}
                        aria-label={t('ui.keywordsDialog.parinte_pentru_x', { name: k.name })}
                      >
                        <option value="">(niciunul)</option>
                        {keywords
                          .filter((o) => o.name !== k.name)
                          .map((o) => (
                            <option key={o.name} value={o.name}>
                              {o.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="kw-count">{k.count}</td>
                    <td>
                      <div className="kw-row-actions">
                        <button onClick={() => search(k.name)} disabled={!onSearchKeyword}>{t('ui.advancedSearchDialog.cauta')}</button>
                        <button onClick={() => rename(k)}>{t('set.binderDbl.rename')}</button>
                        <button onClick={() => remove(k)}>{t('btn.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">{t('ui.keywordsDialog.redenumirea_si_stergerea_se_aplica')}</p>
        <div className="actions">
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button
            className="primary"
            disabled={!dirty}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            {t('btn.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
