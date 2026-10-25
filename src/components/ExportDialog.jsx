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

// The metadata CSV columns (lib/exporters.cjs CSV_COLUMNS) and their labels.
export const CSV_COLUMNS = ['id', 'title', 'path', 'type', 'label', 'status', 'keywords', 'synopsis', 'section_type', 'include_in_compile', 'words', 'target', 'created', 'modified'];
const CSV_DEFAULT = ['id', 'title', 'path', 'type', 'label', 'status', 'keywords', 'section_type', 'include_in_compile', 'words', 'created', 'modified'];
const NOTE_FORMATS = ['md', 'same', 'txt', 'rtf', 'html', 'docx', 'odt'];

export default function ExportDialog({ api, dir, project, selectionIds = [], defaults = {}, onClose, onError }) {
  const [tab, setTab] = useState('docs');
  const [scope, setScope] = useState(selectionIds.length ? 'selection' : 'all');
  const [format, setFormat] = useState(defaults.format || 'docx');
  const [withNotes, setWithNotes] = useState(defaults.includeNotes ?? true);
  const [withSynopsis, setWithSynopsis] = useState(true);
  const [withMeta, setWithMeta] = useState(Boolean(defaults.includeMeta));
  const [notesFormat, setNotesFormat] = useState(defaults.notesFormat || 'md');
  const [notesAs, setNotesAs] = useState(defaults.notesAs || 'word');
  const [withSnapshots, setWithSnapshots] = useState(false);
  const customKeys = [...new Set((project.customFields || project.customMetadata || []).map((d) => (typeof d === 'string' ? d : d.id || d.name)).filter(Boolean))];
  const [csvCols, setCsvCols] = useState(() => [...CSV_DEFAULT, ...customKeys.map((k) => `custom:${k}`)]);
  const toggleCol = (c) => setCsvCols((cols) => (cols.includes(c) ? cols.filter((x) => x !== c) : [...cols, c]));
  const [trackChanges, setTrackChanges] = useState(false);
  const [opmlText, setOpmlText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const folder = selectionIds.length ? findParentFolder(project.tree, selectionIds[0]) : null;

  const run = async () => {
    setBusy(true);
    setDone('');
    try {
      if (tab === 'docs') {
        const ids = scope === 'selection' ? selectionIds : scope === 'folder' && folder ? [folder.id] : null;
        const res = await api.exportDocuments(dir, project, ids, { format, withNotes, withSynopsis, withMeta, notesFormat, notesAs, withSnapshots, trackChanges: format === 'docx' && trackChanges });
        if (res) setDone(t('ui.exportDialog.au_fost_exportate_x_documente', { count: res.count, dir: res.dir }));
      } else if (tab === 'opml') {
        const file = await api.exportOpml(dir, project, { includeText: opmlText });
        if (file) setDone(t('ui.exportDialog.schita_a_fost_salvata_in', { file: file }));
      } else {
        const order = [...CSV_COLUMNS, ...customKeys.map((k) => `custom:${k}`)];
        const file = await api.exportCsv(dir, project, undefined, { columns: order.filter((c) => csvCols.includes(c)) });
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
              <label className="check">
                <input type="checkbox" checked={withSnapshots} onChange={(e) => setWithSnapshots(e.target.checked)} /> {t('ui.p12.exportSnapshoturi')}
              </label>
            </div>
            <div className="row">
              <label>
                {t('ui.p12.formatNotite')}
                <select value={notesFormat} disabled={!withNotes} onChange={(e) => setNotesFormat(e.target.value)} aria-label={t('ui.p12.formatNotite')}>
                  {NOTE_FORMATS.map((f) => <option key={f} value={f}>{f === 'same' ? t('ui.settingsDialog.ca_textul') : f.toUpperCase()}</option>)}
                </select>
              </label>
              <label>
                {t('ui.p12.noteSiComentarii')}
                <select value={notesAs} onChange={(e) => setNotesAs(e.target.value)} aria-label={t('ui.p12.noteSiComentarii')}>
                  <option value="word">{t('ui.p12.caNoteWord')}</option>
                  <option value="text">{t('ui.p12.caText')}</option>
                </select>
              </label>
            </div>
            <p className="muted small">{t('ui.p12.cercetareOriginal')}</p>
          </div>
        )}
        {tab === 'opml' && (
          <div className="fields">
            <p className="muted">{t('ui.exportDialog.exporta_structura_binder_ului_ca')}</p>
            <label className="check">
              <input type="checkbox" checked={opmlText} onChange={(e) => setOpmlText(e.target.checked)} /> {t('ui.g4.opmlNote')}
            </label>
          </div>
        )}
        {tab === 'csv' && (
          <div className="fields">
            <p className="muted">{t('ui.exportDialog.exporta_un_tabel_cu_metadatele')}</p>
            <fieldset className="checks csv-columns" style={{ columns: 2 }}>
              <legend>{t('ui.p12.coloane')}</legend>
              {[...CSV_COLUMNS, ...customKeys.map((k) => `custom:${k}`)].map((c) => (
                <label key={c} className="check">
                  <input type="checkbox" checked={csvCols.includes(c)} onChange={() => toggleCol(c)} /> {c.startsWith('custom:') ? c.slice(7) : t(`ui.p12.col_${c}`)}
                </label>
              ))}
            </fieldset>
          </div>
        )}

        {done && <p className="muted" role="status">{done}</p>}
        <div className="actions">
          <button onClick={onClose}>{t('btn.close')}</button>
          <button className="primary" disabled={busy || (tab === 'csv' && !csvCols.length)} onClick={run}>{busy ? t('ui.exportDialog.se_exporta') : t('ui.exportDialog.exporta_2')}</button>
        </div>
      </div>
    </div>
  );
}
