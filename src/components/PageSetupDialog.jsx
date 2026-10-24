import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';

const SIZES = [
  ['A4', 'A4 (210 × 297 mm)'],
  ['A5', 'A5 (148 × 210 mm)'],
  ['Letter', 'Letter (8,5 × 11 in)'],
  ['Legal', 'Legal (8,5 × 14 in)'],
  ['6x9', '6 × 9 in (152 × 229 mm)'],
];
export const DEFAULT_PAGE_SETUP = {
  size: 'A4',
  widthCm: 21,
  heightCm: 29.7,
  orientation: 'portrait',
  margins: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
  header: { left: '', center: '', right: '' },
  footer: { left: '', center: '<$p>', right: '' },
  differentFirstPage: false,
  fontFamily: 'Georgia',
  fontSizePt: 12,
  lineSpacing: 1.5,
};
const withDefaults = (v) => ({
  ...DEFAULT_PAGE_SETUP,
  ...(v || {}),
  margins: { ...DEFAULT_PAGE_SETUP.margins, ...(v?.margins || {}) },
  header: { ...DEFAULT_PAGE_SETUP.header, ...(v?.header || {}) },
  footer: { ...DEFAULT_PAGE_SETUP.footer, ...(v?.footer || {}) },
});

// File > Page Setup (Scrivener: File > Page Setup…): paper, orientation, margins and the running
// header/footer used by Print and Print Preview. Saved in the project (project.pageSetup) through
// onSave; Compile keeps its own page settings.
// onPreview(setup): opens Print Preview with the edited setup.
export default function PageSetupDialog({ api, project, onSave, onPreview, onClose, onError }) {
  const [s, setS] = useState(() => withDefaults(project?.pageSetup));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (project?.pageSetup) return;
    api.getPageSetup?.(project).then((v) => v && setS(withDefaults(v))).catch(onError);
  }, [api, project, onError]);
  const margin = (k) => (e) => setS((x) => ({ ...x, margins: { ...x.margins, [k]: Number(e.target.value) } }));
  const hf = (part, k) => (e) => setS((x) => ({ ...x, [part]: { ...x[part], [k]: e.target.value } }));

  const save = async () => {
    const clean = (await api.setPageSetup?.(s)) || s;
    await onSave?.(clean);
    return clean;
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
      <div className="modal" role="dialog" aria-label={t('ui.pageSetupDialog.configurare_pagina')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.pageSetupDialog.configurare_pagina')}</h2>
        <div className="row">
          <label>
            {t('ui.pageSetupDialog.hartie')}
            <select data-testid="page-size" value={s.size} onChange={(e) => setS({ ...s, size: e.target.value })}>
              {SIZES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
              <option value="custom">{t('ui.pageSetupDialog.personalizat')}</option>
            </select>
          </label>
          {s.size === 'custom' && (
            <>
              <label>
                {t('ui.pageSetupDialog.latime_cm')}
                <input type="number" min="5" max="100" step="0.1" value={s.widthCm} onChange={(e) => setS({ ...s, widthCm: Number(e.target.value) })} />
              </label>
              <label>
                {t('ui.pageSetupDialog.inaltime_cm')}
                <input type="number" min="5" max="100" step="0.1" value={s.heightCm} onChange={(e) => setS({ ...s, heightCm: Number(e.target.value) })} />
              </label>
            </>
          )}
          <label>
            {t('ui.pageSetupDialog.orientare')}
            <select data-testid="page-orientation" value={s.orientation} onChange={(e) => setS({ ...s, orientation: e.target.value })}>
              <option value="portrait">{t('ui.pageSetupDialog.portret')}</option>
              <option value="landscape">{t('ui.pageSetupDialog.peisaj')}</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend>{t('ui.pageSetupDialog.margini_cm')}</legend>
          <div className="row">
            {[['top', t('ui.compileDialog.sus')], ['bottom', t('ui.compileDialog.jos')], ['left', t('ui.compileDialog.stanga_2')], ['right', t('ui.compileDialog.dreapta')]].map(([k, l]) => (
              <label key={k}>
                {l}
                <input type="number" min="0" max="10" step="0.1" value={s.margins[k]} onChange={margin(k)} />
              </label>
            ))}
          </div>
        </fieldset>
        {[['header', t('ui.pageSetupDialog.antet')], ['footer', t('ui.pageSetupDialog.subsol')]].map(([part, legend]) => (
          <fieldset key={part}>
            <legend>{legend}</legend>
            <div className="row">
              {[['left', t('ui.compileDialog.stanga_2')], ['center', t('ui.pageSetupDialog.centru')], ['right', t('ui.compileDialog.dreapta')]].map(([k, l]) => (
                <label key={k} style={{ flex: 1, minWidth: 0 }}>
                  {l}
                  <input data-testid={`${part}-${k}`} value={s[part][k]} onChange={hf(part, k)} style={{ width: '100%', boxSizing: 'border-box' }} />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <p className="hint">{t('ui.pageSetupDialog.substituenti')}</p>
        <label className="check">
          <input type="checkbox" checked={s.differentFirstPage} onChange={(e) => setS({ ...s, differentFirstPage: e.target.checked })} />
          {t('ui.pageSetupDialog.fara_antet_prima_pagina')}
        </label>
        <div className="row">
          <label>
            Font
            <input value={s.fontFamily} onChange={(e) => setS({ ...s, fontFamily: e.target.value })} />
          </label>
          <label>
            {t('ui.compileDialog.marime_pt')}
            <input type="number" min="6" max="48" value={s.fontSizePt} onChange={(e) => setS({ ...s, fontSizePt: Number(e.target.value) })} />
          </label>
          <label>
            {t('ui.compileDialog.spatiere_randuri')}
            <input type="number" min="1" max="3" step="0.1" value={s.lineSpacing} onChange={(e) => setS({ ...s, lineSpacing: Number(e.target.value) })} />
          </label>
        </div>
        <div className="actions">
          <button onClick={onClose}>{t('btn.close')}</button>
          {api.printPreview && onPreview && (
            <button disabled={busy} onClick={run(async () => { const clean = await save(); onPreview(clean); })}>
              {t('cmd.printPreview')}
            </button>
          )}
          <button className="primary" disabled={busy} onClick={run(async () => { await save(); onClose(); })}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
