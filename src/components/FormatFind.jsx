import React, { useEffect, useMemo, useState } from 'react';
import { FORMAT_KINDS, findFormatting } from '../editor/formatting.js';
import { t } from '../lib/i18n.js';

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
    highlight: <input type="color" value={value || '#fff176'} onChange={(e) => setValue(e.target.value)} title={t('ui.formatFind.culoarea_gol_orice')} />,
    color: <input type="color" value={value || '#b3261e'} onChange={(e) => setValue(e.target.value)} title={t('ui.formatFind.culoarea_gol_orice')} />,
    revision: (
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">{t('ui.formatFind.orice_runda')}</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Runda {n}</option>)}
      </select>
    ),
    style: (
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">{t('ui.formatFind.orice_stil')}</option>
        {styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    ),
  }[kind];
  return (
    <div className="find-bar format-find" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <span>{t('ui.formatFind.cauta_formatare')}</span>
      <select value={kind} onChange={(e) => { setKind(e.target.value); setValue(''); setIndex(-1); }}>
        {FORMAT_KINDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      {valueInput}
      {value && (kind === 'highlight' || kind === 'color') && <button onClick={() => setValue('')}>{t('ui.formatFind.orice_culoare')}</button>}
      <span className="count">{ranges.length ? `${index >= 0 ? index + 1 : '–'} / ${ranges.length}` : t('ui.formatFind.nimic_gasit')}</span>
      <button onClick={() => go(-1)} disabled={!ranges.length} title="Anterior">↑</button>
      <button onClick={() => go(1)} disabled={!ranges.length} title={t('ui.formatFind.urmator')}>↓</button>
      <button onClick={onClose} title={t('btn.close')}>✕</button>
    </div>
  );
}
