// Snapshots of one document: take (+), delete (−), compare (with navigation between changes),
// roll back, inline rename, sortable Date | Title list. Used by the Inspector and the Snapshots Manager.
import { useEffect, useMemo, useRef, useState } from 'react';
import { t as tr, uiLocale } from '../lib/i18n.js';
import { htmlToText } from '../lib/text.js';
import { sanitizeHtml } from '../lib/sanitize.js';
import { diffText, DIFF_LEVELS } from '../lib/snapshotDiff.js';
import { sortSnapshots, toggleSort, selectSnapshot, changeStarts, stepChange } from '../lib/snapshotList.js';

const LEVELS_COARSE_FIRST = [...DIFF_LEVELS].reverse(); // paragraf, frază, sintagmă, cuvânt

export default function SnapshotsPane({ api, dir, node, html, canRestore = true, flush, onRestore, onError = () => {}, onChanged }) {
  const [snaps, setSnaps] = useState([]);
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [selected, setSelected] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [diffLevel, setDiffLevel] = useState('word');
  const [renaming, setRenamingState] = useState(null); // {file, value}
  const renameRef = useRef(null);
  const setRenaming = (r) => {
    renameRef.current = r;
    setRenamingState(r);
  };
  const [current, setCurrent] = useState(-1);
  const diffRef = useRef(null);
  const listRef = useRef(null);
  const previewRef = useRef(null);
  const [hasPick, setHasPick] = useState(false);
  // Selected text inside the snapshot preview (or the comparison), as HTML.
  const pickedHtml = () => {
    const sel = window.getSelection?.();
    const box = previewRef.current || diffRef.current;
    if (!sel || sel.isCollapsed || !sel.rangeCount || !box) return '';
    const r = sel.getRangeAt(0);
    if (!box.contains(r.commonAncestorContainer)) return '';
    const d = document.createElement('div');
    d.appendChild(r.cloneContents());
    d.querySelectorAll('del').forEach((x) => x.remove());
    return sanitizeHtml(d.innerHTML);
  };
  useEffect(() => {
    const on = () => setHasPick(Boolean(pickedHtml()));
    document.addEventListener('selectionchange', on);
    return () => document.removeEventListener('selectionchange', on);
  });
  // Copies the selected part of the snapshot into the document at the cursor (App listens).
  const copyToDocument = () => {
    const h = pickedHtml();
    if (!h) return;
    window.dispatchEvent(new CustomEvent('scribner:insert-html', { detail: { html: h, docId: node.id } }));
  };

  const reload = async (notify = true) => {
    const list = await api.listSnapshots(dir, node.id).catch((e) => { onError(e); return []; });
    setSnaps([...(list || [])]);
    setSelected((sel) => sel.filter((f) => list.some((s) => s.file === f)));
    if (notify) onChanged?.();
  };
  useEffect(() => {
    setSelected([]);
    setRenaming(null);
    reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, dir, node.id]);

  const sorted = useMemo(() => sortSnapshots(snaps, sort.key, sort.dir), [snaps, sort]);
  const chosen = selected.map((f) => snaps.find((s) => s.file === f)).filter(Boolean);
  const one = chosen.length === 1 ? chosen[0] : null;

  // Two snapshots: older → newer. One: snapshot → current text.
  const pair = chosen.length === 2 ? [...chosen].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)) : null;
  const diff = useMemo(() => {
    if (!comparing || !chosen.length) return null;
    const [a, b] = pair ? [pair[0].html, pair[1].html] : [chosen[0].html, html];
    return diffText(htmlToText(a), htmlToText(b), diffLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparing, selected.join('|'), snaps, html, diffLevel]);
  const starts = useMemo(() => (diff ? changeStarts(diff) : []), [diff]);
  useEffect(() => setCurrent(-1), [diff]);
  // part index → change number (for highlighting the current change)
  const groupOf = useMemo(() => {
    const g = [];
    let n = -1;
    (diff || []).forEach((p, i) => {
      if (starts.includes(i)) n += 1;
      g[i] = p.added || p.removed ? n : -1;
    });
    return g;
  }, [diff, starts]);

  const jump = (delta) => {
    const next = stepChange(starts.length, current, delta);
    setCurrent(next);
    if (next < 0) return;
    setTimeout(() => diffRef.current?.querySelector(`[data-change="${next}"]`)?.scrollIntoView?.({ block: 'nearest' }), 0);
  };

  const take = async () => {
    const name = window.prompt(tr('ui.inspector.nume_snapshot'), tr('ui.inspector.inainte_de_revizie_x', { v0: new Date().toLocaleDateString(uiLocale()) }));
    if (name === null) return;
    await flush?.();
    await api.takeSnapshot(dir, node.id, name || 'Snapshot').catch(onError);
    await reload();
  };
  const removeSelected = async () => {
    if (!chosen.length) return;
    const msg = chosen.length === 1 ? tr('ui.inspector.stergi_snapshot_ul_x_nu', { name: chosen[0].name }) : tr('ui.snap.delete_n_confirm', { n: chosen.length });
    if (!window.confirm(msg)) return;
    for (const s of chosen) await api.deleteSnapshot(dir, node.id, s.file).catch(onError);
    setSelected([]);
    await reload();
  };
  const rollBack = async () => {
    if (!one || !canRestore) return;
    if (!window.confirm(tr('ui.snap.rollback_confirm', { name: one.name }))) return;
    await flush?.();
    await api.takeSnapshot(dir, node.id, tr('ui.snap.before_rollback')).catch(onError);
    onRestore(one.html);
    setComparing(false);
    await reload();
  };
  const saveRename = async () => {
    const r = renameRef.current;
    setRenaming(null);
    const s = r && snaps.find((x) => x.file === r.file);
    const name = r ? r.value.trim() : '';
    if (!s || !name || name === s.name) return;
    await api.renameSnapshot(dir, node.id, s.file, name).catch(onError);
    await reload();
  };

  const click = (s, e) => setSelected((sel) => selectSnapshot(sel, s.file, e.ctrlKey || e.metaKey));
  const onListKey = (e) => {
    if (renaming || !sorted.length) return;
    const idx = sorted.findIndex((s) => s.file === selected[selected.length - 1]);
    const go = (i) => {
      const s = sorted[Math.max(0, Math.min(sorted.length - 1, i))];
      setSelected([s.file]);
      listRef.current?.querySelector(`[data-file="${CSS.escape(s.file)}"]`)?.focus();
    };
    if (e.key === 'ArrowDown') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); go(idx < 0 ? 0 : idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(sorted.length - 1); }
    else if (e.key === 'F2' && one) { e.preventDefault(); setRenaming({ file: one.file, value: one.name }); }
    else if (e.key === 'Delete' && chosen.length) { e.preventDefault(); removeSelected(); }
  };
  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const focusFile = selected[selected.length - 1] || sorted[0]?.file;

  return (
    <div className="snapshots">
      <div className="snap-toolbar" role="toolbar" aria-label={tr('ui.inspector.tab_snapshots')}>
        <button className="snap-add" onClick={take} aria-label={tr('ui.snap.take')} title={tr('ui.snap.take')}>+</button>
        <button className="snap-del" onClick={removeSelected} disabled={!chosen.length} aria-label={tr('ui.snap.delete')} title={tr('ui.snap.delete')}>−</button>
        <button className={`snap-compare ${comparing ? 'on' : ''}`} aria-pressed={comparing} onClick={() => setComparing((v) => !v)} title={tr('ui.snap.compare_hint')}>{tr('ui.snap.compare')}</button>
        <button className="snap-rollback" onClick={rollBack} disabled={!one || !canRestore} title={tr('ui.snap.rollback_hint')}>{tr('ui.snap.rollback')}</button>
      </div>
      {snaps.length === 0 ? (
        <p className="muted">{tr('ui.inspector.niciun_snapshot_fa_unul_inainte')}</p>
      ) : (
        <>
          <div className="snap-head" role="row">
            <span role="columnheader" aria-sort={ariaSort('date')}><button className="link" onClick={() => setSort((s) => toggleSort(s, 'date'))}>{tr('ui.snap.col_date')}{arrow('date')}</button></span>
            <span role="columnheader" aria-sort={ariaSort('name')}><button className="link" onClick={() => setSort((s) => toggleSort(s, 'name'))}>{tr('ui.snap.col_title')}{arrow('name')}</button></span>
          </div>
          <ul ref={listRef} className="snap-list" role="listbox" aria-multiselectable="true" aria-label={tr('ui.inspector.tab_snapshots')} onKeyDown={onListKey}>
            {sorted.map((s) => {
              const sel = selected.includes(s.file);
              return (
                <li
                  key={s.file}
                  data-file={s.file}
                  role="option"
                  aria-selected={sel}
                  tabIndex={s.file === focusFile ? 0 : -1}
                  className={sel ? 'selected' : ''}
                  onClick={(e) => click(s, e)}
                >
                  <small className="snap-date">{new Date(s.date).toLocaleString(uiLocale())}</small>
                  {renaming?.file === s.file ? (
                    <input
                      className="snap-rename"
                      autoFocus
                      aria-label={tr('ui.inspector.titlul_snapshot_ului')}
                      value={renaming.value}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenaming({ file: s.file, value: e.target.value })}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') saveRename();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      onBlur={() => { if (renameRef.current?.file === s.file) saveRename(); }}
                    />
                  ) : (
                    <strong className="snap-title" title={tr('ui.snap.rename_hint')} onDoubleClick={(e) => { e.stopPropagation(); setRenaming({ file: s.file, value: s.name }); }}>{s.name}</strong>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {(one || comparing) && (
        <div className="snap-copy-row">
          <button className="snap-copy-to-doc" disabled={!hasPick} onMouseDown={(e) => e.preventDefault()} onClick={copyToDocument} title={tr('ui.p11.sn_copy_hint')}>{tr('ui.p11.sn_copy')}</button>
        </div>
      )}
      {!comparing && one && <div ref={previewRef} className="snap-preview prose" aria-readonly="true" dangerouslySetInnerHTML={{ __html: sanitizeHtml(one.html) }} />}
      {!comparing && !one && snaps.length > 0 && <p className="muted small">{tr('ui.snap.select_hint')}</p>}
      {comparing && !chosen.length && snaps.length > 0 && <p className="muted small">{tr('ui.snap.select_hint')}</p>}
      {diff && (
        <div className="snap-compare-pane">
          <p className="muted small">
            <del>{tr('ui.inspector.sters')}</del> {tr('ui.inspector.fata_de')}{pair ? pair[0].name : chosen[0].name}” · <ins>{tr('ui.inspector.adaugat')}</ins> {tr('ui.inspector.in')} {pair ? `„${pair[1].name}”` : tr('ui.inspector.textul_curent')}
          </p>
          <div className="snap-nav">
            <label className="diff-level">
              {tr('ui.inspector.diffLevel')}{' '}
              <select value={diffLevel} onChange={(e) => setDiffLevel(e.target.value)}>
                {LEVELS_COARSE_FIRST.map((l) => <option key={l} value={l}>{tr(`ui.inspector.diff_${l}`)}</option>)}
              </select>
            </label>
            <button className="snap-prev" onClick={() => jump(-1)} disabled={!starts.length} aria-label={tr('ui.snap.prev_change')} title={tr('ui.snap.prev_change')}>◀</button>
            <button className="snap-next" onClick={() => jump(1)} disabled={!starts.length} aria-label={tr('ui.snap.next_change')} title={tr('ui.snap.next_change')}>▶</button>
            <span className="snap-count muted small" aria-live="polite">{starts.length ? `${current < 0 ? '–' : current + 1} / ${starts.length}` : tr('ui.snap.no_changes')}</span>
          </div>
          <div className="snap-preview diff" ref={diffRef}>
            {diff.map((part, i) => {
              const g = groupOf[i];
              const props = { key: i, className: g >= 0 && g === current ? 'current' : undefined, 'data-change': starts.includes(i) ? g : undefined };
              return part.added ? <ins {...props}>{part.value}</ins> : part.removed ? <del {...props}>{part.value}</del> : <span key={i}>{part.value}</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
