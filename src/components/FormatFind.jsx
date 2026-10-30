import React, { useEffect, useMemo, useState } from 'react';
import { FORMAT_KINDS, findFormatting } from '../editor/formatting.js';
import { CHAR_FORMATS, formattingOccurrences } from '../lib/formatFind.js';
import { t } from '../lib/i18n.js';

// §11.6.7–11.6.10 kinds beyond the mark-based FORMAT_KINDS; labels stay in i18n-ui.
const EXTRA_KINDS = [
  ['charFormat', 'ui.formatFind.format_caracter'],
  ['link', 'ui.formatFind.linkuri'],
  ['image', 'ui.formatFind.imagini'],
  ['preserve', 'ui.formatFind.text_preservat'],
];
const HTML_KINDS = new Set(EXTRA_KINDS.map(([id]) => id));
const CHAR_LABELS = {
  bold: 'ui.formatFind.bold',
  italic: 'ui.formatFind.italic',
  underline: 'ui.formatFind.underline',
  strike: 'ui.formatFind.strike',
  superscript: 'ui.formatFind.superscript',
  subscript: 'ui.formatFind.subscript',
};

// Find by formatting (Scrivener Edit → Find → Find by Formatting): steps through
// comments, footnotes, annotations, highlights, colours, revisions, styles, bookmarks,
// then character formats, links, images and preserved formatting (§11.6.7–11.6.10).
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
  // §11.6.7–11.6.10: hit counts and snippets come from the HTML detectors; navigation stays on the ranges above.
  const html = useMemo(() => editor.getHTML(), [editor, version]);
  const hits = useMemo(
    () => (HTML_KINDS.has(kind) ? formattingOccurrences(html, kind, { format: kind === 'charFormat' ? value || null : null, query: value || null }) : null),
    [html, kind, value],
  );
  const total = hits ? hits.length : ranges.length;
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
    charFormat: (
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">{t('ui.formatFind.orice_format')}</option>
        {CHAR_FORMATS.map((f) => <option key={f} value={f}>{t(CHAR_LABELS[f])}</option>)}
      </select>
    ),
    link: <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t('ui.formatFind.link_filtru')} title={t('ui.formatFind.link_filtru')} />,
    image: <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t('ui.formatFind.imagine_filtru')} title={t('ui.formatFind.imagine_filtru')} />,
  }[kind];
  const kinds = [...FORMAT_KINDS, ...EXTRA_KINDS.map(([id, key]) => [id, t(key)])];
  return (
    <div className="find-bar format-find" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <span>{t('ui.formatFind.cauta_formatare')}</span>
      <select value={kind} onChange={(e) => { setKind(e.target.value); setValue(''); setIndex(-1); }}>
        {kinds.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      {valueInput}
      {value && (kind === 'highlight' || kind === 'color') && <button onClick={() => setValue('')}>{t('ui.formatFind.orice_culoare')}</button>}
      <span className="count">{total ? `${index >= 0 ? index + 1 : '–'} / ${total}` : t('ui.formatFind.nimic_gasit')}</span>
      <button onClick={() => go(-1)} disabled={!ranges.length} title="Anterior">↑</button>
      <button onClick={() => go(1)} disabled={!ranges.length} title={t('ui.formatFind.urmator')}>↓</button>
      <button onClick={onClose} title={t('btn.close')}>✕</button>
    </div>
  );
}
