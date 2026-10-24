import React, { useEffect, useMemo, useRef, useState } from 'react';
import { diffWords } from 'diff';
import {
  ROUNDS,
  applyLists,
  autofix,
  cleanModelText,
  htmlToManuscript,
  htmlToParagraphs,
  isSignal,
  lint,
  manuscriptToHtml,
  proposalIsStale,
  reattach,
  repairPrompt,
  roundContext,
  roundPrompt,
  summarize,
  systemPrompt,
} from '../lib/editorial.js';
import { htmlToText } from '../lib/text.js';
import { authorGate, authorParagraphs, hashText, paragraphHash, splitIssues } from '../lib/authorText.js';
import { findNode } from '../lib/tree.js';
import { findCanonDoc, parseCanonIndex, validateCanonIndex } from '../lib/canonIndex.js';
import { providerText } from '../lib/aiSession.js';
import '../ai.css';
import { t, uiLocale } from '../lib/i18n.js';

const LEVELS = () => ([
  ['micro', t('ui.editorialPanel.micro_selectia_paragraful')],
  ['mezzo', t('ui.editorialPanel.mezzo_documentul')],
  ['macro', t('ui.editorialPanel.macro_tot_capitolul_dosarul')],
]);

// Only what the writer may fix blocks: SEMNAL never does, COADA_AUTOR items go to the author.
function blocking(issues, strict) {
  return issues.filter((i) => i.severity === 'GRAVE' || (strict && i.severity === 'MEDIU'));
}

const KIND = { changed: 'ui.editorialPanel.gate_changed', moved: 'ui.editorialPanel.gate_moved', deleted: 'ui.editorialPanel.gate_deleted' };
const short = (s, n = 80) => (String(s || '').length > n ? `${String(s).slice(0, n)}…` : String(s || ''));

