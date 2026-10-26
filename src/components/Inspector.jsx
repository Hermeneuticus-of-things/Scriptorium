import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tabKeys } from '../lib/tabKeys.js';
import { incomingLinks } from '../lib/backlinks.js';
import { findNode, rootOf } from '../lib/tree.js';
import { BookmarkIcon, CommentIcon, LockIcon, MetaIcon, NotesIcon, SnapshotIcon, UnlockIcon } from './Icons.jsx';
import { EditorContent, useEditor } from '@tiptap/react';
import SnapshotsPane from './SnapshotsPane.jsx';
import { buildExtensions } from '../editor/extensions.js';
import { parseAnnotations, updateComment, updateFootnote } from '../lib/panelsExtra.js';
import BookmarksPanel from './BookmarksPanel.jsx';
import { t as tr, uiLocale } from '../lib/i18n.js';
import { moveTo, labelTitleOf, noneLabel, noneStatus, statusTitleOf, synopsisFromText, parseNumberField, customIconOf, CUSTOM_ICON_PREFIX } from '../lib/projectSettings.js';
import ProjectNotesTabs from './ProjectNotesTabs.jsx';
import { uiPrompt } from '../lib/uiPrompt.jsx';

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
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  // Loaded once per document: a new onError on every render must not reload (and rebuild) the notes editor.
  useEffect(() => {
    let alive = true;
    setHtml(null);
    api.readDoc(dir, id, 'notes').then((h) => alive && setHtml(h), (e) => onErrorRef.current?.(e));
    return () => {
      alive = false;
    };
  }, [api, dir, id]);
  if (html === null) return null;
  return <Notes key={id} initial={html} onChange={onChange} placeholder={placeholder} />;
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

// One collapsible group of the Details tab: only what the writer opened stays open (remembered).
const SECTIONS_KEY = 'scribner-inspector-sections';
function Section({ id, title, open: openByDefault = false, children }) {
  const [open, setOpen] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}');
      return saved[id] ?? openByDefault;
    } catch {
      return openByDefault;
    }
  });
  const toggle = (e) => {
    const next = e.currentTarget.open;
    setOpen(next);
    try {
      const saved = JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}');
      localStorage.setItem(SECTIONS_KEY, JSON.stringify({ ...saved, [id]: next }));
    } catch {
      /* storage off */
    }
  };
  return (
    <details className="insp-section" open={open} onToggle={toggle}>
      <summary>{title}</summary>
      {open && <div className="insp-section-body">{children}</div>}
    </details>
  );
}

