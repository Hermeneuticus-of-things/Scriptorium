import React, { useState } from 'react';
import { t } from '../lib/i18n.js';
import { htmlToText } from '../lib/text.js';

// The same paragraph changed on this computer and on another one (src/lib/team.js mergeDoc):
// both versions side by side, the writer picks mine / theirs / both for each clash.
export default function ConflictDialog({ conflict, onApply, onClose }) {
  const clashes = conflict.pieces.filter((p) => typeof p !== 'string');
  const [choices, setChoices] = useState(() => clashes.map(() => 'mine'));
  const pick = (i, v) => setChoices((c) => c.map((x, j) => (j === i ? v : x)));
  const text = (blocks) => blocks.map((b) => htmlToText(b).trim()).filter(Boolean).join('\n\n') || t('ui.conflict.sters');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide conflict-dialog" role="dialog" aria-label={t('ui.conflict.titlu', { title: conflict.title })} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.conflict.titlu', { title: conflict.title })}</h2>
        <p className="muted small">{t('ui.conflict.explicatie', { n: clashes.length })}</p>
        {clashes.map((c, i) => (
          <fieldset key={i} className="conflict-clash">
            <legend>{t('ui.conflict.locul', { n: i + 1 })}</legend>
            <div className="conflict-cols">
              {[
                ['mine', t('ui.conflict.a_mea'), c.mine],
                ['theirs', t('ui.conflict.a_lor'), c.theirs],
              ].map(([v, label, blocks]) => (
                <label key={v} className={`conflict-side ${choices[i] === v ? 'chosen' : ''}`}>
                  <span className="conflict-head">
                    <input type="radio" name={`clash-${i}`} checked={choices[i] === v} onChange={() => pick(i, v)} /> {label}
                  </span>
                  <span className="conflict-text">{text(blocks)}</span>
                </label>
              ))}
            </div>
            <label className="check">
              <input type="radio" name={`clash-${i}`} checked={choices[i] === 'both'} onChange={() => pick(i, 'both')} /> {t('ui.conflict.amandoua')}
            </label>
          </fieldset>
        ))}
        <p className="muted small">{t('ui.conflict.snapshot')}</p>
        <div className="actions">
          <span className="spacer" />
          <button onClick={onClose}>{t('ui.conflict.pastreaza_a_mea')}</button>
          <button className="primary" onClick={() => onApply(choices)}>{t('ui.conflict.aplica')}</button>
        </div>
      </div>
    </div>
  );
}
