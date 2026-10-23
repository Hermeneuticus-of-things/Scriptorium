import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildRegex } from '../lib/search.js';
import { findRanges, replaceRanges } from '../editor/docSearch.js';

// Ctrl+F bar for the current document.
export default function FindBar({ editor, onClose }) {
  const [query, setQuery] = useState(() => {
    const { from, to } = editor.state.selection;
    return from === to ? '' : editor.state.doc.textBetween(from, to, ' ').slice(0, 80);
  });
  const [replacement, setReplacement] = useState('');
  const [opts, setOpts] = useState({ caseSensitive: false, wholeWord: false, regex: false });
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
    replaceRanges(editor, [ranges[k]], replacement);
    setTimeout(() => select(k), 0);
  };

  const toggle = (k) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div className="find-bar" role="search">
      <input
        ref={input}
        placeholder="Caută în document"
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
      <button onClick={() => select(index - 1)} disabled={!ranges.length} title="Anterior (Shift+Enter)">↑</button>
      <button onClick={() => select(index + 1)} disabled={!ranges.length} title="Următor (Enter)">↓</button>
      <button className={opts.caseSensitive ? 'on' : ''} onClick={toggle('caseSensitive')} title="Majuscule exacte">Aa</button>
      <button className={opts.wholeWord ? 'on' : ''} onClick={toggle('wholeWord')} title="Cuvinte întregi">„ab”</button>
      <button className={opts.regex ? 'on' : ''} onClick={toggle('regex')} title="Expresie regulată">.*</button>
      <input placeholder="Înlocuiește cu" value={replacement} onChange={(e) => setReplacement(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} />
      <button onClick={replaceOne} disabled={!ranges.length}>Înlocuiește</button>
      <button onClick={() => replaceRanges(editor, ranges, replacement)} disabled={!ranges.length}>Toate</button>
      <button onClick={onClose} title="Închide (Esc)">×</button>
    </div>
  );
}
