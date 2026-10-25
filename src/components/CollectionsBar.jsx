import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import {
  createCollection, renameCollection, recolorCollection, deleteCollection, addToCollection, removeFromCollection,
} from '../lib/collections.js';
import { SearchIcon } from './Icons.jsx';
import { confirmDialog, promptDialog } from '../lib/appDialog.js';

/** Id of the permanent tab that lists the last project search results. */
export const SEARCH_RESULTS_TAB = '__search_results__';

const CSS = `
.cb-bar { display: flex; flex-direction: column; gap: 4px; }
.cb-tabs { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; }
.cb-tab { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; font-size: 12px; border-radius: 12px; max-width: 150px; position: relative; }
.cb-tab span.cb-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-dot { width: 9px; height: 9px; border-radius: 50%; border: 1px solid var(--line); flex-shrink: 0; }
.cb-more { padding: 0 3px; border: none; background: none; font-size: 12px; }
.cb-pop { position: absolute; top: 100%; left: 0; z-index: 30; background: var(--paper); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.15); display: flex; flex-direction: column; min-width: 190px; padding: 4px; }
.cb-pop button { border: none; text-align: left; background: none; padding: 5px 8px; }
.cb-pop button:hover:not(:disabled) { background: var(--accent-soft); }
.cb-wrap { position: relative; }
.cb-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.cb-actions button { font-size: 12px; padding: 2px 8px; }
.cb-tab.cb-drop { outline: 2px dashed var(--accent, #8a5a2b); outline-offset: 1px; }
.cb-tab .cb-icon svg { width: 11px; height: 11px; vertical-align: -1px; }
.cb-rename { font-size: 12px; padding: 1px 6px; width: 120px; border-radius: 12px; }
.cb-color { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }
`;

function Popup({ onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [onClose]);
  return (
    <div className="cb-pop" role="menu" ref={ref}>
      {children}
    </div>
  );
}