export default function Inspector({
  api, dir, project, node: selectedNode, html: selectedHtml, words: selectedWords, allKeywords, linkTargets = [], onOpen, onPatch: onPatchSelected,
  onNotesChange: onNotesSelected, onProjectNotesChange, onRestore, onError, flush,
  // Optional (batch C): lock, comments, per-id callbacks.
  docs = null, counts = null, onPatchNode, onNotesChangeFor, onLockChange, teamLockOf = () => null, onSnapshotsChanged, authorName = '', onJumpToComment, onHtmlChange,
  // G3: + Comment / + Note from the Inspector, footnote jumps, project bookmarks.
  onAddAnnotation, onJumpToFootnote, onProjectBookmarksChange, latestHtml,
  // P10: project notes as tabs (each tab its own file), project note tab list.
  onProjectNoteChange, onProjectNoteTabsChange,
}) {
  const [tab, setTab] = useState('notes');
  const [notesOf, setNotesOf] = useState('doc'); // Notes pane: this document or the whole project
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
  // Edits made here show at once (the App commits typed text a moment later) and the next edit
  // starts from the newest text, so two quick edits never undo each other.
  const [override, setOverride] = useState(null);
  useEffect(() => setOverride(null), [html]);
  const shownHtml = override ?? html;
  const applyEdit = (fn) => {
    if (!onHtmlChange) return;
    const base = override ?? latestHtml?.(node.id) ?? html;
    const next = fn(base);
    setOverride(next);
    onHtmlChange(next, node.id);
  };
  const editComment = (index, patch) => applyEdit((h) => updateComment(h, index, patch));
  const editFootnote = (index, patch) => applyEdit((h) => updateFootnote(h, index, patch));

  const annots = useMemo(() => parseAnnotations(shownHtml), [shownHtml]);

  const isRoot = Boolean(node.root);
  const fmt = project.defaultFormatting || {};
  const notesStyle = { fontFamily: fmt.notesFont || undefined, fontSize: fmt.notesSize ? `${fmt.notesSize}px` : undefined };

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
      <div className="tabs" role="tablist" aria-label={tr('ui.inspector.taburi')} onKeyDown={tabKeys(['notes', 'bookmarks', 'meta', 'snapshots', 'annot'], tab, setTab)}>
        {[
          ['notes', tr('ui.advancedSearchDialog.note'), NotesIcon],
          ['bookmarks', tr('ui.inspector.tab_semne'), BookmarkIcon],
          ['meta', tr('ui.inspector.tab_detalii'), MetaIcon],
          ['snapshots', tr('ui.inspector.tab_snapshots'), SnapshotIcon],
          ['annot', `${tr('ui.inspector.tab_annot')}${annots.length ? ` (${annots.length})` : ''}`, CommentIcon],
        ].map(([id, label, Ico]) => (
          <button key={id} role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} title={label} aria-label={label}>
            <Ico />
          </button>
        ))}
      </div>

      {tab === 'meta' && (
        <div className="fields insp-sections">
          {!isRoot && (
            <Section id="general" title={tr('ui.inspector.sec_general')} open>
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
              <label className="check">
                <input type="checkbox" checked={node.includeInCompile !== false} onChange={(e) => onPatch({ includeInCompile: e.target.checked })} />
                {tr('ui.binder.include_in_compile')}
              </label>
              <label className="check">
                <input type="checkbox" className="insp-page-break" checked={Boolean(node.pageBreakBefore)} onChange={(e) => onPatch({ pageBreakBefore: e.target.checked })} />
                {tr('ui.inspector.pagina_noua_inainte')}
              </label>
              <label className="check">
                <input type="checkbox" className="insp-as-is" checked={Boolean(node.compileAsIs)} onChange={(e) => onPatch({ compileAsIs: e.target.checked })} />
                {tr('ui.inspector.compileaza_asa_cum_e')}
              </label>
            </Section>
          )}
          {!isRoot && (
            <Section id="keywords" title={`${tr('ui.advancedSearchDialog.cuvinte_cheie')}${(node.keywords || []).length ? ` (${node.keywords.length})` : ''}`}>
              <Keywords value={node.keywords || []} all={allKeywords} onChange={(keywords) => onPatch({ keywords })} />
            </Section>
          )}
          {!isRoot && (
            <Section id="target" title={`${tr('ui.inspector.tinta_document')}${node.target ? `: ${node.target}` : ''}`}>
              <div className="row">
                <label>
                  {tr('ui.inspector.tinta_document')}
                  <input type="number" min="0" step="100" value={node.target || 0} onChange={(e) => onPatch({ target: Number(e.target.value) || 0 })} />
                </label>
                <label>
                  {tr('ui.inspector.unitate')}
                  <select value={node.targetType === 'Characters' ? 'Characters' : 'Words'} onChange={(e) => onPatch({ targetType: e.target.value })}>
                    <option value="Words">{tr('ui.inspector.cuvinte')}</option>
                    <option value="Characters">{tr('ui.inspector.caractere')}</option>
                  </select>
                </label>
              </div>
              <label className="check">
                <input type="checkbox" checked={node.targetNotify !== false} onChange={(e) => onPatch({ targetNotify: e.target.checked })} /> {tr('ui.inspector.notificare_la_atingerea_tintei')}
              </label>
            </Section>
          )}
          {!isRoot && (
            <Section id="custom" title={tr('ui.inspector.sec_campuri')}>
              <label>
                {tr('ui.inspector.subtitlu')}
                <input
                  key={`sub-${node.id}`}
                  defaultValue={node.subtitle || ''}
                  placeholder={tr('ui.inspector.subtitlu_tip')}
                  onBlur={(e) => e.target.value.trim() !== (node.subtitle || '') && onPatch({ subtitle: e.target.value.trim() })}
                />
              </label>
              <CustomFields project={project} node={node} onPatch={onPatch} />
            </Section>
          )}
          <Section id="info" title={`${tr('ui.inspector.sec_info')} · ${words.toLocaleString(uiLocale())} ${tr('ui.inspector.cuvinte')}`}>
            <MetaTable project={project} node={node} />
            <p className="muted">{words.toLocaleString(uiLocale())} {tr('ui.inspector.cuvinte_in_acest_document')}</p>
          </Section>
        </div>
      )}

      {tab === 'notes' && (
        <div className="fields insp-sections">
            <Section id="synopsis" title={tr('ui.advancedSearchDialog.sinopsis')} open>
            <textarea
              key={`${node.id}:${node.synopsis || ''}`}
              rows={6}
              aria-label={tr('ui.advancedSearchDialog.sinopsis')}
              defaultValue={node.synopsis || ''}
              onBlur={(e) => e.target.value !== (node.synopsis || '') && onPatch({ synopsis: e.target.value })}
            />
            {!isRoot && (
              <div className="row">
                <button
                  className="insp-synopsis-from-text"
                  disabled={!synopsisFromText(shownHtml)}
                  title={tr('ui.inspector.sinopsis_din_text_tip')}
                  onClick={() => {
                    if (node.synopsis && !window.confirm(tr('ui.inspector.sinopsis_inlocuiesti'))) return;
                    onPatch({ synopsis: synopsisFromText(latestHtml?.(node.id) ?? shownHtml) });
                  }}
                >
                  {tr('ui.inspector.sinopsis_din_text')}
                </button>
              </div>
            )}
            {!isRoot && <SynopsisImagePicker api={api} dir={dir} node={node} onPatch={onPatch} onError={onError} />}
          </Section>
          <div className="seg" role="group" aria-label={tr('ui.advancedSearchDialog.note')}>
            <button className={notesOf === 'doc' ? 'on' : ''} aria-pressed={notesOf === 'doc'} onClick={() => setNotesOf('doc')}>{tr('ui.inspector.note_document')}</button>
            <button className={notesOf === 'project' ? 'on' : ''} aria-pressed={notesOf === 'project'} onClick={() => setNotesOf('project')}>{tr('group.project')}</button>
          </div>
          <div className="insp-notes-body" style={notesStyle}>
            {notesOf === 'doc' ? (
              <NotesLoader key="doc" api={api} dir={dir} id={node.id} onChange={onNotesChange} onError={onError} placeholder={tr('ui.inspector.note_pentru_acest_document')} />
            ) : onProjectNoteChange && onProjectNoteTabsChange && api ? (
              <div className="insp-project-notes">
                <ProjectNotesTabs
                  tabs={project.projectNotes}
                  readNote={(id) => api.readDoc(dir, id, 'notes')}
                  onNoteChange={onProjectNoteChange}
                  onTabsChange={onProjectNoteTabsChange}
                  onError={onError}
                />
              </div>
            ) : (
              <NotesLoader key="project" api={api} dir={dir} id="project-notes" onChange={onProjectNotesChange} onError={onError} placeholder={tr('ui.inspector.note_pentru_tot_proiectul')} />
            )}
          </div>
        </div>
      )}
      {tab === 'bookmarks' && !isRoot && (
        <DocumentExtras
          api={api}
          dir={dir}
          project={project}
          node={node}
          onPatch={onPatch}
          linkTargets={linkTargets}
          onOpen={onOpen}
          docs={docs}
          readDoc={api && dir ? (id) => api.readDoc(dir, id, 'docs') : null}
          onProjectBookmarksChange={onProjectBookmarksChange}
          onError={onError}
        />
      )}

      {tab === 'annot' && (
        <AnnotationsPane
          items={annots}
          editable={Boolean(onHtmlChange) && !node.locked && !teamLockOf(node.id)}
          canAdd={Boolean(onAddAnnotation) && !pinnedOther && !isRoot && !node.locked && !teamLockOf(node.id)}
          authorName={authorName}
          onAdd={(kind) => onAddAnnotation(kind, node.id)}
          onJump={(it) => (it.kind === 'comment' ? onJumpToComment?.(it.index, it, node.id) : onJumpToFootnote?.(it.index, node.id))}
          onEdit={(it, patch) => (it.kind === 'comment' ? editComment(it.index, patch) : editFootnote(it.index, patch))}
          onDelete={(it) => (it.kind === 'comment' ? editComment(it.index, null) : editFootnote(it.index, null))}
        />
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

// Comments and footnotes of the document in ONE list, in text order (as in the classic
// Inspector's "Comments & Footnotes" pane): + Comment / + Footnote add at the cursor, a click
// on an item jumps to its place in the text, the note text is edited in place.
const ANNOT_FILTER_KEY = 'scribner-annot-filter';
function AnnotationsPane({ items, editable, canAdd, authorName, onAdd, onJump, onEdit, onDelete }) {
  const [editingKey, setEditingKey] = useState(null);
  const [pending, setPending] = useState(null); // kind just added: its new (empty) item opens for editing
  const [hint, setHint] = useState('');
  const [filter, setFilter] = useState(() => {
    try {
      return ['comment', 'footnote'].includes(localStorage.getItem(ANNOT_FILTER_KEY)) ? localStorage.getItem(ANNOT_FILTER_KEY) : 'all';
    } catch {
      return 'all';
    }
  });
  const setFilterSaved = (k) => {
    setFilter(k);
    try {
      localStorage.setItem(ANNOT_FILTER_KEY, k);
    } catch {
      /* storage off */
    }
  };
  const keyOf = (it) => `${it.kind}:${it.index}`;
  useEffect(() => {
    if (!pending) return;
    const fresh = [...items].reverse().find((it) => it.kind === pending && !it.text);
    if (fresh) {
      setEditingKey(keyOf(fresh));
      setPending(null);
    }
  }, [items, pending]);
  const add = async (kind) => {
    setHint('');
    const ok = await onAdd(kind);
    if (ok === false) setHint(kind === 'comment' ? tr('ui.inspector.annot_no_word') : tr('ui.inspector.annot_no_editor'));
    else {
      if (filter !== 'all' && filter !== kind) setFilter('all'); // the new note must be visible
      setPending(kind);
    }
  };
  let footNo = 0;
  const numbered = items.map((it) => ({ it, no: it.kind === 'footnote' ? (footNo += 1) : 0 }));
  const shown = filter === 'all' ? numbered : numbered.filter(({ it }) => it.kind === filter);
  const nC = items.filter((it) => it.kind === 'comment').length;
  return (
    <div className="annotations annot-pane">
      <div className="annot-toolbar row">
        <button className="annot-add-comment" disabled={!canAdd} onClick={() => add('comment')} title={tr('ui.inspector.annot_add_comment_tip')}>+ {tr('ui.inspector.annot_comment')}</button>
        <button className="annot-add-footnote" disabled={!canAdd} onClick={() => add('footnote')} title={tr('ui.inspector.annot_add_footnote_tip')}>+ {tr('ui.inspector.annot_footnote')}</button>
      </div>
      {items.length > 0 && (
        <div className="seg annot-filter" role="group" aria-label={tr('ui.inspector.annot_filtru')}>
          {[['all', tr('ui.inspector.annot_toate'), items.length], ['comment', tr('ui.inspector.annot_doar_comentarii'), nC], ['footnote', tr('ui.inspector.annot_doar_note'), items.length - nC]].map(([k, label, n]) => (
            <button key={k} className={filter === k ? 'on' : ''} aria-pressed={filter === k} onClick={() => setFilterSaved(k)}>{label} ({n})</button>
          ))}
        </div>
      )}
      {hint && <p className="muted small annot-hint" role="status">{hint}</p>}
      {items.length === 0 && <p className="muted">{tr('ui.inspector.annot_empty')}</p>}
      <ul className="annot-list">
        {shown.map(({ it, no }) => {
          return (
            <AnnotationItem
              key={`${keyOf(it)}:${it.start}`}
              it={it}
              no={no}
              editable={editable}
              editing={editingKey === keyOf(it)}
              setEditing={(on) => setEditingKey(on ? keyOf(it) : null)}
              authorName={authorName}
              onJump={() => onJump(it)}
              onEdit={(patch) => onEdit(it, patch)}
              onDelete={(ask = true) => {
                if (ask && it.kind === 'comment' && it.text && !window.confirm(tr('ui.inspector.stergi_comentariul_textul_ramane'))) return;
                setEditingKey(null);
                onDelete(it);
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}

function AnnotationItem({ it, no, editable, editing, setEditing, authorName, onJump, onEdit, onDelete }) {
  const [text, setText] = useState(it.text);
  useEffect(() => setText(it.text), [it.text]);
  const isComment = it.kind === 'comment';
  const closed = useRef(false); // Esc already closed the box: the blur that follows must not save
  useEffect(() => {
    if (editing) closed.current = false;
  }, [editing]);
  const save = () => {
    if (closed.current) return;
    closed.current = true;
    setEditing(false);
    if (text === it.text) return;
    onEdit(isComment ? { text, author: it.author || authorName || '', date: new Date().toISOString() } : { text });
  };
  const cancel = () => {
    closed.current = true;
    setEditing(false);
    setText(it.text);
    if (!it.text) onDelete(false); // a new, still empty note: Esc takes it back
  };
  const anchor = isComment || it.footKind === 'linked' ? it.on : it.before ? `…${it.before}` : '';
  return (
    <li
      className={`annot-item ${isComment ? 'annot-comment comment-item' : 'annot-footnote'}`}
      style={isComment ? { borderLeftColor: it.color || 'var(--comment-default, #e0b84a)' } : undefined}
    >
      <div className="annot-head" role="button" tabIndex={0} onClick={onJump} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onJump())} title={tr('ui.inspector.salt_la_text')}>
        <span className="annot-kind" aria-label={isComment ? tr('ui.inspector.annot_comment') : tr('ui.inspector.annot_footnote')}>{isComment ? '💬' : <sup>{no}</sup>}</span>
        {anchor && <q className="jump">{anchor}</q>}
      </div>
      {editing ? (
        <textarea
          className="annot-edit"
          rows={3}
          value={text}
          autoFocus
          aria-label={isComment ? tr('ui.inspector.annot_comment') : tr('ui.inspector.annot_footnote')}
          placeholder={isComment ? tr('ui.inspector.annot_comment_ph') : tr('ui.inspector.annot_footnote_ph')}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
          }}
        />
      ) : (
        <div
          className={`annot-text ${editable ? 'editable' : ''} ${it.text ? '' : 'muted'}`}
          tabIndex={editable ? 0 : -1}
          onClick={() => editable && setEditing(true)}
          onKeyDown={(e) => editable && e.key === 'Enter' && (e.preventDefault(), setEditing(true))}
          title={editable ? tr('ui.inspector.annot_click_edit') : undefined}
        >
          {it.text || tr('ui.inspector.annot_empty_text')}
        </div>
      )}
      {isComment && (it.author || it.date) && (
        <div className="comment-meta muted small">
          {it.author && <span>{it.author}</span>}
          {it.date && <span> · {new Date(it.date).toLocaleString(uiLocale())}</span>}
        </div>
      )}
      {editable && (
        <div className="comment-actions">
          {isComment && (
            <span className="comment-colors">
              {COMMENT_COLORS.map((col) => (
                <button key={col} className={`swatch ${it.color === col ? 'on' : ''}`} style={{ background: col }} aria-label={tr('ui.inspector.culoare_x', { col: col })} onClick={() => onEdit({ color: it.color === col ? '' : col })} />
              ))}
            </span>
          )}
          <button className="link annot-delete" onClick={() => onDelete()} aria-label={tr('btn.delete')}>{tr('btn.delete')}</button>
        </div>
      )}
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
        const align = { textAlign: f.align && f.align !== 'left' ? f.align : undefined };
        if (f.type === 'number') {
          return (
            <label key={f.id}>
              {f.title}
              <input
                key={`${node.id}:${v ?? ''}`}
                className="insp-number-field"
                type="number"
                step="any"
                style={align}
                defaultValue={v ?? ''}
                onBlur={(e) => {
                  const nv = parseNumberField(e.target.value);
                  if (nv !== (v ?? '')) set(f.title, nv);
                }}
              />
            </label>
          );
        }
        if (f.type === 'text' && f.wraps) {
          return (
            <label key={f.id}>
              {f.title}
              <textarea key={`${node.id}:${v || ''}`} rows={3} style={align} defaultValue={v || ''} onBlur={(e) => e.target.value !== (v || '') && set(f.title, e.target.value)} />
            </label>
          );
        }
        return (
          <label key={f.id}>
            {f.title}
            <input key={`${node.id}:${v || ''}`} type={f.type === 'date' ? 'date' : 'text'} style={align} defaultValue={f.type === 'date' && v ? String(v).slice(0, 10) : v || ''} onBlur={(e) => e.target.value !== (v || '') && set(f.title, e.target.value)} />
          </label>
        );
      })}
    </div>
  );
}

export const ICONS = ['📄', '📁', '📝', '⭐', '❗', '❓', '💡', '🔥', '🧭', '🗝️', '📌', '🕯️', '🌿', '🌊', '⛰️', '🏛️', '👤', '👥', '🗺️', '📅', '🔬', '📚', '✉️', '🎭'];

// Icon, section type, lock, favorite and bookmarks (Scrivener: Inspector > Bookmarks).
const BM_SCOPE_KEY = 'scribner-bookmarks-scope';
function CustomIconImg({ api, dir, file }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    if (file && api?.readMedia) api.readMedia(dir, file).then((u) => alive && setUrl(u)).catch(() => {});
    return () => { alive = false; };
  }, [api, dir, file]);
  return url ? <img className="insp-custom-icon" src={url} alt="" width={18} height={18} /> : null;
}

