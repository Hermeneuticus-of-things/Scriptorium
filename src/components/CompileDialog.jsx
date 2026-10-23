import React, { useEffect, useMemo, useState } from 'react';
import { styleCss, stylesOf } from '../lib/styles.js';
// The presets live in lib/compileFormats.cjs (used by the main process). The
// renderer has no Node and no eval, so it reads the JSON block from the source.
import formatsSource from '../../lib/compileFormats.cjs?raw';

function readPresets() {
  try {
    const m = /\/\* BEGIN_PRESETS_JSON \*\/([\s\S]*?)\/\* END_PRESETS_JSON \*\//.exec(formatsSource);
    return m ? JSON.parse(m[1]) : [];
  } catch {
    return [];
  }
}
const PRESETS = readPresets();

const OUTPUTS = [
  ['docx', 'Word (.docx)'],
  ['pdf', 'PDF'],
  ['epub', 'EPUB (e-book)'],
  ['html', 'HTML (pagină web)'],
  ['rtf', 'RTF'],
  ['odt', 'OpenDocument (.odt)'],
  ['md', 'Markdown'],
  ['mmd', 'MultiMarkdown'],
  ['txt', 'Text simplu'],
];

const PAGE_SIZES = [
  ['A4', 'A4 (210 × 297 mm)'],
  ['A5', 'A5 (148 × 210 mm)'],
  ['Letter', 'Letter (8,5 × 11 in)'],
  ['6x9', '6 × 9 in (paperback)'],
  ['5x8', '5 × 8 in'],
  ['5.5x8.5', '5,5 × 8,5 in'],
];