export default function CollectionsBar({ project, active = null, onSelect, onChange, selectedIds = [], searchResultIds = null }) {
  const [renaming, setRenaming] = useState(null); // collection id being renamed inline
  const [dropOn, setDropOn] = useState(null);
  const draggedIds = (e) => {
    try {
      const ids = JSON.parse(e.dataTransfer.getData('text/x-scribner-ids') || '[]');
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  };
  const canDrop = (e, c) => c.type !== 'search' && [...(e.dataTransfer?.types || [])].includes('text/x-scribner-ids');
  const commitRename = (c, value) => {
    setRenaming(null);
    const title = String(value || '').trim();
    if (title && title !== c.title) onChange(renameCollection(project, c.id, title));
  };
  const collections = project.collections || [];
  const [menuFor, setMenuFor] = useState(null); // collection id | '+' | null
  const colorRef = useRef(null);
  const [colorTarget, setColorTarget] = useState(null);
  const current = collections.find((c) => c.id === active) || null;

  const close = () => setMenuFor(null);

  const create = async (ids) => {
    close();
    const title = await promptDialog({ message: t('ui.advancedSearchDialog.numele_colectiei'), value: t('ui.collectionsBar.colectie_noua'), okLabel: t('ui.dlg.creeaza') });
    if (!title || !title.trim()) return;
    const { project: next, id } = createCollection(project, { title: title.trim(), type: 'manual', ids });
    onChange(next);
    onSelect(id);
  };

  const rename = (c) => {
    close();
    setRenaming(c.id);
  };

  const pickColor = (c) => {
    close();
    setColorTarget(c.id);
    const el = colorRef.current;
    if (!el) return;
    el.value = c.color || '#8a5a2b';
    el.click();
  };

  const remove = async (c) => {
    close();
    if (!(await confirmDialog({ message: t('ui.collectionsBar.stergi_colectia_x_documentele_nu', { title: c.title }), okLabel: t('ui.dlg.sterge_colectia'), danger: true }))) return;
    onChange(deleteCollection(project, c.id));
    if (active === c.id) onSelect(null);
  };

  return (
    <div className="cb-bar">
      <style>{CSS}</style>
      <input
        ref={colorRef}
        type="color"
        className="cb-color"
        aria-label={t('ui.collectionsBar.culoare')}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => colorTarget && onChange(recolorCollection(project, colorTarget, e.target.value))}
      />
      <div className="cb-tabs" role="tablist" aria-label={t('ui.collectionsBar.colectii')}>
        <button role="tab" aria-selected={active === null} className={`cb-tab ${active === null ? 'on' : ''}`} onClick={() => onSelect(null)}>
          <span className="cb-name">Binder</span>
        </button>
        {searchResultIds && searchResultIds.length > 0 && (
          <button
            role="tab"
            aria-selected={active === SEARCH_RESULTS_TAB}
            className={`cb-tab ${active === SEARCH_RESULTS_TAB ? 'on' : ''}`}
            title={`${t('ui.collectionsBar.rezultatele_cautarii')} (${searchResultIds.length})`}
            onClick={() => onSelect(SEARCH_RESULTS_TAB)}
          >
            <span className="cb-icon" aria-hidden="true"><SearchIcon /></span>
            <span className="cb-name">{t('ui.collectionsBar.rezultatele_cautarii')}</span>
          </button>
        )}
        {collections.map((c) => (
          <div key={c.id} className="cb-wrap">
            {renaming === c.id ? (
              <input
                className="cb-rename"
                autoFocus
                defaultValue={c.title}
                aria-label={t('ui.collectionsBar.nume_colectie')}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => commitRename(c, e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') {
                    e.target.value = c.title;
                    e.target.blur();
                  }
                }}
              />
            ) : (
            <button
              role="tab"
              aria-selected={active === c.id}
              className={`cb-tab ${active === c.id ? 'on' : ''} ${dropOn === c.id ? 'cb-drop' : ''}`}
              title={c.type === 'search' ? t('ui.collectionsBar.x_cautare_salvata', { title: c.title }) : `${c.title} — ${t('ui.collectionsBar.dublu_clic_redenumeste')}`}
              onClick={() => onSelect(c.id)}
              onDoubleClick={() => setRenaming(c.id)}
              onKeyDown={(e) => {
                if (e.key === 'F2') {
                  e.preventDefault();
                  setRenaming(c.id);
                } else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
                  e.preventDefault();
                  setMenuFor(c.id);
                }
              }}
              onDragOver={(e) => {
                if (!canDrop(e, c)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                if (dropOn !== c.id) setDropOn(c.id);
              }}
              onDragLeave={() => setDropOn(null)}
              onDrop={(e) => {
                if (!canDrop(e, c)) return;
                e.preventDefault();
                setDropOn(null);
                const ids = draggedIds(e);
                if (ids.length) onChange(addToCollection(project, c.id, ids));
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuFor(c.id);
              }}
            >
              <span className="cb-dot" style={{ background: c.color || 'transparent' }} />
              {c.type === 'search' && <span className="cb-icon" aria-hidden="true"><SearchIcon /></span>}
              <span className="cb-name">{c.title}</span>
              <span
                className="cb-more"
                role="button"
                aria-label={t('ui.collectionsBar.optiuni_pentru_x', { title: c.title })}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFor(menuFor === c.id ? null : c.id);
                }}
              >
                ⋯
              </span>
            </button>
            )}
            {menuFor === c.id && (
              <Popup onClose={close}>
                <button role="menuitem" onClick={() => rename(c)}>{t('set.binderDbl.rename')}</button>
                <button role="menuitem" onClick={() => pickColor(c)}>{t('ui.collectionsBar.culoare')}</button>
                {c.color && (
                  <button role="menuitem" onClick={() => { close(); onChange(recolorCollection(project, c.id, '')); }}>
                    {t('ui.collectionsBar.fara_culoare')}
                  </button>
                )}
                <button role="menuitem" onClick={() => remove(c)}>{t('btn.delete')}</button>
              </Popup>
            )}
          </div>
        ))}
        <div className="cb-wrap">
          <button className="cb-tab" title={t('ui.collectionsBar.colectie_noua')} aria-label={t('ui.collectionsBar.colectie_noua')} onClick={() => setMenuFor(menuFor === '+' ? null : '+')}>
            +
          </button>
          {menuFor === '+' && (
            <Popup onClose={close}>
              <button role="menuitem" disabled={!selectedIds.length} onClick={() => create(selectedIds)}>
                {t('ui.collectionsBar.colectie_noua_din_selectie')}
              </button>
              <button role="menuitem" onClick={() => create([])}>{t('ui.collectionsBar.colectie_goala')}</button>
            </Popup>
          )}
        </div>
      </div>
      {current && current.type !== 'search' && (
        <div className="cb-actions">
          <button disabled={!selectedIds.length} onClick={() => onChange(addToCollection(project, current.id, selectedIds))}>
            {t('ui.collectionsBar.adauga_selectia')}
          </button>
          <button
            disabled={!selectedIds.some((id) => (current.ids || []).includes(id))}
            onClick={() => onChange(removeFromCollection(project, current.id, selectedIds))}
          >
            {t('ui.collectionsBar.scoate_selectia')}
          </button>
        </div>
      )}
    </div>
  );
}
