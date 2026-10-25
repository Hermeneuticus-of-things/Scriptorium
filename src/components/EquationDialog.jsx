import React, { useMemo, useRef, useState } from 'react';
import { latexToMathML } from '../lib/latexMath.js';
import { t as tr } from '../lib/i18n.js';

const SAMPLES = ['\\frac{a}{b}', 'x^{2}', 'x_{i}', '\\sqrt{x}', '\\sum_{i=1}^{n}', '\\int_{a}^{b}', '\\alpha', '\\pi', '\\leq', '\\infty', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'];

// The equation as a picture: MathML drawn into an SVG (foreignObject), then rasterised to PNG
// at 2× so it compiles to DOCX, PDF and EPUB like any image; SVG is kept when the canvas refuses.
async function renderEquation(el, mathml) {
  const r = el.getBoundingClientRect();
  const w = Math.max(8, Math.ceil(r.width) + 4);
  const h = Math.max(8, Math.ceil(r.height) + 4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:20px;line-height:1;padding:2px;color:#000">${mathml}</div></foreignObject></svg>`;
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  try {
    const img = new Image();
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = svgUrl; });
    const c = document.createElement('canvas');
    c.width = w * 2;
    c.height = h * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    return { src: c.toDataURL('image/png'), width: w };
  } catch {
    return { src: svgUrl, width: w };
  }
}

// Insert › Equation…: LaTeX input with a live preview; Insert puts the equation at the cursor
// as an image whose alt text keeps the LaTeX ($…$), so a double-click opens it again.
export default function EquationDialog({ initial = '', onInsert, onClose }) {
  const [src, setSrc] = useState(initial);
  const [display, setDisplay] = useState(false);
  const preview = useRef(null);
  const input = useRef(null);
  const mathml = useMemo(() => latexToMathML(src, { display }), [src, display]);
  const insert = async () => {
    if (!src.trim()) return;
    const { src: url, width } = await renderEquation(preview.current, mathml);
    onInsert({ src: url, alt: `$${src.trim()}$`, width, display });
  };
  const add = (s) => {
    const el = input.current;
    const a = el ? el.selectionStart : src.length;
    const b = el ? el.selectionEnd : src.length;
    setSrc(src.slice(0, a) + s + src.slice(b));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + s.length, a + s.length); });
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal equation-dialog" role="dialog" aria-label={tr('ui.g5.ecuatie')} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) insert(); }}>
        <h2>{tr('ui.g5.ecuatie')}</h2>
        <div className="equation-samples">
          {SAMPLES.map((s) => <button key={s} type="button" onClick={() => add(s)} title={s}>{s.length > 14 ? s.slice(0, 14) + '…' : s}</button>)}
        </div>
        <label className="block">
          {tr('ui.g5.latex')}
          <textarea ref={input} className="equation-input" rows={3} autoFocus value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} placeholder="E = mc^{2}" />
        </label>
        <div className="equation-preview" aria-label={tr('ui.g5.previzualizare')} aria-live="polite">
          <span ref={preview} className="equation-render" dangerouslySetInnerHTML={{ __html: src.trim() ? mathml : '' }} />
        </div>
        <label className="check">
          <input type="checkbox" checked={display} onChange={(e) => setDisplay(e.target.checked)} /> {tr('ui.g5.ecuatieBloc')}
        </label>
        <div className="row end">
          <button onClick={onClose}>{tr('btn.cancel')}</button>
          <button className="primary equation-insert" disabled={!src.trim()} onClick={insert}>{tr('ui.g5.insereaza')}</button>
        </div>
      </div>
    </div>
  );
}
