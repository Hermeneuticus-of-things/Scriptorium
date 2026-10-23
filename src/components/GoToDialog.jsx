import React, { useMemo, useState } from 'react';

// Quick jump to any document by title (Scrivener: Navigate > Go To, Ctrl+G).
export default function GoToDialog({ items, onGo, onClose }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('ro');
    const filtered = needle ? items.filter((x) => x.title.toLocaleLowerCase('ro').includes(needle) || x.path.toLocaleLowerCase('ro').includes(needle)) : items;
    return filtered.slice(0, 50);
  }, [items, q]);
  const pick = (x) => {
    if (!x) return;
    onGo(x.id);
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal goto" role="dialog" aria-label="Mergi la document" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Mergi la… (titlu sau dosar)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setI(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setI((k) => Math.min(k + 1, list.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setI((k) => Math.max(k - 1, 0));
            } else if (e.key === 'Enter') pick(list[i]);
            else if (e.key === 'Escape') onClose();
          }}
        />
        <ul className="goto-list">
          {list.map((x, k) => (
            <li key={x.id} className={k === i ? 'on' : ''} onMouseEnter={() => setI(k)} onClick={() => pick(x)}>
              <span>{x.favorite ? '★ ' : ''}{x.title}</span>
              <small className="muted">{x.path}</small>
            </li>
          ))}
          {list.length === 0 && <li className="muted">Niciun document.</li>}
        </ul>
      </div>
    </div>
  );
}
