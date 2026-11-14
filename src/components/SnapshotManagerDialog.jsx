// Snapshots Manager (the whole project, parity with Scrivener §15.8.4): every snapshot of every
// document grouped by document (title + binder path), search in titles/dates/text (plain or
// regex), multi-select (Ctrl/Shift) with confirmed mass delete, export of one snapshot as
// .html/.txt through the native save dialog, and the same compare view as the Inspector.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t as tr, uiLocale } from '../lib/i18n.js';
import { sanitizeHtml } from '../lib/sanitize.js';
import { documentGroups, selectMany, sortSnapshots, toggleSort } from '../lib/snapshotList.js';
import { parseQuery } from '../lib/snapshotSearch.js';
import SnapshotDiff from './SnapshotDiff.jsx';

const SEARCH_DEBOUNCE_MS = 200;

export default function SnapshotManagerDialog({ api, dir, project, onChanged, onOpen, onReveal, onError = () => {}, onClose }) {
  const [all, setAll] = useState(null); // [{id, snaps:[{file,name,date}]}] from snap:listAll
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [hits, setHits] = useState(null); // [{id,file,name,date,where}] while searching
  const [regexBad, setRegexBad] = useState(false);
  const [selected, setSelected] = useState([]); // keys "<id>|<file>", click order kept
  const [anchor, setAnchor] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [docLists, setDocLists] = useState({}); // id → full list (with html), for preview/compare
  const [currentHtml, setCurrentHtml] = useState({}); // id → current document text, for compare vs current
  const [exported, setExported] = useState('');
  const [diffLevel, setDiffLevel] = useState('word');
  const listRef = useRef(null);

  const load = async () => {
    const list = await api.listAllSnapshots(dir).catch((e) => { onError(e); return []; });
    setAll(list || []);
    setDocLists({});
    setCurrentHtml({});
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, dir]);

  // Debounced project-wide search; an invalid regex never reaches the backend.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits(null);
      setRegexBad(false);
      return undefined;
    }
    const m = parseQuery(q, regex);
    const t = setTimeout(async () => {
      if (m.error) {
        setRegexBad(true);
        setHits([]);
        return;
      }
      setRegexBad(false);
      setHits(await api.searchSnapshots(dir, q, { regex }).catch((e) => { onError(e); return []; }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, regex, api, dir]);

  const byId = useMemo(() => Object.fromEntries((all || []).map((g) => [g.id, g.snaps])), [all]);
  const groups = useMemo(() => documentGroups(project.tree, byId), [project, byId]);
  const hitMap = useMemo(() => (hits ? new Map(hits.map((h) => [`${h.id}|${h.file}`, h.where])) : null), [hits]);
  const searching = Boolean(hitMap);
  const visible = useMemo(() => {
    if (!hitMap) return groups;
    const filtered = {};
    for (const h of hits || []) (filtered[h.id] ||= []).push({ file: h.file, name: h.name, date: h.date });
    return documentGroups(project.tree, filtered);
  }, [hitMap, hits, groups, project]);

  const flatRows = useMemo(() => visible.flatMap((g) => sortSnapshots(g.snaps, sort.key, sort.dir).map((s) => `${g.id}|${s.file}`)), [visible, sort]);
  const total = (all || []).reduce((n, g) => n + g.snaps.length, 0);
  const metaOf = (key) => {
    const [id, file] = key.split('|');
    for (const g of visible) {
      const s = g.snaps.find((x) => x.file === file);
      if (s && g.id === id) return { id, file, name: s.name, date: s.date, title: g.title };
    }
    return null;
  };
  const chosen = selected.map(metaOf).filter(Boolean);
  const one = chosen.length === 1 ? chosen[0] : null;
  const pair = chosen.length === 2 ? [...chosen].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)) : null;

  // Full lists (with html) of the documents involved in preview / compare / export content.
  useEffect(() => {
    const need = [...new Set(chosen.map((s) => s.id))];
    for (const id of need) {
      if (!docLists[id]) api.listSnapshots(dir, id).then((list) => setDocLists((d) => ({ ...d, [id]: list || [] }))).catch((e) => onError(e));
      if (comparing && currentHtml[id] === undefined && !pair) {
        api.readDoc(dir, id).then((h) => setCurrentHtml((c) => ({ ...c, [id]: h || '' }))).catch(() => setCurrentHtml((c) => ({ ...c, [id]: '' })));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join('|'), comparing, docLists, currentHtml]);

  const snapHtml = (s) => (docLists[s.id] || []).find((x) => x.file === s.file)?.html ?? '';

  const clickRow = (key, e) => {
    const mode = e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'single';
    const r = selectMany(selected, anchor, key, mode, flatRows);
    setSelected(r.selected);
    setAnchor(r.anchor);
    setExported('');
  };
  const onListKey = (e) => {
    if (!flatRows.length) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelected([...flatRows]);
      return;
    }
    if (e.key === 'Delete' && selected.length) { e.preventDefault(); removeSelected(); return; }
    const idx = flatRows.indexOf(selected[selected.length - 1]);
    const go = (i) => {
      const key = flatRows[Math.max(0, Math.min(flatRows.length - 1, i))];
      setSelected([key]);
      setAnchor(key);
      setTimeout(() => listRef.current?.querySelector(`[data-key="${CSS.escape(key)}"]`)?.focus(), 0);
    };
    if (e.key === 'ArrowDown') { e.preventDefault(); go(idx < 0 ? 0 : idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); go(idx < 0 ? 0 : idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(flatRows.length - 1); }
  };

  const removeSelected = async () => {
    if (!chosen.length) return;
    if (!window.confirm(tr('ui.snap.delete_n_confirm', { n: chosen.length }))) return;
    await api.deleteSnapshots(dir, chosen.map((s) => ({ id: s.id, file: s.file }))).catch(onError);
    setSelected([]);
    setAnchor(null);
    setComparing(false);
    await load();
    onChanged?.();
  };
  const exportOne = async () => {
    if (!one) return;
    const path = await api.exportSnapshot(dir, one.id, one.file, one.title || tr('ui.snap.orphan_doc')).catch((e) => { onError(e); return null; });
    if (path) setExported(tr('ui.snap.exported', { path }));
  };
  const whereOf = (key) => (searching ? hitMap.get(key) || [] : null);
  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');

  const compareA = comparing && pair ? pair[0] : comparing && one ? one : null;
  const compareBLabel = pair ? `„${pair[1].name}”` : tr('ui.inspector.textul_curent');
  const compareBHtml = pair ? snapHtml(pair[1]) : (currentHtml[one?.id] ?? '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal snap-manager" role="dialog" aria-label={tr('cmd.snapshotManager')} onClick={(e) => e.stopPropagation()}>
        <h2>{tr('cmd.snapshotManager')}</h2>
        <div className="snap-search-row">
          <input
            className={`snap-search${regexBad ? ' invalid' : ''}`}
            autoFocus
            type="search"
            aria-label={tr('ui.snap.search_hint')}
            placeholder={tr('ui.snap.search_hint')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="snap-regex">
            <input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} />
            {tr('ui.snap.search_regex')}
          </label>
          <span className="snap-search-count muted small" aria-live="polite">
            {regexBad ? tr('ui.snap.search_regex_bad') : tr('ui.snap.manager_results', { n: flatRows.length, m: total })}
          </span>
        </div>
        {all && !all.length ? (
          <p className="muted">{tr('ui.snap.manager_empty')}</p>
        ) : (
          <div className="snap-manager-body">
            <ul
              ref={listRef}
              className="snap-groups"
              role="listbox"
              aria-multiselectable="true"
              aria-label={tr('ui.snap.manager_list')}
              onKeyDown={onListKey}
            >
              <li className="snap-head" role="row">
                <span role="columnheader" aria-sort={ariaSort('date')}><button className="link sm-sort-date" onClick={() => setSort((s) => toggleSort(s, 'date'))}>{tr('ui.snap.col_date')}{arrow('date')}</button></span>
                <span role="columnheader" aria-sort={ariaSort('name')}><button className="link sm-sort-title" onClick={() => setSort((s) => toggleSort(s, 'name'))}>{tr('ui.snap.col_title')}{arrow('name')}</button></span>
              </li>
              {visible.map((g) => (
                <React.Fragment key={g.id || 'orphan'}>
                  <li className="snap-group" role="presentation">
                    <strong className="snap-group-title">{g.title === null ? tr('ui.snap.orphan_doc') : g.title}</strong>
                    <small className="snap-group-path">{g.path}</small>
                    <span className="snap-group-count">{g.snaps.length}</span>
                    {onReveal && g.title !== null && (
                      <button className="link sm-reveal" aria-label={`${tr('ui.p11.sn_reveal')}: ${g.title}`} onClick={() => { onReveal(g.id); onClose(); }}>{tr('ui.p11.sn_reveal')}</button>
                    )}
                  </li>
                  {sortSnapshots(g.snaps, sort.key, sort.dir).map((s) => {
                    const key = `${g.id}|${s.file}`;
                    const where = whereOf(key);
                    return (
                      <li
                        key={key}
                        data-key={key}
                        data-doc={g.id}
                        data-file={s.file}
                        role="option"
                        aria-selected={selected.includes(key)}
                        tabIndex={key === (selected[selected.length - 1] || flatRows[0]) ? 0 : -1}
                        className={selected.includes(key) ? 'selected' : ''}
                        onClick={(e) => clickRow(key, e)}
                        onDoubleClick={() => { if (g.title !== null) { onOpen?.(g.id); onClose(); } }}
                      >
                        <small className="snap-date">{new Date(s.date).toLocaleString(uiLocale())}</small>
                        <span className="snap-title-wrap">
                          <strong className="snap-title">{s.name}</strong>
                          {where && where.length ? <span className="snap-where muted small">{where.map((w) => tr(`ui.snap.search_hit_${w}`)).join(', ')}</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </React.Fragment>
              ))}
              {searching && !flatRows.length && <li className="muted small" role="presentation">{tr('ui.snap.search_no_hits')}</li>}
            </ul>
            <div className="snap-manager-detail">
              {compareA ? (
                <SnapshotDiff
                  aHtml={snapHtml(compareA)}
                  bHtml={compareBHtml}
                  aName={compareA.name}
                  bLabel={compareBLabel}
                  diffLevel={diffLevel}
                  onDiffLevel={setDiffLevel}
                />
              ) : one ? (
                <div className="snap-preview prose" aria-readonly="true" dangerouslySetInnerHTML={{ __html: sanitizeHtml(snapHtml(one)) }} />
              ) : (
                <p className="muted small">{tr('ui.snap.select_hint')}</p>
              )}
              {!comparing && chosen.length === 2 && <p className="muted small">{tr('ui.inspector.compara_cele_doua_snapshot_uri')}</p>}
            </div>
          </div>
        )}
        {exported && <p className="snap-export-msg muted small" aria-live="polite">{exported}</p>}
        <div className="actions">
          <button className="snap-export" disabled={!one} onClick={exportOne} title={tr('ui.snap.export_hint')}>{tr('ui.snap.export')}</button>
          <button className="snap-compare" aria-pressed={comparing} disabled={!chosen.length || chosen.length > 2} onClick={() => setComparing((v) => !v)} title={tr('ui.snap.compare_hint')}>{tr('ui.snap.compare')}</button>
          <button className="snap-del" disabled={!chosen.length} onClick={removeSelected}>{tr('ui.snap.delete')}</button>
          <button onClick={onClose}>{tr('ui.snap.close')}</button>
        </div>
      </div>
    </div>
  );
}
