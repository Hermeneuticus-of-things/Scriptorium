import React, { useMemo, useState } from 'react';
import { autofix, lint, summarize } from '../lib/editorial.js';
import { t } from '../lib/i18n.js';

const severityOrder = { GRAVE: 0, MEDIU: 1, MINOR: 2, SEMNAL: 3 };

export default function SimpleRepairsPanel({ node, html, profile, onApply, onClose }) {
  const [workingHtml, setWorkingHtml] = useState(html || '');
  const [status, setStatus] = useState('');
  const issues = useMemo(() => lint(workingHtml, { profile }), [workingHtml, profile]);
  const summary = summarize(issues);
  const ordered = [...issues].sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  const previewFix = () => {
    const next = autofix(workingHtml);
    if (next === workingHtml) {
      setStatus(t('ui.simpleRepairs.nothingToFix'));
      return;
    }
    setWorkingHtml(next);
    setStatus(t('ui.simpleRepairs.previewReady'));
  };

  const apply = async () => {
    if (workingHtml === (html || '')) {
      setStatus(t('ui.simpleRepairs.nothingToApply'));
      return;
    }
    await onApply(workingHtml);
    setStatus(t('ui.simpleRepairs.applied'));
  };

  return (
    <div className="simple-repairs-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="simple-repairs-window" role="dialog" aria-modal="false" aria-labelledby="simple-repairs-title">
        <header className="simple-repairs-header">
          <div>
            <p className="surface-kicker">{t('ui.simpleRepairs.surface')}</p>
            <h2 id="simple-repairs-title">{t('ui.simpleRepairs.title')}</h2>
            <p className="muted">{node?.title || ''} · {t('ui.simpleRepairs.noAi')}</p>
          </div>
          <button className="icon-button" type="button" aria-label={t('btn.close')} onClick={onClose}>×</button>
        </header>

        <div className="simple-repairs-summary" role="status">
          <span>{t('ui.simpleRepairs.found', { count: issues.length })}</span>
          <span>{t('ui.simpleRepairs.severity', { grave: summary.GRAVE || 0, medium: summary.MEDIU || 0 })}</span>
        </div>

        <div className="simple-repairs-body">
          {!ordered.length ? (
            <p className="empty-state">{t('ui.simpleRepairs.clean')}</p>
          ) : (
            <ol className="simple-repairs-list">
              {ordered.map((issue) => (
                <li key={issue.id} className={`simple-repair-item sev-${String(issue.severity || '').toLowerCase()}`}>
                  <div className="simple-repair-meta"><strong>{issue.severity}</strong><span>{issue.rule}</span></div>
                  <p>{issue.message}</p>
                  {issue.excerpt && <code>{issue.excerpt}</code>}
                  {issue.autofix && <span className="simple-repair-badge">{t('ui.simpleRepairs.automatic')}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>

        {status && <p className="simple-repairs-status" role="status">{status}</p>}
        <footer className="simple-repairs-actions">
          <button type="button" onClick={previewFix} disabled={!issues.some((issue) => issue.autofix) && workingHtml === (html || '')}>{t('ui.simpleRepairs.preview')}</button>
          <span className="spacer" />
          <button type="button" onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" type="button" onClick={apply} disabled={workingHtml === (html || '')}>{t('ui.simpleRepairs.apply')}</button>
        </footer>
      </section>
    </div>
  );
}
