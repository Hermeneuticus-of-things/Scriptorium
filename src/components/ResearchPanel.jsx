import React, { useEffect, useMemo, useRef, useState } from 'react';
import { citationParts } from '../lib/aiSession.js';
import { DEFAULT_SCOPE, noteTitle, scopeChips, toggleScope, turnToInsertHtml, turnToNoteHtml, turnToPlain, visibleAnswer } from '../lib/researchChat.js';
import '../ai.css';
import { t } from '../lib/i18n.js';

const kindLabels = () => ({ docs: t('ui.researchChat.manuscris'), research: t('ui.advancedSearchDialog.cercetare'), notes: t('ui.advancedSearchDialog.note') });
const kindName = (k) => (k === 'notes' ? t('ui.researchChat.k_note') : k === 'research' ? t('ui.researchChat.k_cercetare') : t('ui.researchChat.k_manuscris'));

const lsGet = (k, def) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};

// Folders and documents a source can be narrowed to (no trash), depth-limited, with indentation.
function sourceRows(tree) {
  const rows = [];
  const visit = (nodes, depth) => {
    for (const n of nodes || []) {
      if (n.root === 'trash') continue;
      if (!n.root) rows.push({ id: n.id, title: n.title, depth, folder: n.type === 'folder' || Boolean(n.children?.length) });
      if (depth < 3) visit(n.children, n.root ? depth : depth + 1);
    }
  };
  visit(tree, 0);
  return rows;
}
function findTitle(tree, id) {
  for (const n of tree || []) {
    if (n.id === id) return n.title;
    const r = findTitle(n.children, id);
    if (r) return r;
  }
  return '';
}

// Citations [n] of an answer as buttons that open the passage's document.
function Answer({ text, passages, onCite }) {
  return (
    <div className="research-answer" style={{ whiteSpace: 'pre-wrap' }}>
      {citationParts(text, passages.length).map((p, i) =>
        p.cite ? (
          <button key={i} className="link ai-cite" title={passages[p.cite - 1]?.title} onClick={() => onCite(p.cite)}>
            [{p.cite}]
          </button>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ),
      )}
    </div>
  );
}

