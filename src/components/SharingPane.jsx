import React from 'react';
import { t } from '../lib/i18n.js';
import { colorFor } from '../lib/team.js';

// Defaults of Options > Sharing (settings.sharingSync / sharingExport / sharingImport / sharingMobile).
export function sharingDefaults(settings = {}) {
  return {
    sync: { format: 'rtf', notesFormat: 'same', syncOnOpen: false, syncOnClose: false, includeNotes: true, prefixNumbers: true, collection: '', checkEveryMin: 0, ...(settings.sharingSync || {}) },
    export: { format: 'docx', includeNotes: false, includeMeta: false, keepFolders: true, notesFormat: 'md', notesAs: 'word', ...(settings.sharingExport || {}) },
    import: { defaultFormatting: false, webAs: 'page', opmlNoteTo: 'synopsis', footnotes: 'inline', ...(settings.sharingImport || {}) },
    mobile: { folder: '', syncOnOpen: true, syncOnClose: true, ...(settings.sharingMobile || {}) },
  };
}

const FMT = (k) => [
  ['rtf', 'RTF'],
  ['txt', t('ui.compileDialog.text_simplu')],
  ['md', 'Markdown'],
  ...(k === 'sync' ? [['fdx', 'FDX (.fdx)'], ['fountain', 'Fountain']] : []),
];

