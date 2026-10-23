import React, { useEffect, useState } from 'react';

const SIZES = [
  ['A4', 'A4 (210 × 297 mm)'],
  ['A5', 'A5 (148 × 210 mm)'],
  ['Letter', 'Letter (8,5 × 11 in)'],
  ['Legal', 'Legal (8,5 × 14 in)'],
];
const DEFAULT = { size: 'A4', orientation: 'portrait', margins: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 }, fontFamily: 'Georgia', fontSizePt: 12, lineSpacing: 1.5 };

// File > Page Setup: paper and margins used by Print and Print Preview (Compile keeps its own page settings).
// previewIds: documents for the "Previzualizare" button (current document / selection).
export default function PageSetupDialog({ api, dir, project, previewIds = [], onClose, onError }) {
  const [s, setS] = useState(DEFAULT);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.getPageSetup?.().then((v) => v && setS(v)).catch(onError);
  }, [api, onError]);
  const margin = (k) => (e) => setS((x) => ({ ...x, margins: { ...x.margins, [k]: Number(e.target.value) } }));

  const save = async () => {
    await api.setPageSetup(s);
  };
  const run = (fn) => async () => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Configurare pagină" onClick={(e) => e.stopPropagation()}>
        <h2>Configurare pagină</h2>
        <div className="row">
          <label>
            Hârtie
            <select value={s.size} onChange={(e) => setS({ ...s, size: e.target.value })}>
              {SIZES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Orientare
            <select value={s.orientation} onChange={(e) => setS({ ...s, orientation: e.target.value })}>
              <option value="portrait">Portret</option>
              <option value="landscape">Peisaj</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Margini (cm)</legend>
          <div className="row">
            {[['top', 'Sus'], ['bottom', 'Jos'], ['left', 'Stânga'], ['right', 'Dreapta']].map(([k, l]) => (
              <label key={k}>
                {l}
                <input type="number" min="0" max="10" step="0.1" value={s.margins[k]} onChange={margin(k)} />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <label>
            Font
            <input value={s.fontFamily} onChange={(e) => setS({ ...s, fontFamily: e.target.value })} />
          </label>
          <label>
            Mărime (pt)
            <input type="number" min="6" max="48" value={s.fontSizePt} onChange={(e) => setS({ ...s, fontSizePt: Number(e.target.value) })} />
          </label>
          <label>
            Spațiere rânduri
            <input type="number" min="1" max="3" step="0.1" value={s.lineSpacing} onChange={(e) => setS({ ...s, lineSpacing: Number(e.target.value) })} />
          </label>
        </div>
        <div className="actions">
          <button onClick={onClose}>Închide</button>
          {api.printPreview && dir && (
            <button disabled={busy} onClick={run(async () => { await save(); await api.printPreview(dir, project, { ids: previewIds }); })}>
              Previzualizare tipărire
            </button>
          )}
          <button className="primary" disabled={busy} onClick={run(async () => { await save(); onClose(); })}>Salvează</button>
        </div>
      </div>
    </div>
  );
}
