import React from 'react';
import { t } from '../lib/i18n.js';
import { autofix } from '../lib/editorial.js';
import { diffParts, noChange } from '../lib/aiSession.js';

// Reparații simple (directiva autor): corecturi deterministe, fără niciun gram de AI — ghilimele,
// spații duble, majusculă la început de paragraf, caractere invizibile. Propriul dialog, în Unelte,
// complet separat de fereastra AI (ce e la AI e doar AI).
export default function SimpleRepairsDialog({ node, html, onApply, onClose }) {
  const before = html || '';
  const after = autofix(before);
  const parts = diffParts(before, after);
  const clean = noChange(parts);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal simple-repairs" role="dialog" aria-label={t('ui.simpleRepairs.title')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.simpleRepairs.title')}</h2>
        <p className="muted small">{t('ui.simpleRepairs.document', { title: node?.title || '' })}</p>
        <p className="muted small">{t('ui.simpleRepairs.noAi')}</p>
        {clean ? (
          <p className="ok">{t('ui.simpleRepairs.nothing')}</p>
        ) : (
          <>
            <p className="muted small">{t('ui.simpleRepairs.list')}</p>
            <div className="ai-diff" aria-label={t('ui.aiPanel.diferente_inainte_dupa')}>
              {parts.slice(0, 400).map((p, i) => p.added ? <ins key={i}>{p.value}</ins> : p.removed ? <del key={i}>{p.value}</del> : <span key={i}>{p.value}</span>)}
            </div>
          </>
        )}
        <div className="ai-actions">
          <button type="button" className="primary" disabled={clean} onClick={() => onApply(after)}>{t('ui.simpleRepairs.apply')}</button>
          <button type="button" onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
