import React, { useState } from 'react';

const FORMATS = [
  ['docx', 'Word (.docx) — pentru editor'],
  ['pdf', 'PDF (A5) — pentru tipar/citire'],
  ['epub', 'EPUB — e-book'],
  ['html', 'HTML — pagină web'],
];

export default function CompileDialog({ api, dir, project, onProjectChange, onClose, onError }) {
  const [format, setFormat] = useState('docx');
  const [opts, setOpts] = useState({ folderHeadings: true, documentTitles: false, separator: '* * *', fontFamily: 'Georgia', fontSizePt: 12 });
  const [author, setAuthor] = useState(project.author || '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const run = async () => {
    setBusy(true);
    setDone('');
    try {
      const next = author !== project.author ? { ...project, author } : project;
      if (next !== project) onProjectChange(next);
      const file = await api.exportCompiled(dir, next, format, opts);
      if (file) setDone(file);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setOpts((o) => ({ ...o, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Compilează" onClick={(e) => e.stopPropagation()}>
        <h2>Compilează manuscrisul</h2>
        <p className="muted">Se includ documentele din „{project.tree[0].title}” marcate „Include în Compile”, în ordinea din binder.</p>
        <label>
          Format
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Autor
          <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={opts.folderHeadings} onChange={set('folderHeadings')} /> Dosarele devin titluri de capitol
        </label>
        <label className="check">
          <input type="checkbox" checked={opts.documentTitles} onChange={set('documentTitles')} /> Titlurile documentelor apar în text
        </label>
        <label>
          Separator între scene
          <input value={opts.separator} onChange={set('separator')} />
        </label>
        <div className="row">
          <label>
            Font
            <select value={opts.fontFamily} onChange={set('fontFamily')}>
              {['Georgia', 'Times New Roman', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Arial'].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label>
            Mărime (pt)
            <input type="number" min="8" max="20" value={opts.fontSizePt} onChange={(e) => setOpts((o) => ({ ...o, fontSizePt: Number(e.target.value) || 12 }))} />
          </label>
        </div>
        {done && <p className="ok">Salvat: {done}</p>}
        <div className="actions">
          <button onClick={onClose}>Închide</button>
          <button className="primary" disabled={busy} onClick={run}>{busy ? 'Se compilează…' : 'Compilează'}</button>
        </div>
      </div>
    </div>
  );
}
