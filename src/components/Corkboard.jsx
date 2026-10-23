import React, { useEffect, useRef, useState } from 'react';
import { cardHeight } from '../lib/panelsExtra.js';

const SIZES = { mic: 180, mediu: 230, mare: 300 };

function SynopsisImage({ file, readMedia }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    if (file && readMedia) readMedia(file).then((u) => alive && setUrl(u)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [file, readMedia]);
  return url ? <img className="card-image" src={url} alt="" /> : null;
}

function Card({ n, colors, keywordColors, onOpen, onPatch, readMedia, dragProps, style, className = '', pins }) {
  return (
    <article className={`card ${className} ${pins ? 'pinned' : ''}`} style={{ borderTopColor: colors[n.label] || 'transparent', ...style }} {...dragProps}>
      {pins && <span className="card-pin" style={{ background: colors[n.label] || undefined }} aria-hidden="true" />}
      {n.label && n.label !== 'Fără' && colors[n.label] && <span className="card-tint" style={{ background: colors[n.label] }} />}
      <header onDoubleClick={() => onOpen(n.id)} title="Dublu-clic pentru a deschide">
        <span>
          {n.children ? '📁 ' : ''}
          {n.title}
        </span>
        <button className="link" onClick={() => onOpen(n.id)}>Deschide</button>
      </header>
      {n.synopsisImage && (n.showSynopsisImage !== false) ? (
        <SynopsisImage file={n.synopsisImage} readMedia={readMedia} />
      ) : (
        <textarea
          placeholder="Sinopsis…"
          defaultValue={n.synopsis}
          onBlur={(e) => e.target.value !== (n.synopsis || '') && onPatch(n.id, { synopsis: e.target.value })}
        />
      )}
      {(n.keywords || []).length > 0 && (
        <div className="card-keywords">
          {n.keywords.slice(0, 4).map((k) => (
            <span key={k} className="chip" style={{ borderLeft: `3px solid ${keywordColors[k] || 'var(--line)'}` }}>{k}</span>
          ))}
        </div>
      )}
      {n.status && n.status !== 'Fără' && <span className="stamp">{n.status}</span>}
    </article>
  );
}

// Corkboard with grid, lines (arrange by label/status/keyword) and freeform modes.
// Board settings live on the folder: folder.cork = {mode, size, by, ratio, spacing, columns, pins}.
// Pass `folders` (array of folder nodes) to stack several boards, one section per folder.
export default function Corkboard(props) {
  const { folders } = props;
  if (Array.isArray(folders) && folders.length > 1) {
    return (
      <div className="corkboard-stack">
        {folders.map((f) => (
          <section key={f.id} className="cork-stacked">
            <CorkboardBoard {...props} folder={f} onAdd={props.onAddTo ? () => props.onAddTo(f.id) : props.onAdd} />
          </section>
        ))}
      </div>
    );
  }
  return <CorkboardBoard {...props} folder={Array.isArray(folders) && folders.length === 1 ? folders[0] : props.folder} />;
}

