import React, { useEffect, useMemo, useState } from 'react';
import { t } from '../lib/i18n.js';

const ZOOMS = ['page-fit', 'page-width', 50, 75, 100, 125, 150, 200];
export const PRINT_VIEWS = ['document', 'cards', 'outline'];
export const OUTLINE_COLUMNS = ['title', 'synopsis', 'label', 'status', 'keywords', 'words', 'target', 'modified', 'created', 'sectionType', 'includeInCompile'];
const VIEW_DEFAULTS = {
  document: { titles: true, synopsis: false, notes: false, metadata: false },
  cards: { layout: 'grid', perPage: 4, borders: true, labelColors: true, cutLines: true, titles: true, synopsis: true },
  outline: { columns: ['title', 'synopsis', 'label', 'status', 'words'], indent: true },
};

/** The print settings with every field present (the main process normalizes them again). */
export function withPrintDefaults(setup = {}) {
  const v = setup.views || {};
  return {
    scale: 100,
    mirrorMargins: false,
    hfFontFamily: '',
    hfFontSizePt: 10,
    headerDistanceCm: 0,
    footerDistanceCm: 0,
    printer: '',
    copies: 1,
    ...setup,
    views: {
      document: { ...VIEW_DEFAULTS.document, ...(v.document || {}) },
      cards: { ...VIEW_DEFAULTS.cards, ...(v.cards || {}) },
      outline: { ...VIEW_DEFAULTS.outline, ...(v.outline || {}) },
    },
  };
}

