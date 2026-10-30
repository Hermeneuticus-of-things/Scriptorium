<<<<<<< ours
// Window > Layouts > Manage: rename, apply, delete, export to a file, import from a file,
// with a schematic thumbnail of each layout (binder, main view, split, side panel).
import React, { useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { layoutThumbnail, layoutToFile, layoutFromFile, upsertLayout } from '../lib/layouts.js';

const FILL = { binder: '#9fb3c8', editor: '#f4f1e8', split: '#e6e0cf', corkboard: '#d9b98c', outliner: '#cfd8e3', inspector: '#b8c7b0', ai: '#c9b8de', editorial: '#e3c3b4' };

export function LayoutThumb({ layout }) {
  return (
    <svg className="layout-thumb" viewBox="0 0 100 60" width="70" height="42" role="img" aria-label={t('ui.p11.ly_thumb', { name: layout.name })}>
      {layoutThumbnail(layout).map((r, i) => (
        <rect key={i} data-kind={r.kind} x={r.x + 0.5} y={r.y + 0.5} width={Math.max(0, r.w - 1)} height={Math.max(0, r.h - 1)} fill={FILL[r.kind] || '#ddd'} stroke="#666" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

export default function LayoutsDialog({ layouts, onChange, onApply, onError, onClose }) {
  const [names, setNames] = useState(() => layouts.map((l) => l.name));
  const fileRef = useRef(null);
  const exportOne = (l) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([layoutToFile(l)], { type: 'application/json' }));
    a.download = `${l.name.replace(/[\\/:*?"<>|]/g, '') || 'layout'}.scribner-layout.json`;
    a.click();
  };
  const importFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const l = layoutFromFile(await f.text());
      const next = upsertLayout(layouts, l);
      setNames(next.map((x) => x.name));
      onChange(next);
    } catch {
      onError?.(new Error(t('ui.p11.ly_bad_file')));
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal layouts-dialog" role="dialog" aria-label={t('ui.batchADialogs.gestioneaza_layout_urile')} onClick={(e) => e.stopPropagation()}>
        <h3>{t('ui.p11.ly_title')}</h3>
        {layouts.length === 0 && <p className="muted">{t('ui.batchADialogs.niciun_layout_salvat')}</p>}
        <ul className="layout-list">
          {layouts.map((l, i) => (
            <li key={`${l.name}-${i}`} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <LayoutThumb layout={l} />
              <input
                aria-label={t('ui.p11.ly_name')}
                value={names[i] ?? ''}
                onChange={(e) => setNames((n) => n.map((x, k) => (k === i ? e.target.value : x)))}
                onBlur={() => {
                  const name = (names[i] || '').trim();
                  if (name && name !== l.name) onChange(layouts.map((x, k) => (k === i ? { ...x, name } : x)));
                }}
              />
              <button onClick={() => onApply(l)}>{t('btn.apply')}</button>
              <button className="ly-export" onClick={() => exportOne(l)}>{t('ui.p11.ly_export')}</button>
              <button
                onClick={() => {
                  setNames((n) => n.filter((_x, k) => k !== i));
                  onChange(layouts.filter((_x, k) => k !== i));
                }}
              >
                {t('btn.delete')}
              </button>
=======
import React from 'react';
import { t as tr, has } from '../lib/i18n.js';
import { nextLayoutName, summaryOf } from '../lib/layouts.js';

// Saved window arrangements (Scrivener 3 §12.3): save the current layout under a name,
// then apply / rename / delete saved ones. Stored at application level (settings.layouts),
// so every layout is offered in every project. App supplies the current state as snapshot()
// and applies a payload back through apply().
const CSS = `
.layouts-list { list-style: none; margin: 10px 0; padding: 0; max-height: 50vh; overflow: auto; }
.layouts-list li { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px solid var(--line); }
.layouts-info { flex: 1; min-width: 0; }
.layouts-info strong { display: block; font-weight: 600; }
.layouts-info small { color: var(--muted); }
`;

const sumPart = (token) => (has(`ui.layouts.sum.${token}`) ? tr(`ui.layouts.sum.${token}`) : token);

export default function LayoutsDialog({ layouts, snapshot, apply, onChange, onClose }) {
  const saveCurrent = () => {
    const name = window.prompt(tr('ui.layouts.namePrompt'), nextLayoutName(layouts, tr('ui.layouts.defaultName')));
    if (!name || !name.trim()) return;
    onChange([...layouts, { name: name.trim(), payload: snapshot() }]);
  };
  const rename = (entry) => {
    const name = window.prompt(tr('ui.layouts.namePrompt'), entry.name);
    if (!name || !name.trim() || name.trim() === entry.name) return;
    if (layouts.some((l) => l.name === name.trim())) return;
    onChange(layouts.map((l) => (l === entry ? { ...l, name: name.trim() } : l)));
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={tr('ui.layouts.title')} onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>{tr('ui.layouts.title')}</h2>
        {layouts.length === 0 && <p className="muted">{tr('ui.layouts.empty')}</p>}
        <ul className="layouts-list">
          {layouts.map((l) => (
            <li key={l.name}>
              <span className="layouts-info">
                <strong>{l.name}</strong>
                <small>{summaryOf(l.payload).map(sumPart).join(' · ')}</small>
              </span>
              <button onClick={() => apply(l.payload)}>{tr('ui.layouts.apply')}</button>
              <button onClick={() => rename(l)}>{tr('ui.layouts.rename')}</button>
              <button onClick={() => onChange(layouts.filter((x) => x !== l))}>{tr('ui.layouts.delete')}</button>
>>>>>>> theirs
            </li>
          ))}
        </ul>
        <div className="row-actions">
<<<<<<< ours
          <button className="ly-import" onClick={() => fileRef.current?.click()}>{t('ui.p11.ly_import')}</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile} />
          <button onClick={onClose}>{t('btn.close')}</button>
=======
          <button onClick={onClose}>{tr('btn.close')}</button>
          <button className="primary" onClick={saveCurrent}>{tr('ui.layouts.saveCurrent')}</button>
>>>>>>> theirs
        </div>
      </div>
    </div>
  );
}