// NotebookLM-style research panel: local retrieval over the project (no AI) and, with AI on,
// a conversation with follow-ups over the chosen sources, saved per project.
export default function ResearchPanel({ api, dir, project = null, aiEnabled, onOpen, onClose, aiLabel = '', request = null, onSaveNote, onInsert, onAddSources, onImportWeb }) {
  const tree = project?.tree || [];
  const [q, setQ] = useState('');
  const [scope, setScopeState] = useState(() => lsGet(`scribner-research-scope:${dir}`, DEFAULT_SCOPE));
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null); // { message, retry }
  const [progress, setProgress] = useState(null);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [live, setLive] = useState(null); // { q, text } while an answer streams
  const [showSources, setShowSources] = useState(false);
  const [paste, setPaste] = useState(null); // { title, text }
  const [insertMode, setInsertMode] = useState(() => lsGet('scribner-research-insert', 'footnotes'));
  const [toast, setToast] = useState('');
  const runRef = useRef(null);
  const endRef = useRef(null);
  const supported = Boolean(api.ragQuery);
  const canChat = Boolean(aiEnabled && (api.ragChat || api.ragAsk));
  const chat = chats.find((c) => c.id === chatId) || null;
  const turns = chat ? chat.turns : [];
  const rows = useMemo(() => sourceRows(tree), [tree]);

  const setScope = (s) => {
    setScopeState(s);
    lsSet(`scribner-research-scope:${dir}`, s);
  };

  useEffect(() => {
    if (!api.onRagProgress) return undefined;
    return api.onRagProgress((p) => {
      if (p.dir && p.dir !== dir) return;
      setProgress(p.phase === 'done' ? { done: true, chunks: p.chunks, docs: p.docs } : p);
    });
  }, [api, dir]);

  // Saved conversations of this project; the newest one is reopened.
  useEffect(() => {
    if (!api.ragChats || !dir) return;
    let alive = true;
    api
      .ragChats(dir)
      .then((list) => {
        if (!alive) return;
        setChats(list || []);
        if (list && list[0]) {
          setChatId(list[0].id);
          if (list[0].scope) setScopeState(list[0].scope);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [api, dir]);

  // Streamed answer text of the running question.
  useEffect(() => {
    if (!api.onAiDelta) return undefined;
    return api.onAiDelta(({ runId, delta }) => {
      if (runId && runId === runRef.current) setLive((l) => (l ? { ...l, text: l.text + delta } : l));
    });
  }, [api]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [turns.length, live && live.text]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const wrap = (label, fn) => {
    // Click handlers pass an event; only a string is a query.
    const go = async (arg) => {
      const query = typeof arg === 'string' ? arg : undefined;
      setBusy(label);
      setError(null);
      try {
        await fn(query);
      } catch (e) {
        setError({ message: e.message, retry: () => go(query) });
      } finally {
        setBusy('');
        setLive(null);
        runRef.current = null;
      }
    };
    return go;
  };

  const searchLabel = t('ui.researchChat.caut');
  // `query` overrides the typed text when a search comes from the editor's context menu.
  const search = wrap(searchLabel, async (query = q) => {
    if (!query.trim()) return;
    const kinds = scope.ids.length ? undefined : scope.kinds.length ? scope.kinds : undefined;
    setResults(await api.ragQuery(dir, query, { k: 10, kinds, scope }));
  });

  const ask = wrap(t('ui.researchPanel.x_formuleaza_raspunsul', { v0: aiLabel || t('ui.researchChat.modelul_ai') }), async (query = q) => {
    const question = query.trim();
    if (!question) return;
    if (!api.ragChat) {
      // Older back ends: single question, no history.
      const res = await api.ragAsk(dir, question, { k: 6 });
      const turn = { q: question, answer: res.answer, passages: res.passages, followups: [], at: new Date().toISOString() };
      const c = chat ? { ...chat, turns: [...chat.turns, turn] } : { id: `local-${Date.now()}`, title: question, turns: [turn] };
      setChats((list) => [c, ...list.filter((x) => x.id !== c.id)]);
      setChatId(c.id);
      setQ('');
      return;
    }
    const runId = `rc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    runRef.current = runId;
    setLive({ q: question, text: '' });
    setQ('');
    try {
      const res = await api.ragChat(dir, question, { chatId: chat ? chat.id : null, scope, runId, k: 6 });
      setChats((list) => [res.chat, ...list.filter((x) => x.id !== res.chat.id)]);
      setChatId(res.chat.id);
    } catch (e) {
      setQ(question);
      throw e;
    }
  });

  useEffect(() => {
    if (!request || !request.q) return;
    setQ(request.q);
    if (request.mode === 'ask' && canChat) ask(request.q);
    else if (supported) search(request.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request && request.n]);

  const searching = busy === searchLabel || busy === t('ui.researchChat.reindexez');
  const asking = Boolean(busy) && !searching;
  useEffect(() => {
    if (!asking || !api.cancelAi) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') api.cancelAi().catch(() => {});
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [asking, api]);

  const openPassage = (p) => p && onOpen && onOpen(p.docId, p);
  const rebuild = wrap(t('ui.researchChat.reindexez'), () => api.ragBuild(dir));
  const newChat = () => {
    setChatId(null);
    setResults([]);
    setError(null);
  };
  const removeChat = async () => {
    if (!chat || !window.confirm(t('ui.researchChat.stergi_conversatia'))) return;
    if (api.ragChatDelete) await api.ragChatDelete(dir, chat.id).catch(() => {});
    setChats((list) => list.filter((c) => c.id !== chat.id));
    setChatId(null);
  };

  const saveNote = async (turn) => {
    if (!onSaveNote) return;
    await onSaveNote({ title: noteTitle(turn.q), html: turnToNoteHtml(turn, { sourcesLabel: t('ui.researchChat.surse') }) });
    setToast(t('ui.researchChat.salvat_ca_nota'));
  };
  const insert = (turn) => {
    if (!onInsert) return;
    const ok = onInsert(turnToInsertHtml(turn, insertMode));
    setToast(ok === false ? t('ui.researchChat.deschide_un_document') : t('ui.researchChat.inserat'));
  };
  const copy = async (turn) => {
    const text = turnToPlain(turn, { sourcesLabel: t('ui.researchChat.surse') });
    try {
      if (api.copyText) await api.copyText(text);
      else await navigator.clipboard.writeText(text);
      setToast(t('ui.researchChat.copiat'));
    } catch {
      setToast(t('ui.researchChat.nu_am_putut_copia'));
    }
  };

  const importFiles = wrap(t('ui.researchChat.import_surse'), async () => {
    if (!api.ragImportFiles || !onAddSources) return;
    const list = await api.ragImportFiles(dir);
    if (!list || !list.length) return;
    const good = list.filter((s) => !s.empty);
    if (good.length) await onAddSources(good);
    const bad = list.filter((s) => s.empty).map((s) => s.title);
    setToast(t('ui.researchChat.surse_adaugate_x', { n: good.length }) + (bad.length ? ` ${t('ui.researchChat.fara_text_x', { list: bad.join(', ') })}` : ''));
  });
  const importWeb = wrap(t('ui.researchChat.import_surse'), async () => {
    if (!onImportWeb) return;
    if (await onImportWeb()) setToast(t('ui.researchChat.surse_adaugate_x', { n: 1 }));
  });
  const addPasted = wrap(t('ui.researchChat.import_surse'), async () => {
    if (!paste || !paste.text.trim() || !onAddSources) return;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = paste.text
      .replace(/\r\n?/g, '\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
    await onAddSources([{ title: paste.title.trim() || t('ui.researchChat.text_lipit'), html }]);
    setPaste(null);
    setToast(t('ui.researchChat.surse_adaugate_x', { n: 1 }));
  });

  if (!supported) {
    return (
      <aside className="ai-panel research-panel">
        <h3>{t('ui.researchPanel.cercetare_rag')}</h3>
        <p className="muted">{t('ui.researchPanel.cautarea_in_proiect_cu_index')}</p>
        {onClose && <button onClick={onClose}>{t('btn.close')}</button>}
      </aside>
    );
  }

  const chips = scopeChips(scope, (id) => findTitle(tree, id), kindLabels());
  const allSources = !scope.kinds.length && !scope.ids.length;

  return (
    <aside className="ai-panel research-panel research-chat">
      <h3>{t('ui.researchPanel.cercetare_in_proiect')}</h3>
      <p className="muted">{canChat ? t('ui.researchChat.intro_ai') : t('ui.researchPanel.cauta_pasaje_in_manuscris_note')}</p>

      <div className="research-scope" aria-label={t('ui.researchChat.surse_folosite')}>
        <span className="muted small">{t('ui.researchChat.surse')}:</span>{' '}
        {allSources && <span className="chip research-chip">{t('ui.researchChat.tot_proiectul')}</span>}
        {chips.map((c) => (
          <span key={`${c.type}:${c.id}`} className="chip research-chip" data-scope={c.id}>
            {c.label}
            <button className="link" aria-label={t('ui.researchChat.scoate_x', { label: c.label })} onClick={() => setScope(toggleScope(scope, c.type, c.id))}>
              ×
            </button>
          </span>
        ))}{' '}
        <button className="link research-sources-toggle" aria-expanded={showSources} onClick={() => setShowSources((v) => !v)}>
          {showSources ? t('ui.researchChat.ascunde_sursele') : t('ui.researchChat.alege_sursele')}
        </button>
      </div>

      {showSources && (
        <div className="research-sources">
          <fieldset>
            <legend>{t('ui.researchChat.ce_poate_folosi_ai_ul')}</legend>
            {['docs', 'research', 'notes'].map((k) => (
              <label key={k} className="research-kind">
                <input type="checkbox" checked={scope.kinds.includes(k)} onChange={() => setScope(toggleScope(scope, 'kind', k))} /> {kindLabels()[k]}
              </label>
            ))}
          </fieldset>
          {rows.length > 0 && (
            <details>
              <summary>{t('ui.researchChat.doar_anumite_documente')}</summary>
              <ul className="research-tree">
                {rows.map((r) => (
                  <li key={r.id} style={{ paddingLeft: `${r.depth}em` }}>
                    <label>
                      <input type="checkbox" checked={scope.ids.includes(r.id)} onChange={() => setScope(toggleScope(scope, 'id', r.id))} />{' '}
                      {r.folder ? <strong>{r.title || t('ui.app.fara_titlu')}</strong> : r.title || t('ui.app.fara_titlu')}
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="ai-actions">
            {api.ragImportFiles && onAddSources && <button onClick={importFiles} disabled={Boolean(busy)}>{t('ui.researchChat.din_fisiere')}</button>}
            {onImportWeb && <button onClick={importWeb} disabled={Boolean(busy)}>{t('ui.researchChat.pagina_web')}</button>}
            {onAddSources && <button onClick={() => setPaste(paste ? null : { title: '', text: '' })}>{t('ui.researchChat.lipeste_text')}</button>}
            <button onClick={rebuild} disabled={Boolean(busy)} title={t('ui.researchPanel.reconstruieste_indexul_dupa_modificari_mari')}>
              {t('ui.researchPanel.reindexeaza')}
            </button>
          </div>
          {paste && (
            <div className="research-paste">
              <input type="text" value={paste.title} placeholder={t('ui.researchChat.titlul_sursei')} onChange={(e) => setPaste({ ...paste, title: e.target.value })} />
              <textarea rows={5} value={paste.text} placeholder={t('ui.researchChat.lipeste_aici')} onChange={(e) => setPaste({ ...paste, text: e.target.value })} />
              <button onClick={addPasted} disabled={!paste.text.trim()}>{t('ui.researchChat.adauga_sursa')}</button>
            </div>
          )}
          {aiEnabled && (
            <label className="small">
              {t('ui.researchChat.citari_la_inserare')}{' '}
              <select
                value={insertMode}
                onChange={(e) => {
                  setInsertMode(e.target.value);
                  lsSet('scribner-research-insert', e.target.value);
                }}
              >
                <option value="footnotes">{t('ui.researchChat.note_de_subsol')}</option>
                <option value="links">{t('ui.researchChat.legaturi')}</option>
              </select>
            </label>
          )}
        </div>
      )}

      {canChat && (
        <div className="research-chatbar">
          <select value={chatId || ''} onChange={(e) => setChatId(e.target.value || null)} aria-label={t('ui.researchChat.conversatii')}>
            <option value="">{t('ui.researchChat.conversatie_noua_opt')}</option>
            {chats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <button className="research-new" onClick={newChat} disabled={Boolean(busy)}>{t('ui.researchChat.conversatie_noua')}</button>
          {chat && (
            <button className="link" onClick={removeChat} disabled={Boolean(busy)}>
              {t('ui.researchChat.sterge')}
            </button>
          )}
        </div>
      )}

      {canChat && (turns.length > 0 || live) && (
        <ol className="research-turns">
          {turns.map((turn, ti) => (
            <li key={`${turn.at}-${ti}`} className="research-turn">
              <p className="research-q">
                <strong>{turn.q}</strong>
              </p>
              <Answer text={turn.answer} passages={turn.passages || []} onCite={(n) => openPassage(turn.passages[n - 1])} />
              {(turn.passages || []).length > 0 && (
                <details className="research-turn-sources">
                  <summary className="muted small">{t('ui.researchChat.surse_x', { n: turn.passages.length })}</summary>
                  <ol>
                    {turn.passages.map((p, i) => (
                      <li key={`${p.docId}:${p.chunk}:${i}`}>
                        <button className="link" onClick={() => openPassage(p)}>
                          [{i + 1}] {p.title || t('ui.app.fara_titlu')}
                        </button>{' '}
                        <span className="muted small">{kindName(p.kind)}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <div className="ai-actions research-turn-actions">
                {onSaveNote && <button onClick={() => saveNote(turn).catch((e) => setError({ message: e.message }))}>{t('ui.researchChat.salveaza_ca_nota')}</button>}
                {onInsert && <button onClick={() => insert(turn)}>{t('ui.researchChat.insereaza_in_document')}</button>}
                <button onClick={() => copy(turn)}>{t('ui.researchChat.copiaza')}</button>
              </div>
              {ti === turns.length - 1 && !live && (turn.followups || []).length > 0 && (
                <div className="research-followups">
                  {turn.followups.map((f) => (
                    <button key={f} className="chip research-followup" disabled={Boolean(busy)} onClick={() => ask(f)}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
          {live && (
            <li className="research-turn research-live" aria-live="polite">
              <p className="research-q">
                <strong>{live.q}</strong>
              </p>
              <div className="research-answer" style={{ whiteSpace: 'pre-wrap' }}>
                {visibleAnswer(live.text) || '…'}
              </div>
            </li>
          )}
          <li ref={endRef} aria-hidden="true" style={{ listStyle: 'none' }} />
        </ol>
      )}

      <form
        className="research-ask"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && canChat && e.target.tagName === 'TEXTAREA') {
            e.preventDefault();
            // Enter while an answer is still coming would start a second question without the
            // first one in its history (and a second new conversation).
            if (!busy && !e.nativeEvent.isComposing) ask();
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (canChat) ask();
          else search();
        }}
      >
        {canChat ? (
          <textarea
            rows={2}
            value={q}
            aria-label={t('ui.researchChat.intrebarea')}
            placeholder={turns.length ? t('ui.researchChat.intrebare_de_continuare') : t('ui.researchChat.ex_intrebare')}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        ) : (
          <input type="search" value={q} placeholder={t('ui.researchChat.ex_cautare')} onChange={(e) => setQ(e.target.value)} autoFocus />
        )}
      </form>
      <div className="ai-actions">
        {canChat && (
          <button className="research-ask-btn" onClick={ask} disabled={Boolean(busy) || !q.trim()}>
            {t('ui.researchPanel.intreaba_ai_ul')}
          </button>
        )}
        <button onClick={search} disabled={Boolean(busy) || !q.trim()}>
          {t('ui.advancedSearchDialog.cauta')}
        </button>
        {!showSources && (
          <button onClick={rebuild} disabled={Boolean(busy)} title={t('ui.researchPanel.reconstruieste_indexul_dupa_modificari_mari')}>
            {t('ui.researchPanel.reindexeaza')}
          </button>
        )}
        {onClose && <button onClick={onClose}>{t('btn.close')}</button>}
      </div>
      {busy && (
        <p className="muted">
          {busy}{' '}
          {asking && api.cancelAi && (
            <button className="link" onClick={() => api.cancelAi().catch(() => {})}>
              {t('ui.aiPanel.anuleaza_esc')}
            </button>
          )}
        </p>
      )}
      {toast && (
        <p className="muted research-toast" role="status">
          {toast}
        </p>
      )}
      {progress && !progress.done && progress.total > 0 && <progress max={progress.total} value={progress.done} />}
      {progress && progress.done === true && <p className="muted">{t('ui.researchChat.index_x', { docs: progress.docs, chunks: progress.chunks })}</p>}
      {error && (
        <div className="ai-error" role="alert">
          <span>{error.message}</span>
          {error.retry && (
            <button className="link" onClick={error.retry}>
              {t('ui.aiPanel.reincearca')}
            </button>
          )}
        </div>
      )}
      {results.length > 0 && (
        <>
          <h4>{t('ui.researchChat.pasaje_gasite')}</h4>
          <ol className="research-results">
            {results.map((r, i) => (
              <li key={`${r.kind}:${r.docId}:${r.chunk}:${i}`}>
                <button className="link" onClick={() => openPassage(r)}>
                  [{i + 1}] {r.title || t('ui.app.fara_titlu')}
                </button>{' '}
                <span className="muted">
                  {kindName(r.kind)} · {r.score}
                </span>
                <p>{r.text.length > 400 ? `${r.text.slice(0, 400)}…` : r.text}</p>
              </li>
            ))}
          </ol>
        </>
      )}
      {!busy && !canChat && q && results.length === 0 && !error && <p className="muted">{t('ui.researchPanel.niciun_rezultat_inca_apasa_cauta')}</p>}
    </aside>
  );
}
