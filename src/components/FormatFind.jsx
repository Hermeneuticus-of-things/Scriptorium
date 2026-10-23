import React, { useEffect, useMemo, useState } from 'react';
import { FORMAT_KINDS, findFormatting } from '../editor/formatting.js';

// Find by formatting (Scrivener Edit → Find → Find by Formatting): steps through
// comments, footnotes, annotations, highlights, colours, revisions, styles, bookmarks.
export default function FormatFind({ editor, styles = [], onClose }) {
  const [kind, setKind] = useState('comment');
  const [value, setValue] = useState('');
  const [index, setIndex] = useState(-1);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    editor.on('update', bump);
    return () => editor.off('update', bump);
  }, [editor]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ranges = useMemo(() => findFormatting(editor.state.doc, kind, value || null), [editor, kind, value, version]);
  const go = (dir) => {
    if (!ranges.length) return;
    const pos = editor.state.selection.from;
    let i;
    if (dir > 0) i = ranges.findIndex((r) => r.from > pos);
    else i = ranges.map((r) => r.from < pos).lastIndexOf(true);
    if (i < 0) i = dir > 0 ? 0 : ranges.length - 1;
    setIndex(i);
    editor.chain().focus().setTextSelection(ranges[i]).scrollIntoView().run();
  };
  const valueInput = {
    highlight: <input type="color" value={value || '#fff176'} onChange={(e) => setValue(e.target.value)} title="Culoarea (gol = orice)" />,
    color: <input type="color" value={value || '#b3261e'} onChange={(e) => setValue(e.target.value)} title="Culoarea (gol = orice)" />,
    revision: (
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Orice rundă</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Runda {n}</option>)}
      </select>
    ),
    style: (
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Orice stil</option>
        {styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    ),
  }[kind];
  return (
    <div className="find-bar format-find" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <span>Caută formatare:</span>
      <select value={kind} onChange={(e) => { setKind(e.target.value); setValue(''); setIndex(-1); }}>
        {FORMAT_KINDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      {valueInput}
      {value && (kind === 'highlight' || kind === 'color') && <button onClick={() => setValue('')}>Orice culoare</button>}
      <span className="count">{ranges.length ? `${index >= 0 ? index + 1 : '–'} / ${ranges.length}` : 'Nimic găsit'}</span>
      <button onClick={() => go(-1)} disabled={!ranges.length} title="Anterior">↑</button>
      <button onClick={() => go(1)} disabled={!ranges.length} title="Următor">↓</button>
      <button onClick={onClose} title="Închide">✕</button>
    </div>
  );
}
