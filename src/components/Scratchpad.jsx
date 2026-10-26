import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { sanitizeHtml } from '../lib/sanitize.js';
import { noteHtml, noteFileName, noteFromFile, noteToFileHtml } from '../lib/smallWindows.js';

const download = (name, text, type) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
const htmlText = (html) => {
  const d = document.createElement('div');
  d.innerHTML = sanitizeHtml(html || '');
  d.querySelectorAll('p,div,br,li,h1,h2,h3').forEach((el) => el.append('\n'));
  return d.textContent.replace(/\n{3,}/g, '\n\n').trim();
};

/** Unique file names (title.html) for the notes saved in the scratchpad folder. */
function folderFiles(notes) {
  const used = new Set();
  return notes.map((n) => {
    const base = noteFileName(n.title, n.id);
    let name = `${base}.html`;
    for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base} ${i}.html`;
    used.add(name.toLowerCase());
    return { file: name, content: noteToFileHtml(n) };
  });
}

/**
 * Scratchpad: notes independent of the project, with formatted text.
 * Props: api (folder mode, separate window, sending between windows), load()/save(notes) for the
 * notes kept in the settings, onClose(), onSendToProject?({title, html, mode, folderId}) — "Send to
 * project" in this window; folders [{id, title}] (destination), canAppend (a document is selected).
 * standalone: the separate window (fills the window, sends to projects open in other windows).
 * Note = { id, title, html, updated } (older notes have `text`).
 */
export default function Scratchpad({ api, load, save, onClose, onSendToProject, folders = [], canAppend = false, standalone = false }) {
  const [notes, setNotes] = useState([]);
  const [sel, setSel] = useState(null);
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [folder, setFolder] = useState('');
  const [dest, setDest] = useState(folders[0]?.id || '');
  const [mode, setMode] = useState('new');
  const [projects, setProjects] = useState([]);
  const [target, setTarget] = useState('');
  const [onTop, setOnTop] = useState(true);
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  const drag = useRef(null);
  const bodyRef = useRef(null);
  const fileRef = useRef(null);
  const folderRef = useRef('');

  const loadAll = async () => {
    const st = api?.getSettings ? await api.getSettings().catch(() => ({})) : {};
    const f = st?.scratchFolder || '';
    folderRef.current = f;
    setFolder(f);
    if (st && st.scratchOnTop === false) setOnTop(false);
    let list = null;
    if (f && api?.scratchReadFolder) list = await api.scratchReadFolder().catch(() => null);
    if (!list) list = await Promise.resolve(load ? load() : st?.scratchpad || []).catch(() => []);
    list = (Array.isArray(list) ? list : []).map((n) => ({ ...n, html: noteHtml(n) }));
    setNotes(list);
    setSel(list[0]?.id ?? null);
  };
  useEffect(() => {
    loadAll();
    if (standalone && api?.scratchProjects) api.scratchProjects().then((p) => { setProjects(p || []); setTarget(String(p?.[0]?.id ?? '')); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeOut = (next) => {
    if (folderRef.current && api?.scratchWriteFolder) return api.scratchWriteFolder(folderFiles(next)).catch((e) => setMsg(e.message));
    if (save) return save(next);
    return api?.setSettings?.({ scratchpad: next });
  };
  const persist = (next) => {
    setNotes(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => writeOut(next), 400);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const add = (note) => {
    const n = note || { id: `n${Date.now().toString(36)}`, title: t('ui.scratchpad.nota_noua'), html: '', updated: Date.now() };
    persist([n, ...notes]);
    setSel(n.id);
  };
  const remove = (id) => {
    const next = notes.filter((n) => n.id !== id);
    persist(next);
    if (sel === id) setSel(next[0]?.id ?? null);
  };
  const edit = (patch) => persist(notes.map((n) => (n.id === sel ? { ...n, ...patch, updated: Date.now() } : n)));
  const cur = notes.find((n) => n.id === sel);

  // The formatted body is written into the editable box only when another note is picked.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = sanitizeHtml(cur ? noteHtml(cur) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
  const onBody = () => edit({ html: bodyRef.current.innerHTML });
  const fmt = (cmd) => {
    bodyRef.current?.focus();
    document.execCommand(cmd);
    onBody();
  };
  const onBodyKey = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b' || k === 'i' || k === 'u') {
      e.preventDefault();
      fmt(k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline');
    }
  };

  // --- folder on disk
  const chooseFolder = async () => {
    const f = await api.scratchChooseFolder().catch((e) => { setMsg(e.message); return null; });
    if (!f) return;
    folderRef.current = f;
    setFolder(f);
    const existing = (await api.scratchReadFolder().catch(() => null)) || [];
    // Notes kept until now move into the folder (files already there stay).
    const names = new Set(existing.map((n) => n.title.toLowerCase()));
    const merged = [...notes.filter((n) => !names.has(String(n.title).toLowerCase())), ...existing];
    setNotes(merged);
    setSel(merged[0]?.id ?? null);
    await writeOut(merged);
    setMsg(t('ui.p11.sp_folder_set', { folder: f }));
  };
  const clearFolder = async () => {
    await api.scratchClearFolder();
    folderRef.current = '';
    setFolder('');
    await writeOut(notes);
  };

  // --- import / export
  const importFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    const added = [];
    for (const f of files) added.push(noteFromFile(f.name, await f.text()));
    if (!added.length) return;
    persist([...added, ...notes]);
    setSel(added[0].id);
  };
  const exportNote = (kind) => {
    if (!cur) return;
    const name = noteFileName(cur.title, cur.id);
    if (kind === 'txt') download(`${name}.txt`, htmlText(cur.html), 'text/plain');
    else download(`${name}.html`, noteToFileHtml(cur), 'text/html');
  };
  const exportAll = () => download('notite.html', notes.map((n) => `<h1>${sanitizeHtml(n.title || '')}</h1>\n${noteHtml(n)}`).join('\n<hr>\n'), 'text/html');

  // --- send to project
  const send = async () => {
    if (!cur) return;
    const payload = { title: cur.title, html: sanitizeHtml(noteHtml(cur)), mode, folderId: dest };
    if (standalone) {
      if (!target) return;
      await api.scratchSend(Number(target), payload).then(() => setMsg(t('ui.p11.sp_sent'))).catch((e) => setMsg(e.message));
    } else onSendToProject?.(payload, cur);
  };
  const toggleOnTop = async () => {
    const v = !onTop;
    setOnTop(v);
    await api?.scratchSetOnTop?.(v);
  };

  const onDown = (e) => {
    if (standalone || e.target.closest('button,select,input')) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev) => drag.current && setPos({ x: Math.max(0, ev.clientX - drag.current.dx), y: Math.max(0, ev.clientY - drag.current.dy) });
    const up = () => {
      drag.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const box = standalone
    ? { position: 'fixed', inset: 0 }
    : { position: 'fixed', left: pos.x, top: pos.y, width: 620, height: 400, zIndex: 900, borderRadius: 6, boxShadow: '0 6px 24px rgba(0,0,0,.25)', border: '1px solid var(--line, #ccc)' };
  const canSend = standalone ? projects.length > 0 : Boolean(onSendToProject);

  return (
    <div className={`scratchpad ${standalone ? 'standalone' : ''}`} role="dialog" aria-label={t('ui.p11.sp_title')} style={{ ...box, display: 'flex', flexDirection: 'column', background: 'var(--panel, #fff)', color: 'var(--text, #222)' }}>
      <div onMouseDown={onDown} style={{ cursor: standalone ? 'default' : 'move', padding: '4px 8px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid var(--line, #ccc)', flexWrap: 'wrap' }}>
        <strong style={{ flex: 1 }}>{t('ui.p11.sp_title')}</strong>
        <button className="sp-add" onClick={() => add()} title={t('ui.scratchpad.nota_noua')}>+</button>
        <button className="sp-import" onClick={() => fileRef.current?.click()} title={t('ui.p11.sp_import')}>{t('ui.p11.sp_import')}</button>
        <input ref={fileRef} type="file" accept=".txt,.md,.html,.htm,text/plain,text/html" multiple hidden onChange={importFiles} />
        <select className="sp-export" value="" aria-label={t('ui.p11.sp_export')} onChange={(e) => { const v = e.target.value; if (v === 'all') exportAll(); else exportNote(v); }}>
          <option value="">{t('ui.p11.sp_export')}</option>
          <option value="html" disabled={!cur}>{t('ui.p11.sp_export_html')}</option>
          <option value="txt" disabled={!cur}>{t('ui.p11.sp_export_txt')}</option>
          <option value="all" disabled={!notes.length}>{t('ui.p11.sp_export_all')}</option>
        </select>
        {api?.scratchChooseFolder && (
          folder
            ? <button className="sp-folder on" onClick={clearFolder} title={t('ui.p11.sp_folder_clear')}>📁 {folder.split(/[\\/]/).pop()}</button>
            : <button className="sp-folder" onClick={chooseFolder} title={t('ui.p11.sp_folder_hint')}>{t('ui.p11.sp_folder')}</button>
        )}
        {standalone ? (
          <label className="check" title={t('ui.p11.sp_on_top')}><input type="checkbox" checked={onTop} onChange={toggleOnTop} /> {t('ui.p11.sp_on_top')}</label>
        ) : (
          api?.scratchOpenWindow && <button className="sp-window" onClick={async () => { if (await api.scratchOpenWindow().catch(() => false)) onClose(); else setMsg(t('ui.p11.sp_window_desktop')); }} title={t('ui.p11.sp_window_hint')}>⧉</button>
        )}
        {!standalone && <button onClick={onClose} title={t('btn.close')} aria-label={t('btn.close')}>×</button>}
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ul style={{ width: 170, margin: 0, padding: 0, listStyle: 'none', overflow: 'auto', borderRight: '1px solid var(--line, #ccc)' }}>
          {notes.map((n) => (
            <li key={n.id} className="sp-note" onClick={() => setSel(n.id)} style={{ padding: '4px 6px', cursor: 'pointer', background: n.id === sel ? 'var(--selection, #dde8ff)' : undefined, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || t('ui.app.fara_titlu')}</span>
              <button onClick={(e) => { e.stopPropagation(); if (confirm(t('ui.scratchpad.stergi_nota'))) remove(n.id); }} title={t('btn.delete')} aria-label={t('btn.delete')}>🗑</button>
            </li>
          ))}
          {!notes.length && <li style={{ padding: 6, opacity: 0.6 }}>{t('ui.scratchpad.nicio_nota')}</li>}
        </ul>
        {cur ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <input className="sp-title" value={cur.title} onChange={(e) => edit({ title: e.target.value })} placeholder={t('ui.advancedSearchDialog.titlu')} style={{ border: 0, padding: 6, fontWeight: 'bold' }} />
            <div className="sp-format" role="toolbar" aria-label={t('ui.p11.sp_format')} style={{ display: 'flex', gap: 2, padding: '0 6px' }}>
              <button className="sp-bold" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('bold')} title={t('ui.p11.sp_bold')}><b>B</b></button>
              <button className="sp-italic" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('italic')} title={t('ui.p11.sp_italic')}><i>I</i></button>
              <button className="sp-underline" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('underline')} title={t('ui.p11.sp_underline')}><u>U</u></button>
            </div>
            <div
              ref={bodyRef}
              className="sp-body prose"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label={t('ui.scratchpad.scrie_aici')}
              data-placeholder={t('ui.scratchpad.scrie_aici')}
              onInput={onBody}
              onKeyDown={onBodyKey}
              style={{ flex: 1, padding: 6, overflow: 'auto', outline: 'none' }}
            />
            {canSend && (
              <div className="sp-send" style={{ display: 'flex', gap: 6, padding: 6, borderTop: '1px solid var(--line, #ccc)', alignItems: 'center', flexWrap: 'wrap' }}>
                {standalone && (
                  <select aria-label={t('ui.p11.sp_project')} value={target} onChange={(e) => setTarget(e.target.value)}>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                )}
                <select className="sp-mode" aria-label={t('ui.p11.sp_mode')} value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="new">{t('ui.p11.sp_mode_new')}</option>
                  <option value="append" disabled={!standalone && !canAppend}>{t('ui.p11.sp_mode_append')}</option>
                </select>
                {!standalone && mode === 'new' && folders.length > 0 && (
                  <select className="sp-dest" aria-label={t('ui.p11.sp_dest')} value={dest} onChange={(e) => setDest(e.target.value)}>
                    {folders.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                  </select>
                )}
                <button className="sp-send-btn" onClick={send} title={t('ui.scratchpad.trimite_nota_in_proiect_ca')}>{t('ui.scratchpad.in_proiect')}</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}><button onClick={() => add()}>{t('ui.scratchpad.nota_noua')}</button></div>
        )}
      </div>
      {msg && <div className="sp-msg muted small" role="status" style={{ padding: '2px 8px' }}>{msg}</div>}
    </div>
  );
}
