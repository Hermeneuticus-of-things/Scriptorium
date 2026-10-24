import React, { useEffect, useMemo, useState } from 'react';
import { styleCss, stylesOf } from '../lib/styles.js';
// The presets live in lib/compileFormats.cjs (used by the main process). The
// renderer has no Node and no eval, so it reads the JSON block from the source.
import formatsSource from '../../lib/compileFormats.cjs?raw';
import { t as tr, builtinName } from '../lib/i18n.js';
import { noneLabel, noneStatus } from '../lib/projectSettings.js';

function readPresets() {
  try {
    const m = /\/\* BEGIN_PRESETS_JSON \*\/([\s\S]*?)\/\* END_PRESETS_JSON \*\//.exec(formatsSource);
    return m ? JSON.parse(m[1]) : [];
  } catch {
    return [];
  }
}
const PRESETS = readPresets();

const OUTPUTS = () => ([
  ['docx', 'Word (.docx)'],
  ['pdf', 'PDF'],
  ['epub', 'EPUB (e-book)'],
  ['html', tr('ui.compileDialog.html_pagina_web')],
  ['rtf', 'RTF'],
  ['odt', 'OpenDocument (.odt)'],
  ['md', 'Markdown'],
  ['mmd', 'MultiMarkdown'],
  ['txt', tr('ui.compileDialog.text_simplu')],
  ['fountain', 'Fountain (scenariu)'],
  ['fdx', 'Final Draft (.fdx)'],
  ['tex', 'LaTeX'],
  ['print', tr('ui.compileDialog.tiparire_previzualizare')],
]);

const PAGE_SIZES = [
  ['A4', 'A4 (210 × 297 mm)'],
  ['A5', 'A5 (148 × 210 mm)'],
  ['Letter', 'Letter (8,5 × 11 in)'],
  ['6x9', '6 × 9 in (paperback)'],
  ['5x8', '5 × 8 in'],
  ['5.5x8.5', '5,5 × 8,5 in'],
];

