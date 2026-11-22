import React from 'react';
import { t } from '../lib/i18n.js';
import { htmlToText } from '../lib/text.js';
import { analiza } from '../lib/measure/ritm.js';
import { verifica } from '../lib/measure/verifica.js';

// Panou de semnale (directivă autor): MĂSURĂ deterministă, fără model, fără prompt, fără
// „inteligență” — portul ritm.py + verifica.py din write-for-me, universal pentru orice carte.
// Rezultatele apar aici, în suprafața proprie de măsură, niciodată în chat-ul AI.
// Limbaj de măsură: „semnalează”, „verifică” — niciodată „generează” sau „propune”.
export default function SignalsDialog({ node, html, onClose }) {
  const text = htmlToText(html || '');
  const ritm = analiza(text);
  const semnale = verifica(text);
  const peGrupe = semnale.reduce((acc, s) => {
    const g = s.regula.split('/')[0];
    (acc[g] = acc[g] || []).push(s);
    return acc;
  }, {});
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal signals-dialog" role="dialog" aria-label={t('ui.signals.title')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.signals.title')}</h2>
        <p className="muted small">{t('ui.signals.document', { title: node?.title || '' })}</p>
        <p className="muted small">{t('ui.signals.measureOnly')}</p>
        <fieldset>
          <legend>{t('ui.signals.rhythm')}</legend>
          <pre className="signals-ritm">{ritm.join('\n')}</pre>
        </fieldset>
        <fieldset>
          <legend>{t('ui.signals.signals')} ({semnale.length})</legend>
          {semnale.length === 0 ? (
            <p className="ok">{t('ui.signals.clean')}</p>
          ) : (
            Object.entries(peGrupe).map(([grupa, list]) => (
              <details key={grupa} className="signals-grupa" open={grupa !== 'caractere'}>
                <summary>{grupa} ({list.length})</summary>
                <ul>
                  {list.map((s, i) => (
                    <li key={i}><span className="signals-line">L{s.linie}</span> <span className="signals-rule">{s.regula}</span> «{s.citat}» → {s.fix}</li>
                  ))}
                </ul>
              </details>
            ))
          )}
        </fieldset>
        <p className="muted small">{t('ui.signals.readingRule')}</p>
        <div className="actions">
          <button type="button" onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
