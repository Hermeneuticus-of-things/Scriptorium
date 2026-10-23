import React, { useState } from 'react';

const FORMATS = [
  ['docx', 'Word (.docx)'],
  ['rtf', 'RTF (.rtf)'],
  ['md', 'Markdown (.md)'],
  ['txt', 'Text simplu (.txt)'],
  ['html', 'Pagină web (.html)'],
];

function findParentFolder(tree, id) {
  let found = null;
  const visit = (nodes, parent) => {
    for (const n of nodes) {
      if (n.id === id) found = n.children ? n : parent;
      if (n.children) visit(n.children, n);
    }
  };
  visit(tree, null);
  return found;
}

export default function ExportDialog({ api, dir, project, selectionIds = [], onClose, onError }) {
  const [tab, setTab] = useState('docs');
  const [scope, setScope] = useState(selectionIds.length ? 'selection' : 'all');
  const [format, setFormat] = useState('docx');
  const [withNotes, setWithNotes] = useState(true);
  const [withSynopsis, setWithSynopsis] = useState(true);
  const [withMeta, setWithMeta] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const folder = selectionIds.length ? findParentFolder(project.tree, selectionIds[0]) : null;

  const run = async () => {
    setBusy(true);
    setDone('');
    try {
      if (tab === 'docs') {
        const ids = scope === 'selection' ? selectionIds : scope === 'folder' && folder ? [folder.id] : null;
        const res = await api.exportDocuments(dir, project, ids, { format, withNotes, withSynopsis, withMeta });
        if (res) setDone(`Au fost exportate ${res.count} documente în ${res.dir}.`);
      } else if (tab === 'opml') {
        const file = await api.exportOpml(dir, project);
        if (file) setDone(`Schița a fost salvată în ${file}.`);
      } else {
        const file = await api.exportCsv(dir, project);
        if (file) setDone(`Metadatele au fost salvate în ${file}.`);
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const tabBtn = (id, label) => (
    <button className={tab === id ? 'primary' : ''} aria-pressed={tab === id} onClick={() => { setTab(id); setDone(''); }}>
      {label}
    </button>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Exportă" onClick={(e) => e.stopPropagation()}>
        <h2>Exportă</h2>
        <div className="row">
          {tabBtn('docs', 'Documente')}
          {tabBtn('opml', 'OPML')}
          {tabBtn('csv', 'Metadate CSV')}
        </div>

        {tab === 'docs' && (
          <div className="fields">
            <p className="muted">Fiecare document devine un fișier separat; dosarele din Binder devin foldere.</p>
            <label>
              Ce se exportă
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="selection" disabled={!selectionIds.length}>Selecția ({selectionIds.length})</option>
                <option value="folder" disabled={!folder}>Dosarul curent{folder ? ` („${folder.title}”)` : ''}</option>
                <option value="all">Tot proiectul</option>
              </select>
            </label>
            <label>
              Format
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMATS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <div className="checks">
              <label className="check">
                <input type="checkbox" checked={withNotes} onChange={(e) => setWithNotes(e.target.checked)} /> Notele documentului (.notes.md)
              </label>
              <label className="check">
                <input type="checkbox" checked={withSynopsis} onChange={(e) => setWithSynopsis(e.target.checked)} /> Sinopsisul (.synopsis.txt)
              </label>
              <label className="check">
                <input type="checkbox" checked={withMeta} onChange={(e) => setWithMeta(e.target.checked)} /> Metadatele: etichetă, stare, cuvinte-cheie (.meta.json)
              </label>
            </div>
          </div>
        )}
        {tab === 'opml' && (
          <p className="muted">Exportă structura Binder-ului ca schiță OPML 2.0 (titluri, sinopsisuri, etichete și stări), pentru aplicații de outlining sau mind-mapping.</p>
        )}
        {tab === 'csv' && (
          <p className="muted">Exportă un tabel cu metadatele fiecărui element (etichetă, stare, cuvinte-cheie, număr de cuvinte, date și câmpuri personalizate), deschis direct în Excel sau LibreOffice.</p>
        )}

        {done && <p className="muted" role="status">{done}</p>}
        <div className="actions">
          <button onClick={onClose}>Închide</button>
          <button className="primary" disabled={busy} onClick={run}>{busy ? 'Se exportă…' : 'Exportă…'}</button>
        </div>
      </div>
    </div>
  );
}
