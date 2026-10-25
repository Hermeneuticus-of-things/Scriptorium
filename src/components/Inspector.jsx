import React, { useEffect, useMemo, useState } from 'react';
import { tabKeys } from '../lib/tabKeys.js';
import { incomingLinks } from '../lib/backlinks.js';
import { findNode, rootOf } from '../lib/tree.js';
import { BookmarkIcon, CommentIcon, LockIcon, MetaIcon, NotesIcon, SnapshotIcon, UnlockIcon } from './Icons.jsx';
import { EditorContent, useEditor } from '@tiptap/react';
import SnapshotsPane from './SnapshotsPane.jsx';
import { buildExtensions } from '../editor/extensions.js';
import { parseComments, updateComment } from '../lib/panelsExtra.js';
import { t as tr, uiLocale } from '../lib/i18n.js';
import { labelTitleOf, noneLabel, noneStatus, statusTitleOf } from '../lib/projectSettings.js';

// Survives the remount App does on every selection change (key = selected id),
// so "Lock Inspector" keeps showing the pinned document while navigating.
const lockMemory = { dir: null, id: null };
const COMMENT_COLORS = ['#f5d76e', '#f7a8a8', '#a8d8f7', '#b5e7a0', '#d7b5f0'];

function findIn(tree, id) {
  let hit = null;
  const walk = (ns) => (ns || []).forEach((n) => {
    if (hit) return;
    if (n.id === id) hit = n;
    else if (n.children) walk(n.children);
  });
  walk(tree);
  return hit;
}

export function Notes({ initial, onChange, placeholder }) {
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
  const comments = parseComments(html);
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
            <button aria-label={tr('ui.inspector.sterge_x', { k: k })} onClick={() => onChange(value.filter((x) => x !== k))}>×</button>
          </span>
        ))}
      </div>
      <input
        list="kw-list"
        placeholder={tr('ui.inspector.adauga_cuvant_cheie')}
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

