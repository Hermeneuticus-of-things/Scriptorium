import React, { useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { diffWords } from 'diff';
import { buildExtensions } from '../editor/extensions.js';
import { htmlToText } from '../lib/text.js';

function Notes({ initial, onChange, placeholder }) {
  const editor = useEditor({
    extensions: buildExtensions({ placeholder }),
    content: initial || '<p></p>',
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });
  return <EditorContent editor={editor} className="notes" />;
}

function NotesLoader({ api, dir, id, onChange, onError, placeholder }) {
  const [html, setHtml] = useState(null);
  useEffect(() => {
    setHtml(null);
    api.readDoc(dir, id, 'notes').then(setHtml).catch(onError);
  }, [api, dir, id, onError]);
  if (html === null) return null;
  return <Notes key={id} initial={html} onChange={onChange} placeholder={placeholder} />;
}

function annotations(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const comments = [...doc.querySelectorAll('span[data-comment]')].map((el) => ({ text: el.getAttribute('data-comment'), on: el.textContent }));
  const footnotes = [...doc.querySelectorAll('span[data-footnote]')].map((el) => el.getAttribute('data-footnote'));
  return { comments, footnotes };
}

function Keywords({ value, all, onChange }) {
  const [input, setInput] = useState('');
  const add = (k) => {
    const v = k.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  };
  return (
    <div className="keywords">
      <div className="chips">
        {value.map((k) => (
          <span key={k} className="chip">
            {k}
            <button aria-label={`Șterge ${k}`} onClick={() => onChange(value.filter((x) => x !== k))}>×</button>
          </span>
        ))}
      </div>
      <input
        list="kw-list"
        placeholder="Adaugă cuvânt cheie…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(input);
          }
        }}
        onBlur={() => input && add(input)}
      />
      <datalist id="kw-list">
        {all.filter((k) => !value.includes(k)).map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
    </div>
  );
}

