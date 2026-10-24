import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';
import { clock } from '../lib/dictation.js';

// D&TED dictation bar (docs/DTED.md): level, time, words, Pause / Stop / Cancel; transcriptions in progress.
export default function DictationBar({ dict }) {
  const { dictation, jobs } = dict;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!dictation) return undefined;
    const t1 = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t1);
  }, [dictation]);
  const list = Object.entries(jobs);
  if (!dictation && !list.length) return null;
  return (
    <div className="dictation-bar" role="status">
      {dictation && (
        <div className="dictation-row">
          <span className={`dictation-mic ${dictation.paused ? 'paused' : ''}`} aria-hidden="true" />
          <strong>{dictation.id ? (dictation.paused ? t('ui.dted.pauza_activa') : t('ui.dted.dictezi')) : t('ui.dted.pornesc')}</strong>
          <meter className="dictation-level" min="0" max="1" value={dictation.paused ? 0 : dictation.level || 0} aria-label={t('ui.dted.nivel')} />
          <span className="muted small">{clock((Date.now() - dictation.since) / 1000)} · {t('ui.dted.cuvinte', { n: dictation.words })}</span>
          <span className="spacer" />
          <button onClick={dict.togglePause} disabled={!dictation.id}>{dictation.paused ? t('ui.dted.continua') : t('ui.dted.pauza')}</button>
          <button className="primary" onClick={dict.stop}>{t('ui.dted.stop')}</button>
          <button onClick={dict.cancel} title={t('ui.dted.anuleaza_tip')}>{t('ui.dted.anuleaza')}</button>
        </div>
      )}
      {list.map(([id, j]) => (
        <div className="dictation-row" key={id}>
          <span className="muted small">{t('ui.dted.transcriu', { title: j.title })}</span>
          <progress max="1" value={j.p || 0} />
          <span className="muted small">{j.phase}</span>
          <span className="spacer" />
          <button onClick={() => dict.cancelJob(id)}>{t('ui.dted.anuleaza')}</button>
        </div>
      ))}
    </div>
  );
}
