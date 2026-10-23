import React, { useState } from 'react';

export default function ImportDialog({ api, target, onImported, onClose, onError }) {
  const [mode, setMode] = useState('h1');
  const [separator, setSeparator] = useState('#');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const parts = await api.importFile(mode, separator);
      if (parts && parts.length) {
        onImported(parts);
        onClose();
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Importă text" onClick={(e) => e.stopPropagation()}>
        <h2>Importă Word, text sau Markdown</h2>
        <p className="muted">Documentele noi se adaugă lângă „{target}”. Formate: .docx, .txt, .md.</p>
        <label>
          Împarte în documente
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="none">Nu împărți (un document pe fișier)</option>
            <option value="h1">La fiecare Titlu 1 (capitole)</option>
            <option value="h2">La fiecare Titlu 1 și Titlu 2</option>
            <option value="separator">La un rând-separator</option>
          </select>
        </label>
        {mode === 'separator' && (
          <label>
            Separator (rândul întreg)
            <input value={separator} onChange={(e) => setSeparator(e.target.value)} />
          </label>
        )}
        <div className="actions">
          <button onClick={onClose}>Anulează</button>
          <button className="primary" disabled={busy} onClick={run}>{busy ? 'Se importă…' : 'Alege fișiere…'}</button>
        </div>
      </div>
    </div>
  );
}