function CorkboardBoard({ project, folder, onOpen, onPatch, onAdd, onMove, onReorder, readMedia }) {
  const [drag, setDrag] = useState(null);
  const [hint, setHint] = useState(null);
  const freeRef = useRef(null);
  const cork = { mode: 'grid', size: 'mediu', by: 'label', ratio: '3:5', spacing: 16, columns: 0, pins: false, ...(folder?.cork || {}) };
  const setCork = (patch) => folder && onPatch(folder.id, { cork: { ...cork, ...patch } });
  const colors = Object.fromEntries(project.labels.map((l) => [l.name, l.color]));
  const keywordColors = Object.fromEntries((project.keywordDefs || []).map((k) => [k.name, k.color]));
  const items = folder?.children || [];
  const side = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? 'before' : 'after';
  };
  const gridDrag = (n) => ({
    draggable: true,
    onDragStart: (e) => {
      setDrag(n.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd: () => {
      setDrag(null);
      setHint(null);
    },
    onDragOver: (e) => {
      if (!drag || drag === n.id) return;
      e.preventDefault();
      setHint({ id: n.id, pos: side(e) });
    },
    onDrop: (e) => {
      e.preventDefault();
      if (drag && drag !== n.id) onMove(drag, n.id, side(e));
      setDrag(null);
      setHint(null);
    },
  });
  const cardClass = (n) => `${drag === n.id ? 'dragging' : ''} ${hint && hint.id === n.id ? `drop-${hint.pos}` : ''}`;
  const common = { colors, keywordColors, onOpen, onPatch, readMedia, pins: Boolean(cork.pins) };

  // Freeform: cards keep {x, y} in node.corkPos; "Fixează ordinea" writes the visual
  // order (top-to-bottom, left-to-right) back to the binder.
  const startFree = (n, e) => {
    if (e.target.closest('textarea, button')) return;
    const box = freeRef.current.getBoundingClientRect();
    const pos = n.corkPos || { x: 0, y: 0 };
    const dx = e.clientX - box.left - pos.x;
    const dy = e.clientY - box.top - pos.y;
    const el = e.currentTarget;
    const move = (ev) => {
      el.style.left = `${Math.max(0, ev.clientX - box.left - dx)}px`;
      el.style.top = `${Math.max(0, ev.clientY - box.top - dy)}px`;
    };
    const up = (ev) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      onPatch(n.id, { corkPos: { x: Math.max(0, Math.round(ev.clientX - box.left - dx)), y: Math.max(0, Math.round(ev.clientY - box.top - dy)) } });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  const width = SIZES[cork.size] || SIZES.mediu;
  const height = cardHeight(width, cork.ratio);
  const gap = Math.max(0, Number(cork.spacing) || 0);
  const perRow = Number(cork.columns) || 4;
  const autoPos = (i) => ({ x: 20 + (i % perRow) * (width + gap + 8), y: 20 + Math.floor(i / perRow) * (height + gap + 30) });
  const gridStyle = Number(cork.columns) > 0 ? { gridTemplateColumns: `repeat(${cork.columns}, var(--card-w))`, gap } : { gap };
  const commitOrder = () => {
    const ordered = items
      .map((n, i) => ({ id: n.id, ...(n.corkPos || autoPos(i)) }))
      .sort((a, b) => (Math.abs(a.y - b.y) < 60 ? a.x - b.x : a.y - b.y))
      .map((x) => x.id);
    onReorder(folder.id, ordered);
  };

  const groupKey = (n) => {
    if (cork.by === 'status') return n.status && n.status !== 'Fără' ? n.status : 'Fără status';
    if (cork.by === 'keyword') return (n.keywords && n.keywords[0]) || 'Fără cuvinte cheie';
    return n.label && n.label !== 'Fără' ? n.label : 'Fără etichetă';
  };
  const groups = [];
  if (cork.mode === 'lines') {
    for (const n of items) {
      const k = groupKey(n);
      let g = groups.find((x) => x.key === k);
      if (!g) groups.push((g = { key: k, items: [] }));
      g.items.push(n);
    }
  }

  return (
    <div className="corkboard" style={{ '--card-w': `${width}px`, '--card-h': `${height}px`, '--card-gap': `${gap}px` }} data-ratio={cork.ratio}>
      <div className="cork-head">
        <h2>{folder?.title}</h2>
        <button onClick={onAdd}>+ Fișă</button>
        <span className="spacer" />
        <div className="seg">
          <button className={cork.mode === 'grid' ? 'on' : ''} onClick={() => setCork({ mode: 'grid' })}>Grilă</button>
          <button className={cork.mode === 'lines' ? 'on' : ''} onClick={() => setCork({ mode: 'lines' })}>Linii</button>
          <button className={cork.mode === 'free' ? 'on' : ''} onClick={() => setCork({ mode: 'free' })}>Liber</button>
        </div>
        {cork.mode === 'lines' && (
          <select value={cork.by} onChange={(e) => setCork({ by: e.target.value })} title="Aranjează pe linii după">
            <option value="label">după etichetă</option>
            <option value="status">după status</option>
            <option value="keyword">după cuvânt cheie</option>
          </select>
        )}
        {cork.mode === 'free' && <button onClick={commitOrder} title="Scrie ordinea de pe panou în binder">Fixează ordinea</button>}
        <select value={cork.size} onChange={(e) => setCork({ size: e.target.value })} title="Mărimea fișelor">
          <option value="mic">Fișe mici</option>
          <option value="mediu">Fișe medii</option>
          <option value="mare">Fișe mari</option>
        </select>
        <details className="cork-options">
          <summary>Aspect</summary>
          <div className="cork-options-body">
            <label>
              Proporție
              <select value={cork.ratio} onChange={(e) => setCork({ ratio: e.target.value })}>
                <option value="3:5">3 × 5 (fișă)</option>
                <option value="4:6">4 × 6</option>
                <option value="1:1">Pătrat</option>
                <option value="4:3">Înalt</option>
              </select>
            </label>
            <label>
              Spațiere
              <input type="number" min="0" max="80" step="4" value={cork.spacing} onChange={(e) => setCork({ spacing: Number(e.target.value) || 0 })} />
            </label>
            <label>
              Coloane
              <input type="number" min="0" max="12" value={cork.columns} onChange={(e) => setCork({ columns: Number(e.target.value) || 0 })} title="0 = automat" />
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(cork.pins)} onChange={(e) => setCork({ pins: e.target.checked })} /> Pioneze
            </label>
          </div>
        </details>
      </div>
      {items.length === 0 && <p className="hint">Nicio fișă. Adaugă un document în acest dosar.</p>}

      {cork.mode === 'grid' && (
        <div className="cards" style={gridStyle}>
          {items.map((n) => (
            <Card key={n.id} n={n} {...common} dragProps={gridDrag(n)} className={cardClass(n)} />
          ))}
        </div>
      )}

      {cork.mode === 'lines' &&
        groups.map((g) => (
          <section key={g.key} className="cork-line">
            <h3>
              {cork.by === 'label' && colors[g.key] && <span className="label-dot" style={{ background: colors[g.key] }} />} {g.key} <small className="muted">({g.items.length})</small>
            </h3>
            <div className="cards row-cards" style={{ gap }}>
              {g.items.map((n) => (
                <Card key={n.id} n={n} {...common} dragProps={gridDrag(n)} className={cardClass(n)} />
              ))}
            </div>
          </section>
        ))}

      {cork.mode === 'free' && (
        <div className="freeform" ref={freeRef}>
          {items.map((n, i) => {
            const pos = n.corkPos || autoPos(i);
            return (
              <Card
                key={n.id}
                n={n}
                {...common}
                className="free-card"
                style={{ left: pos.x, top: pos.y, width }}
                dragProps={{ onMouseDown: (e) => startFree(n, e) }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