// File > Print Preview: the current document / selected binder documents rendered by the main
// process with the Page Setup (printToPDF), shown in Chromium's PDF viewer, with page navigation,
// zoom, page count and the Print / Save PDF buttons. The side panel holds the print settings:
// what is printed (document / corkboard cards / outline) and how (per view), scale, mirrored
// margins, header/footer font and distance, printer and copies.
// options: { ids, pageSetup?, view? } passed to api.printPreview.
export default function PrintPreviewDialog({ api, dir, project, options, onClose, onError, onSaveSetup }) {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(true);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState('page-fit');
  const [view, setView] = useState(PRINT_VIEWS.includes(options?.view) ? options.view : 'document');
  const [setup, setSetup] = useState(() => (options?.pageSetup || project?.pageSetup ? withPrintDefaults(options?.pageSetup || project.pageSetup) : null));
  const [printers, setPrinters] = useState([]);
  const [debounced, setDebounced] = useState(null); // the edited setup, once the author changes something
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.listPrinters?.().then((l) => setPrinters(l || [])).catch(() => {});
  }, [api]);
  useEffect(() => {
    if (!dirty) return undefined;
    const id = setTimeout(() => setDebounced(setup), 400);
    return () => clearTimeout(id);
  }, [setup, dirty]);

  const runOptions = useMemo(() => ({ ...(options || {}), view, ...(debounced ? { pageSetup: debounced } : {}) }), [options, view, debounced]);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    api
      .printPreview(dir, project, runOptions)
      .then((r) => {
        if (!alive) return;
        setRes(r);
        if (r?.setup) setSetup((s) => s || withPrintDefaults(r.setup));
      })
      .catch((e) => alive && onError(e))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [api, dir, project, runOptions, onError]);

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
  const s = setup ? withPrintDefaults(setup) : null;
  const set = (patch) => {
    setDirty(true);
    setSetup((x) => ({ ...withPrintDefaults(x || {}), ...patch }));
  };
  const setView1 = (k, patch) => (setDirty(true), setSetup((x) => {
    const w = withPrintDefaults(x || {});
    return { ...w, views: { ...w.views, [k]: { ...w.views[k], ...patch } } };
  }));
  const numIn = (label, value, onChange, attrs = {}) => (
    <label>
      {label}
      <input type="number" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: 64 }} {...attrs} />
    </label>
  );
  const check = (label, checked, onChange) => (
    <label className="check">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal print-preview" role="dialog" aria-label={t('cmd.printPreview')} onClick={(e) => e.stopPropagation()} style={{ width: 'min(1200px, 96vw)', maxWidth: '96vw' }}>
        <h2>{t('cmd.printPreview')}</h2>
        <div className="row" style={{ alignItems: 'center', gap: 12 }}>
          <label>
            {t('ui.p12.ceSeTipareste')}
            <select value={view} onChange={(e) => setView(e.target.value)} aria-label={t('ui.p12.ceSeTipareste')}>
              {PRINT_VIEWS.map((v) => <option key={v} value={v}>{t(`ui.p12.view_${v}`)}</option>)}
            </select>
          </label>
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
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <div style={{ flex: 1, height: '70vh', background: 'var(--panel, #ddd)' }}>
            {busy && <p>{t('ui.printPreview.se_genereaza')}</p>}
            {src && <iframe key={src} title={t('cmd.printPreview')} src={src} style={{ width: '100%', height: '100%', border: 0 }} />}
          </div>
          {s && (
            <aside className="print-settings fields" aria-label={t('ui.p12.setariTiparire')} style={{ width: 280, maxHeight: '70vh', overflow: 'auto' }}>
              <fieldset>
                <legend>{t(`ui.p12.view_${view}`)}</legend>
                {view === 'document' && (
                  <>
                    {check(t('ui.p12.titluri'), s.views.document.titles, (v) => setView1('document', { titles: v }))}
                    {check(t('ui.p12.sinopsis'), s.views.document.synopsis, (v) => setView1('document', { synopsis: v }))}
                    {check(t('ui.p12.notite'), s.views.document.notes, (v) => setView1('document', { notes: v }))}
                    {check(t('ui.p12.metadate'), s.views.document.metadata, (v) => setView1('document', { metadata: v }))}
                  </>
                )}
                {view === 'cards' && (
                  <>
                    <label>
                      {t('ui.p12.fise')}
                      <select value={s.views.cards.layout} onChange={(e) => setView1('cards', { layout: e.target.value })}>
                        <option value="grid">{t('ui.p12.fisePePagina')}</option>
                        <option value="3x5">{t('ui.p12.fisa3x5')}</option>
                        <option value="4x6">{t('ui.p12.fisa4x6')}</option>
                      </select>
                    </label>
                    {s.views.cards.layout === 'grid' && numIn(t('ui.p12.fisePePaginaNr'), s.views.cards.perPage, (v) => setView1('cards', { perPage: v }), { min: 1, max: 12 })}
                    {check(t('ui.p12.titluri'), s.views.cards.titles, (v) => setView1('cards', { titles: v }))}
                    {check(t('ui.p12.sinopsis'), s.views.cards.synopsis, (v) => setView1('cards', { synopsis: v }))}
                    {check(t('ui.p12.chenare'), s.views.cards.borders, (v) => setView1('cards', { borders: v }))}
                    {check(t('ui.p12.culoriEticheta'), s.views.cards.labelColors, (v) => setView1('cards', { labelColors: v }))}
                    {check(t('ui.p12.liniiTaiere'), s.views.cards.cutLines, (v) => setView1('cards', { cutLines: v }))}
                  </>
                )}
                {view === 'outline' && (
                  <>
                    {OUTLINE_COLUMNS.map((c) => check(t(`ui.p12.ocol_${c}`), s.views.outline.columns.includes(c), (v) => setView1('outline', { columns: v ? [...s.views.outline.columns, c] : s.views.outline.columns.filter((x) => x !== c) })))}
                    {check(t('ui.p12.indentNivel'), s.views.outline.indent, (v) => setView1('outline', { indent: v }))}
                  </>
                )}
              </fieldset>
              <fieldset>
                <legend>{t('ui.p12.pagina')}</legend>
                {numIn(t('ui.p12.scalare'), s.scale, (v) => set({ scale: v }), { min: 10, max: 200, step: 5 })}
                {check(t('ui.p12.marginiOglinda'), s.mirrorMargins, (v) => set({ mirrorMargins: v }))}
              </fieldset>
              <fieldset>
                <legend>{t('ui.p12.antetSubsol')}</legend>
                <label>
                  {t('ui.p12.font')}
                  <input value={s.hfFontFamily} placeholder={s.fontFamily || 'Georgia'} onChange={(e) => set({ hfFontFamily: e.target.value })} />
                </label>
                {numIn(t('ui.p12.marime'), s.hfFontSizePt, (v) => set({ hfFontSizePt: v }), { min: 6, max: 36 })}
                {numIn(t('ui.p12.distantaAntet'), s.headerDistanceCm, (v) => set({ headerDistanceCm: v }), { min: 0, max: 5, step: 0.1 })}
                {numIn(t('ui.p12.distantaSubsol'), s.footerDistanceCm, (v) => set({ footerDistanceCm: v }), { min: 0, max: 5, step: 0.1 })}
              </fieldset>
              <fieldset>
                <legend>{t('ui.p12.imprimanta')}</legend>
                <select value={s.printer} onChange={(e) => set({ printer: e.target.value })} aria-label={t('ui.p12.imprimanta')}>
                  <option value="">{t('ui.p12.imprimantaImplicita')}</option>
                  {printers.map((p) => <option key={p.name} value={p.name}>{p.displayName}{p.isDefault ? ' ★' : ''}</option>)}
                </select>
                {numIn(t('ui.p12.copii'), s.copies, (v) => set({ copies: v }), { min: 1, max: 99 })}
                <p className="muted small">{t('ui.p12.tavaInfo')}</p>
              </fieldset>
              {onSaveSetup && <button onClick={() => onSaveSetup(s)}>{t('ui.p12.pastreazaSetarile')}</button>}
            </aside>
          )}
        </div>
        <div className="actions">
          <button onClick={onClose}>{t('btn.close')}</button>
          {api.savePrintPdf && (
            <button disabled={!res?.token} onClick={act(() => api.savePrintPdf(res.token))}>{t('ui.printPreview.salveaza_pdf')}</button>
          )}
          {api.printDocuments && (
            <button className="primary" disabled={!res} onClick={act(() => api.printDocuments(dir, project, runOptions))}>{t('ui.printPreview.tipareste')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