const FONTS = ['Times New Roman', 'Georgia', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Cambria', 'Arial', 'Helvetica', 'Calibri'];

const TABS = () => ([
  ['continut', tr('ui.compileDialog.continut')],
  ['sectiuni', tr('ui.compileDialog.sectiuni')],
  ['separatoare', tr('ui.compileDialog.separatoare')],
  ['inlocuiri', tr('ui.compileDialog.inlocuiri')],
  ['note', tr('ui.advancedSearchDialog.note')],
  ['pagina', tr('ui.compileDialog.pagina')],
  ['metadate', 'Metadate'],
]);

const LAYOUT_DEFAULTS = {
  showTitle: true,
  titlePrefix: '',
  titleSuffix: '',
  titleCase: 'normal',
  titleAlign: 'center',
  pageBreakBefore: false,
  showText: true,
  separatorBefore: 'auto',
};

const clone = (x) => JSON.parse(JSON.stringify(x));

function walk(nodes, fn, depth = 0) {
  for (const n of nodes || []) {
    fn(n, depth);
    walk(n.children, fn, depth + 1);
  }
}

function folderOptions(tree) {
  const out = [];
  walk(tree, (n, depth) => {
    if (n.type === 'folder' && n.root !== 'trash') out.push({ id: n.id, title: `${'  '.repeat(depth)}${n.title}` });
  });
  return out;
}

function imageItems(tree) {
  const out = [];
  walk(tree, (n) => {
    if (n.type === 'file' && n.media && String(n.media.mime || '').startsWith('image/')) out.push(n);
  });
  return out;
}

async function toBase64Image(url) {
  const m = /^data:([^;,]+);base64,(.*)$/.exec(url || '');
  if (m) return { mime: m[1], data: m[2] };
  const res = await fetch(url);
  const blob = await res.blob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { mime: blob.type || 'image/jpeg', data: btoa(bin) };
}

function newCustomId() {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function CompileDialog({ api, dir, project, selectionIds = [], onProjectChange, onClose, onError }) {
  const pc = project.compile || {};
  const [formats, setFormats] = useState(() => (Array.isArray(pc.formats) ? clone(pc.formats) : []));
  // Global formats (userData/compile-formats.json), shared by all projects.
  const [globals, setGlobals] = useState([]);
  const [globalsLoaded, setGlobalsLoaded] = useState(!api.listGlobalFormats);
  useEffect(() => {
    if (!api.listGlobalFormats) return;
    api
      .listGlobalFormats()
      .then((l) => setGlobals(Array.isArray(l) ? l : []))
      .catch(onError)
      .finally(() => setGlobalsLoaded(true));
  }, [api, onError]);
  const all = useMemo(() => [...PRESETS, ...globals.filter((g) => !formats.some((f) => f.id === g.id)), ...formats], [formats, globals]);
  const [formatId, setFormatId] = useState(() => (pc.formatId || (PRESETS[0] || {}).id));
  const format = all.find((f) => f.id === formatId) || PRESETS[0] || null;
  const isGlobal = Boolean(format && format.global && !formats.some((f) => f.id === format.id));
  const editable = Boolean(format && !format.builtin);
  useEffect(() => {
    if (globalsLoaded && !all.some((f) => f.id === formatId)) setFormatId((PRESETS[0] || {}).id);
  }, [globalsLoaded, all, formatId]);
  const [collectionId, setCollectionId] = useState(pc.collectionId || '');
  const [trackChanges, setTrackChanges] = useState(Boolean(pc.trackChanges));
  const collections = (project.collections || []).filter((c) => Array.isArray(c.ids));

  const [output, setOutput] = useState(pc.output || 'docx');
  const [scope, setScope] = useState(pc.scope || 'draft');
  const [rootId, setRootId] = useState(pc.rootId || '');
  const [frontMatterId, setFront] = useState(pc.frontMatterId || '');
  const [backMatterId, setBack] = useState(pc.backMatterId || '');
  const [titlePage, setTitlePage] = useState(pc.titlePage ?? null);
  const [toc, setToc] = useState(pc.toc ?? null);
  const [labels, setLabels] = useState(pc.labels || []);
  const [statuses, setStatuses] = useState(pc.statuses || []);
  const [epub, setEpub] = useState({ language: 'ro', ...(pc.epub || {}) });
  const [coverId, setCoverId] = useState(pc.coverId || '');
  const [tab, setTab] = useState('continut');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [preview, setPreview] = useState(null);

  const folders = useMemo(() => folderOptions(project.tree), [project.tree]);
  const images = useMemo(() => imageItems(project.tree), [project.tree]);
  const labelNames = (project.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  const statusNames = (project.statuses || []).map((s) => (typeof s === 'string' ? s : s.name));
  const draftFolders = folders.filter((f) => f.id !== (project.tree[1] && project.tree[1].id));

  useEffect(() => {
    if (scope === 'folder' && !rootId && project.tree[0]) setRootId(project.tree[0].id);
  }, [scope, rootId, project.tree]);

  // --- format editing -------------------------------------------------------------
  const saveGlobals = async (list) => {
    const saved = await api.saveGlobalFormats(list);
    setGlobals(Array.isArray(saved) ? saved : list);
  };
  const patchFormat = (fn) => {
    if (!editable) return;
    if (isGlobal) {
      saveGlobals(globals.map((f) => (f.id === formatId ? fn(clone(f)) : f))).catch(onError);
      return;
    }
    setFormats((list) => list.map((f) => (f.id === formatId ? fn(clone(f)) : f)));
  };
  // Copies the current format into the global list (or back into the project).
  const makeGlobal = async () => {
    if (!format || !api.saveGlobalFormats) return;
    try {
      const copy = clone(format);
      delete copy.builtin;
      copy.basedOn = format.basedOn || format.id;
      copy.id = newCustomId();
      copy.global = true;
      copy.name = window.prompt('Numele formatului global', format.name) || format.name;
      await saveGlobals([...globals, copy]);
      setFormatId(copy.id);
    } catch (e) {
      onError(e);
    }
  };
  const setIn = (path, value) =>
    patchFormat((f) => {
      let o = f;
      for (let i = 0; i < path.length - 1; i++) {
        if (o[path[i]] == null || typeof o[path[i]] !== 'object') o[path[i]] = {};
        o = o[path[i]];
      }
      o[path[path.length - 1]] = value;
      return f;
    });

  const duplicate = () => {
    if (!format) return;
    const copy = clone(format);
    delete copy.builtin;
    copy.basedOn = format.basedOn || format.id;
    copy.id = newCustomId();
    copy.name = tr('ui.compileDialog.x_copie', { name: format.name });
    setFormats((l) => [...l, copy]);
    setFormatId(copy.id);
  };
  const rename = () => {
    if (!editable) return;
    const name = window.prompt('Numele formatului', format.name);
    if (name && name.trim()) setIn(['name'], name.trim());
  };
  const remove = () => {
    if (!editable || !window.confirm(tr('ui.compileDialog.stergi_formatul_x', { name: format.name }))) return;
    if (isGlobal) saveGlobals(globals.filter((f) => f.id !== formatId)).catch(onError);
    else setFormats((l) => l.filter((f) => f.id !== formatId));
    setFormatId((PRESETS[0] || {}).id);
  };

  // --- settings / options ------------------------------------------------------------
  const settings = () => ({
    ...pc,
    formatId,
    formats,
    output,
    scope,
    rootId,
    frontMatterId,
    backMatterId,
    titlePage,
    toc,
    labels,
    statuses,
    epub,
    coverId,
    collectionId,
    trackChanges,
  });

  const persist = () => {
    const next = { ...project, compile: settings() };
    onProjectChange(next);
    return next;
  };

  const buildOptions = async (next) => {
    const styles = stylesOf(next);
    const opts = {
      format: clone(format),
      formatId,
      frontMatterId: frontMatterId || null,
      backMatterId: backMatterId || null,
      labels,
      statuses,
      epub,
      styles,
      styleCss: styleCss(styles, 'body'),
      projectDir: dir, // <$img:Name> placeholders read images from the project's media
    };
    if (collectionId) opts.collectionId = collectionId;
    if (output === 'docx' && trackChanges) {
      opts.trackChanges = true;
      opts.trackAuthor = next.author || '';
    }
    if (titlePage !== null) opts.titlePage = titlePage;
    if (toc !== null) opts.toc = toc;
    if (scope === 'folder' && rootId) opts.rootId = rootId;
    if (scope === 'selection' && selectionIds.length) opts.ids = [...selectionIds];
    if (['epub', 'pdf', 'docx'].includes(output) && coverId && api.readMedia) {
      const node = images.find((n) => n.id === coverId);
      if (node) opts.coverImage = await toBase64Image(await api.readMedia(dir, node.media.file));
    }
    return opts;
  };

  const run = async () => {
    setBusy(true);
    setDone('');
    try {
      const next = persist();
      if (output === 'print') {
        if (!api.printPreview) throw new Error(tr('ui.compileDialog.previzualizarea_tiparirii_nu_este_disponibila'));
        await api.printPreview(dir, next, { ...(await buildOptions(next)), compiled: true });
        return;
      }
      const file = await api.exportCompiled(dir, next, output, await buildOptions(next));
      if (file) setDone(file);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const showPreview = async () => {
    setBusy(true);
    try {
      const opts = await buildOptions(project);
      if (api.previewCompiled) {
        setPreview(await api.previewCompiled(dir, project, opts));
      } else {
        // Simple fallback when the main process has no preview handler.
        const parts = [];
        const visit = async (nodes) => {
          for (const n of nodes || []) {
            if (n.includeInCompile === false || n.type === 'file') continue;
            if (n.type === 'folder') parts.push(`<h2>${n.title.replace(/</g, '&lt;')}</h2>`);
            parts.push((await api.readDoc(dir, n.id)) || '');
            await visit(n.children);
          }
        };
        await visit(project.tree[0].children);
        setPreview(tr('ui.compileDialog.doctype_html_meta_charset_utf', { styleCss: opts.styleCss, v1: parts.join('') }));
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  // --- section types --------------------------------------------------------------------
  const typeTitles = useMemo(() => {
    const set = new Set((project.sectionTypes || []).map((t) => t.title));
    Object.keys((format && format.layouts) || {}).forEach((k) => !k.startsWith('@') && set.add(k));
    return [...set];
  }, [project.sectionTypes, format]);
  const layoutOf = (t) => ({ ...LAYOUT_DEFAULTS, ...((format && format.layouts && format.layouts[t]) || {}) });
  const setLayout = (t, key, value) => setIn(['layouts', t], { ...layoutOf(t), [key]: value });

  if (!format) return null;
  const xf = format.transforms || {};
  const ty = format.typography || {};
  const page = format.page;
  const sep = format.separators || {};
  const reps = format.replacements || [];

  const toggleIn = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const num = (path, def = 0) => (e) => setIn(path, e.target.value === '' ? def : Number(e.target.value));

  const sepEditor = (key, label) => {
    const s = sep[key] || { kind: 'none', text: '' };
    return (
      <div className="row">
        <label>
          {label}
          <select value={s.kind} onChange={(e) => setIn(['separators', key], { ...s, kind: e.target.value })}>
            <option value="text">Text</option>
            <option value="page">{tr('ui.compileDialog.pagina_noua')}</option>
            <option value="space">{tr('ui.compileDialog.rand_gol')}</option>
            <option value="none">{tr('ui.compileDialog.nimic')}</option>
          </select>
        </label>
        {s.kind === 'text' && (
          <label>
            Text
            <input value={s.text || ''} onChange={(e) => setIn(['separators', key], { ...s, text: e.target.value })} />
          </label>
        )}
      </div>
    );
  };

  const hfEditor = (key, label) => (
    <div className="row">
      <span className="cd-hf-label">{label}</span>
      {['left', 'center', 'right'].map((pos) => (
        <input
          key={pos}
          aria-label={`${label} ${pos === 'left' ? tr('ui.compileDialog.stanga') : pos === 'center' ? 'centru' : 'dreapta'}`}
          placeholder={pos === 'left' ? tr('ui.compileDialog.stanga') : pos === 'center' ? 'centru' : 'dreapta'}
          value={(page && page[key] && page[key][pos]) || ''}
          onChange={(e) => setIn(['page', key, pos], e.target.value)}
        />
      ))}
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide compile-dialog" role="dialog" aria-label={tr('ui.compileDialog.compileaza')} onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>{tr('ui.compileDialog.compileaza')}</h2>
        <div className="cd-body">
          <aside className="cd-formats">
            <h3>Formate</h3>
            <ul>
              {all.map((f) => (
                <li key={f.id}>
                  <button type="button" className={f.id === formatId ? 'active' : ''} onClick={() => setFormatId(f.id)}>
                    {builtinName('format', f)}
                    {f.builtin ? '' : f.global && !formats.some((x) => x.id === f.id) ? ' 🌐' : ' ✎'}
                  </button>
                </li>
              ))}
            </ul>
            <div className="cd-format-actions">
              <button type="button" onClick={duplicate}>{tr('cmd.duplicate')}</button>
              <button type="button" onClick={rename} disabled={!editable}>{tr('set.binderDbl.rename')}</button>
              <button type="button" onClick={remove} disabled={!editable}>{tr('btn.delete')}</button>
              {api.saveGlobalFormats && (
                <button type="button" onClick={makeGlobal} title={tr('ui.compileDialog.salveaza_o_copie_disponibila_in')}>
                  {tr('ui.compileDialog.salveaza_global')}
                </button>
              )}
            </div>
            {isGlobal && <p className="muted small">{tr('ui.compileDialog.format_global_modificarile_se_salveaza')}</p>}
            {!editable && <p className="muted small">{tr('ui.compileDialog.formatele_predefinite_nu_se_modifica')}</p>}
          </aside>

          <section className="cd-main">
            <div className="row">
              <label>
                {tr('ui.compileDialog.format_de_iesire')}
                <select value={output} onChange={(e) => setOutput(e.target.value)}>
                  {OUTPUTS().map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <nav className="cd-tabs" role="tablist">
              {TABS().map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="cd-panel">
              {tab === 'continut' && (
                <div>
                  <fieldset>
                    <legend>{tr('ui.compileDialog.ce_se_compileaza')}</legend>
                    <label className="check">
                      <input type="radio" checked={scope === 'draft'} onChange={() => setScope('draft')} /> {tr('ui.compileDialog.tot_manuscrisul')}{project.tree[0].title}”)
                    </label>
                    <label className="check">
                      <input type="radio" checked={scope === 'folder'} onChange={() => setScope('folder')} /> {tr('ui.compileDialog.un_dosar')}
                    </label>
                    {scope === 'folder' && (
                      <select value={rootId} onChange={(e) => setRootId(e.target.value)} aria-label={tr('ui.compileDialog.dosar')}>
                        {draftFolders.map((f) => (
                          <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                      </select>
                    )}
                    <label className="check">
                      <input type="radio" checked={scope === 'selection'} disabled={!selectionIds.length} onChange={() => setScope('selection')} /> {tr('ui.compileDialog.selectia_curenta')}{selectionIds.length} elemente)
                    </label>
                  </fieldset>
                  <div className="row">
                    <label>
                      {tr('ui.compileDialog.materie_de_inceput_front_matter')}
                      <select value={frontMatterId} onChange={(e) => setFront(e.target.value)}>
                        <option value="">{tr('ui.app.fara')}</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Materie de final (back matter)
                      <select value={backMatterId} onChange={(e) => setBack(e.target.value)}>
                        <option value="">{tr('ui.app.fara')}</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="check">
                    <input type="checkbox" checked={titlePage ?? Boolean(format.titlePage)} onChange={(e) => setTitlePage(e.target.checked)} /> {tr('ui.compileDialog.pagina_de_titlu_automata_titlu')}
                  </label>
                  {(output === 'pdf' || output === 'docx') && images.length > 0 && (
                    <label>
                      {tr('ui.compileDialog.coperta_prima_pagina')}
                      <select value={coverId} onChange={(e) => setCoverId(e.target.value)}>
                        <option value="">{tr('ui.compileDialog.fara_coperta')}</option>
                        {images.map((n) => (
                          <option key={n.id} value={n.id}>{n.title}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="check">
                    <input type="checkbox" checked={toc ?? Boolean(format.toc)} onChange={(e) => setToc(e.target.checked)} /> {tr('ui.compileDialog.cuprins')}
                    {output === 'epub' && <span className="muted"> {tr('ui.compileDialog.in_epub_cuprinsul_de_navigare')}</span>}
                  </label>
                  {output === 'docx' && (
                    <label className="check">
                      <input type="checkbox" checked={trackChanges} onChange={(e) => setTrackChanges(e.target.checked)} /> {tr('ui.compileDialog.reviziile_ca_modificari_urmarite_word')}
                    </label>
                  )}
                  <fieldset>
                    <legend>{tr('ui.compileDialog.filtre_gol_toate')}</legend>
                    <div className="cd-chips">
                      <span className="muted">{tr('ui.compileDialog.etichete')}</span>
                      {labelNames.map((l) => (
                        <label key={l} className="check">
                          <input type="checkbox" checked={labels.includes(l)} onChange={() => toggleIn(labels, setLabels, l)} /> {noneLabel(l, tr)}
                        </label>
                      ))}
                    </div>
                    {collections.length > 0 && (
                      <label>
                        {tr('ui.compileDialog.colectie')}
                        <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                          <option value="">{tr('ui.compileDialog.toate_documentele')}</option>
                          {collections.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="cd-chips">
                      <span className="muted">{tr('ui.compileDialog.stari')}</span>
                      {statusNames.map((s) => (
                        <label key={s} className="check">
                          <input type="checkbox" checked={statuses.includes(s)} onChange={() => toggleIn(statuses, setStatuses, s)} /> {noneStatus(s, tr)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {tab === 'sectiuni' && (
                <fieldset disabled={!editable}>
                  <p className="muted small">
                    {tr('ui.compileDialog.fiecare_tip_de_sectiune_primeste')}
                  </p>
                  <div className="row">
                    {[['folder', tr('ui.compileDialog.dosare')], ['container', tr('ui.compileDialog.documente_cu_subdocumente')], ['file', tr('group.document')]].map(([k, label]) => (
                      <label key={k}>
                        {label}
                        <select value={(format.defaultLayouts || {})[k] || ''} onChange={(e) => setIn(['defaultLayouts', k], e.target.value)}>
                          {typeTitles.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>{tr('ui.compileDialog.tip_de_sectiune')}</th>
                        <th>{tr('ui.advancedSearchDialog.titlu')}</th>
                        <th>Prefix</th>
                        <th>Sufix</th>
                        <th>Litere</th>
                        <th>Aliniere</th>
                        <th>{tr('ui.compileDialog.pagina_noua')}</th>
                        <th>Text</th>
                        <th>{tr('ui.compileDialog.separator_inainte')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeTitles.map((t) => {
                        const l = layoutOf(t);
                        return (
                          <tr key={t}>
                            <td>{t}</td>
                            <td><input type="checkbox" aria-label={tr('ui.compileDialog.arata_titlul')} checked={l.showTitle} onChange={(e) => setLayout(t, 'showTitle', e.target.checked)} /></td>
                            <td><input aria-label="Prefix" value={l.titlePrefix.replace(/\n/g, '\\n')} onChange={(e) => setLayout(t, 'titlePrefix', e.target.value.replace(/\\n/g, '\n'))} /></td>
                            <td><input aria-label="Sufix" value={l.titleSuffix.replace(/\n/g, '\\n')} onChange={(e) => setLayout(t, 'titleSuffix', e.target.value.replace(/\\n/g, '\n'))} /></td>
                            <td>
                              <select aria-label="Litere" value={l.titleCase} onChange={(e) => setLayout(t, 'titleCase', e.target.value)}>
                                <option value="normal">Normale</option>
                                <option value="upper">MAJUSCULE</option>
                                <option value="smallcaps">{tr('ui.compileDialog.majuscule_mici')}</option>
                              </select>
                            </td>
                            <td>
                              <select aria-label="Aliniere" value={l.titleAlign || 'center'} onChange={(e) => setLayout(t, 'titleAlign', e.target.value)}>
                                <option value="center">{tr('ui.compileDialog.centru')}</option>
                                <option value="left">{tr('ui.compileDialog.stanga_2')}</option>
                                <option value="right">{tr('ui.compileDialog.dreapta')}</option>
                              </select>
                            </td>
                            <td><input type="checkbox" aria-label={tr('ui.compileDialog.pagina_noua')} checked={Boolean(l.pageBreakBefore)} onChange={(e) => setLayout(t, 'pageBreakBefore', e.target.checked)} /></td>
                            <td><input type="checkbox" aria-label={tr('ui.compileDialog.arata_textul')} checked={l.showText} onChange={(e) => setLayout(t, 'showText', e.target.checked)} /></td>
                            <td>
                              <select aria-label={tr('ui.compileDialog.separator_inainte')} value={l.separatorBefore} onChange={(e) => setLayout(t, 'separatorBefore', e.target.value)}>
                                <option value="auto">{tr('ui.compileDialog.automat')}</option>
                                <option value="none">{tr('ui.compileDialog.nimic')}</option>
                                <option value="text">Text</option>
                                <option value="page">{tr('ui.compileDialog.pagina_noua')}</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </fieldset>
              )}

              {tab === 'separatoare' && (
                <fieldset disabled={!editable}>
                  {sepEditor('sameType', tr('ui.compileDialog.intre_sectiuni_de_acelasi_tip'))}
                  {sepEditor('differentType', tr('ui.compileDialog.intre_sectiuni_de_tipuri_diferite'))}
                  <p className="muted small">{tr('ui.compileDialog.o_sectiune_care_incepe_pe')}</p>
                </fieldset>
              )}

              {tab === 'inlocuiri' && (
                <fieldset disabled={!editable}>
                  <legend>{tr('ui.compileDialog.transformari')}</legend>
                  {[
                    ['smartQuotes', 'Ghilimele drepte → „…”'],
                    ['dashes', tr('ui.compileDialog.doua_cratime_linie_de_dialog')],
                    ['removeHighlights', tr('ui.compileDialog.elimina_evidentierile')],
                    ['removeColors', tr('ui.compileDialog.elimina_culorile_textului')],
                    ['linksToText', tr('ui.compileDialog.legaturile_interne_devin_text_simplu')],
                  ].map(([k, label]) => (
                    <label key={k} className="check">
                      <input type="checkbox" checked={Boolean(xf[k])} onChange={(e) => setIn(['transforms', k], e.target.checked)} /> {label}
                    </label>
                  ))}
                  <h4>{tr('ui.compileDialog.inlocuiri_doar_in_text')}</h4>
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>{tr('ui.advancedSearchDialog.cauta')}</th>
                        <th>{tr('ui.advancedSearchDialog.inlocuieste_cu')}</th>
                        <th>Regex</th>
                        <th>{tr('ui.compileDialog.cuvant_intreg')}</th>
                        <th>Majuscule</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {reps.map((r, i) => {
                        const set = (k, v) => setIn(['replacements'], reps.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                        return (
                          <tr key={i}>
                            <td><input aria-label={tr('ui.advancedSearchDialog.cauta')} value={r.find || ''} onChange={(e) => set('find', e.target.value)} /></td>
                            <td><input aria-label={tr('ui.advancedSearchDialog.inlocuieste_cu')} value={r.replace || ''} onChange={(e) => set('replace', e.target.value)} /></td>
                            <td><input type="checkbox" aria-label="Regex" checked={Boolean(r.regex)} onChange={(e) => set('regex', e.target.checked)} /></td>
                            <td><input type="checkbox" aria-label={tr('ui.compileDialog.cuvant_intreg')} checked={Boolean(r.wholeWord)} onChange={(e) => set('wholeWord', e.target.checked)} /></td>
                            <td><input type="checkbox" aria-label={tr('ui.compileDialog.tine_cont_de_majuscule')} checked={Boolean(r.caseSensitive)} onChange={(e) => set('caseSensitive', e.target.checked)} /></td>
                            <td><button type="button" title={tr('btn.delete')} onClick={() => setIn(['replacements'], reps.filter((_, j) => j !== i))}>✕</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <button type="button" onClick={() => setIn(['replacements'], [...reps, { find: '', replace: '', regex: false, wholeWord: false, caseSensitive: false }])}>
                    {tr('ui.compileDialog.adauga_inlocuire')}
                  </button>
                </fieldset>
              )}

              {tab === 'note' && (
                <fieldset disabled={!editable}>
                  <label>
                    Notele de subsol
                    <select value={xf.notes || 'footnotes'} onChange={(e) => setIn(['transforms', 'notes'], e.target.value)}>
                      <option value="footnotes">{tr('ui.compileDialog.note_de_subsol')}</option>
                      <option value="endnotes-chapter">{tr('ui.compileDialog.note_la_finalul_fiecarui_capitol')}</option>
                      <option value="endnotes-book">{tr('ui.compileDialog.note_la_finalul_cartii')}</option>
                    </select>
                  </label>
                  <label>
                    {tr('ui.compileDialog.noteNumbering')}
                    <select value={xf.noteNumbering || 'arabic'} onChange={(e) => setIn(['transforms', 'noteNumbering'], e.target.value)}>
                      {['arabic', 'roman', 'alpha', 'symbols'].map((k) => (
                        <option key={k} value={k}>{tr(`ui.compileDialog.noteNumbering.${k}`)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={Boolean(xf.noteRestart)} onChange={(e) => setIn(['transforms', 'noteRestart'], e.target.checked)} /> {tr('ui.compileDialog.noteRestart')}
                  </label>
                  <label>
                    Comentarii
                    <select value={xf.comments || 'strip'} onChange={(e) => setIn(['transforms', 'comments'], e.target.value)}>
                      <option value="strip">{tr('ui.compileDialog.se_elimina')}</option>
                      <option value="export">{tr('ui.compileDialog.comentarii_word_doar_docx')}</option>
                    </select>
                  </label>
                  <p className="muted small">{tr('ui.compileDialog.adnotarile_din_text_nu_ajung')}</p>
                </fieldset>
              )}

              {tab === 'pagina' && (
                <fieldset disabled={!editable}>
                  <legend>Text</legend>
                  <div className="row">
                    <label>
                      Font
                      <select value={ty.fontFamily} onChange={(e) => setIn(['typography', 'fontFamily'], e.target.value)}>
                        {[...new Set([ty.fontFamily, ...FONTS])].map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Font titluri
                      <select value={ty.headingFont || ''} onChange={(e) => setIn(['typography', 'headingFont'], e.target.value)}>
                        <option value="">{tr('ui.compileDialog.acelasi')}</option>
                        {FONTS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {tr('ui.compileDialog.marime_pt')}
                      <input type="number" min="7" max="24" step="0.5" value={ty.fontSizePt} onChange={num(['typography', 'fontSizePt'], 12)} />
                    </label>
                    <label>
                      {tr('ui.compileDialog.spatiere_randuri')}
                      <select value={ty.lineSpacing} onChange={num(['typography', 'lineSpacing'], 1.5)}>
                        {[1, 1.15, 1.2, 1.4, 1.5, 2].map((v) => (
                          <option key={v} value={v}>{String(v).replace('.', ',')}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="row">
                    <label>
                      Alineat (in)
                      <input type="number" min="0" max="2" step="0.05" value={ty.firstLineIndentIn} onChange={num(['typography', 'firstLineIndentIn'])} />
                    </label>
                    <label>
                      {tr('ui.compileDialog.spatiu_dupa_paragraf_pt')}
                      <input type="number" min="0" max="24" value={ty.paragraphSpacingPt} onChange={num(['typography', 'paragraphSpacingPt'])} />
                    </label>
                    <label className="check">
                      <input type="checkbox" checked={ty.noIndentAfterHeading !== false} onChange={(e) => setIn(['typography', 'noIndentAfterHeading'], e.target.checked)} /> {tr('ui.compileDialog.fara_alineat_dupa_titluri')}
                    </label>
                  </div>
                  <legend>{tr('ui.compileDialog.pagina_docx_pdf_rtf_odt')}</legend>
                  {!page ? (
                    <div>
                      <p className="muted">{tr('ui.compileDialog.formatul_nu_are_setari_de')}</p>
                      <button type="button" onClick={() => setIn(['page'], { size: 'A4', margins: { top: 1, bottom: 1, inner: 1, outer: 1 }, mirrored: false, header: {}, footer: { center: '<$p>' }, differentFirstPage: true, pageNumbers: true })}>
                        {tr('ui.compileDialog.adauga_setari_de_pagina')}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="row">
                        <label>
                          Dimensiune
                          <select value={PAGE_SIZES.some(([k]) => k === page.size) ? page.size : 'custom'} onChange={(e) => setIn(['page', 'size'], e.target.value)}>
                            {PAGE_SIZES.map(([k, label]) => (
                              <option key={k} value={k}>{label}</option>
                            ))}
                            <option value="custom">{tr('ui.compileDialog.personalizata')}</option>
                          </select>
                        </label>
                        {page.size === 'custom' && (
                          <>
                            <label>
                              {tr('ui.compileDialog.latime_in')}
                              <input type="number" step="0.01" value={page.widthIn || ''} onChange={num(['page', 'widthIn'], 6)} />
                            </label>
                            <label>
                              {tr('ui.compileDialog.inaltime_in')}
                              <input type="number" step="0.01" value={page.heightIn || ''} onChange={num(['page', 'heightIn'], 9)} />
                            </label>
                          </>
                        )}
                      </div>
                      <div className="row">
                        {[['top', tr('ui.compileDialog.sus')], ['bottom', tr('ui.compileDialog.jos')], ['inner', page.mirrored ? 'Interior' : tr('ui.compileDialog.stanga_2')], ['outer', page.mirrored ? 'Exterior' : tr('ui.compileDialog.dreapta')]].map(([k, label]) => (
                          <label key={k}>
                            {label} (in)
                            <input type="number" min="0" max="3" step="0.05" value={(page.margins || {})[k] ?? 1} onChange={num(['page', 'margins', k], 1)} />
                          </label>
                        ))}
                      </div>
                      <label className="check">
                        <input type="checkbox" checked={Boolean(page.mirrored)} onChange={(e) => setIn(['page', 'mirrored'], e.target.checked)} /> {tr('ui.compileDialog.margini_in_oglinda_pagini_fata')}
                      </label>
                      <label className="check">
                        <input type="checkbox" checked={Boolean(page.differentFirstPage)} onChange={(e) => setIn(['page', 'differentFirstPage'], e.target.checked)} /> {tr('ui.compileDialog.prima_pagina_fara_antet_si')}
                      </label>
                      <p className="muted small">{tr('ui.compileDialog.antet_si_subsol_p_numarul')}</p>
                      {hfEditor('header', 'Antet')}
                      {hfEditor('footer', 'Subsol')}
                      <button type="button" onClick={() => setIn(['page'], null)}>{tr('ui.compileDialog.fara_setari_de_pagina')}</button>
                    </div>
                  )}
                </fieldset>
              )}

              {tab === 'metadate' && (
                <div>
                  <p className="muted small">{tr('ui.compileDialog.pentru_epub_titlul_si_autorul')}</p>
                  <div className="row">
                    <label>
                      {tr('ui.advancedSearchDialog.titlu')}
                      <input value={epub.title || ''} placeholder={project.title} onChange={(e) => setEpub({ ...epub, title: e.target.value })} />
                    </label>
                    <label>
                      Autor
                      <input value={epub.author || ''} placeholder={project.author} onChange={(e) => setEpub({ ...epub, author: e.target.value })} />
                    </label>
                    <label>
                      {tr('set.tab.language')}
                      <input value={epub.language || ''} placeholder="ro" onChange={(e) => setEpub({ ...epub, language: e.target.value })} />
                    </label>
                  </div>
                  <div className="row">
                    <label>
                      {tr('ui.compileDialog.editura')}
                      <input value={epub.publisher || ''} onChange={(e) => setEpub({ ...epub, publisher: e.target.value })} />
                    </label>
                    <label>
                      ISBN
                      <input value={epub.isbn || ''} onChange={(e) => setEpub({ ...epub, isbn: e.target.value })} />
                    </label>
                    <label>
                      {tr('ui.compileDialog.identificator_daca_nu_exista_isbn')}
                      <input value={epub.identifier || ''} onChange={(e) => setEpub({ ...epub, identifier: e.target.value })} />
                    </label>
                  </div>
                  <label>
                    Descriere
                    <textarea rows="3" value={epub.description || ''} onChange={(e) => setEpub({ ...epub, description: e.target.value })} />
                  </label>
                  <label>
                    {tr('ui.compileDialog.subiecte_separate_prin_virgula')}
                    <input value={Array.isArray(epub.subjects) ? epub.subjects.join(', ') : epub.subjects || ''} onChange={(e) => setEpub({ ...epub, subjects: e.target.value })} />
                  </label>
                  <label>
                    {tr('ui.compileDialog.coperta_imagine_din_cercetare')}
                    <select value={coverId} onChange={(e) => setCoverId(e.target.value)}>
                      <option value="">{tr('ui.compileDialog.fara_coperta')}</option>
                      {images.map((n) => (
                        <option key={n.id} value={n.id}>{n.title}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          </section>
        </div>

        {preview !== null && (
          <div className="cd-preview">
            <div className="row">
              <strong>Previzualizare</strong>
              <button type="button" onClick={() => setPreview(null)}>{tr('ui.compileDialog.inchide_previzualizarea')}</button>
            </div>
            <iframe title="Previzualizare" sandbox="" srcDoc={preview} />
          </div>
        )}

        {done && <p className="ok">Salvat: {done}</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>{tr('btn.close')}</button>
          <button type="button" onClick={persist}>{tr('ui.compileDialog.salveaza_setarile')}</button>
          <button type="button" disabled={busy} onClick={showPreview}>Previzualizare</button>
          <button type="button" className="primary" disabled={busy} onClick={run}>{busy ? tr('ui.compileDialog.se_compileaza') : tr('ui.compileDialog.compileaza')}</button>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.compile-dialog{max-width:1100px;width:95vw}
.compile-dialog .cd-body{display:flex;gap:1em;min-height:420px}
.compile-dialog .cd-formats{flex:0 0 210px;border-right:1px solid var(--border,#ddd);padding-right:.8em}
.compile-dialog .cd-formats ul{list-style:none;margin:0;padding:0}
.compile-dialog .cd-formats li button{width:100%;text-align:left;margin:1px 0}
.compile-dialog .cd-formats li button.active,.compile-dialog .cd-tabs button.active{font-weight:700;outline:2px solid var(--accent,#4a7)}
.compile-dialog .cd-format-actions{display:flex;flex-wrap:wrap;gap:.3em;margin-top:.6em}
.compile-dialog .cd-main{flex:1;min-width:0;display:flex;flex-direction:column}
.compile-dialog .cd-tabs{display:flex;flex-wrap:wrap;gap:.3em;margin:.5em 0}
.compile-dialog .cd-panel{flex:1;overflow:auto;max-height:55vh;padding-right:.3em}
.compile-dialog fieldset{border:none;padding:0;margin:0 0 .8em}
.compile-dialog .row{display:flex;flex-wrap:wrap;gap:.6em;align-items:flex-end}
.compile-dialog .cd-table{border-collapse:collapse;width:100%;font-size:.9em}
.compile-dialog .cd-table td,.compile-dialog .cd-table th{padding:2px 4px;text-align:left}
.compile-dialog .cd-table input:not([type=checkbox]){width:100%;min-width:5em}
.compile-dialog .cd-chips{display:flex;flex-wrap:wrap;gap:.6em;align-items:center;margin:.3em 0}
.compile-dialog .cd-hf-label{min-width:4em}
.compile-dialog .cd-preview iframe{width:100%;height:50vh;border:1px solid var(--border,#ccc);background:#fff}
.compile-dialog .small{font-size:.85em}
`;
