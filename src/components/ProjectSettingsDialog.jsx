import React, { useEffect, useRef, useState } from 'react';
import {
  NONE, FIELD_TYPES, FIELD_ALIGNS, SECTION_DEPTHS, makeDraft, applyProjectSettings, validateDraft, moveItem, noneLabel, noneStatus,
  exportMetaSettings, importMetaSettings, formatDraft, cleanDefaultFormatting, uniqueId,
} from '../lib/projectSettings.js';
import { t as tr } from '../lib/i18n.js';
import DefaultFormatPane from './DefaultFormatPane.jsx';

// Languages offered for the project (spelling and Compile); any BCP-47 tag can be typed too.
const LANGS = ['ro', 'en', 'en-GB', 'fr', 'de', 'es', 'it', 'pt', 'hu', 'pl', 'ru', 'uk'];

function IconPreview({ api, dir, file }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    if (file && api?.readMedia) api.readMedia(dir, file).then((u) => alive && setUrl(u)).catch(() => {});
    return () => { alive = false; };
  }, [api, dir, file]);
  return url ? <img className="ps-icon-img" src={url} alt="" width={20} height={20} /> : <span className="ps-icon-img" />;
}

// Export / import of labels, statuses, custom metadata and section types (a small JSON file).
function MetaTransfer({ getProject, onImport }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const exportFile = () => {
    const project = getProject();
    const blob = new Blob([JSON.stringify(exportMetaSettings(project), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(project.title || 'proiect').replace(/[\\/:*?"<>|]+/g, '_')}.meta.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onImport(JSON.parse(await file.text()));
      setMsg(tr('ui.ps.import_ok'));
    } catch {
      setMsg(tr('ui.ps.import_invalid'));
    }
  };
  return (
    <div className="ps-transfer row">
      <button type="button" className="ps-export-meta" onClick={exportFile}>{tr('ui.ps.export_meta')}</button>
      <button type="button" className="ps-import-meta" onClick={() => fileRef.current?.click()}>{tr('ui.ps.import_meta')}</button>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile} />
      {msg && <span className="muted small" role="status">{msg}</span>}
    </div>
  );
}

const TABS = () => ([
  ['sectiuni', tr('ui.projectSettingsDialog.tipuri_de_sectiune')],
  ['formatare', tr('ui.projectSettingsDialog.formatare_implicita')],
  ['metadate', tr('ui.projectSettingsDialog.metadate_proprii')],
  ['etichete', tr('ui.advancedSearchDialog.etichete')],
  ['statusuri', tr('ui.projectSettingsDialog.statusuri')],
  ['autocomplete', tr('ui.projectSettingsDialog.auto_completare')],
  ['foldere', tr('ui.projectSettingsDialog.foldere_speciale')],
  ['icoane', tr('ui.ps.icoane')],
  ['backup', tr('ui.projectSettingsDialog.backup')],
  ['proiect', tr('group.project')],
]);

// Extra project settings kept outside lib/projectSettings.js (merged on save).
function makeExtras(project) {
  const b = project.backup || {};
  return {
    defaultFormatting: { useGlobal: !project.defaultFormatting, f: formatDraft(project.defaultFormatting) },
    autoComplete: (project.autoComplete || []).join('\n'),
    backup: { override: Boolean(b.override), onClose: b.onClose !== false, everyMin: b.everyMin || 0, keep: b.keep || 10, exclude: Boolean(b.exclude) },
    importFolder: project.importFolder || null,
    inboxFolder: project.inboxFolder || null,
  };
}
const TYPE_NAMES = () => ({ text: 'Text', number: tr('ui.ps.numar'), checkbox: tr('ui.projectSettingsDialog.bifa'), list: tr('ui.projectSettingsDialog.lista'), date: tr('ui.projectSettingsDialog.data') });
const LEVELS = () => ([
  ['folders', tr('ui.compileDialog.dosare')],
  ['containers', tr('ui.compileDialog.documente_cu_subdocumente')],
  ['files', tr('ui.projectSettingsDialog.documente_text')],
]);

const CSS = `
.ps-dialog { display: grid; grid-template-columns: 190px 1fr; column-gap: 14px; row-gap: 8px; align-content: start; }
.ps-dialog > * { grid-column: 2; min-width: 0; }
.ps-dialog > h2, .ps-dialog > .actions, .ps-dialog > style { grid-column: 1 / -1; }
.ps-dialog > .actions { grid-row: 30; }
.ps-tabs { grid-column: 1; grid-row: 2 / span 20; display: flex; flex-direction: column; gap: 2px; align-self: stretch; min-height: 340px; border-right: 1px solid rgba(128,128,128,.3); padding-right: 8px; }
.ps-tabs button { text-align: left; border: 0; background: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: inherit; }
.ps-tabs button:hover { background: rgba(128,128,128,.12); }
.ps-tabs button.on { background: var(--accent, #4a6fa5); color: #fff; font-weight: 600; }
.ps-pane { max-height: 62vh; overflow: auto; padding-right: 4px; }
@media (max-width: 640px) { .ps-dialog { display: block; } .ps-tabs { flex-direction: row; flex-wrap: wrap; min-height: 0; border-right: 0; border-bottom: 1px solid rgba(128,128,128,.3); padding-bottom: 6px; } }
.ps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.ps-item { display: flex; align-items: center; gap: 6px; }
.ps-item > input[type=text], .ps-item > input:not([type]) { flex: 1; min-width: 0; }
.ps-item button { padding: 2px 7px; }
.ps-field { border: 1px solid rgba(128,128,128,.3); border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.ps-opts { margin-left: 16px; }
.ps-errors { color: #b33; margin: 0; padding-left: 18px; }
.ps-icon-img { display: inline-block; width: 20px; height: 20px; object-fit: contain; }
.ps-depths { border-collapse: collapse; }
.ps-depths th, .ps-depths td { padding: 3px 6px; text-align: left; }
.ps-transfer { margin-top: 10px; gap: 6px; align-items: center; }
`;

function Reorder({ i, n, pinFirst, onMove }) {
  const lo = pinFirst ? 1 : 0;
  return (
    <>
      <button type="button" title={tr('ui.projectSettingsDialog.muta_in_sus')} disabled={i <= lo} onClick={() => onMove(i, -1)}>↑</button>
      <button type="button" title={tr('ui.projectSettingsDialog.muta_in_jos')} disabled={i < lo || i >= n - 1} onClick={() => onMove(i, 1)}>↓</button>
    </>
  );
}

// Project settings (Scrivener: Project > Project Settings).
export default function ProjectSettingsDialog({ project, folders, onSave, onClose, api, dir, initialTab }) {
  const [d, setD] = useState(() => makeDraft(project));
  const [tab, setTab] = useState(initialTab || 'sectiuni');
  const [errors, setErrors] = useState([]);
  const [x, setX] = useState(() => makeExtras(project));
  const [iconErr, setIconErr] = useState('');
  const setBk = (p) => setX((o) => ({ ...o, backup: { ...o.backup, ...p } }));

  const tabKeys = (e) => {
    const ids = TABS().map(([id]) => id);
    const i = ids.indexOf(tab);
    const n = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: ids.length - 1 }[e.key];
    if (n == null) return;
    e.preventDefault();
    const k = (n + ids.length) % ids.length;
    setTab(ids[k]);
    e.currentTarget.querySelectorAll('[role=tab]')[k]?.focus();
  };

  const set = (p) => setD((x) => ({ ...x, ...p }));
  const setList = (key, fn) => setD((x) => ({ ...x, [key]: fn(x[key]) }));
  const patchAt = (key, i, p) => setList(key, (arr) => arr.map((it, k) => (k === i ? { ...it, ...p } : it)));
  const removeAt = (key, i) => setList(key, (arr) => arr.filter((_, k) => k !== i));
  const move = (key, pinFirst) => (i, delta) => setList(key, (arr) => moveItem(arr, i, delta, pinFirst));

  const save = () => {
    const errs = validateDraft(d);
    setErrors(errs);
    if (errs.length) return;
    onSave({
      ...applyProjectSettings(project, d),
      defaultFormatting: cleanDefaultFormatting(x.defaultFormatting.f, x.defaultFormatting.useGlobal),
      autoComplete: [...new Set(x.autoComplete.split('\n').map((l) => l.trim()).filter(Boolean))],
      backup: { ...x.backup, everyMin: Number(x.backup.everyMin) || 0, keep: Math.max(1, Number(x.backup.keep) || 10) },
      importFolder: x.importFolder,
      inboxFolder: x.inboxFolder,
    });
  };

  const fullFromParts = () => set({ author: [d.authorFirst, d.authorLast].filter(Boolean).join(' ') });
  const doImport = (data) => setD((cur) => importMetaSettings(cur, data));
  // The export takes what the dialog shows now (unsaved edits included).
  const draftProject = () => {
    try {
      return validateDraft(d).length ? project : applyProjectSettings({ ...project, tree: [] }, d);
    } catch {
      return project;
    }
  };
  const transfer = <MetaTransfer getProject={draftProject} onImport={doImport} />;

  const addIcons = async () => {
    setIconErr('');
    try {
      const added = (await api.addMediaFiles(dir)) || [];
      const imgs = added.filter((a) => (a.media?.mime || '').startsWith('image/') && a.media?.file);
      if (!imgs.length && added.length) setIconErr(tr('ui.ps.icon_not_image'));
      setList('customIcons', (arr) => {
        const ids = new Set(arr.map((i) => i.id));
        return [...arr, ...imgs.map((a) => {
          const id = uniqueId('ic', ids);
          ids.add(id);
          return { id, name: (a.media.name || a.title || id).replace(/\.[a-z0-9]+$/i, ''), file: a.media.file };
        })];
      });
    } catch (e) {
      setIconErr(String(e?.message || e));
    }
  };

  const renderSimpleList = (key, withColor) => (
    <ul className="ps-list">
      {d[key].map((it, i) => (
        <li key={i} className="ps-item">
          <input
            value={it.name}
            disabled={i === 0 && it.name === NONE}
            aria-label={tr('ui.keywordsDialog.nume')}
            onChange={(e) => patchAt(key, i, { name: e.target.value })}
          />
          {withColor && (
            <>
              <input type="color" value={it.color || '#000000'} disabled={i === 0} aria-label={tr('ui.collectionsBar.culoare')} onChange={(e) => patchAt(key, i, { color: e.target.value })} />
              <button type="button" title={tr('ui.collectionsBar.fara_culoare')} disabled={i === 0 || !it.color} onClick={() => patchAt(key, i, { color: '' })}>∅</button>
            </>
          )}
          <Reorder i={i} n={d[key].length} pinFirst onMove={move(key, true)} />
          <button
            type="button"
            title={tr('btn.delete')}
            disabled={i === 0}
            onClick={() => {
              if (it.orig && !window.confirm(tr('ui.projectSettingsDialog.stergi_x_documentele_care_il', { name: it.name, NONE: NONE }))) return;
              removeAt(key, i);
            }}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );

  const addNamed = (key, base, extra = {}) =>
    setList(key, (arr) => {
      const names = new Set(arr.map((x) => x.name));
      let name = base;
      for (let k = 2; names.has(name); k++) name = `${base} ${k}`;
      return [...arr, { name, orig: null, ...extra }];
    });

  const fieldPatch = (i, p) => patchAt('customFields', i, p);
  const addField = () =>
    setList('customFields', (arr) => {
      const titles = new Set(arr.map((x) => x.title));
      let title = tr('ui.projectSettingsDialog.camp_nou');
      for (let k = 2; titles.has(title); k++) title = tr('ui.projectSettingsDialog.camp_nou_x', { k: k });
      return [...arr, { id: '', title, type: 'text', options: [], default: '', wraps: false, align: 'left', orig: null }];
    });

  const addSectionType = () =>
    setList('sectionTypes', (arr) => {
      const titles = new Set(arr.map((x) => x.title));
      let title = tr('ui.projectSettingsDialog.tip_nou');
      for (let k = 2; titles.has(title); k++) title = tr('ui.projectSettingsDialog.tip_nou_x', { k: k });
      return [...arr, { id: '', title, orig: null }];
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide ps-dialog" role="dialog" aria-label={tr('ui.projectSettingsDialog.setarile_proiectului')} onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>{tr('ui.projectSettingsDialog.setarile_proiectului')}</h2>
        <div className="ps-tabs" role="tablist" aria-orientation="vertical" aria-label={tr('ui.projectSettingsDialog.sectiuni_setari')} onKeyDown={tabKeys}>
          {TABS().map(([id, label]) => (
            <button
              key={id}
              id={`ps-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="ps-pane"
              tabIndex={tab === id ? 0 : -1}
              className={tab === id ? 'on' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ps-pane" id="ps-pane" role="tabpanel" aria-labelledby={`ps-tab-${tab}`}>

        {tab === 'proiect' && (
          <div className="fields">
            <label>
              {tr('ui.advancedSearchDialog.titlu')}
              <input value={d.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label>
              {tr('ui.projectSettingsDialog.subtitlu')}
              <input value={d.subtitle} placeholder={tr('ui.projectSettingsDialog.subtitlu_exemplu')} onChange={(e) => set({ subtitle: e.target.value })} />
            </label>
            <label>
              {tr('ui.projectSettingsDialog.titlu_prescurtat')}
              <input value={d.titleAbbreviation} onChange={(e) => set({ titleAbbreviation: e.target.value })} />
            </label>
            <div className="row">
              <label>
                {tr('ui.ps.prenume_autor')}
                <input value={d.authorFirst} onChange={(e) => set({ authorFirst: e.target.value })} />
              </label>
              <label>
                {tr('ui.projectSettingsDialog.nume_autor')}
                <input value={d.authorLast} onChange={(e) => set({ authorLast: e.target.value })} />
              </label>
            </div>
            <label>
              {tr('ui.projectSettingsDialog.nume_complet_autor')}
              <input value={d.author} onChange={(e) => set({ author: e.target.value })} />
            </label>
            <div>
              <button type="button" onClick={fullFromParts}>{tr('ui.projectSettingsDialog.completeaza_din_prenume_si_nume')}</button>
            </div>
            <h3>{tr('ui.ps.limba_si_editura')}</h3>
            <label>
              {tr('ui.ps.limba_principala')}
              <input className="ps-language" list="ps-langs" value={d.language} placeholder="ro" onChange={(e) => set({ language: e.target.value })} />
              <datalist id="ps-langs">{LANGS.map((l) => <option key={l} value={l} />)}</datalist>
            </label>
            <p className="muted small">{tr('ui.ps.limba_tip')}</p>
            <label>{tr('ui.ps.editura')}<input className="ps-publisher" value={d.publisher} onChange={(e) => set({ publisher: e.target.value })} /></label>
            <label>ISBN<input className="ps-isbn" value={d.isbn} onChange={(e) => set({ isbn: e.target.value })} /></label>
            <label>{tr('ui.ps.adresa')}<textarea rows={3} value={d.address} onChange={(e) => set({ address: e.target.value })} /></label>
            <label>{tr('ui.ps.drepturi')}<input value={d.rights} placeholder={`© ${new Date().getFullYear()} ${d.author || ''}`.trim()} onChange={(e) => set({ rights: e.target.value })} /></label>
          </div>
        )}

        {tab === 'icoane' && (
          <div className="fields">
            <p className="muted">{tr('ui.ps.icoane_tip')}</p>
            {d.customIcons.length === 0 && <p className="muted">{tr('ui.ps.nicio_icoana')}</p>}
            <ul className="ps-list ps-icons">
              {d.customIcons.map((ic, i) => (
                <li key={ic.id} className="ps-item">
                  <IconPreview api={api} dir={dir} file={ic.file} />
                  <input value={ic.name} aria-label={tr('ui.keywordsDialog.nume')} onChange={(e) => patchAt('customIcons', i, { name: e.target.value })} />
                  <button type="button" title={tr('btn.delete')} onClick={() => window.confirm(tr('ui.ps.sterge_icoana', { name: ic.name })) && removeAt('customIcons', i)}>✕</button>
                </li>
              ))}
            </ul>
            <div>
              <button type="button" className="ps-add-icon" disabled={!api?.addMediaFiles} onClick={addIcons}>{tr('ui.ps.importa_icoana')}</button>
            </div>
            {iconErr && <p className="ps-errors" role="alert">{iconErr}</p>}
          </div>
        )}

        {tab === 'etichete' && (
          <div className="fields">
            <label>
              {tr('ui.projectSettingsDialog.titlul_coloanei')}
              <input value={d.labelTitle} onChange={(e) => set({ labelTitle: e.target.value })} />
            </label>
            {renderSimpleList('labels', true)}
            <div>
              <button type="button" onClick={() => addNamed('labels', tr('ui.projectSettingsDialog.eticheta_noua'), { color: '#888888' })}>{tr('ui.projectSettingsDialog.adauga_eticheta')}</button>
            </div>
            <label>
              {tr('ui.ps.implicit_documente_noi')}
              <select className="ps-default-label" value={d.defaultLabel} onChange={(e) => set({ defaultLabel: e.target.value })}>
                {d.labels.filter((l) => l.orig || l.name === NONE).map((l) => <option key={l.orig || l.name} value={l.orig || l.name}>{noneLabel(l.name, tr)}</option>)}
              </select>
            </label>
            <p className="muted">{tr('ui.projectSettingsDialog.eticheta')}{NONE}{tr('ui.projectSettingsDialog.ramane_prima_si_nu_poate')}</p>
            {transfer}
          </div>
        )}

        {tab === 'statusuri' && (
          <div className="fields">
            <label>
              {tr('ui.projectSettingsDialog.titlul_coloanei')}
              <input value={d.statusTitle} onChange={(e) => set({ statusTitle: e.target.value })} />
            </label>
            {renderSimpleList('statuses', false)}
            <div>
              <button type="button" onClick={() => addNamed('statuses', tr('ui.projectSettingsDialog.status_nou'))}>{tr('ui.projectSettingsDialog.adauga_status')}</button>
            </div>
            <label>
              {tr('ui.ps.implicit_documente_noi')}
              <select className="ps-default-status" value={d.defaultStatus} onChange={(e) => set({ defaultStatus: e.target.value })}>
                {d.statuses.filter((s) => s.orig || s.name === NONE).map((s) => <option key={s.orig || s.name} value={s.orig || s.name}>{noneStatus(s.name, tr)}</option>)}
              </select>
            </label>
            <p className="muted">{tr('ui.ps.status_none', { NONE })}</p>
            {transfer}
          </div>
        )}

        {tab === 'metadate' && (
          <div className="fields">
            {d.customFields.length === 0 && <p className="muted">{tr('ui.projectSettingsDialog.nu_exista_campuri_de_metadate')}</p>}
            {d.customFields.map((f, i) => (
              <div key={i} className="ps-field">
                <div className="row">
                  <label>
                    {tr('ui.advancedSearchDialog.titlu')}
                    <input value={f.title} onChange={(e) => fieldPatch(i, { title: e.target.value })} />
                  </label>
                  <label>
                    {tr('ui.projectSettingsDialog.tip')}
                    <select
                      value={f.type}
                      onChange={(e) => fieldPatch(i, { type: e.target.value, default: e.target.value === 'checkbox' ? false : '', ...(e.target.value === 'number' ? { align: 'right' } : {}) })}
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_NAMES()[t]}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="row">
                  <label>
                    {tr('ui.projectSettingsDialog.valoare_implicita')}
                    {f.type === 'checkbox' ? (
                      <input type="checkbox" checked={f.default === true} onChange={(e) => fieldPatch(i, { default: e.target.checked })} />
                    ) : f.type === 'list' ? (
                      <select value={f.default || ''} onChange={(e) => fieldPatch(i, { default: e.target.value })}>
                        <option value="">(niciuna)</option>
                        {f.options.map((o, k) => (
                          <option key={k} value={o.title}>{o.title}</option>
                        ))}
                      </select>
                    ) : (
                      <input type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} step="any" value={f.default ?? ''} onChange={(e) => fieldPatch(i, { default: e.target.value })} />
                    )}
                  </label>
                  <label>
                    {tr('ui.ps.aliniere_coloana')}
                    <select className="ps-field-align" value={f.align || 'left'} onChange={(e) => fieldPatch(i, { align: e.target.value })}>
                      {FIELD_ALIGNS.map((a) => <option key={a} value={a}>{tr(`ui.ps.align_${a}`)}</option>)}
                    </select>
                  </label>
                </div>
                {f.type === 'number' && <p className="muted small">{tr('ui.ps.numar_tip')}</p>}
                {f.type === 'text' && (
                  <label className="check">
                    <input type="checkbox" checked={Boolean(f.wraps)} onChange={(e) => fieldPatch(i, { wraps: e.target.checked })} /> {tr('ui.projectSettingsDialog.text_pe_mai_multe_randuri')}
                  </label>
                )}
                {f.type === 'list' && (
                  <div className="ps-opts">
                    <span className="muted">{tr('ui.projectSettingsDialog.optiuni')}</span>
                    <ul className="ps-list">
                      {f.options.map((o, k) => (
                        <li key={k} className="ps-item">
                          <input
                            value={o.title}
                            aria-label={tr('ui.projectSettingsDialog.optiune')}
                            onChange={(e) => fieldPatch(i, { options: f.options.map((x, j) => (j === k ? { ...x, title: e.target.value } : x)) })}
                          />
                          <Reorder i={k} n={f.options.length} onMove={(k2, dl) => fieldPatch(i, { options: moveItem(f.options, k2, dl) })} />
                          <button type="button" title={tr('ui.projectSettingsDialog.sterge_optiunea')} onClick={() => fieldPatch(i, { options: f.options.filter((_, j) => j !== k) })}>✕</button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => fieldPatch(i, { options: [...f.options, { id: '', title: tr('ui.projectSettingsDialog.optiune_noua') }] })}>{tr('ui.projectSettingsDialog.adauga_optiune')}</button>
                  </div>
                )}
                <div className="ps-item">
                  <Reorder i={i} n={d.customFields.length} onMove={move('customFields', false)} />
                  <button
                    type="button"
                    onClick={() => {
                      if (f.orig && !window.confirm(tr('ui.projectSettingsDialog.stergi_campul_x_valorile_lui', { title: f.title }))) return;
                      removeAt('customFields', i);
                    }}
                  >
                    {tr('ui.projectSettingsDialog.sterge_campul')}
                  </button>
                </div>
              </div>
            ))}
            <div>
              <button type="button" onClick={addField}>{tr('ui.projectSettingsDialog.adauga_camp')}</button>
            </div>
            {transfer}
          </div>
        )}

        {tab === 'sectiuni' && (
          <div className="fields">
            <ul className="ps-list">
              {d.sectionTypes.map((t, i) => (
                <li key={i} className="ps-item">
                  <input value={t.title} aria-label={tr('ui.advancedSearchDialog.titlu')} onChange={(e) => patchAt('sectionTypes', i, { title: e.target.value })} />
                  <Reorder i={i} n={d.sectionTypes.length} onMove={move('sectionTypes', false)} />
                  <button
                    type="button"
                    title={tr('btn.delete')}
                    onClick={() => {
                      if (t.orig && !window.confirm(tr('ui.projectSettingsDialog.stergi_tipul_de_sectiune_x', { title: t.title }))) return;
                      const removedId = t.id;
                      setD((x) => ({
                        ...x,
                        sectionTypes: x.sectionTypes.filter((_, k) => k !== i),
                        sectionTypeLevels: Object.fromEntries(
                          Object.entries(x.sectionTypeLevels).map(([k, v]) => [k, removedId && v === removedId ? null : v]),
                        ),
                        sectionTypeDepths: x.sectionTypeDepths.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, removedId && v === removedId ? null : v]))),
                      }));
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <button type="button" onClick={addSectionType}>{tr('ui.projectSettingsDialog.adauga_tip_de_sectiune')}</button>
            </div>
            <h3>{tr('ui.projectSettingsDialog.tip_implicit_dupa_nivel')}</h3>
            {d.sectionTypes.some((t) => !t.id) && <p className="muted">{tr('ui.projectSettingsDialog.tipurile_noi_pot_fi_alese')}</p>}
            <p className="muted small">{tr('ui.ps.niveluri_tip')}</p>
            <div className="ps-depths-wrap">
              <table className="ps-depths">
                <thead>
                  <tr>
                    <th>{tr('ui.ps.nivel')}</th>
                    {LEVELS().map(([k, label]) => <th key={k}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {d.sectionTypeDepths.slice(0, SECTION_DEPTHS).map((row, depth) => (
                    <tr key={depth}>
                      <td>{depth + 1}</td>
                      {LEVELS().map(([k, label]) => (
                        <td key={k}>
                          <select
                            className={`ps-depth-${depth + 1}-${k}`}
                            aria-label={`${tr('ui.ps.nivel')} ${depth + 1} · ${label}`}
                            value={row[k] || ''}
                            onChange={(e) => set({ sectionTypeDepths: d.sectionTypeDepths.map((r, j) => (j === depth ? { ...r, [k]: e.target.value || null } : r)) })}
                          >
                            <option value="">{tr('ui.ps.ca_restul')}</option>
                            {d.sectionTypes.filter((t) => t.id).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td>{tr('ui.ps.restul_nivelurilor')}</td>
                    {LEVELS().map(([k, label]) => (
                      <td key={k}>
                        <select
                          aria-label={`${tr('ui.ps.restul_nivelurilor')} · ${label}`}
                          value={d.sectionTypeLevels[k] || ''}
                          onChange={(e) => set({ sectionTypeLevels: { ...d.sectionTypeLevels, [k]: e.target.value || null } })}
                        >
                          <option value="">(niciunul)</option>
                          {d.sectionTypes.filter((t) => t.id).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'foldere' && (
          <div className="fields">
            <label>
              {tr('ui.projectSettingsDialog.dosar_cu_sabloane_de_documente')}
              <select value={d.templateFolder || ''} onChange={(e) => set({ templateFolder: e.target.value || null })}>
                <option value="">(niciunul)</option>
                {(folders || []).map((f) => (
                  <option key={f.id} value={f.id}>{f.path || f.title}</option>
                ))}
              </select>
            </label>
            <p className="muted">{tr('ui.projectSettingsDialog.documentele_din_acest_dosar_apar')}</p>
            <label>
              {tr('ui.projectSettingsDialog.dosar_pentru_importuri')}
              <select value={x.importFolder || ''} onChange={(e) => setX((o) => ({ ...o, importFolder: e.target.value || null }))}>
                <option value="">(Cercetare)</option>
                {(folders || []).map((f) => <option key={f.id} value={f.id}>{f.path || f.title}</option>)}
              </select>
            </label>
            <label>
              {tr('ui.projectSettingsDialog.dosar_pentru_notele_trimise_din')}
              <select value={x.inboxFolder || ''} onChange={(e) => setX((o) => ({ ...o, inboxFolder: e.target.value || null }))}>
                <option value="">(Cercetare)</option>
                {(folders || []).map((f) => <option key={f.id} value={f.id}>{f.path || f.title}</option>)}
              </select>
            </label>
          </div>
        )}

        {tab === 'formatare' && (
          <DefaultFormatPane value={x.defaultFormatting} onChange={(v) => setX((o) => ({ ...o, defaultFormatting: v }))} />
        )}

        {tab === 'autocomplete' && (
          <div className="fields">
            <label>
              {tr('ui.projectSettingsDialog.lista_de_auto_completare_cate')}
              <textarea rows={10} value={x.autoComplete} onChange={(e) => setX((o) => ({ ...o, autoComplete: e.target.value }))} placeholder={tr('ui.projectSettingsDialog.nume_de_personaje_locuri_termeni')} />
            </label>
            <p className="muted">{tr('ui.projectSettingsDialog.termenii_sunt_propusi_in_timpul')}</p>
          </div>
        )}

        {tab === 'backup' && (
          <div className="fields">
            <label className="check">
              <input type="checkbox" checked={x.backup.exclude} onChange={(e) => setBk({ exclude: e.target.checked })} /> {tr('ui.projectSettingsDialog.exclude_acest_proiect_din_backup')}
            </label>
            <label className="check">
              <input type="checkbox" checked={x.backup.override} disabled={x.backup.exclude} onChange={(e) => setBk({ override: e.target.checked })} /> {tr('ui.projectSettingsDialog.setari_proprii_de_backup_pentru')}
            </label>
            {x.backup.override && !x.backup.exclude && (
              <>
                <label className="check">
                  <input type="checkbox" checked={x.backup.onClose} onChange={(e) => setBk({ onClose: e.target.checked })} /> {tr('ui.projectSettingsDialog.backup_la_inchidere')}
                </label>
                <div className="row">
                  <label>{tr('ui.projectSettingsDialog.la_fiecare_minute_0_niciodata')}<input type="number" min="0" step="5" value={x.backup.everyMin} onChange={(e) => setBk({ everyMin: e.target.value })} /></label>
                  <label>{tr('set.backupKeep')}<input type="number" min="1" max="100" value={x.backup.keep} onChange={(e) => setBk({ keep: e.target.value })} /></label>
                </div>
              </>
            )}
          </div>
        )}

        </div>

        {errors.length > 0 && (
          <ul className="ps-errors">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}

        <div className="actions">
          <button type="button" onClick={onClose}>{tr('btn.cancel')}</button>
          <button type="button" className="primary" onClick={save}>{tr('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
