import React, { useEffect, useRef, useState } from 'react';

/**
 * Floating scratchpad (notes independent of the project).
 * Props: load(): Promise<Note[]>|Note[], save(notes), onClose().
 * Note = { id, title, text, updated }.
 */
export default function Scratchpad({ load, save, onClose }) {
  const [notes, setNotes] = useState([]);
  const [sel, setSel] = useState(null);
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const timer = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    Promise.resolve(load ? load() : []).then((n) => {
      const list = Array.isArray(n) ? n : [];
      setNotes(list);
      setSel(list[0]?.id ?? null);
    }).catch(() => {});
  }, []);

  const persist = (next) => {
    setNotes(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save && save(next), 400);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const add = () => {
    const n = { id: `n${Date.now().toString(36)}`, title: 'Notă nouă', text: '', updated: Date.now() };
    persist([n, ...notes]);
    setSel(n.id);
  };
  const remove = (id) => {
    const next = notes.filter((n) => n.id !== id);
    persist(next);
    if (sel === id) setSel(next[0]?.id ?? null);
  };
  const edit = (patch) => persist(notes.map((n) => (n.id === sel ? { ...n, ...patch, updated: Date.now() } : n)));
  const cur = notes.find((n) => n.id === sel);

  const onDown = (e) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev) => drag.current && setPos({ x: Math.max(0, ev.clientX - drag.current.dx), y: Math.max(0, ev.clientY - drag.current.dy) });
    const up = () => {
      drag.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div className="scratchpad" style={{ position: 'fixed', left: pos.x, top: pos.y, width: 520, height: 340, zIndex: 900, display: 'flex', flexDirection: 'column', background: 'var(--panel, #fff)', border: '1px solid var(--border, #ccc)', borderRadius: 6, boxShadow: '0 6px 24px rgba(0,0,0,.25)' }}>
      <div onMouseDown={onDown} style={{ cursor: 'move', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border, #ccc)' }}>
        <strong>Ciorne (Scratchpad)</strong>
        <span>
          <button onClick={add} title="Notă nouă">+</button>
          <button onClick={onClose} title="Închide">×</button>
        </span>
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ul style={{ width: 160, margin: 0, padding: 0, listStyle: 'none', overflow: 'auto', borderRight: '1px solid var(--border, #ccc)' }}>
          {notes.map((n) => (
            <li key={n.id} onClick={() => setSel(n.id)} style={{ padding: '4px 6px', cursor: 'pointer', background: n.id === sel ? 'var(--selection, #dde8ff)' : undefined, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Fără titlu'}</span>
              <button onClick={(e) => { e.stopPropagation(); if (confirm('Ștergi nota?')) remove(n.id); }} title="Șterge">🗑</button>
            </li>
          ))}
          {!notes.length && <li style={{ padding: 6, opacity: 0.6 }}>Nicio notă</li>}
        </ul>
        {cur ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <input value={cur.title} onChange={(e) => edit({ title: e.target.value })} placeholder="Titlu" style={{ border: 0, padding: 6, fontWeight: 'bold' }} />
            <textarea value={cur.text} onChange={(e) => edit({ text: e.target.value })} placeholder="Scrie aici…" style={{ flex: 1, border: 0, padding: 6, resize: 'none' }} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}><button onClick={add}>Notă nouă</button></div>
        )}
      </div>
    </div>
  );
}
