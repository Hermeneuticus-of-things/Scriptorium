import React, { useMemo, useRef, useState } from 'react';
import { t as tr } from '../lib/i18n.js';
import { SCRIPT_FORMAT_LIST, BUILTIN_FORMATS, copyFormat, editableElement, normalizeCustomFormat, formatToFile, formatFromFile, getFormat, normalizeCompletion, collectCharacters, collectSceneHeadings } from '../lib/scriptFormats.js';

const ALIGNS = ['left', 'center', 'right', 'justify'];

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Format > Script Mode > Script format editor: the author's own formats (elements with font,
// indents, alignment, uppercase, space before, "Tab leads to", "Enter leads to"), saved in the
// settings, exported / imported as .scriptformat files.
// Props: formats (custom list), current (format id in use), onSave(list), onUse(id), onClose, onError.
export function ScriptFormatEditor({ formats = [], current, onSave, onUse, onClose, onError }) {
  const [list, setList] = useState(() => formats.map(normalizeCustomFormat).filter(Boolean));
  const [selId, setSelId] = useState(() => (list.some((f) => f.id === current) ? current : list[0]?.id || null));
  const [elIdx, setElIdx] = useState(0);
  const fileRef = useRef(null);
  const sel = list.find((f) => f.id === selId) || null;
  const editable = sel ? sel.elements.map(editableElement) : [];
  const el = editable[elIdx] || null;

  const update = (patch) => {
    const next = normalizeCustomFormat({ ...sel, ...patch });
    if (!next) return;
    next.id = sel.id;
    setList((l) => l.map((f) => (f.id === sel.id ? next : f)));
  };
  const setEl = (patch) => {
    const els = editable.map((e, i) => (i === elIdx ? { ...e, ...patch } : e));
    const oldId = editable[elIdx].id;
    const tab = { ...sel.tab };
    const enter = { ...sel.enter };
    // Renaming an element keeps its Tab / Enter rules.
    if (patch.id && patch.id !== oldId) {
      for (const t of [tab, enter]) {
        for (const [k, v] of Object.entries(t)) if (v === oldId) t[k] = patch.id;
        if (t[oldId]) (t[patch.id] = t[oldId]), delete t[oldId];
      }
    }
    update({ elements: els, tab, enter, defaultElement: sel.defaultElement === oldId && patch.id ? patch.id : sel.defaultElement });
  };
  const uniqueId = (base) => {
    let id = base;
    for (let n = 2; list.some((f) => f.id === id); n++) id = `${base}-${n}`;
    return id;
  };
  const addFormat = (fromId) => {
    const f = copyFormat(fromId);
    f.id = uniqueId(f.id);
    setList((l) => [...l, f]);
    setSelId(f.id);
    setElIdx(0);
  };
  const removeFormat = () => {
    if (!sel || !window.confirm(tr('ui.p12.stergiFormatul', { name: sel.label }))) return;
    setList((l) => l.filter((f) => f.id !== sel.id));
    setSelId(null);
  };
  const addElement = () => {
    const base = tr('ui.p12.elementNou');
    let label = base;
    for (let n = 2; editable.some((e) => e.label === label); n++) label = `${base} ${n}`;
    update({ elements: [...editable, { id: label, label, align: 'left', spaceBefore: 1 }] });
    setElIdx(editable.length);
  };
  const removeElement = () => {
    if (editable.length < 2) return;
    update({ elements: editable.filter((_, i) => i !== elIdx) });
    setElIdx(Math.max(0, elIdx - 1));
  };
  const moveElement = (d) => {
    const j = elIdx + d;
    if (j < 0 || j >= editable.length) return;
    const els = editable.slice();
    [els[elIdx], els[j]] = [els[j], els[elIdx]];
    update({ elements: els });
    setElIdx(j);
  };
  const importFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const f = formatFromFile(await file.text());
      f.id = uniqueId(f.id);
      setList((l) => [...l, f]);
      setSelId(f.id);
      setElIdx(0);
    } catch (err) {
      onError?.(err);
    }
  };
  const elOptions = editable.map((e) => <option key={e.id} value={e.id}>{e.label}</option>);
  const num = (v) => (v === '' ? '' : Number(v));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide script-format-editor" role="dialog" aria-label={tr('ui.p12.editorFormate')} onClick={(e) => e.stopPropagation()}>
        <h2>{tr('ui.p12.editorFormate')}</h2>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <label>
            {tr('ui.p12.format')}
            <select value={selId || ''} onChange={(e) => { setSelId(e.target.value || null); setElIdx(0); }} aria-label={tr('ui.p12.format')}>
              {!list.length && <option value="">{tr('ui.p12.niciunFormatPropriu')}</option>}
              {list.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label>
            {tr('ui.p12.formatNouDin')}
            <select value="" onChange={(e) => e.target.value && addFormat(e.target.value)} aria-label={tr('ui.p12.formatNouDin')}>
              <option value="">…</option>
              {SCRIPT_FORMAT_LIST.map((f) => <option key={f.id} value={f.id}>{BUILTIN_FORMATS[f.id] ? tr(`ui.scriptFormat.${f.id}`) : f.label}</option>)}
            </select>
          </label>
          <button onClick={() => fileRef.current?.click()}>{tr('ui.p12.importaFormat')}</button>
          <input ref={fileRef} type="file" accept=".scriptformat,.json" hidden onChange={importFile} data-testid="script-format-file" />
          <button disabled={!sel} onClick={() => download(`${sel.label}.scriptformat`, formatToFile(sel))}>{tr('ui.p12.exportaFormat')}</button>
          <button disabled={!sel} onClick={removeFormat}>{tr('ui.p12.stergeFormat')}</button>
        </div>
        {sel && (
          <div className="sfe-body" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, marginTop: 8 }}>
            <div>
              <label>
                {tr('ui.p12.numeFormat')}
                <input value={sel.label} onChange={(e) => update({ label: e.target.value })} />
              </label>
              <ul className="sfe-elements" role="listbox" aria-label={tr('ui.p12.elemente')} style={{ listStyle: 'none', padding: 0, maxHeight: 260, overflow: 'auto', border: '1px solid var(--border, #ccc)' }}>
                {editable.map((e, i) => (
                  <li key={e.id} role="option" aria-selected={i === elIdx} className={i === elIdx ? 'on' : ''} style={{ padding: '2px 6px', cursor: 'pointer', background: i === elIdx ? 'var(--accent-soft, #dde8f7)' : '' }} onClick={() => setElIdx(i)}>
                    {e.label}{sel.defaultElement === e.id ? ' ★' : ''}
                  </li>
                ))}
              </ul>
              <div className="row" style={{ gap: 4 }}>
                <button onClick={addElement} title={tr('ui.p12.elementNou')}>+</button>
                <button onClick={removeElement} disabled={editable.length < 2} title={tr('ui.p12.stergeElement')}>−</button>
                <button onClick={() => moveElement(-1)} disabled={elIdx === 0} aria-label={tr('ui.p12.sus')}>▲</button>
                <button onClick={() => moveElement(1)} disabled={elIdx >= editable.length - 1} aria-label={tr('ui.p12.jos')}>▼</button>
              </div>
            </div>
            {el && (
              <div className="fields">
                <div className="row">
                  <label>
                    {tr('ui.p12.numeElement')}
                    <input value={el.label} onChange={(e) => setEl({ label: e.target.value })} />
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={sel.defaultElement === el.id} onChange={() => update({ defaultElement: el.id })} /> {tr('ui.p12.elementImplicit')}
                  </label>
                </div>
                <div className="row">
                  <label>
                    {tr('ui.p12.font')}
                    <input value={el.fontFamily} placeholder="Courier Prime" onChange={(e) => setEl({ fontFamily: e.target.value })} />
                  </label>
                  <label>
                    {tr('ui.p12.marime')}
                    <input type="number" min="0" max="72" value={el.fontSizePt || ''} placeholder="12" onChange={(e) => setEl({ fontSizePt: num(e.target.value) })} style={{ width: 64 }} />
                  </label>
                </div>
                <div className="row">
                  <label>
                    {tr('ui.p12.indentStanga')}
                    <input type="number" min="0" max="80" value={el.indentLeft} onChange={(e) => setEl({ indentLeft: num(e.target.value) })} style={{ width: 64 }} />
                  </label>
                  <label>
                    {tr('ui.p12.indentDreapta')}
                    <input type="number" min="0" max="80" value={el.indentRight} onChange={(e) => setEl({ indentRight: num(e.target.value) })} style={{ width: 64 }} />
                  </label>
                  <label>
                    {tr('ui.p12.spatiuInainte')}
                    <input type="number" min="0" max="5" step="0.5" value={el.spaceBefore} onChange={(e) => setEl({ spaceBefore: num(e.target.value) })} style={{ width: 64 }} />
                  </label>
                  <label>
                    {tr('ui.p12.aliniere')}
                    <select value={el.align} onChange={(e) => setEl({ align: e.target.value })}>
                      {ALIGNS.map((a) => <option key={a} value={a}>{tr(`ui.p12.align_${a}`)}</option>)}
                    </select>
                  </label>
                </div>
                <div className="checks row">
                  <label className="check"><input type="checkbox" checked={el.upper} onChange={(e) => setEl({ upper: e.target.checked })} /> {tr('ui.p12.majuscule')}</label>
                  <label className="check"><input type="checkbox" checked={el.bold} onChange={(e) => setEl({ bold: e.target.checked })} /> <b>B</b></label>
                  <label className="check"><input type="checkbox" checked={el.italic} onChange={(e) => setEl({ italic: e.target.checked })} /> <i>I</i></label>
                  <label className="check"><input type="checkbox" checked={el.underline} onChange={(e) => setEl({ underline: e.target.checked })} /> <u>U</u></label>
                </div>
                <div className="row">
                  <label>
                    {tr('ui.p12.tabDuceLa')}
                    <select value={sel.tab[el.id] || ''} onChange={(e) => update({ tab: { ...sel.tab, [el.id]: e.target.value || undefined } })}>
                      <option value="">{tr('ui.p12.elementImplicit')}</option>
                      {elOptions}
                    </select>
                  </label>
                  <label>
                    {tr('ui.p12.enterDuceLa')}
                    <select value={sel.enter[el.id] || ''} onChange={(e) => update({ enter: { ...sel.enter, [el.id]: e.target.value || undefined } })}>
                      <option value="">{tr('ui.p12.elementImplicit')}</option>
                      {elOptions}
                    </select>
                  </label>
                  <label>
                    {tr('ui.p12.stilIesire')}
                    <input value={el.fdx} placeholder={el.label} onChange={(e) => setEl({ fdx: e.target.value })} />
                  </label>
                </div>
                <p className="script-mode" style={{ border: '1px dashed var(--border, #ccc)', padding: 8 }}>
                  <span style={{ display: 'block', textAlign: el.align, marginLeft: `${el.indentLeft}%`, marginRight: `${el.indentRight}%`, fontWeight: el.bold ? 'bold' : undefined, fontStyle: el.italic ? 'italic' : undefined, textDecoration: el.underline ? 'underline' : undefined, textTransform: el.upper ? 'uppercase' : undefined, fontFamily: el.fontFamily || undefined }}>
                    {tr('ui.p12.previzualizare')} {el.label}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}
        <div className="actions">
          <button onClick={onClose}>{tr('btn.cancel')}</button>
          {sel && onUse && <button onClick={() => { onSave(list); onUse(sel.id); onClose(); }}>{tr('ui.p12.salveazaSiFoloseste')}</button>}
          <button className="primary" onClick={() => { onSave(list); onClose(); }}>{tr('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}

// Format > Script Mode > Auto-complete list: characters, places, transitions and extensions the
// script editor offers (project.scriptCompletion), with "Add from the document".
export function ScriptCompletionDialog({ value, docsHtml = '', onSave, onClose }) {
  const init = normalizeCompletion(value);
  const [lists, setLists] = useState({ characters: init.characters.join('\n'), places: init.places.join('\n'), transitions: init.transitions.join('\n'), extensions: init.extensions.join('\n') });
  const found = useMemo(() => ({ characters: collectCharacters(docsHtml), places: collectSceneHeadings(docsHtml).map((h) => h.replace(/^(INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.)\s*/, '').replace(/\s+-\s+.*$/, '').trim()).filter(Boolean) }), [docsHtml]);
  const addFound = (k) => setLists((l) => ({ ...l, [k]: [...new Set([...l[k].split('\n').map((x) => x.trim()).filter(Boolean), ...found[k]])].join('\n') }));
  const area = (k) => (
    <label key={k} style={{ flex: 1, minWidth: 160 }}>
      {tr(`ui.p12.lista_${k}`)}
      <textarea rows={10} value={lists[k]} onChange={(e) => setLists({ ...lists, [k]: e.target.value })} aria-label={tr(`ui.p12.lista_${k}`)} />
      {found[k] && <button type="button" onClick={() => addFound(k)} disabled={!found[k].length}>{tr('ui.p12.adaugaDinText', { n: found[k].length })}</button>}
    </label>
  );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={tr('ui.p12.listaCompletare')} onClick={(e) => e.stopPropagation()}>
        <h2>{tr('ui.p12.listaCompletare')}</h2>
        <p className="muted small">{tr('ui.p12.listaCompletareInfo')}</p>
        <div className="row" style={{ gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>{['characters', 'places', 'transitions', 'extensions'].map(area)}</div>
        <div className="actions">
          <button onClick={onClose}>{tr('btn.cancel')}</button>
          <button className="primary" onClick={() => { onSave(normalizeCompletion(lists)); onClose(); }}>{tr('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}

export { getFormat };