export default function Inspector({
  api, dir, project, node: selectedNode, html: selectedHtml, words: selectedWords, allKeywords, linkTargets = [], onOpen, onPatch: onPatchSelected,
  onNotesChange: onNotesSelected, onProjectNotesChange, onRestore, onError, flush,
  // Optional (batch C): lock, comments, per-id callbacks.
  docs = null, counts = null, onPatchNode, onNotesChangeFor, onLockChange, teamLockOf = () => null, onSnapshotsChanged, authorName = '', onJumpToComment, onHtmlChange,
}) {
  const [tab, setTab] = useState('meta');
  const [lockedId, setLockedIdState] = useState(() => (lockMemory.dir === dir && lockMemory.id && findIn(project.tree, lockMemory.id) ? lockMemory.id : null));
  const setLockedId = (id) => {
    lockMemory.dir = dir;
    lockMemory.id = id;
    setLockedIdState(id);
    onLockChange?.(id);
  };
  const lockedNode = lockedId ? findIn(project.tree, lockedId) : null;
  const pinnedOther = Boolean(lockedNode && lockedNode.id !== selectedNode.id);
  const node = pinnedOther ? lockedNode : selectedNode;
  const html = pinnedOther ? (docs ? docs[lockedNode.id] || '' : '') : selectedHtml;
  const words = pinnedOther ? (counts ? counts[lockedNode.id] || 0 : 0) : selectedWords;
  const noop = () => {};
  const onPatch = pinnedOther ? (onPatchNode ? (p) => onPatchNode(lockedNode.id, p) : noop) : onPatchSelected;
  const onNotesChange = pinnedOther ? (onNotesChangeFor ? (h) => onNotesChangeFor(lockedNode.id, h) : noop) : onNotesSelected;
  const editComment = (index, patch) => onHtmlChange && onHtmlChange(updateComment(html, index, patch), node.id);

  const notes = useMemo(() => annotations(html), [html]);

  const isRoot = Boolean(node.root);

  return (
    <aside className={`inspector ${lockedId ? 'inspector-locked' : ''}`}>
      <div className="inspector-lockbar">
        <button
          className={`lock-toggle ${lockedId ? 'on' : ''}`}
          onClick={() => setLockedId(lockedId ? null : selectedNode.id)}
          title={lockedId ? tr('ui.inspector.deblocheaza_inspectorul_urmeaza_selectia') : tr('ui.inspector.blocheaza_inspectorul_pe_documentul_curent')}
          aria-pressed={Boolean(lockedId)}
          aria-label={lockedId ? tr('ui.inspector.deblocheaza_inspectorul') : tr('ui.inspector.blocheaza_inspectorul')}
        >
          {lockedId ? <LockIcon /> : <UnlockIcon />}
        </button>
        {lockedId && <span className="muted small">{tr('ui.inspector.blocat_pe')} <strong>{node.title}</strong></span>}
        {pinnedOther && onOpen && <button className="link" onClick={() => onOpen(node.id)}>{tr('ui.app.deschide')}</button>}
      </div>
      <div className="tabs" role="tablist" aria-label={tr('ui.inspector.taburi')} onKeyDown={tabKeys(['meta', 'notes', 'project', 'annot', 'snapshots'], tab, setTab)}>
        {[
          ['meta', tr('ui.inspector.tab_detalii'), MetaIcon],
          ['notes', tr('ui.advancedSearchDialog.note'), NotesIcon],
          ['project', tr('group.project'), BookmarkIcon],
          ['annot', `${tr('ui.inspector.tab_comentarii')}${notes.comments.length + notes.footnotes.length ? ` (${notes.comments.length + notes.footnotes.length})` : ''}`, CommentIcon],
          ['snapshots', tr('ui.inspector.tab_snapshots'), SnapshotIcon],
        ].map(([id, label, Ico]) => (
          <button key={id} role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} title={label} aria-label={label}>
            <Ico />
          </button>
        ))}
      </div>

      {tab === 'meta' && (
        <div className="fields">
          <label>
            {tr('ui.advancedSearchDialog.sinopsis')}
            <textarea
              key={`${node.id}:${node.synopsis || ''}`}
              rows={6}
              defaultValue={node.synopsis || ''}
              onBlur={(e) => e.target.value !== (node.synopsis || '') && onPatch({ synopsis: e.target.value })}
            />
          </label>
          {!isRoot && <SynopsisImagePicker api={api} dir={dir} node={node} onPatch={onPatch} onError={onError} />}
          {!isRoot && (
            <label>
              {tr('ui.inspector.subtitlu')}
              <input
                key={`sub-${node.id}`}
                defaultValue={node.subtitle || ''}
                placeholder={tr('ui.inspector.subtitlu_tip')}
                onBlur={(e) => e.target.value.trim() !== (node.subtitle || '') && onPatch({ subtitle: e.target.value.trim() })}
              />
            </label>
          )}
          {!isRoot && (
            <>
              <div className="row">
                <label>
                  {labelTitleOf(project, tr)}
                  <select value={node.label} onChange={(e) => onPatch({ label: e.target.value })}>
                    {project.labels.map((l) => (
                      <option key={l.name} value={l.name}>{noneLabel(l.name, tr)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {statusTitleOf(project, tr)}
                  <select value={node.status} onChange={(e) => onPatch({ status: e.target.value })}>
                    {project.statuses.map((s) => (
                      <option key={s} value={s}>{noneStatus(s, tr)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                {tr('ui.advancedSearchDialog.cuvinte_cheie')}
                <Keywords value={node.keywords || []} all={allKeywords} onChange={(keywords) => onPatch({ keywords })} />
              </label>
              <label className="check">
                <input type="checkbox" checked={node.includeInCompile !== false} onChange={(e) => onPatch({ includeInCompile: e.target.checked })} />
                {tr('ui.binder.include_in_compile')}
              </label>
              <div className="row">
                <label>
                  {tr('ui.inspector.tinta_document')}
                  <input type="number" min="0" step="100" value={node.target || 0} onChange={(e) => onPatch({ target: Number(e.target.value) || 0 })} />
                </label>
                <label>
                  Unitate
                  <select value={node.targetType === 'Characters' ? 'Characters' : 'Words'} onChange={(e) => onPatch({ targetType: e.target.value })}>
                    <option value="Words">{tr('ui.inspector.cuvinte')}</option>
                    <option value="Characters">{tr('ui.inspector.caractere')}</option>
                  </select>
                </label>
              </div>
              <label className="check">
                <input type="checkbox" checked={node.targetNotify !== false} onChange={(e) => onPatch({ targetNotify: e.target.checked })} /> {tr('ui.inspector.notificare_la_atingerea_tintei')}
              </label>
            </>
          )}
          {!isRoot && <CustomFields project={project} node={node} onPatch={onPatch} />}
          {!isRoot && <DocumentExtras project={project} node={node} onPatch={onPatch} linkTargets={linkTargets} onOpen={onOpen} docs={docs} />}
          <MetaTable project={project} node={node} />
          <p className="muted">{words.toLocaleString(uiLocale())} {tr('ui.inspector.cuvinte_in_acest_document')}</p>
        </div>
      )}

      {tab === 'notes' && (
        <NotesLoader api={api} dir={dir} id={node.id} onChange={onNotesChange} onError={onError} placeholder={tr('ui.inspector.note_pentru_acest_document')} />
      )}
      {tab === 'project' && (
        <NotesLoader api={api} dir={dir} id="project-notes" onChange={onProjectNotesChange} onError={onError} placeholder={tr('ui.inspector.note_pentru_tot_proiectul')} />
      )}

      {tab === 'annot' && (
        <div className="annotations">
          <h4>Comentarii</h4>
          {notes.comments.length === 0 && <p className="muted">{tr('ui.inspector.selecteaza_text_si_apasa_in')}</p>}
          <ul className="comment-list">
            {notes.comments.map((c) => (
              <CommentItem
                key={c.index}
                c={c}
                editable={Boolean(onHtmlChange) && !node.locked}
                authorName={authorName}
                onJump={onJumpToComment ? () => onJumpToComment(c.index, c, node.id) : null}
                onEdit={(patch) => editComment(c.index, patch)}
                onDelete={() => window.confirm(tr('ui.inspector.stergi_comentariul_textul_ramane')) && editComment(c.index, null)}
              />
            ))}
          </ul>
          <h4>{tr('ui.compileDialog.note_de_subsol')}</h4>
          {notes.footnotes.length === 0 && <p className="muted">{tr('ui.inspector.apasa_in_bara_editorului_dublu')}</p>}
          <ol>
            {notes.footnotes.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ol>
        </div>
      )}

      {tab === 'snapshots' && (
        <SnapshotsPane
          api={api}
          dir={dir}
          node={node}
          html={html}
          canRestore={!pinnedOther && !node.locked && !teamLockOf(node.id)}
          flush={flush}
          onRestore={onRestore}
          onError={onError}
          onChanged={onSnapshotsChanged}
        />
      )}
    </aside>
  );
}

function CommentItem({ c, editable, authorName, onJump, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.text);
  useEffect(() => setText(c.text), [c.text]);
  const stamp = () => ({ author: c.author || authorName || '', date: new Date().toISOString() });
  return (
    <li className="comment-item" style={{ borderLeftColor: c.color || 'var(--accent, #e0b84a)' }}>
      <q className={onJump ? 'jump' : ''} onClick={onJump || undefined} title={onJump ? tr('ui.inspector.salt_la_text') : undefined}>{c.on}</q>
      {editing ? (
        <div className="comment-edit">
          <textarea rows={3} value={text} autoFocus onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button onClick={() => { onEdit({ text, ...stamp() }); setEditing(false); }}>{tr('btn.save')}</button>
            <button onClick={() => { setText(c.text); setEditing(false); }}>{tr('btn.cancel')}</button>
          </div>
        </div>
      ) : (
        <div onDoubleClick={() => editable && setEditing(true)}>{c.text}</div>
      )}
      <div className="comment-meta muted small">
        {c.author && <span>{c.author}</span>}
        {c.date && <span> · {new Date(c.date).toLocaleString(uiLocale())}</span>}
      </div>
      <div className="comment-actions">
        {onJump && <button className="link" onClick={onJump}>{tr('ui.inspector.salt')}</button>}
        {editable && (
          <>
            <span className="comment-colors">
              {COMMENT_COLORS.map((col) => (
                <button key={col} className={`swatch ${c.color === col ? 'on' : ''}`} style={{ background: col }} aria-label={tr('ui.inspector.culoare_x', { col: col })} onClick={() => onEdit({ color: c.color === col ? '' : col })} />
              ))}
            </span>
            <button className="link" onClick={() => setEditing(true)}>{tr('ui.inspector.editeaza')}</button>
            <button className="link" onClick={onDelete}>{tr('btn.delete')}</button>
          </>
        )}
      </div>
    </li>
  );
}

// Synopsis image (Scrivener: Inspector > Synopsis > image). Stored as node.synopsisImage = media file name.
function SynopsisImagePicker({ api, dir, node, onPatch, onError }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (node.synopsisImage && api.readMedia) api.readMedia(dir, node.synopsisImage).then((u) => alive && setUrl(u)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [api, dir, node.synopsisImage]);
  if (!api.addMediaFiles && !node.synopsisImage) return null;
  const choose = async () => {
    try {
      const added = (await api.addMediaFiles(dir)) || [];
      const img = added.find((a) => (a.media?.mime || '').startsWith('image/')) || added[0];
      if (img?.media?.file) onPatch({ synopsisImage: img.media.file, showSynopsisImage: true });
    } catch (e) {
      onError?.(e);
    }
  };
  return (
    <div className="synopsis-image">
      {url && <img src={url} alt={tr('ui.inspector.imagine_sinopsis')} />}
      <div className="row">
        {api.addMediaFiles && <button onClick={choose}>{node.synopsisImage ? tr('ui.inspector.schimba_imaginea') : tr('ui.inspector.imagine_sinopsis_2')}</button>}
        {node.synopsisImage && (
          <>
            <label className="check">
              <input type="checkbox" checked={node.showSynopsisImage !== false} onChange={(e) => onPatch({ showSynopsisImage: e.target.checked })} /> {tr('ui.inspector.pe_card')}
            </label>
            <button className="link" onClick={() => onPatch({ synopsisImage: null })}>{tr('ui.inspector.elimina')}</button>
          </>
        )}
      </div>
    </div>
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
                <option value="">{tr('ui.inspector.nimic')}</option>
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
function DocumentExtras({ project, node, onPatch, linkTargets, onOpen, docs }) {
  const bookmarks = node.bookmarks || [];
  // Trashed or deleted documents keep their text in `docs`, but no longer count as links here.
  const liveNode = (id) => (findNode(project.tree || [], id) && rootOf(project.tree || [], id)?.root !== 'trash' ? findNode(project.tree, id) : null);
  const incoming = incomingLinks(docs || {}, node.id, (id) => Boolean(liveNode(id)));
  const types = project.sectionTypes || [];
  const setBookmarks = (b) => onPatch({ bookmarks: b });
  return (
    <div className="fields">
      <div className="row">
        <label>
          {tr('ui.inspector.icoana')}
          <select value={node.icon && /\p{Extended_Pictographic}/u.test(node.icon) ? node.icon : ''} onChange={(e) => onPatch({ icon: e.target.value || null })}>
            <option value="">{tr('ui.inspector.implicita')}</option>
            {ICONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </label>
        <label>
          {tr('ui.inspector.culoare_icoana')}
          <span className="row">
            <input type="color" value={node.iconColor || '#888888'} onChange={(e) => onPatch({ iconColor: e.target.value })} />
            {node.iconColor && <button className="link" onClick={() => onPatch({ iconColor: null })} title={tr('ui.collectionsBar.fara_culoare')}>∅</button>}
          </span>
        </label>
        {types.length > 0 && (
          <label>
            {tr('ui.inspector.tip_sectiune')}
            <select value={node.sectionType || ''} onChange={(e) => onPatch({ sectionType: e.target.value || null })}>
              <option value="">{tr('ui.inspector.dupa_nivel')}</option>
              {types.map((t) => (
                <option key={t.id} value={t.title}>{t.title}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="checks">
        <label className="check">
          <input type="checkbox" checked={Boolean(node.locked)} onChange={(e) => onPatch({ locked: e.target.checked })} /> {tr('ui.binder.blocat_doar_citire')}
        </label>
        <label className="check">
          <input type="checkbox" checked={Boolean(node.favorite)} onChange={(e) => onPatch({ favorite: e.target.checked })} /> {tr('ui.binder.favorit')}
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
                <button className="link" onClick={() => onOpen?.(b.id)}>{linkTargets.find((t) => t.id === b.id)?.title || tr('ui.inspector.document_sters')}</button>
              )}
              <button className="link" aria-label={tr('ui.inspector.sterge_bookmark')} onClick={() => setBookmarks(bookmarks.filter((_, k) => k !== i))}>×</button>
            </li>
          ))}
        </ul>
        <div className="row bookmark-add">
          <select value="" onChange={(e) => e.target.value && setBookmarks([...bookmarks, { id: e.target.value }])}>
            <option value="">+ document…</option>
            {linkTargets.filter((t) => t.id !== node.id).map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const url = window.prompt(tr('ui.inspector.adresa_web'), 'https://');
              if (url && /^https?:\/\//.test(url)) setBookmarks([...bookmarks, { url }]);
            }}
          >
            {tr('ui.inspector.link_web')}
          </button>
        </div>
      </label>
      <div className="incoming-links">
        {tr('ui.inspector.incomingLinks')}
        {incoming.length ? (
          <ul className="bookmarks">
            {incoming.map((id) => (
              <li key={id}>
                <button className="link" onClick={() => onOpen?.(id)}>{liveNode(id)?.title || linkTargets.find((t) => t.id === id)?.title || tr('ui.inspector.document_sters')}</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{tr('ui.inspector.noIncomingLinks')}</p>
        )}
      </div>
    </div>
  );
}

// Read-only facts: dates, section type, Scrivener origin, bookmarks.
function MetaTable({ project, node }) {
  const fmt = (d) => (d ? new Date(d).toLocaleString(uiLocale()) : '');
  const rows = [
    [tr('ui.inspector.creat'), fmt(node.created)],
    [tr('ui.inspector.modificat'), fmt(node.modified)],
    [tr('ui.inspector.tinta'), node.target ? `${node.target} ${node.targetType === 'Characters' ? tr('ui.inspector.caractere') : tr('ui.inspector.cuvinte')}` : ''],
    [tr('ui.inspector.origine_scriv'), node.scrivener ? `${node.scrivener.type} · ${node.scrivener.uuid}` : ''],
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