const FONTS = ['Times New Roman', 'Georgia', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Cambria', 'Arial', 'Helvetica', 'Calibri'];

const TABS = [
  ['continut', 'Conținut'],
  ['sectiuni', 'Secțiuni'],
  ['separatoare', 'Separatoare'],
  ['inlocuiri', 'Înlocuiri'],
  ['note', 'Note'],
  ['pagina', 'Pagină'],
  ['metadate', 'Metadate'],
];

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
  const all = useMemo(() => [...PRESETS, ...formats], [formats]);
  const [formatId, setFormatId] = useState(() => (all.some((f) => f.id === pc.formatId) ? pc.formatId : (PRESETS[0] || {}).id));
  const format = all.find((f) => f.id === formatId) || PRESETS[0] || null;
  const editable = Boolean(format && !format.builtin);

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
  const patchFormat = (fn) => {
    if (!editable) return;
    setFormats((list) => list.map((f) => (f.id === formatId ? fn(clone(f)) : f)));
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
    copy.name = `${format.name} (copie)`;
    setFormats((l) => [...l, copy]);
    setFormatId(copy.id);
  };
  const rename = () => {
    if (!editable) return;
    const name = window.prompt('Numele formatului', format.name);
    if (name && name.trim()) setIn(['name'], name.trim());
  };
  const remove = () => {
    if (!editable || !window.confirm(`Ștergi formatul „${format.name}”?`)) return;
    setFormats((l) => l.filter((f) => f.id !== formatId));
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
    };
    if (titlePage !== null) opts.titlePage = titlePage;
    if (toc !== null) opts.toc = toc;
    if (scope === 'folder' && rootId) opts.rootId = rootId;
    if (scope === 'selection' && selectionIds.length) opts.ids = [...selectionIds];
    if (output === 'epub' && coverId && api.readMedia) {
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
        setPreview(`<!doctype html><meta charset="utf-8"><style>body{font-family:Georgia,serif;max-width:40em;margin:2em auto}${opts.styleCss}</style><p><em>Previzualizare simplificată.</em></p>${parts.join('')}`);
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
  const tr = format.transforms || {};
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
            <option value="page">Pagină nouă</option>
            <option value="space">Rând gol</option>
            <option value="none">Nimic</option>
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
          aria-label={`${label} ${pos === 'left' ? 'stânga' : pos === 'center' ? 'centru' : 'dreapta'}`}
          placeholder={pos === 'left' ? 'stânga' : pos === 'center' ? 'centru' : 'dreapta'}
          value={(page && page[key] && page[key][pos]) || ''}
          onChange={(e) => setIn(['page', key, pos], e.target.value)}
        />
      ))}
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide compile-dialog" role="dialog" aria-label="Compilează" onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>Compilează</h2>
        <div className="cd-body">
          <aside className="cd-formats">
            <h3>Formate</h3>
            <ul>
              {all.map((f) => (
                <li key={f.id}>
                  <button type="button" className={f.id === formatId ? 'active' : ''} onClick={() => setFormatId(f.id)}>
                    {f.name}
                    {f.builtin ? '' : ' ✎'}
                  </button>
                </li>
              ))}
            </ul>
            <div className="cd-format-actions">
              <button type="button" onClick={duplicate}>Duplică</button>
              <button type="button" onClick={rename} disabled={!editable}>Redenumește</button>
              <button type="button" onClick={remove} disabled={!editable}>Șterge</button>
            </div>
            {!editable && <p className="muted small">Formatele predefinite nu se modifică. Duplică formatul pentru a-l personaliza.</p>}
          </aside>

          <section className="cd-main">
            <div className="row">
              <label>
                Format de ieșire
                <select value={output} onChange={(e) => setOutput(e.target.value)}>
                  {OUTPUTS.map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <nav className="cd-tabs" role="tablist">
              {TABS.map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="cd-panel">
              {tab === 'continut' && (
                <div>
                  <fieldset>
                    <legend>Ce se compilează</legend>
                    <label className="check">
                      <input type="radio" checked={scope === 'draft'} onChange={() => setScope('draft')} /> Tot manuscrisul („{project.tree[0].title}”)
                    </label>
                    <label className="check">
                      <input type="radio" checked={scope === 'folder'} onChange={() => setScope('folder')} /> Un dosar
                    </label>
                    {scope === 'folder' && (
                      <select value={rootId} onChange={(e) => setRootId(e.target.value)} aria-label="Dosar">
                        {draftFolders.map((f) => (
                          <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                      </select>
                    )}
                    <label className="check">
                      <input type="radio" checked={scope === 'selection'} disabled={!selectionIds.length} onChange={() => setScope('selection')} /> Selecția curentă ({selectionIds.length} elemente)
                    </label>
                  </fieldset>
                  <div className="row">
                    <label>
                      Materie de început (front matter)
                      <select value={frontMatterId} onChange={(e) => setFront(e.target.value)}>
                        <option value="">Fără</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Materie de final (back matter)
                      <select value={backMatterId} onChange={(e) => setBack(e.target.value)}>
                        <option value="">Fără</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="check">
                    <input type="checkbox" checked={titlePage ?? Boolean(format.titlePage)} onChange={(e) => setTitlePage(e.target.checked)} /> Pagină de titlu automată (titlu, autor)
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={toc ?? Boolean(format.toc)} onChange={(e) => setToc(e.target.checked)} /> Cuprins
                    {output === 'epub' && <span className="muted"> (în EPUB cuprinsul de navigare există mereu)</span>}
                  </label>
                  <fieldset>
                    <legend>Filtre (gol = toate)</legend>
                    <div className="cd-chips">
                      <span className="muted">Etichete:</span>
                      {labelNames.map((l) => (
                        <label key={l} className="check">
                          <input type="checkbox" checked={labels.includes(l)} onChange={() => toggleIn(labels, setLabels, l)} /> {l}
                        </label>
                      ))}
                    </div>
                    <div className="cd-chips">
                      <span className="muted">Stări:</span>
                      {statusNames.map((s) => (
                        <label key={s} className="check">
                          <input type="checkbox" checked={statuses.includes(s)} onChange={() => toggleIn(statuses, setStatuses, s)} /> {s}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {tab === 'sectiuni' && (
                <fieldset disabled={!editable}>
                  <p className="muted small">
                    Fiecare tip de secțiune primește o aranjare. Substituenți: &lt;$n&gt;, &lt;$n:roman&gt;, &lt;$n:words&gt;, &lt;$n:Words&gt;, &lt;$t&gt;, &lt;$projecttitle&gt;, &lt;$author&gt;. „\n” în prefix = rând nou.
                  </p>
                  <div className="row">
                    {[['folder', 'Dosare'], ['container', 'Documente cu subdocumente'], ['file', 'Documente']].map(([k, label]) => (
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
                        <th>Tip de secțiune</th>
                        <th>Titlu</th>
                        <th>Prefix</th>
                        <th>Sufix</th>
                        <th>Litere</th>
                        <th>Aliniere</th>
                        <th>Pagină nouă</th>
                        <th>Text</th>
                        <th>Separator înainte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeTitles.map((t) => {
                        const l = layoutOf(t);
                        return (
                          <tr key={t}>
                            <td>{t}</td>
                            <td><input type="checkbox" aria-label="Arată titlul" checked={l.showTitle} onChange={(e) => setLayout(t, 'showTitle', e.target.checked)} /></td>
                            <td><input aria-label="Prefix" value={l.titlePrefix.replace(/\n/g, '\\n')} onChange={(e) => setLayout(t, 'titlePrefix', e.target.value.replace(/\\n/g, '\n'))} /></td>
                            <td><input aria-label="Sufix" value={l.titleSuffix.replace(/\n/g, '\\n')} onChange={(e) => setLayout(t, 'titleSuffix', e.target.value.replace(/\\n/g, '\n'))} /></td>
                            <td>
                              <select aria-label="Litere" value={l.titleCase} onChange={(e) => setLayout(t, 'titleCase', e.target.value)}>
                                <option value="normal">Normale</option>
                                <option value="upper">MAJUSCULE</option>
                                <option value="smallcaps">Majuscule mici</option>
                              </select>
                            </td>
                            <td>
                              <select aria-label="Aliniere" value={l.titleAlign || 'center'} onChange={(e) => setLayout(t, 'titleAlign', e.target.value)}>
                                <option value="center">Centru</option>
                                <option value="left">Stânga</option>
                                <option value="right">Dreapta</option>
                              </select>
                            </td>
                            <td><input type="checkbox" aria-label="Pagină nouă" checked={Boolean(l.pageBreakBefore)} onChange={(e) => setLayout(t, 'pageBreakBefore', e.target.checked)} /></td>
                            <td><input type="checkbox" aria-label="Arată textul" checked={l.showText} onChange={(e) => setLayout(t, 'showText', e.target.checked)} /></td>
                            <td>
                              <select aria-label="Separator înainte" value={l.separatorBefore} onChange={(e) => setLayout(t, 'separatorBefore', e.target.value)}>
                                <option value="auto">Automat</option>
                                <option value="none">Nimic</option>
                                <option value="text">Text</option>
                                <option value="page">Pagină nouă</option>
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
                  {sepEditor('sameType', 'Între secțiuni de același tip')}
                  {sepEditor('differentType', 'Între secțiuni de tipuri diferite')}
                  <p className="muted small">O secțiune care începe pe pagină nouă nu primește separator.</p>
                </fieldset>
              )}

              {tab === 'inlocuiri' && (
                <fieldset disabled={!editable}>
                  <legend>Transformări</legend>
                  {[
                    ['smartQuotes', 'Ghilimele drepte → „…”'],
                    ['dashes', 'Două cratime (--) → linie de dialog'],
                    ['removeHighlights', 'Elimină evidențierile'],
                    ['removeColors', 'Elimină culorile textului'],
                    ['linksToText', 'Legăturile interne devin text simplu'],
                  ].map(([k, label]) => (
                    <label key={k} className="check">
                      <input type="checkbox" checked={Boolean(tr[k])} onChange={(e) => setIn(['transforms', k], e.target.checked)} /> {label}
                    </label>
                  ))}
                  <h4>Înlocuiri (doar în text)</h4>
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>Caută</th>
                        <th>Înlocuiește cu</th>
                        <th>Regex</th>
                        <th>Cuvânt întreg</th>
                        <th>Majuscule</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {reps.map((r, i) => {
                        const set = (k, v) => setIn(['replacements'], reps.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                        return (
                          <tr key={i}>
                            <td><input aria-label="Caută" value={r.find || ''} onChange={(e) => set('find', e.target.value)} /></td>
                            <td><input aria-label="Înlocuiește cu" value={r.replace || ''} onChange={(e) => set('replace', e.target.value)} /></td>
                            <td><input type="checkbox" aria-label="Regex" checked={Boolean(r.regex)} onChange={(e) => set('regex', e.target.checked)} /></td>
                            <td><input type="checkbox" aria-label="Cuvânt întreg" checked={Boolean(r.wholeWord)} onChange={(e) => set('wholeWord', e.target.checked)} /></td>
                            <td><input type="checkbox" aria-label="Ține cont de majuscule" checked={Boolean(r.caseSensitive)} onChange={(e) => set('caseSensitive', e.target.checked)} /></td>
                            <td><button type="button" title="Șterge" onClick={() => setIn(['replacements'], reps.filter((_, j) => j !== i))}>✕</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <button type="button" onClick={() => setIn(['replacements'], [...reps, { find: '', replace: '', regex: false, wholeWord: false, caseSensitive: false }])}>
                    Adaugă înlocuire
                  </button>
                </fieldset>
              )}

              {tab === 'note' && (
                <fieldset disabled={!editable}>
                  <label>
                    Notele de subsol
                    <select value={tr.notes || 'footnotes'} onChange={(e) => setIn(['transforms', 'notes'], e.target.value)}>
                      <option value="footnotes">Note de subsol</option>
                      <option value="endnotes-chapter">Note la finalul fiecărui capitol</option>
                      <option value="endnotes-book">Note la finalul cărții</option>
                    </select>
                  </label>
                  <label>
                    Comentarii
                    <select value={tr.comments || 'strip'} onChange={(e) => setIn(['transforms', 'comments'], e.target.value)}>
                      <option value="strip">Se elimină</option>
                      <option value="export">Comentarii Word (doar DOCX)</option>
                    </select>
                  </label>
                  <p className="muted small">Adnotările din text nu ajung niciodată în cartea compilată.</p>
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
                        <option value="">Același</option>
                        {FONTS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Mărime (pt)
                      <input type="number" min="7" max="24" step="0.5" value={ty.fontSizePt} onChange={num(['typography', 'fontSizePt'], 12)} />
                    </label>
                    <label>
                      Spațiere rânduri
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
                      Spațiu după paragraf (pt)
                      <input type="number" min="0" max="24" value={ty.paragraphSpacingPt} onChange={num(['typography', 'paragraphSpacingPt'])} />
                    </label>
                    <label className="check">
                      <input type="checkbox" checked={ty.noIndentAfterHeading !== false} onChange={(e) => setIn(['typography', 'noIndentAfterHeading'], e.target.checked)} /> Fără alineat după titluri
                    </label>
                  </div>
                  <legend>Pagină (DOCX, PDF, RTF, ODT)</legend>
                  {!page ? (
                    <div>
                      <p className="muted">Formatul nu are setări de pagină (e-book).</p>
                      <button type="button" onClick={() => setIn(['page'], { size: 'A4', margins: { top: 1, bottom: 1, inner: 1, outer: 1 }, mirrored: false, header: {}, footer: { center: '<$p>' }, differentFirstPage: true, pageNumbers: true })}>
                        Adaugă setări de pagină
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
                            <option value="custom">Personalizată</option>
                          </select>
                        </label>
                        {page.size === 'custom' && (
                          <>
                            <label>
                              Lățime (in)
                              <input type="number" step="0.01" value={page.widthIn || ''} onChange={num(['page', 'widthIn'], 6)} />
                            </label>
                            <label>
                              Înălțime (in)
                              <input type="number" step="0.01" value={page.heightIn || ''} onChange={num(['page', 'heightIn'], 9)} />
                            </label>
                          </>
                        )}
                      </div>
                      <div className="row">
                        {[['top', 'Sus'], ['bottom', 'Jos'], ['inner', page.mirrored ? 'Interior' : 'Stânga'], ['outer', page.mirrored ? 'Exterior' : 'Dreapta']].map(([k, label]) => (
                          <label key={k}>
                            {label} (in)
                            <input type="number" min="0" max="3" step="0.05" value={(page.margins || {})[k] ?? 1} onChange={num(['page', 'margins', k], 1)} />
                          </label>
                        ))}
                      </div>
                      <label className="check">
                        <input type="checkbox" checked={Boolean(page.mirrored)} onChange={(e) => setIn(['page', 'mirrored'], e.target.checked)} /> Margini în oglindă (pagini față-verso)
                      </label>
                      <label className="check">
                        <input type="checkbox" checked={Boolean(page.differentFirstPage)} onChange={(e) => setIn(['page', 'differentFirstPage'], e.target.checked)} /> Prima pagină fără antet și subsol
                      </label>
                      <p className="muted small">Antet și subsol: &lt;$p&gt; = numărul paginii, &lt;$surname&gt;, &lt;$abbr_title&gt;, &lt;$projecttitle&gt;.</p>
                      {hfEditor('header', 'Antet')}
                      {hfEditor('footer', 'Subsol')}
                      <button type="button" onClick={() => setIn(['page'], null)}>Fără setări de pagină</button>
                    </div>
                  )}
                </fieldset>
              )}

              {tab === 'metadate' && (
                <div>
                  <p className="muted small">Pentru EPUB (titlul și autorul se folosesc și în celelalte formate).</p>
                  <div className="row">
                    <label>
                      Titlu
                      <input value={epub.title || ''} placeholder={project.title} onChange={(e) => setEpub({ ...epub, title: e.target.value })} />
                    </label>
                    <label>
                      Autor
                      <input value={epub.author || ''} placeholder={project.author} onChange={(e) => setEpub({ ...epub, author: e.target.value })} />
                    </label>
                    <label>
                      Limbă
                      <input value={epub.language || ''} placeholder="ro" onChange={(e) => setEpub({ ...epub, language: e.target.value })} />
                    </label>
                  </div>
                  <div className="row">
                    <label>
                      Editură
                      <input value={epub.publisher || ''} onChange={(e) => setEpub({ ...epub, publisher: e.target.value })} />
                    </label>
                    <label>
                      ISBN
                      <input value={epub.isbn || ''} onChange={(e) => setEpub({ ...epub, isbn: e.target.value })} />
                    </label>
                    <label>
                      Identificator (dacă nu există ISBN)
                      <input value={epub.identifier || ''} onChange={(e) => setEpub({ ...epub, identifier: e.target.value })} />
                    </label>
                  </div>
                  <label>
                    Descriere
                    <textarea rows="3" value={epub.description || ''} onChange={(e) => setEpub({ ...epub, description: e.target.value })} />
                  </label>
                  <label>
                    Subiecte (separate prin virgulă)
                    <input value={Array.isArray(epub.subjects) ? epub.subjects.join(', ') : epub.subjects || ''} onChange={(e) => setEpub({ ...epub, subjects: e.target.value })} />
                  </label>
                  <label>
                    Copertă (imagine din Cercetare)
                    <select value={coverId} onChange={(e) => setCoverId(e.target.value)}>
                      <option value="">Fără copertă</option>
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
              <button type="button" onClick={() => setPreview(null)}>Închide previzualizarea</button>
            </div>
            <iframe title="Previzualizare" sandbox="" srcDoc={preview} />
          </div>
        )}

        {done && <p className="ok">Salvat: {done}</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>Închide</button>
          <button type="button" onClick={persist}>Salvează setările</button>
          <button type="button" disabled={busy} onClick={showPreview}>Previzualizare</button>
          <button type="button" className="primary" disabled={busy} onClick={run}>{busy ? 'Se compilează…' : 'Compilează'}</button>
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
