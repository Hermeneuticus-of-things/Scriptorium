import React, { useRef } from 'react';
import { t as tr } from '../lib/i18n.js';

// Project Settings > Default formatting: the paragraph format new documents start with (and the
// one "Convert to default formatting" applies), with a small ruler for the indents, plus the
// fonts of document notes and footnotes. "Use the global setting" drops the project override.
export const FONTS = ['', 'Georgia, serif', "'Times New Roman', serif", "'Palatino Linotype', Palatino, serif", 'Garamond, serif', 'Arial, sans-serif', 'Helvetica, Arial, sans-serif', "'Courier New', monospace"];
const fontName = (f) => (f ? f.split(',')[0].replace(/'/g, '') : tr('ui.projectSettingsDialog.din_optiuni'));
const RULER_EM = 8; // the ruler shows 0..8 em
const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

const CSS = `
.dfp-ruler { position: relative; height: 34px; border: 1px solid rgba(128,128,128,.4); border-radius: 4px; background: repeating-linear-gradient(90deg, rgba(128,128,128,.35) 0 1px, transparent 1px calc(100% / ${RULER_EM})); user-select: none; touch-action: none; }
.dfp-ruler .dfp-text { position: absolute; top: 12px; height: 10px; background: rgba(74,111,165,.18); }
.dfp-mark { position: absolute; width: 12px; margin-left: -6px; height: 12px; cursor: ew-resize; border: 0; padding: 0; background: var(--accent, #4a6fa5); }
.dfp-mark.first { top: 0; clip-path: polygon(0 0, 100% 0, 50% 100%); }
.dfp-mark.left { bottom: 0; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.dfp-mark.right { bottom: 0; clip-path: polygon(50% 0, 100% 100%, 0 100%); background: #a5574a; }
.dfp-sample { border: 1px dashed rgba(128,128,128,.4); border-radius: 4px; padding: 8px; }
.dfp-sample p { margin: 0; }
`;

function Ruler({ f, set, disabled }) {
  const ref = useRef(null);
  const left = num(f.indentLeft) || 0;
  const first = left + (num(f.firstIndent) || 0);
  const right = num(f.indentRight) || 0;
  const pct = (em) => `${Math.max(0, Math.min(RULER_EM, em)) / RULER_EM * 100}%`;
  const drag = (which) => (e) => {
    if (disabled) return;
    e.preventDefault();
    const box = ref.current.getBoundingClientRect();
    const at = (ev) => Math.round(Math.max(0, Math.min(RULER_EM, ((ev.clientX - box.left) / box.width) * RULER_EM)) * 4) / 4;
    const move = (ev) => {
      const em = at(ev);
      if (which === 'first') set({ firstIndent: String(Math.round((em - left) * 4) / 4) });
      else if (which === 'left') set({ indentLeft: String(em) });
      else set({ indentRight: String(Math.max(0, RULER_EM - em)) });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const key = (which) => (e) => {
    const d = { ArrowLeft: -0.25, ArrowRight: 0.25 }[e.key];
    if (d == null || disabled) return;
    e.preventDefault();
    if (which === 'first') set({ firstIndent: String((num(f.firstIndent) || 0) + d) });
    else if (which === 'left') set({ indentLeft: String(Math.max(0, left + d)) });
    else set({ indentRight: String(Math.max(0, right - d)) });
  };
  return (
    <div className="dfp-ruler" ref={ref} aria-label={tr('ui.dfp.rigla')}>
      <div className="dfp-text" style={{ left: pct(left), right: pct(right) }} />
      <button type="button" className="dfp-mark first" style={{ left: pct(first) }} title={tr('ui.dfp.indent_prima')} aria-label={tr('ui.dfp.indent_prima')} onPointerDown={drag('first')} onKeyDown={key('first')} disabled={disabled} />
      <button type="button" className="dfp-mark left" style={{ left: pct(left) }} title={tr('ui.dfp.indent_stanga')} aria-label={tr('ui.dfp.indent_stanga')} onPointerDown={drag('left')} onKeyDown={key('left')} disabled={disabled} />
      <button type="button" className="dfp-mark right" style={{ left: pct(RULER_EM - right) }} title={tr('ui.dfp.indent_dreapta')} aria-label={tr('ui.dfp.indent_dreapta')} onPointerDown={drag('right')} onKeyDown={key('right')} disabled={disabled} />
    </div>
  );
}

function FontPick({ label, value, onChange, disabled }) {
  return (
    <label>
      {label}
      <select value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {FONTS.map((f) => <option key={f} value={f}>{fontName(f)}</option>)}
      </select>
    </label>
  );
}

/** value: { useGlobal, f: {font,size,lineHeight,firstIndent,indentLeft,indentRight,spaceBefore,spaceAfter,align,notesFont,notesSize,footnoteFont,footnoteSize} } */
export default function DefaultFormatPane({ value, onChange }) {
  const { useGlobal, f } = value;
  const set = (p) => onChange({ ...value, f: { ...f, ...p } });
  const off = useGlobal;
  const n = (k, attrs) => (
    <input type="number" {...attrs} value={f[k]} disabled={off} onChange={(e) => set({ [k]: e.target.value })} />
  );
  return (
    <div className="fields dfp">
      <style>{CSS}</style>
      <p className="muted">{tr('ui.projectSettingsDialog.formatarea_folosita_pentru_documentele_noi')}</p>
      <label className="check">
        <input type="checkbox" className="dfp-global" checked={useGlobal} onChange={(e) => onChange({ ...value, useGlobal: e.target.checked })} /> {tr('ui.dfp.foloseste_global')}
      </label>
      <div className="row">
        <FontPick label="Font" value={f.font} disabled={off} onChange={(v) => set({ font: v })} />
        <label>{tr('ui.projectSettingsDialog.marime_px')}{n('size', { min: 8, max: 48 })}</label>
        <label>
          {tr('ui.dfp.aliniere')}
          <select value={f.align || ''} disabled={off} onChange={(e) => set({ align: e.target.value })}>
            <option value="">{tr('ui.dfp.align_implicit')}</option>
            <option value="left">{tr('ui.dfp.align_stanga')}</option>
            <option value="center">{tr('ui.dfp.align_centru')}</option>
            <option value="right">{tr('ui.dfp.align_dreapta')}</option>
            <option value="justify">{tr('ui.dfp.align_justify')}</option>
          </select>
        </label>
      </div>
      <Ruler f={f} set={set} disabled={off} />
      <div className="row">
        <label>{tr('ui.dfp.indent_prima')} (em){n('firstIndent', { min: -5, max: 8, step: 0.25 })}</label>
        <label>{tr('ui.dfp.indent_stanga')} (em){n('indentLeft', { min: 0, max: 8, step: 0.25 })}</label>
        <label>{tr('ui.dfp.indent_dreapta')} (em){n('indentRight', { min: 0, max: 8, step: 0.25 })}</label>
      </div>
      <div className="row">
        <label>{tr('ui.compileDialog.spatiere_randuri')}{n('lineHeight', { min: 1, max: 3, step: 0.1 })}</label>
        <label>{tr('ui.dfp.spatiu_inainte')} (em){n('spaceBefore', { min: 0, max: 3, step: 0.1 })}</label>
        <label>{tr('ui.dfp.spatiu_dupa')} (em){n('spaceAfter', { min: 0, max: 3, step: 0.1 })}</label>
      </div>
      <div className="dfp-sample" style={{ fontFamily: (!off && f.font) || undefined, fontSize: (!off && num(f.size)) || undefined, lineHeight: (!off && num(f.lineHeight)) || undefined }}>
        {[0, 1].map((i) => (
          <p
            key={i}
            className="pdx-format-sample"
            style={off ? undefined : {
              textIndent: `${num(f.firstIndent) || 0}em`, marginLeft: `${num(f.indentLeft) || 0}em`, marginRight: `${num(f.indentRight) || 0}em`,
              marginTop: `${num(f.spaceBefore) || 0}em`, marginBottom: `${num(f.spaceAfter) || 0}em`, textAlign: f.align || undefined,
            }}
          >
            {tr('ui.projectSettingsDialog.asa_va_arata_textul_documentelor')}
          </p>
        ))}
      </div>
      <h3>{tr('ui.dfp.note_si_subsol')}</h3>
      <div className="row">
        <FontPick label={tr('ui.dfp.font_notite')} value={f.notesFont} disabled={off} onChange={(v) => set({ notesFont: v })} />
        <label>{tr('ui.projectSettingsDialog.marime_px')}{n('notesSize', { min: 8, max: 32 })}</label>
      </div>
      <div className="row">
        <FontPick label={tr('ui.dfp.font_subsol')} value={f.footnoteFont} disabled={off} onChange={(v) => set({ footnoteFont: v })} />
        <label>{tr('ui.projectSettingsDialog.marime_px')}{n('footnoteSize', { min: 8, max: 32 })}</label>
      </div>
    </div>
  );
}
