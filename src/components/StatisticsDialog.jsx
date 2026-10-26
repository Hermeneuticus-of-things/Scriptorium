import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sortFrequency, frequencyCsv, quickTextStats } from '../lib/smallWindows.js';
import { posDistribution } from '../lib/panelsExtra.js';
import { guessLang } from '../lib/pos.js';
import { projectStats, projectText, wordFrequency, sentenceLengths, readability } from '../lib/stats.js';
import { t, uiLocale } from '../lib/i18n.js';
import './StatisticsDialog.css';

const SCOPES = () => ([
  ['draft', t('ui.stats.manuscris')],
  ['compile', t('ui.statisticsDialog.doar_ce_intra_in_compile')],
  ['all', t('ui.advancedSearchDialog.tot_proiectul')],
  ['selection', t('ui.statisticsDialog.selectia')],
]);

const fmt = (n) => Number(n || 0).toLocaleString(uiLocale());

export default function StatisticsDialog({ project, docs, selectionIds, onClose }) {
  const [mainTab, setMainTab] = useState('stats');
  const [textOpen, setTextOpen] = useState(false);
  const [tab, setTab] = useState('project');
  const [scope, setScope] = useState('draft');
  const [minLength, setMinLength] = useState(4);
  const [withStopwords, setWithStopwords] = useState(false);
  const [freqSort, setFreqSort] = useState({ key: 'count', dir: 'desc' });
  const [freqChart, setFreqChart] = useState(false);
  const hasSelection = Boolean(selectionIds && selectionIds.length);

  const opts = useMemo(
    () => (scope === 'selection' ? { scope: 'all', selectionIds: hasSelection ? selectionIds : ['__none__'] } : { scope }),
    [scope, selectionIds, hasSelection],
  );
  const stats = useMemo(() => projectStats(project, docs, opts), [project, docs, opts]);
  const compiled = useMemo(() => projectStats(project, docs, { scope: 'compile' }), [project, docs]);
  const selStats = useMemo(
    () => (hasSelection ? projectStats(project, docs, { scope: 'all', selectionIds }) : null),
    [project, docs, selectionIds, hasSelection],
  );
  const text = useMemo(() => (!textOpen || tab === 'project' ? '' : projectText(project, docs, opts)), [textOpen, tab, project, docs, opts]);
  const freq = useMemo(
    () => (tab === 'words' ? wordFrequency(text, { minLength: Math.max(1, Number(minLength) || 1), stopwords: withStopwords ? null : undefined }) : []),
    [tab, text, minLength, withStopwords],
  );
  const freqRows = useMemo(() => sortFrequency(freq, freqSort.key, freqSort.dir), [freq, freqSort]);
  const sortBy = (key) => setFreqSort((f) => (f.key === key ? { key, dir: f.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'word' ? 'asc' : 'desc' }));
  const ariaSort = (key) => (freqSort.key === key ? (freqSort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const arrow = (key) => (freqSort.key === key ? (freqSort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const exportFreq = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([frequencyCsv(freqRows)], { type: 'text/csv' }));
    a.download = 'frecventa-cuvintelor.csv';
    a.click();
  };
  const top = freq.slice(0, 25);
  const maxFreq = Math.max(1, ...top.map((f) => f.count));
  const sent = useMemo(() => (tab === 'sentences' ? sentenceLengths(text) : null), [tab, text]);
  const read = useMemo(() => (tab === 'sentences' ? readability(text) : null), [tab, text]);
  const READ_BANDS = { easy: 'ușor de citit', medium: 'mediu', hard: 'dificil', veryHard: 'foarte dificil', na: '—' };
  const pos = useMemo(() => (tab === 'pos' ? posDistribution(text, project.language === 'en' || (!project.language && guessLang(text) === 'en') ? 'en' : 'ro') : []), [tab, text, project.language]);
  const maxBucket = sent ? Math.max(1, ...sent.histogram.map((h) => h.count)) : 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.statisticsDialog.statistici')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.statisticsDialog.statistici')}</h2>
        <div className="tabs" role="tablist">
          {[['stats', t('ui.statisticsDialog.statistici')], ['options', t('ui.statisticsDialog.optiuni')]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={mainTab === k} className={mainTab === k ? 'on' : ''} onClick={() => setMainTab(k)}>{l}</button>
          ))}
        </div>

        {mainTab === 'options' && (
          <label>
            {t('ui.statisticsDialog.ce_se_numara')}
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              {SCOPES().map(([k, l]) => (
                <option key={k} value={k} disabled={k === 'selection' && !hasSelection}>{l}</option>
              ))}
            </select>
          </label>
        )}

        {mainTab === 'stats' && (
        <>
        <div className="stats-compare">
          {[[t('ui.statisticsDialog.manuscris_compilat'), compiled, 'compiled'], [t('ui.statisticsDialog.selectie'), selStats, 'selection']].map(([title, st, k]) => (
            <section key={k} aria-label={title} data-stats={k}>
              <h3>{title}</h3>
              {st ? (
                <dl>
                  <dt>{fmt(st.words)}</dt><dd>{t('ui.inspector.cuvinte')}</dd>
                  <dt>{fmt(st.chars)}</dt><dd>{t('ui.statisticsDialog.caractere_cu_spatii')}</dd>
                  <dt>~{fmt(Math.round((st.words || 0) / 250))}</dt><dd>{t('ui.statisticsDialog.pagini_tiparite')}</dd>
                  <dt>~{fmt(Math.round((st.words || 0) / 300))}</dt><dd>{t('ui.statisticsDialog.pagini_carte_aprox')}</dd>
                </dl>
              ) : (
                <p className="muted">{t('ui.statisticsDialog.nicio_selectie')}</p>
              )}
            </section>
          ))}
        </div>
        <p className="muted small">{t('ui.statisticsDialog.aproximativ')}</p>

        <details className="stats-text-details" open={textOpen} onToggle={(e) => setTextOpen(e.currentTarget.open)}>
          <summary>{t('ui.statisticsDialog.statistici_de_text')}</summary>
          {textOpen && (
          <>
        <div className="tabs" role="tablist">
          {[['project', t('group.project')], ['words', t('ui.statisticsDialog.frecventa_cuvintelor')], ['sentences', t('ui.stats.fraze_tab')], ['pos', t('ui.statisticsDialog.parti_de_vorbire')]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <p className="muted small">{t('ui.stats.domeniu')}: {(SCOPES().find(([k]) => k === scope) || [])[1]}</p>

        {tab === 'project' && (
          <div className="stats">
            <div><strong>{fmt(stats.words)}</strong><span>{t('ui.inspector.cuvinte')}</span></div>
            <div><strong>{fmt(stats.chars)}</strong><span>{t('ui.statisticsDialog.caractere_cu_spatii')}</span></div>
            <div><strong>{fmt(stats.charsNoSpaces)}</strong><span>{t('ui.statisticsDialog.caractere_fara_spatii')}</span></div>
            <div><strong>{fmt(stats.sentences)}</strong><span>{t('ui.stats.fraze')}</span></div>
            <div><strong>{fmt(stats.paragraphs)}</strong><span>{t('ui.stats.paragrafe')}</span></div>
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
            {freq.length > 0 && (
              <div className="row freq-actions">
                <label className="check"><input type="checkbox" className="freq-chart-toggle" checked={freqChart} onChange={(e) => setFreqChart(e.target.checked)} /> {t('ui.p11.st_chart')}</label>
                <button className="freq-csv" onClick={exportFreq}>{t('ui.p11.st_csv')}</button>
              </div>
            )}
            {freq.length > 0 && freqChart && (
              <div className="freq-chart" aria-label={t('ui.p11.st_chart')} role="img">
                {top.map((f) => (
                  <div key={f.word} className="freq-chart-row" title={`${f.word}: ${f.count}`}>
                    <span className="freq-chart-word">{f.word}</span>
                    <span className="freq-chart-bar" style={{ width: `${(f.count / maxFreq) * 100}%` }} />
                    <span className="freq-chart-n">{fmt(f.count)}</span>
                  </div>
                ))}
              </div>
            )}
            {freq.length === 0 ? (
              <p className="muted">{t('ui.statisticsDialog.nu_exista_cuvinte_pentru_criteriile')}</p>
            ) : (
              <table className="history-table freq-table">
                <thead><tr>
                  <th aria-sort={ariaSort('word')}><button className="link freq-sort-word" onClick={() => sortBy('word')}>{t('ui.statisticsDialog.cuvant')}{arrow('word')}</button></th>
                  <th className="num" aria-sort={ariaSort('count')}><button className="link freq-sort-count" onClick={() => sortBy('count')}>{t('ui.statisticsDialog.aparitii')}{arrow('count')}</button></th>
                  <th className="num" aria-sort={ariaSort('percent')}><button className="link freq-sort-percent" onClick={() => sortBy('percent')}>{t('ui.p11.st_percent')}{arrow('percent')}</button></th>
                </tr></thead>
                <tbody>
                  {freqRows.map((f) => (
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
              <div><strong>{fmt(sent.histogram.reduce((s, h) => s + h.count, 0))}</strong><span>{t('ui.stats.fraze')}</span></div>
            </div>
            <div className="bars" aria-label={t('ui.statisticsDialog.distributia_lungimii_frazelor_cuvinte')}>
              {sent.histogram.map((h) => (
                <div key={h.range} className="bar" title={t('ui.statisticsDialog.x_cuvinte_x_fraze', { range: h.range, count: h.count })}>
                  <div style={{ height: `${(h.count / maxBucket) * 100}%` }} />
                  <small>{h.range}</small>
                </div>
              ))}
            </div>
            {read && read.band !== 'na' && (
              <>
                <div className="stats">
                  <div><strong>{read.wordsPerSentence.toLocaleString(uiLocale())}</strong><span>cuvinte pe frază</span></div>
                  <div><strong>{read.longSentencePct.toLocaleString(uiLocale())}%</strong><span>fraze lungi (peste 25 de cuvinte)</span></div>
                  <div><strong>{read.charsPerWord.toLocaleString(uiLocale())}</strong><span>litere pe cuvânt</span></div>
                  <div><strong>{READ_BANDS[read.band]}</strong><span>lizibilitate estimată</span></div>
                </div>
                <p className="muted small">Estimare euristică (indice ARI pe caractere și cuvinte); pentru orientare, nu un verdict.</p>
              </>
            )}
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

          </>
          )}
        </details>
        </>
        )}

        <div className="actions">
          <button className="primary" onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick text statistics: a small floating window that follows the text selected in the editor
 * (the whole document when nothing is selected). getText() returns {text, selection: bool}.
 */
export function TextStatsPanel({ getText, onClose }) {
  const [data, setData] = useState(() => getText());
  const [pos, setPos] = useState({ x: Math.max(16, window.innerWidth - 300), y: 120 });
  const drag = useRef(null);
  useEffect(() => {
    let raf = 0;
    const update = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setData(getText())); };
    document.addEventListener('selectionchange', update);
    const timer = setInterval(update, 1500);
    return () => { document.removeEventListener('selectionchange', update); clearInterval(timer); cancelAnimationFrame(raf); };
  }, [getText]);
  const st = quickTextStats(data.text);
  const down = (e) => {
    if (e.target.closest('button')) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev) => drag.current && setPos({ x: Math.max(0, ev.clientX - drag.current.dx), y: Math.max(0, ev.clientY - drag.current.dy) });
    const up = () => { drag.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return (
    <div className="floating-panel text-stats-panel" role="dialog" aria-label={t('ui.p11.ts_title')} onKeyDown={(e) => e.key === 'Escape' && onClose()} style={{ left: pos.x, top: pos.y }}>
      <div className="fp-title" onMouseDown={down}>
        <span style={{ flex: 1 }}>{t('ui.p11.ts_title')}</span>
        <button className="fp-close" aria-label={t('btn.close')} onClick={onClose}>×</button>
      </div>
      <p className="muted small ts-scope">{data.selection ? t('ui.p11.ts_selection') : t('ui.p11.ts_document')}</p>
      <dl className="ts-list">
        <dt className="ts-words">{fmt(st.words)}</dt><dd>{t('ui.inspector.cuvinte')}</dd>
        <dt>{fmt(st.chars)}</dt><dd>{t('ui.statisticsDialog.caractere_cu_spatii')}</dd>
        <dt>{fmt(st.charsNoSpaces)}</dt><dd>{t('ui.statisticsDialog.caractere_fara_spatii')}</dd>
        <dt>{fmt(st.sentences)}</dt><dd>{t('ui.stats.fraze')}</dd>
        <dt>{fmt(st.paragraphs)}</dt><dd>{t('ui.stats.paragrafe')}</dd>
        <dt>{st.averageSentence.toLocaleString(uiLocale())}</dt><dd>{t('ui.statisticsDialog.cuvinte_pe_fraza_in_medie')}</dd>
        <dt>{st.pages.toLocaleString(uiLocale())}</dt><dd>{t('ui.statisticsDialog.pagini_tiparite')}</dd>
        <dt>{fmt(st.readingMinutes)}</dt><dd>{t('ui.statisticsDialog.minute_de_lectura')}</dd>
      </dl>
    </div>
  );
}
