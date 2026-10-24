import React, { useState } from 'react';
import { t } from '../lib/i18n.js';
import { applyCorrections, correctionEdits } from '../lib/textRange.js';

// Result of an in-app translation (DeepL / Google) or a grammar check (LanguageTool) on the selection.
// result: { kind: 'translate', text, service, detected } | { kind: 'grammar', matches, language }
export default function ServiceResultDialog({ source, result, onReplace, onInsertAfter, onClose }) {
  const isGrammar = result.kind === 'grammar';
  const [chosen, setChosen] = useState(() => (isGrammar ? result.matches.map((m) => (m.replacements[0] !== undefined ? 0 : -1)) : []));
  // Corrected text: apply the chosen replacement of each match, from the end so offsets stay valid.
  const corrected = () => applyCorrections(source, result.matches, chosen);
  const copy = (text) => navigator.clipboard && navigator.clipboard.writeText(text);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={isGrammar ? t('ui.services.verificare_gramatica') : t('ui.services.traducere')} onClick={(e) => e.stopPropagation()}>
        <h2>{isGrammar ? t('ui.services.verificare_gramatica') : t('ui.services.traducere_cu', { service: result.service })}</h2>
        {isGrammar ? (
          <>
            <p className="muted small">{result.matches.length ? t('ui.services.n_probleme', { n: result.matches.length, language: result.language || '' }) : t('ui.services.nicio_problema')}</p>
            <ol className="grammar-list">
              {result.matches.map((m, i) => (
                <li key={`${m.offset}-${i}`}>
                  <div><mark>{m.found}</mark> {m.message}</div>
                  {m.replacements.length > 0 && (
                    <div className="row-inline">
                      {m.replacements.map((r, k) => (
                        <label key={k} className="check">
                          <input type="radio" name={`m${i}`} checked={chosen[i] === k} onChange={() => setChosen((c) => c.map((x, j) => (j === i ? k : x)))} /> {r || '∅'}
                        </label>
                      ))}
                      <label className="check">
                        <input type="radio" name={`m${i}`} checked={chosen[i] === -1} onChange={() => setChosen((c) => c.map((x, j) => (j === i ? -1 : x)))} /> {t('ui.services.lasa')}
                      </label>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="translate-pair">
            <div><div className="muted small">{t('ui.services.original')}{result.detected ? ` (${result.detected})` : ''}</div><p>{source}</p></div>
            <div><div className="muted small">{t('ui.services.traducere')}</div><p>{result.text}</p></div>
          </div>
        )}
        <div className="actions">
          {isGrammar ? (
            <button className="primary" disabled={!result.matches.length} onClick={() => onReplace(corrected(), correctionEdits(source, result.matches, chosen))}>{t('ui.services.aplica_corecturile')}</button>
          ) : (
            <>
              <button className="primary" onClick={() => onReplace(result.text)}>{t('ui.services.inlocuieste_selectia')}</button>
              <button onClick={() => onInsertAfter(result.text)}>{t('ui.services.insereaza_dupa')}</button>
              <button onClick={() => copy(result.text)}>{t('ui.ctx.copiaza')}</button>
            </>
          )}
          <span className="spacer" />
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
