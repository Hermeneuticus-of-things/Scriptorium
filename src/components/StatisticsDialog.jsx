import React, { useMemo, useState } from 'react';
import { posDistribution } from '../lib/panelsExtra.js';
import { guessLang } from '../lib/pos.js';
import { projectStats, projectText, wordFrequency, sentenceLengths } from '../lib/stats.js';
import { t, uiLocale } from '../lib/i18n.js';

const SCOPES = () => ([
  ['draft', 'Manuscris'],
  ['compile', t('ui.statisticsDialog.doar_ce_intra_in_compile')],
  ['all', t('ui.advancedSearchDialog.tot_proiectul')],
  ['selection', t('ui.statisticsDialog.selectia')],
]);

const fmt = (n) => Number(n || 0).toLocaleString(uiLocale());

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
          {[['project', t('group.project')], ['words', t('ui.statisticsDialog.frecventa_cuvintelor')], ['sentences', 'Fraze'], ['pos', t('ui.statisticsDialog.parti_de_vorbire')]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <label>
          Domeniu
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES().map(([k, l]) => (
              <option key={k} value={k} disabled={k === 'selection' && !hasSelection}>{l}</option>
            ))}
          </select>
        </label>

        {tab === 'project' && (
          <div className="stats">
            <div><strong>{fmt(stats.words)}</strong><span>{t('ui.inspector.cuvinte')}</span></div>
            <div><strong>{fmt(stats.chars)}</strong><span>{t('ui.statisticsDialog.caractere_cu_spatii')}</span></div>
            <div><strong>{fmt(stats.charsNoSpaces)}</strong><span>{t('ui.statisticsDialog.caractere_fara_spatii')}</span></div>
            <div><strong>{fmt(stats.sentences)}</strong><span>fraze</span></div>
            <div><strong>{fmt(stats.paragraphs)}</strong><span>paragrafe</span></div>
            <div><strong>{fmt(stats.documents)}</strong><span>{t('ui.advancedSearchDialog.documente')}</span></div>
            <div><strong>{fmt(stats.pagesPaperback)}</strong><span>{t('ui.statisticsDialog.pagini_carte_300_cuvinte_pagina')}</span></div>
            <div><strong>{fmt(stats.pagesPrinted)}</strong><span>{t('ui.statisticsDialog.pagini_standard_1800_caractere')}</span></div>
            <div><strong>{fmt(stats.readingMinutes)}</strong><span>{t('ui.statisticsDialog.minute_de_lectura')}</span></div>
          </div>
        )}

        {tab === 'words' && (
          <>
            <div className="row">
              <label>
                {t('ui.statisticsDialog.lungime_minima')}
                <input type="number" min="1" max="30" value={minLength} onChange={(e) => setMinLength(e.target.value)} />
              </label>
              <label className="check">
                <input type="checkbox" checked={withStopwords} onChange={(e) => setWithStopwords(e.target.checked)} /> {t('ui.statisticsDialog.include_cuvintele_de_legatura')}
              </label>
            </div>
            {freq.length === 0 ? (
              <p className="muted">{t('ui.statisticsDialog.nu_exista_cuvinte_pentru_criteriile')}</p>
            ) : (
              <table className="history-table">
                <thead><tr><th>{t('ui.statisticsDialog.cuvant')}</th><th className="num">{t('ui.statisticsDialog.aparitii')}</th><th className="num">Procent</th></tr></thead>
                <tbody>
                  {freq.map((f) => (
                    <tr key={f.word}>
                      <td>{f.word}</td>
                      <td className="num">{fmt(f.count)}</td>
                      <td className="num">{f.percent.toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
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
              <div><strong>{sent.average.toLocaleString(uiLocale())}</strong><span>{t('ui.statisticsDialog.cuvinte_pe_fraza_in_medie')}</span></div>
              <div><strong>{fmt(sent.longest)}</strong><span>{t('ui.statisticsDialog.cea_mai_lunga_fraza')}</span></div>
              <div><strong>{fmt(sent.shortest)}</strong><span>{t('ui.statisticsDialog.cea_mai_scurta_fraza')}</span></div>
              <div><strong>{fmt(sent.histogram.reduce((s, h) => s + h.count, 0))}</strong><span>fraze</span></div>
            </div>
            <div className="bars" aria-label={t('ui.statisticsDialog.distributia_lungimii_frazelor_cuvinte')}>
              {sent.histogram.map((h) => (
                <div key={h.range} className="bar" title={t('ui.statisticsDialog.x_cuvinte_x_fraze', { range: h.range, count: h.count })}>
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
              <p className="muted">{t('ui.statisticsDialog.nu_exista_text_in_domeniul')}</p>
            ) : (
              <table className="history-table pos-table">
                <thead><tr><th>Parte de vorbire</th><th className="num">{t('ui.outliner.cuvinte')}</th><th className="num">Procent</th><th /></tr></thead>
                <tbody>
                  {pos.map((p) => (
                    <tr key={p.tag}>
                      <td>{p.label}</td>
                      <td className="num">{fmt(p.count)}</td>
                      <td className="num">{p.percent.toLocaleString(uiLocale())}%</td>
                      <td className="pos-bar-cell"><span className={`pos-bar pos-${p.tag}`} style={{ width: `${p.percent}%` }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted small">{t('ui.statisticsDialog.estimare_euristica_aprox_60_75')}</p>
          </>
        )}

        <div className="actions">
          <button className="primary" onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
