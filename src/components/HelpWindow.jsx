// Help viewer: manual with table of contents, full-text search, history, and
// generated references (shortcuts, Compile placeholders, syntax, Script Mode).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLanguage, t } from '../lib/i18n.js';
import { getManual, shortcutRows, placeholderRows, syntaxRows, scriptRows } from '../help/reference.js';
import { buildIndex, searchManual, resolveTopic, terms, fold, CONTEXT_TOPICS } from '../help/helpSearch.js';

const UI = {
  ro: {
    title: 'Ajutor Scribner', manual: 'Manual', shortcuts: 'Scurtături', placeholders: 'Placeholders', syntax: 'Sintaxă',
    search: 'Caută în manual…', results: 'Rezultate', none: 'Niciun rezultat.', back: 'Înapoi', forward: 'Înainte', close: 'Închide',
    tutorial: 'Pornește tutorialul', command: 'Comandă', key: 'Scurtătură', fixed: 'Taste fixe (editor și binder)', code: 'Cod', meaning: 'Ce înseamnă',
    custom: 'personalizată', scriptMode: 'Script Mode: Tab și Enter', element: 'Element', tab: 'Tab →', enter: 'Enter →', def: 'Element implicit',
    phNote: 'Placeholder-ele se scriu în text, în prefixe/sufixe de secțiune, în antet și subsol. Un cod necunoscut rămâne neschimbat.',
  },
  en: {
    title: 'Scribner Help', manual: 'Manual', shortcuts: 'Shortcuts', placeholders: 'Placeholders', syntax: 'Syntax',
    search: 'Search the manual…', results: 'Results', none: 'No results.', back: 'Back', forward: 'Forward', close: 'Close',
    tutorial: 'Start the tutorial', command: 'Command', key: 'Shortcut', fixed: 'Fixed keys (editor and binder)', code: 'Code', meaning: 'Meaning',
    custom: 'custom', scriptMode: 'Script Mode: Tab and Enter', element: 'Element', tab: 'Tab →', enter: 'Enter →', def: 'Default element',
    phNote: 'Placeholders work in the text, in section prefixes/suffixes, headers and footers. Unknown codes are left unchanged.',
  },
};

const TABS = ['manual', 'shortcuts', 'placeholders', 'syntax'];

// Wraps every occurrence of the search terms in <mark> inside the rendered section.
function highlight(root, ts) {
  if (!root || !ts.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    let folded = '';
    for (const ch of text) folded += fold(ch).charAt(0) || ch;
    const ranges = [];
    for (const t of ts) {
      let i = folded.indexOf(t);
      while (i >= 0) {
        ranges.push([i, i + t.length]);
        i = folded.indexOf(t, i + t.length);
      }
    }
    if (!ranges.length) continue;
    ranges.sort((a, b) => a[0] - b[0]);
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const [a, b] of ranges) {
      if (a < pos) continue;
      frag.appendChild(document.createTextNode(text.slice(pos, a)));
      const m = document.createElement('mark');
      m.textContent = text.slice(a, b);
      frag.appendChild(m);
      pos = b;
    }
    frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  }
}

