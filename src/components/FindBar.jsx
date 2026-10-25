import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { buildDocRegex, clearFindHistory, findRanges, loadFindHistory, pushFindHistory, rangesWithin, replaceRanges } from '../editor/docSearch.js';

// Last search (Edit › Find › Find Next / Previous / Use Selection for Find), shared by all editors.
// mode: 'contains' | 'starts' | 'word'.
export const lastFind = { query: '', opts: { caseSensitive: false, wholeWord: false, regex: false, mode: 'contains', ignoreDiacritics: false } };

const regexFor = (query, opts) => buildDocRegex({ query, ...opts });
const rangesFor = (doc, re, opts) => findRanges(doc, re, { fold: Boolean(opts.ignoreDiacritics) });

// Next (dir 1) or previous (dir -1) match of the last search after/before the selection, wrapping.
export function findAgain(editor, dir = 1) {
  const re = lastFind.query ? regexFor(lastFind.query, lastFind.opts) : null;
  if (!editor || editor.isDestroyed || !re) return false;
  const ranges = rangesFor(editor.state.doc, re, lastFind.opts);
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
    const sel = editor.state.doc.textBetween(from, to, ' ');
    // A long selection is a scope for "in selection", not a query.
    return from === to || sel.length > 80 || sel.includes('\n') ? lastFind.query : sel;
  });
  const [replacement, setReplacement] = useState('');
  const [opts, setOpts] = useState(() => ({ ...lastFind.opts, mode: lastFind.opts.mode || (lastFind.opts.wholeWord ? 'word' : 'contains') }));
  lastFind.query = query;
  lastFind.opts = { ...opts, wholeWord: opts.mode === 'word' };
  const [index, setIndex] = useState(0);
  const [version, setVersion] = useState(0);
  const [history, setHistory] = useState(() => loadFindHistory());
  // Search only in the selection: the range is kept (and moved with edits) while the bar is open.
  const [scope, setScope] = useState(() => {
    const { from, to } = editor.state.selection;
    const sel = editor.state.doc.textBetween(from, to, ' ');
    return from !== to && (sel.length > 80 || sel.includes('\n')) ? { from, to, on: true } : { from, to, on: false };
  });
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const input = useRef(null);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
    const bump = () => setVersion((v) => v + 1);
    const onTr = ({ transaction }) => {
      const s = scopeRef.current;
      if (!transaction.docChanged || !s) return;
      setScope({ ...s, from: transaction.mapping.map(s.from, 1), to: transaction.mapping.map(s.to, -1) });
    };
    editor.on('update', bump);
    editor.on('transaction', onTr);
    return () => {
      editor.off('update', bump);
      editor.off('transaction', onTr);
    };
  }, [editor]);

  const re = useMemo(() => regexFor(query, opts), [query, opts]);
  const ranges = useMemo(
    () => (re ? rangesWithin(rangesFor(editor.state.doc, re, opts), scope.on ? scope : null) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [re, editor, version, opts.ignoreDiacritics, scope.on, scope.from, scope.to],
  );

  const remember = () => setHistory(pushFindHistory(query));

  const select = (i) => {
    if (!ranges.length) return;
    const k = ((i % ranges.length) + ranges.length) % ranges.length;
    setIndex(k);
    remember();
    editor.chain().setTextSelection({ from: ranges[k].from, to: ranges[k].to }).scrollIntoView().run();
  };

  const fresh = () => (re ? rangesWithin(rangesFor(editor.state.doc, re, opts), scopeRef.current.on ? scopeRef.current : null) : []);

  const replaceOne = () => {
    if (!ranges.length) return;
    const k = Math.min(index, ranges.length - 1);
    remember();
    replaceRanges(editor, [ranges[k]], replacement, opts);
    // Positions moved after the replace: select the next match from a fresh search.
    setTimeout(() => {
      const list = fresh();
      if (!list.length) return;
      const j = Math.min(k, list.length - 1);
      setIndex(j);
      editor.chain().setTextSelection({ from: list[j].from, to: list[j].to }).scrollIntoView().run();
    }, 0);
  };

  const toggle = (k) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));
  const toggleScope = () => {
    if (scope.on) setScope((s) => ({ ...s, on: false }));
    else {
      const { from, to } = editor.state.selection;
      if (from === to) return;
      setScope({ from, to, on: true });
    }
    setIndex(0);
  };
  const hasSelection = scope.on || !editor.state.selection.empty;

  return (
    <div className="find-bar" role="search">
      <input
        ref={input}
        placeholder={scope.on ? t('ui.find.inSelectionPh') : t('ui.findBar.search')}
        value={query}
        list="find-bar-history"
        aria-label={t('ui.findBar.search')}
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
      <datalist id="find-bar-history">
        {history.map((h) => <option key={h} value={h} />)}
      </datalist>
      <span className="count">{query ? (ranges.length ? `${Math.min(index + 1, ranges.length)}/${ranges.length}` : '0') : ''}</span>
      <button onClick={() => select(index - 1)} disabled={!ranges.length} title={t('ui.findBar.prev')}>↑</button>
      <button onClick={() => select(index + 1)} disabled={!ranges.length} title={t('ui.findBar.next')}>↓</button>
      <select className="find-mode" aria-label={t('ui.find.mode')} title={t('ui.find.mode')} value={opts.mode} onChange={(e) => setOpts((o) => ({ ...o, mode: e.target.value }))}>
        <option value="contains">{t('ui.find.contains')}</option>
        <option value="starts">{t('ui.find.starts')}</option>
        <option value="word">{t('ui.find.word')}</option>
      </select>
      <button className={opts.caseSensitive ? 'on' : ''} aria-pressed={opts.caseSensitive} onClick={toggle('caseSensitive')} title={t('ui.findBar.case')}>Aa</button>
      <button className={opts.ignoreDiacritics ? 'on' : ''} aria-pressed={Boolean(opts.ignoreDiacritics)} onClick={toggle('ignoreDiacritics')} title={t('ui.find.ignoreDiacritics')}>ă=a</button>
      <button className={opts.regex ? 'on' : ''} aria-pressed={opts.regex} onClick={toggle('regex')} title={t('ui.advancedSearchDialog.expresie_regulata')}>.*</button>
      <button className={scope.on ? 'on' : ''} aria-pressed={scope.on} onClick={toggleScope} disabled={!hasSelection} title={t('ui.find.inSelection')}>⌶</button>
      <input placeholder={t('ui.advancedSearchDialog.inlocuieste_cu')} aria-label={t('ui.advancedSearchDialog.inlocuieste_cu')} value={replacement} onChange={(e) => setReplacement(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} />
      <button onClick={replaceOne} disabled={!ranges.length}>{t('ui.findBar.replace')}</button>
      <button
        onClick={() => {
          remember();
          replaceRanges(editor, ranges, replacement, opts);
        }}
        disabled={!ranges.length}
      >
        {t('ui.findBar.all')}
      </button>
      {history.length > 0 && (
        <button className="link" onClick={() => setHistory(clearFindHistory())} title={t('ui.find.clearHistory')}>
          ⌫
        </button>
      )}
      <button onClick={onClose} title={t('ui.findBar.close')}>×</button>
    </div>
  );
}
