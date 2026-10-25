import React, { useState } from 'react';
import { t } from '../lib/i18n.js';

export const IMPORT_TEXT_FORMATS = ['.docx', '.rtf', '.odt', '.txt', '.md', '.html', '.xhtml', '.epub', '.fountain', '.fdx'];
export const IMPORT_MEDIA_FORMATS = ['.png', '.jpg', '.gif', '.webp', '.svg', '.tif', '.heic', '.pdf', '.mp3', '.m4a', '.wav', '.mp4', '.mov', '.webm', '.mhtml'];

// File > Import: text files (split options), a whole folder with its structure, media into
// Research, as copies or as linked documents (refreshed when the file changes on disk).
// defaults: Options > Sharing > Import ({defaultFormatting, footnotes: 'inline'|'linked'}).
// onImported(parts): parts are {title, html, linkedFile?, linkedMtime?} | {title, children} | {title, id, media}.
export default function ImportDialog({ api, dir, target, defaults = {}, onImported, onClose, onError }) {
  const [mode, setMode] = useState('h1');
  const [separator, setSeparator] = useState('#');
  const [separatorTitle, setSeparatorTitle] = useState(false);
  const [firstLineTitle, setFirstLineTitle] = useState(false);
  const [defaultFormatting, setDefaultFormatting] = useState(Boolean(defaults.defaultFormatting));
  const [footnotes, setFootnotes] = useState(defaults.footnotes === 'linked' ? 'linked' : 'inline');
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const opts = () => ({ firstLineTitle, separatorTitle, defaultFormatting, footnotes, linked });

  const go = (fn) => async () => {
    setBusy(true);
    try {
      const parts = await fn();
      if (parts && parts.length) {
        onImported(parts);
        onClose();
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const runText = go(() => (api.importText ? api.importText(mode, separator || '#', opts()) : api.importFile(mode, separator || '#', opts())));
  const runFolder = go(() => api.importFolder(dir, opts()));
  const runMedia = go(async () => {
    const res = await api.importFiles(dir, mode, separator || '#', opts());
    return res ? [...(res.texts || []), ...(res.media || [])] : null;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={t('ui.importDialog.importa_text')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.importDialog.importa_word_rtf_odt_text')}</h2>
        <p className="muted">{t('ui.importDialog.documentele_noi_se_adauga_langa')}{target}”. {t('ui.importDialog.modificarile_urmarite_din_word_devin')}</p>
        <p className="muted small" data-testid="import-formats">
          {t('ui.import.formate')} {(api.importText ? IMPORT_TEXT_FORMATS : IMPORT_TEXT_FORMATS.slice(0, 5)).join(', ')}
          <br />
          {t('ui.p12.formateMedia')} {IMPORT_MEDIA_FORMATS.join(', ')}
        </p>
        <label>
          {t('ui.importDialog.imparte_in_documente')}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="none">{t('ui.importDialog.nu_imparti_un_document_pe')}</option>
            <option value="h1">{t('ui.importDialog.la_fiecare_titlu_1_capitole')}</option>
            <option value="h2">{t('ui.importDialog.la_fiecare_titlu_1_si')}</option>
            <option value="separator">{t('ui.importDialog.la_un_rand_separator')}</option>
          </select>
        </label>
        {mode === 'separator' && (
          <>
            <label>
              {t('ui.importDialog.separator_randul_intreg')}
              <input value={separator} onChange={(e) => setSeparator(e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={separatorTitle} onChange={(e) => setSeparatorTitle(e.target.checked)} /> {t('ui.p12.separatorTitlu')}
            </label>
          </>
        )}
        <label className="check">
          <input type="checkbox" checked={firstLineTitle} onChange={(e) => setFirstLineTitle(e.target.checked)} /> {t('ui.g4.primulRandTitlu')}
        </label>
        <label className="check">
          <input type="checkbox" checked={defaultFormatting} onChange={(e) => setDefaultFormatting(e.target.checked)} /> {t('ui.p12.formatareImplicita')}
        </label>
        <label>
          {t('ui.p12.noteWord')}
          <select value={footnotes} onChange={(e) => setFootnotes(e.target.value)}>
            <option value="inline">{t('ui.p12.noteInline')}</option>
            <option value="linked">{t('ui.p12.noteLegate')}</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} /> {t('ui.p12.importLegat')}
        </label>
        {linked && <p className="muted small">{t('ui.p12.importLegatInfo')}</p>}
        <div className="actions">
          <button onClick={onClose}>{t('btn.cancel')}</button>
          {api.importFolder && dir && <button disabled={busy} onClick={runFolder}>{t('ui.p12.importaDosar')}</button>}
          {api.importFiles && dir && <button disabled={busy} onClick={runMedia}>{t('ui.p12.importaMedia')}</button>}
          <button className="primary" disabled={busy} onClick={runText}>{busy ? t('ui.importDialog.se_importa') : t('ui.importDialog.alege_fisiere')}</button>
        </div>
      </div>
    </div>
  );
}

// File > Import > Web Page: address, title (empty = the page's own title), formatted page or plain text.
export function WebImportDialog({ onImport, onClose, defaultAs = 'page', canSaveFile = false }) {
  const [url, setUrl] = useState('https://');
  const [title, setTitle] = useState('');
  const [as, setAs] = useState(['text', 'pdf', 'archive'].includes(defaultAs) && (canSaveFile || defaultAs === 'text') ? defaultAs : 'page');
  const asText = as === 'text';
  const ok = /^https?:\/\/\S+\.\S+/.test(url.trim());
  const submit = () => {
    if (!ok) return;
    onImport({ url: url.trim(), title: title.trim(), asText, as });
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={t('ui.g4.webTitlu')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.g4.webTitlu')}</h2>
        <label>
          {t('ui.g4.webAdresa')}
          <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </label>
        <label>
          {t('ui.g4.webNume')}
          <input value={title} placeholder={t('ui.g4.webNumePh')} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </label>
        <fieldset className="checks">
          <label className="check">
            <input type="radio" name="web-as" checked={as === 'page'} onChange={() => setAs('page')} /> {t('ui.g4.webPagina')}
          </label>
          <label className="check">
            <input type="radio" name="web-as" checked={as === 'text'} onChange={() => setAs('text')} /> {t('ui.g4.webText')}
          </label>
          {canSaveFile && (
            <>
              <label className="check">
                <input type="radio" name="web-as" checked={as === 'pdf'} onChange={() => setAs('pdf')} /> {t('ui.p12.webPdf')}
              </label>
              <label className="check">
                <input type="radio" name="web-as" checked={as === 'archive'} onChange={() => setAs('archive')} /> {t('ui.p12.webArhiva')}
              </label>
            </>
          )}
        </fieldset>
        <div className="actions">
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" disabled={!ok} onClick={submit}>{t('ui.g4.webImporta')}</button>
        </div>
      </div>
    </div>
  );
}
