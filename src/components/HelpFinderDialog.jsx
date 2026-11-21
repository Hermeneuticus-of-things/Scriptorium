import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { ARTICLES } from '../lib/help/articles.js';
import { helpSearch, intentOf } from '../lib/help/search.js';

// Help Center omnibox (PS-HELP-001 §3–§5): căutare unificată — articole Help (învățare) +
// Command Finder (comenzi reale, executabile). Cele trei intenții (aflu / găsesc / execut)
// sunt clasificate vizual: secțiunea „Cum se face" vs „Comenzi". Nimic nu se execută fără
// click explicit; comenzile distructive își păstrează confirmările proprii.
export default function HelpFinderDialog({ commands = [], onClose, onRunCommand }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Comenzile reale, mapate la forma de articol ca să treacă prin același motor de căutare.
  const cmdArticles = useMemo(() => commands.map((c) => ({
    id: `cmd:${c.id}`, title: c.label, summary: c.hint || t('helpfinder.runCommand'),
    category: c.group, contentType: 'command', difficulty: '', keywords: [c.group, c.id],
    commandIds: [c.id], shortcut: c.key || '',
  })), [commands]);

  const merged = useMemo(() => [...ARTICLES, ...cmdArticles], [cmdArticles]);
  const { results, weak } = useMemo(() => helpSearch(q, merged, { limit: 14 }), [q, merged]);
  const intent = q.trim() ? intentOf(q) : 'run';

  const run = (r) => {
    if (r.id.startsWith('cmd:')) {
      const c = commands.find((x) => `cmd:${x.id}` === r.id);
      if (c) { onClose(); onRunCommand?.(c); }
    }
    // Articolul: deschide manualul existent la capitolul cel mai apropiat (integrare etapa 4).
    else onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); run(results[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  const articles = results.filter((r) => !r.id.startsWith('cmd:'));
  const cmds = results.filter((r) => r.id.startsWith('cmd:'));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal help-finder" role="dialog" aria-label={t('helpfinder.title')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('helpfinder.title')}</h2>
        <input
          ref={inputRef} className="help-finder-q" type="search" value={q}
          placeholder={t('helpfinder.placeholder')} aria-label={t('helpfinder.placeholder')}
          onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKeyDown}
        />
        <div className="help-finder-results" role="listbox" aria-label={t('helpfinder.results')}>
          {q && !results.length && <p className="muted small">{t('helpfinder.none')}</p>}
          {weak && !!results.length && <p className="muted small">{t('helpfinder.weak')}</p>}
          {articles.length > 0 && <h3 className="small">{t('helpfinder.howto')}</h3>}
          {articles.map((r) => {
            const i = results.indexOf(r);
            return (
              <button type="button" role="option" aria-selected={i === sel} key={r.id}
                className={`help-finder-row${i === sel ? ' on' : ''}`}
                onMouseEnter={() => setSel(i)} onClick={() => run(r)}>
                <span className="help-finder-title">{r.title}</span>
                <span className="muted small"> {r.summary}</span>
              </button>
            );
          })}
          {cmds.length > 0 && <h3 className="small">{t('helpfinder.commands')}</h3>}
          {cmds.map((r) => {
            const i = results.indexOf(r);
            const c = commands.find((x) => `cmd:${x.id}` === r.id);
            return (
              <button type="button" role="option" aria-selected={i === sel} key={r.id}
                className={`help-finder-row${i === sel ? ' on' : ''}`}
                onMouseEnter={() => setSel(i)} onClick={() => run(r)}>
                <span className="help-finder-title">{r.title}</span>
                {c?.key ? <kbd>{c.key}</kbd> : null}
                <span className="muted small"> · {t(`group.${c?.group || ''}`)}</span>
              </button>
            );
          })}
        </div>
        <p className="muted small">{t('helpfinder.hint', { intent })}</p>
      </div>
    </div>
  );
}
