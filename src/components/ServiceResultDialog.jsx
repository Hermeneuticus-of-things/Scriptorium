import React, { useLayoutEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { applyCorrections, correctionEdits } from '../lib/textRange.js';

// Result of an in-app service on the selection: translation (DeepL / Google), grammar (LanguageTool),
// synonyms, or a dictionary lookup. `anchored` + `pos`: the card sits fixed next to the selection,
// INSIDE the page (the author's decision: service results live in the page — no modal popup, no
// trip to the provider's website). Without `anchored` it falls back to the classic modal.
// result: { kind: 'translate', text, service, detected } | { kind: 'grammar', matches, language }
//        | { kind: 'synonyms', word, synonyms } | { kind: 'dict', word, entries: [{label, url}] }
export default function ServiceResultDialog({ source, result, onReplace, onInsertAfter, onClose, onOpenUrl, onSearch, anchored = false, pos = null }) {
  const isGrammar = result.kind === 'grammar';
  const isSynonyms = result.kind === 'synonyms';
  const isDict = result.kind === 'dict';
  const [chosen, setChosen] = useState(() => (isGrammar ? result.matches.map((m) => (m.replacements[0] !== undefined ? 0 : -1)) : []));
  // Corrected text: apply the chosen replacement of each match, from the end so offsets stay valid.
  const corrected = () => applyCorrections(source, result.matches, chosen);
  const copy = (text) => navigator.clipboard && navigator.clipboard.writeText(text);

  const title = isGrammar
    ? t('ui.services.verificare_gramatica')
    : isSynonyms
      ? t('ui.services.sinonime_pentru', { word: result.word })
      : isDict
        ? t('ui.ctx.dictionare')
        : t('ui.services.traducere_cu', { service: result.service });

  const body = (
    <>
      {isSynonyms ? (
        <>
          <p className="muted small">{t('ui.services.alege_sinonim')}</p>
          <div className="synonyms-list">
            {result.synonyms.map((s, i) => (
              <button key={`${s}-${i}`} type="button" className="syn-chip" onClick={() => onReplace(s)}>{s}</button>
            ))}
          </div>
          {result.related && result.related.length > 0 && (
            <>
              <p className="muted small" style={{ marginTop: 8 }}>{t('ui.services.cuvinte_apropiate')}</p>
              <div className="synonyms-list">
                {result.related.map((r) => (
                  <button key={r.word} type="button" className="syn-chip" title={r.synonyms.join(', ')} onClick={() => onSearch?.(r.word)}>{r.word}</button>
                ))}
              </div>
            </>
          )}
        </>
      ) : isGrammar ? (
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
      ) : isDict ? (
        <>
          <p className="muted small">„{result.word}” — {t('ui.ctx.dictionare').toLowerCase()}:</p>
          <div className="synonyms-list">
            {result.entries.map((e, i) => (
              <button key={i} type="button" className="syn-chip" onClick={() => onOpenUrl?.(e.url)}>{e.label}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="translate-pair">
          <div><div className="muted small">{t('ui.services.original')}{result.detected ? ` (${result.detected})` : ''}</div><p>{source}</p></div>
          <div><div className="muted small">{t('ui.services.traducere')}</div><p>{result.text}</p></div>
        </div>
      )}
    </>
  );

  const actions = (
    <div className="actions">
      {isSynonyms || isDict ? null : isGrammar ? (
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
  );

  // Mărimi dinamice: cardul se măsoară după conținut și se plasează ca să acopere cât mai puțin
  // din textul editat — sub selecție, întoarsă deasupra când nu încape, strâns în viewport.
  const cardRef = useRef(null);
  const [adj, setAdj] = useState(null);
  useLayoutEffect(() => {
    if (!anchored || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const ax = pos?.x ?? 120;
    const ay = pos?.y ?? 140;
    let x = Math.min(ax, window.innerWidth - r.width - 12);
    x = Math.max(12, x);
    let y = ay;
    if (y + r.height > window.innerHeight - 12) y = Math.max(12, ay - r.height - 36); // deasupra selecției
    y = Math.max(12, Math.min(y, window.innerHeight - r.height - 12));
    setAdj({ x, y });
  }, [anchored, pos?.x, pos?.y]);
  if (anchored) {
    return (
      <div ref={cardRef} className="service-popover" role="dialog" style={{ left: adj?.x ?? (pos?.x ?? 120), top: adj?.y ?? (pos?.y ?? 140), visibility: adj ? 'visible' : 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {body}
        {actions}
      </div>
    );
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${isSynonyms ? 'syn-modal' : 'wide'}`} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {body}
        {actions}
      </div>
    </div>
  );
}
