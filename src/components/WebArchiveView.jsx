import React, { useMemo } from 'react';
import { t } from '../lib/i18n.js';
import { dataUrlBytes } from '../lib/researchMedia.js';

// Web page saved in the project (offline copy): shown in a sandboxed frame without scripts,
// so the page can neither run code nor reach the app.
export default function WebArchiveView({ url, title, media }) {
  const html = useMemo(() => {
    const d = dataUrlBytes(url);
    return d ? new TextDecoder('utf-8').decode(d.bytes) : '';
  }, [url]);
  return (
    <div className="web-archive">
      <div className="viewer-bar">
        <span className="muted">{t('ui.rmedia.arhiva_web')}</span>
        {media.source && /^https?:\/\//.test(media.source) && (
          <a className="link" href={media.source} target="_blank" rel="noreferrer noopener">{t('ui.rmedia.deschide_sursa')}</a>
        )}
      </div>
      <iframe className="web-frame" title={title} sandbox="" srcDoc={html} />
    </div>
  );
}
