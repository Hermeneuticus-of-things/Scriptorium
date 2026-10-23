import React, { useMemo, useState } from 'react';
import { posDistribution } from '../lib/panelsExtra.js';
import { guessLang } from '../lib/pos.js';
import { projectStats, projectText, wordFrequency, sentenceLengths } from '../lib/stats.js';

const SCOPES = [
  ['draft', 'Manuscris'],
  ['compile', 'Doar ce intră în Compile'],
  ['all', 'Tot proiectul'],
  ['selection', 'Selecția'],
];

const fmt = (n) => Number(n || 0).toLocaleString('ro-RO');

export default function StatisticsDialog({ project, docs, selectionIds, onClose }) {
  const [tab, setTab] = useState('project');
  const [scope, setScope] = useState('draft');
  const [minLength, setMinLength] = useState(4);
  const [withStopwords, setWithStopwords] = useState(false);
  const hasSelection = Boolean(selectionIds && selectionIds.length);

  const opts = useMemo(
    () => (scope === 'selection' ? { scope: 'all', selectionIds: hasSelection ? selectionIds : ['__none__'] } : { scope }),
    [scope, selectionIds, hasSelection],
  );
  const stats = useMemo(() => projectStats(project, docs, opts), [project, docs, opts]);
  const text = useMemo(() => (tab === 'project' ? '' : projectText(project, docs, opts)), [tab, project, docs, opts]);
  const freq = useMemo(
    () => (tab === 'words' ? wordFrequency(text, { minLength: Math.max(1, Number(minLength) || 1), stopwords: withStopwords ? null : undefined }) : []),
    [tab, text, minLength, withStopwords],
  );
  const sent = useMemo(() => (tab === 'sentences' ? sentenceLengths(text) : null), [tab, text]);
  const pos = useMemo(() => (tab === 'pos' ? posDistribution(text, project.language === 'en' || (!project.language && guessLang(text) === 'en') ? 'en' : 'ro') : []), [tab, text, project.language]);
  const maxBucket = sent ? Math.max(1, ...sent.histogram.map((h) => h.count)) : 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Statistici" onClick={(e) => e.stopPropagation()}>
        <h2>Statistici</h2>
        <div className="tabs" role="tablist">
          {[['project', 'Proiect'], ['words', 'Frecvența cuvintelor'], ['sentences', 'Fraze'], ['pos', 'Părți de vorbire']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'primary' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <label>
          Domeniu
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES.map(([k, l]) => (
              <option key={k} value={k} disabled={k === 'selection' && !hasSelection}>{l}</option>
            ))}
          </select>
        </label>

        {tab === 'project' && (
          <div className="stats">
            <div><strong>{fmt(stats.words)}</strong><span>cuvinte</span></div>
            <div><strong>{fmt(stats.chars)}</strong><span>caractere (cu spații)</span></div>
            <div><strong>{fmt(stats.charsNoSpaces)}</strong><span>caractere fără spații</span></div>
            <div><strong>{fmt(stats.sentences)}</strong><span>fraze</span></div>
            <div><strong>{fmt(stats.paragraphs)}</strong><span>paragrafe</span></div>
            <div><strong>{fmt(stats.documents)}</strong><span>documente</span></div>
            <div><strong>{fmt(stats.pagesPaperback)}</strong><span>pagini carte (300 cuvinte/pagină)</span></div>
            <div><strong>{fmt(stats.pagesPrinted)}</strong><span>pagini standard (1800 caractere)</span></div>
            <div><strong>{fmt(stats.readingMinutes)}</strong><span>minute de lectură</span></div>
          </div>
        )}

        {tab === 'words' && (
          <>
            <div className="row">
              <label>
                Lungime minimă
                <input type="number" min="1" max="30" value={minLength} onChange={(e) => setMinLength(e.target.value)} />
              </label>
              <label className="check">
                <input type="checkbox" checked={withStopwords} onChange={(e) => setWithStopwords(e.target.checked)} /> Include cuvintele de legătură
              </label>
            </div>
            {freq.length === 0 ? (
              <p className="muted">Nu există cuvinte pentru criteriile alese.</p>
            ) : (
              <table className="history-table">
                <thead><tr><th>Cuvânt</th><th className="num">Apariții</th><th className="num">Procent</th></tr></thead>
                <tbody>
                  {freq.map((f) => (
                    <tr key={f.word}>
                      <td>{f.word}</td>
                      <td className="num">{fmt(f.count)}</td>
                      <td className="num">{f.percent.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {tab === 'sentences' && sent && (
          <>
            <div className="stats">
              <div><strong>{sent.average.toLocaleString('ro-RO')}</strong><span>cuvinte pe frază, în medie</span></div>
              <div><strong>{fmt(sent.longest)}</strong><span>cea mai lungă frază</span></div>
              <div><strong>{fmt(sent.shortest)}</strong><span>cea mai scurtă frază</span></div>
              <div><strong>{fmt(sent.histogram.reduce((s, h) => s + h.count, 0))}</strong><span>fraze</span></div>
            </div>
            <div className="bars" aria-label="Distribuția lungimii frazelor (cuvinte)">
              {sent.histogram.map((h) => (
                <div key={h.range} className="bar" title={`${h.range} cuvinte: ${h.count} fraze`}>
                  <div style={{ height: `${(h.count / maxBucket) * 100}%` }} />
                  <small>{h.range}</small>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'pos' && (
          <>
            {pos.length === 0 ? (
              <p className="muted">Nu există text în domeniul ales.</p>
            ) : (
              <table className="history-table pos-table">
                <thead><tr><th>Parte de vorbire</th><th className="num">Cuvinte</th><th className="num">Procent</th><th /></tr></thead>
                <tbody>
                  {pos.map((p) => (
                    <tr key={p.tag}>
                      <td>{p.label}</td>
                      <td className="num">{fmt(p.count)}</td>
                      <td className="num">{p.percent.toLocaleString('ro-RO')}%</td>
                      <td className="pos-bar-cell"><span className={`pos-bar pos-${p.tag}`} style={{ width: `${p.percent}%` }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted small">Estimare euristică (aprox. 60–75% precizie), nu o analiză gramaticală completă.</p>
          </>
        )}

        <div className="actions">
          <button className="primary" onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}
