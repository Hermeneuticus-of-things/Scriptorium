import React, { useEffect, useState } from 'react';

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

  const titleOf = (b) => nodeTitle(b.id) ?? b.title ?? '(document șters)';
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
        <h4>Semne de carte</h4>
        <span className="spacer" />
        <button onClick={add} disabled={!currentId || has(currentId)} title="Adaugă documentul curent">+ Document curent</button>
      </div>
      {bookmarks.length === 0 && <p className="muted">Niciun semn de carte în proiect.</p>}
      <ul className="bookmark-list">
        {bookmarks.map((b) => (
          <li key={b.id} className={b.id === sel ? 'on' : ''}>
            <button className="link" onClick={() => setSel(b.id)} onDoubleClick={() => onOpen(b.id)} title="Clic: previzualizare · dublu-clic: deschide">
              {titleOf(b)}
            </button>
            <button onClick={() => onOpen(b.id)} title="Deschide în editor" aria-label={`Deschide ${titleOf(b)}`}>↗</button>
            <button onClick={() => remove(b.id)} title="Elimină semnul de carte" aria-label={`Elimină ${titleOf(b)}`}>×</button>
          </li>
        ))}
      </ul>
      {sel && (
        // Preview is the project's own stored HTML (written by our editor), shown read-only.
        <div className="bookmark-preview prose" dangerouslySetInnerHTML={{ __html: preview || '<p class="muted">(gol)</p>' }} />
      )}
    </div>
  );
}
