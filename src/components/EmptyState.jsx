import React from 'react';
import { t } from '../lib/i18n.js';

// Îndrumarea în zonele goale (PS-HELP-001 §13): un ecran gol explică ce reprezintă zona,
// ce poate adăuga utilizatorul și oferă acțiunea directă, dacă există. Componentă partajată —
// aceeași formă în tot programul; textele vin din i18n prin cheile lor.
// props: { title, hint?, actionLabel?, onAction?, compact? } — iconografia rămâne a zonei.
export default function EmptyState({ title, hint, actionLabel, onAction, compact = false }) {
  return (
    <div className={`empty-state${compact ? ' compact' : ''}`} role="note">
      <p className="empty-state-title">{title}</p>
      {hint && <p className="muted small empty-state-hint">{hint}</p>}
      {actionLabel && onAction && (
        <button type="button" className="empty-state-action" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}

/** Textele standard, unificate (i18n keys — puse aici ca să nu se dubleze per panou). */
export const EMPTY = {
  binder: () => ({ title: t('ui.empty.binder.title'), hint: t('ui.empty.binder.hint'), actionLabel: t('ui.empty.binder.action') }),
  search: () => ({ title: t('ui.empty.search.title'), hint: t('ui.empty.search.hint') }),
  research: () => ({ title: t('ui.empty.research.title'), hint: t('ui.empty.research.hint') }),
  annotations: () => ({ title: t('ui.empty.annotations.title'), hint: t('ui.empty.annotations.hint') }),
};
