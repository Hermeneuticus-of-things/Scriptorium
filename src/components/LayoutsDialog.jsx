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
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <button className="ly-import" onClick={() => fileRef.current?.click()}>{t('ui.p11.ly_import')}</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile} />
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
