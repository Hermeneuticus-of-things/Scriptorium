import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { clock } from '../lib/dictation.js';

// D&TED dictation bar (docs/DTED.md): level, time, words, Pause / Stop / Cancel; transcriptions in progress.
export default function DictationBar({ dict }) {
  const { dictation, jobs } = dict;
  const [, tick] = useState(0);
  const meterRef = useRef(null);
  const pulseRef = useRef(null);
  useEffect(() => {
    if (!dictation) return undefined;
    const t1 = setInterval(() => tick((n) => n + 1), 1000);
    // ADL §12: mic level arrives every ~150 ms — applied straight to the meter DOM node
    // through dict.onLevel, never through component state (0 app re-renders for level).
    const off = dict.onLevel ? dict.onLevel((v) => {
      if (meterRef.current && !dictation.paused) meterRef.current.value = v;
      // Pulsul de silabe:aceeași valoare, direct pe DOM (scale + luminozitate), fără re-randări.
      if (pulseRef.current) {
        pulseRef.current.style.transform = `scale(${1 + Math.min(1, v) * 0.9})`;
        pulseRef.current.style.opacity = dictation.paused ? 0.25 : String(0.35 + Math.min(1, v) * 0.65);
      }
    }) : null;
    return () => { clearInterval(t1); off && off(); };
  }, [dictation]);
  const list = Object.entries(jobs);
  if (!dictation && !list.length) return null;
  return (
    <div className="dictation-bar" role="status">
      {dictation && (
        <div className="dictation-row">
          <span className={`dictation-mic ${dictation.paused ? 'paused' : ''}`} aria-hidden="true" />
          <strong>{dictation.id ? (dictation.paused ? t('ui.dted.pauza_activa') : t('ui.dted.dictezi')) : t('ui.dted.pornesc')}</strong>
          <meter ref={meterRef} className="dictation-level" min="0" max="1" value={dictation.paused ? 0 : 0} aria-label={t('ui.dted.nivel')} />
          <span ref={pulseRef} className="dictation-pulse" aria-hidden="true" />
          <span className="muted small">{clock((Date.now() - dictation.since) / 1000)} · {t('ui.dted.cuvinte', { n: dictation.words })}</span>
          {dictation.lastText && <span className="dictation-live" title={dictation.lastText}>„…{dictation.lastText.slice(-60)}”</span>}
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
