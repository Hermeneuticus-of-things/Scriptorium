import React, { useEffect, useRef, useState } from 'react';
import { cardHeight } from '../lib/panelsExtra.js';
import { DocumentIcon, FolderIcon } from './Icons.jsx';
import { t, uiLocale } from '../lib/i18n.js';
import { KEYWORD_MIME, keywordDropTargets } from '../lib/collections.js';
import { NONE, labelTitleOf, noneLabel, noneStatus, statusTitleOf } from '../lib/projectSettings.js';

const SIZES = { mic: 180, mediu: 230, mare: 300 };

// Board options. Built-in values, then the global defaults (Options > Corkboard), then what the
// folder changed in its own bar (folder.cork keeps only the keys set there).
export const CORK_DEFAULTS = {
  mode: 'grid', size: 'mediu', by: 'label', ratio: '3:5', spacing: 16, columns: 0, pins: false,
  shape: 'rounded', ruled: false, labelFill: false, keywordStrips: true,
  labelStyle: 'top', // top | band | pin | none
  statusStamp: true, stampOpacity: 60, showIcon: false, showWords: false, synopsisLines: 0, showImages: true,
  snapGrid: false, gridSize: 24, showGrid: true, linesDir: 'rows', stack: 'grouped',
};
export function corkOptions(defaults, own) {
  const out = { ...CORK_DEFAULTS };
  for (const src of [defaults, own]) for (const [k, v] of Object.entries(src || {})) if (v !== undefined && v !== null) out[k] = v;
  return out;
}
/** Freeform position snapped to the grid (when snapping is on). */
export function snapPos(pos, cork) {
  if (!cork || !cork.snapGrid) return pos;
  const g = Math.max(4, Number(cork.gridSize) || 24);
  return { x: Math.max(0, Math.round(pos.x / g) * g), y: Math.max(0, Math.round(pos.y / g) * g) };
}
/** Words and target of a card: a folder counts its whole subtree. */
export function cardWords(n, counts = {}) {
  const sum = (x) => (counts[x.id] || 0) + (x.children || []).reduce((a, c) => a + sum(c), 0);
  const words = sum(n);
  const target = Number(n.target) || 0;
  return { words, target, progress: target ? Math.min(1, words / target) : -1 };
}
/** Cards of several folders: grouped (one board per folder, null here) or one after another on one board. */
export function stackCards(folders, mode) {
  if (mode !== 'continuous') return null;
  return { id: null, title: folders.map((f) => f.title).join(' · '), cork: folders[0]?.cork, children: folders.flatMap((f) => f.children || []) };
}
const isEmojiIcon = (s) => typeof s === 'string' && /\p{Extended_Pictographic}/u.test(s);
// A dropped image becomes the card's picture synopsis: scaled down and kept in the project.
function imageToDataUrl(file, max = 640) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(r.result);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        if (k === 1 && String(r.result).length < 400000) return resolve(r.result);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

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
  const [url, setUrl] = useState(() => (String(file || '').startsWith('data:') ? file : null));
  useEffect(() => {
    let alive = true;
    if (file && String(file).startsWith('data:')) setUrl(file);
    else if (file && readMedia) readMedia(file).then((u) => alive && setUrl(u)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [file, readMedia]);
  return url ? <img className="card-image" src={url} alt="" /> : null;
}

function Card({ n, colors, keywordColors, onOpen, onPatch, readMedia, dragProps, style, className = '', pins, selected, tabStop, editing, onSelect, onKey, onEndEdit, tintCards = true, keywordStrips = true, onDropKeyword, onDropImage, cork = CORK_DEFAULTS, counts = null }) {
  const [kwOver, setKwOver] = useState(false);
  const isImg = (e) => onDropImage && [...(e.dataTransfer?.types || [])].includes('Files');
  const labelColor = tintCards && cork.labelStyle !== 'none' && n.label && n.label !== NONE ? colors[n.label] : null;
  const pinned = pins || Boolean(labelColor && cork.labelStyle === 'pin');
  const wc = cork.showWords && counts ? cardWords(n, counts) : null;
  const lines = Number(cork.synopsisLines) || 0;
  const isKw = (e) => onDropKeyword && [...(e.dataTransfer?.types || [])].includes(KEYWORD_MIME);
  const stripColors = keywordStrips ? (n.keywords || []).map((k) => keywordColors[k]).filter(Boolean) : [];
  return (
    <article
      className={`card ${className} ${pinned ? 'pinned' : ''} ${labelColor && cork.labelStyle === 'band' ? 'label-band' : ''} ${lines ? 'syn-clamp' : ''} ${selected ? 'selected' : ''} ${kwOver ? 'drop-keyword' : ''}`}
      style={{ borderTopColor: (cork.labelStyle === 'top' && labelColor) || 'transparent', ...(labelColor ? { '--label-color': labelColor } : {}), ...(lines ? { '--syn-lines': lines } : {}), ...style }}
      data-card-id={n.id}
      role="gridcell"
      tabIndex={tabStop ? 0 : -1} // one Tab stop for the board; arrows move between cards
      aria-selected={Boolean(selected)}
      aria-label={n.title || t('ui.app.fara_titlu')}
      onFocus={(e) => e.target === e.currentTarget && onSelect?.(n.id)}
      {...dragProps}
      onDragOver={(e) => {
        if (isKw(e) || isImg(e)) {
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
        if (isImg(e)) {
          const file = [...(e.dataTransfer.files || [])].find((f) => /^image\//.test(f.type));
          e.preventDefault();
          setKwOver(false);
          if (file) onDropImage(n.id, file);
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
      {pinned && <span className="card-pin" style={{ background: labelColor || undefined }} aria-hidden="true" />}
      {labelColor && cork.labelStyle === 'top' && <span className="card-tint" style={{ background: labelColor }} />}
      {labelColor && cork.labelStyle === 'band' && <span className="card-label-band" style={{ background: labelColor }} aria-hidden="true" />}
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
            {cork.showIcon ? (
              <span className="card-type-icon" aria-hidden="true">{isEmojiIcon(n.icon) ? n.icon : n.children ? <FolderIcon /> : <DocumentIcon />}</span>
            ) : n.children ? <FolderIcon /> : null}
            {n.title}
          </span>
        )}
        <button className="link card-open" onClick={() => onOpen(n.id)}>{t('ui.app.deschide')}</button>
      </header>
      {n.synopsisImage && (n.showSynopsisImage ?? cork.showImages) !== false ? (
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
      {wc && (
        <footer className="card-words" title={wc.target ? `${Math.round(wc.progress * 100)}%` : undefined}>
          {wc.target ? t('ui.cork2.wordsOf', { n: wc.words.toLocaleString(uiLocale()), target: wc.target.toLocaleString(uiLocale()) }) : t('ui.cork2.words', { n: wc.words.toLocaleString(uiLocale()) })}
          {wc.target > 0 && <meter min="0" max="1" value={wc.progress} />}
        </footer>
      )}
      {cork.statusStamp !== false && n.status && n.status !== NONE && <span className="stamp" style={{ opacity: Math.max(0.05, Math.min(1, (Number(cork.stampOpacity ?? 60) || 0) / 100)) }}>{noneStatus(n.status, t)}</span>}
    </article>
  );
}

// Corkboard with grid, lines (arrange by label/status/keyword) and freeform modes.
/** Class list of the board from its look options: card shape, ruled cards, card colour by label. */
export function corkClass(cork = {}) {
  return ['corkboard', cork.shape === 'square' ? 'cards-square' : 'cards-rounded', cork.ruled ? 'cards-ruled' : '', cork.labelFill ? 'cards-label-fill' : '', cork.mode === 'lines' && cork.linesDir === 'columns' ? 'lines-vertical' : ''].filter(Boolean).join(' ');
}

// Board settings live on the folder: folder.cork = {mode, size, by, ratio, spacing, columns, pins}.
// Pass `folders` (array of folder nodes) to stack several boards, one section per folder.
function loadStack(fallback) {
  try {
    return localStorage.getItem('scribner-cork-stack') || fallback;
  } catch {
    return fallback;
  }
}

export default function Corkboard(props) {
  const { folders } = props;
  const [stack, setStackState] = useState(() => loadStack(props.corkDefaults?.stack || 'grouped'));
  const setStack = (v) => {
    setStackState(v);
    try {
      localStorage.setItem('scribner-cork-stack', v);
    } catch {
      /* not critical */
    }
  };
  if (Array.isArray(folders) && folders.length > 1) {
    const bar = (
      <div className="cork-stack-bar seg" role="group" aria-label={t('ui.cork2.stack')}>
        <button className={stack !== 'continuous' ? 'on' : ''} aria-pressed={stack !== 'continuous'} onClick={() => setStack('grouped')}>{t('ui.cork2.stackGrouped')}</button>
        <button className={stack === 'continuous' ? 'on' : ''} aria-pressed={stack === 'continuous'} onClick={() => setStack('continuous')}>{t('ui.cork2.stackContinuous')}</button>
      </div>
    );
    const merged = stackCards(folders, stack);
    if (merged) {
      return (
        <div className="corkboard-stack continuous">
          {bar}
          <CorkboardBoard {...props} folder={merged} />
        </div>
      );
    }
    return (
      <div className="corkboard-stack">
        {bar}
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

function CorkboardBoard({ project, folder, onOpen, onPatch, onAdd, onMove, onReorder, readMedia, labelColorIn = null, onDropKeyword, selectedIds = null, corkDefaults = null, counts = null }) {
  const [drag, setDrag] = useState(null);
  const [hint, setHint] = useState(null);
  const [sel, setSel] = useState(null);
  const [editing, setEditing] = useState(null);
  const freeRef = useRef(null);
  const boardRef = useRef(null);
  const cork = corkOptions(corkDefaults, folder?.cork);
  // Only what is changed here is stored on the folder; the rest follows the global defaults.
  const setCork = (patch) => folder && folder.id && onPatch(folder.id, { cork: { ...(folder.cork || {}), ...patch } });
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
  const dropImage = async (id, file) => {
    try {
      const url = await imageToDataUrl(file);
      onPatch(id, { synopsisImage: url, showSynopsisImage: true });
    } catch {
      /* unreadable image: nothing to do */
    }
  };
  const common = { cork, counts, onDropImage: dropImage, colors, keywordColors, onOpen, onPatch, readMedia, pins: Boolean(cork.pins), tintCards: labelColorIn?.cards !== false, keywordStrips: cork.keywordStrips !== false, onDropKeyword: dropKeyword };

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
      const p = snapPos({ x: Math.max(0, ev.clientX - box.left - dx), y: Math.max(0, ev.clientY - box.top - dy) }, cork);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    };
    const up = (ev) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) < 4) return; // a click, not a move
      const p = snapPos({ x: Math.max(0, Math.round(ev.clientX - box.left - dx)), y: Math.max(0, Math.round(ev.clientY - box.top - dy)) }, cork);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      onPatch(n.id, { corkPos: p });
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
        {cork.mode === 'lines' && (
          <select value={cork.linesDir} onChange={(e) => setCork({ linesDir: e.target.value })} title={t('ui.cork2.linesDir')} aria-label={t('ui.cork2.linesDir')}>
            <option value="rows">{t('ui.cork2.linesRows')}</option>
            <option value="columns">{t('ui.cork2.linesCols')}</option>
          </select>
        )}
        {cork.mode === 'free' && folder?.id && <button onClick={commitOrder} title={t('ui.corkboard.scrie_ordinea_de_pe_panou')}>{t('ui.corkboard.fixeaza_ordinea')}</button>}
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
              {t('ui.cork2.columns')}
              <input type="number" min="0" max="12" value={cork.columns} onChange={(e) => setCork({ columns: Number(e.target.value) || 0 })} title={t('ui.corkboard.0_automat')} />
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(cork.pins)} onChange={(e) => setCork({ pins: e.target.checked })} /> {t('ui.cork2.pins')}
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
            <label>
              {t('ui.cork2.labelStyle')}
              <select value={cork.labelStyle} onChange={(e) => setCork({ labelStyle: e.target.value })}>
                <option value="top">{t('ui.cork2.labelTop')}</option>
                <option value="band">{t('ui.cork2.labelBand')}</option>
                <option value="pin">{t('ui.cork2.labelPin')}</option>
                <option value="none">{t('ui.cork2.labelNone')}</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={cork.statusStamp !== false} onChange={(e) => setCork({ statusStamp: e.target.checked })} /> {t('ui.cork2.statusStamp')}
            </label>
            <label>
              {t('ui.cork2.stampOpacity')}
              <input type="range" min="5" max="100" step="5" value={cork.stampOpacity} disabled={cork.statusStamp === false} onChange={(e) => setCork({ stampOpacity: Number(e.target.value) })} />
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(cork.showIcon)} onChange={(e) => setCork({ showIcon: e.target.checked })} /> {t('ui.cork2.showIcon')}
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(cork.showWords)} onChange={(e) => setCork({ showWords: e.target.checked })} /> {t('ui.cork2.showWords')}
            </label>
            <label>
              {t('ui.cork2.synopsisLines')}
              <input type="number" min="0" max="30" value={cork.synopsisLines} onChange={(e) => setCork({ synopsisLines: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
            <label className="check">
              <input type="checkbox" checked={cork.showImages !== false} onChange={(e) => setCork({ showImages: e.target.checked })} /> {t('ui.cork2.showImages')}
            </label>
            {cork.mode === 'free' && (
              <>
                <label className="check">
                  <input type="checkbox" checked={Boolean(cork.snapGrid)} onChange={(e) => setCork({ snapGrid: e.target.checked })} /> {t('ui.cork2.snapGrid')}
                </label>
                <label>
                  {t('ui.cork2.gridSize')}
                  <input type="number" min="4" max="200" step="4" value={cork.gridSize} onChange={(e) => setCork({ gridSize: Math.max(4, Number(e.target.value) || 24) })} />
                </label>
                <label className="check">
                  <input type="checkbox" checked={cork.showGrid !== false} onChange={(e) => setCork({ showGrid: e.target.checked })} /> {t('ui.cork2.showGrid')}
                </label>
              </>
            )}
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

      {cork.mode === 'lines' && (
        <div className={`cork-lines ${cork.linesDir === 'columns' ? 'vertical' : ''}`}>
        {groups.map((g) => (
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
        </div>
      )}

      {cork.mode === 'free' && (
        <div className={`freeform ${cork.showGrid === false ? 'no-grid' : ''}`} style={{ '--grid-size': `${Math.max(4, Number(cork.gridSize) || 24)}px` }} ref={freeRef} role="grid" aria-label={t('ui.corkboard.panou_x', { title: folder?.title || '' })}>
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
