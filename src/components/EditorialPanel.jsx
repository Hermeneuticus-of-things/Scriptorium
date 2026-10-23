import React, { useMemo, useState } from 'react';
import { diffWords } from 'diff';
import {
  ROUNDS,
  autofix,
  cleanModelText,
  htmlToManuscript,
  lint,
  manuscriptToHtml,
  reattach,
  repairPrompt,
  roundPrompt,
  summarize,
  systemPrompt,
} from '../lib/editorial.js';
import { htmlToText } from '../lib/text.js';

const LEVELS = [
  ['micro', 'Micro · selecția / paragraful'],
  ['mezzo', 'Mezzo · documentul'],
  ['macro', 'Macro · tot capitolul (dosarul)'],
];

function blocking(issues, strict) {
  return issues.filter((i) => i.severity === 'GRAVE' || (strict && i.severity === 'MEDIU'));
}

export default function EditorialPanel({ api, hasKey, aiEnabled = true, profile, node, html, chapter, onJump, onApply, onSelectionText, onOpenSettings }) {
  const [tab, setTab] = useState('rep');
  const [level, setLevel] = useState('mezzo');
  const [maxLoops, setMaxLoops] = useState(3);
  const [strict, setStrict] = useState(false);
  const [rounds, setRounds] = useState(() => new Set(ROUNDS.map((r) => r.id)));
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [proposal, setProposal] = useState(null); // [{id, title, before, after, issuesAfter}]
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const others = useMemo(() => chapter.filter((d) => d.id !== node.id), [chapter, node.id]);
  const issues = useMemo(() => lint(html, { profile, otherDocs: others }), [html, profile, others]);
  const sum = summarize(issues);
  const shown = issues.filter((i) => filter === 'all' || i.severity === filter);

  const say = (line) => setLog((l) => [...l, line]);

  const ai = async (prompt, effort = 'high') => {
    const res = await api.runAi({ action: 'editorial', system: systemPrompt(profile), prompt, effort });
    return cleanModelText(res.text);
  };

  // One document: repair -> re-verify loop until no blocking issues or maxLoops.
  const repairLoop = async (doc, otherDocs) => {
    let current = autofix(doc.html);
    let found = lint(current, { profile, otherDocs });
    say(`„${doc.title}”: ${summarize(found).GRAVE} grave, ${summarize(found).MEDIU} medii la start (după reparațiile sigure)`);
    for (let loop = 1; loop <= maxLoops && blocking(found, strict).length; loop++) {
      const md = htmlToManuscript(current);
      const fixed = await ai(repairPrompt(md, found.filter((i) => i.severity !== 'MINOR'), level), 'high');
      current = autofix(reattach(current, manuscriptToHtml(fixed)));
      found = lint(current, { profile, otherDocs });
      const s = summarize(found);
      say(`  bucla ${loop}: ${s.GRAVE} grave, ${s.MEDIU} medii, ${s.MINOR} minore`);
    }
    if (blocking(found, strict).length) say(`  ⚠ rămân ${blocking(found, strict).length} probleme blocante după ${maxLoops} bucle`);
    else say('  ✓ reverificare curată');
    return { current, found };
  };

  const runRep = async () => {
    setBusy(true);
    setError('');
    setLog([]);
    setProposal(null);
    try {
      if (level === 'micro') {
        const sel = onSelectionText();
        if (!sel) throw new Error('Selectează un fragment în editor pentru nivelul micro.');
        const selHtml = manuscriptToHtml(sel);
        const found = lint(selHtml, { profile });
        say(`Selecție: ${summarize(found).GRAVE} grave, ${summarize(found).MEDIU} medii`);
        let current = selHtml;
        let f = found;
        for (let loop = 1; loop <= maxLoops && blocking(f, strict).length; loop++) {
          const fixed = await ai(repairPrompt(htmlToManuscript(current), f, 'micro'), 'medium');
          current = autofix(manuscriptToHtml(fixed));
          f = lint(current, { profile });
          say(`  bucla ${loop}: ${summarize(f).GRAVE} grave, ${summarize(f).MEDIU} medii`);
        }
        setProposal([{ id: node.id, title: `${node.title} (selecție)`, before: selHtml, after: current, issuesAfter: f, selection: true }]);
      } else if (level === 'mezzo') {
        const { current, found } = await repairLoop({ id: node.id, title: node.title, html }, others);
        setProposal([{ id: node.id, title: node.title, before: html, after: current, issuesAfter: found }]);
      } else {
        const out = [];
        for (const doc of chapter) {
          const rest = chapter.filter((d) => d.id !== doc.id);
          const { current, found } = await repairLoop(doc, rest);
          out.push({ id: doc.id, title: doc.title, before: doc.html, after: current, issuesAfter: found });
        }
        setProposal(out);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const runEdit = async () => {
    setBusy(true);
    setError('');
    setLog([]);
    setProposal(null);
    try {
      const targets = level === 'macro' ? chapter : [{ id: node.id, title: node.title, html }];
      const out = [];
      for (const doc of targets) {
        let current = doc.html;
        const ctx = chapter
          .filter((d) => d.id !== doc.id)
          .map((d) => `## ${d.title}\n${htmlToText(d.html).slice(0, 3000)}`)
          .join('\n\n')
          .slice(0, 40000);
        say(`„${doc.title}”: Blackbox P1 · ${rounds.size} runde`);
        for (const r of ROUNDS.filter((x) => rounds.has(x.id))) {
          const fixed = await ai(roundPrompt(r, htmlToManuscript(current), r.id === 'R1' || r.id === 'R6' ? ctx : ''), r.id === 'R4b' || r.id === 'R10' ? 'high' : 'medium');
          current = autofix(reattach(current, manuscriptToHtml(fixed)));
          const s = summarize(lint(current, { profile }));
          say(`  ${r.id} ${r.title}: ${s.GRAVE} grave, ${s.MEDIU} medii`);
        }
        // P3 final sterilization + I-REP verification loop
        const { current: verified, found } = await repairLoop({ ...doc, html: current }, chapter.filter((d) => d.id !== doc.id));
        out.push({ id: doc.id, title: doc.title, before: doc.html, after: verified, issuesAfter: found, rounds: [...rounds] });
      }
      setProposal(out);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    for (const p of proposal) await onApply(p);
    setLog((l) => [...l, `✓ aplicat pe ${proposal.length} document(e); snapshot salvat înainte`]);
    setProposal(null);
  };

  return (
    <aside className="editorial">
      <div className="tabs">
        <button className={tab === 'rep' ? 'on' : ''} onClick={() => setTab('rep')}>I-REP</button>
        {aiEnabled && <button className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>I-EDIT</button>}
      </div>
      <p className="muted small">Profil: {profile.name}</p>

      <div className="rep-summary">
        <button className={`pill grave ${filter === 'GRAVE' ? 'on' : ''}`} onClick={() => setFilter(filter === 'GRAVE' ? 'all' : 'GRAVE')}>{sum.GRAVE} grave</button>
        <button className={`pill medium ${filter === 'MEDIU' ? 'on' : ''}`} onClick={() => setFilter(filter === 'MEDIU' ? 'all' : 'MEDIU')}>{sum.MEDIU} medii</button>
        <button className={`pill minor ${filter === 'MINOR' ? 'on' : ''}`} onClick={() => setFilter(filter === 'MINOR' ? 'all' : 'MINOR')}>{sum.MINOR} minore</button>
      </div>

      <label>
        Nivel
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </label>
      {level === 'macro' && <p className="muted small">{chapter.length} documente în ordinea din binder.</p>}

      {tab === 'rep' && (
        <>
          <label>
            Bucle maxime
            <input type="number" min="1" max="8" value={maxLoops} onChange={(e) => setMaxLoops(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
          </label>
          <label className="check">
            <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} /> Și problemele medii blochează
          </label>
          <div className="ai-actions">
            <button onClick={() => onApply({ id: node.id, title: node.title, before: html, after: autofix(html), safe: true })} disabled={busy}>
              Reparații sigure (fără AI)
            </button>
            {aiEnabled && (
              <button className="primary" onClick={runRep} disabled={busy || !hasKey}>
                {busy ? 'Lucrez…' : 'I-REP: repară + reverifică'}
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
            <button onClick={() => setRounds(new Set(ROUNDS.map((r) => r.id)))}>Toate</button>
            <button onClick={() => setRounds(new Set())}>Niciuna</button>
            <button className="primary" onClick={runEdit} disabled={busy || !hasKey || !rounds.size || level === 'micro'}>
              {busy ? 'Lucrez…' : 'I-EDIT: rulează rundele'}
            </button>
          </div>
          {level === 'micro' && <p className="muted small">I-EDIT lucrează pe document sau capitol.</p>}
          {node.editorial?.rounds && (
            <p className="muted small">
              Ultimele runde: {Object.entries(node.editorial.rounds).map(([k, d]) => `${k} ${new Date(d).toLocaleDateString('ro-RO')}`).join(' · ')}
            </p>
          )}
        </>
      )}

      {aiEnabled && !hasKey && (
        <p className="warn">
          Bucla AI cere cheia API. <button className="link" onClick={onOpenSettings}>Setări</button>
        </p>
      )}
      {error && <p className="warn">{error}</p>}
      {log.length > 0 && <pre className="rep-log">{log.join('\n')}</pre>}

      {proposal && (
        <div className="proposal">
          <h4>Propunere ({proposal.length} document{proposal.length > 1 ? 'e' : ''})</h4>
          {proposal.map((p) => {
            const s = summarize(p.issuesAfter || []);
            return (
              <details key={p.id} open={proposal.length === 1}>
                <summary>
                  {p.title} · după: {s.GRAVE} grave, {s.MEDIU} medii
                </summary>
                <div className="snap-preview diff">
                  {diffWords(htmlToText(p.before), htmlToText(p.after)).map((part, i) =>
                    part.added ? <ins key={i}>{part.value}</ins> : part.removed ? <del key={i}>{part.value}</del> : <span key={i}>{part.value}</span>,
                  )}
                </div>
              </details>
            );
          })}
          <div className="ai-actions">
            <button className="primary" onClick={accept}>Acceptă și aplică</button>
            <button onClick={() => setProposal(null)}>Respinge</button>
          </div>
        </div>
      )}

      <h4>Probleme în „{node.title}”</h4>
      {shown.length === 0 && <p className="ok">Nicio problemă detectată.</p>}
      <ul className="issues">
        {shown.slice(0, 300).map((i) => (
          <li key={i.id} className={`sev-${i.severity}`} onClick={() => onJump(i)}>
            <span className="tag">{i.round}</span> {i.message}
            {i.excerpt && <div className="excerpt">{i.excerpt}</div>}
          </li>
        ))}
      </ul>
    </aside>
  );
}
