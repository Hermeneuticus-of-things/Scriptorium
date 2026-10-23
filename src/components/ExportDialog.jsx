import React, { useState } from 'react';
import { t } from '../lib/i18n.js';

const FORMATS = () => ([
  ['docx', 'Word (.docx)'],
  ['odt', 'OpenDocument (.odt)'],
  ['rtf', 'RTF (.rtf)'],
  ['md', 'Markdown (.md)'],
  ['txt', t('ui.exportDialog.text_simplu_txt')],
  ['html', t('ui.exportDialog.pagina_web_html')],
]);

function findParentFolder(tree, id) {
  let found = null;
  const visit = (nodes, parent) => {
    for (const n of nodes) {
      if (n.id === id) found = n.children ? n : parent;
      if (n.children) visit(n.children, n);
    }
  };
  visit(tree, null);
  return found;
}

export default function ExportDialog({ api, dir, project, selectionIds = [], onClose, onError }) {
  const [tab, setTab] = useState('docs');
  const [scope, setScope] = useState(selectionIds.length ? 'selection' : 'all');
  const [format, setFormat] = useState('docx');
  const [withNotes, setWithNotes] = useState(true);
  const [withSynopsis, setWithSynopsis] = useState(true);
  const [withMeta, setWithMeta] = useState(false);
  const [trackChanges, setTrackChanges] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const folder = selectionIds.length ? findParentFolder(project.tree, selectionIds[0]) : null;

  const run = async () => {
    setBusy(true);
    setDone('');
    try {
      if (tab === 'docs') {
        const ids = scope === 'selection' ? selectionIds : scope === 'folder' && folder ? [folder.id] : null;
        const res = await api.exportDocuments(dir, project, ids, { format, withNotes, withSynopsis, withMeta, trackChanges: format === 'docx' && trackChanges });
        if (res) setDone(t('ui.exportDialog.au_fost_exportate_x_documente', { count: res.count, dir: res.dir }));
      } else if (tab === 'opml') {
        const file = await api.exportOpml(dir, project);
        if (file) setDone(t('ui.exportDialog.schita_a_fost_salvata_in', { file: file }));
      } else {
        const file = await api.exportCsv(dir, project);
        if (file) setDone(t('ui.exportDialog.metadatele_au_fost_salvate_in', { file: file }));
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const tabBtn = (id, label) => (
    <button className={tab === id ? 'primary' : ''} aria-pressed={tab === id} onClick={() => { setTab(id); setDone(''); }}>
      {label}
    </button>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.exportDialog.exporta')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.exportDialog.exporta')}</h2>
        <div className="row">
          {tabBtn('docs', t('group.document'))}
          {tabBtn('opml', 'OPML')}
          {tabBtn('csv', 'Metadate CSV')}
        </div>

        {tab === 'docs' && (
          <div className="fields">
            <p className="muted">{t('ui.exportDialog.fiecare_document_devine_un_fisier')}</p>
            <label>
              {t('ui.exportDialog.ce_se_exporta')}
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="selection" disabled={!selectionIds.length}>{t('ui.exportDialog.selectia')}{selectionIds.length})</option>
                <option value="folder" disabled={!folder}>{t('ui.exportDialog.dosarul_curent')}{folder ? ` („${folder.title}”)` : ''}</option>
                <option value="all">{t('ui.advancedSearchDialog.tot_proiectul')}</option>
              </select>
            </label>
            <label>
              Format
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMATS().map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <div className="checks">
              <label className="check">
                <input type="checkbox" checked={withNotes} onChange={(e) => setWithNotes(e.target.checked)} /> Notele documentului (.notes.md)
              </label>
              <label className="check">
                <input type="checkbox" checked={withSynopsis} onChange={(e) => setWithSynopsis(e.target.checked)} /> Sinopsisul (.synopsis.txt)
              </label>
              <label className="check">
                <input type="checkbox" checked={withMeta} onChange={(e) => setWithMeta(e.target.checked)} /> {t('ui.exportDialog.metadatele_eticheta_stare_cuvinte_cheie')}
              </label>
              {format === 'docx' && (
                <label className="check">
                  <input type="checkbox" checked={trackChanges} onChange={(e) => setTrackChanges(e.target.checked)} /> {t('ui.compileDialog.reviziile_ca_modificari_urmarite_word')}
                </label>
              )}
            </div>
          </div>
        )}
        {tab === 'opml' && (
          <p className="muted">{t('ui.exportDialog.exporta_structura_binder_ului_ca')}</p>
        )}
        {tab === 'csv' && (
          <p className="muted">{t('ui.exportDialog.exporta_un_tabel_cu_metadatele')}</p>
        )}

        {done && <p className="muted" role="status">{done}</p>}
        <div className="actions">
          <button onClick={onClose}>{t('btn.close')}</button>
          <button className="primary" disabled={busy} onClick={run}>{busy ? t('ui.exportDialog.se_exporta') : t('ui.exportDialog.exporta_2')}</button>
        </div>
      </div>
    </div>
  );
}
