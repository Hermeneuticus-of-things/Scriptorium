import React, { useMemo, useState } from 'react';
import { buildRegex, findInHtml } from '../lib/search.js';
import { flatten } from '../lib/tree.js';
import { t } from '../lib/i18n.js';
import { confirmDialog } from '../lib/appDialog.js';
import { EmptyState } from './AppDialogHost.jsx';

export default function FindDialog({ project, docs, onOpen, onReplaceAll, onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [replacement, setReplacement] = useState('');
  const [opts, setOpts] = useState({ regex: false, caseSensitive: false, wholeWord: false, includeTrash: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const re = useMemo(() => buildRegex({ query, ...opts }), [query, opts]);
  const invalid = query && !re;

  const results = useMemo(() => {
    if (!re) return [];
    const trash = project.tree.find((n) => n.root === 'trash');
    const trashIds = new Set(flatten(trash?.children || []).map((n) => n.id));
    const out = [];
    for (const n of flatten(project.tree)) {
      if (n.root || (!opts.includeTrash && trashIds.has(n.id))) continue;
      const hits = findInHtml(docs[n.id] || '', re);
      re.lastIndex = 0;
      const inTitle = re.test(n.title);
      re.lastIndex = 0;
      const inSyn = re.test(n.synopsis || '');
      if (hits.length || inTitle || inSyn) out.push({ node: n, hits, inTitle, inSyn });
    }
    return out;
  }, [re, project, docs, opts.includeTrash]);

  const total = results.reduce((s, r) => s + r.hits.length, 0);
  const toggle = (k) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));

  const replaceAll = async () => {
    const ids = results.map((r) => r.node.id);
    if (!ids.length) return;
    if (!(await confirmDialog({ message: t('ui.findDialog.inlocuiesti_x_aparitii_in_x', { total: total, length: ids.length }), okLabel: t('ui.dlg.inlocuieste_tot') }))) return;
    setBusy(true);
    try {
      const n = await onReplaceAll(ids, re, replacement);
      setMessage(t('ui.advancedSearchDialog.inlocuite_x', { n: n }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.findDialog.cauta_in_proiect')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.findDialog.cauta_si_inlocuieste_in_proiect')}</h2>
        <div className="row">
          <label>
            {t('ui.advancedSearchDialog.cauta')}
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className={invalid ? 'invalid' : ''} />
          </label>
          <label>
            {t('ui.advancedSearchDialog.inlocuieste_cu')}
            <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={opts.regex ? t('ui.advancedSearchDialog.1_pentru_grupuri') : ''} />
          </label>
        </div>
        <div className="checks">
          <label className="check"><input type="checkbox" checked={opts.caseSensitive} onChange={toggle('caseSensitive')} /> {t('ui.compileDialog.tine_cont_de_majuscule')}</label>
          <label className="check"><input type="checkbox" checked={opts.wholeWord} onChange={toggle('wholeWord')} /> {t('ui.advancedSearchDialog.cuvinte_intregi')}</label>
          <label className="check"><input type="checkbox" checked={opts.regex} onChange={toggle('regex')} /> {t('ui.advancedSearchDialog.expresie_regulata')}</label>
          <label className="check"><input type="checkbox" checked={opts.includeTrash} onChange={toggle('includeTrash')} /> {t('ui.advancedSearchDialog.include_cosul')}</label>
        </div>
        {invalid && <p className="warn">{t('ui.advancedSearchDialog.expresie_regulata_invalida')}</p>}
        {re && <p className="muted">{total} {t('ui.findDialog.aparitii_in_text')} {results.length} {t('ui.findDialog.documente_inclusiv_titluri_si_sinopsis')}</p>}
        {re && !results.length && <EmptyState title={t('ui.empty.cautare')} hint={t('ui.empty.cautare_hint')} />}
        <div className="results">
          {results.map(({ node, hits, inTitle, inSyn }) => (
            <div key={node.id} className="result">
              <button className="link" onClick={() => onOpen(node.id)}>
                <strong>{node.title}</strong>
              </button>{' '}
              <small className="muted">
                {hits.length} {t('ui.findDialog.in_text')}{inTitle ? t('ui.findDialog.titlu') : ''}{inSyn ? t('ui.findDialog.sinopsis') : ''}
              </small>
              {hits.slice(0, 5).map((h, i) => (
                <div key={i} className="snippet">
                  {h.before}
                  <mark>{h.match}</mark>
                  {h.after}
                </div>
              ))}
              {hits.length > 5 && <small className="muted">{t('ui.findDialog.inca')} {hits.length - 5}</small>}
            </div>
          ))}
        </div>
        {message && <p className="ok">{message}</p>}
        <div className="actions">
          <button onClick={onClose}>{t('btn.close')}</button>
          <button className="primary" disabled={!re || !total || busy} onClick={replaceAll}>
            {t('ui.advancedSearchDialog.inlocuieste_tot')}
          </button>
        </div>
      </div>
    </div>
  );
}
