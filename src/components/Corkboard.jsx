import React, { useEffect, useRef, useState } from 'react';
import { cardHeight } from '../lib/panelsExtra.js';
import { FolderIcon } from './Icons.jsx';
import { t } from '../lib/i18n.js';
import { KEYWORD_MIME, keywordDropTargets } from '../lib/collections.js';
import { NONE, labelTitleOf, noneLabel, noneStatus, statusTitleOf } from '../lib/projectSettings.js';

const SIZES = { mic: 180, mediu: 230, mare: 300 };

// Next card for an arrow key from card rectangles [{id, r: DOMRect}] (visual layout, so it
// works for grid, lines and freeform). ←/→ previous/next in reading order; ↑/↓ the nearest
// card horizontally in the row above / below; Home/End first/last.
export function cardNeighbour(rects, id, key) {
  const order = [...rects].sort((a, b) => (Math.abs(a.r.top - b.r.top) < 10 ? a.r.left - b.r.left : a.r.top - b.r.top));
  const i = order.findIndex((x) => x.id === id);
  if (i < 0) return order[0]?.id || null;
  if (key === 'Home') return order[0].id;
  if (key === 'End') return order[order.length - 1].id;
  if (key === 'ArrowLeft') return order[i - 1]?.id || null;
  if (key === 'ArrowRight') return order[i + 1]?.id || null;
  const cur = order[i].r;
  const cx = cur.left + cur.width / 2;
  const below = key === 'ArrowDown';
  const cands = order.filter((x) => (below ? x.r.top > cur.top + 10 : x.r.top < cur.top - 10));
  if (!cands.length) return null;
  const rowTop = below ? Math.min(...cands.map((x) => x.r.top)) : Math.max(...cands.map((x) => x.r.top));
  const row = cands.filter((x) => Math.abs(x.r.top - rowTop) < 10);
  row.sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - cx) - Math.abs(b.r.left + b.r.width / 2 - cx));
  return row[0].id;
}

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

function Card({ n, colors, keywordColors, onOpen, onPatch, readMedia, dragProps, style, className = '', pins, selected, tabStop, editing, onSelect, onKey, onEndEdit, tintCards = true, keywordStrips = true, onDropKeyword }) {
  const [kwOver, setKwOver] = useState(false);
  const isKw = (e) => onDropKeyword && [...(e.dataTransfer?.types || [])].includes(KEYWORD_MIME);
  const stripColors = keywordStrips ? (n.keywords || []).map((k) => keywordColors[k]).filter(Boolean) : [];
  return (
    <article
      className={`card ${className} ${pins ? 'pinned' : ''} ${selected ? 'selected' : ''} ${kwOver ? 'drop-keyword' : ''}`}
      style={{ borderTopColor: (tintCards && colors[n.label]) || 'transparent', ...(tintCards && colors[n.label] ? { '--label-color': colors[n.label] } : {}), ...style }}
      data-card-id={n.id}
      role="gridcell"
      tabIndex={tabStop ? 0 : -1} // one Tab stop for the board; arrows move between cards
      aria-selected={Boolean(selected)}
      aria-label={n.title || t('ui.app.fara_titlu')}
      onFocus={(e) => e.target === e.currentTarget && onSelect?.(n.id)}
      {...dragProps}
      onDragOver={(e) => {
        if (isKw(e)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (!kwOver) setKwOver(true);
          return;
        }
        dragProps?.onDragOver?.(e);
      }}
      onDragLeave={() => kwOver && setKwOver(false)}
      onDrop={(e) => {
        if (isKw(e)) {
          e.preventDefault();
          setKwOver(false);
          const name = e.dataTransfer.getData(KEYWORD_MIME);
          if (name) onDropKeyword(n.id, name);
          return;
        }
        dragProps?.onDrop?.(e);
      }}
      onMouseDown={(e) => {
        if (!e.target.closest('textarea, input, button')) onSelect?.(n.id);
        dragProps?.onMouseDown?.(e); // the freeform drag must not replace selection
      }}
      onKeyDown={(e) => e.target === e.currentTarget && onKey?.(e, n)}
      onDoubleClick={(e) => !e.target.closest('textarea, input, header') && onOpen(n.id)}
    >
      {pins && <span className="card-pin" style={{ background: colors[n.label] || undefined }} aria-hidden="true" />}
      {tintCards && n.label && n.label !== 'Fără' && colors[n.label] && <span className="card-tint" style={{ background: colors[n.label] }} />}
      {stripColors.length > 0 && (
        <span className="card-kw-strip" aria-hidden="true">
          {stripColors.map((c, i) => <span key={i} style={{ background: c }} />)}
        </span>
      )}
      <header onDoubleClick={() => onOpen(n.id)} title={t('ui.corkboard.dublu_clic_deschide_enter_editeaza')}>
        {editing ? (
          <input
            autoFocus
            defaultValue={n.title}
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') {
                e.target.value = n.title;
                e.target.blur();
              }
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== n.title) onPatch(n.id, { title: v });
              onEndEdit?.(n.id);
            }}
          />
        ) : (
          <span className="card-title">
            {n.children ? <FolderIcon /> : null}
            {n.title}
          </span>
        )}
        <button className="link card-open" onClick={() => onOpen(n.id)}>{t('ui.app.deschide')}</button>
      </header>
      {n.synopsisImage && (n.showSynopsisImage !== false) ? (
        <SynopsisImage file={n.synopsisImage} readMedia={readMedia} />
      ) : (
        <textarea
          aria-label={t('ui.corkboard.sinopsis_x', { title: n.title || '' })}
          placeholder={t('ui.corkboard.sinopsis')}
          key={n.synopsis || ''} // edited elsewhere (Inspector, Outline): show it, never write the old text back
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
      {n.status && n.status !== 'Fără' && <span className="stamp">{noneStatus(n.status, t)}</span>}
    </article>
  );
}