export default function HelpWindow({ initialTopic, initialTab = 'manual', onClose, onStartTutorial, settings }) {
  const lang = getLanguage() === 'en' ? 'en' : 'ro';
  const L = UI[lang];
  const manual = useMemo(() => getManual(lang), [lang]);
  const index = useMemo(() => buildIndex(manual), [manual]);
  const first = useMemo(() => {
    const topic = CONTEXT_TOPICS[initialTopic] || initialTopic;
    return resolveTopic(manual, topic) || { chapterId: manual[0].id, sectionId: manual[0].sections[0].id };
  }, [manual, initialTopic]);

  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : 'manual');
  const [history, setHistory] = useState({ stack: [first], i: 0 });
  const [query, setQuery] = useState('');
  const [mark, setMark] = useState([]);
  const contentRef = useRef(null);
  const searchRef = useRef(null);

  const loc = history.stack[history.i];
  const chapter = manual.find((c) => c.id === loc.chapterId) || manual[0];
  const results = useMemo(() => (query.trim() ? searchManual(index, query) : []), [index, query]);

  const go = (target, ts = []) => {
    setTab('manual');
    setMark(ts);
    setHistory((h) => {
      const cur = h.stack[h.i];
      if (cur.chapterId === target.chapterId && cur.sectionId === target.sectionId) return h;
      const stack = [...h.stack.slice(0, h.i + 1), target];
      return { stack, i: stack.length - 1 };
    });
    // Same location: still scroll to the section.
    requestAnimationFrame(() => document.getElementById(`help-${target.sectionId}`)?.scrollIntoView({ block: 'start' }));
  };
  const back = () => setHistory((h) => (h.i > 0 ? { ...h, i: h.i - 1 } : h));
  const forward = () => setHistory((h) => (h.i < h.stack.length - 1 ? { ...h, i: h.i + 1 } : h));

  useEffect(() => {
    if (tab !== 'manual') return;
    const el = contentRef.current;
    if (!el) return;
    highlight(el, mark);
    const target = loc.sectionId && document.getElementById(`help-${loc.sectionId}`);
    if (target) target.scrollIntoView({ block: 'start' });
    else el.scrollTop = 0;
  }, [tab, loc, mark, chapter]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (query) setQuery('');
        else onClose?.();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        forward();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const shortcuts = useMemo(() => shortcutRows(lang, settings), [lang, settings]);
  const scripts = useMemo(() => scriptRows(), []);

  return (
    <div className="help-backdrop" onClick={onClose}>
      <div className="help-window" role="dialog" aria-label={L.title} onClick={(e) => e.stopPropagation()}>
        <header className="help-head">
          <button type="button" onClick={back} disabled={history.i === 0} title={`${L.back} (Alt+←)`} aria-label={L.back}>‹</button>
          <button type="button" onClick={forward} disabled={history.i >= history.stack.length - 1} title={`${L.forward} (Alt+→)`} aria-label={L.forward}>›</button>
          <strong className="help-title">{L.title}</strong>
          <nav className="help-tabs" role="tablist">
            {TABS.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                {L[id]}
              </button>
            ))}
          </nav>
          <span className="help-spacer" />
          {onStartTutorial && (
            <button type="button" onClick={onStartTutorial}>{L.tutorial}</button>
          )}
          <button type="button" onClick={onClose} aria-label={L.close} title={`${L.close} (Esc)`}>✕</button>
        </header>

        <div className="help-body">
          <aside className="help-toc">
            <input ref={searchRef} type="search" className="help-search" placeholder={L.search} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={L.search} />
            {query.trim() ? (
              <div className="help-results">
                <div className="help-results-head">{L.results}: {results.length}</div>
                {!results.length && <p className="help-muted">{L.none}</p>}
                {results.map((r) => (
                  <button key={r.sectionId} type="button" className="help-result" onClick={() => go({ chapterId: r.chapterId, sectionId: r.sectionId }, terms(query))}>
                    <span className="help-result-title">{r.title}</span>
                    <span className="help-result-chapter">{r.chapterTitle}</span>
                    <span className="help-result-snippet" dangerouslySetInnerHTML={{ __html: r.snippet }} />
                  </button>
                ))}
              </div>
            ) : (
              <ol className="help-chapters">
                {manual.map((c) => (
                  <li key={c.id} className={c.id === chapter.id ? 'open' : ''}>
                    <button type="button" className="help-chapter" onClick={() => go({ chapterId: c.id, sectionId: c.sections[0].id })}>{c.title}</button>
                    {c.id === chapter.id && (
                      <ul>
                        {c.sections.map((s) => (
                          <li key={s.id}>
                            <button type="button" className={s.id === loc.sectionId ? 'help-section on' : 'help-section'} onClick={() => go({ chapterId: c.id, sectionId: s.id })}>{s.title}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </aside>

          <main className="help-content" ref={contentRef}>
            {tab === 'manual' && (
              <article key={`${chapter.id}:${mark.join(' ')}:${history.i}`}>
                <h1>{chapter.title}</h1>
                {chapter.sections.map((s) => (
                  <section key={s.id} id={`help-${s.id}`} className={s.id === loc.sectionId ? 'current' : ''}>
                    <h2>{s.title}</h2>
                    <div dangerouslySetInnerHTML={{ __html: s.html }} />
                  </section>
                ))}
              </article>
            )}

            {tab === 'shortcuts' && (
              <article>
                <h1>{L.shortcuts}</h1>
                <table className="help-table">
                  <thead><tr><th>{L.command}</th><th>{L.key}</th></tr></thead>
                  <tbody>
                    {shortcuts.filter((r) => r.configurable).map((r) => (
                      <tr key={r.id}>
                        <td>{r.label}</td>
                        <td><kbd>{r.key || '—'}</kbd>{r.key !== r.defaultKey && <span className="help-muted"> ({L.custom})</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h2>{L.fixed}</h2>
                <table className="help-table">
                  <tbody>
                    {shortcuts.filter((r) => !r.configurable).map((r) => (
                      <tr key={r.key}><td>{r.label}</td><td><kbd>{r.key}</kbd></td></tr>
                    ))}
                  </tbody>
                </table>
              </article>
            )}

            {tab === 'placeholders' && (
              <article>
                <h1>{L.placeholders}</h1>
                <p>{L.phNote}</p>
                <table className="help-table">
                  <thead><tr><th>{L.code}</th><th>{L.meaning}</th></tr></thead>
                  <tbody>
                    {placeholderRows(lang).map((r) => (
                      <tr key={r.code}><td><code>{r.code}</code></td><td>{r.text}</td></tr>
                    ))}
                  </tbody>
                </table>
              </article>
            )}

            {tab === 'syntax' && (
              <article>
                <h1>{L.syntax}</h1>
                {[['markdown', 'Markdown'], ['multimarkdown', 'MultiMarkdown'], ['fountain', 'Fountain']].map(([kind, name]) => (
                  <section key={kind}>
                    <h2>{name}</h2>
                    <table className="help-table">
                      <tbody>
                        {syntaxRows(kind, lang).map((r) => (
                          <tr key={r.code}><td><code>{r.code}</code></td><td>{r.text}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
                <h2>{L.scriptMode}</h2>
                {scripts.map((f) => (
                  <section key={f.id}>
                    <h3>{t(`ui.scriptFormat.${f.id}`)}</h3>
                    <p className="help-muted">{L.def}: {f.defaultElement}</p>
                    <table className="help-table">
                      <thead><tr><th>{L.element}</th><th>{L.tab}</th><th>{L.enter}</th></tr></thead>
                      <tbody>
                        {f.elements.map((e) => (
                          <tr key={e.id}><td>{e.label}{e.upper ? (getLanguage() === 'en' ? ' (CAPS)' : ' (MAJ.)') : ''}</td><td>{e.tab}</td><td>{e.enter}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
              </article>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
