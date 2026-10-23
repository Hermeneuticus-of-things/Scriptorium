import React, { useMemo, useState } from 'react';

// Pick a binder item from a list [{id, title, depth}] (Move To, Append Selection to Document).
export function PickNodeDialog({ title, items, onPick, onClose, emptyText = 'Nimic de ales.' }) {
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
          placeholder="Filtrează…"
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
              <span>{x.title || 'Fără titlu'}</span>
            </li>
          ))}
          {list.length === 0 && <li className="muted">{emptyText}</li>}
        </ul>
        <div className="row-actions">
          <button onClick={onClose}>Renunță</button>
        </div>
      </div>
    </div>
  );
}

// Import Files: choose whether (and how) to split the imported texts.
export function ImportSplitDialog({ onImport, onClose }) {
  const [mode, setMode] = useState('none');
  const [separator, setSeparator] = useState('#');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Importă fișiere" onClick={(e) => e.stopPropagation()}>
        <h3>Importă fișiere</h3>
        <label className="field">
          Împărțire
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="none">Fără împărțire (un document per fișier)</option>
            <option value="h1">La titluri de nivel 1</option>
            <option value="h2">La titluri de nivel 1 și 2</option>
            <option value="separator">La un separator ales</option>
          </select>
        </label>
        {mode === 'separator' && (
          <label className="field">
            Separator
            <input value={separator} onChange={(e) => setSeparator(e.target.value)} />
          </label>
        )}
        <div className="row-actions">
          <button onClick={onClose}>Renunță</button>
          <button
            className="primary"
            onClick={() => {
              onImport(mode, separator || '#');
              onClose();
            }}
          >
            Alege fișierele…
          </button>
        </div>
      </div>
    </div>
  );
}

// Window > Layouts > Manage: rename, delete, apply.
export function LayoutsDialog({ layouts, onChange, onApply, onClose }) {
  const [names, setNames] = useState(() => layouts.map((l) => l.name));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Gestionează layout-urile" onClick={(e) => e.stopPropagation()}>
        <h3>Layout-uri</h3>
        {layouts.length === 0 && <p className="muted">Niciun layout salvat.</p>}
        <ul className="layout-list">
          {layouts.map((l, i) => (
            <li key={`${l.name}-${i}`}>
              <input
                value={names[i] ?? ''}
                onChange={(e) => setNames((n) => n.map((x, k) => (k === i ? e.target.value : x)))}
                onBlur={() => {
                  const name = (names[i] || '').trim();
                  if (name && name !== l.name) onChange(layouts.map((x, k) => (k === i ? { ...x, name } : x)));
                }}
              />
              <button onClick={() => onApply(l)}>Aplică</button>
              <button
                onClick={() => {
                  setNames((n) => n.filter((_x, k) => k !== i));
                  onChange(layouts.filter((_x, k) => k !== i));
                }}
              >
                Șterge
              </button>
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <button onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}
