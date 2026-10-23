import React, { useEffect, useState } from 'react';
import '../ai.css';
import { t } from '../lib/i18n.js';

const JOBS = () => ({ bulkSynopsis: t('cmd.aiBulkSynopsis'), consistency: t('ui.aiJobBar.consistenta_pe_toata_cartea'), zoomReview: t('cmd.aiZoomReview') });

// Progress + cancel for bulk AI jobs (ai:progress events). Cancelling keeps the results
// already finished: the job returns them with `cancelled: true`.
export default function AiJobBar({ api }) {
  const [job, setJob] = useState(null);
  const [stopping, setStopping] = useState(false);
  useEffect(() => {
    if (!api.onAiProgress) return undefined;
    let timer;
    const off = api.onAiProgress((p) => {
      setJob(p);
      clearTimeout(timer);
      if (p.total && p.done >= p.total) timer = setTimeout(() => { setJob(null); setStopping(false); }, 2500);
      else timer = setTimeout(() => { setJob(null); setStopping(false); }, 120000);
    });
    return () => { off(); clearTimeout(timer); };
  }, [api]);
  if (!job) return null;
  const finished = job.total && job.done >= job.total;
  return (
    <div className="ai-job" role="status" aria-live="polite">
      <span>{JOBS()[job.job] || 'AI'}{job.level ? ` · ${job.level}` : ''}</span>
      <progress max={job.total || 1} value={job.done || 0} />
      <span>{job.done}/{job.total}{job.title ? ` · ${job.title}` : ''}</span>
      {job.error && <span className="warn" title={job.error}>{t('ui.aiJobBar.eroare_la_acest_document')}</span>}
      {!finished && api.cancelAi && (
        <button disabled={stopping} onClick={() => { setStopping(true); api.cancelAi().catch(() => {}); }}>
          {stopping ? t('ui.aiJobBar.se_opreste') : t('btn.cancel')}
        </button>
      )}
    </div>
  );
}
