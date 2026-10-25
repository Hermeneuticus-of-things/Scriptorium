import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';
import { mediaKind, dataUrlBytes, pdfPageCount } from '../lib/researchMedia.js';
import PdfViewer from './PdfViewer.jsx';
import ImageViewer from './ImageViewer.jsx';
import MediaPlayerView from './MediaPlayerView.jsx';
import WebArchiveView from './WebArchiveView.jsx';

// Shows a research file in the editor pane (PDF, image, web page copy, audio, video), with a viewer
// for each kind. View state (page, zoom, position, annotations) is kept on node.media through onPatch.
export default function MediaView({ api, dir, node, onError, onPatch, onInsertTimestamp, onAppendNotes, onOpenBeside }) {
  const [src, setSrc] = useState(null); // { url, view, pages }
  const media = node.media;
  const kind = mediaKind(media);
  const file = media && media.file;

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
    <div className={`media-view media-${kind}`} data-kind={kind}>
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
      {src && kind === 'image' && <ImageViewer key={file} url={src.url} title={node.title} media={media} onPatch={patch} />}
      {src && (kind === 'audio' || kind === 'video') && (
        <MediaPlayerView key={file} url={src.url} kind={kind} title={node.title} media={media} onPatch={patch} onInsertTimestamp={onInsertTimestamp} />
      )}
      {src && kind === 'web' && <WebArchiveView url={src.url} title={node.title} media={media} />}
      {src && kind === 'other' && <p className="muted">{t('ui.mediaView.formatul_nu_poate_fi_afisat')}</p>}
    </div>
  );
}
