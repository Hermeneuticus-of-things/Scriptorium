import React, { useEffect, useState } from 'react';

// Shows a media item from the Research folder (image, PDF, audio, video).
export default function MediaView({ api, dir, node, onError }) {
  const [url, setUrl] = useState(null);
  const media = node.media;

  useEffect(() => {
    setUrl(null);
    if (!media || !api.readMedia) return;
    api.readMedia(dir, media.file).then(setUrl).catch(onError);
  }, [api, dir, media, onError]);

  if (!media) return <p className="hint">Acest element nu are conținut.</p>;
  if (!api.readMedia) return <p className="hint">Fișierele media se văd în aplicația desktop.</p>;

  const mime = media.mime || '';
  return (
    <div className="media-view">
      <div className="media-head">
        <h2>{node.title}</h2>
        <span className="muted">{media.name} · {mime}</span>
        {url && (
          <a className="link" href={url} download={media.name}>
            Salvează o copie
          </a>
        )}
      </div>
      {!url && <p className="muted">Se încarcă…</p>}
      {url && mime.startsWith('image/') && <img src={url} alt={node.title} />}
      {url && mime === 'application/pdf' && <iframe title={node.title} src={url} />}
      {url && mime.startsWith('audio/') && <audio controls src={url} />}
      {url && mime.startsWith('video/') && <video controls src={url} />}
      {url && !/^(image|audio|video)\/|^application\/pdf$/.test(mime) && (
        <p className="muted">Formatul nu poate fi afișat aici. Folosește „Salvează o copie” ca să-l deschizi cu alt program.</p>
      )}
    </div>
  );
}
