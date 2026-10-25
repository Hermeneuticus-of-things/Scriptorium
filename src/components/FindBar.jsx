import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { buildRegex } from '../lib/search.js';
import { findRanges, replaceRanges } from '../editor/docSearch.js';

// Last search (Edit › Find › Find Next / Previous / Use Selection for Find), shared by all editors.
export const lastFind = { query: '', opts: { caseSensitive: false, wholeWord: false, regex: false } };

// Next (dir 1) or previous (dir -1) match of the last search after/before the selection, wrapping.
export function findAgain(editor, dir = 1) {
  const re = lastFind.query ? buildRegex({ query: lastFind.query, ...lastFind.opts }) : null;
  if (!editor || editor.isDestroyed || !re) return false;
  const ranges = findRanges(editor.state.doc, re);
  if (!ranges.length) return false;
  const { from, to } = editor.state.selection;
  const r = dir > 0 ? ranges.find((x) => x.from >= to && !(x.from === from && x.to === to)) || ranges[0] : [...ranges].reverse().find((x) => x.to <= from) || ranges[ranges.length - 1];
  editor.chain().focus().setTextSelection({ from: r.from, to: r.to }).scrollIntoView().run();
  return true;
}

// Ctrl+F bar for the current document.
export default function FindBar({ editor, onClose }) {
  const [query, setQuery] = useState(() => {
    const { from, to } = editor.state.selection;
    return from === to ? lastFind.query : editor.state.doc.textBetween(from, to, ' ').slice(0, 80);
  });
  const [replacement, setReplacement] = useState('');
  const [opts, setOpts] = useState(() => ({ ...lastFind.opts }));
  lastFind.query = query;
  lastFind.opts = opts;
  const [index, setIndex] = useState(0);
  const [version, setVersion] = useState(0);
  const input = useRef(null);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
    const bump = () => setVersion((v) => v + 1);
    editor.on('update', bump);
    return () => editor.off('update', bump);
  }, [editor]);

  const re = useMemo(() => buildRegex({ query, ...opts }), [query, opts]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ranges = useMemo(() => (re ? findRanges(editor.state.doc, re) : []), [re, editor, version]);

  const select = (i) => {
    if (!ranges.length) return;
    const k = ((i % ranges.length) + ranges.length) % ranges.length;
    setIndex(k);
    editor.chain().setTextSelection({ from: ranges[k].from, to: ranges[k].to }).scrollIntoView().run();
  };

  const replaceOne = () => {
    if (!ranges.length) return;
    const k = Math.min(index, ranges.length - 1);
    replaceRanges(editor, [ranges[k]], replacement, opts);
    // Positions moved after the replace: select the next match from a fresh search.
    setTimeout(() => {
      const fresh = findRanges(editor.state.doc, re);
      if (!fresh.length) return;
      const j = Math.min(k, fresh.length - 1);
      setIndex(j);
      editor.chain().setTextSelection({ from: fresh[j].from, to: fresh[j].to }).scrollIntoView().run();
    }, 0);
  };

  const toggle = (k) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div className="find-bar" role="search">
      <input
        ref={input}
        placeholder={t('ui.findBar.search')}
        value={query}
        className={query && !re ? 'invalid' : ''}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') select(e.shiftKey ? index - 1 : index + (ranges.length && editor.state.selection.from === ranges[index]?.from ? 1 : 0));
          if (e.key === 'Escape') onClose();
        }}
      />
      <span className="count">{query ? (ranges.length ? `${Math.min(index + 1, ranges.length)}/${ranges.length}` : '0') : ''}</span>
      <button onClick={() => select(index - 1)} disabled={!ranges.length} title={t('ui.findBar.prev')}>↑</button>
      <button onClick={() => select(index + 1)} disabled={!ranges.length} title={t('ui.findBar.next')}>↓</button>
      <button className={opts.caseSensitive ? 'on' : ''} onClick={toggle('caseSensitive')} title={t('ui.findBar.case')}>Aa</button>
      <button className={opts.wholeWord ? 'on' : ''} onClick={toggle('wholeWord')} title={t('ui.advancedSearchDialog.cuvinte_intregi')}>„ab”</button>
      <button className={opts.regex ? 'on' : ''} onClick={toggle('regex')} title={t('ui.advancedSearchDialog.expresie_regulata')}>.*</button>
      <input placeholder={t('ui.advancedSearchDialog.inlocuieste_cu')} value={replacement} onChange={(e) => setReplacement(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} />
      <button onClick={replaceOne} disabled={!ranges.length}>{t('ui.findBar.replace')}</button>
      <button onClick={() => replaceRanges(editor, ranges, replacement, opts)} disabled={!ranges.length}>{t('ui.findBar.all')}</button>
      <button onClick={onClose} title={t('ui.findBar.close')}>×</button>
    </div>
  );
}
