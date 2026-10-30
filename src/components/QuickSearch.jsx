import React, { useEffect, useMemo, useRef, useState } from 'react';
import { quickSearchProject, quickSearchRows, quickNav, handoffCriteria } from '../lib/quickSearch.js';
import { findNode } from '../lib/tree.js';
import { t } from '../lib/i18n.js';

// Quick Search (Scrivener 3 §11.5): an omnibox-style popup that jumps to a
// document by title, synopsis or text. Results come in three labelled
// sections; Enter opens the selected row (the find tool is seeded with the
// phrase, as in Scrivener); the handoff button continues into the full
// Project Search dialog with the same phrase.
export default function QuickSearch({ project, docs, currentTitle = '', onOpen, onFullSearch, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const inputRef = useRef(null);

  const results = useMemo(() => quickSearchProject(project, docs, { query }), [project, docs, query]);
  const rows = useMemo(() => quickSearchRows(results), [results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const open = (id, q) => onOpen(id, q);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Scrivener: Esc clears the field first, then a second Esc closes the tool.
      if (query) setQuery('');
      else onClose();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
      e.preventDefault();
      const next = quickNav(rows, selectedKey, e.key);
      if (next.select) setSelectedKey(next.select);
      if (next.open) {
        open(next.open, query);
        onClose();
      }
    }
  };

  const label = (section, count) => (
    <div className="qs-section">
      <small className="muted">{t(`ui.quickSearch.${section}`)}{count ? ` (${count})` : ''}</small>
      {results[section].map((r) => {
        const sel = selectedKey === r.key;
        return (
          <button
            key={r.node.id}
            className={`qs-result${sel ? ' selected' : ''}`}
            onMouseEnter={() => setSelectedKey(r.key)}
            onClick={() => {
              open(r.node.id, query);
              onClose();
            }}
          >
            <span className="qs-title">{r.node.title}</span>
            {r.section === 'texts' && (
              <span className="qs-snippet muted">
                {r.before}<mark>{r.match}</mark>{r.after}
              </span>
            )}
            {r.section === 'synopses' && r.node.synopsis && <span className="qs-snippet muted">{r.node.synopsis}</span>}
          </button>
        );
      })}
    </div>
  );

  const anyResults = rows.length > 0;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal quick-search" role="dialog" aria-label={t('ui.quickSearch.aria')} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={currentTitle ? `${t('ui.quickSearch.placeholder')} — ${currentTitle}` : t('ui.quickSearch.placeholder')}
          aria-label={t('ui.quickSearch.aria')}
        />
        <div className="qs-results">
          {anyResults ? (
            <>
              {label('titles', results.titles.length)}
              {label('synopses', results.synopses.length)}
              {label('texts', results.texts.length)}
            </>
          ) : (
            query.trim() && <p className="muted qs-empty">{t('ui.quickSearch.niciun_rezultat')}</p>
          )}
        </div>
        <div className="qs-footer">
          <button
            className="link"
            disabled={!query.trim()}
            onClick={() => {
              onFullSearch(handoffCriteria(query));
              onClose();
            }}
          >
            {t('ui.quickSearch.cautare_completa')}
          </button>
          <small className="muted">Esc</small>
        </div>
      </div>
    </div>
  );
}

// Title helper kept for App.jsx: shows the current document in the field, like
// the URL bar shows the current page (manual §11.5).
export function quickSearchPlaceholderTitle(project, selectedId) {
  return findNode(project?.tree || [], selectedId)?.title || '';
}
