import React, { useEffect, useState } from 'react';
import { Notes } from './Inspector.jsx';
import { LEGACY_NOTES_ID, addNoteTab, projectNoteTabs, removeNoteTab, renameNoteTab } from '../lib/projectNotes.js';

// Project notes with tabs. Props:
//   tabs           project.projectNotes (may be undefined for old projects)
//   readNote(id)   -> Promise<html|string> (e.g. api.readDoc(dir, id, 'notes'))
//   onNoteChange(id, html)  save one tab's text (e.g. queueWrite(id, 'notes', html))
//   onTabsChange(tabs)      save the tab list (project.projectNotes)
//   onRemoveNote?(id)       optional cleanup of notes/<id>.html
export default function ProjectNotesTabs({ tabs: rawTabs, readNote, onNoteChange, onTabsChange, onRemoveNote, onError }) {
  const tabs = projectNoteTabs({ projectNotes: rawTabs });
  const [active, setActive] = useState(tabs[0].id);
  const [html, setHtml] = useState(null);
  const cur = tabs.find((t) => t.id === active) || tabs[0];

  useEffect(() => {
    let alive = true;
    setHtml(null);
    Promise.resolve(readNote(cur.id))
      .then((h) => alive && setHtml(h || ''))
      .catch((e) => onError?.(e));
    return () => {
      alive = false;
    };
  }, [cur.id, readNote, onError]);

  const add = () => {
    const title = window.prompt('Titlul filei de note:', `Note ${tabs.length + 1}`);
    if (title === null) return;
    const res = addNoteTab(tabs, title);
    onTabsChange(res.tabs);
    setActive(res.tab.id);
  };
  const rename = () => {
    const title = window.prompt('Titlul filei:', cur.title);
    if (title) onTabsChange(renameNoteTab(tabs, cur.id, title));
  };
  const remove = () => {
    if (!window.confirm(`Ștergi fila „${cur.title}” și notele ei?`)) return;
    onTabsChange(removeNoteTab(tabs, cur.id));
    onRemoveNote?.(cur.id);
    setActive(tabs[0].id);
  };

  return (
    <div className="project-notes-tabs">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === cur.id} className={t.id === cur.id ? 'on' : ''} onClick={() => setActive(t.id)} onDoubleClick={rename}>
            {t.title}
          </button>
        ))}
        <button onClick={add} title="Filă nouă de note" aria-label="Filă nouă">+</button>
      </div>
      {html !== null && <Notes key={cur.id} initial={html} onChange={(h) => onNoteChange(cur.id, h)} placeholder="Note pentru tot proiectul…" />}
      <div className="row">
        <button className="link" onClick={rename}>Redenumește</button>
        <button className="link" onClick={remove} disabled={cur.id === LEGACY_NOTES_ID || tabs.length <= 1}>Șterge fila</button>
      </div>
    </div>
  );
}

