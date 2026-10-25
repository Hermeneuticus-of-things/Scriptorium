import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { formatTimestamp } from '../lib/researchMedia.js';

const SKIP = 5;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Audio / video in the editor pane: resumes where it was left, inserts timestamps, and answers
// transcription keys (Ctrl+Alt+P / ← / → / T) while the cursor is in the text of the other pane.
export default function MediaPlayerView({ url, title, kind, media, onPatch, onInsertTimestamp }) {
  const el = useRef(null);
  const [time, setTime] = useState(Number(media.time) || 0);
  const [rate, setRate] = useState(Number(media.rate) || 1);
  const saved = useRef(Number(media.time) || 0);
  const patchRef = useRef(onPatch);
  patchRef.current = onPatch;
  const insertRef = useRef(onInsertTimestamp);
  insertRef.current = onInsertTimestamp;

  const remember = () => {
    const m = el.current;
    if (!m) return;
    const now = Math.floor(m.currentTime || 0);
    if (Math.abs(now - saved.current) < 1) return;
    saved.current = now;
    patchRef.current?.({ time: now });
  };
  useEffect(() => () => remember(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = (d) => {
    const m = el.current;
    if (m) m.currentTime = Math.max(0, (m.currentTime || 0) + d);
  };
  const toggle = () => {
    const m = el.current;
    if (!m) return;
    if (m.paused) m.play().catch(() => {});
    else m.pause();
  };
  const stamp = () => insertRef.current?.(el.current ? el.current.currentTime : time);

  useEffect(() => {
    const onKey = (e) => {
      if (!e.ctrlKey || !e.altKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === 'p') toggle();
      else if (e.key === 'ArrowLeft') skip(-SKIP);
      else if (e.key === 'ArrowRight') skip(SKIP);
      else if (k === 't') stamp();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const props = {
    ref: el,
    controls: true,
    src: url,
    onLoadedMetadata: (e) => {
      const m = e.currentTarget;
      if (saved.current && saved.current < (m.duration || Infinity)) m.currentTime = saved.current;
      m.playbackRate = rate;
    },
    onTimeUpdate: (e) => setTime(e.currentTarget.currentTime),
    onPause: remember,
    onSeeked: remember,
    'aria-label': title,
  };

  return (
    <div className="player-view">
      {kind === 'video' ? <video {...props} /> : <audio {...props} />}
      <div className="viewer-bar" role="toolbar" aria-label={title}>
        <button onClick={() => skip(-SKIP)} title={t('ui.rmedia.inapoi', { s: SKIP })} aria-label={t('ui.rmedia.inapoi', { s: SKIP })}>«{SKIP}</button>
        <span className="viewer-zoom" aria-live="off">{formatTimestamp(time)}</span>
        <button onClick={() => skip(SKIP)} title={t('ui.rmedia.inainte', { s: SKIP })} aria-label={t('ui.rmedia.inainte', { s: SKIP })}>{SKIP}»</button>
        <label>
          {t('ui.rmedia.viteza')}{' '}
          <select
            value={rate}
            onChange={(e) => {
              const r = Number(e.target.value);
              setRate(r);
              if (el.current) el.current.playbackRate = r;
              onPatch?.({ rate: r });
            }}
          >
            {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
        {onInsertTimestamp && (
          <button className="primary insert-time" onClick={stamp} title={t('ui.rmedia.insereaza_timp_titlu', { time: formatTimestamp(time) })}>
            {t('ui.rmedia.insereaza_timp')} [{formatTimestamp(time)}]
          </button>
        )}
      </div>
      <p className="hint">{t('ui.rmedia.taste_transcriere')}</p>
    </div>
  );
}
