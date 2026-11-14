import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { mediaKind, dataUrlBytes, pdfPageCount } from '../lib/researchMedia.js';
import { activeFocusEngine } from '../lib/focusMenus.js';
import { imageViewSurfaceId, registerImageViewerSurface } from '../lib/focusMediaView.js';
import PdfViewer from './PdfViewer.jsx';
import ImageViewer from './ImageViewer.jsx';
import MediaPlayerView from './MediaPlayerView.jsx';
import WebArchiveView from './WebArchiveView.jsx';

// Shows a research file in the editor pane (PDF, image, web page copy, audio, video), with a viewer
// for each kind. View state (page, zoom, position, annotations) is kept on node.media through onPatch.
// ADL §2/§10 (T8): the viewer is a surface on the focus engine — `image.viewer.<media.file>`
// (suffix `:split` for the instance in the split pane) pushed on mount and popped + unregistered on
// unmount (its only close paths: the split pane's close button, „Închide", Escape through the
// engine, the document closing/navigating away, the view switching — all unmount it). On open it
// takes the real focus (armed by the app, so a project restore never steals it — T4's model), while
// the user works in it, it is the active surface (click/focusin switches it above the view, like
// the inspector; a click elsewhere hands the focus back to the visible view — App-level, same
// handler as the split pane). The image viewer's zoom steps are the surface's zoomIn/zoomOut
// commands. Without any engine the viewer behaves exactly as before.
export default function MediaView({ api, dir, node, onError, onPatch, onInsertTimestamp, onAppendNotes, onOpenBeside, onClose, pane = 'main', focusArmed = null }) {
  const [src, setSrc] = useState(null); // { url, view, pages }
  const media = node.media;
  const kind = mediaKind(media);
  const file = media && media.file;
  const root = useRef(null); // the surface's real focus target
  const viewerRef = useRef(null); // the image viewer's zoom handle (surface commands)
  const onCloseRef = useRef(onClose); // read through a ref: the surface must not re-register per render
  onCloseRef.current = onClose;

  useEffect(() => {
    const eng = activeFocusEngine();
    if (!eng || !file) return undefined; // fără motor sau fără resursă: comportament neatins
    const surfaceId = imageViewSurfaceId(file, { split: pane === 'split' });
    const offSurface = registerImageViewerSurface(eng, file, {
      split: pane === 'split',
      // Doar instanța cu închidere proprie (split) primește close/escape: în panoul principal
      // închiderea e navigația, iar Escape cade mai jos exact ca înainte (comportament neatins).
      close: onClose ? () => onCloseRef.current?.() : undefined,
      focus: () => {
        if (focusArmed) {
          if (!focusArmed.current) return; // restaurare/proiect redeschis: focusul rămâne unde e
          focusArmed.current = false; // o deschidere de utilizator (go/openBeside)
        }
        root.current?.focus?.();
      },
      zoomIn: kind === 'image' ? () => viewerRef.current?.zoomIn?.() : undefined,
      zoomOut: kind === 'image' ? () => viewerRef.current?.zoomOut?.() : undefined,
    });
    // Comutare sibling (modelul inspector): click/focusin în viewer îl face suprafața activă;
    // click în afara lui e acoperit de hand-back-ul App-level (același handler ca la split/T4).
    const onAct = (e) => {
      if (root.current?.contains(e.target)) eng.switchFocus(surfaceId);
    };
    document.addEventListener('focusin', onAct);
    document.addEventListener('mousedown', onAct);
    return () => {
      offSurface();
      document.removeEventListener('focusin', onAct);
      document.removeEventListener('mousedown', onAct);
    };
  }, [file, pane, kind, focusArmed]);

  useEffect(() => {
    setSrc(null);
    if (!file || !api.readMedia) return undefined;
    let alive = true;
    let blobUrl = null;
    api
      .readMedia(dir, file)
      .then((url) => {
        if (!alive) return;
        let view = url;
        let pages = 0;
        // PDFs go to the viewer as a blob address (a data: address cannot carry #page=…).
        if (kind === 'pdf' && typeof URL !== 'undefined' && URL.createObjectURL) {
          const d = dataUrlBytes(url);
          if (d) {
            blobUrl = URL.createObjectURL(new Blob([d.bytes], { type: 'application/pdf' }));
            view = blobUrl;
            let latin = '';
            for (let i = 0; i < d.bytes.length; i += 0x8000) latin += String.fromCharCode.apply(null, d.bytes.subarray(i, i + 0x8000));
            pages = pdfPageCount(latin);
          }
        }
        setSrc({ url, view, pages });
      })
      .catch(onError);
    return () => {
      alive = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [api, dir, file, kind, onError]);

  if (!media) return <p className="hint">{t('ui.mediaView.acest_element_nu_are_continut')}</p>;
  if (!api.readMedia) return <p className="hint">{t('ui.mediaView.fisierele_media_se_vad_in')}</p>;

  const patch = (p) => onPatch && onPatch(p); // merged into node.media by the caller
  const mime = media.mime || '';
  return (
    <div className={`media-view media-${kind}`} data-kind={kind} ref={root} tabIndex={-1}>
      <div className="media-head">
        <h2>{node.title}</h2>
        <span className="muted">{media.name} · {mime}</span>
        {onOpenBeside && (
          <button className="link" onClick={onOpenBeside}>{t('ui.rmedia.deschide_alaturi')}</button>
        )}
        {src && (
          <a className="link" href={src.url} download={media.name}>
            {t('ui.mediaView.salveaza_o_copie')}
          </a>
        )}
      </div>
      {!src && <p className="muted">{t('ui.app.se_incarca')}</p>}
      {src && kind === 'pdf' && (
        <PdfViewer key={file} url={src.view} pages={src.pages} title={node.title} media={media} onPatch={patch} onAppendNotes={onAppendNotes} />
      )}
      {src && kind === 'image' && <ImageViewer key={file} ref={viewerRef} url={src.url} title={node.title} media={media} onPatch={patch} />}
      {src && (kind === 'audio' || kind === 'video') && (
        <MediaPlayerView key={file} url={src.url} kind={kind} title={node.title} media={media} onPatch={patch} onInsertTimestamp={onInsertTimestamp} />
      )}
      {src && kind === 'web' && <WebArchiveView url={src.url} title={node.title} media={media} />}
      {src && kind === 'other' && <p className="muted">{t('ui.mediaView.formatul_nu_poate_fi_afisat')}</p>}
    </div>
  );
}
