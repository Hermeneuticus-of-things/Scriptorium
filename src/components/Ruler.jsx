import React, { useRef, useState } from 'react';
import { useEditorState } from '@tiptap/react';
import { parseTabStops, serializeTabStops } from '../editor/formatting.js';
import { t as tr } from '../lib/i18n.js';

// Ruler (Format → Show Ruler): first-line / left / right indent handles and tab
// stops for the current paragraph. Units are cm (1cm = 37.8 CSS px at zoom 100%).
const PX_PER_CM = 96 / 2.54;
const snap = (cm) => Math.max(0, Math.round(cm * 4) / 4);

export default function Ruler({ editor, zoom = 1 }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(null); // { kind, index, cm }
  const a = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      const p = ed.state.selection.$from.parent.attrs;
      return { first: p.firstIndent || 0, left: p.indentLeft || 0, right: p.indentRight || 0, tabs: parseTabStops(p.tabStops) || [], rtl: p.dir === 'rtl' };
    },
  });
  const scale = PX_PER_CM * zoom;
  const widthCm = ref.current ? ref.current.clientWidth / scale : 16;
  const set = (attrs) => editor.chain().setParagraphFormat(attrs).run();
  const cmAt = (clientX) => snap((clientX - ref.current.getBoundingClientRect().left) / scale);

  const startDrag = (kind, index) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const move = (ev) => setDrag({ kind, index, cm: cmAt(ev.clientX), off: Math.abs(ev.clientY - startY) > 24 });
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      const cm = cmAt(ev.clientX);
      if (kind === 'left') set({ indentLeft: cm || null });
      if (kind === 'first') set({ firstIndent: Math.round((cm - a.left) * 4) / 4 || null });
      if (kind === 'right') set({ indentRight: snap(widthCm - cm) || null });
      if (kind === 'tab') {
        const tabs = a.tabs.filter((_, i) => i !== index);
        if (Math.abs(ev.clientY - startY) <= 24) tabs.push(cm);
        set({ tabStops: serializeTabStops(parseTabStops(tabs.join(','))) });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const pos = (kind, cm, index) => (drag && drag.kind === kind && drag.index === index ? drag.cm : cm);

  const addTab = (e) => {
    if (e.target !== ref.current && !e.target.classList.contains('ruler-tick')) return;
    set({ tabStops: serializeTabStops(parseTabStops([...a.tabs, cmAt(e.clientX)].join(','))) });
  };

  const ticks = [];
  for (let i = 0; i <= Math.floor(widthCm * 2); i++) {
    ticks.push(<span key={i} className={`ruler-tick ${i % 2 ? 'half' : ''}`} style={{ left: (i / 2) * scale }}>{i % 2 || !i ? '' : i / 2}</span>);
  }
  return (
    <div className="ruler" ref={ref} onDoubleClick={addTab} title={tr('ui.ruler.dublu_clic_adauga_tab_trage')}>
      {ticks}
      <span className="ruler-handle first" style={{ left: (pos('first', a.left + a.first) ) * scale }} onPointerDown={startDrag('first')} title={`Indent prima linie: ${a.first} cm`} />
      <span className="ruler-handle left" style={{ left: pos('left', a.left) * scale }} onPointerDown={startDrag('left')} title={tr('ui.ruler.indent_stanga_x_cm', { left: a.left })} />
      <span className="ruler-handle right" style={{ left: pos('right', widthCm - a.right) * scale }} onPointerDown={startDrag('right')} title={tr('ui.ruler.indent_dreapta_x_cm', { right: a.right })} />
      {a.tabs.map((t, i) => (
        <span key={i} className={`ruler-tab ${drag && drag.kind === 'tab' && drag.index === i && drag.off ? 'removing' : ''}`} style={{ left: pos('tab', t, i) * scale }} onPointerDown={startDrag('tab', i)} title={tr('ui.ruler.tab_la_x_cm', { t: t })} />
      ))}
    </div>
  );
}
