import React, { useEffect, useMemo, useState } from 'react';
import { t } from '../lib/i18n.js';

const ZOOMS = ['page-fit', 'page-width', 50, 75, 100, 125, 150, 200];

// File > Print Preview: the current document / selected binder documents rendered by the main
// process with the Page Setup (printToPDF), shown in Chromium's PDF viewer, with page navigation,
// zoom, page count and the Print / Save PDF buttons.
// options: { ids, pageSetup? } passed to api.printPreview.
export default function PrintPreviewDialog({ api, dir, project, options, onClose, onError }) {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(true);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState('page-fit');

  useEffect(() => {
    let alive = true;
    setBusy(true);
    api
      .printPreview(dir, project, options || {})
      .then((r) => alive && setRes(r))
      .catch((e) => alive && onError(e))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [api, dir, project, options, onError]);

  const blobUrl = useMemo(() => (res?.data ? URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })) : ''), [res]);
  useEffect(() => () => blobUrl && URL.revokeObjectURL(blobUrl), [blobUrl]);
  const count = res?.pageCount || 0;
  const src = blobUrl ? `${blobUrl}#page=${page}&zoom=${zoom}` : '';
  const sizeLabel = res?.pageSize ? `${(res.pageSize.width / 72 * 2.54).toFixed(1)} × ${(res.pageSize.height / 72 * 2.54).toFixed(1)} cm` : '';

  const act = (fn) => async () => {
    try {
      await fn();
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal print-preview" role="dialog" aria-label={t('cmd.printPreview')} onClick={(e) => e.stopPropagation()} style={{ width: 'min(1000px, 94vw)', maxWidth: '94vw' }}>
        <h2>{t('cmd.printPreview')}</h2>
        <div className="row" style={{ alignItems: 'center', gap: 12 }}>
          <label>
            {t('ui.printPreview.pagina')}
            <input type="number" min="1" max={Math.max(1, count)} value={page} onChange={(e) => setPage(Math.min(Math.max(1, Number(e.target.value) || 1), Math.max(1, count)))} style={{ width: 64 }} />
          </label>
          <span data-testid="print-preview-count">{t('ui.printPreview.din_x_pagini', { n: count })}</span>
          <label>
            {t('ui.printPreview.zoom')}
            <select value={zoom} onChange={(e) => setZoom(e.target.value)}>
              {ZOOMS.map((z) => (
                <option key={z} value={z}>{z === 'page-fit' ? t('ui.printPreview.pagina_intreaga') : z === 'page-width' ? t('ui.printPreview.latimea_paginii') : `${z}%`}</option>
              ))}
            </select>
          </label>
          {sizeLabel && <span className="muted">{sizeLabel}</span>}
        </div>
        <div style={{ height: '70vh', marginTop: 8, background: 'var(--panel, #ddd)' }}>
          {busy && <p>{t('ui.printPreview.se_genereaza')}</p>}
          {src && <iframe key={src} title={t('cmd.printPreview')} src={src} style={{ width: '100%', height: '100%', border: 0 }} />}
        </div>
        <div className="actions">
          <button onClick={onClose}>{t('btn.close')}</button>
          {api.savePrintPdf && (
            <button disabled={!res?.token} onClick={act(() => api.savePrintPdf(res.token))}>{t('ui.printPreview.salveaza_pdf')}</button>
          )}
          {api.printDocuments && (
            <button className="primary" disabled={!res} onClick={act(() => api.printDocuments(dir, project, options || {}))}>{t('ui.printPreview.tipareste')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