function DocumentExtras({ api, dir, project, node, onPatch, linkTargets, onOpen, docs, readDoc, onProjectBookmarksChange, onError }) {
  const customIcon = customIconOf(project, node.icon);
  const tplFolder = project.templateFolder ? findNode(project.tree || [], project.templateFolder) : null;
  const templates = tplFolder?.children || [];
  const isContainer = node.type === 'folder' || Array.isArray(node.children);
  const [dragFrom, setDragFrom] = useState(null);
  const [scope, setScopeState] = useState(() => {
    try {
      return localStorage.getItem(BM_SCOPE_KEY) === 'project' && onProjectBookmarksChange ? 'project' : 'doc';
    } catch {
      return 'doc';
    }
  });
  const setScope = (v) => {
    setScopeState(v);
    try {
      localStorage.setItem(BM_SCOPE_KEY, v);
    } catch {
      /* storage off */
    }
  };
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
          <span className="row">
            {customIcon && <CustomIconImg api={api} dir={dir} file={customIcon.file} />}
            <select className="insp-icon" value={customIcon ? node.icon : node.icon && /\p{Extended_Pictographic}/u.test(node.icon) ? node.icon : ''} onChange={(e) => onPatch({ icon: e.target.value || null })}>
              <option value="">{tr('ui.inspector.implicita')}</option>
              {(project.customIcons || []).length > 0 && (
                <optgroup label={tr('ui.inspector.icoane_proiect')}>
                  {project.customIcons.map((ic) => <option key={ic.id} value={`${CUSTOM_ICON_PREFIX}${ic.id}`}>{ic.name}</option>)}
                </optgroup>
              )}
              {ICONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </span>
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
      {isContainer && templates.length > 0 && node.id !== project.templateFolder && (
        <label>
          {tr('ui.inspector.sablon_implicit')}
          <select className="insp-default-template" value={node.defaultTemplate || ''} onChange={(e) => onPatch({ defaultTemplate: e.target.value || null })}>
            <option value="">{tr('ui.inspector.niciun_sablon')}</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
      )}
      <div className="seg bookmark-scope" role="group" aria-label={tr('ui.inspector.bm_scope')}>
        <button className={scope === 'doc' ? 'on' : ''} aria-pressed={scope === 'doc'} onClick={() => setScope('doc')}>{tr('ui.inspector.bm_document')}</button>
        <button className={scope === 'project' ? 'on' : ''} aria-pressed={scope === 'project'} disabled={!onProjectBookmarksChange} onClick={() => setScope('project')}>{tr('group.project')}</button>
      </div>
      {scope === 'project' && onProjectBookmarksChange ? (
        <BookmarksPanel
          bookmarks={project.bookmarks || []}
          currentId={node.id}
          nodeTitle={(id) => findNode(project.tree || [], id)?.title}
          readDoc={readDoc}
          onChange={onProjectBookmarksChange}
          onOpen={(id) => onOpen?.(id)}
          onError={onError}
          chooseFile={api?.chooseBookmarkFile ? () => api.chooseBookmarkFile() : null}
          openFile={api?.openBookmarkFile ? (p) => api.openBookmarkFile(dir, p) : null}        />
      ) : (
      <div className="doc-bookmarks">
        <span>{tr('ui.inspector.bm_doc_title')}</span>
        <ul className="bookmarks">
          {bookmarks.map((b, i) => (
            <li
              key={i}
              draggable
              className={dragFrom === i ? 'dragging' : ''}
              onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => dragFrom != null && e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragFrom != null) setBookmarks(moveTo(bookmarks, dragFrom, i)); setDragFrom(null); }}
              onDragEnd={() => setDragFrom(null)}
            >
              {b.url ? (
                <a href={b.url} target="_blank" rel="noreferrer">{b.url}</a>
              ) : b.file ? (
                <button className="link bm-file" title={b.file} onClick={() => api?.openBookmarkFile?.(dir, b.file).catch?.((e) => onError?.(e))}>📎 {b.title || b.file.split(/[\\/]/).pop()}</button>
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
            onClick={async () => {
              const url = await uiPrompt(tr('ui.inspector.adresa_web'), 'https://');
              if (url && /^https?:\/\//.test(url)) setBookmarks([...bookmarks, { url }]);
            }}
          >
            {tr('ui.inspector.link_web')}
          </button>
          {api?.chooseBookmarkFile && (
            <button
              className="bm-add-file"
              onClick={async () => {
                try {
                  const f = await api.chooseBookmarkFile();
                  if (f?.path && !bookmarks.some((b) => b.file === f.path)) setBookmarks([...bookmarks, { file: f.path, title: f.name }]);
                } catch (e) {
                  onError?.(e);
                }
              }}
            >
              {tr('ui.inspector.fisier_extern')}
            </button>
          )}
        </div>
        {bookmarks.length > 1 && <p className="muted small">{tr('ui.inspector.bm_trage')}</p>}
      </div>
      )}
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

