import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { pdfViewUrl, stepZoom, addAnnotation, removeAnnotation, annotationsHtml } from '../lib/researchMedia.js';

// PDF in the editor pane: the built-in viewer (pages, text selection, copy) driven by our own bar
// (page, zoom, search) and an own annotation list (highlights / notes per page) kept on the item.
export default function PdfViewer({ url, title, media, pages, onPatch, onAppendNotes }) {
  const [page, setPage] = useState(Math.max(1, Number(media.page) || 1));
  const [zoom, setZoom] = useState(media.zoom || 'width');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [showNotes, setShowNotes] = useState(media.showAnnotations !== false);
  const [noteText, setNoteText] = useState('');
  const [msg, setMsg] = useState('');
  const annotations = Array.isArray(media.annotations) ? media.annotations : [];
  const patchRef = useRef(onPatch);
  patchRef.current = onPatch;

  // Page and zoom remembered on the item (saved shortly after the last change).
  useEffect(() => {
    if (page === (Number(media.page) || 1) && zoom === (media.zoom || 'width')) return undefined;
    const tm = setTimeout(() => patchRef.current({ page, zoom }), 400);
    return () => clearTimeout(tm);
  }, [page, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = pages > 0 ? pages : Infinity;
  const goPage = (p) => setPage(Math.min(max, Math.max(1, Math.floor(Number(p) || 1))));
  const numZoom = typeof zoom === 'number' ? zoom : 100;
  const src = pdfViewUrl(url, { page, zoom, search });

  const highlight = async () => {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = '';
    }
    if (!text.trim()) return setMsg(t('ui.rmedia.clipboard_gol'));
    setMsg('');
    onPatch({ annotations: addAnnotation(annotations, { page, kind: 'highlight', text, note: noteText }) });
    setNoteText('');
  };
  const addNote = () => {
    if (!noteText.trim()) return;
    onPatch({ annotations: addAnnotation(annotations, { page, kind: 'note', note: noteText }) });
    setNoteText('');
  };

  return (
    <div className="pdf-viewer">
      <div className="viewer-bar" role="toolbar" aria-label="PDF">
        <button onClick={() => goPage(page - 1)} disabled={page <= 1} title={t('ui.rmedia.anterioara')} aria-label={t('ui.rmedia.anterioara')}>‹</button>
        <label className="viewer-page">
          {t('ui.rmedia.pagina')}{' '}
          <input type="number" min="1" max={pages || undefined} value={page} onChange={(e) => goPage(e.target.value)} aria-label={t('ui.rmedia.pagina')} />
          {pages > 0 && <span className="muted"> / {pages}</span>}
        </label>
        <button onClick={() => goPage(page + 1)} disabled={page >= max} title={t('ui.rmedia.urmatoare')} aria-label={t('ui.rmedia.urmatoare')}>›</button>
        <span className="viewer-sep" />
        <button onClick={() => setZoom(stepZoom(numZoom, -1))} title={t('ui.rmedia.micsoreaza')} aria-label={t('ui.rmedia.micsoreaza')}>−</button>
        <select value={String(zoom)} onChange={(e) => setZoom(/^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value)} aria-label={t('ui.rmedia.zoom')}>
          <option value="width">{t('ui.rmedia.latime')}</option>
          <option value="fit">{t('ui.rmedia.potriveste')}</option>
          {[50, 75, 100, 125, 150, 200, 300].concat(typeof zoom === 'number' && ![50, 75, 100, 125, 150, 200, 300].includes(zoom) ? [zoom] : []).sort((a, b) => a - b).map((z) => (
            <option key={z} value={z}>{z}%</option>
          ))}
        </select>
        <button onClick={() => setZoom(stepZoom(numZoom, 1))} title={t('ui.rmedia.mareste')} aria-label={t('ui.rmedia.mareste')}>+</button>
        <span className="viewer-sep" />
        <form className="viewer-search" onSubmit={(e) => { e.preventDefault(); setSearch(query); }}>
          <input type="search" value={query} placeholder={t('ui.rmedia.cauta_pdf')} aria-label={t('ui.rmedia.cauta_pdf')} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit">{t('ui.rmedia.cauta')}</button>
        </form>
        <span className="viewer-sep" />
        <button className={showNotes ? 'primary' : ''} aria-pressed={showNotes} title={t('ui.rmedia.panou_adnotari')} onClick={() => { setShowNotes(!showNotes); onPatch({ showAnnotations: !showNotes }); }}>
          {t('ui.rmedia.adnotari')} ({annotations.length})
        </button>
      </div>
      <div className="pdf-body">
        {/* Remounted on each change: the viewer reads page, zoom and search from the address. */}
        <iframe key={src} title={title} src={src} className="pdf-frame" />
        {showNotes && (
          <aside className="pdf-notes" aria-label={t('ui.rmedia.adnotari')}>
            <textarea value={noteText} rows={3} placeholder={t('ui.rmedia.text_nota')} aria-label={t('ui.rmedia.text_nota')} onChange={(e) => setNoteText(e.target.value)} />
            <div className="pdf-notes-actions">
              <button onClick={highlight}>{t('ui.rmedia.evidentiaza')}</button>
              <button onClick={addNote} disabled={!noteText.trim()}>{t('ui.rmedia.adauga_nota')}</button>
            </div>
            {msg && <p className="hint" role="status">{msg}</p>}
            {!annotations.length && <p className="hint">{t('ui.rmedia.fara_adnotari')}</p>}
            <ul className="pdf-annotations">
              {annotations.map((a) => (
                <li key={a.id} className={`pdf-ann ${a.kind}`} style={a.kind === 'highlight' ? { borderLeftColor: a.color } : undefined}>
                  <button className="link" onClick={() => goPage(a.page)} title={t('ui.rmedia.mergi_la_pagina', { page: a.page })}>
                    {t('ui.rmedia.pagina_x', { page: a.page })}
                  </button>
                  {a.text && <q style={{ background: a.kind === 'highlight' ? `${a.color}66` : undefined }}>{a.text}</q>}
                  {a.note && <p>{a.note}</p>}
                  <button className="link danger" onClick={() => onPatch({ annotations: removeAnnotation(annotations, a.id) })}>{t('ui.rmedia.sterge')}</button>
                </li>
              ))}
            </ul>
            {annotations.length > 0 && onAppendNotes && (
              <button onClick={() => onAppendNotes(annotationsHtml(annotations, title))}>{t('ui.rmedia.copiaza_in_note')}</button>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
