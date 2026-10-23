import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import {
  createCollection, renameCollection, recolorCollection, deleteCollection, addToCollection, removeFromCollection,
} from '../lib/collections.js';

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

export default function CollectionsBar({ project, active = null, onSelect, onChange, selectedIds = [] }) {
  const collections = project.collections || [];
  const [menuFor, setMenuFor] = useState(null); // collection id | '+' | null
  const colorRef = useRef(null);
  const [colorTarget, setColorTarget] = useState(null);
  const current = collections.find((c) => c.id === active) || null;

  const close = () => setMenuFor(null);

  const create = (ids) => {
    close();
    const title = window.prompt(t('ui.advancedSearchDialog.numele_colectiei'), t('ui.collectionsBar.colectie_noua'));
    if (!title || !title.trim()) return;
    const { project: next, id } = createCollection(project, { title: title.trim(), type: 'manual', ids });
    onChange(next);
    onSelect(id);
  };

  const rename = (c) => {
    close();
    const title = window.prompt(t('ui.collectionsBar.nume_nou_pentru_colectie'), c.title);
    if (title && title.trim() && title.trim() !== c.title) onChange(renameCollection(project, c.id, title.trim()));
  };

  const pickColor = (c) => {
    close();
    setColorTarget(c.id);
    const el = colorRef.current;
    if (!el) return;
    el.value = c.color || '#8a5a2b';
    el.click();
  };

  const remove = (c) => {
    close();
    if (!window.confirm(t('ui.collectionsBar.stergi_colectia_x_documentele_nu', { title: c.title }))) return;
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
        {collections.map((c) => (
          <div key={c.id} className="cb-wrap">
            <button
              role="tab"
              aria-selected={active === c.id}
              className={`cb-tab ${active === c.id ? 'on' : ''}`}
              title={c.type === 'search' ? t('ui.collectionsBar.x_cautare_salvata', { title: c.title }) : c.title}
              onClick={() => onSelect(c.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuFor(c.id);
              }}
            >
              <span className="cb-dot" style={{ background: c.color || 'transparent' }} />
              <span className="cb-name">{c.type === 'search' ? '🔍 ' : ''}{c.title}</span>
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
