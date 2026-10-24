import React, { useEffect, useMemo, useState } from 'react';
import { t, getLanguage } from '../lib/i18n.js';
import { version as APP_VERSION } from '../../package.json';
import {
  MAINTAINER_EMAIL,
  buildIssueUrl,
  buildMailto,
  buildReport,
  memoryErrors,
  recentActions,
  reportTitle,
  technicalDetails,
} from '../lib/reportProblem.js';

function browserEnv() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return { appVersion: `${APP_VERSION} (web)`, os: navigator.userAgentData?.platform || navigator.platform || '', arch: '', userAgent: ua };
}

async function copy(api, text) {
  if (api.copyText) return api.copyText(text);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

// Help → Report a problem: the author writes in their own words; the technical details
// (version, system, recent errors, sanitized, no document text) are added automatically.
export default function ReportProblemDialog({ api, onClose, onDone }) {
  const [what, setWhat] = useState('');
  const [before, setBefore] = useState('');
  const [log, setLog] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let live = true;
    const load = api.getErrorLog ? api.getErrorLog() : Promise.resolve({ entries: memoryErrors(), env: browserEnv() });
    load
      .then((r) => live && setLog(r))
      .catch(() => live && setLog({ entries: memoryErrors(), env: browserEnv() }));
    return () => {
      live = false;
    };
  }, [api]);

  const details = useMemo(() => {
    if (!log) return '';
    const env = { ...log.env, language: getLanguage() };
    const privacy = { home: env.home, user: env.user, projectDirs: env.projectDirs || [] };
    const labels = Object.fromEntries(['version', 'system', 'browser', 'language', 'actions', 'errors', 'none'].map((k) => [k, t(`ui.report.d_${k}`)]));
    return technicalDetails({ env, errors: log.entries || [], actions: recentActions(), privacy, labels });
  }, [log]);

  const body = () =>
    buildReport({
      what,
      before,
      details,
      labels: { what: t('ui.report.h_what'), before: t('ui.report.h_before'), details: t('ui.report.h_details') },
    });
  const title = () => reportTitle(what, t('ui.report.defaultTitle'));

  const sendGithub = async () => {
    const full = body();
    const { url, truncated } = buildIssueUrl(title(), full, { note: t('ui.report.truncatedNote') });
    await copy(api, full).catch(() => {});
    if (api.openLink) await api.openLink(url);
    else window.open(url, '_blank', 'noopener');
    onDone?.(truncated ? t('ui.report.sentTruncated') : t('ui.report.sent'));
  };
  const copyReport = async () => {
    await copy(api, body());
    setMsg(t('ui.report.copied'));
  };
  const sendMail = () => {
    window.open(buildMailto(MAINTAINER_EMAIL, title(), body()), '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide report-problem" role="dialog" aria-label={t('ui.report.title')} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <h2>{t('ui.report.title')}</h2>
        <p className="muted">{t('ui.report.intro')}</p>
        <label>
          {t('ui.report.what')}
          <textarea autoFocus rows={5} value={what} onChange={(e) => setWhat(e.target.value)} placeholder={t('ui.report.whatPlaceholder')} />
        </label>
        <label>
          {t('ui.report.before')}
          <textarea rows={3} value={before} onChange={(e) => setBefore(e.target.value)} />
        </label>
        <details className="report-details">
          <summary>{t('ui.report.details')}</summary>
          <p className="muted">{t('ui.report.privacy')}</p>
          <pre className="report-tech" aria-label={t('ui.report.details')}>{log ? details : t('ui.report.loading')}</pre>
        </details>
        <p className="muted small">{t('ui.report.githubNote')}</p>
        {msg && <p role="status">{msg}</p>}
        <div className="actions">
          {MAINTAINER_EMAIL && <button onClick={sendMail}>{t('ui.report.email')}</button>}
          <button onClick={copyReport} disabled={!log}>{t('ui.report.copy')}</button>
          <button className="primary" onClick={() => sendGithub().catch((e) => setMsg(e.message))} disabled={!log || !what.trim()}>
            {t('ui.report.github')}
          </button>
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