export default function EditorialPanel({ api, hasKey, aiEnabled = true, profile: baseProfile, project, dir, editorialLists, node, html, chapter, onJump, onApply, onSelectionText, onOpenSettings, aiLabel = '', aiModel = '', authorEvent }) {
  const [tab, setTab] = useState('rep');
  const [level, setLevel] = useState('mezzo');
  const [maxLoops, setMaxLoops] = useState(3);
  const [strict, setStrict] = useState(false);
  const [rounds, setRounds] = useState(() => new Set(ROUNDS.map((r) => r.id)));
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [proposal, setProposal] = useState(null); // [{id, title, before, after, issuesAfter}]
  const [error, setError] = useState('');
  // Proposal ids the user turned down -> hash of the document text at that moment: a decision
  // expires when the text changes.
  const [rejected, setRejected] = useState(() => new Map());
  const [editing, setEditing] = useState(null); // {id, text, warn412?} author edit of a proposal (I-EDIT part 1)
  const [lastRun, setLastRun] = useState(null);
  const [filter, setFilter] = useState('all');
  // User word lists (Setări → Editorial) and the canonical index (Index_de_Lucru).
  const [lists, setLists] = useState(editorialLists || null);
  const [canonNodes, setCanonNodes] = useState([]);
  const [canonProblems, setCanonProblems] = useState([]);
  useEffect(() => {
    if (editorialLists) return setLists(editorialLists);
    let live = true;
    api?.getSettings?.().then((st) => live && setLists(st?.editorialLists || null)).catch(() => {});
    return () => { live = false; };
  }, [api, editorialLists]);
  const canonDoc = useMemo(() => (project ? findCanonDoc(project.tree) : null), [project]);
  useEffect(() => {
    if (!canonDoc || !api?.readDoc || !dir) return setCanonNodes([]);
    let live = true;
    api.readDoc(dir, canonDoc.id).then((h) => {
      if (!live) return;
      const { nodes, errors } = parseCanonIndex(h || '');
      setCanonNodes(nodes);
      setCanonProblems([...errors.map((e) => ({ severity: 'MEDIU', message: e.message })), ...validateCanonIndex(nodes)]);
    }).catch(() => {});
    return () => { live = false; };
  }, [api, dir, canonDoc]);
  const profile = useMemo(() => (lists ? applyLists(baseProfile, lists) : baseProfile), [baseProfile, lists]);
  const canon = canonNodes.length ? { nodes: canonNodes } : null;

  const others = useMemo(() => chapter.filter((d) => d.id !== node.id), [chapter, node.id]);
  const issues = useMemo(() => lint(html, { profile, otherDocs: others, canon, title: node.title }), [html, profile, others, canon, node.title]);
  // Author text (I-EDIT part 2): paragraphs the writer changed by hand, per document.
  const hashesOf = (id) => new Set(((project && findNode(project.tree, id)) || (id === node.id ? node : null))?.authorHashes || []);
  const ownHashes = useMemo(() => new Set(node.authorHashes || []), [node.authorHashes]);
  const near = useMemo(() => issues.filter(isSignal), [issues]);
  const live = useMemo(() => splitIssues(issues.filter((i) => !isSignal(i)), htmlToParagraphs(html), ownHashes), [issues, html, ownHashes]);
  const writerSide = [...live.toWriter, ...live.neighbours].sort((a, b) => a.paragraph - b.paragraph);
  const sum = summarize(writerSide);
  const shown = writerSide.filter((i) => filter === 'all' || i.severity === filter);
  const ownCount = useMemo(() => authorParagraphs(html, ownHashes).length, [html, ownHashes]);

  const say = (line) => setLog((l) => [...l, line]);
  useEffect(() => {
    setRejected(new Map());
    setEditing(null);
  }, [proposal]);
  // Saves the author makes while a loop runs: one MODIFICARE_AUTOR line per save, and the
  // run's report lists them under „Modificările tale în text”.
  const busyRef = useRef(false);
  busyRef.current = busy;
  const runEdits = useRef([]);
  useEffect(() => {
    if (!authorEvent || !authorEvent.seq || !busyRef.current) return;
    for (const e of authorEvent.events || []) {
      runEdits.current.push(e);
      say(t('ui.editorialPanel.modificare_autor', { title: e.title, lines: e.rows.map((r) => `L${r.line}`).join(', ') }));
    }
  }, [authorEvent]);
  const endReport = () => {
    say(t('ui.editorialPanel.modificarile_tale_in_text'));
    if (!runEdits.current.length) say(t('ui.editorialPanel.nicio_modificare_in_bucla'));
    for (const e of runEdits.current) for (const r of e.rows) say(t('ui.editorialPanel.modificare_rand', { title: e.title, line: r.line, old: short(r.old), new: short(r.new) }));
    runEdits.current = [];
  };
  const fixFor = (H) => (h) => autofix(h, { skip: (p) => H.has(paragraphHash(p)) });
  // HARD gate fraza_autor_atinsa: a result that changes, moves or deletes author text is rejected.
  const gateReport = (gate, prefix) => {
    for (const v of gate.violations) say(`${prefix}${t('ui.editorialPanel.respins_fraza_autor_atinsa', { line: v.line, kind: t(KIND[v.kind]), text: short(v.text, 60) })}`);
  };
  // Esc cancels a running pass.
  useEffect(() => {
    if (!busy || !api.cancelAi) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') api.cancelAi().catch(() => {});
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [busy, api]);

  const ai = async (prompt, effort = 'high') => {
    const res = await api.runAi({ action: 'editorial', system: systemPrompt(profile), prompt, effort });
    return cleanModelText(res.text);
  };

  // One document: repair -> re-verify loop until no blocking issues or maxLoops.
  // Author paragraphs are never rewritten: issues on them go to COADA_AUTOR, issues next to them
  // go to the writer with a note, and every result is checked by authorGate.
  const repairLoop = async (doc, otherDocs) => {
    const H = hashesOf(doc.id);
    const fix = fixFor(H);
    let current = fix(doc.html);
    let found = lint(current, { profile, otherDocs });
    const writer = () => {
      const sp = splitIssues(found.filter((i) => !isSignal(i)), htmlToParagraphs(current), H);
      return { list: [...sp.toWriter, ...sp.neighbours], toAuthor: sp.toAuthor };
    };
    let w = writer();
    const violations = [];
    say(t('ui.editorialPanel.x_x_grave_x_medii', { title: doc.title, GRAVE: summarize(w.list).GRAVE, MEDIU: summarize(w.list).MEDIU }));
    for (let loop = 1; loop <= maxLoops && blocking(w.list, strict).length; loop++) {
      const md = htmlToManuscript(current);
      const fixed = await ai(repairPrompt(md, w.list.filter((i) => i.severity !== 'MINOR'), level, { authorText: authorParagraphs(current, H) }), 'high');
      const next = fix(reattach(current, manuscriptToHtml(fixed)));
      const gate = authorGate(current, next, H);
      if (!gate.ok) {
        say(t('ui.editorialPanel.bucla_x_respinsa', { loop }));
        gateReport(gate, '    ');
        violations.push(...gate.violations);
        break;
      }
      current = next;
      found = lint(current, { profile, otherDocs });
      w = writer();
      const s = summarize(w.list);
      say(t('ui.editorialPanel.bucla_x_x_grave_x_2', { loop: loop, GRAVE: s.GRAVE, MEDIU: s.MEDIU, MINOR: s.MINOR }));
    }
    if (blocking(w.list, strict).length) say(t('ui.editorialPanel.raman_x_probleme_blocante_dupa', { length: blocking(w.list, strict).length, maxLoops: maxLoops }));
    else say(t('ui.editorialPanel.reverificare_curata'));
    if (w.toAuthor.length) say(t('ui.editorialPanel.coada_autor_x', { length: w.toAuthor.length }));
    return { current, found, toAuthor: w.toAuthor, violations };
  };

  const runRep = async () => {
    setLastRun(() => runRep);
    runEdits.current = [];
    busyRef.current = true;
    setBusy(true);
    setError('');
    setLog([]);
    setProposal(null);
    try {
      if (level === 'micro') {
        const sel = onSelectionText();
        if (!sel) throw new Error(t('ui.editorialPanel.selecteaza_un_fragment_in_editor'));
        const selHtml = manuscriptToHtml(sel);
        const H = ownHashes;
        const fix = fixFor(H);
        const writerOf = (h, list) => {
          const sp = splitIssues(list.filter((i) => !isSignal(i)), htmlToParagraphs(h), H);
          return [...sp.toWriter, ...sp.neighbours];
        };
        const found = lint(selHtml, { profile });
        say(t('ui.editorialPanel.selectie_x_grave_x_medii', { GRAVE: summarize(writerOf(selHtml, found)).GRAVE, MEDIU: summarize(writerOf(selHtml, found)).MEDIU }));
        let current = selHtml;
        let f = found;
        const violations = [];
        for (let loop = 1; loop <= maxLoops && blocking(writerOf(current, f), strict).length; loop++) {
          const fixed = await ai(repairPrompt(htmlToManuscript(current), writerOf(current, f), 'micro', { authorText: authorParagraphs(current, H) }), 'medium');
          const next = fix(manuscriptToHtml(fixed));
          const gate = authorGate(current, next, H);
          if (!gate.ok) {
            say(t('ui.editorialPanel.bucla_x_respinsa', { loop }));
            gateReport(gate, '    ');
            violations.push(...gate.violations);
            break;
          }
          current = next;
          f = lint(current, { profile });
          say(t('ui.editorialPanel.bucla_x_x_grave_x', { loop: loop, GRAVE: summarize(writerOf(current, f)).GRAVE, MEDIU: summarize(writerOf(current, f)).MEDIU }));
        }
        setProposal([{ id: node.id, title: t('ui.editorialPanel.x_selectie', { title: node.title }), before: selHtml, after: current, issuesAfter: writerOf(current, f), selection: true, base: html, selText: sel, violations }]);
      } else if (level === 'mezzo') {
        const { current, found, toAuthor, violations } = await repairLoop({ id: node.id, title: node.title, html }, others);
        setProposal([{ id: node.id, title: node.title, before: html, after: current, issuesAfter: found, toAuthor, violations }]);
      } else {
        const out = [];
        for (const doc of chapter) {
          const rest = chapter.filter((d) => d.id !== doc.id);
          const { current, found, toAuthor, violations } = await repairLoop(doc, rest);
          out.push({ id: doc.id, title: doc.title, before: doc.html, after: current, issuesAfter: found, toAuthor, violations });
        }
        setProposal(out);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      endReport();
      busyRef.current = false;
      setBusy(false);
    }
  };

  const runEdit = async () => {
    setLastRun(() => runEdit);
    runEdits.current = [];
    busyRef.current = true;
    setBusy(true);
    setError('');
    setLog([]);
    setProposal(null);
    try {
      const targets = level === 'macro' ? chapter : [{ id: node.id, title: node.title, html }];
      const out = [];
      for (const doc of targets) {
        const H = hashesOf(doc.id);
        const fix = fixFor(H);
        const violations = [];
        let current = doc.html;
        const ctx = chapter
          .filter((d) => d.id !== doc.id)
          .map((d) => `## ${d.title}\n${htmlToText(d.html).slice(0, 3000)}`)
          .join('\n\n')
          .slice(0, 40000);
        say(`„${doc.title}”: Blackbox P1 · ${rounds.size} runde`);
        for (const r of ROUNDS.filter((x) => rounds.has(x.id))) {
          const fixed = await ai(roundPrompt(r, htmlToManuscript(current), roundContext(r, { chapterContext: ctx, canonNodes, title: doc.title, html: current }), { authorText: authorParagraphs(current, H) }), r.id === 'R4b' || r.id === 'R10' ? 'high' : 'medium');
          const next = fix(reattach(current, manuscriptToHtml(fixed)));
          const gate = authorGate(current, next, H);
          if (!gate.ok) {
            say(t('ui.editorialPanel.runda_x_respinsa', { id: r.id, title: r.title }));
            gateReport(gate, '    ');
            violations.push(...gate.violations);
            continue;
          }
          current = next;
          const s = summarize(lint(current, { profile }));
          say(t('ui.editorialPanel.x_x_x_grave_x', { id: r.id, title: r.title, GRAVE: s.GRAVE, MEDIU: s.MEDIU }));
        }
        // P3 final sterilization + I-REP verification loop
        const { current: verified, found, toAuthor, violations: v2 } = await repairLoop({ ...doc, html: current }, chapter.filter((d) => d.id !== doc.id));
        out.push({ id: doc.id, title: doc.title, before: doc.html, after: verified, issuesAfter: found, rounds: [...rounds], toAuthor, violations: [...violations, ...v2] });
      }
      setProposal(out);
    } catch (e) {
      setError(e.message);
    } finally {
      endReport();
      busyRef.current = false;
      setBusy(false);
    }
  };

  const currentOf = (id) => (id === node.id ? html : (chapter.find((d) => d.id === id) || {}).html);
  // A decision holds only for the text it was made on.
  const isRejected = (id) => rejected.has(id) && rejected.get(id) === hashText(currentOf(id) || '');
  const chosen = proposal ? proposal.filter((p) => !isRejected(p.id)) : [];
  const nRejected = proposal ? proposal.length - chosen.length : 0;
  const accept = async () => {
    if (!chosen.length) return setProposal(null);
    // The user may have kept writing while the model worked: never overwrite those edits.
    const stale = chosen.filter((p) => proposalIsStale(p, currentOf(p.id), p.selection ? onSelectionText() : undefined));
    if (stale.length) {
      setError(t('ui.editorialPanel.documentul_s_a_schimbat_intre', { v0: stale.map((p) => `„${p.title}”`).join(', ') }));
      return;
    }
    try {
      for (const p of chosen) await onApply(p);
    } catch (e) {
      setError(e.message);
      return;
    }
    setLog((l) => [...l, t('ui.editorialPanel.aplicat_pe_x_document_e', { length: chosen.length, v1: nRejected ? `, ${nRejected} respinse` : '' })]);
    setProposal(null);
  };
  const toggle = (id) => setRejected((r) => {
    const n = new Map(r);
    if (isRejected(id)) n.delete(id);
    else n.set(id, hashText(currentOf(id) || ''));
    return n;
  });
  // I-EDIT part 1: the author edits the proposed text and saves it. 409 when the document changed
  // since the proposal, 412 when the new text is under 20% of the old one (unless confirmed).
  const saveEdited = async (p, force = false) => {
    setError('');
    if (proposalIsStale(p, currentOf(p.id))) {
      setError(t('ui.editorialPanel.err_409', { title: p.title }));
      return;
    }
    const after = reattach(p.before, manuscriptToHtml(editing.text));
    const oldLen = htmlToText(p.before).trim().length;
    const newLen = htmlToText(after).trim().length;
    if (!force && oldLen && newLen < oldLen * 0.2) {
      setEditing((e) => ({ ...e, warn412: Math.round((newLen / oldLen) * 100) }));
      return;
    }
    try {
      await onApply({ ...p, after, proposed: p.after, authorEdit: true });
    } catch (e) {
      setError(e.message);
      return;
    }
    say(t('ui.editorialPanel.salvat_textul_tau', { title: p.title }));
    setEditing(null);
    setProposal((ps) => {
      const rest = (ps || []).filter((x) => x.id !== p.id);
      return rest.length ? rest : null;
    });
  };

  return (
    <aside className="editorial">
      <div className="tabs">
        <button className={tab === 'rep' ? 'on' : ''} onClick={() => setTab('rep')}>I-REP</button>
        {aiEnabled && <button className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>I-EDIT</button>}
      </div>
      {aiEnabled && (aiLabel || aiModel) && <p className="muted small ai-provider">Model: {providerText(aiLabel, aiModel)}</p>}
      <p className="muted small">Profil: {profile.name}{canonNodes.length ? ` · Index_de_Lucru: ${canonNodes.length} noduri` : ''}</p>
      {canonProblems.length > 0 && (
        <details className="small">
          <summary>Index_de_Lucru: {canonProblems.length} probleme</summary>
          <ul>{canonProblems.slice(0, 50).map((p, i) => <li key={i}>[{p.severity}] {p.message}</li>)}</ul>
        </details>
      )}

      <div className="rep-summary">
        <button className={`pill grave ${filter === 'GRAVE' ? 'on' : ''}`} onClick={() => setFilter(filter === 'GRAVE' ? 'all' : 'GRAVE')}>{sum.GRAVE} grave</button>
        <button className={`pill medium ${filter === 'MEDIU' ? 'on' : ''}`} onClick={() => setFilter(filter === 'MEDIU' ? 'all' : 'MEDIU')}>{sum.MEDIU} medii</button>
        <button className={`pill minor ${filter === 'MINOR' ? 'on' : ''}`} onClick={() => setFilter(filter === 'MINOR' ? 'all' : 'MINOR')}>{sum.MINOR} minore</button>
      </div>

      <label>
        Nivel
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS().map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </label>
      {level === 'macro' && <p className="muted small">{chapter.length} {t('ui.editorialPanel.documente_in_ordinea_din_binder')}</p>}

      {tab === 'rep' && (
        <>
          <label>
            Bucle maxime
            <input type="number" min="1" max="8" value={maxLoops} onChange={(e) => setMaxLoops(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
          </label>
          <label className="check">
            <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} /> {t('ui.editorialPanel.si_problemele_medii_blocheaza')}
          </label>
          <div className="ai-actions">
            {busy && api.cancelAi && <button onClick={() => api.cancelAi()}>{t('btn.cancel')}</button>}
            <button onClick={() => Promise.resolve(onApply({ id: node.id, title: node.title, before: html, after: fixFor(ownHashes)(html), safe: true })).catch((e) => setError(e.message))} disabled={busy}>
              {t('ui.editorialPanel.reparatii_sigure_fara_ai')}
            </button>
            {aiEnabled && (
              <button className="primary" onClick={runRep} disabled={busy || !hasKey}>
                {busy ? 'Lucrez…' : t('ui.editorialPanel.i_rep_repara_reverifica')}
              </button>
            )}
          </div>
        </>
      )}

      {tab === 'edit' && aiEnabled && (
        <>
          <div className="rounds">
            {ROUNDS.map((r) => (
              <label key={r.id} className="check" title={r.prompt}>
                <input
                  type="checkbox"
                  checked={rounds.has(r.id)}
                  onChange={(e) =>
                    setRounds((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(r.id);
                      else n.delete(r.id);
                      return n;
                    })
                  }
                />
                <span><b>{r.id}</b> {r.title} <small className="muted">{r.protocols}</small></span>
              </label>
            ))}
          </div>
          <div className="ai-actions">
            <button onClick={() => setRounds(new Set(ROUNDS.map((r) => r.id)))}>{t('ui.editorialPanel.toate')}</button>
            <button onClick={() => setRounds(new Set())}>{t('ui.editorialPanel.niciuna')}</button>
            {busy && api.cancelAi && <button onClick={() => api.cancelAi()}>{t('btn.cancel')}</button>}
            <button className="primary" onClick={runEdit} disabled={busy || !hasKey || !rounds.size || level === 'micro'}>
              {busy ? 'Lucrez…' : t('ui.editorialPanel.i_edit_ruleaza_rundele')}
            </button>
          </div>
          {level === 'micro' && <p className="muted small">{t('ui.editorialPanel.i_edit_lucreaza_pe_document')}</p>}
          {node.editorial?.rounds && (
            <p className="muted small">
              Ultimele runde: {Object.entries(node.editorial.rounds).map(([k, d]) => `${k} ${new Date(d).toLocaleDateString(uiLocale())}`).join(' · ')}
            </p>
          )}
        </>
      )}

      {aiEnabled && !hasKey && (
        <p className="warn">
          Bucla AI cere cheia API{aiLabel ? t('ui.editorialPanel.pentru_x', { aiLabel: aiLabel }) : ' a furnizorului AI'}. <button className="link" onClick={onOpenSettings}>{t('set.title')}</button>
        </p>
      )}
      {error && (
        <div className="ai-error" role="alert">
          <span>{error}</span>
          {lastRun && !busy && <button className="link" onClick={lastRun}>{t('ui.aiPanel.reincearca')}</button>}
        </div>
      )}
      {busy && <p className="muted" aria-live="polite">Lucrez… {api.cancelAi && t('ui.editorialPanel.esc_anuleaza')}</p>}
      {log.length > 0 && <pre className="rep-log" aria-live="polite">{log.join('\n')}</pre>}

      {proposal && (
        <div className="proposal">
          <h4>Propunere ({proposal.length} document{proposal.length > 1 ? 'e' : ''})</h4>
          {proposal.map((p) => {
            const s = summarize(p.issuesAfter || []);
            return (
              <details key={p.id} open={proposal.length === 1} className={`doc-choice-wrap${isRejected(p.id) ? ' rejected' : ''}`}>
                <summary className="doc-choice">
                  {proposal.length > 1 && (
                    <input
                      type="checkbox"
                      aria-label={t('ui.editorialPanel.aplica_x', { title: p.title })}
                      checked={!isRejected(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggle(p.id)}
                    />
                  )}
                  {p.title} {t('ui.editorialPanel.dupa')} {s.GRAVE} grave, {s.MEDIU} medii{p.before === p.after ? t('ui.editorialPanel.fara_modificari') : ''}
                </summary>
                {editing && editing.id === p.id ? (
                  <div className="author-edit">
                    <textarea
                      aria-label={t('ui.editorialPanel.textul_propus', { title: p.title })}
                      value={editing.text}
                      rows={12}
                      onChange={(e) => setEditing({ id: p.id, text: e.target.value })}
                    />
                    {editing.warn412 !== undefined && (
                      <p className="warn" role="alert">{t('ui.editorialPanel.err_412', { pct: editing.warn412 })}</p>
                    )}
                    <div className="ai-actions">
                      <button className="primary" onClick={() => saveEdited(p)}>{t('ui.editorialPanel.salveaza')}</button>
                      {editing.warn412 !== undefined && <button onClick={() => saveEdited(p, true)}>{t('ui.editorialPanel.salveaza_oricum')}</button>}
                      <button onClick={() => setEditing(null)}>{t('btn.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="snap-preview diff">
                      {diffWords(htmlToText(p.before), htmlToText(p.after)).map((part, i) =>
                        part.added ? <ins key={i}>{part.value}</ins> : part.removed ? <del key={i}>{part.value}</del> : <span key={i}>{part.value}</span>,
                      )}
                    </div>
                    {!p.selection && (
                      <div className="ai-actions">
                        <button onClick={() => setEditing({ id: p.id, text: htmlToManuscript(p.after) })} disabled={busy}>{t('ui.editorialPanel.editeaza')}</button>
                      </div>
                    )}
                  </>
                )}
                {(p.violations || []).length > 0 && (
                  <div className="ai-error small" role="alert">
                    {t('ui.editorialPanel.respinse_de_poarta')}
                    <ul>{p.violations.map((v, i) => <li key={i}>{t('ui.editorialPanel.respins_fraza_autor_atinsa', { line: v.line, kind: t(KIND[v.kind]), text: short(v.text, 60) })}</li>)}</ul>
                  </div>
                )}
                {(p.toAuthor || []).length > 0 && (
                  <div className="small">
                    <b>{t('ui.editorialPanel.coada_autor_x', { length: p.toAuthor.length })}</b>
                    <ul className="issues">{p.toAuthor.slice(0, 100).map((i) => <li key={i.id} className={`sev-${i.severity}`}><span className="tag">{i.round}</span> {i.message}</li>)}</ul>
                  </div>
                )}
              </details>
            );
          })}
          <div className="ai-actions">
            <button className="primary" onClick={accept} disabled={!chosen.length}>
              {proposal.length > 1 ? t('ui.editorialPanel.accepta_x_din_x', { length: chosen.length, length1: proposal.length }) : t('ui.editorialPanel.accepta_si_aplica')}
            </button>
            <button onClick={() => setProposal(null)}>{proposal.length > 1 ? t('ui.editorialPanel.respinge_tot') : 'Respinge'}</button>
          </div>
        </div>
      )}

      <h4>{t('ui.editorialPanel.probleme_in')}{node.title}”</h4>
      {shown.length === 0 && <p className="ok">{t('ui.editorialPanel.nicio_problema_detectata')}</p>}
      <ul className="issues">
        {shown.slice(0, 300).map((i) => (
          <li key={i.id} className={`sev-${i.severity}`} onClick={() => onJump(i)}>
            <span className="tag">{i.round}</span> {i.message}
            {i.excerpt && <div className="excerpt">{i.excerpt}</div>}
            {i.note && <div className="muted small">{t('ui.editorialPanel.nota_vecin')}</div>}
          </li>
        ))}
      </ul>

      {(ownCount > 0 || live.toAuthor.length > 0) && (
        <details className="author-queue" open={live.toAuthor.length > 0}>
          <summary>{t('ui.editorialPanel.coada_autor_x', { length: live.toAuthor.length })}</summary>
          <p className="muted small">{t('ui.editorialPanel.text_autor_protejat', { n: ownCount })}</p>
          <ul className="issues">
            {live.toAuthor.slice(0, 300).map((i) => (
              <li key={i.id} className={`sev-${i.severity}`} onClick={() => onJump(i)}>
                <span className="tag">{i.round}</span> {i.message}
                {i.excerpt && <div className="excerpt">{i.excerpt}</div>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="near-rep" open={near.length > 0 && near.length <= 30}>
        <summary>{t('ui.editorialPanel.repetitii_apropiate', { n: near.length })}</summary>
        <p className="muted small">{t('ui.editorialPanel.s70_nota')}</p>
        {near.length === 0 && <p className="ok">{t('ui.editorialPanel.nicio_repetitie_apropiata')}</p>}
        <ul className="issues">
          {near.slice(0, 500).map((i) => (
            <li key={i.id} className="sev-SEMNAL" onClick={() => onJump(i)} title={i.excerpt}>
              {i.message}
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
