import React from 'react';

export default function Corkboard({ project, folder, onOpen, onPatch, onAdd, onMove }) {
  const [drag, setDrag] = React.useState(null);
  const [hint, setHint] = React.useState(null);
  const side = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? 'before' : 'after';
  };
  const colors = Object.fromEntries(project.labels.map((l) => [l.name, l.color]));
  const items = folder?.children || [];
  return (
    <div className="corkboard">
      <div className="cork-head">
        <h2>{folder?.title}</h2>
        <button onClick={onAdd}>+ Fișă</button>
      </div>
      {items.length === 0 && <p className="hint">Nicio fișă. Adaugă un document în acest dosar.</p>}
      <div className="cards">
        {items.map((n) => (
          <article
            key={n.id}
            className={`card ${drag === n.id ? 'dragging' : ''} ${hint && hint.id === n.id ? `drop-${hint.pos}` : ''}`}
            style={{ borderTopColor: colors[n.label] || 'transparent' }}
            draggable
            onDragStart={(e) => {
              setDrag(n.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              setDrag(null);
              setHint(null);
            }}
            onDragOver={(e) => {
              if (!drag || drag === n.id) return;
              e.preventDefault();
              setHint({ id: n.id, pos: side(e) });
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (drag && drag !== n.id) onMove(drag, n.id, side(e));
              setDrag(null);
              setHint(null);
            }}
          >
            <header onDoubleClick={() => onOpen(n.id)} title="Dublu-clic pentru a deschide">
              <span>{n.children ? '📁 ' : ''}{n.title}</span>
              <button className="link" onClick={() => onOpen(n.id)}>Deschide</button>
            </header>
            <textarea
              placeholder="Sinopsis…"
              defaultValue={n.synopsis}
              onBlur={(e) => e.target.value !== n.synopsis && onPatch(n.id, { synopsis: e.target.value })}
            />
            <footer>{n.status !== 'Fără' ? n.status : ''}</footer>
          </article>
        ))}
      </div>
    </div>
  );
}