export default function Inspector({ api, dir, project, node, html, words, allKeywords, linkTargets = [], onOpen, onPatch, onNotesChange, onProjectNotesChange, onRestore, onError, flush }) {
  const [tab, setTab] = useState('meta');
  const [snaps, setSnaps] = useState([]);
  const [preview, setPreview] = useState(null);
  const [compare, setCompare] = useState(null);

  useEffect(() => {
    if (tab === 'snapshots') api.listSnapshots(dir, node.id).then(setSnaps).catch(onError);
  }, [api, dir, node.id, tab, onError]);

  const notes = useMemo(() => annotations(html), [html]);

  const take = async () => {
    const name = window.prompt('Nume snapshot:', `Înainte de revizie ${new Date().toLocaleDateString('ro-RO')}`);
    if (name === null) return;
    await flush();
    await api.takeSnapshot(dir, node.id, name).catch(onError);
    setSnaps(await api.listSnapshots(dir, node.id));
  };

  const isRoot = Boolean(node.root);
  const diff = compare ? diffWords(htmlToText(compare.html), htmlToText(html)) : null;

  return (
    <aside className="inspector">
      <div className="tabs">
        {[
          ['meta', 'Detalii'],
          ['notes', 'Note'],
          ['project', 'Proiect'],
          ['annot', `Comentarii${notes.comments.length + notes.footnotes.length ? ` (${notes.comments.length + notes.footnotes.length})` : ''}`],
          ['snapshots', 'Snapshot-uri'],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'meta' && (
        <div className="fields">
          <label>
            Sinopsis
            <textarea
              key={node.id}
              rows={6}
              defaultValue={node.synopsis || ''}
              onBlur={(e) => e.target.value !== (node.synopsis || '') && onPatch({ synopsis: e.target.value })}
            />
          </label>
          {!isRoot && (
            <>
              <div className="row">
                <label>
                  Etichetă
                  <select value={node.label} onChange={(e) => onPatch({ label: e.target.value })}>
                    {project.labels.map((l) => (
                      <option key={l.name}>{l.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select value={node.status} onChange={(e) => onPatch({ status: e.target.value })}>
                    {project.statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Cuvinte cheie
                <Keywords value={node.keywords || []} all={allKeywords} onChange={(keywords) => onPatch({ keywords })} />
              </label>
              <label className="check">
                <input type="checkbox" checked={node.includeInCompile !== false} onChange={(e) => onPatch({ includeInCompile: e.target.checked })} />
                Include în Compile
              </label>
              <label>
                Țintă cuvinte document
                <input type="number" min="0" step="100" value={node.target || 0} onChange={(e) => onPatch({ target: Number(e.target.value) || 0 })} />
              </label>
            </>
          )}
          {!isRoot && <CustomFields project={project} node={node} onPatch={onPatch} />}
          {!isRoot && <DocumentExtras project={project} node={node} onPatch={onPatch} linkTargets={linkTargets} onOpen={onOpen} />}
          <MetaTable project={project} node={node} />
          <p className="muted">{words.toLocaleString('ro-RO')} cuvinte în acest document</p>
        </div>
      )}

      {tab === 'notes' && (
        <NotesLoader api={api} dir={dir} id={node.id} onChange={onNotesChange} onError={onError} placeholder="Note pentru acest document…" />
      )}
      {tab === 'project' && (
        <NotesLoader api={api} dir={dir} id="project-notes" onChange={onProjectNotesChange} onError={onError} placeholder="Note pentru tot proiectul…" />
      )}

      {tab === 'annot' && (
        <div className="annotations">
          <h4>Comentarii</h4>
          {notes.comments.length === 0 && <p className="muted">Selectează text și apasă 💬 în bara editorului.</p>}
          <ul>
            {notes.comments.map((c, i) => (
              <li key={i}>
                <q>{c.on}</q>
                <div>{c.text}</div>
              </li>
            ))}
          </ul>
          <h4>Note de subsol</h4>
          {notes.footnotes.length === 0 && <p className="muted">Apasă ¹ în bara editorului. Dublu-clic pe număr pentru editare.</p>}
          <ol>
            {notes.footnotes.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ol>
        </div>
      )}

      {tab === 'snapshots' && (
        <div className="snapshots">
          <button onClick={take}>📸 Snapshot acum</button>
          {snaps.length === 0 && <p className="muted">Niciun snapshot. Fă unul înainte de o revizie mare.</p>}
          <ul>
            {snaps.map((s) => (
              <li key={s.file}>
                <div>
                  <strong>{s.name}</strong>
                  <br />
                  <small>{new Date(s.date).toLocaleString('ro-RO')}</small>
                </div>
                <button className="link" onClick={() => { setCompare(null); setPreview(preview === s ? null : s); }}>{preview === s ? 'Ascunde' : 'Vezi'}</button>
                <button className="link" onClick={() => { setPreview(null); setCompare(compare === s ? null : s); }}>{compare === s ? 'Ascunde' : 'Compară'}</button>
                <button
                  className="link"
                  onClick={async () => {
                    if (!window.confirm('Restaurezi acest snapshot? Textul curent este salvat automat ca snapshot înainte.')) return;
                    await flush();
                    await api.takeSnapshot(dir, node.id, 'Automat înainte de restaurare');
                    onRestore(s.html);
                    setSnaps(await api.listSnapshots(dir, node.id));
                  }}
                >
                  Restaurează
                </button>
              </li>
            ))}
          </ul>
          {preview && <div className="snap-preview prose" dangerouslySetInnerHTML={{ __html: sanitize(preview.html) }} />}
          {diff && (
            <div className="snap-preview diff">
              <p className="muted"><del>șters</del> față de snapshot · <ins>adăugat</ins> în textul curent</p>
              {diff.map((part, i) =>
                part.added ? <ins key={i}>{part.value}</ins> : part.removed ? <del key={i}>{part.value}</del> : <span key={i}>{part.value}</span>,
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

// Custom metadata (Scrivener: Text, Checkbox, List, Date), defined in project.customFields.
function CustomFields({ project, node, onPatch }) {
  const fields = project.customFields || [];
  if (!fields.length) return null;
  const values = node.custom || {};
  const set = (title, value) => onPatch({ custom: { ...values, [title]: value } });
  return (
    <div className="fields">
      {fields.map((f) => {
        const v = values[f.title];
        if (f.type === 'checkbox') {
          return (
            <label key={f.id} className="check">
              <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.title, e.target.checked)} /> {f.title}
            </label>
          );
        }
        if (f.type === 'list') {
          return (
            <label key={f.id}>
              {f.title}
              <select value={v || ''} onChange={(e) => set(f.title, e.target.value)}>
                <option value="">(nimic)</option>
                {f.options.map((o) => (
                  <option key={o.id || o.title}>{o.title}</option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={f.id}>
            {f.title}
            <input type={f.type === 'date' ? 'date' : 'text'} defaultValue={f.type === 'date' && v ? String(v).slice(0, 10) : v || ''} onBlur={(e) => e.target.value !== (v || '') && set(f.title, e.target.value)} />
          </label>
        );
      })}
    </div>
  );
}

const ICONS = ['📄', '📁', '📝', '⭐', '❗', '❓', '💡', '🔥', '🧭', '🗝️', '📌', '🕯️', '🌿', '🌊', '⛰️', '🏛️', '👤', '👥', '🗺️', '📅', '🔬', '📚', '✉️', '🎭'];

// Icon, section type, lock, favorite and bookmarks (Scrivener: Inspector > Bookmarks).
function DocumentExtras({ project, node, onPatch, linkTargets, onOpen }) {
  const bookmarks = node.bookmarks || [];
  const types = project.sectionTypes || [];
  const setBookmarks = (b) => onPatch({ bookmarks: b });
  return (
    <div className="fields">
      <div className="row">
        <label>
          Icoană
          <select value={node.icon && /\p{Extended_Pictographic}/u.test(node.icon) ? node.icon : ''} onChange={(e) => onPatch({ icon: e.target.value || null })}>
            <option value="">Implicită</option>
            {ICONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </label>
        {types.length > 0 && (
          <label>
            Tip secțiune
            <select value={node.sectionType || ''} onChange={(e) => onPatch({ sectionType: e.target.value || null })}>
              <option value="">După nivel</option>
              {types.map((t) => (
                <option key={t.id} value={t.title}>{t.title}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="checks">
        <label className="check">
          <input type="checkbox" checked={Boolean(node.locked)} onChange={(e) => onPatch({ locked: e.target.checked })} /> Blocat (doar citire)
        </label>
        <label className="check">
          <input type="checkbox" checked={Boolean(node.favorite)} onChange={(e) => onPatch({ favorite: e.target.checked })} /> Favorit
        </label>
      </div>
      <label>
        Bookmark-uri
        <ul className="bookmarks">
          {bookmarks.map((b, i) => (
            <li key={i}>
              {b.url ? (
                <a href={b.url} target="_blank" rel="noreferrer">{b.url}</a>
              ) : (
                <button className="link" onClick={() => onOpen?.(b.id)}>{linkTargets.find((t) => t.id === b.id)?.title || 'Document șters'}</button>
              )}
              <button className="link" aria-label="Șterge bookmark" onClick={() => setBookmarks(bookmarks.filter((_, k) => k !== i))}>×</button>
            </li>
          ))}
        </ul>
        <div className="row">
          <select value="" onChange={(e) => e.target.value && setBookmarks([...bookmarks, { id: e.target.value }])}>
            <option value="">+ document…</option>
            {linkTargets.filter((t) => t.id !== node.id).map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const url = window.prompt('Adresa web:', 'https://');
              if (url && /^https?:\/\//.test(url)) setBookmarks([...bookmarks, { url }]);
            }}
          >
            + link web
          </button>
        </div>
      </label>
    </div>
  );
}

// Read-only facts: dates, section type, Scrivener origin, bookmarks.
function MetaTable({ project, node }) {
  const fmt = (d) => (d ? new Date(d).toLocaleString('ro-RO') : '');
  const rows = [
    ['Creat', fmt(node.created)],
    ['Modificat', fmt(node.modified)],
    ['Țintă', node.target ? `${node.target} ${node.targetType === 'Characters' ? 'caractere' : 'cuvinte'}` : ''],
    ['Origine Scrivener', node.scrivener ? `${node.scrivener.type} · ${node.scrivener.uuid}` : ''],
  ].filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <table className="meta-table">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td>{k}</td>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function titleOf(project, id) {
  let t = id;
  const walk = (nodes) => nodes.forEach((n) => {
    if (n.id === id) t = n.title;
    if (n.children) walk(n.children);
  });
  walk(project.tree);
  return t;
}

// Snapshot HTML is our own editor output, but strip anything executable anyway.
function sanitize(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) if (a.name.startsWith('on') || /^javascript:/i.test(a.value)) el.removeAttribute(a.name);
  });
  return doc.body.innerHTML;
}
