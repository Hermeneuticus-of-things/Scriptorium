import React, { useEffect, useState } from 'react';
import { sanitizeHtml } from '../lib/sanitize.js';
import { t } from '../lib/i18n.js';
import { moveTo } from '../lib/projectSettings.js';

// Project bookmarks with preview (Scrivener: Project Bookmarks).
// Props:
//   bookmarks   project.bookmarks = [{ id, title? } | { file, title } | { url, title? }]
//               (id = binder node id, file = a file on disk, url = a web address)
//   nodeTitle(id) -> current title from the binder (or undefined if deleted)
//   readDoc(id)   -> Promise<html> for the preview
//   currentId     id of the document in the editor (for "Adaugă documentul curent")
//   onChange(bookmarks), onOpen(id)
//   chooseFile()  -> Promise<{path,name}|null>; openFile(path); openUrl(url)  (optional)
const keyOf = (b) => (b.id ? `d:${b.id}` : b.file ? `f:${b.file}` : `u:${b.url}`);

export default function BookmarksPanel({ bookmarks = [], nodeTitle = () => undefined, readDoc, currentId, onChange, onOpen, onError, chooseFile, openFile, openUrl }) {
  const [sel, setSel] = useState(bookmarks.find((b) => b.id)?.id || null);
  const [preview, setPreview] = useState('');
  const [dragFrom, setDragFrom] = useState(null);
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

  const titleOf = (b) => {
    if (b.file) return b.title || b.file.split(/[\\/]/).pop();
    if (b.url) return b.title || b.url;
    return nodeTitle(b.id) ?? b.title ?? t('ui.bookmarksPanel.document_sters');
  };
  const add = () => {
    if (!currentId || has(currentId)) return;
    onChange([...bookmarks, { id: currentId, title: nodeTitle(currentId) }]);
    setSel(currentId);
  };
  const addFile = async () => {
    try {
      const f = await chooseFile();
      if (f?.path && !bookmarks.some((b) => b.file === f.path)) onChange([...bookmarks, { file: f.path, title: f.name }]);
    } catch (e) {
      onError?.(e);
    }
  };
  const addUrl = () => {
    const url = window.prompt(t('ui.inspector.adresa_web'), 'https://');
    if (url && /^https?:\/\//.test(url) && !bookmarks.some((b) => b.url === url)) onChange([...bookmarks, { url }]);
  };
  const remove = (b) => {
    onChange(bookmarks.filter((x) => keyOf(x) !== keyOf(b)));
    if (b.id && sel === b.id) setSel(null);
  };
  const open = (b) => {
    if (b.id) onOpen(b.id);
    else if (b.file) Promise.resolve(openFile?.(b.file)).catch((e) => onError?.(e));
    else if (b.url) (openUrl ? Promise.resolve(openUrl(b.url)).catch((e) => onError?.(e)) : window.open(b.url, '_blank', 'noopener'));
  };

  return (
    <div className="bookmarks-panel">
      <div className="row">
        <h4>{t('ui.bookmarksPanel.semne_de_carte')}</h4>
        <span className="spacer" />
        <button onClick={add} disabled={!currentId || has(currentId)} title={t('ui.bookmarksPanel.adauga_documentul_curent')}>+ {t('ui.bookmarksPanel.document_curent')}</button>
        {chooseFile && <button className="bm-add-file" onClick={addFile}>{t('ui.inspector.fisier_extern')}</button>}
        <button className="bm-add-url" onClick={addUrl}>{t('ui.inspector.link_web')}</button>
      </div>
      {bookmarks.length === 0 && <p className="muted">{t('ui.bookmarksPanel.niciun_semn_de_carte_in')}</p>}
      <ul className="bookmark-list">
        {bookmarks.map((b, i) => (
          <li
            key={keyOf(b)}
            className={`${b.id && b.id === sel ? 'on' : ''} ${dragFrom === i ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => dragFrom != null && e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (dragFrom != null) onChange(moveTo(bookmarks, dragFrom, i)); setDragFrom(null); }}
            onDragEnd={() => setDragFrom(null)}
          >
            <button
              className={`link ${b.file ? 'bm-file' : b.url ? 'bm-url' : ''}`}
              onClick={() => (b.id ? setSel(b.id) : open(b))}
              onDoubleClick={() => b.id && onOpen(b.id)}
              title={b.file || b.url || t('ui.bookmarksPanel.clic_previzualizare_dublu_clic_deschide')}
            >
              {b.file ? '📎 ' : b.url ? '🌐 ' : ''}{titleOf(b)}
            </button>
            <button onClick={() => open(b)} title={t('ui.bookmarksPanel.deschide_in_editor')} aria-label={t('ui.bookmarksPanel.deschide_x', { v0: titleOf(b) })}>↗</button>
            <button onClick={() => remove(b)} title={t('ui.bookmarksPanel.elimina_semnul_de_carte')} aria-label={t('ui.bookmarksPanel.elimina_x', { v0: titleOf(b) })}>×</button>
          </li>
        ))}
      </ul>
      {bookmarks.length > 1 && <p className="muted small">{t('ui.inspector.bm_trage')}</p>}
      {sel && (
        // Preview is the project's own stored HTML (written by our editor), shown read-only.
        <div className="bookmark-preview prose" dangerouslySetInnerHTML={{ __html: preview ? sanitizeHtml(preview) : t('ui.bookmarksPanel.p_class_muted_gol_p') }} />
      )}
    </div>
  );
}
