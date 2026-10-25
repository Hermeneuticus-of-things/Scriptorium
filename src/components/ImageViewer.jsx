import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { stepZoom, fitScale } from '../lib/researchMedia.js';

// Image in the editor pane: fit / actual size / zoom steps, Ctrl+wheel zoom, drag to pan.
export default function ImageViewer({ url, title, media, onPatch }) {
  const box = useRef(null);
  const [nat, setNat] = useState(null); // {w, h}
  const [mode, setMode] = useState(media.zoom && media.zoom !== 'fit' ? Number(media.zoom) : 'fit');
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });
  const drag = useRef(null);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setBoxSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBoxSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = nat ? fitScale(nat.w, nat.h, boxSize.w - 16, boxSize.h - 16) : 1;
  const scale = mode === 'fit' ? fit : mode / 100;
  const pct = Math.round(scale * 100);
  const set = (m) => {
    setMode(m);
    onPatch?.({ zoom: m });
  };

  const onWheel = (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    set(stepZoom(pct, e.deltaY < 0 ? 1 : -1));
  };
  const down = (e) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, l: box.current.scrollLeft, t: box.current.scrollTop };
    e.preventDefault();
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    box.current.scrollLeft = d.l - (e.clientX - d.x);
    box.current.scrollTop = d.t - (e.clientY - d.y);
  };

  return (
    <div className="image-viewer">
      <div className="viewer-bar" role="toolbar" aria-label={t('ui.rmedia.zoom')}>
        <button onClick={() => set(stepZoom(pct, -1))} title={t('ui.rmedia.micsoreaza')} aria-label={t('ui.rmedia.micsoreaza')}>−</button>
        <span className="viewer-zoom" aria-live="polite">{pct}%</span>
        <button onClick={() => set(stepZoom(pct, 1))} title={t('ui.rmedia.mareste')} aria-label={t('ui.rmedia.mareste')}>+</button>
        <button className={mode === 'fit' ? 'primary' : ''} aria-pressed={mode === 'fit'} onClick={() => set('fit')}>{t('ui.rmedia.potriveste')}</button>
        <button className={mode === 100 ? 'primary' : ''} aria-pressed={mode === 100} onClick={() => set(100)}>{t('ui.rmedia.marime_reala')}</button>
        {nat && <span className="muted">{nat.w} × {nat.h}</span>}
        <span className="hint">{t('ui.rmedia.imagine_trage')}</span>
      </div>
      <div
        className="image-stage"
        ref={box}
        onWheel={onWheel}
        onMouseDown={down}
        onMouseMove={move}
        onMouseUp={() => { drag.current = null; }}
        onMouseLeave={() => { drag.current = null; }}
      >
        <img
          src={url}
          alt={title}
          draggable={false}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={nat ? { width: Math.round(nat.w * scale), height: Math.round(nat.h * scale), maxWidth: 'none', maxHeight: 'none' } : undefined}
        />
      </div>
    </div>
  );
}
