import React, { useEffect, useRef, useState } from 'react';
import { t as tr } from '../lib/i18n.js';

const EDGE = 70; // px from the bottom edge that reveal the bar

/**
 * Control strip for composition mode. It slides up when the mouse nears the bottom edge
 * (or when it has keyboard focus) and stays hidden otherwise.
 */
export default function CompositionBar({ settings, onSettings, zoom, onZoom, words, chars, inspectorOn, onInspector, onGoto, onExit, onError }) {
  const [near, setNear] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      const inBar = ref.current && ref.current.contains(e.target);
      setNear(inBar || e.clientY >= window.innerHeight - EDGE);
    };
    const onLeave = () => setNear(false);
    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const pickImage = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      onError?.(new Error(tr('ui.settingsDialog.imaginea_e_prea_mare_maxim')));
      return;
    }
    const r = new FileReader();
    r.onload = () => onSettings({ compBgImage: String(r.result) });
    r.readAsDataURL(file);
  };

  const align = settings.compAlign || 'center';
  const width = settings.compWidth || 40;
  const fade = settings.compFade ?? 100;
  const shown = near || focused;

  return (
    <div
      ref={ref}
      className={`comp-bar ${shown ? 'shown' : ''}`}
      role="toolbar"
      aria-label={tr('ui.comp.bar')}
      onFocus={(e) => setFocused(e.target.matches?.(':focus-visible') ?? false)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
    >
      <div className="comp-bar-group">
        <span className="comp-bar-label">{tr('ui.comp.backdrop')}</span>
        <input type="color" aria-label={tr('ui.comp.bgColor')} title={tr('ui.comp.bgColor')} value={settings.compBg || '#1d1c1a'} onChange={(e) => onSettings({ compBg: e.target.value, compBgImage: '' })} />
        <label className="comp-bar-btn" title={tr('ui.comp.bgImage')}>
          {tr('ui.comp.image')}
          <input type="file" accept="image/*" hidden onChange={pickImage} />
        </label>
        {(settings.compBg || settings.compBgImage) && (
          <button className="comp-bar-btn" title={tr('ui.comp.bgReset')} onClick={() => onSettings({ compBg: '', compBgImage: '' })}>↺</button>
        )}
      </div>
      <div className="comp-bar-group" role="radiogroup" aria-label={tr('ui.comp.position')}>
        <span className="comp-bar-label">{tr('ui.comp.position')}</span>
        {['left', 'center', 'right'].map((a) => (
          <button key={a} role="radio" aria-checked={align === a} className={`comp-bar-btn ${align === a ? 'on' : ''}`} title={tr(`ui.comp.align_${a}`)} onClick={() => onSettings({ compAlign: a })}>
            {a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}
          </button>
        ))}
      </div>
      <label className="comp-bar-group">
        <span className="comp-bar-label">{tr('ui.comp.scale')}</span>
        <input type="range" min="50" max="300" step="10" value={zoom} onChange={(e) => onZoom(Number(e.target.value))} />
        <span className="comp-bar-val">{zoom}%</span>
      </label>
      <label className="comp-bar-group">
        <span className="comp-bar-label">{tr('ui.comp.width')}</span>
        <input type="range" min="25" max="80" step="1" value={width} onChange={(e) => onSettings({ compWidth: Number(e.target.value) })} />
      </label>
      <label className="comp-bar-group">
        <span className="comp-bar-label">{tr('ui.comp.fade')}</span>
        <input type="range" min="0" max="100" step="5" value={fade} onChange={(e) => onSettings({ compFade: Number(e.target.value) })} />
      </label>
      <button className={`comp-bar-btn ${inspectorOn ? 'on' : ''}`} aria-pressed={inspectorOn} onClick={onInspector}>{tr('ui.comp.inspector')}</button>
      <span className="comp-bar-count">{tr('ui.comp.count', { words, chars })}</span>
      <span className="comp-bar-spacer" />
      <button className="comp-bar-btn" onClick={onGoto}>{tr('ui.comp.goto')}</button>
      <button className="comp-bar-btn exit-composition" onClick={onExit}>{tr('ui.app.iesi_esc')}</button>
    </div>
  );
}
