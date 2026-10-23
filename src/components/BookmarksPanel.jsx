import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';

// Project bookmarks with preview (Scrivener: Project Bookmarks).
// Props:
//   bookmarks   project.bookmarks = [{ id, title? }] (id = binder node id)
//   nodeTitle(id) -> current title from the binder (or undefined if deleted)
//   readDoc(id)   -> Promise<html> for the preview
//   currentId     id of the document in the editor (for "Adaugă documentul curent")
//   onChange(bookmarks), onOpen(id)
export default function BookmarksPanel({ bookmarks = [], nodeTitle = () => undefined, readDoc, currentId, onChange, onOpen, onError }) {
  const [sel, setSel] = useState(bookmarks[0]?.id || null);
  const [preview, setPreview] = useState('');
  const has = (id) => bookmarks.some((b) => b.id === id);

  useEffect(() => {
    if (!sel || !readDoc) return setPreview('');
    let alive = true;
    Promise.resolve(readDoc(sel))
      .then((h) => alive && setPreview(h || ''))
      .catch((e) => onError?.(e));
    return () => {
      alive = false;
    };
  }, [sel, readDoc, onError]);

  const titleOf = (b) => nodeTitle(b.id) ?? b.title ?? t('ui.bookmarksPanel.document_sters');
  const add = () => {
    if (!currentId || has(currentId)) return;
    onChange([...bookmarks, { id: currentId, title: nodeTitle(currentId) }]);
    setSel(currentId);
  };
  const remove = (id) => {
    onChange(bookmarks.filter((b) => b.id !== id));
    if (sel === id) setSel(null);
  };

  return (
    <div className="bookmarks-panel">
      <div className="row">
        <h4>{t('ui.bookmarksPanel.semne_de_carte')}</h4>
        <span className="spacer" />
        <button onClick={add} disabled={!currentId || has(currentId)} title={t('ui.bookmarksPanel.adauga_documentul_curent')}>+ Document curent</button>
      </div>
      {bookmarks.length === 0 && <p className="muted">{t('ui.bookmarksPanel.niciun_semn_de_carte_in')}</p>}
      <ul className="bookmark-list">
        {bookmarks.map((b) => (
          <li key={b.id} className={b.id === sel ? 'on' : ''}>
            <button className="link" onClick={() => setSel(b.id)} onDoubleClick={() => onOpen(b.id)} title={t('ui.bookmarksPanel.clic_previzualizare_dublu_clic_deschide')}>
              {titleOf(b)}
            </button>
            <button onClick={() => onOpen(b.id)} title={t('ui.bookmarksPanel.deschide_in_editor')} aria-label={t('ui.bookmarksPanel.deschide_x', { v0: titleOf(b) })}>↗</button>
            <button onClick={() => remove(b.id)} title={t('ui.bookmarksPanel.elimina_semnul_de_carte')} aria-label={t('ui.bookmarksPanel.elimina_x', { v0: titleOf(b) })}>×</button>
          </li>
        ))}
      </ul>
      {sel && (
        // Preview is the project's own stored HTML (written by our editor), shown read-only.
        <div className="bookmark-preview prose" dangerouslySetInnerHTML={{ __html: preview || t('ui.bookmarksPanel.p_class_muted_gol_p') }} />
      )}
    </div>
  );
}
