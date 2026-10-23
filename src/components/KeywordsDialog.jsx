import React, { useMemo, useState } from 'react';
import { listKeywords, addKeyword, renameKeyword, deleteKeyword, setKeywordColor, setKeywordParent } from '../lib/collections.js';

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
      window.alert(`Cuvântul cheie „${n}” există deja.`);
      return;
    }
    setDraft(addKeyword(draft, n));
    setNewName('');
  };

  const rename = (k) => {
    const next = window.prompt('Nume nou pentru cuvântul cheie:', k.name);
    if (!next || !next.trim() || next.trim() === k.name) return;
    const target = next.trim();
    if (keywords.some((x) => x.name === target) && !window.confirm(`„${target}” există deja. Unești cele două cuvinte cheie?`)) return;
    setDraft(renameKeyword(draft, k.name, target));
  };

  const remove = (k) => {
    const msg = k.count
      ? `Ștergi „${k.name}”? Va fi scos din ${k.count} ${k.count === 1 ? 'document' : 'documente'}.`
      : `Ștergi „${k.name}”?`;
    if (window.confirm(msg)) setDraft(deleteKeyword(draft, k.name));
  };

  const search = (name) => {
    if (dirty) onSave(draft);
    onSearchKeyword?.(name);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Cuvinte cheie" onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>Cuvinte cheie ale proiectului</h2>
        <div className="kw-add">
          <input
            placeholder="Cuvânt cheie nou"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            aria-label="Cuvânt cheie nou"
          />
          <button onClick={add} disabled={!newName.trim()}>Adaugă</button>
          <input placeholder="Filtrează" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrează" />
        </div>
        {keywords.length === 0 ? (
          <p className="muted">Proiectul nu are încă niciun cuvânt cheie.</p>
        ) : (
          <div className="kw-list">
            <table className="kw-table">
              <thead>
                <tr>
                  <th>Culoare</th>
                  <th>Nume</th>
                  <th>Părinte</th>
                  <th className="kw-count">Utilizări</th>
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
                        aria-label={`Culoare pentru ${k.name}`}
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
                        aria-label={`Părinte pentru ${k.name}`}
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
                        <button onClick={() => search(k.name)} disabled={!onSearchKeyword}>Caută</button>
                        <button onClick={() => rename(k)}>Redenumește</button>
                        <button onClick={() => remove(k)}>Șterge</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">Redenumirea și ștergerea se aplică în toate documentele după ce salvezi.</p>
        <div className="actions">
          <button onClick={onClose}>Anulează</button>
          <button
            className="primary"
            disabled={!dirty}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
}
