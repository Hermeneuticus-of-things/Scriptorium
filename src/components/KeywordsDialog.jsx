import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listKeywords, addKeyword, renameKeyword, deleteKeyword, setKeywordColor, keywordTreeRows, KEYWORD_MIME } from '../lib/collections.js';
import { t } from '../lib/i18n.js';
import { confirmDialog } from '../lib/appDialog.js';

const CSS = `
.kw-modeless { background: transparent; pointer-events: none; justify-content: flex-end; align-items: flex-start; }
.kw-modeless .modal { pointer-events: auto; margin: 70px 24px 0 0; max-width: 480px; box-shadow: 0 8px 28px rgba(0,0,0,.25); }
.kw-tools { display: flex; gap: 4px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
.kw-tools button { min-width: 30px; }
.kw-tools input[type=search] { flex: 1; min-width: 100px; }
.kw-tree { list-style: none; margin: 0; padding: 4px 0; max-height: 50vh; overflow: auto; border: 1px solid var(--line); border-radius: 6px; }
.kw-tree:focus-visible { outline: 2px solid var(--accent, #8a5a2b); outline-offset: 1px; }
.kw-row { display: flex; align-items: center; gap: 6px; padding: 2px 8px; cursor: default; user-select: none; }
.kw-row.selected { background: var(--accent-soft, rgba(138,90,43,.18)); }
.kw-row .kw-twisty { width: 14px; border: none; background: none; padding: 0; font-size: 11px; color: var(--muted); }
.kw-row .kw-swatch { width: 16px; height: 16px; padding: 0; border: 1px solid var(--line); border-radius: 3px; background: none; cursor: pointer; }
.kw-row .kw-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kw-row .kw-count { color: var(--muted); font-size: 12px; }
.kw-row input.kw-edit { flex: 1; font: inherit; padding: 0 4px; }
.kw-hint { font-size: 12px; }
`;

const rowId = (name) => `kw-row-${encodeURIComponent(name).replace(/%/g, '_')}`;

