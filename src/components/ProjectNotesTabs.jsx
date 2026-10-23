import React, { useEffect, useState } from 'react';
import { Notes } from './Inspector.jsx';
import { LEGACY_NOTES_ID, addNoteTab, projectNoteTabs, removeNoteTab, renameNoteTab } from '../lib/projectNotes.js';
import { t as tr } from '../lib/i18n.js';

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
    const title = window.prompt(tr('ui.projectNotesTabs.titlul_filei_de_note'), tr('ui.projectNotesTabs.note_x', { v0: tabs.length + 1 }));
    if (title === null) return;
    const res = addNoteTab(tabs, title);
    onTabsChange(res.tabs);
    setActive(res.tab.id);
  };
  const rename = () => {
    const title = window.prompt(tr('ui.projectNotesTabs.titlul_filei'), cur.title);
    if (title) onTabsChange(renameNoteTab(tabs, cur.id, title));
  };
  const remove = () => {
    if (!window.confirm(tr('ui.projectNotesTabs.stergi_fila_x_si_notele', { title: cur.title }))) return;
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
        <button onClick={add} title={tr('ui.projectNotesTabs.fila_noua_de_note')} aria-label={tr('ui.projectNotesTabs.fila_noua')}>+</button>
      </div>
      {html !== null && <Notes key={cur.id} initial={html} onChange={(h) => onNoteChange(cur.id, h)} placeholder={tr('ui.inspector.note_pentru_tot_proiectul')} />}
      <div className="row">
        <button className="link" onClick={rename}>{tr('set.binderDbl.rename')}</button>
        <button className="link" onClick={remove} disabled={cur.id === LEGACY_NOTES_ID || tabs.length <= 1}>{tr('ui.projectNotesTabs.sterge_fila')}</button>
      </div>
    </div>
  );
}