// Options > Sharing: team, import, export, sync with an external folder, mobile app sync.
// Props: s / set (the dialog's form state for the team fields), sharing / setSharing ({sync, export, import, mobile}), api.
export default function SharingPane({ s, set, sharing, setSharing, api }) {
  const part = (k) => (p) => setSharing((x) => ({ ...x, [k]: { ...x[k], ...p } }));
  const setSync = part('sync');
  const setExp = part('export');
  const setImp = part('import');
  const setMob = part('mobile');
  const check = (checked, onChange, label) => (
    <label className="check">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
  const chooseMobile = async () => {
    const r = await api?.mobileSync?.(null, null, null, 'pick');
    if (r && r.root) setMob({ folder: r.root });
  };
  return (
    <>
      <fieldset>
        <legend>{t('ui.team.echipa')}</legend>
        <p className="muted small">{t('ui.team.setari_explicatie')}</p>
        <div className="row">
          <label>
            {t('ui.team.numele_tau')}
            <input value={s.teamName} onChange={set('teamName')} maxLength={60} placeholder={t('ui.team.nume_exemplu')} />
          </label>
          <label>
            {t('ui.team.culoarea')}
            <input type="color" value={s.teamColor || (s.teamName.trim() ? colorFor(s.teamName.trim()) : '#2e7dd7')} onChange={set('teamColor')} />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>{t('ui.p12.import')}</legend>
        {check(sharing.import.defaultFormatting, (v) => setImp({ defaultFormatting: v }), t('ui.p12.formatareImplicita'))}
        <label>
          {t('ui.p12.paginiWebCa')}
          <select value={sharing.import.webAs} onChange={(e) => setImp({ webAs: e.target.value })}>
            <option value="page">{t('ui.g4.webPagina')}</option>
            <option value="text">{t('ui.g4.webText')}</option>
            <option value="pdf">{t('ui.p12.webPdf')}</option>
            <option value="archive">{t('ui.p12.webArhiva')}</option>
          </select>
        </label>
        <label>
          {t('ui.p12.opmlNota')}
          <select value={sharing.import.opmlNoteTo} onChange={(e) => setImp({ opmlNoteTo: e.target.value })}>
            <option value="synopsis">{t('ui.p12.inSinopsis')}</option>
            <option value="text">{t('ui.p12.inText')}</option>
          </select>
        </label>
        <label>
          {t('ui.p12.noteWord')}
          <select value={sharing.import.footnotes} onChange={(e) => setImp({ footnotes: e.target.value })}>
            <option value="inline">{t('ui.p12.noteInline')}</option>
            <option value="linked">{t('ui.p12.noteLegate')}</option>
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>{t('ui.settingsDialog.export_fisiere_implicit')}</legend>
        <label>
          Format
          <select value={sharing.export.format} onChange={(e) => setExp({ format: e.target.value })}>
            <option value="docx">DOCX</option>
            <option value="odt">ODT</option>
            <option value="rtf">RTF</option>
            <option value="md">Markdown</option>
            <option value="txt">{t('ui.compileDialog.text_simplu')}</option>
            <option value="html">HTML</option>
          </select>
        </label>
        {check(sharing.export.keepFolders, (v) => setExp({ keepFolders: v }), t('ui.settingsDialog.pastreaza_structura_de_dosare'))}
        {check(sharing.export.includeNotes, (v) => setExp({ includeNotes: v }), t('ui.p12.includeNotele'))}
        {check(sharing.export.includeMeta, (v) => setExp({ includeMeta: v }), t('ui.p12.includeMetadatele'))}
        <div className="row">
          <label>
            {t('ui.p12.formatNotite')}
            <select value={sharing.export.notesFormat} onChange={(e) => setExp({ notesFormat: e.target.value })}>
              <option value="md">Markdown</option>
              <option value="same">{t('ui.settingsDialog.ca_textul')}</option>
              <option value="txt">{t('ui.compileDialog.text_simplu')}</option>
              <option value="rtf">RTF</option>
              <option value="docx">DOCX</option>
              <option value="html">HTML</option>
            </select>
          </label>
          <label>
            {t('ui.p12.noteSiComentarii')}
            <select value={sharing.export.notesAs} onChange={(e) => setExp({ notesAs: e.target.value })}>
              <option value="word">{t('ui.p12.caNoteWord')}</option>
              <option value="text">{t('ui.p12.caText')}</option>
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>{t('ui.settingsDialog.sincronizare_cu_folder_extern_implicit')}</legend>
        <div className="row">
          <label>
            {t('ui.p12.formatManuscris')}
            <select value={sharing.sync.format} onChange={(e) => setSync({ format: e.target.value })}>
              {FMT('sync').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>
            {t('ui.p12.formatCercetare')}
            <select value={sharing.sync.notesFormat} onChange={(e) => setSync({ notesFormat: e.target.value })}>
              <option value="same">{t('ui.settingsDialog.ca_textul')}</option>
              {FMT('sync').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        {check(sharing.sync.includeNotes, (v) => setSync({ includeNotes: v }), t('ui.p12.syncCercetare'))}
        {check(sharing.sync.prefixNumbers, (v) => setSync({ prefixNumbers: v }), t('ui.p12.prefixNumar'))}
        <label>
          {t('ui.p12.doarColectia')}
          <input value={sharing.sync.collection} placeholder={t('ui.p12.toateDocumentele')} onChange={(e) => setSync({ collection: e.target.value })} />
        </label>
        {check(sharing.sync.syncOnOpen, (v) => setSync({ syncOnOpen: v }), t('ui.settingsDialog.sincronizeaza_la_deschiderea_proiectului'))}
        {check(sharing.sync.syncOnClose, (v) => setSync({ syncOnClose: v }), t('ui.settingsDialog.sincronizeaza_la_inchiderea_proiectului'))}
        <label>
          {t('ui.p12.verificaLaFiecare')}
          <select value={sharing.sync.checkEveryMin} onChange={(e) => setSync({ checkEveryMin: Number(e.target.value) })}>
            {[0, 1, 5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m ? t('ui.p12.xMinute', { n: m }) : t('ui.p12.niciodata')}</option>)}
          </select>
        </label>
        <p className="muted small">{t('ui.p12.verificaInfo')}</p>
      </fieldset>
      <fieldset>
        <legend>{t('ui.p12.aplicatiaMobila')}</legend>
        <p className="muted small">{t('ui.p12.aplicatiaMobilaInfo')}</p>
        <div className="row">
          <input value={sharing.mobile.folder} placeholder={t('ui.p12.dosarCloud')} aria-label={t('ui.p12.dosarCloud')} onChange={(e) => setMob({ folder: e.target.value })} style={{ flex: 1 }} />
          {api?.mobileSync && <button type="button" onClick={chooseMobile}>{t('btn.choose')}</button>}
        </div>
        {check(sharing.mobile.syncOnOpen, (v) => setMob({ syncOnOpen: v }), t('ui.settingsDialog.sincronizeaza_la_deschiderea_proiectului'))}
        {check(sharing.mobile.syncOnClose, (v) => setMob({ syncOnClose: v }), t('ui.settingsDialog.sincronizeaza_la_inchiderea_proiectului'))}
      </fieldset>
    </>
  );
}