export default function KeywordsDialog({ project, onSave, onClose, onSearchKeyword }) {
  const [draft, setDraft] = useState(project);
  const [base, setBase] = useState(project);
  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [sel, setSel] = useState(null);
  const [editing, setEditing] = useState(null);
  const listRef = useRef(null);
  const keywords = useMemo(() => listKeywords(draft), [draft]);
  const dirty = draft !== base;

  // Keywords dropped on documents change the project while this window is open: follow it.
  useEffect(() => {
    if (!dirty) {
      setDraft(project);
      setBase(project);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const rows = useMemo(() => {
    const f = filter.trim().toLocaleLowerCase('ro');
    if (f) return keywords.filter((k) => k.name.toLocaleLowerCase('ro').includes(f)).map((k) => ({ ...k, depth: 0, hasChildren: false }));
    return keywordTreeRows(keywords, collapsed);
  }, [keywords, collapsed, filter]);
  const current = keywords.find((k) => k.name === sel) || null;

  const uniqueName = () => {
    const baseName = t('ui.keywordsDialog.cuvant_nou_implicit');
    let n = baseName;
    for (let i = 2; keywords.some((k) => k.name === n); i++) n = `${baseName} ${i}`;
    return n;
  };
  // + adds next to the selected keyword (same parent), "+ copil" under it; the new name is edited in place.
  const addNew = (asChild) => {
    const name = uniqueName();
    const parent = asChild ? sel : current?.parent || null;
    setDraft(addKeyword(draft, name, { parent }));
    if (asChild && sel) setCollapsed((c) => ({ ...c, [sel]: false }));
    setSel(name);
    setEditing(name);
  };

  const commitRename = async (k, value) => {
    setEditing(null);
    const target = String(value || '').trim();
    if (!target || target === k.name) return;
    if (keywords.some((x) => x.name === target) && !(await confirmDialog({ message: t('ui.keywordsDialog.x_exista_deja_unesti_cele', { target }), okLabel: t('ui.dlg.uneste') }))) return;
    setDraft(renameKeyword(draft, k.name, target));
    setSel(target);
    setTimeout(() => listRef.current?.focus(), 0);
  };

  const remove = async (k) => {
    if (!k) return;
    const msg = k.count
      ? t('ui.keywordsDialog.stergi_x_va_fi_scos', { name: k.name, count: k.count, v2: k.count === 1 ? 'document' : t('ui.advancedSearchDialog.documente') })
      : t('ui.keywordsDialog.stergi_x', { name: k.name });
    if (!(await confirmDialog({ message: msg, okLabel: t('ui.dlg.sterge'), danger: true }))) return;
    const i = rows.findIndex((r) => r.name === k.name);
    setDraft(deleteKeyword(draft, k.name));
    setSel(rows[i + 1]?.name || rows[i - 1]?.name || null);
  };

  const search = (name) => {
    if (dirty) onSave(draft);
    onSearchKeyword?.(name);
  };

  const onListKey = (e) => {
    if (editing) return;
    const i = rows.findIndex((r) => r.name === sel);
    const row = rows[i];
    const go = (j) => {
      const r = rows[Math.max(0, Math.min(rows.length - 1, j))];
      if (r) setSel(r.name);
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i < 0 ? 0 : i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(rows.length - 1);
    else if (e.key === 'ArrowRight' && row?.hasChildren) {
      if (collapsed[row.name]) setCollapsed((c) => ({ ...c, [row.name]: false }));
      else go(i + 1);
    } else if (e.key === 'ArrowLeft' && row) {
      if (row.hasChildren && !collapsed[row.name]) setCollapsed((c) => ({ ...c, [row.name]: true }));
      else if (row.parent) setSel(row.parent);
    } else if (e.key === 'F2' && row) setEditing(row.name);
    else if (e.key === 'Delete' && row) remove(current);
    else if (e.key === 'Insert') addNew(e.shiftKey);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (sel) listRef.current?.querySelector(`#${window.CSS.escape(rowId(sel))}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [sel]);

  return (
    <div className="modal-backdrop kw-modeless" onClick={(e) => e.target === e.currentTarget && !editing && onClose()}>
      <div className="modal" role="dialog" aria-label={t('ui.advancedSearchDialog.cuvinte_cheie')}>
        <style>{CSS}</style>
        <h2>{t('ui.keywordsDialog.cuvinte_cheie_ale_proiectului')}</h2>
        <div className="kw-tools" role="toolbar" aria-label={t('ui.advancedSearchDialog.cuvinte_cheie')}>
          <button onClick={() => addNew(false)} title={t('ui.keywordsDialog.adauga_alaturi')} aria-label={t('ui.keywordsDialog.adauga_alaturi')}>+</button>
          <button onClick={() => addNew(true)} disabled={!sel} title={t('ui.keywordsDialog.adauga_copil_lung')}>{t('ui.keywordsDialog.adauga_copil')}</button>
          <button onClick={() => remove(current)} disabled={!current} title={t('ui.keywordsDialog.sterge_selectat')} aria-label={t('ui.keywordsDialog.sterge_selectat')}>−</button>
          <button onClick={() => current && setEditing(current.name)} disabled={!current}>{t('set.binderDbl.rename')}</button>
          <button onClick={() => current && search(current.name)} disabled={!current || !onSearchKeyword}>{t('ui.advancedSearchDialog.cauta')}</button>
          <input type="search" placeholder={t('ui.keywordsDialog.filtreaza')} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('ui.keywordsDialog.filtreaza')} />
        </div>
        {keywords.length === 0 ? (
          <p className="muted">{t('ui.keywordsDialog.proiectul_nu_are_inca_niciun')}</p>
        ) : (
          <ul
            className="kw-tree"
            role="tree"
            ref={listRef}
            tabIndex={0}
            aria-label={t('ui.keywordsDialog.arbore')}
            aria-activedescendant={sel && rows.some((r) => r.name === sel) ? rowId(sel) : undefined}
            onKeyDown={onListKey}
          >
            {rows.map((k) => (
              <li
                key={k.name}
                id={rowId(k.name)}
                role="treeitem"
                aria-level={k.depth + 1}
                aria-selected={sel === k.name}
                aria-expanded={k.hasChildren ? !collapsed[k.name] : undefined}
                className={`kw-row ${sel === k.name ? 'selected' : ''}`}
                style={{ paddingLeft: 8 + k.depth * 16 }}
                draggable={editing !== k.name}
                onDragStart={(e) => {
                  // A window with unsaved edits saves them first, so the drop lands on the current names.
                  if (dirty) {
                    onSave(draft);
                    setBase(draft);
                  }
                  e.dataTransfer.setData(KEYWORD_MIME, k.name);
                  e.dataTransfer.setData('text/plain', k.name);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => setSel(k.name)}
                onDoubleClick={() => setEditing(k.name)}
              >
                {k.hasChildren ? (
                  <button
                    className="kw-twisty"
                    tabIndex={-1}
                    aria-label={collapsed[k.name] ? t('ui.outliner.extinde') : t('ui.outliner.restrange')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsed((c) => ({ ...c, [k.name]: !c[k.name] }));
                    }}
                  >
                    {collapsed[k.name] ? '▸' : '▾'}
                  </button>
                ) : (
                  <span className="kw-twisty" />
                )}
                <input
                  type="color"
                  className="kw-swatch"
                  tabIndex={-1}
                  value={k.color || '#cccccc'}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraft(setKeywordColor(draft, k.name, e.target.value))}
                  aria-label={t('ui.keywordsDialog.culoare_pentru_x', { name: k.name })}
                />
                {editing === k.name ? (
                  <input
                    className="kw-edit"
                    autoFocus
                    defaultValue={k.name}
                    aria-label={t('ui.keywordsDialog.nume_nou_pentru_cuvantul_cheie')}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => commitRename(k, e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') {
                        e.target.value = k.name;
                        e.target.blur();
                      }
                    }}
                  />
                ) : (
                  <span className="kw-label">{k.name}</span>
                )}
                <span className="kw-count" title={t('ui.keywordsDialog.utilizari')}>{k.count}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted kw-hint">{t('ui.keywordsDialog.trage_pe_documente')}</p>
        <p className="muted kw-hint">{t('ui.keywordsDialog.redenumirea_si_stergerea_se_aplica')}</p>
        <div className="actions">
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button
            className="primary"
            disabled={!dirty}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            {t('btn.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