// Corkboard with grid, lines (arrange by label/status/keyword) and freeform modes.
/** Class list of the board from its look options: card shape, ruled cards, card colour by label. */
export function corkClass(cork = {}) {
  return ['corkboard', cork.shape === 'square' ? 'cards-square' : 'cards-rounded', cork.ruled ? 'cards-ruled' : '', cork.labelFill ? 'cards-label-fill' : ''].filter(Boolean).join(' ');
}

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

function CorkboardBoard({ project, folder, onOpen, onPatch, onAdd, onMove, onReorder, readMedia, labelColorIn = null, onDropKeyword, selectedIds = null }) {
  const [drag, setDrag] = useState(null);
  const [hint, setHint] = useState(null);
  const [sel, setSel] = useState(null);
  const [editing, setEditing] = useState(null);
  const freeRef = useRef(null);
  const boardRef = useRef(null);
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
      if (drag && drag !== n.id) {
        onMove(drag, n.id, side(e));
        // Lines by label / status: a card dropped in another row takes that row's value.
        const moved = items.find((x) => x.id === drag);
        if (cork.mode === 'lines' && moved && (cork.by === 'label' || cork.by === 'status') && groupKey(moved) !== groupKey(n)) {
          onPatch(drag, { [cork.by]: groupKey(n) });
        }
      }
      setDrag(null);
      setHint(null);
    },
  });
  const cardClass = (n) => `${drag === n.id ? 'dragging' : ''} ${hint && hint.id === n.id ? `drop-${hint.pos}` : ''}`;
  const focusCard = (id) => setTimeout(() => boardRef.current?.querySelector(`[data-card-id="${CSS.escape(id)}"]`)?.focus(), 0);
  // Keyboard on a focused card: arrows move between cards (↑/↓ by visual row), Enter edits
  // the title, Ctrl+Enter opens the document, Ctrl+←/→ reorders (Scrivener corkboard).
  const onKey = (e, n) => {
    // In lines mode Ctrl+←/→ reorders within the card's own row.
    const order = (cork.mode === 'lines' ? items.filter((x) => groupKey(x) === groupKey(n)) : items).map((x) => x.id);
    const i = order.indexOf(n.id);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onOpen(n.id);
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      setEditing(n.id);
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      e.stopPropagation();
      const j = e.key === 'ArrowLeft' ? i - 1 : i + 1;
      if (j >= 0 && j < order.length) {
        onMove(n.id, order[j], e.key === 'ArrowLeft' ? 'before' : 'after');
        focusCard(n.id);
      }
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const els = [...(boardRef.current?.querySelectorAll('[data-card-id]') || [])];
      const rects = els.map((el) => ({ id: el.dataset.cardId, r: el.getBoundingClientRect() }));
      const next = cardNeighbour(rects, n.id, e.key);
      if (next) {
        setSel(next);
        focusCard(next);
      }
    }
  };
  const addCard = () => {
    const node = onAdd(sel || undefined);
    if (node && node.id) {
      setSel(node.id);
      setEditing(node.id);
    }
  };
  const cardState = (n) => ({ selected: sel === n.id, tabStop: sel && items.some((x) => x.id === sel) ? sel === n.id : n.id === items[0]?.id, editing: editing === n.id, onSelect: setSel, onKey, onEndEdit: (id) => (setEditing(null), focusCard(id)) });
  const dropKeyword = onDropKeyword ? (id, name) => onDropKeyword(keywordDropTargets(id, selectedIds ? [...selectedIds] : sel ? [sel] : []), name) : undefined;
  const common = { colors, keywordColors, onOpen, onPatch, readMedia, pins: Boolean(cork.pins), tintCards: labelColorIn?.cards !== false, keywordStrips: cork.keywordStrips !== false, onDropKeyword: dropKeyword };

  // Freeform: cards keep {x, y} in node.corkPos; "Fixează ordinea" writes the visual
  // order (top-to-bottom, left-to-right) back to the binder.
  const startFree = (n, e) => {
    if (e.target.closest('textarea, button, input')) return;
    const box = freeRef.current.getBoundingClientRect();
    const el0 = e.currentTarget;
    const pos = { x: parseFloat(el0.style.left) || 0, y: parseFloat(el0.style.top) || 0 }; // where the card is drawn (autoPos when never moved)
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
      if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) < 4) return; // a click, not a move
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
    if (cork.by === 'status') return n.status || NONE;
    if (cork.by === 'keyword') return (n.keywords && n.keywords[0]) || t('ui.corkboard.fara_cuvinte_cheie');
    return n.label || NONE;
  };
  // Groups use the stored names (label colours are keyed by them); built-ins are translated on display.
  const groupTitle = (k) => (cork.by === 'status' ? noneStatus(k, t) : cork.by === 'label' ? noneLabel(k, t) : k);
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
    <div ref={boardRef} className={corkClass(cork)} style={{ '--card-w': `${width}px`, '--card-h': `${height}px`, '--card-gap': `${gap}px` }} data-ratio={cork.ratio}>
      <div className="cork-head">
        <h2>{folder?.title}</h2>
        <button onClick={addCard} title={t('ui.corkboard.fisa_noua_dupa_fisa_selectata')}>{t('ui.corkboard.fisa')}</button>
        <span className="spacer" />
        <div className="seg">
          <button className={cork.mode === 'grid' ? 'on' : ''} onClick={() => setCork({ mode: 'grid' })}>{t('ui.corkboard.grila')}</button>
          <button className={cork.mode === 'lines' ? 'on' : ''} onClick={() => setCork({ mode: 'lines' })}>{t('ui.common.linii')}</button>
          <button className={cork.mode === 'free' ? 'on' : ''} onClick={() => setCork({ mode: 'free' })}>{t('ui.common.liber')}</button>
        </div>
        {cork.mode === 'lines' && (
          <select value={cork.by} onChange={(e) => setCork({ by: e.target.value })} title={t('ui.corkboard.aranjeaza_pe_linii_dupa')}>
            <option value="label">{project.labelTitle && project.labelTitle !== 'Etichetă' ? `${t('ui.corkboard.dupa')} ${labelTitleOf(project, t).toLocaleLowerCase()}` : t('ui.corkboard.dupa_eticheta')}</option>
            <option value="status">{project.statusTitle && project.statusTitle !== 'Status' ? `${t('ui.corkboard.dupa')} ${statusTitleOf(project, t).toLocaleLowerCase()}` : t('ui.corkboard.dupa_status')}</option>
            <option value="keyword">{t('ui.corkboard.dupa_cuvant_cheie')}</option>
          </select>
        )}
        {cork.mode === 'free' && <button onClick={commitOrder} title={t('ui.corkboard.scrie_ordinea_de_pe_panou')}>{t('ui.corkboard.fixeaza_ordinea')}</button>}
        <select value={cork.size} onChange={(e) => setCork({ size: e.target.value })} title={t('ui.corkboard.marimea_fiselor')}>
          <option value="mic">{t('ui.corkboard.fise_mici')}</option>
          <option value="mediu">{t('ui.corkboard.fise_medii')}</option>
          <option value="mare">{t('ui.corkboard.fise_mari')}</option>
        </select>
        <details className="cork-options">
          <summary>{t('ui.common.aspect')}</summary>
          <div className="cork-options-body">
            <label>
              {t('ui.corkboard.proportie')}
              <select value={cork.ratio} onChange={(e) => setCork({ ratio: e.target.value })}>
                <option value="3:5">{t('ui.corkboard.3_5_fisa')}</option>
                <option value="4:6">4 × 6</option>
                <option value="1:1">{t('ui.corkboard.patrat')}</option>
                <option value="4:3">{t('ui.corkboard.inalt')}</option>
              </select>
            </label>
            <label>
              {t('ui.corkboard.spatiere')}
              <input type="number" min="0" max="80" step="4" value={cork.spacing} onChange={(e) => setCork({ spacing: Number(e.target.value) || 0 })} />
            </label>
            <label>
              Coloane
              <input type="number" min="0" max="12" value={cork.columns} onChange={(e) => setCork({ columns: Number(e.target.value) || 0 })} title={t('ui.corkboard.0_automat')} />
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(cork.pins)} onChange={(e) => setCork({ pins: e.target.checked })} /> Pioneze
            </label>
            <label>
              {t('ui.corkboard.cardShape')}
              <select value={cork.shape || 'rounded'} onChange={(e) => setCork({ shape: e.target.value })}>
                <option value="rounded">{t('ui.corkboard.shapeRounded')}</option>
                <option value="square">{t('ui.corkboard.shapeSquare')}</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(cork.ruled)} onChange={(e) => setCork({ ruled: e.target.checked })} /> {t('ui.corkboard.ruledCards')}
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(cork.labelFill)} onChange={(e) => setCork({ labelFill: e.target.checked })} /> {t('ui.corkboard.labelFill')}
            </label>
            <label className="check">
              <input type="checkbox" checked={cork.keywordStrips !== false} onChange={(e) => setCork({ keywordStrips: e.target.checked })} /> {t('ui.corkboard.benzi_cuvinte_cheie')}
            </label>
          </div>
        </details>
      </div>
      {items.length === 0 && <p className="hint">{t('ui.corkboard.nicio_fisa_apasa_fisa_sau')}{folder?.title}”.</p>}

      {cork.mode === 'grid' && (
        <div className="cards" style={gridStyle} role="grid" aria-label={t('ui.corkboard.panou_x', { title: folder?.title || '' })}>
          <div role="row" style={{ display: 'contents' }}>
            {items.map((n) => (
              <Card key={n.id} n={n} {...common} {...cardState(n)} dragProps={gridDrag(n)} className={cardClass(n)} />
            ))}
          </div>
        </div>
      )}

      {cork.mode === 'lines' &&
        groups.map((g) => (
          <section key={g.key} className="cork-line">
            <h3>
              {cork.by === 'label' && colors[g.key] && <span className="label-dot" style={{ background: colors[g.key] }} />} {groupTitle(g.key)} <small className="muted">({g.items.length})</small>
            </h3>
            <div className="cards row-cards" style={{ gap }} role="grid" aria-label={groupTitle(g.key)}>
              <div role="row" style={{ display: 'contents' }}>
                {g.items.map((n) => (
                  <Card key={n.id} n={n} {...common} {...cardState(n)} dragProps={gridDrag(n)} className={cardClass(n)} />
                ))}
              </div>
            </div>
          </section>
        ))}

      {cork.mode === 'free' && (
        <div className="freeform" ref={freeRef} role="grid" aria-label={t('ui.corkboard.panou_x', { title: folder?.title || '' })}>
          <div role="row" style={{ display: 'contents' }}>
          {items.map((n, i) => {
            const pos = n.corkPos || autoPos(i);
            return (
              <Card
                key={n.id}
                n={n}
                {...common}
                {...cardState(n)}
                className="free-card"
                style={{ left: pos.x, top: pos.y, width }}
                dragProps={{ onMouseDown: (e) => startFree(n, e) }}
              />
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
